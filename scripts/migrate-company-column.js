import postgres from 'postgres';

const sql = postgres('postgresql://helpdesk_user:helpdesk_password@localhost:5432/helpdesk', {
  max: 1
});

async function migrateCompanyColumn() {
  try {
    console.log('🔧 Iniciando migração da coluna company...\n');
    
    // 1. Verificar tipo atual
    console.log('📋 Verificando tipo atual da coluna company:');
    const currentType = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'company'
    `;
    console.log(`   Tipo atual: ${currentType[0].data_type}\n`);
    
    // 2. Limpar valores inválidos
    console.log('🧹 Limpando valores inválidos...');
    const invalidUsers = await sql`
      SELECT id, username, email, company
      FROM users
      WHERE company IS NOT NULL 
      AND company !~ '^[0-9]+$'
    `;
    
    if (invalidUsers.length > 0) {
      console.log(`   Encontrados ${invalidUsers.length} usuários com company inválido:`);
      
      for (const user of invalidUsers) {
        console.log(`   - [${user.id}] ${user.username}: "${user.company}"`);
        
        // Tentar encontrar empresa pelo nome
        const company = await sql`
          SELECT id FROM companies WHERE name = ${user.company}
        `;
        
        if (company.length > 0) {
          await sql`
            UPDATE users 
            SET company = ${company[0].id.toString()}
            WHERE id = ${user.id}
          `;
          console.log(`     ✅ Corrigido para company = ${company[0].id}`);
        } else {
          await sql`
            UPDATE users 
            SET company = NULL
            WHERE id = ${user.id}
          `;
          console.log(`     ⚠️ Empresa não encontrada, definido como NULL`);
        }
      }
    } else {
      console.log('   ✅ Nenhum valor inválido encontrado');
    }
    
    // 3. Alterar tipo da coluna
    console.log('\n🔄 Alterando tipo da coluna para INTEGER...');
    await sql`
      ALTER TABLE users 
      ALTER COLUMN company TYPE INTEGER 
      USING CASE 
        WHEN company ~ '^[0-9]+$' THEN company::INTEGER 
        ELSE NULL 
      END
    `;
    console.log('   ✅ Tipo alterado para INTEGER');
    
    // 4. Adicionar foreign key
    console.log('\n🔗 Adicionando foreign key constraint...');
    await sql`
      ALTER TABLE users 
      ADD CONSTRAINT fk_users_company 
      FOREIGN KEY (company) 
      REFERENCES companies(id) 
      ON DELETE SET NULL
    `;
    console.log('   ✅ Foreign key adicionada');
    
    // 5. Renomear coluna para company_id (mais semântico)
    console.log('\n✏️ Renomeando coluna para company_id...');
    await sql`
      ALTER TABLE users 
      RENAME COLUMN company TO company_id
    `;
    console.log('   ✅ Coluna renomeada');
    
    // 6. Verificar resultado final
    console.log('\n📊 Verificação final:');
    const finalType = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'company_id'
    `;
    console.log(`   Nome: ${finalType[0].column_name}`);
    console.log(`   Tipo: ${finalType[0].data_type}`);
    console.log(`   Nullable: ${finalType[0].is_nullable}`);
    
    const constraints = await sql`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = 'users'
      AND constraint_name = 'fk_users_company'
    `;
    console.log(`   Foreign Key: ${constraints.length > 0 ? '✅ Configurada' : '❌ Não encontrada'}`);
    
    // 7. Verificar dados dos usuários
    console.log('\n👥 Usuários com empresa vinculada:');
    const usersWithCompany = await sql`
      SELECT u.id, u.username, u.email, u.company_id, c.name as company_name
      FROM users u
      LEFT JOIN companies c ON c.id = u.company_id
      WHERE u.company_id IS NOT NULL
      ORDER BY u.id
    `;
    
    usersWithCompany.forEach(u => {
      console.log(`   [${u.id}] ${u.username} → Company ${u.company_id} (${u.company_name})`);
    });
    
    console.log('\n✅ Migração concluída com sucesso!');
    
  } catch (error) {
    console.error('\n❌ Erro durante migração:', error);
    console.error('\nSe houver erro de foreign key, verifique se há IDs inválidos.');
    throw error;
  } finally {
    await sql.end();
  }
}

migrateCompanyColumn();
