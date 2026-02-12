// Script para verificar estrutura da tabela services
import dotenv from 'dotenv';
import path from 'path';
import postgres from 'postgres';

// Carregar .env da pasta raiz
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL não encontrada no .env');
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL);

async function checkServicesTable() {
  try {
    console.log('🔍 Verificando estrutura da tabela services...\n');
    
    const columns = await sql`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM 
        information_schema.columns
      WHERE 
        table_name = 'services'
      ORDER BY 
        ordinal_position
    `;

    if (columns.length === 0) {
      console.log('❌ Tabela "services" NÃO existe');
      console.log('\n📝 Execute a migração:');
      console.log('   node --loader ts-node/esm scripts/run-migration.ts 0022');
    } else {
      console.log('✅ Tabela "services" existe com as seguintes colunas:\n');
      columns.forEach(col => {
        console.log(`   - ${col.column_name} (${col.data_type})`);
      });
      
      const hasTeamId = columns.some(col => col.column_name === 'team_id');
      
      if (hasTeamId) {
        console.log('\n⚠️  A coluna "team_id" EXISTE e precisa ser removida');
        console.log('\n📝 Execute a migração:');
        console.log('   node --loader ts-node/esm scripts/run-migration.ts 0023');
      } else {
        console.log('\n✅ Banco de dados está CORRETO! (sem team_id)');
      }
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar:', error);
  } finally {
    await sql.end();
  }
}

checkServicesTable();
