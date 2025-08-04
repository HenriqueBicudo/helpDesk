import express from 'express';

const app = express();
const apiPrefix = '/api';

// Teste simples de rota
app.get(`${apiPrefix}/test`, (req, res) => {
  res.json({ message: 'Test route works' });
});

console.log('Test routes loaded successfully');
