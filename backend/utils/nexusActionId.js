const { NexusCapaItem } = require('../models');

async function generateActionId(auditRecordId, prefix) {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  // action_id is globally unique, but the running number is per-audit — two audits can
  // land on the same value, so bump the number until we find a free one.
  let n = await NexusCapaItem.count({ where: { audit_record_id: auditRecordId } });
  for (let i = 0; i < 1000; i += 1) {
    n += 1;
    const candidate = `${yy}-${mm}/${prefix}${String(n).padStart(2, '0')}`;
    const clash = await NexusCapaItem.findOne({ where: { action_id: candidate }, attributes: ['id'] });
    if (!clash) return candidate;
  }
  return `${yy}-${mm}/${prefix}${String(Date.now()).slice(-6)}`;
}

module.exports = { generateActionId };
