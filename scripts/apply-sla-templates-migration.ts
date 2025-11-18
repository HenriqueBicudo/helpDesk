import 'dotenv/config';
import postgres from 'postgres';
import fs from 'fs';
import path from 'path';

console.log('🔌 Conectando ao banco de dados...');
const sql = postgres(process.env.DATABASE_URL!);

const migrationFile = path.join(process.cwd(), 'migrations', '0009_create_sla_templates.sql');
const migration = fs.readFileSync(migrationFile, 'utf8');

console.log(`📋 Aplicando migration: 0009_create_sla_templates.sql`);

(async () => {
  try {
    await sql.unsafe(migration);
    console.log('✅ Migration aplicada com sucesso!');
    console.log('📊 Templates SLA criados:');
    console.log('   - Suporte Básico');
    console.log('   - Suporte Premium');
    console.log('   - Suporte Crítico');
    console.log('   - Manutenção');
    console.log('   - Desenvolvimento');
    console.log('   - Consultoria');
  } catch (err) {
    console.error('❌ Erro ao aplicar migration:', err);
    process.exit(1);
  } finally {
    await sql.end();
    console.log('🔌 Conexão fechada.');
  }
})();
