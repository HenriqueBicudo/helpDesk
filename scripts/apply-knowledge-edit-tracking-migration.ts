/**
 * Script para aplicar a migração de campos de rastreamento de edição aos artigos
 * Adiciona os campos last_edited_by_id, last_edited_by e last_edited_at
 */

import { db } from '../server/db-postgres';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

async function applyMigration() {
  try {
    console.log('🔄 Aplicando migração de campos de edição aos artigos...');

    const migrationPath = path.join(__dirname, '..', 'migrations', '0027_add_last_edited_fields_to_knowledge.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // Executar a migration
    await db.execute(sql.raw(migrationSQL));

    console.log('✅ Migração aplicada com sucesso!');
    console.log('📝 Os artigos agora têm campos para rastrear edições:');
    console.log('   - last_edited_by_id: ID do último editor');
    console.log('   - last_edited_by: Nome do último editor');
    console.log('   - last_edited_at: Data da última edição');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao aplicar migração:', error);
    process.exit(1);
  }
}

applyMigration();
