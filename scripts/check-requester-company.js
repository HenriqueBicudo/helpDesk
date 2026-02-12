import postgres from 'postgres';

const sql = postgres('postgresql://helpdesk_user:helpdesk_password@localhost:5432/helpdesk', {
  max: 1
});

async function checkRequester() {
  try {
    console.log('🔍 Verificando requester rep@acme.com.br...\n');
    
    // Buscar o requester
    const requester = await sql`
      SELECT id, full_name, email, company_id
      FROM requesters
      WHERE email = 'rep@acme.com.br'
    `;
    
    if (requester.length === 0) {
      console.log('❌ Requester não encontrado');
      return;
    }
    
    console.log('📋 Requester encontrado:');
    console.log(`  ID: ${requester[0].id}`);
    console.log(`  Nome: ${requester[0].full_name}`);
    console.log(`  Email: ${requester[0].email}`);
    console.log(`  Company ID: ${requester[0].company_id}`);
    
    // Buscar a empresa se tiver company_id
    if (requester[0].company_id) {
      const company = await sql`
        SELECT id, name, cnpj
        FROM companies
        WHERE id = ${requester[0].company_id}
      `;
      
      if (company.length > 0) {
        console.log('\n✅ Empresa vinculada:');
        console.log(`  ID: ${company[0].id}`);
        console.log(`  Nome: ${company[0].name}`);
        console.log(`  CNPJ: ${company[0].cnpj}`);
      } else {
        console.log('\n⚠️ Company ID existe mas empresa não encontrada no banco!');
      }
    } else {
      console.log('\n❌ Requester NÃO tem company_id - empresa não vinculada!');
      
      // Verificar se existe empresa com domínio @acme.com.br
      console.log('\n🔍 Buscando empresas no sistema:');
      const companies = await sql`
        SELECT id, name, cnpj
        FROM companies
        ORDER BY id
      `;
      
      console.log(`\n📊 Total de empresas: ${companies.length}`);
      companies.forEach(c => {
        console.log(`  [${c.id}] ${c.name} - CNPJ: ${c.cnpj || 'N/A'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

checkRequester();
