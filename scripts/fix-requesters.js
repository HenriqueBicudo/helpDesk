import postgres from 'postgres';

const sql = postgres('postgresql://helpdesk_user:helpdesk_password@localhost:5432/helpdesk', {
  max: 1
});

async function checkRequesters() {
  try {
    console.log('🔍 Verificando requesters...\n');
    
    // Buscar requester rep@acme.com.br
    const requester = await sql`
      SELECT id, full_name, email, company_id
      FROM requesters
      WHERE email = 'rep@acme.com.br'
    `;
    
    if (requester.length === 0) {
      console.log('⚠️ Requester rep@acme.com.br NÃO EXISTE na tabela requesters!');
      console.log('Esse usuário existe apenas na tabela users.\n');
      
      console.log('💡 Solução: Criar o requester baseado no user:');
      const user = await sql`
        SELECT id, full_name, email, company, phone
        FROM users
        WHERE email = 'rep@acme.com.br'
      `;
      
      if (user.length > 0) {
        console.log(`   User encontrado: ${user[0].full_name} (company: ${user[0].company})`);
        
        // Criar requester
        await sql`
          INSERT INTO requesters (full_name, email, company_id, phone, created_at)
          VALUES (
            ${user[0].full_name},
            ${user[0].email},
            ${parseInt(user[0].company)},
            ${user[0].phone || null},
            NOW()
          )
          ON CONFLICT (email) DO UPDATE
          SET company_id = ${parseInt(user[0].company)},
              full_name = ${user[0].full_name}
        `;
        
        console.log('✅ Requester criado/atualizado com sucesso!');
      }
    } else {
      console.log('📋 Requester encontrado:');
      console.log(`   ID: ${requester[0].id}`);
      console.log(`   Nome: ${requester[0].full_name}`);
      console.log(`   Email: ${requester[0].email}`);
      console.log(`   Company ID: ${requester[0].company_id}`);
      
      if (!requester[0].company_id) {
        console.log('\n⚠️ Company ID está NULL! Corrigindo...');
        
        const user = await sql`
          SELECT company FROM users WHERE email = 'rep@acme.com.br'
        `;
        
        if (user.length > 0 && user[0].company) {
          await sql`
            UPDATE requesters 
            SET company_id = ${parseInt(user[0].company)}
            WHERE email = 'rep@acme.com.br'
          `;
          console.log(`✅ Company ID atualizado para ${user[0].company}`);
        }
      }
    }
    
    // Verificar todos os requesters
    console.log('\n📊 Todos os requesters:');
    const allRequesters = await sql`
      SELECT r.id, r.full_name, r.email, r.company_id, c.name as company_name
      FROM requesters r
      LEFT JOIN companies c ON c.id = r.company_id
      ORDER BY r.id
    `;
    
    allRequesters.forEach(r => {
      console.log(`   [${r.id}] ${r.full_name} (${r.email})`);
      console.log(`        Company: ${r.company_id ? `${r.company_id} - ${r.company_name}` : 'SEM EMPRESA'}`);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

checkRequesters();
