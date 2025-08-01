const axios = require('axios');

async function testApiTicketCreation() {
  try {
    console.log('Testando criação de ticket via API...');
    
    // Criar ticket via API
    const ticketData = {
      subject: 'Ticket via API com SLA',
      description: 'Este ticket deve ter SLA calculado automaticamente via API',
      priority: 'low',
      category: 'technical_support',
      requesterId: 1,
      contractId: '58820811-b99d-44a9-975e-f6f31f91e97e'
    };
    
    console.log('Dados do ticket:', ticketData);
    
    const response = await axios.post('http://localhost:5173/api/tickets', ticketData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('✅ Ticket criado via API!');
    console.log('Response status:', response.status);
    console.log('Ticket criado:', response.data);
    
    // Verificar se tem SLA
    if (response.data.responseDueAt && response.data.solutionDueAt) {
      console.log('🎉 SLA foi calculado automaticamente via API!');
      console.log('📞 Resposta até:', response.data.responseDueAt);
      console.log('🔧 Solução até:', response.data.solutionDueAt);
    } else {
      console.log('⚠️ SLA não foi calculado automaticamente');
    }
    
  } catch (error) {
    if (error.response) {
      console.error('❌ Erro na API:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('❌ Erro de rede:', error.message);
      console.log('Tentando verificar se o servidor está rodando na porta 5173...');
      
      // Testar outras portas comuns
      const ports = [3000, 5000, 8080, 3001];
      for (const port of ports) {
        try {
          const testResponse = await axios.get(`http://localhost:${port}/api/health`, { timeout: 2000 });
          console.log(`✅ Servidor encontrado na porta ${port}`);
          break;
        } catch (portError) {
          console.log(`❌ Porta ${port} não responde`);
        }
      }
    } else {
      console.error('❌ Erro:', error.message);
    }
  }
}

testApiTicketCreation();
