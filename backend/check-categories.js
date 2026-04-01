require('dotenv').config();
const { TestCategory, TestDefinition } = require('./models');

async function checkCategories() {
  const cats = await TestCategory.findAll({ order: [['id', 'ASC']] });
  console.log(`\nFound ${cats.length} categories:\n`);
  cats.forEach(c => {
    console.log(`  id=${c.id}  code=${c.category_code.padEnd(12)} is_active=${c.is_active}  card_type=${c.card_type}  name="${c.name}"`);
  });

  const defs = await TestDefinition.count({ where: { status: 'active' } });
  console.log(`\nActive test definitions: ${defs}`);

  const itDefs = await TestDefinition.count({ where: { status: 'active', test_id: { [require('sequelize').Op.like]: 'IT-%' } } });
  console.log(`IT-* definitions: ${itDefs}`);
  process.exit(0);
}
checkCategories().catch(e => { console.error(e.message); process.exit(1); });
