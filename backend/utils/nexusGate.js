const {
  NexusQualificationItem,
  NexusDesignReview,
  NexusProcessStepAssessment,
} = require('../models');

async function evaluateGate(plan) {
  const [items, reviews, steps] = await Promise.all([
    NexusQualificationItem.findAll({ where: { plan_id: plan.id } }),
    NexusDesignReview.findAll({ where: { plan_id: plan.id } }),
    plan.product_scope_id
      ? NexusProcessStepAssessment.findAll({ where: { product_scope_id: plan.product_scope_id } })
      : Promise.resolve([]),
  ]);

  const blocking   = items.filter(i => i.status === 'pending' || i.status === 'in-progress');
  const intermediate = reviews.find(r => r.review_type === 'intermediate');
  const final        = reviews.find(r => r.review_type === 'final');
  const ncSteps    = steps.filter(s => s.conformity === 'NC+' || s.conformity === 'nc-');

  const conditions = [
    {
      label: 'All checklist items complete or N/A',
      passed: blocking.length === 0,
      detail: blocking.length > 0 ? `${blocking.length} item(s) still pending` : null,
    },
    {
      label: 'Intermediate design review approved',
      passed: !!intermediate && ['approved', 'conditional'].includes(intermediate.outcome),
      detail: !intermediate ? 'No intermediate review recorded' : intermediate.outcome === 'pending' ? 'Outcome still pending' : null,
    },
    {
      label: 'Final design review approved',
      passed: !!final && final.outcome === 'approved',
      detail: !final ? 'No final review recorded' : final.outcome !== 'approved' ? `Current outcome: ${final.outcome}` : null,
    },
    {
      label: 'No open NC+ / nc- process step findings',
      passed: ncSteps.length === 0,
      detail: ncSteps.length > 0 ? `${ncSteps.length} non-conforming step(s): ${ncSteps.map(s => s.process_tag).join(', ')}` : null,
    },
    {
      label: 'Plan owner assigned',
      passed: !!plan.owner,
      detail: !plan.owner ? 'Set an owner on the qualification plan' : null,
    },
  ];

  return { passed: conditions.every(c => c.passed), conditions };
}

module.exports = { evaluateGate };
