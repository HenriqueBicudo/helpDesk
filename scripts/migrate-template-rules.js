import postgres from 'postgres';

const sql = postgres('postgresql://helpdesk_user:helpdesk_password@localhost:5432/helpdesk', {
  max: 1
});

async function migrateTemplateRules() {
  try {
    console.log('🔧 Migrando regras dos templates...');
    
    // Buscar templates que não têm rules
    const templatesWithoutRules = await sql`
      SELECT t.id, t.name, 
        json_agg(
          json_build_object(
            'priority', r.priority,
            'responseTimeMinutes', r.response_time_minutes,
            'solutionTimeMinutes', r.solution_time_minutes
          ) ORDER BY 
            CASE r.priority 
              WHEN 'urgent' THEN 1 
              WHEN 'high' THEN 2 
              WHEN 'medium' THEN 3 
              WHEN 'low' THEN 4 
            END
        ) as rules
      FROM sla_templates t
      LEFT JOIN sla_template_rules r ON r.template_id = t.id
      WHERE t.rules IS NULL
      GROUP BY t.id, t.name
    `;
    
    console.log(`📋 Encontrados ${templatesWithoutRules.length} templates sem rules`);
    
    for (const template of templatesWithoutRules) {
      console.log(`  📝 Template: ${template.name}`);
      
      const rulesJson = JSON.stringify(template.rules);
      console.log(`     Rules: ${rulesJson}`);
      
      await sql`
        UPDATE sla_templates 
        SET rules = ${rulesJson}
        WHERE id = ${template.id}
      `;
    }
    
    console.log('✅ Migração concluída');
    
    // Agora tornar a coluna NOT NULL
    console.log('\n🔧 Tornando coluna rules NOT NULL...');
    await sql`
      ALTER TABLE sla_templates 
      ALTER COLUMN rules SET NOT NULL
    `;
    console.log('✅ Coluna rules agora é NOT NULL');
    
  } catch (error) {
    console.error('❌ Erro:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

migrateTemplateRules();
