const { db } = require('./server/db-drizzle');
const schema = require('./shared/drizzle-schema');
const { count, eq } = require('drizzle-orm');

async function analyzeDatabase() {
  try {
    console.log('🔍 Analisando base de dados...\n');
    
    // Contar tickets
    const tickets = await db.select({ count: count() }).from(schema.tickets);
    console.log(`📋 Tickets: ${tickets[0].count}`);
    
    // Contar por status
    const statusCounts = await db
      .select({ 
        status: schema.tickets.status, 
        count: count() 
      })
      .from(schema.tickets)
      .groupBy(schema.tickets.status);
    
    statusCounts.forEach(s => {
      console.log(`   └── ${s.status}: ${s.count}`);
    });
    
    // Contar usuários
    const users = await db.select({ count: count() }).from(schema.users);
    console.log(`👥 Usuários: ${users[0].count}`);
    
    // Contar clientes
    const requesters = await db.select({ count: count() }).from(schema.requesters);
    console.log(`🏢 Clientes: ${requesters[0].count}`);
    
    // Contar interações
    const interactions = await db.select({ count: count() }).from(schema.ticketInteractions);
    console.log(`💬 Interações: ${interactions[0].count}`);
    
    // Tentar contar outras tabelas opcionais
    try {
      const contracts = await db.select({ count: count() }).from(schema.contracts);
      console.log(`📄 Contratos: ${contracts[0].count}`);
    } catch (e) {
      console.log(`📄 Contratos: (tabela não encontrada)`);
    }
    
    try {
      const emailTemplates = await db.select({ count: count() }).from(schema.emailTemplates);
      console.log(`� Templates Email: ${emailTemplates[0].count}`);
    } catch (e) {
      console.log(`📧 Templates Email: (tabela não encontrada)`);
    }
    
    console.log('\n📊 Resumo da análise concluída!');
    
  } catch (error) {
    console.error('❌ Erro ao analisar base:', error);
  }
  process.exit(0);
}

analyzeDatabase();
