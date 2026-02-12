import postgres from 'postgres';

const sql = postgres('postgresql://helpdesk_user:helpdesk_password@localhost:5432/helpdesk', {
  max: 1
});

async function checkContracts() {
  try {
    console.log('🔍 Verificando contratos...\n');
    
    // Buscar todos os contratos
    const contracts = await sql`
      SELECT c.id, c.contract_number, c.company_id, c.type, c.status,
             co.name as company_name
      FROM contracts c
      LEFT JOIN companies co ON co.id = c.company_id
      ORDER BY c.id
    `;
    
    console.log(`📋 Total de contratos: ${contracts.length}\n`);
    
    contracts.forEach(c => {
      console.log(`Contrato: ${c.contract_number}`);
      console.log(`  ID: ${c.id}`);
      console.log(`  Company ID: ${c.company_id}`);
      console.log(`  Company Name: ${c.company_name || 'NÃO VINCULADO'}`);
      console.log(`  Tipo: ${c.type}`);
      console.log(`  Status: ${c.status}`);
      console.log('');
    });
    
    // Verificar empresas
    console.log('🏢 Empresas cadastradas:');
    const companies = await sql`
      SELECT id, name, email
      FROM companies
      ORDER BY id
    `;
    
    companies.forEach(co => {
      console.log(`  [${co.id}] ${co.name} (${co.email})`);
    });
    
    // Verificar requester
    console.log('\n👤 Requester rep@acme.com.br:');
    const requester = await sql`
      SELECT r.id, r.full_name, r.email, r.company_id, c.name as company_name
      FROM requesters r
      LEFT JOIN companies c ON c.id = r.company_id
      WHERE r.email = 'rep@acme.com.br'
    `;
    
    if (requester.length > 0) {
      console.log(`  ID: ${requester[0].id}`);
      console.log(`  Nome: ${requester[0].full_name}`);
      console.log(`  Company ID: ${requester[0].company_id}`);
      console.log(`  Company Name: ${requester[0].company_name}`);
      
      if (requester[0].company_id) {
        // Verificar se há contratos ativos para essa empresa
        const activeContracts = await sql`
          SELECT id, contract_number, type, status
          FROM contracts
          WHERE company_id = ${requester[0].company_id}
          AND status = 'active'
        `;
        
        console.log(`\n  ✅ Contratos ativos dessa empresa: ${activeContracts.length}`);
        activeContracts.forEach(ac => {
          console.log(`     - ${ac.contract_number} (${ac.type}) - ${ac.status}`);
        });
      } else {
        console.log('\n  ❌ Requester NÃO tem empresa vinculada!');
      }
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

checkContracts();
