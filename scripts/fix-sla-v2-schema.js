const fs = require('fs');
const path = require('path');
const postgres = require('postgres');

async function main() {
  const databaseUrl = process.env.DATABASE_URL || 'postgresql://helpdesk_user:helpdesk_password@localhost:5432/helpdesk';
  
  console.log('🔧 Conectando ao banco de dados...');
  const sql = postgres(databaseUrl);

  try {
    const migrationFile = path.join(__dirname, '..', 'migrations', '0012_fix_sla_v2_schema.sql');
    console.log('📄 Lendo migration:', migrationFile);
    
    if (!fs.existsSync(migrationFile)) {
      console.error('❌ Arquivo de migration não encontrado');
      process.exit(1);
    }

    const sqlText = fs.readFileSync(migrationFile, 'utf8');

    console.log('🚀 Aplicando correção de schema SLA V2...');
    console.log('⚠️  Esta operação irá recriar as tabelas SLA');
    
    await sql.begin(async (tx) => {
      await tx.unsafe(sqlText);
    });

    console.log('✅ Migration aplicada com sucesso!');
    console.log('\n📊 Verificando resultado...');
    
    // Verificar tabelas
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('sla_templates', 'sla_template_rules', 'business_calendars', 'sla_calculations')
      ORDER BY table_name
    `;
    
    console.log('\n✨ Tabelas SLA V2:');
    tables.forEach(t => console.log(`   ✓ ${t.table_name}`));
    
    // Verificar dados inseridos
    const [templates] = await sql`SELECT COUNT(*) as count FROM sla_templates`;
    const [rules] = await sql`SELECT COUNT(*) as count FROM sla_template_rules`;
    const [calendars] = await sql`SELECT COUNT(*) as count FROM business_calendars`;
    
    console.log('\n📈 Dados iniciais:');
    console.log(`   • Templates SLA: ${templates.count}`);
    console.log(`   • Regras de SLA: ${rules.count}`);
    console.log(`   • Calendários: ${calendars.count}`);
    
    // Verificar coluna em contracts
    const contractCols = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'contracts'
      AND column_name IN ('sla_template_id', 'sla_enabled')
    `;
    
    console.log('\n📝 Colunas em contracts:');
    contractCols.forEach(c => console.log(`   ✓ ${c.column_name}`));
    
    console.log('\n🎉 Sistema SLA V2 configurado com sucesso!');
    console.log('💡 Agora você pode:');
    console.log('   • Vincular contratos a templates de SLA');
    console.log('   • Definir calendários comerciais personalizados');
    console.log('   • Acompanhar cálculos de SLA em tempo real');
    
    await sql.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro ao aplicar migration:', err);
    try { await sql.end(); } catch(e){}
    process.exit(1);
  }
}

main();
