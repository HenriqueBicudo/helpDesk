import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL || 
  'postgresql://helpdesk_user:helpdesk_password@localhost:5432/helpdesk';

const sql = postgres(connectionString);

async function debugRequesters() {
  try {
    console.log('🔍 Verificando dados de solicitantes e empresas...\n');

    // Buscar todas as empresas
    const companies = await sql`SELECT id, name FROM companies ORDER BY id`;
    console.log('📋 Empresas cadastradas:');
    companies.forEach(c => console.log(`  - ID: ${c.id}, Nome: "${c.name}"`));
    console.log('');

    // Buscar todos os requesters
    const requesters = await sql`SELECT id, full_name, email, company FROM requesters ORDER BY id`;
    console.log('👥 Requesters cadastrados:');
    requesters.forEach(r => console.log(`  - ID: ${r.id}, Nome: ${r.full_name}, Email: ${r.email}, Empresa: "${r.company}"`));
    console.log('');

    // Buscar usuários clientes
    const clientUsers = await sql`
      SELECT id, full_name, email, company, role 
      FROM users 
      WHERE role IN ('client_manager', 'client_user')
      ORDER BY id
    `;
    console.log('👤 Usuários clientes cadastrados:');
    clientUsers.forEach(u => console.log(`  - ID: ${u.id}, Nome: ${u.full_name}, Email: ${u.email}, Empresa: "${u.company}", Role: ${u.role}`));
    console.log('');

    // Buscar tickets
    const tickets = await sql`
      SELECT t.id, t.subject, t.company_id, t.requester_id, r.company as requester_company, c.name as company_name
      FROM tickets t
      LEFT JOIN requesters r ON t.requester_id = r.id
      LEFT JOIN companies c ON t.company_id = c.id
      ORDER BY t.id DESC
      LIMIT 5
    `;
    console.log('🎫 Últimos tickets:');
    tickets.forEach(t => console.log(`  - Ticket #${t.id}: CompanyID=${t.company_id}, RequesterCompany="${t.requester_company}", CompanyName="${t.company_name}"`));
    console.log('');

    // Verificar correspondências
    console.log('🔗 Análise de correspondências:');
    for (const company of companies) {
      const matchingRequesters = requesters.filter(r => r.company === company.name);
      const matchingUsers = clientUsers.filter(u => u.company === company.name);
      console.log(`\n  Empresa: "${company.name}" (ID: ${company.id})`);
      console.log(`    - Requesters encontrados: ${matchingRequesters.length}`);
      matchingRequesters.forEach(r => console.log(`      * ${r.full_name} (${r.email})`));
      console.log(`    - Usuários encontrados: ${matchingUsers.length}`);
      matchingUsers.forEach(u => console.log(`      * ${u.full_name} (${u.email})`));
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await sql.end();
  }
}

debugRequesters();
