const Groq = require('groq-sdk');
const { collectData }   = require('./agents/dataCollectorAgent');
const { profileData }   = require('./agents/dataProfilerAgent');
const { annotateData }  = require('./agents/annotationAgent');
const { assessQuality } = require('./agents/qualityAssessmentAgent');
const { formatDataset } = require('./agents/datasetFormatterAgent');
const { AutodataRun }   = require('../../models');
const logger = require('../../utils/logger');

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'collect_data',
      description: 'Query TestEntry/TestSession data from the database matching the run config filters. Returns raw measurement entries.',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string', description: 'Why you are calling this now' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'profile_data',
      description: 'Run statistical profiling (SPC, Cpk, pass rate, outlier detection) on the collected entries. Call after collect_data.',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'annotate_data',
      description: 'Use an LLM to annotate each entry with quality_level, assessment, and confidence. Batches entries to minimise API calls. Call after profile_data.',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'assess_quality',
      description: 'Validate annotation quality and filter out low-confidence or inconsistent entries. Call after annotate_data.',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'format_dataset',
      description: 'Write the validated entries to disk as a JSONL or CSV training dataset. Call last after assess_quality.',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string' },
        },
      },
    },
  },
];

async function runPipeline(runId) {
  const run = await AutodataRun.findByPk(runId);
  if (!run) throw new Error(`Run ${runId} not found`);

  await run.update({ status: 'running', started_at: new Date() });

  const config = run.config ?? {};
  const state = {
    entries: null,
    profile: null,
    annotated: null,
    assessed: null,
    datasetPath: null,
  };

  const systemPrompt = `You are a data pipeline orchestrator. Your job is to produce a high-quality annotated training dataset from smart card manufacturing quality data.

Run config: ${JSON.stringify(config)}

Execute the pipeline stages in order: collect_data → profile_data → annotate_data → assess_quality → format_dataset.
After each tool call you will see the result. Proceed to the next stage automatically. When format_dataset completes, stop.`;

  const messages = [{ role: 'user', content: systemPrompt }];

  let loopCount = 0;
  const MAX_LOOPS = 10;

  while (loopCount < MAX_LOOPS) {
    loopCount++;
    const response = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1024,
      tools: TOOLS,
      messages,
    });

    const choice = response.choices[0];
    const assistantMessage = choice.message;
    messages.push(assistantMessage);

    if (choice.finish_reason === 'stop' || !assistantMessage.tool_calls?.length) break;

    for (const toolCall of assistantMessage.tool_calls) {
      const toolName = toolCall.function.name;
      let result;
      try {
        switch (toolName) {
          case 'collect_data': {
            const collected = await collectData(config);
            state.entries = collected.entries;
            result = {
              success: true,
              entry_count: state.entries.length,
              session_count: collected.sessionCount,
              message: `Collected ${state.entries.length} entries from ${collected.sessionCount} sessions.`,
            };
            break;
          }
          case 'profile_data': {
            if (!state.entries) throw new Error('collect_data must run first');
            state.profile = profileData(state.entries);
            result = { success: true, ...state.profile.summary, profiles: state.profile.profiles.length };
            break;
          }
          case 'annotate_data': {
            if (!state.entries) throw new Error('collect_data must run first');
            const outlierIds = state.profile?.outlierIds ?? [];
            state.annotated = await annotateData(state.entries, outlierIds);
            result = { success: true, annotated_count: state.annotated.length };
            break;
          }
          case 'assess_quality': {
            if (!state.annotated) throw new Error('annotate_data must run first');
            state.assessed = assessQuality(state.annotated);
            result = {
              success: true,
              valid: state.assessed.valid.length,
              rejected: state.assessed.rejected.length,
              quality_rate: state.assessed.quality_rate,
            };
            break;
          }
          case 'format_dataset': {
            if (!state.assessed) throw new Error('assess_quality must run first');
            state.datasetPath = await formatDataset(
              state.assessed.valid,
              runId,
              config.format ?? 'jsonl'
            );
            result = { success: true, path: state.datasetPath, sample_count: state.assessed.valid.length };
            break;
          }
          default:
            result = { error: `Unknown tool: ${toolName}` };
        }
      } catch (err) {
        result = { error: err.message };
        logger.error(`Autodata tool ${toolName} error`, err);
      }

      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(result),
      });
    }
  }

  await run.update({
    status: 'completed',
    completed_at: new Date(),
    dataset_path: state.datasetPath,
    sample_count: state.assessed?.valid?.length ?? 0,
    stats: {
      collected: state.entries?.length ?? 0,
      profiled: state.profile?.summary ?? {},
      annotated: state.annotated?.length ?? 0,
      valid: state.assessed?.valid?.length ?? 0,
      rejected: state.assessed?.rejected?.length ?? 0,
      quality_rate: state.assessed?.quality_rate ?? 0,
    },
  });
}

async function startRun(runId) {
  runPipeline(runId).catch(async err => {
    logger.error(`Autodata run ${runId} failed`, err);
    try {
      await AutodataRun.update(
        { status: 'failed', error_message: err.message, completed_at: new Date() },
        { where: { id: runId } }
      );
    } catch (_) { /* ignore update errors */ }
  });
}

module.exports = { startRun };
