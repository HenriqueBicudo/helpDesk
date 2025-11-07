// Teste para reproduzir erro de criação de usuário
const data = {
  "fullName": "Joao Barto Lanches",
  "email": "joao@gmail.com", 
  "password": "admin123",
  "role": "client_user",
  "company": 39
};

console.log('Dados de teste:', JSON.stringify(data, null, 2));

// Simular requisição
fetch('http://localhost:5000/api/access/users', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    // Você precisará adicionar o cookie de autenticação aqui
  },
  body: JSON.stringify(data)
})
.then(response => {
  console.log('Status:', response.status);
  return response.json();
})
.then(result => {
  console.log('Resultado:', JSON.stringify(result, null, 2));
})
.catch(error => {
  console.error('Erro:', error);
});