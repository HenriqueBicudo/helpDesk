import postgres from 'postgres';

const sql = postgres('postgresql://helpdesk_user:helpdesk_password@localhost:5432/helpdesk', {
  max: 1
});

async function fixNullRules() {
  try {
    console.log('🔧 Corrigindo templates com rules inválidas...');
    
    // Regras padrão para Manutenção
    const maintenanceRules = JSON.stringify([
      { priority: 'low', responseTimeMinutes: 2880, solutionTimeMinutes: 5760 },      // 48h / 96h
      { priority: 'medium', responseTimeMinutes: 1440, solutionTimeMinutes: 2880 },   // 24h / 48h
      { priority: 'high', responseTimeMinutes: 480, solutionTimeMinutes: 1440 },      // 8h / 24h
      { priority: 'urgent', responseTimeMinutes: 120, solutionTimeMinutes: 480 }      // 2h / 8h
    ]);
    
    // Regras padrão para Desenvolvimento
    const developmentRules = JSON.stringify([
      { priority: 'low', responseTimeMinutes: 5760, solutionTimeMinutes: 14400 },     // 96h / 240h
      { priority: 'medium', responseTimeMinutes: 2880, solutionTimeMinutes: 7200 },   // 48h / 120h
      { priority: 'high', responseTimeMinutes: 1440, solutionTimeMinutes: 2880 },     // 24h / 48h
      { priority: 'urgent', responseTimeMinutes: 480, solutionTimeMinutes: 1440 }     // 8h / 24h
    ]);
    
    await sql`
      UPDATE sla_templates 
      SET rules = ${maintenanceRules}
      WHERE name = 'Manutenção'
    `;
    console.log('✅ Template Manutenção atualizado');
    
    await sql`
      UPDATE sla_templates 
      SET rules = ${developmentRules}
      WHERE name = 'Desenvolvimento'
    `;
    console.log('✅ Template Desenvolvimento atualizado');
    
    // Verificar todos os templates
    const allTemplates = await sql`
      SELECT id, name, rules
      FROM sla_templates
      ORDER BY id
    `;
    
    console.log('\n📋 Templates SLA atualizados:');
    allTemplates.forEach(t => {
      const rules = JSON.parse(t.rules);
      console.log(`\n  ${t.name}:`);
      rules.forEach(r => {
        console.log(`    - ${r.priority}: ${r.responseTimeMinutes}min resposta / ${r.solutionTimeMinutes}min solução`);
      });
    });
    
  } catch (error) {
    console.error('❌ Erro:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

fixNullRules();
