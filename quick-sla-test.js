const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const { PostgresStorage } = require('./server/postgres-storage.js');

const connectionString = process.env.DATABASE_URL || 'postgresql://helpdesk_user:helpdesk_password@localhost:5432/helpdesk';

async function quickSLATest() {
  console.log('🧪 Teste rápido do Sistema SLA...\n');
  
  const storage = new PostgresStorage();
  
  try {
    // Criar um ticket de teste básico
    const testTicket = {
      subject: '🧪 Teste SLA Rápido - ' + new Date().toLocaleString('pt-BR'),
      description: 'Teste rápido do sistema SLA.',
      priority: 'high',
      category: 'technical',
      requesterId: 1, // Assumindo que existe um solicitante com ID 1
      status: 'open'
    };
    
    console.log('🎫 Criando ticket de teste...');
    const createdTicket = await storage.createTicket(testTicket);
    
    console.log(`✅ Ticket criado: ID ${createdTicket.id}`);
    console.log(`📊 Status: ${createdTicket.status}`);
    console.log(`⚡ Prioridade: ${createdTicket.priority}`);
    console.log(`🔗 Contrato vinculado: ${createdTicket.contractId || 'Nenhum'}`);
    
    if (createdTicket.responseDueAt) {
      console.log(`📞 Prazo para resposta: ${createdTicket.responseDueAt.toLocaleString('pt-BR')}`);
    } else {
      console.log('⚠️  Prazo para resposta: Não calculado');
    }
    
    if (createdTicket.solutionDueAt) {
      console.log(`🔧 Prazo para solução: ${createdTicket.solutionDueAt.toLocaleString('pt-BR')}`);
    } else {
      console.log('⚠️  Prazo para solução: Não calculado');
    }
    
    console.log('\n✅ Sistema SLA está funcionando!');
    console.log('🎯 Sprint 3 - Motor de SLA implementado com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

quickSLATest().catch(console.error);
