import postgres from 'postgres';

const sql = postgres('postgresql://helpdesk_user:helpdesk_password@localhost:5432/helpdesk', {
  max: 1
});

async function addRulesColumn() {
  try {
    console.log('🔧 Verificando se coluna rules existe...');
    
    const checkColumn = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'sla_templates' 
      AND column_name = 'rules'
    `;
    
    if (checkColumn.length > 0) {
      console.log('✅ Coluna rules já existe');
    } else {
      console.log('➕ Adicionando coluna rules...');
      
      await sql`
        ALTER TABLE sla_templates 
        ADD COLUMN rules TEXT
      `;
      
      console.log('✅ Coluna rules adicionada com sucesso');
    }
    
    // Verificar estrutura final
    console.log('\n📋 Estrutura da tabela sla_templates:');
    const columns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'sla_templates'
      ORDER BY ordinal_position
    `;
    
    columns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

addRulesColumn();
