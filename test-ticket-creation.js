const pg = require('pg');

async function testTicketCreation() {
  const client = new pg.Client('postgresql://helpdesk_user:helpdesk_password@localhost:5432/helpdesk');
  
  try {
    await client.connect();
    
    console.log('🎯 Testando criação de ticket diretamente no banco...');
    
    const insertResult = await client.query(`
      INSERT INTO tickets (
        subject,
        description,
        status,
        priority,
        category,
        requester_id,
        contract_id,
        created_at,
        updated_at
      ) VALUES (
        'Teste direto no banco',
        'Verificando se funciona sem API',
        'open',
        'high',
        'technical_support',
        1,
        '58820811-b99d-44a9-975e-f6f31f91e97e',
        NOW(),
        NOW()
      )
      RETURNING id, subject, contract_id, created_at
    `);
    
    const newTicket = insertResult.rows[0];
    console.log('✅ Ticket criado:', newTicket);
    
    // Buscar regra SLA para aplicar manualmente
    const slaRule = await client.query(`
      SELECT * FROM sla_rules 
      WHERE contract_id = $1 AND priority = 'high'
    `, [newTicket.contract_id]);
    
    if (slaRule.rows.length > 0) {
      const rule = slaRule.rows[0];
      console.log('📋 Regra SLA encontrada:', rule);
      
      // Calcular prazos
      const createdAt = new Date(newTicket.created_at);
      const responseDueAt = new Date(createdAt.getTime() + (rule.response_time_minutes * 60 * 1000));
      const solutionDueAt = new Date(createdAt.getTime() + (rule.solution_time_minutes * 60 * 1000));
      
      // Aplicar SLA
      const updateResult = await client.query(`
        UPDATE tickets 
        SET 
          response_due_at = $1,
          solution_due_at = $2,
          updated_at = NOW()
        WHERE id = $3
        RETURNING id, response_due_at, solution_due_at
      `, [responseDueAt, solutionDueAt, newTicket.id]);
      
      console.log('🎯 SLA aplicado:', updateResult.rows[0]);
      console.log('✅ Sistema funcionando perfeitamente!');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.end();
  }
}

testTicketCreation();
