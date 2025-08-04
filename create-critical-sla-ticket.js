const { db } = require('./server/db-drizzle');
const schema = require('./shared/drizzle-schema');

async function createCriticalSlaTicket() {
  try {
    console.log('⚠️ Criando ticket com SLA crítico...');
    
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
    const responseDeadline = new Date(now.getTime() + (30 * 60 * 1000)); // 30 minutos (crítico)
    const solutionDeadline = new Date(now.getTime() + (3 * 60 * 60 * 1000)); // 3 horas
    
    const contractId = '87654321-dcba-4321-8765-abcdef123456';
    
    console.log(`📋 Usando requester: ${requester[0].fullName} (ID: ${requester[0].id})`);
    console.log(`⚠️ Response deadline: ${responseDeadline.toLocaleString('pt-BR')} (30 min)`);
    console.log(`🔧 Solution deadline: ${solutionDeadline.toLocaleString('pt-BR')} (3h)`);
    
    const newTicket = await db
      .insert(schema.tickets)
      .values({
        subject: 'URGENTE - Sistema de pagamento fora do ar',
        description: '<p><strong>🚨 PROBLEMA CRÍTICO 🚨</strong></p><p>O sistema de pagamento está completamente fora do ar, impedindo todas as transações.</p><p><strong>Impacto:</strong></p><ul><li>Perda de receita direta</li><li>Clientes não conseguem finalizar compras</li><li>Reputação da empresa em risco</li></ul><p><strong>Ação necessária:</strong> Resposta imediata em até 30 minutos!</p>',
        status: 'open',
        priority: 'critical',
        category: 'technical_support',
        requesterId: requester[0].id,
        contractId: contractId,
        responseDueAt: responseDeadline,
        solutionDueAt: solutionDeadline
      })
      .returning();
    
    console.log('✅ Ticket crítico criado com sucesso!');
    console.log(`🎫 ID do ticket: #${newTicket[0].id}`);
    console.log(`📝 Assunto: ${newTicket[0].subject}`);
    console.log(`🆔 Contract ID: ${newTicket[0].contractId}`);
    console.log('');
    console.log('⚠️ Este ticket mostra status SLA CRÍTICO!');
    console.log(`👉 Acesse: http://localhost:3001/tickets/${newTicket[0].id}`);
    
  } catch (error) {
    console.error('❌ Erro ao criar ticket:', error);
  }
  process.exit(0);
}

createCriticalSlaTicket();
