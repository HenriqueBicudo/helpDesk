const pg = require('pg');

async function checkDatabaseStructure() {
  const client = new pg.Client('postgresql://helpdesk_user:helpdesk_password@localhost:5432/helpdesk');
  
  try {
    await client.connect();
    
    console.log('🔍 Verificando estrutura das tabelas...\n');
    
    // Verificar tabela companies
    const companies = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'companies' 
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Tabela COMPANIES:');
    companies.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type}`);
    });
    
    // Verificar relacionamento contracts -> companies
    const contractCompanyData = await client.query(`
      SELECT 
        c.id as contract_id,
        c.contract_number,
        c.company_id,
        comp.name as company_name
      FROM contracts c
      LEFT JOIN companies comp ON c.company_id = comp.id
      LIMIT 3
    `);
    
    console.log('\n📄 Relacionamento CONTRACTS -> COMPANIES:');
    contractCompanyData.rows.forEach(row => {
      console.log(`- Contrato ${row.contract_number} -> Empresa: ${row.company_name || 'SEM EMPRESA'} (ID: ${row.company_id})`);
    });
    
    // Verificar se requesters tem relacionamento com companies
    const requesters = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'requesters' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n👥 Tabela REQUESTERS:');
    requesters.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type}`);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.end();
  }
}

checkDatabaseStructure();
