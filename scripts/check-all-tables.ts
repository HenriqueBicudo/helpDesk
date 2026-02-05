// Script para verificar todas as tabelas do banco
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

async function checkDatabase() {
  try {
    console.log('🔍 Verificando banco de dados...\n');
    
    // Listar todas as tabelas
    const tables = await sql`
      SELECT 
        table_name
      FROM 
        information_schema.tables
      WHERE 
        table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY 
        table_name
    `;

    console.log(`📋 Total de tabelas: ${tables.length}\n`);
    
    // Verificar tabelas importantes
    const importantTables = [
      'users',
      'tickets',
      'requesters',
      'teams',
      'user_teams',
      'companies',
      'contracts',
      'team_categories',
      'services'
    ];

    console.log('📊 Tabelas importantes:\n');
    
    for (const tableName of importantTables) {
      const exists = tables.some(t => t.table_name === tableName);
      
      if (exists) {
        console.log(`✅ ${tableName}`);
        
        // Se for services, verificar estrutura detalhada
        if (tableName === 'services') {
          const columns = await sql`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'services'
            ORDER BY ordinal_position
          `;
          
          const hasTeamId = columns.some(col => col.column_name === 'team_id');
          
          console.log('   Colunas:', columns.map(c => c.column_name).join(', '));
          
          if (hasTeamId) {
            console.log('   ⚠️  TEM team_id (precisa remover!)');
          } else {
            console.log('   ✅ SEM team_id (correto!)');
          }
        }
      } else {
        console.log(`❌ ${tableName} - NÃO EXISTE`);
      }
    }

    // Verificar se há outras tabelas
    console.log('\n📦 Todas as tabelas do banco:\n');
    tables.forEach(t => {
      console.log(`   - ${t.table_name}`);
    });
    
  } catch (error) {
    console.error('❌ Erro ao verificar:', error);
  } finally {
    await sql.end();
  }
}

checkDatabase();
