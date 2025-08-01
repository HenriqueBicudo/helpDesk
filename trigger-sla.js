const axios = require('axios');
const pg = require('pg');

async function triggerSlaCalculation() {
  const client = new pg.Client('postgresql://helpdesk_user:helpdesk_password@localhost:5432/helpdesk');
  
  try {
    await client.connect();
    
    console.log('Tentando acionar o cálculo de SLA via atualização do ticket...');
    
    // Primeiro, vamos ver se podemos forçar uma atualização que triggere o SLA
    // Vamos temporariamente alterar algo no ticket e voltar
    const currentTicket = await client.query('SELECT * FROM tickets WHERE id = 33');
    const ticket = currentTicket.rows[0];
    
    console.log('Ticket atual:', {
      id: ticket.id,
      subject: ticket.subject,
      priority: ticket.priority,
      contract_id: ticket.contract_id,
      response_due_at: ticket.response_due_at,
      solution_due_at: ticket.solution_due_at
    });
    
    // Vamos simular uma atualização que pode triggerar o recálculo de SLA
    const updateResult = await client.query(`
      UPDATE tickets 
      SET updated_at = NOW()
      WHERE id = 33
    `);
    
    console.log('Ticket atualizado para triggerar SLA. Rows affected:', updateResult.rowCount);
    
    // Aguardar um pouco para possível processamento assíncrono
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Verificar se o SLA foi calculado
    const updatedTicket = await client.query(`
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
      WHERE t.id = 33
    `);
    
    console.log('Ticket após tentativa de trigger:', updatedTicket.rows[0]);
    
    // Se ainda não tem SLA, vamos calcular manualmente baseado nas regras
    const ticket_data = updatedTicket.rows[0];
    if (!ticket_data.response_due_at || !ticket_data.solution_due_at) {
      console.log('SLA não foi calculado automaticamente. Calculando manualmente...');
      
      // Buscar regra SLA para a prioridade do ticket
      const slaRule = await client.query(`
        SELECT * FROM sla_rules 
        WHERE contract_id = $1 AND priority = $2
      `, [ticket_data.contract_id, ticket_data.priority]);
      
      if (slaRule.rows.length > 0) {
        const rule = slaRule.rows[0];
        console.log('Regra SLA encontrada:', rule);
        
        // Calcular os prazos
        const createdAt = new Date(ticket_data.created_at);
        const responseDueAt = new Date(createdAt.getTime() + (rule.response_time_minutes * 60 * 1000));
        const solutionDueAt = new Date(createdAt.getTime() + (rule.solution_time_minutes * 60 * 1000));
        
        console.log('Prazos calculados:', {
          responseDueAt: responseDueAt.toISOString(),
          solutionDueAt: solutionDueAt.toISOString()
        });
        
        // Atualizar o ticket com os prazos calculados
        const slaUpdateResult = await client.query(`
          UPDATE tickets 
          SET 
            response_due_at = $1,
            solution_due_at = $2
          WHERE id = 33
        `, [responseDueAt, solutionDueAt]);
        
        console.log('Ticket atualizado com SLA manual. Rows affected:', slaUpdateResult.rowCount);
        
        // Verificar resultado final
        const finalTicket = await client.query(`
          SELECT 
            t.id,
            t.subject,
            t.contract_id,
            t.response_due_at,
            t.solution_due_at,
            t.priority,
            c.contract_number
          FROM tickets t
          LEFT JOIN contracts c ON t.contract_id = c.id
          WHERE t.id = 33
        `);
        
        console.log('✅ SLA ativado! Ticket final:', finalTicket.rows[0]);
        
      } else {
        console.log('❌ Nenhuma regra SLA encontrada para esta prioridade e contrato');
      }
    } else {
      console.log('✅ SLA já estava calculado!');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

triggerSlaCalculation();
