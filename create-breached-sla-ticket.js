const { db } = require('./server/db-drizzle');
const schema = require('./shared/drizzle-schema');

async function createBreachedSlaTicket() {
  try {
    console.log('🚨 Criando ticket com SLA VENCIDO...');
    
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
    const responseDeadline = new Date(now.getTime() - (2 * 60 * 60 * 1000)); // 2 horas atrás (vencido)
    const solutionDeadline = new Date(now.getTime() + (1 * 60 * 60 * 1000)); // 1 hora à frente
    const createdAt = new Date(now.getTime() - (3 * 60 * 60 * 1000)); // 3 horas atrás
    
    const contractId = 'deadbeef-1234-5678-9abc-def012345678';
    
    console.log(`📋 Usando requester: ${requester[0].fullName} (ID: ${requester[0].id})`);
    console.log(`🚨 Response deadline: ${responseDeadline.toLocaleString('pt-BR')} (VENCIDO há 2h)`);
    console.log(`🔧 Solution deadline: ${solutionDeadline.toLocaleString('pt-BR')} (1h restante)`);
    console.log(`📅 Criado em: ${createdAt.toLocaleString('pt-BR')}`);
    
    const newTicket = await db
      .insert(schema.tickets)
      .values({
        subject: 'SLA VIOLADO - Email não funciona há 3 horas',
        description: '<p><strong>🚨 SLA VIOLADO 🚨</strong></p><p>O servidor de email está fora do ar há mais de 3 horas e ainda não recebemos resposta da equipe técnica.</p><p><strong>Problemas identificados:</strong></p><ul><li>Emails não estão sendo enviados</li><li>Recebimento de emails interrompido</li><li>Equipe não consegue se comunicar</li></ul><p><strong>Status:</strong> Primeira resposta <span style="color: red;"><strong>VENCEU há 2 horas</strong></span></p>',
        status: 'open',
        priority: 'high',
        category: 'technical_support',
        requesterId: requester[0].id,
        contractId: contractId,
        responseDueAt: responseDeadline,
        solutionDueAt: solutionDeadline,
        createdAt: createdAt
      })
      .returning();
    
    console.log('✅ Ticket com SLA vencido criado com sucesso!');
    console.log(`🎫 ID do ticket: #${newTicket[0].id}`);
    console.log(`📝 Assunto: ${newTicket[0].subject}`);
    console.log(`🆔 Contract ID: ${newTicket[0].contractId}`);
    console.log('');
    console.log('🚨 Este ticket mostra SLA VIOLADO!');
    console.log(`👉 Acesse: http://localhost:3001/tickets/${newTicket[0].id}`);
    
  } catch (error) {
    console.error('❌ Erro ao criar ticket:', error);
  }
  process.exit(0);
}

createBreachedSlaTicket();
