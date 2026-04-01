require('dotenv').config();
const { TestCategory } = require('./models');

async function fixCategories() {
  const [updated] = await TestCategory.update(
    { is_active: true },
    { where: { is_active: false } }
  );
  console.log(`✅ Set is_active=true on ${updated} categories.`);
  process.exit(0);
}
fixCategories().catch(e => { console.error(e.message); process.exit(1); });
