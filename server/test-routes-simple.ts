import express from 'express';

const app = express();
const apiPrefix = '/api';

// Vamos testar rotas uma por uma
try {
  console.log('Testando rota 1...');
  app.get(`${apiPrefix}/health`, (req, res) => {
    res.json({ status: 'ok' });
  });
  console.log('Rota 1 OK');

  console.log('Testando rota 2...');
  app.get(`${apiPrefix}/requesters/:requesterId/contracts`, async (req, res) => {
    res.json({ requesterId: req.params.requesterId });
  });
  console.log('Rota 2 OK');

  console.log('Testando rota 3...');
  app.get(`${apiPrefix}/users`, async (req, res) => {
    res.json({ users: [] });
  });
  console.log('Rota 3 OK');

  console.log('Testando rota 4...');
  app.post(`${apiPrefix}/users`, async (req, res) => {
    res.json({ created: true });
  });
  console.log('Rota 4 OK');

  console.log('Testando rota 5...');
  app.put(`${apiPrefix}/users/:id`, async (req, res) => {
    res.json({ updated: req.params.id });
  });
  console.log('Rota 5 OK');

  console.log('Testando rota 6...');
  app.get(`${apiPrefix}/requesters`, async (req, res) => {
    res.json({ requesters: [] });
  });
  console.log('Rota 6 OK');

  console.log('Testando rota 7...');
  app.post(`${apiPrefix}/requesters`, async (req, res) => {
    res.json({ created: true });
  });
  console.log('Rota 7 OK');

  console.log('Testando rota 8...');
  app.get(`${apiPrefix}/tickets`, async (req, res) => {
    res.json({ tickets: [] });
  });
  console.log('Rota 8 OK');

  console.log('Testando rota 9...');
  app.get(`${apiPrefix}/tickets/:id`, async (req, res) => {
    res.json({ ticket: req.params.id });
  });
  console.log('Rota 9 OK');

  console.log('Testando rota 10...');
  app.post(`${apiPrefix}/tickets`, async (req, res) => {
    res.json({ created: true });
  });
  console.log('Rota 10 OK');

  console.log('Testando rota 11...');
  app.patch(`${apiPrefix}/tickets/:id`, async (req, res) => {
    res.json({ patched: req.params.id });
  });
  console.log('Rota 11 OK');

  console.log('Testando rota 12...');
  app.post(`${apiPrefix}/tickets/:id/assign`, async (req, res) => {
    res.json({ assigned: req.params.id });
  });
  console.log('Rota 12 OK');

  console.log('Testando rota 13...');
  app.post(`${apiPrefix}/tickets/:id/status`, async (req, res) => {
    res.json({ status: 'changed', id: req.params.id });
  });
  console.log('Rota 13 OK');

  console.log('Todas as rotas básicas funcionaram!');
  
} catch (error) {
  console.error('Erro ao definir rotas:', error);
}
