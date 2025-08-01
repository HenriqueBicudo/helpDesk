import express, { type Request, Response, NextFunction } from "express";
import { storage } from "./storage-interface";
import { 
  insertTicketSchema, 
  insertRequesterSchema, 
  insertUserSchema, 
  insertEmailTemplateSchema,
  emailTemplateTypeSchema,
  updateSystemSettingsSchema
} from "@shared/schema";
import { z } from "zod";
import { setupAuth } from "./auth";
import { ContractService } from "./services/contract.service";
import { contractRoutes } from "./http/routes/contract.routes";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// CORS para permitir requests do frontend
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Middleware de log
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      console.log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

(async () => {
  // Configurar autenticação
  setupAuth(app);
  
  // API routes prefix
  const apiPrefix = '/api';

  // Health check endpoint
  app.get(`${apiPrefix}/health`, (req: Request, res: Response) => {
    res.json({ status: 'OK', timestamp: new Date() });
  });

  // Contract routes (modular)
  app.use(`${apiPrefix}/contracts`, contractRoutes);

  // Rota específica para contratos ativos de um solicitante
  app.get(`${apiPrefix}/requesters/:requesterId/contracts`, async (req: Request, res: Response) => {
    try {
      const requesterId = Number(req.params.requesterId);
      
      if (isNaN(requesterId)) {
        return res.status(400).json({ message: 'ID do solicitante deve ser um número válido' });
      }
      
      const contractService = new ContractService();
      const contracts = await contractService.findActiveByRequesterId(requesterId);
      
      res.json(contracts);
    } catch (error) {
      console.error('Erro ao buscar contratos do solicitante:', error);
      res.status(500).json({ message: 'Erro ao buscar contratos do solicitante' });
    }
  });

  // Basic ticket routes for testing
  app.post(`${apiPrefix}/tickets`, async (req: Request, res: Response) => {
    try {
      const data = insertTicketSchema.parse(req.body);
      
      // Se um contrato foi especificado, validar se está ativo
      if (data.contractId) {
        const contractService = new ContractService();
        const contract = await contractService.findById(data.contractId);
        
        if (!contract) {
          return res.status(400).json({ 
            message: 'Contrato não encontrado' 
          });
        }
        
        if (!contract.isActive) {
          return res.status(400).json({ 
            message: 'Contrato não está ativo' 
          });
        }
        
        // Verificar se o contrato pertence ao solicitante do ticket
        if (contract.requesterId !== data.requesterId) {
          return res.status(400).json({ 
            message: 'Contrato não pertence ao solicitante informado' 
          });
        }
      }
      
      const ticket = await storage.createTicket(data);
      res.status(201).json(ticket);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Validation error', errors: error.errors });
      } else {
        res.status(500).json({ message: 'An error occurred creating the ticket' });
      }
    }
  });

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    console.error(err);
  });

  const port = 5000;
  app.listen(port, "localhost", () => {
    console.log(`🚀 API Backend rodando em http://localhost:${port}`);
    console.log(`📡 Health check: http://localhost:${port}/api/health`);
    console.log(`📋 Contratos: http://localhost:${port}/api/contracts`);
  });
})().catch(console.error);
