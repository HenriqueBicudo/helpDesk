const pg = require('pg');

async function checkCalendars() {
  const client = new pg.Client('postgresql://helpdesk_user:helpdesk_password@localhost:5432/helpdesk');
  
  try {
    await client.connect();
    
    // Verificar se a tabela existe
    const tableExists = await client.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_name = 'calendars' AND table_schema = 'public'
    `);
    
    if (tableExists.rows[0].count > 0) {
      console.log('✅ Calendars table exists');
      
      // Contar registros
      const count = await client.query('SELECT COUNT(*) as count FROM calendars');
      console.log('Records:', count.rows[0].count);
      
      // Mostrar alguns registros
      if (count.rows[0].count > 0) {
        const sample = await client.query('SELECT * FROM calendars LIMIT 2');
        console.log('Sample calendars:', sample.rows);
      }
    } else {
      console.log('❌ Calendars table does not exist');
      
      // Tentar criar
      console.log('Creating calendars table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS calendars (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL UNIQUE,
          description TEXT,
          working_hours JSONB NOT NULL DEFAULT '{"1": "09:00-18:00", "2": "09:00-18:00", "3": "09:00-18:00", "4": "09:00-18:00", "5": "09:00-18:00"}',
          holidays JSONB NOT NULL DEFAULT '[]',
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);
      
      // Inserir calendário padrão
      await client.query(`
        INSERT INTO calendars (name, description, working_hours, holidays) 
        VALUES (
          'Horário Comercial Padrão',
          'Calendário de trabalho padrão (9h às 18h, segunda a sexta)',
          '{"1": "09:00-18:00", "2": "09:00-18:00", "3": "09:00-18:00", "4": "09:00-18:00", "5": "09:00-18:00"}',
          '["2025-01-01", "2025-04-21", "2025-09-07", "2025-10-12", "2025-11-02", "2025-11-15", "2025-12-25"]'
        )
        ON CONFLICT (name) DO NOTHING
      `);
      
      console.log('✅ Calendars table created successfully');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkCalendars();
