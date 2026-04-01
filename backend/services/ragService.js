/**
 * ragService.js — CQM Knowledge Base RAG engine.
 *
 * Adapted from the standalone RAG project (RAG project/src/ingest.ts + rag.ts).
 * Supports multiple documents — each gets its own Vectra vector store under
 * backend/vector-stores/{docId}/.
 *
 * Key functions:
 *   ingestDocument(filePath, docId, docName)  — one-time indexing of a PDF
 *   queryAll(question, contextHint?)          — search all ready docs, ask Claude
 *   queryStream(question, onChunk, contextHint?) — streaming version
 */

const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const { LocalIndex } = require('vectra');
const { VoyageAIClient } = require('voyageai');
const Groq = require('groq-sdk');
const logger = require('../utils/logger');

const VECTOR_STORES_ROOT = path.join(__dirname, '..', 'vector-stores');
const MAX_CHUNK_SIZE = 1200;
const FALLBACK_OVERLAP = 150;
const BATCH_SIZE = 8; // Free tier: 3 RPM + 10K TPM. 8 chunks × ~300 tokens = ~2.4K tokens/batch
const TOP_K = 8;

const voyage = new VoyageAIClient({ apiKey: process.env.VOYAGE_API_KEY });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// In-memory cache of loaded LocalIndex instances keyed by docId
const indexCache = new Map();

// ── Helpers ───────────────────────────────────────────────────────────────────

function vectorStorePath(docId) {
  return path.join(VECTOR_STORES_ROOT, String(docId));
}

async function getIndex(docId) {
  if (indexCache.has(docId)) return indexCache.get(docId);
  const storePath = vectorStorePath(docId);
  const index = new LocalIndex(storePath);
  if (!(await index.isIndexCreated())) {
    throw new Error(`Vector index not found for document ${docId}`);
  }
  indexCache.set(docId, index);
  return index;
}

function invalidateCache(docId) {
  indexCache.delete(docId);
}

// ── Smart chunking: split on CQM requirement codes (#XXXX#) ──────────────────

function chunkText(text) {
  const requirementPattern = /#[A-Z]{1,2}[0-9]{3,4}#/g;
  const matches = [...text.matchAll(requirementPattern)];

  if (matches.length >= 10) {
    const chunks = [];
    for (let i = 0; i < matches.length; i++) {
      const start = matches[i].index;
      const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
      const raw = text.slice(start, end).trim();
      const code = matches[i][0];

      if (raw.length > MAX_CHUNK_SIZE) {
        let j = 0;
        while (j < raw.length) {
          const sub = raw.slice(j, j + MAX_CHUNK_SIZE).trim();
          if (sub.length > 30) chunks.push({ text: sub, requirementCode: code });
          j += MAX_CHUNK_SIZE - FALLBACK_OVERLAP;
        }
      } else if (raw.length > 30) {
        chunks.push({ text: raw, requirementCode: code });
      }
    }
    logger.info(`RAG: CQM requirement chunking — ${chunks.length} chunks from ${matches.length} codes`);
    return chunks;
  }

  // Fallback: fixed-size chunking for non-CQM docs
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    const chunk = text.slice(i, i + MAX_CHUNK_SIZE).trim();
    if (chunk.length > 50) chunks.push({ text: chunk, requirementCode: 'N/A' });
    i += MAX_CHUNK_SIZE - FALLBACK_OVERLAP;
  }
  logger.info(`RAG: Fixed-size chunking — ${chunks.length} chunks`);
  return chunks;
}

// ── Embed via Voyage AI (with retry + rate-limit backoff) ────────────────────
// Free tier = 3 RPM. We enforce a 22-second gap between batches and retry
// up to 5 times on 429 with exponential backoff so ingestion always completes.

const INTER_BATCH_DELAY_MS = 22000; // ~2.7 req/min — safely under 3 RPM
const MAX_RETRIES = 5;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function embedBatchWithRetry(batch, attempt = 0) {
  try {
    const result = await voyage.embed({ input: batch, model: 'voyage-3' });
    return result.data.map((d) => d.embedding);
  } catch (err) {
    const is429 = err?.statusCode === 429 || err?.status === 429 ||
                  (err?.message || '').includes('429');
    if (is429 && attempt < MAX_RETRIES) {
      const wait = INTER_BATCH_DELAY_MS * Math.pow(2, attempt); // 22s, 44s, 88s…
      logger.warn(`RAG: Voyage AI rate limit hit — waiting ${Math.round(wait / 1000)}s before retry ${attempt + 1}/${MAX_RETRIES}`);
      await sleep(wait);
      return embedBatchWithRetry(batch, attempt + 1);
    }
    throw err;
  }
}

async function embedTexts(texts) {
  const all = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const embeddings = await embedBatchWithRetry(batch);
    all.push(...embeddings);
    // Pause between batches to respect the 3 RPM free-tier limit.
    // Skip the delay after the last batch.
    if (i + BATCH_SIZE < texts.length) {
      logger.info(`RAG: embedded ${Math.min(i + BATCH_SIZE, texts.length)}/${texts.length} chunks — pausing ${INTER_BATCH_DELAY_MS / 1000}s`);
      await sleep(INTER_BATCH_DELAY_MS);
    }
  }
  return all;
}

// ── Public: ingest a PDF into a per-document vector store ────────────────────

async function ingestDocument(filePath, docId, docName) {
  logger.info(`RAG: ingesting "${docName}" (doc ${docId})`);

  // 1. Extract text
  const buffer = fs.readFileSync(filePath);
  const parsed = await pdf(buffer);
  logger.info(`RAG: extracted ${parsed.numpages} pages`);

  // 2. Chunk
  const chunks = chunkText(parsed.text);
  if (chunks.length === 0) throw new Error('No usable text extracted from PDF');

  // 3. Embed
  logger.info(`RAG: embedding ${chunks.length} chunks…`);
  const embeddings = await embedTexts(chunks.map((c) => c.text));

  // 4. Build Vectra index
  const storePath = vectorStorePath(docId);
  fs.mkdirSync(storePath, { recursive: true });
  invalidateCache(docId);

  const index = new LocalIndex(storePath);
  if (await index.isIndexCreated()) await index.deleteIndex();
  await index.createIndex({ version: 1, deleteIfExists: true });

  for (let i = 0; i < chunks.length; i++) {
    await index.insertItem({
      vector: embeddings[i],
      metadata: {
        text: chunks[i].text,
        requirementCode: chunks[i].requirementCode,
        docId,
        docName,
      },
    });
  }

  // 5. Write meta.json alongside the index
  fs.writeFileSync(
    path.join(storePath, 'meta.json'),
    JSON.stringify({ docId, docName, ingestedAt: new Date().toISOString(), totalChunks: chunks.length }, null, 2),
  );

  logger.info(`RAG: index saved to ${storePath}`);
  return { chunkCount: chunks.length, vectorStorePath: storePath };
}

// ── Retrieve top-K chunks from a single document ─────────────────────────────

async function retrieveFromDoc(docId, queryEmbedding) {
  try {
    const index = await getIndex(docId);
    const results = await index.queryItems(queryEmbedding, TOP_K);
    return results.map((r) => ({
      text: r.item.metadata.text,
      requirementCode: r.item.metadata.requirementCode,
      docName: r.item.metadata.docName,
      score: r.score,
    }));
  } catch (err) {
    logger.warn(`RAG: skipping doc ${docId} — ${err.message}`);
    return [];
  }
}

// ── Retrieve across all ready documents (uses DB to find them) ───────────────

async function retrieveAll(question, readyDocIds) {
  if (readyDocIds.length === 0) return [];

  const result = await voyage.embed({ input: [question], model: 'voyage-3' });
  const queryEmbedding = result.data[0].embedding;

  const allChunks = (
    await Promise.all(readyDocIds.map((id) => retrieveFromDoc(id, queryEmbedding)))
  ).flat();

  // Sort by score descending, keep top TOP_K*2 for context
  return allChunks.sort((a, b) => b.score - a.score).slice(0, TOP_K * 2);
}

// ── Build system prompt ───────────────────────────────────────────────────────

function buildSystemPrompt(contextHint) {
  return [
    'You are an expert on card quality management standards and procedures for smart card manufacturing.',
    'You will be given document context excerpts from CQM requirement documents.',
    'Answer the question using the provided context. Synthesize and explain the relevant information clearly.',
    'Always cite requirement codes (e.g. #B200#, #A600#) when they appear in the context.',
    'If the context contains partially relevant information, share what you found and note what is missing.',
    'Only say information is not found if the context contains absolutely nothing related to the question.',
    'Be precise and technical — the audience is quality engineers and lab technicians.',
    contextHint ? `Current test context: ${contextHint}` : '',
  ].filter(Boolean).join('\n');
}

// ── Public: query all documents (sync) ───────────────────────────────────────

async function queryAll(question, readyDocIds, contextHint) {
  const chunks = await retrieveAll(question, readyDocIds);
  if (chunks.length === 0) {
    return 'No indexed documents found. Please upload and ingest at least one PDF in the Knowledge Base.';
  }

  const context = chunks
    .map((c) => `[${c.docName} — ${c.requirementCode}]\n${c.text}`)
    .join('\n\n---\n\n');

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 1024,
    messages: [
      { role: 'system', content: buildSystemPrompt(contextHint) },
      { role: 'user', content: `Document context:\n\n${context}\n\n---\n\nQuestion: ${question}` },
    ],
  });

  return response.choices[0].message.content;
}

// ── Public: streaming query ───────────────────────────────────────────────────

async function queryStream(question, readyDocIds, contextHint, onChunk) {
  const chunks = await retrieveAll(question, readyDocIds);
  if (chunks.length === 0) {
    onChunk('No indexed documents found. Please upload and ingest at least one PDF in the Knowledge Base.');
    return;
  }

  const context = chunks
    .map((c) => `[${c.docName} — ${c.requirementCode}]\n${c.text}`)
    .join('\n\n---\n\n');

  const stream = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 1024,
    stream: true,
    messages: [
      { role: 'system', content: buildSystemPrompt(contextHint) },
      { role: 'user', content: `Document context:\n\n${context}\n\n---\n\nQuestion: ${question}` },
    ],
  });

  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content ?? '';
    if (text) onChunk(text);
  }
}

module.exports = { ingestDocument, queryAll, queryStream, invalidateCache };
