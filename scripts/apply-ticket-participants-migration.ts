import postgres from 'postgres';
import { readFileSync } from 'fs';
import { join } from 'path';

const connectionString = process.env.DATABASE_URL || 
  'postgresql://helpdesk_user:helpdesk_password@localhost:5432/helpdesk';

const sql = postgres(connectionString);

async function applyMigration() {
  try {
    console.log('🔄 Iniciando migration para ticket_requesters e ticket_cc...');

    // Ler o arquivo de migration
    const migrationPath = join(process.cwd(), 'migrations', '0012_add_ticket_requesters_cc.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    // Executar a migration
    await sql.unsafe(migrationSQL);

    console.log('✅ Migration aplicada com sucesso!');
    console.log('✅ Tabelas ticket_requesters e ticket_cc criadas');
    console.log('✅ Solicitantes principais migrados');
    
  } catch (error) {
    console.error('❌ Erro ao aplicar migration:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

applyMigration();
