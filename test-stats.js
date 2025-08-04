const { db } = require('./server/db-drizzle');
const schema = require('./shared/drizzle-schema');
const { count, eq } = require('drizzle-orm');

async function testStats() {
  try {
    console.log('🧪 Testando estatísticas...');
    
    // Teste 1: Total de tickets
    const totalTickets = await db.select({ count: count() }).from(schema.tickets);
    console.log('✅ Total tickets:', totalTickets[0].count);
    
    // Teste 2: Tickets abertos
    const openTickets = await db
      .select({ count: count() })
      .from(schema.tickets)
      .where(eq(schema.tickets.status, 'open'));
    console.log('✅ Tickets abertos:', openTickets[0].count);
    
    console.log('🎉 Estatísticas funcionando!');
    
  } catch (error) {
    console.error('❌ Erro ao testar estatísticas:', error);
  }
  process.exit(0);
}

testStats();
