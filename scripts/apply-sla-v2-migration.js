const fs = require('fs');
const path = require('path');
const postgres = require('postgres');

async function main() {
  const databaseUrl = process.env.DATABASE_URL || 'postgresql://helpdesk_user:helpdesk_password@localhost:5432/helpdesk';
  
  console.log('🔧 Conectando ao banco de dados...');
  const sql = postgres(databaseUrl);

  try {
    // Ler o arquivo de migration
    const migrationFile = path.join(__dirname, '..', 'migrations', '0010_sla_system_v2.sql');
    console.log('📄 Lendo migration:', migrationFile);
    
    if (!fs.existsSync(migrationFile)) {
      console.error('❌ Arquivo de migration não encontrado:', migrationFile);
      process.exit(1);
    }

    const sqlText = fs.readFileSync(migrationFile, 'utf8');

    console.log('🚀 Aplicando migration SLA V2...');
    console.log('⚠️  Esta operação pode levar alguns segundos...');
    
    // Executar a migration
    await sql.unsafe(sqlText);

    console.log('✅ Migration aplicada com sucesso!');
    console.log('\n📊 Verificando tabelas criadas...');
    
    // Verificar tabelas criadas
    const tables = await sql`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename IN ('sla_templates', 'sla_template_rules', 'business_calendars', 'sla_calculations')
      ORDER BY tablename
    `;
    
    console.log('\n✨ Tabelas SLA V2 encontradas:');
    tables.forEach(t => console.log(`   ✓ ${t.tablename}`));
    
    // Verificar coluna contracts.sla_template_id
    const contractColumns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'contracts' 
      AND column_name IN ('sla_template_id', 'sla_enabled')
    `;
    
    console.log('\n📝 Colunas adicionadas em contracts:');
    contractColumns.forEach(c => console.log(`   ✓ ${c.column_name}`));
    
    // Verificar se existem dados de exemplo
    const templatesCount = await sql`SELECT COUNT(*) as count FROM sla_templates`;
    const calendarsCount = await sql`SELECT COUNT(*) as count FROM business_calendars`;
    
    console.log('\n📈 Dados iniciais:');
    console.log(`   • Templates SLA: ${templatesCount[0].count}`);
    console.log(`   • Calendários: ${calendarsCount[0].count}`);
    
    console.log('\n🎉 Migration concluída com sucesso!');
    
    await sql.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro ao aplicar migration:', err);
    try { await sql.end(); } catch(e){}
    process.exit(1);
  }
}

main();
