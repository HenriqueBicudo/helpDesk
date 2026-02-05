import { db } from '../server/db-postgres';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

async function applyMigration() {
  try {
    console.log('🚀 Aplicando migração: Add teamId and categoryId to tickets...\n');

    // Executar cada comando individualmente
    console.log('📝 Adicionando coluna team_id...');
    await db.execute(sql.raw(`
      ALTER TABLE tickets
      ADD COLUMN IF NOT EXISTS team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL
    `));
    console.log('✅ Coluna team_id adicionada\n');

    console.log('📝 Adicionando coluna category_id...');
    await db.execute(sql.raw(`
      ALTER TABLE tickets
      ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES team_categories(id) ON DELETE SET NULL
    `));
    console.log('✅ Coluna category_id adicionada\n');

    console.log('📝 Criando índice idx_tickets_team_id...');
    await db.execute(sql.raw(`
      CREATE INDEX IF NOT EXISTS idx_tickets_team_id ON tickets(team_id)
    `));
    console.log('✅ Índice criado\n');

    console.log('📝 Criando índice idx_tickets_category_id...');
    await db.execute(sql.raw(`
      CREATE INDEX IF NOT EXISTS idx_tickets_category_id ON tickets(category_id)
    `));
    console.log('✅ Índice criado\n');

    console.log('📝 Adicionando comentários...');
    await db.execute(sql.raw(`
      COMMENT ON COLUMN tickets.team_id IS 'ID da equipe (categoria principal) selecionada ao criar o ticket'
    `));
    await db.execute(sql.raw(`
      COMMENT ON COLUMN tickets.category_id IS 'ID da categoria hierárquica selecionada ao criar o ticket'
    `));
    console.log('✅ Comentários adicionados\n');

    console.log('✅ Migração aplicada com sucesso!');
    console.log('\n📊 Novas colunas adicionadas:');
    console.log('  - tickets.team_id (INTEGER, nullable)');
    console.log('  - tickets.category_id (INTEGER, nullable)');
    console.log('\n🔍 Índices criados:');
    console.log('  - idx_tickets_team_id');
    console.log('  - idx_tickets_category_id');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao aplicar migração:', error);
    process.exit(1);
  }
}

applyMigration();
