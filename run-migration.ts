import { Pool } from 'pg';
import { readFileSync } from 'fs';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://helpdesk_user:helpdesk_password@localhost:5432/helpdesk'
});

async function runMigration() {
  try {
    console.log('🔄 Executando migration para adicionar novos roles...');
    
    const migrationSQL = readFileSync('./migrations/0003_update_existing_roles.sql', 'utf8');
    
    await pool.query(migrationSQL);
    
    console.log('✅ Migration executada com sucesso!');
    
    // Verificar os roles disponíveis
    const result = await pool.query('SELECT unnest(enum_range(NULL::role)) as available_roles');
    console.log('\n📋 Roles disponíveis:');
    result.rows.forEach(row => console.log('  -', row.available_roles));
    
    // Verificar estrutura da tabela users
    const tableInfo = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n🏗️ Estrutura da tabela users:');
    tableInfo.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${row.column_default ? 'DEFAULT ' + row.column_default : ''}`);
    });
    
    // Verificar usuários existentes
    const usersResult = await pool.query('SELECT id, username, role, company FROM users');
    console.log('\n👥 Usuários existentes:');
    usersResult.rows.forEach(user => {
      console.log(`  ID: ${user.id}, Username: ${user.username}, Role: ${user.role}, Company: ${user.company || 'N/A'}`);
    });
    
  } catch (error) {
    console.error('❌ Erro na migration:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

runMigration();
