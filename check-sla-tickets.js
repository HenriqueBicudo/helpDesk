import { PostgresStorage } from './server/postgres-storage.ts';

async function testSlaData() {
  try {
    const storage = new PostgresStorage();
    const tickets = await storage.getAllTicketsWithRelations();
    
    console.log('=== TICKETS COM SLA ===');
    const ticketsWithSla = tickets.filter(t => t.responseDueAt || t.solutionDueAt);
    
    console.log(`Total de tickets: ${tickets.length}`);
    console.log(`Tickets com SLA: ${ticketsWithSla.length}`);
    console.log('');
    
    ticketsWithSla.forEach(ticket => {
      console.log(`Ticket #${ticket.id}: ${ticket.subject}`);
      if (ticket.responseDueAt) {
        const responseDate = new Date(ticket.responseDueAt);
        const now = new Date();
        const isOverdue = responseDate < now;
        console.log(`  Resposta vence: ${responseDate.toLocaleString('pt-BR')} ${isOverdue ? '(VENCIDO)' : ''}`);
      }
      if (ticket.solutionDueAt) {
        const solutionDate = new Date(ticket.solutionDueAt);
        const now = new Date();
        const isOverdue = solutionDate < now;
        console.log(`  Solução vence: ${solutionDate.toLocaleString('pt-BR')} ${isOverdue ? '(VENCIDO)' : ''}`);
      }
      console.log(`  Status: ${ticket.status}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Erro:', error);
  }
}

testSlaData();
