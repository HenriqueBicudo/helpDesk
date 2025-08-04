const { db } = require('./server/db-drizzle');
const schema = require('./shared/drizzle-schema');

async function testSla() {
  try {
    console.log('🔍 Verificando tickets com SLA...');
    
    const tickets = await db
      .select()
      .from(schema.tickets)
      .limit(5);
    
    console.log(`📊 Encontrados ${tickets.length} tickets:`);
    console.log('');
    
    tickets.forEach(ticket => {
      console.log(`🎫 Ticket #${ticket.id}:`);
      console.log(`   📋 Assunto: ${ticket.subject.substring(0, 50)}...`);
      console.log(`   📊 Status: ${ticket.status}`);
      console.log(`   🚨 Prioridade: ${ticket.priority}`);
      console.log(`   ⏰ Response Due At: ${ticket.responseDueAt || 'Não definido'}`);
      console.log(`   🔧 Solution Due At: ${ticket.solutionDueAt || 'Não definido'}`);
      console.log(`   📝 Contract ID: ${ticket.contractId || 'Não vinculado'}`);
      console.log(`   📅 Criado em: ${ticket.createdAt}`);
      console.log('   ' + '─'.repeat(60));
    });
    
    // Verificar quantos tickets têm SLA configurado
    const ticketsWithSla = tickets.filter(t => t.responseDueAt || t.solutionDueAt);
    console.log('');
    console.log(`📈 Resumo:`);
    console.log(`   Total de tickets: ${tickets.length}`);
    console.log(`   Tickets com SLA: ${ticketsWithSla.length}`);
    console.log(`   Tickets sem SLA: ${tickets.length - ticketsWithSla.length}`);
    
  } catch (error) {
    console.error('❌ Erro ao verificar SLA:', error);
  }
  process.exit(0);
}

testSla();
