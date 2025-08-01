import { db } from './server/db-drizzle.ts';
import { contracts } from './shared/schema/contracts.ts';

async function checkTables() {
  try {
    const result = await db.select().from(contracts).limit(1);
    console.log('✅ Contracts table exists');
    console.log('Records found:', result.length);
    if (result.length > 0) {
      console.log('Sample contract:', result[0]);
    }
  } catch (error) {
    console.log('❌ Error accessing contracts table:', error.message);
  }
}

checkTables();
