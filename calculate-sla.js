const { SlaEngineService } = require('./server/services/slaEngine.service.ts');
const pg = require('pg');

async function calculateSlaForTicket() {
  const client = new pg.Client('postgresql://helpdesk_user:helpdesk_password@localhost:5432/helpdesk');
  
  try {
    await client.connect();
    
    // Instanciar o serviço SLA
    const slaService = new SlaEngineService();
    
    // Calcular os prazos para o ticket 33
    console.log('Calculando SLA para ticket 33...');
    const deadlines = await slaService.calculateDeadlines(33);
    
    if (deadlines) {
      console.log('SLA calculado:', deadlines);
      
      // Atualizar o ticket com os prazos calculados
      const updateResult = await client.query(`
        UPDATE tickets 
        SET 
          response_due_at = $1,
          solution_due_at = $2
        WHERE id = 33
      `, [deadlines.responseDueAt, deadlines.solutionDueAt]);
      
      console.log('Ticket atualizado com SLA. Rows affected:', updateResult.rowCount);
      
      // Verificar o resultado
      const selectResult = await client.query(`
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
      
      console.log('Ticket com SLA ativo:', selectResult.rows[0]);
      
    } else {
      console.log('Não foi possível calcular SLA para este ticket');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await client.end();
  }
}

calculateSlaForTicket();
