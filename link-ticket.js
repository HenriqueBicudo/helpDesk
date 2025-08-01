const pg = require('pg');

async function linkTicketToContract() {
  const client = new pg.Client('postgresql://helpdesk_user:helpdesk_password@localhost:5432/helpdesk');
  
  try {
    await client.connect();
    
    // Update ticket
    const updateResult = await client.query(`
      UPDATE tickets 
      SET contract_id = '58820811-b99d-44a9-975e-f6f31f91e97e' 
      WHERE id = 33
    `);
    
    console.log('Ticket updated. Rows affected:', updateResult.rowCount);
    
    // Check result
    const selectResult = await client.query(`
      SELECT 
        t.id,
        t.subject,
        t.contract_id,
        t.response_due_at,
        t.solution_due_at,
        c.contract_number
      FROM tickets t
      LEFT JOIN contracts c ON t.contract_id = c.id
      WHERE t.id = 33
    `);
    
    console.log('Ticket after linking:', selectResult.rows[0]);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

linkTicketToContract();
