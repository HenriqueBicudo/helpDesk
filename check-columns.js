const { PostgresStorage } = require('./server/postgres-storage.ts');

async function checkColumns() {
  try {
    const storage = new PostgresStorage();
    const columns = await storage.sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'companies'`;
    
    console.log('Colunas da tabela companies:');
    columns.forEach(col => console.log('- ' + col.column_name));
    
    process.exit(0);
  } catch (err) {
    console.error('Erro:', err.message);
    process.exit(1);
  }
}

checkColumns();
