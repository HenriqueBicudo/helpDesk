import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL || 'postgresql://helpdesk_user:helpdesk_password@localhost:5432/helpdesk');

async function applyMigration() {
  try {
    console.log('🔄 Aplicando migração contract_id...');
    
    // Adicionar coluna contract_id se não existir
    await sql`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS contract_id integer;`;
    
    console.log('✅ Migração aplicada com sucesso!');
    
    // Verificar se a coluna foi criada
    const result = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tickets' AND column_name = 'contract_id';
    `;
    
    if (result.length > 0) {
      console.log('✅ Coluna contract_id confirmada na tabela tickets');
    } else {
      console.log('❌ Coluna contract_id não foi encontrada');
    }
    
  } catch (error) {
    console.error('❌ Erro ao aplicar migração:', error);
  } finally {
    await sql.end();
  }
}

applyMigration();
