// Teste para verificar autenticação com username e email
const testAuth = async (identifier, password) => {
  try {
    const response = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: identifier, // Pode ser username ou email
        password: password
      })
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Login bem-sucedido com:', identifier);
      console.log('Usuário:', result.fullName, '- Role:', result.role);
    } else {
      console.log('❌ Falha no login com:', identifier);
      console.log('Erro:', result.message);
    }
    
    return response.ok;
  } catch (error) {
    console.error('Erro na requisição:', error);
    return false;
  }
};

// Exemplo de teste (substitua pelos dados reais)
const runTests = async () => {
  console.log('Testando autenticação com username e email...\n');
  
  // Teste com username (assumindo que existe um user admin)
  await testAuth('admin', 'senha_do_admin');
  
  // Teste com email (substitua por um email real do sistema)
  await testAuth('admin@example.com', 'senha_do_admin');
  
  // Teste com credenciais inválidas
  await testAuth('usuario_inexistente', 'senha_errada');
};

// Executar testes
// runTests();

console.log('Arquivo de teste criado. Para executar:');
console.log('1. Certifique-se de que o servidor está rodando');
console.log('2. Substitua as credenciais de teste pelas reais');
console.log('3. Execute: node test-auth.js');