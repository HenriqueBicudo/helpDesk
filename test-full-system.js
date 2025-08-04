const axios = require('axios');

async function fullSystemTest() {
  const baseURL = 'http://localhost:5000/api';
  
  console.log('🔍 === TESTE COMPLETO DO SISTEMA ===\n');
  
  try {
    // 1. Testar criação de ticket com SLA automático
    console.log('📝 1. Testando criação de ticket com SLA...');
    
    const newTicket = {
      subject: 'Teste completo do sistema',
      description: 'Verificando se SLA é calculado automaticamente',
      priority: 'high',
      category: 'technical_support',
      requesterId: 1,
      contractId: '58820811-b99d-44a9-975e-f6f31f91e97e'
    };
    
    const createResponse = await axios.post(`${baseURL}/tickets`, newTicket);
    console.log(`✅ Ticket criado: ID ${createResponse.data.id}`);
    
    if (createResponse.data.responseDueAt && createResponse.data.solutionDueAt) {
      console.log(`🎯 SLA calculado automaticamente!`);
      console.log(`   📞 Resposta até: ${new Date(createResponse.data.responseDueAt).toLocaleString('pt-BR')}`);
      console.log(`   🔧 Solução até: ${new Date(createResponse.data.solutionDueAt).toLocaleString('pt-BR')}`);
    } else {
      console.log('⚠️ SLA não foi calculado automaticamente');
    }
    
    const ticketId = createResponse.data.id;
    
    // 2. Testar busca de tickets
    console.log('\n📋 2. Testando listagem de tickets...');
    const ticketsResponse = await axios.get(`${baseURL}/tickets`);
    console.log(`✅ ${ticketsResponse.data.length} tickets encontrados`);
    
    // 3. Testar detalhes do ticket
    console.log('\n🎫 3. Testando detalhes do ticket...');
    const ticketDetailsResponse = await axios.get(`${baseURL}/tickets/${ticketId}`);
    console.log(`✅ Detalhes do ticket ${ticketId} carregados`);
    console.log(`   Status: ${ticketDetailsResponse.data.status}`);
    console.log(`   Prioridade: ${ticketDetailsResponse.data.priority}`);
    
    // 4. Testar adição de comentário
    console.log('\n💬 4. Testando adição de comentário...');
    const commentData = {
      type: 'comment',
      content: 'Comentário de teste do sistema',
      isInternal: false
    };
    const commentResponse = await axios.post(`${baseURL}/tickets/${ticketId}/interactions`, commentData);
    console.log(`✅ Comentário adicionado: ID ${commentResponse.data.id}`);
    
    // 5. Testar mudança de status
    console.log('\n🔄 5. Testando mudança de status...');
    const statusData = { status: 'in_progress' };
    const statusResponse = await axios.post(`${baseURL}/tickets/${ticketId}/status`, statusData);
    console.log(`✅ Status alterado para: ${statusResponse.data.status}`);
    
    // 6. Testar contratos
    console.log('\n📄 6. Testando API de contratos...');
    try {
      const contractsResponse = await axios.get(`${baseURL}/contracts`);
      console.log(`✅ ${contractsResponse.data.length} contratos encontrados`);
    } catch (error) {
      console.log(`❌ Erro na API de contratos: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
    }
    
    // 7. Testar usuários/agentes
    console.log('\n👥 7. Testando API de usuários...');
    try {
      const usersResponse = await axios.get(`${baseURL}/users`);
      console.log(`✅ ${usersResponse.data.length} usuários encontrados`);
    } catch (error) {
      console.log(`❌ Erro na API de usuários: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
    }
    
    // 8. Testar clientes
    console.log('\n🏢 8. Testando API de clientes...');
    try {
      const requestersResponse = await axios.get(`${baseURL}/requesters`);
      console.log(`✅ ${requestersResponse.data.length} clientes encontrados`);
    } catch (error) {
      console.log(`❌ Erro na API de clientes: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
    }
    
    console.log('\n🎉 Teste do backend concluído!');
    
  } catch (error) {
    console.error(`❌ Erro no teste: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
  }
}

fullSystemTest();
