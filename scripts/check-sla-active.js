import postgres from 'postgres';

const sql = postgres('postgresql://helpdesk_user:helpdesk_password@localhost:5432/helpdesk', {
  max: 1
});

async function checkActiveStatus() {
  try {
    console.log('🔍 Verificando status dos templates SLA...\n');
    
    // Verificar tipo da coluna
    const columnInfo = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'sla_templates' 
      AND column_name IN ('is_active', 'is_default')
    `;
    
    console.log('📋 Estrutura das colunas:');
    columnInfo.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type}`);
    });
    
    // Verificar valores atuais
    const templates = await sql`
      SELECT id, name, is_active, is_default
      FROM sla_templates
      ORDER BY id
    `;
    
    console.log('\n📊 Templates e seus status:');
    templates.forEach(t => {
      console.log(`  [${t.id}] ${t.name}:`);
      console.log(`      is_active: ${t.is_active} (type: ${typeof t.is_active})`);
      console.log(`      is_default: ${t.is_default} (type: ${typeof t.is_default})`);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

checkActiveStatus();
