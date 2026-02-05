import { db } from '../server/db-postgres';
import { sql } from 'drizzle-orm';

async function applyMigration() {
  try {
    console.log('🚀 Aplicando migração: Add user_teams table...\n');

    console.log('📝 Criando tabela user_teams...');
    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS user_teams (
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        is_primary BOOLEAN NOT NULL DEFAULT false,
        joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id, team_id)
      )
    `));
    console.log('✅ Tabela criada\n');

    console.log('📝 Criando índice idx_user_teams_user_id...');
    await db.execute(sql.raw(`
      CREATE INDEX IF NOT EXISTS idx_user_teams_user_id ON user_teams(user_id)
    `));
    console.log('✅ Índice criado\n');

    console.log('📝 Criando índice idx_user_teams_team_id...');
    await db.execute(sql.raw(`
      CREATE INDEX IF NOT EXISTS idx_user_teams_team_id ON user_teams(team_id)
    `));
    console.log('✅ Índice criado\n');

    console.log('📝 Criando índice idx_user_teams_is_primary...');
    await db.execute(sql.raw(`
      CREATE INDEX IF NOT EXISTS idx_user_teams_is_primary ON user_teams(is_primary)
    `));
    console.log('✅ Índice criado\n');

    console.log('📝 Migrando dados existentes...');
    await db.execute(sql.raw(`
      INSERT INTO user_teams (user_id, team_id, is_primary)
      SELECT id, team_id, true
      FROM users
      WHERE team_id IS NOT NULL
      ON CONFLICT (user_id, team_id) DO NOTHING
    `));
    console.log('✅ Dados migrados\n');

    console.log('📝 Adicionando comentários...');
    await db.execute(sql.raw(`
      COMMENT ON TABLE user_teams IS 'Relacionamento muitos-para-muitos entre usuários e equipes'
    `));
    await db.execute(sql.raw(`
      COMMENT ON COLUMN user_teams.is_primary IS 'Indica se esta é a equipe principal do usuário'
    `));
    console.log('✅ Comentários adicionados\n');

    console.log('✅ Migração aplicada com sucesso!');
    console.log('\n📊 Tabela criada:');
    console.log('  - user_teams (user_id, team_id, is_primary, joined_at)');
    console.log('\n🔍 Índices criados:');
    console.log('  - idx_user_teams_user_id');
    console.log('  - idx_user_teams_team_id');
    console.log('  - idx_user_teams_is_primary');
    console.log('\n⚠️  Nota: A coluna users.team_id ainda existe mas não é mais usada. Considere removê-la em uma migração futura.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao aplicar migração:', error);
    process.exit(1);
  }
}

applyMigration();
