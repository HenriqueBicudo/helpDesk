import { PostgresStorage } from './server/postgres-storage.js';

async function addColumn() {
  try {
    const storage = new PostgresStorage();
    
    // Verificar se a coluna já existe
    const columns = await storage.sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'companies' AND column_name = 'has_active_contract'
    `;
    
    if (columns.length > 0) {
      console.log('Coluna has_active_contract já existe');
      return;
    }
    
    // Adicionar a coluna
    await storage.sql`
      ALTER TABLE companies 
      ADD COLUMN has_active_contract BOOLEAN NOT NULL DEFAULT false
    `;
    
    console.log('Coluna has_active_contract adicionada com sucesso!');
    
    // Verificar novamente
    const newColumns = await storage.sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'companies'
    `;
    
    console.log('Colunas atuais da tabela companies:');
    newColumns.forEach(col => console.log('- ' + col.column_name));
    
  } catch (err) {
    console.error('Erro:', err.message);
  }
  
  process.exit(0);
}

addColumn();
