import { db } from './server/db-drizzle';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createSystemSettingsTable() {
  try {
    console.log('Criando tabela system_settings...');
    
    const sql = fs.readFileSync(path.join(__dirname, 'create_settings_table.sql'), 'utf8');
    
    // Execute the SQL
    await db.execute(sql as any);
    
    console.log('✅ Tabela system_settings criada com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao criar tabela:', error);
  }
  
  process.exit(0);
}

createSystemSettingsTable();
