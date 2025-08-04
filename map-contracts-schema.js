const pg = require('pg');

async function mapContractsSchema() {
  const client = new pg.Client('postgresql://helpdesk_user:helpdesk_password@localhost:5432/helpdesk');
  
  try {
    await client.connect();
    
    console.log('📋 MAPEAMENTO DA TABELA CONTRACTS\n');
    
    const columns = await client.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'contracts' 
      ORDER BY ordinal_position
    `);
    
    console.log('Colunas reais da tabela contracts:');
    columns.rows.forEach((row, i) => {
      const nullable = row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      const defaultVal = row.column_default ? ` DEFAULT ${row.column_default}` : '';
      console.log(`${i+1}. ${row.column_name}: ${row.data_type} ${nullable}${defaultVal}`);
    });
    
    console.log('\n🎯 Schema Drizzle necessário:');
    columns.rows.forEach(row => {
      const colName = row.column_name;
      const dataType = row.data_type;
      
      // Mapear para tipos Drizzle
      let drizzleType = 'varchar';
      if (dataType.includes('integer')) drizzleType = 'integer';
      else if (dataType.includes('timestamp')) drizzleType = 'timestamp';
      else if (dataType.includes('boolean')) drizzleType = 'boolean';
      else if (dataType.includes('numeric')) drizzleType = 'numeric';
      else if (dataType.includes('text')) drizzleType = 'text';
      
      const nullable = row.is_nullable === 'YES' ? '' : '.notNull()';
      
      console.log(`  ${colName}: ${drizzleType}('${colName}')${nullable},`);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.end();
  }
}

mapContractsSchema();
