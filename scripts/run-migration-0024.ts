import 'dotenv/config';
import { Client } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

async function runMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ Conectado ao banco de dados');

    // Ler o arquivo de migração
    const migrationSQL = readFileSync(
      join(__dirname, '../migrations/0024_add_service_id_to_tickets.sql'),
      'utf-8'
    );

    console.log('📝 Executando migration 0024_add_service_id_to_tickets.sql...');
    await client.query(migrationSQL);
    console.log('✅ Migration executada com sucesso!');

  } catch (error) {
    console.error('❌ Erro ao executar migration:', error);
    throw error;
  } finally {
    await client.end();
    console.log('👋 Conexão encerrada');
  }
}

runMigration().catch(console.error);
