import postgres from 'postgres';

const sql = postgres('postgresql://helpdesk_user:helpdesk_password@localhost:5432/helpdesk', {
  max: 1
});

async function activatePremiumTemplate() {
  try {
    await sql`
      UPDATE sla_templates 
      SET is_active = true 
      WHERE name = 'Suporte Premium'
    `;
    
    console.log('✅ Template Suporte Premium ativado');
    
    // Verificar todos
    const templates = await sql`
      SELECT id, name, is_active
      FROM sla_templates
      ORDER BY id
    `;
    
    console.log('\n📊 Status dos templates:');
    templates.forEach(t => {
      console.log(`  ${t.is_active ? '✅' : '❌'} ${t.name}`);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

activatePremiumTemplate();
