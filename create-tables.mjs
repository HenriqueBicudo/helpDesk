import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Client } = pg;

async function createTables() {
  const client = new Client({
    connectionString: 'postgresql://helpdesk_user:helpdesk_password@localhost:5432/helpdesk'
  });

  try {
    await client.connect();
    console.log('Conectado ao banco de dados');

    const sqlScript = fs.readFileSync(path.join(process.cwd(), 'create-tags-tables.sql'), 'utf8');
    
    await client.query(sqlScript);
    console.log('✅ Tabelas de tags e links criadas com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao criar tabelas:', error);
  } finally {
    await client.end();
  }
}

createTables();
