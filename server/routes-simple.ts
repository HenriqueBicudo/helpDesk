import type { Express } from "express";
import { createServer, type Server } from "http";

export async function registerRoutesSimple(app: Express): Promise<Server> {
  const apiPrefix = '/api';

  // Rota de teste simples
  app.get(`${apiPrefix}/test`, (req, res) => {
    res.json({ message: 'Servidor funcionando!' });
  });

  console.log('Rotas simples carregadas com sucesso');

  const httpServer = createServer(app);
  return httpServer;
}
