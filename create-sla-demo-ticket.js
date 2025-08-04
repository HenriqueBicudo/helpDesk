const { db } = require('./server/db-drizzle');
const schema = require('./shared/drizzle-schema');

async function createTestTicketWithSla() {
  try {
    console.log('🎯 Criando ticket de teste com SLA...');
    
    // Buscar um requester para associar ao ticket
    const requester = await db
      .select()
      .from(schema.requesters)
      .limit(1);
    
    if (requester.length === 0) {
      console.log('❌ Nenhum requester encontrado!');
      return;
    }
    
    const now = new Date();
    const responseDeadline = new Date(now.getTime() + (2 * 60 * 60 * 1000)); // 2 horas
    const solutionDeadline = new Date(now.getTime() + (24 * 60 * 60 * 1000)); // 24 horas
    
    const contractId = '12345678-abcd-4321-8765-fedcba987654';
    
    console.log(`📋 Usando requester: ${requester[0].fullName} (ID: ${requester[0].id})`);
    console.log(`⏰ Response deadline: ${responseDeadline.toLocaleString('pt-BR')}`);
    console.log(`🔧 Solution deadline: ${solutionDeadline.toLocaleString('pt-BR')}`);
    
    const newTicket = await db
      .insert(schema.tickets)
      .values({
        subject: 'Ticket de demonstração - Indicadores SLA',
        description: '<p>Este é um ticket criado para demonstrar os <strong>indicadores de SLA</strong> no sistema.</p><p>O ticket possui:</p><ul><li>Prazo de 2 horas para primeira resposta</li><li>Prazo de 24 horas para resolução</li><li>Prioridade alta para demonstração</li></ul>',
        status: 'open',
        priority: 'high',
        category: 'technical_support',
        requesterId: requester[0].id,
        contractId: contractId,
        responseDueAt: responseDeadline,
        solutionDueAt: solutionDeadline
      })
      .returning();
    
    console.log('✅ Ticket criado com sucesso!');
    console.log(`🎫 ID do ticket: #${newTicket[0].id}`);
    console.log(`📝 Assunto: ${newTicket[0].subject}`);
    console.log(`🆔 Contract ID: ${newTicket[0].contractId}`);
    console.log('');
    console.log('🎉 Agora você pode ver os indicadores de SLA na interface!');
    console.log(`👉 Acesse: http://localhost:3001/tickets/${newTicket[0].id}`);
    
  } catch (error) {
    console.error('❌ Erro ao criar ticket:', error);
  }
  process.exit(0);
}

createTestTicketWithSla();
