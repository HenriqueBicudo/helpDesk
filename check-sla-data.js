const { db } = require('./server/db-drizzle');
const schema = require('./shared/drizzle-schema');

async function checkContracts() {
  try {
    console.log('🔍 Verificando contratos e SLA...');
    
    // Verificar se há contratos na tabela de requesters
    const requesters = await db
      .select()
      .from(schema.requesters)
      .limit(3);

    console.log('📋 Requesters encontrados:');
    requesters.forEach(r => {
      console.log(`  ID: ${r.id}, Nome: ${r.fullName}, Plano: ${r.planType}`);
    });

    console.log('');
    console.log('🎫 Verificando tickets existentes...');

    const tickets = await db
      .select()
      .from(schema.tickets)
      .limit(5);

    tickets.forEach(t => {
      console.log(`  Ticket #${t.id}: ${t.subject.substring(0, 30)}...`);
      console.log(`    Status: ${t.status} | Prioridade: ${t.priority}`);
      console.log(`    Contract ID: ${t.contractId || 'Não vinculado'}`);
      console.log(`    Response Due: ${t.responseDueAt || 'Não definido'}`);
      console.log(`    Solution Due: ${t.solutionDueAt || 'Não definido'}`);
      console.log(`    Criado em: ${t.createdAt}`);
      console.log('    ---');
    });

    // Contar tickets com SLA
    const ticketsWithSla = tickets.filter(t => t.responseDueAt || t.solutionDueAt);
    console.log('');
    console.log(`📊 Resumo:`);
    console.log(`   Total de tickets: ${tickets.length}`);
    console.log(`   Tickets com SLA: ${ticketsWithSla.length}`);
    console.log(`   Tickets sem SLA: ${tickets.length - ticketsWithSla.length}`);

  } catch (error) {
    console.error('❌ Erro:', error);
  }
  process.exit(0);
}

checkContracts();
