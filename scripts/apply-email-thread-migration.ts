import postgres from 'postgres';
import * as fs from 'fs';
import * as path from 'path';

const connectionString = process.env.DATABASE_URL || 
  'postgresql://helpdesk_user:helpdesk_password@localhost:5432/helpdesk';

const sql = postgres(connectionString);

async function applyMigration() {
  try {
    console.log('📝 Aplicando migration: adicionar email_thread_id...');

    const migrationPath = path.join(process.cwd(), 'migrations', '0013_add_email_thread_id.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    await sql.unsafe(migrationSQL);

    console.log('✅ Migration aplicada com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao aplicar migration:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

applyMigration();
