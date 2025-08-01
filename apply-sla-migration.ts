import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import fs from 'fs';

// Configuração do banco
const connectionString = `postgresql://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT}/${process.env.POSTGRES_DB}`;
const client = postgres(connectionString);
const db = drizzle(client);

async function applySLAMigration() {
  try {
    const migrationSQL = fs.readFileSync('./migrations/0003_ordinary_vampiro.sql', 'utf8');
    console.log('📋 Applying SLA migration:', migrationSQL);
    
    // Separar as declarações SQL
    const statements = migrationSQL
      .split('-->')
      .map(s => s.replace(/statement-breakpoint/g, '').trim())
      .filter(s => s && s.length > 0);
    
    for (const statement of statements) {
      console.log('🔄 Executing:', statement);
      await client.unsafe(statement);
    }
    
    console.log('✅ SLA migration applied successfully!');
    console.log('   📋 Added: response_due_at timestamp column');
    console.log('   📋 Added: solution_due_at timestamp column');
  } catch (error) {
    console.error('❌ Migration error:', error.message);
    if (error.message.includes('already exists')) {
      console.log('ℹ️  Columns may already exist, checking...');
      
      // Verificar se as colunas já existem
      try {
        const checkResult = await client.unsafe(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'tickets' 
          AND column_name IN ('response_due_at', 'solution_due_at')
        `);
        
        if (checkResult.length === 2) {
          console.log('✅ SLA columns already exist in database');
        } else {
          console.log('⚠️  Only some SLA columns exist, manual intervention may be needed');
        }
      } catch (checkError) {
        console.error('❌ Error checking columns:', checkError.message);
      }
    }
  } finally {
    await client.end();
  }
}

// Executar a migração
applySLAMigration().catch(console.error);
