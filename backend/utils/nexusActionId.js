const { NexusCapaItem } = require('../models');

async function generateActionId(auditRecordId, prefix) {
  const count = await NexusCapaItem.count({ where: { audit_record_id: auditRecordId } });
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  return `${yy}-${mm}/${prefix}${String(count + 1).padStart(2, '0')}`;
}

module.exports = { generateActionId };
