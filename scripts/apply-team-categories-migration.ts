import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!);

async function applyMigration() {
  try {
    console.log('🔄 Aplicando migration de categorias de equipes...');
    
    const migrationPath = path.join(process.cwd(), 'migrations', '0019_create_team_categories.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    
    // Executar migration
    await sql.unsafe(migrationSQL);
    
    console.log('✅ Migration aplicada com sucesso!');
    console.log('');
    console.log('Tabelas criadas:');
    console.log('  - team_categories');
    console.log('  - team_category_users');
    console.log('');
    console.log('Sistema de categorias hierárquicas está pronto! 🎉');
    
  } catch (error) {
    console.error('❌ Erro ao aplicar migration:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

applyMigration();
