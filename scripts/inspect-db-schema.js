const postgres = require('postgres');

async function main() {
  const databaseUrl = process.env.DATABASE_URL || 'postgresql://helpdesk_user:helpdesk_password@localhost:5432/helpdesk';
  
  console.log('🔍 Inspecionando schema do banco de dados...\n');
  const sql = postgres(databaseUrl);

  try {
    // Verificar se sla_templates existe e seu schema
    const slaTemplatesExists = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'sla_templates'
      ORDER BY ordinal_position
    `;
    
    console.log('📋 Tabela sla_templates:');
    if (slaTemplatesExists.length > 0) {
      slaTemplatesExists.forEach(col => {
        console.log(`   ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
      });
    } else {
      console.log('   ❌ Não existe');
    }
    
    // Verificar contracts
    const contractsColumns = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'contracts'
      AND column_name IN ('sla_template_id', 'sla_enabled')
    `;
    
    console.log('\n📋 Tabela contracts (colunas SLA):');
    if (contractsColumns.length > 0) {
      contractsColumns.forEach(col => {
        console.log(`   ${col.column_name} (${col.data_type})`);
      });
    } else {
      console.log('   ❌ Colunas SLA não existem');
    }
    
    // Verificar business_calendars
    const calendarsExists = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_name = 'business_calendars'
    `;
    
    console.log('\n📋 Tabela business_calendars:');
    console.log(calendarsExists.length > 0 ? '   ✅ Existe' : '   ❌ Não existe');
    
    // Verificar sla_calculations
    const calculationsExists = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_name = 'sla_calculations'
    `;
    
    console.log('\n📋 Tabela sla_calculations:');
    console.log(calculationsExists.length > 0 ? '   ✅ Existe' : '   ❌ Não existe');
    
    await sql.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro:', err);
    try { await sql.end(); } catch(e){}
    process.exit(1);
  }
}

main();
