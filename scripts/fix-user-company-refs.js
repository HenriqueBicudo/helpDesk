import postgres from 'postgres';

const sql = postgres('postgresql://helpdesk_user:helpdesk_password@localhost:5432/helpdesk', {
  max: 1
});

async function fixCompanyReferences() {
  try {
    console.log('🔍 Verificando estrutura da tabela users...\n');
    
    // Verificar tipo da coluna company
    const columnInfo = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'company'
    `;
    
    console.log('📋 Coluna company:');
    console.log(`  Tipo: ${columnInfo[0]?.data_type}`);
    console.log(`  Nullable: ${columnInfo[0]?.is_nullable}`);
    
    // Verificar dados atuais
    console.log('\n📊 Usuários com company definido:');
    const usersWithCompany = await sql`
      SELECT id, username, email, role, company
      FROM users
      WHERE company IS NOT NULL
      ORDER BY id
    `;
    
    usersWithCompany.forEach(u => {
      console.log(`  [${u.id}] ${u.username} (${u.email})`);
      console.log(`      company: "${u.company}" (type: ${typeof u.company})`);
    });
    
    console.log('\n🔧 Corrigindo referências...');
    
    // Corrigir user 44 (rep) - company "41" -> 41
    if (usersWithCompany.find(u => u.id === 44 && u.company === '41')) {
      await sql`
        UPDATE users 
        SET company = '41'::integer
        WHERE id = 44
      `;
      console.log('✅ User 44 (rep) corrigido para company_id = 41');
    }
    
    // Corrigir user 45 (empresa) - company "Empresa teste 2" -> buscar ID
    const user45 = usersWithCompany.find(u => u.id === 45);
    if (user45 && isNaN(Number(user45.company))) {
      // Buscar empresa pelo nome
      const company = await sql`
        SELECT id FROM companies WHERE name = ${user45.company}
      `;
      
      if (company.length > 0) {
        await sql`
          UPDATE users 
          SET company = ${company[0].id}::integer
          WHERE id = 45
        `;
        console.log(`✅ User 45 (empresa) corrigido para company_id = ${company[0].id}`);
      }
    }
    
    console.log('\n✅ Verificação final:');
    const fixedUsers = await sql`
      SELECT u.id, u.username, u.email, u.company, c.name as company_name
      FROM users u
      LEFT JOIN companies c ON c.id = CAST(u.company AS INTEGER)
      WHERE u.company IS NOT NULL
      ORDER BY u.id
    `;
    
    fixedUsers.forEach(u => {
      console.log(`  [${u.id}] ${u.username} → Company ${u.company} (${u.company_name || 'NOT FOUND'})`);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

fixCompanyReferences();
