// Test script om Airtable connectie en tabel structuur te valideren
require('dotenv').config({ path: '.env.local' });

const Airtable = require('airtable');

const baseId = process.env.AIRTABLE_BASE_ID;
const apiKey = process.env.AIRTABLE_API_KEY;
const usersTable = process.env.AIRTABLE_USERS_TABLE || 'Users';
const employersTable = process.env.AIRTABLE_EMPLOYERS_TABLE || 'Employers';

if (!baseId || !apiKey) {
  console.error('❌ Airtable credentials ontbreken in .env.local');
  process.exit(1);
}

const base = new Airtable({ apiKey }).base(baseId);

async function testTable(tableName) {
  try {
    console.log(`\n📋 Testing table: ${tableName}`);
    const records = await base(tableName).select({ maxRecords: 1 }).firstPage();
    console.log(`✅ Table "${tableName}" bestaat en is toegankelijk`);
    
    if (records.length > 0) {
      console.log(`   Sample fields:`, Object.keys(records[0].fields));
    } else {
      console.log(`   ⚠️  Tabel is leeg`);
    }
    return true;
  } catch (error) {
    console.error(`❌ Error met table "${tableName}":`, error.message);
    if (error.statusCode === 404) {
      console.error(`   → Tabel bestaat niet of naam is incorrect`);
    } else if (error.statusCode === 403) {
      console.error(`   → Geen toegang tot deze tabel (check permissions)`);
    }
    return false;
  }
}

async function testCreate(tableName, testFields) {
  try {
    console.log(`\n🧪 Testing create in: ${tableName}`);
    const record = await base(tableName).create(testFields);
    console.log(`✅ Successfully created record: ${record.id}`);
    
    // Cleanup: delete test record
    await base(tableName).destroy(record.id);
    console.log(`   🧹 Test record verwijderd`);
    return true;
  } catch (error) {
    console.error(`❌ Error creating in "${tableName}":`, error.message);
    if (error.statusCode === 422) {
      console.error(`   → Mogelijk ontbrekende of verkeerde kolomnamen`);
      console.error(`   → Probeerde te schrijven:`, testFields);
    }
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting Airtable connection tests...\n');
  console.log(`Base ID: ${baseId}`);
  console.log(`Users Table: ${usersTable}`);
  console.log(`Employers Table: ${employersTable}`);

  // Test table access
  const usersOk = await testTable(usersTable);
  const employersOk = await testTable(employersTable);

  if (!usersOk || !employersOk) {
    console.log('\n❌ Sommige tabellen zijn niet toegankelijk. Fix dit eerst.');
    process.exit(1);
  }

  // Test create operations
  console.log('\n' + '='.repeat(50));
  const employerCreateOk = await testCreate(employersTable, {
    status: 'draft',
  });

  const userCreateOk = await testCreate(usersTable, {
    email: 'test@example.com',
    status: 'pending_onboarding',
  });

  if (employerCreateOk && userCreateOk) {
    console.log('\n✅ All tests passed! Airtable is correct geconfigureerd.');
  } else {
    console.log('\n❌ Some tests failed. Check de kolomnamen in Airtable.');
  }
}

runTests().catch(console.error);

