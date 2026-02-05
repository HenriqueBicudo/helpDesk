import { db } from '../server/db-postgres';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

async function applyMigration() {
  try {
    console.log('🔄 Aplicando migração: 0014_add_requester_notes');
    
    const migrationPath = path.join(process.cwd(), 'migrations', '0014_add_requester_notes.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    
    await db.execute(sql.raw(migrationSQL));
    
    console.log('✅ Migração aplicada com sucesso!');
    console.log('📋 Tabela requester_notes criada');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao aplicar migração:', error);
    process.exit(1);
  }
}

applyMigration();
