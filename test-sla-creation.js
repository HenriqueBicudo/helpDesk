const pg = require('pg');

async function createTicketWithSla() {
  const client = new pg.Client('postgresql://helpdesk_user:helpdesk_password@localhost:5432/helpdesk');
  
  try {
    await client.connect();
    
    console.log('Criando novo ticket para testar SLA automático...');
    
    // Criar um novo ticket com contrato linkado
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
        'Ticket de teste SLA automático',
        'Este ticket deve ter SLA calculado automaticamente',
        'open',
        'medium',
        'technical_support',
        1,
        '58820811-b99d-44a9-975e-f6f31f91e97e',
        NOW(),
        NOW()
      )
      RETURNING id
    `);
    
    const newTicketId = insertResult.rows[0].id;
    console.log('Novo ticket criado com ID:', newTicketId);
    
    // Aguardar um pouco para possível processamento
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Verificar se o SLA foi calculado automaticamente
    const ticketResult = await client.query(`
      SELECT 
        t.id,
        t.subject,
        t.contract_id,
        t.response_due_at,
        t.solution_due_at,
        t.priority,
        t.created_at,
        c.contract_number
      FROM tickets t
      LEFT JOIN contracts c ON t.contract_id = c.id
      WHERE t.id = $1
    `, [newTicketId]);
    
    const newTicket = ticketResult.rows[0];
    console.log('Ticket recém-criado:', newTicket);
    
    if (!newTicket.response_due_at || !newTicket.solution_due_at) {
      console.log('SLA não foi calculado automaticamente na criação. Calculando manualmente...');
      
      // Buscar regra SLA
      const slaRule = await client.query(`
        SELECT * FROM sla_rules 
        WHERE contract_id = $1 AND priority = $2
      `, [newTicket.contract_id, newTicket.priority]);
      
      if (slaRule.rows.length > 0) {
        const rule = slaRule.rows[0];
        console.log('Aplicando regra SLA:', rule);
        
        // Calcular prazos
        const createdAt = new Date(newTicket.created_at);
        const responseDueAt = new Date(createdAt.getTime() + (rule.response_time_minutes * 60 * 1000));
        const solutionDueAt = new Date(createdAt.getTime() + (rule.solution_time_minutes * 60 * 1000));
        
        // Atualizar o ticket
        await client.query(`
          UPDATE tickets 
          SET 
            response_due_at = $1,
            solution_due_at = $2
          WHERE id = $3
        `, [responseDueAt, solutionDueAt, newTicketId]);
        
        console.log('✅ SLA aplicado ao novo ticket!');
        
        // Verificar resultado final
        const finalResult = await client.query(`
          SELECT 
            t.id,
            t.subject,
            t.response_due_at,
            t.solution_due_at,
            t.priority
          FROM tickets t
          WHERE t.id = $1
        `, [newTicketId]);
        
        console.log('Ticket final com SLA:', finalResult.rows[0]);
      }
    } else {
      console.log('✅ SLA foi calculado automaticamente na criação!');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

createTicketWithSla();
