const pg = require('pg');

async function addCalendarIdToContracts() {
  const client = new pg.Client('postgresql://helpdesk_user:helpdesk_password@localhost:5432/helpdesk');
  
  try {
    await client.connect();
    
    console.log('Adding calendar_id column to contracts table...');
    
    // Adicionar coluna calendar_id
    await client.query(`
      ALTER TABLE contracts 
      ADD COLUMN IF NOT EXISTS calendar_id INTEGER REFERENCES calendars(id) ON DELETE SET NULL
    `);
    
    console.log('✅ Column added successfully');
    
    // Definir calendário padrão para contratos existentes
    const defaultCalendar = await client.query(`
      SELECT id FROM calendars WHERE name = 'Horário Comercial Padrão' LIMIT 1
    `);
    
    if (defaultCalendar.rows.length > 0) {
      const calendarId = defaultCalendar.rows[0].id;
      
      const updateResult = await client.query(`
        UPDATE contracts 
        SET calendar_id = $1 
        WHERE calendar_id IS NULL
      `, [calendarId]);
      
      console.log(`✅ Updated ${updateResult.rowCount} contracts with default calendar`);
    }
    
    // Verificar resultado
    const contractsWithCalendar = await client.query(`
      SELECT c.id, c.contract_number, c.calendar_id, cal.name as calendar_name
      FROM contracts c
      LEFT JOIN calendars cal ON c.calendar_id = cal.id
      LIMIT 5
    `);
    
    console.log('Contracts with calendar:', contractsWithCalendar.rows);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

addCalendarIdToContracts();
