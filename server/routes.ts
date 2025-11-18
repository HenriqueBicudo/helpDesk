import type { Express, Request, Response, NextFunction } from "express";
import express from 'express';
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
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
import { 
  requireAuth, 
  requireActiveUser, 
  requirePermission, 
  requireAuthAndPermission,
  canUserAccessTicket,
  canUserEditTicket 
} from "./middleware/auth";
import { emailService } from "./email-service";
import { ContractService } from "./services/contract.service";
import { slaEngineService } from "./services/slaEngine.service";
import { contractSimpleRoutes } from "./http/routes/contract-simple.routes";
import { slaRoutes } from "./http/routes/sla.routes";
import slaTemplateRoutes from "./http/routes/sla-templates.routes";
import { accessRoutes } from "./http/routes/access.routes";
import { knowledgeRoutes } from './http/routes/knowledge.routes';

// Configurar multer para upload de arquivos
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: multerStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    // Permitir apenas tipos de arquivo específicos
    const allowedMimeTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain', 'text/csv'
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não suportado'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Configurar autenticação
  setupAuth(app);
  
  // API routes prefix
  const apiPrefix = '/api';

  // Servir arquivos de upload estaticamente em /api/uploads
  app.use(`${apiPrefix}/uploads`, express.static(uploadDir));

  // Health check endpoint
  app.get(`${apiPrefix}/health`, (req: Request, res: Response) => {
    res.json({ status: 'OK', timestamp: new Date() });
  });

  // Contract routes (modular) 
  app.use(`${apiPrefix}/contracts`, contractSimpleRoutes);
  
  // SLA routes (Sprint 4)
  app.use(`${apiPrefix}/sla`, slaRoutes);
  app.use(`${apiPrefix}/sla/templates`, slaTemplateRoutes);
  
  // Access routes (Admin only)
  app.use(`${apiPrefix}/access`, accessRoutes);

  // Knowledge (Base de Conhecimento) routes
  app.use(`${apiPrefix}/knowledge`, knowledgeRoutes);

  // Rota específica para contratos ativos de um solicitante (para uso no frontend)
  app.get(`${apiPrefix}/requesters/:requesterId/contracts`, async (req: Request, res: Response) => {
    try {
      const requesterId = Number(req.params.requesterId);
      
      if (isNaN(requesterId)) {
        return res.status(400).json({ message: 'ID do solicitante deve ser um número válido' });
      }
      
      // TODO: Implementar método findActiveByRequesterId
      res.json([]);
      /*
      const contractService = new ContractService();
      const contracts = await contractService.findActiveByRequesterId(requesterId);
      
      res.json(contracts);
      */
    } catch (error) {
      console.error('Erro ao buscar contratos do solicitante:', error);
      res.status(500).json({ message: 'Erro ao buscar contratos do solicitante' });
    }
  });

  // User routes
  app.get(`${apiPrefix}/users`, requireAuthAndPermission('users:view_all'), async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      let users;
      
      // Admin e helpdesk managers podem ver todos os usuários
      if (user.role === 'admin' || user.role === 'helpdesk_manager') {
        users = await storage.getAllUsers();
      } else if (user.role === 'client_manager') {
        // Client managers só veem usuários da própria empresa
        users = await storage.getUsersByCompany(user.company!);
      } else {
        // Outros roles não podem listar usuários
        return res.status(403).json({ message: 'Acesso negado' });
      }
      
      res.json(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ message: 'An error occurred fetching users' });
    }
  });
  
  app.post(`${apiPrefix}/users`, requireAuthAndPermission('users:create'), async (req: Request, res: Response) => {
    try {
      const data = insertUserSchema.parse(req.body);
      const currentUser = req.user as any;
      
      // Validar se o usuário pode criar usuários do role especificado
      if (currentUser.role === 'client_manager' && 
          (data.role === 'admin' || data.role === 'helpdesk_manager' || data.role === 'helpdesk_agent')) {
        return res.status(403).json({ 
          message: 'Client managers só podem criar usuários cliente' 
        });
      }
      
      // Se é client_manager, forçar company do usuário atual
      if (currentUser.role === 'client_manager') {
        data.company = currentUser.company;
      }
      
      const user = await storage.createUser(data);
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Validation error', errors: error.errors });
      } else {
        console.error('Error creating user:', error);
        res.status(500).json({ message: 'An error occurred creating the user' });
      }
    }
  });

  // Rota para atualizar usuário
  app.put(`${apiPrefix}/users/:id`, requireAuthAndPermission('users:edit'), async (req: Request, res: Response) => {
    try {
      const userId = Number(req.params.id);
      const data = req.body;
      const currentUser = req.user as any;
      
      // Buscar o usuário a ser atualizado
      const targetUser = await storage.getUserById(userId);
      if (!targetUser) {
        return res.status(404).json({ message: 'Usuário não encontrado' });
      }
      
      // Validações de permissão
      if (currentUser.role === 'client_manager') {
        // Client managers só podem editar usuários da própria empresa
        if (targetUser.company !== currentUser.company) {
          return res.status(403).json({ 
            message: 'Você só pode editar usuários da sua própria empresa' 
          });
        }
        
        // Não podem alterar roles para helpdesk/admin
        if (data.role && 
            (data.role === 'admin' || data.role === 'helpdesk_manager' || data.role === 'helpdesk_agent')) {
          return res.status(403).json({ 
            message: 'Você não pode alterar usuários para roles de helpdesk/admin' 
          });
        }
        
        // Não podem alterar company
        if (data.company && data.company !== currentUser.company) {
          return res.status(403).json({ 
            message: 'Você não pode alterar a empresa de um usuário' 
          });
        }
      }
      
      const updatedUser = await storage.updateUser(userId, data);
      res.json(updatedUser);
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ message: 'An error occurred updating the user' });
    }
  });

  // Requester (customer) routes
  app.get(`${apiPrefix}/requesters`, async (req: Request, res: Response) => {
    const requesters = await storage.getAllRequesters();
    res.json(requesters);
  });

  app.post(`${apiPrefix}/requesters`, async (req: Request, res: Response) => {
    try {
      const data = insertRequesterSchema.parse(req.body);
      const requester = await storage.createRequester(data);
      res.status(201).json(requester);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Validation error', errors: error.errors });
      } else {
        res.status(500).json({ message: 'An error occurred creating the requester' });
      }
    }
  });

  // Teams routes
  app.get(`${apiPrefix}/teams`, async (req: Request, res: Response) => {
    try {
      const teams = await storage.getAllTeams();
      res.json(teams);
    } catch (error) {
      console.error('Error fetching teams:', error);
      res.status(500).json({ message: 'An error occurred fetching teams' });
    }
  });

  // My Team routes
  app.get(`${apiPrefix}/teams/:teamId/details`, requireAuth, async (req: Request, res: Response) => {
    try {
      const teamId = parseInt(req.params.teamId);
      const user = req.user as any;
      
      // Verificar se o usuário tem acesso a esta equipe
      if (user.teamId !== teamId && !['admin', 'helpdesk_manager'].includes(user.role)) {
        return res.status(403).json({ message: 'Acesso negado a esta equipe' });
      }
      
      const team = await storage.getTeamById(teamId);
      if (!team) {
        return res.status(404).json({ message: 'Equipe não encontrada' });
      }
      
      const members = await storage.getTeamMembers(teamId);
      
      res.json({
        ...team,
        members
      });
    } catch (error) {
      console.error('Error fetching team details:', error);
      res.status(500).json({ message: 'An error occurred fetching team details' });
    }
  });

  app.get(`${apiPrefix}/teams/:teamId/stats`, requireAuth, async (req: Request, res: Response) => {
    try {
      const teamId = parseInt(req.params.teamId);
      const user = req.user as any;
      
      // Verificar se o usuário tem acesso a esta equipe
      if (user.teamId !== teamId && !['admin', 'helpdesk_manager'].includes(user.role)) {
        return res.status(403).json({ message: 'Acesso negado a esta equipe' });
      }
      
      // Buscar estatísticas da equipe (implementação básica)
      const assignedTickets = await storage.getTicketsByTeam(teamId);
      const resolvedTickets = assignedTickets.filter(t => t.status === 'resolved' || t.status === 'closed');
      
      const stats = {
        assignedTickets: assignedTickets.length,
        resolvedTickets: resolvedTickets.length,
        resolutionRate: assignedTickets.length > 0 ? Math.round((resolvedTickets.length / assignedTickets.length) * 100) : 0
      };
      
      res.json(stats);
    } catch (error) {
      console.error('Error fetching team stats:', error);
      res.status(500).json({ message: 'An error occurred fetching team stats' });
    }
  });

  app.get(`${apiPrefix}/users/company-colleagues`, requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      
      if (!user.company) {
        return res.status(400).json({ message: 'Usuário não está associado a uma empresa' });
      }
      
      const colleagues = await storage.getUsersByCompany(user.company);
      
      // Remover informações sensíveis e o próprio usuário da lista
      let visible = colleagues.filter(colleague => colleague.id !== user.id);

      // Se o usuário é um cliente padrão, não mostrar outros clientes (privacidade)
      if (user.role === 'client_user') {
        visible = visible.filter(colleague => colleague.role !== 'client_user');
      }

      const filteredColleagues = visible.map(colleague => ({
        id: colleague.id,
        fullName: colleague.fullName,
        email: colleague.email,
        role: colleague.role,
        isActive: colleague.isActive,
        createdAt: colleague.createdAt,
        company: colleague.company
      }));

      res.json(filteredColleagues);
    } catch (error) {
      console.error('Error fetching company colleagues:', error);
      res.status(500).json({ message: 'An error occurred fetching colleagues' });
    }
  });

  // Ticket routes
  app.get(`${apiPrefix}/tickets`, requireAuth, async (req: Request, res: Response) => {
    try {
      const { status, priority, category, assigneeId } = req.query;
      const user = req.user as any;
      
      let tickets;
      
      // Verificar se o usuário pode ver todos os tickets ou apenas os da empresa
      if (user.role === 'admin' || user.role === 'helpdesk_manager' || user.role === 'helpdesk_agent') {
        // Helpdesk pode ver todos os tickets
        if (status) {
          tickets = await storage.getTicketsByStatus(status as string);
        } else if (priority) {
          tickets = await storage.getTicketsByPriority(priority as string);
        } else if (category) {
          tickets = await storage.getTicketsByCategory(category as string);
        } else if (assigneeId) {
          tickets = await storage.getTicketsByAssignee(Number(assigneeId));
        } else {
          tickets = await storage.getAllTicketsWithRelations();
        }
      } else if (user.role === 'client_manager') {
        // Client managers veem tickets da própria empresa
        if (!user.company) {
          return res.status(403).json({ message: 'Usuário não está associado a uma empresa' });
        }
        tickets = await storage.getTicketsByCompany(user.company);
      } else if (user.role === 'client_user') {
        // Client users só veem seus próprios tickets
        tickets = await storage.getTicketsByRequester(user.id);
      } else {
        return res.status(403).json({ message: 'Acesso negado aos tickets' });
      }
      
      // Filtrar tickets baseado nas permissões do usuário
      const accessibleTickets = tickets.filter(ticket => canUserAccessTicket(user, ticket));
      
      res.json(accessibleTickets);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      res.status(500).json({ message: 'An error occurred fetching tickets' });
    }
  });

  // Endpoint para buscar tickets do usuário logado (para dashboards de agente)
  app.get(`${apiPrefix}/tickets/my-tickets`, requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      console.log(`🎯 [API] Buscando tickets do usuário ${user.id} (${user.fullName})`);
      
      // Buscar tickets atribuídos ao usuário logado
      const myTickets = await storage.getTicketsByAssignee(user.id);
      
      console.log(`🎯 [API] Encontrados ${myTickets.length} tickets para o usuário ${user.fullName}`);
      
      res.json({
        success: true,
        data: myTickets,
        meta: {
          total: myTickets.length,
          message: `Tickets do usuário ${user.fullName}`,
          timestamp: new Date().toISOString(),
        }
      });
    } catch (error) {
      console.error('Error fetching my tickets:', error);
      res.status(500).json({ 
        success: false,
        message: 'Erro ao buscar meus tickets',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });

  app.get(`${apiPrefix}/tickets/:id`, requireAuth, async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const user = req.user as any;
      const ticket = await storage.getTicketWithRelations(id);
      
      if (!ticket) {
        return res.status(404).json({ message: 'Ticket not found' });
      }
      
      // Verificar se o usuário tem permissão para acessar este ticket
      if (!canUserAccessTicket(user, ticket)) {
        return res.status(403).json({ message: 'Acesso negado a este ticket' });
      }

      // Anexar tags do ticket para que o frontend as mostre imediatamente
      try {
        const tags = await storage.getTicketTags(id);
        // garantir formato esperado
        (ticket as any).tags = tags || [];
      } catch (tagErr) {
        console.warn('Could not load ticket tags for ticket', id, tagErr);
        (ticket as any).tags = [];
      }

      res.json(ticket);
    } catch (error) {
      console.error('Error fetching ticket:', error);
      res.status(500).json({ message: 'An error occurred fetching the ticket' });
    }
  });

  app.post(`${apiPrefix}/tickets`, requireAuthAndPermission('tickets:create'), async (req: Request, res: Response) => {
    try {
      const data = insertTicketSchema.parse(req.body);
      const user = req.user as any;

      // If a standard client is creating a ticket, force the requester to be the authenticated user
      if (user && user.role === 'client_user') {
        try {
          // Try to find an existing requester by the user's email
          let requester = await storage.getRequesterByEmail(user.email);
          if (!requester) {
            // Create a requester record based on the authenticated user
            requester = await storage.createRequester({
              fullName: user.fullName,
              email: user.email,
              company: user.company || undefined,
              planType: 'basic',
              monthlyHours: 10,
              usedHours: '0'
            });
          }

          // Override the requesterId to the authenticated user's requester entry
          (data as any).requesterId = requester.id;
        } catch (err) {
          console.error('Error ensuring requester for client user:', err);
          return res.status(500).json({ message: 'Erro ao processar solicitante do cliente' });
        }
      }
      
      // Se um contrato foi especificado, validar se está ativo
      if (data.contractId) {
        // Usar o storage diretamente — contratos usam chaves string (ex: CONTRACT_...)
        const contract = await storage.getContract(data.contractId as any);

        if (!contract) {
          return res.status(400).json({ 
            message: 'Contrato não encontrado' 
          });
        }

        if (contract.status !== 'active') {
          return res.status(400).json({ 
            message: 'Contrato não está ativo' 
          });
        }

        // Verificar se o contrato pertence ao solicitante do ticket
        // TODO: Implementar validação correta quando schema estiver alinhado
        /*
        if (contract.requesterId !== data.requesterId) {
          return res.status(400).json({ 
            message: 'Contrato não pertence ao solicitante informado' 
          });
        }
        */
      }
      
      const ticket = await storage.createTicket(data);
      
      // Calcular e aplicar SLA automaticamente se o ticket tiver contrato
      if (ticket && ticket.id && ticket.contractId) {
        try {
          console.log(`🎯 Calculando SLA para ticket #${ticket.id}...`);
          await slaEngineService.calculateAndApplyDeadlines(ticket.id);
          console.log(`✅ SLA aplicado ao ticket #${ticket.id}`);
        } catch (slaError) {
          console.error(`⚠️ Erro ao calcular SLA para ticket #${ticket.id}:`, slaError);
          // Não falha a criação do ticket, apenas loga o erro
        }
      }
      
      res.status(201).json(ticket);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Validation error', errors: error.errors });
      } else {
        res.status(500).json({ message: 'An error occurred creating the ticket' });
      }
    }
  });

  app.patch(`${apiPrefix}/tickets/:id`, async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const updates = req.body;
      
      // Se está tentando atualizar assigneeId, validar se é usuário do helpdesk
      if (updates.assigneeId !== undefined) {
        const assignee = await storage.getUserById(updates.assigneeId);
        if (!assignee) {
          return res.status(404).json({ message: 'Assignee not found' });
        }
        
        if (!['admin', 'helpdesk_manager', 'helpdesk_agent'].includes(assignee.role)) {
          return res.status(400).json({ message: 'Tickets can only be assigned to helpdesk users' });
        }
        
        // Se o usuário tem um teamId, atualizar a categoria automaticamente
        if (assignee.teamId) {
          const { getCategoryByTeamId } = await import('../shared/team-category-mapping');
          const newCategory = getCategoryByTeamId(assignee.teamId);
          
          if (newCategory && ['technical_support', 'financial', 'commercial', 'other'].includes(newCategory)) {
            updates.category = newCategory as 'technical_support' | 'financial' | 'commercial' | 'other';
            console.log(`Ticket #${id} category will be updated to ${newCategory} based on team ${assignee.teamId}`);
          }
        }
      }

      // Se está tentando atualizar contractId, validar se o contrato existe e está ativo
      if (updates.contractId !== undefined) {
        if (updates.contractId) {
          const contract = await storage.getContract(updates.contractId);
          if (!contract) {
            return res.status(404).json({ message: 'Contract not found' });
          }
          if (contract.status !== 'active') {
            return res.status(400).json({ message: 'Contract is not active' });
          }
        }
      }
      
      // Normalize status synonyms before applying
      if (updates.status && (updates.status === 'cancelled' || updates.status === 'canceled')) {
        updates.status = 'closed';
      }

      const ticket = await storage.updateTicket(id, updates);
      
      if (!ticket) {
        return res.status(404).json({ message: 'Ticket not found' });
      }
      
      res.json(ticket);
    } catch (error) {
      console.error('Error updating ticket:', error);
      res.status(500).json({ message: 'An error occurred updating the ticket' });
    }
  });

  app.post(`${apiPrefix}/tickets/:id/assign`, async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const { assigneeId } = req.body;
      
      if (typeof assigneeId !== 'number') {
        return res.status(400).json({ message: 'assigneeId is required and must be a number' });
      }
      
      // Verificar se o usuário é do helpdesk e obter seus dados completos
      const assignee = await storage.getUserById(assigneeId);
      if (!assignee) {
        return res.status(404).json({ message: 'Assignee not found' });
      }
      
      if (!['admin', 'helpdesk_manager', 'helpdesk_agent'].includes(assignee.role)) {
        return res.status(400).json({ message: 'Tickets can only be assigned to helpdesk users' });
      }
      
      // Atribuir o ticket
      const ticket = await storage.assignTicket(id, assigneeId);
      
      if (!ticket) {
        return res.status(404).json({ message: 'Ticket not found' });
      }
      
      // Se o usuário tem um teamId, atualizar a categoria automaticamente
      if (assignee.teamId) {
        const { getCategoryByTeamId } = await import('../shared/team-category-mapping');
        const newCategory = getCategoryByTeamId(assignee.teamId);
        
        if (newCategory && ['technical_support', 'financial', 'commercial', 'other'].includes(newCategory)) {
          await storage.updateTicket(id, { category: newCategory as 'technical_support' | 'financial' | 'commercial' | 'other' });
          console.log(`Ticket #${id} category updated to ${newCategory} based on team ${assignee.teamId}`);
        }
      }
      
      // Buscar o ticket atualizado com todas as relações
      const updatedTicket = await storage.getTicketWithRelations(id);
      
      res.json(updatedTicket || ticket);
    } catch (error) {
      console.error('Error assigning ticket:', error);
      res.status(500).json({ message: 'An error occurred assigning the ticket' });
    }
  });

  app.post(`${apiPrefix}/tickets/:id/status`, async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const { status } = req.body;

      if (typeof status !== 'string') {
        return res.status(400).json({ message: 'status is required and must be a string' });
      }

      // Normalize synonyms coming from UI
      const normalizeStatus = (s: string) => {
        if (!s) return s;
        if (s === 'cancelled' || s === 'canceled') return 'closed';
        return s;
      };

      const normalizedStatus = normalizeStatus(status);
      
      // Buscar ticket atual para verificar se tem contrato associado
      const currentTicket = await storage.getTicket(id);
      if (!currentTicket) {
        return res.status(404).json({ message: 'Ticket not found' });
      }
      
  const ticket = await storage.changeTicketStatus(id, normalizedStatus);
      
      if (!ticket) {
        return res.status(404).json({ message: 'Ticket not found' });
      }
      
      // Se o ticket foi resolvido e tem contrato associado, contabilizar horas
  if (normalizedStatus === 'resolved' && currentTicket.contractId) {
        try {
          // Calcular total de horas gastas nas interações do ticket
          const interactions = await storage.getTicketInteractions(id);
          const totalHours = interactions.reduce((total, interaction) => 
            total + (interaction.timeSpent || 0), 0);
          
          if (totalHours > 0) {
            const contractService = new ContractService();
            const contract = await contractService.findById(currentTicket.contractId);
            
            if (contract) {
              // Atualizar horas usadas no contrato
              const currentUsedHours = parseFloat(contract.usedHours || '0');
              const newUsedHours = currentUsedHours + totalHours;
              await contractService.update(currentTicket.contractId, {
                usedHours: newUsedHours.toString()
              });
              
              console.log(`Ticket ${id} resolvido: ${totalHours}h adicionadas ao contrato ${currentTicket.contractId}`);
            }
          }
        } catch (contractError) {
          // Log do erro mas não falhar a operação principal
          console.error('Erro ao atualizar horas do contrato:', contractError);
        }
      }
      
      res.json(ticket);
    } catch (error) {
      res.status(500).json({ message: 'An error occurred changing the ticket status' });
    }
  });

  // Dashboard statistics routes
  // Statistics endpoint now requires auth and respects dashboard permissions.
  app.get(`${apiPrefix}/statistics`, requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user as any;
      // If user can view full dashboard, return global stats
      if (user && (user.role === 'admin' || user.role === 'helpdesk_manager')) {
        const stats = await storage.getTicketStatistics();
        return res.json(stats);
      }

      // If user can view company dashboard, compute stats scoped to company
      if (user && user.company && user.role === 'client_manager') {
        const tickets = await storage.getTicketsByCompany(user.company);
        const totalTickets = tickets.length;
        const openTickets = tickets.filter((t: any) => t.status === 'open').length;
        const today = new Date();
        today.setHours(0,0,0,0);
        const resolvedToday = tickets.filter((t: any) => t.status === 'resolved' && new Date(t.updatedAt) >= today).length;

        return res.json({
          totalTickets,
          openTickets,
          resolvedToday,
          averageResponseTime: 'N/A (company-scoped)'
        });
      }

      // Client users têm acesso muito limitado às estatísticas
      if (user && user.role === 'client_user') {
        return res.status(403).json({ message: 'Acesso negado a estatísticas do sistema' });
      }

      // Otherwise deny access
      return res.status(403).json({ message: 'Acesso negado a estatísticas' });
    } catch (error) {
      res.status(500).json({ message: 'An error occurred fetching statistics' });
    }
  });

  app.get(`${apiPrefix}/statistics/categories`, requireAuth, async (req: Request, res: Response) => {
    try {
      // allow helpdesk/admin to get global categories, company users get scoped
      const user = (req as any).user as any;
      if (user && (user.role === 'admin' || user.role === 'helpdesk_manager')) {
        const categoryStats = await storage.getTicketCategoriesCount();
        return res.json(categoryStats);
      }

      if (user && user.company && user.role === 'client_manager') {
        const tickets = await storage.getTicketsByCompany(user.company);
        const byCategory: Record<string, number> = {};
        tickets.forEach((t: any) => { byCategory[t.category] = (byCategory[t.category] || 0) + 1; });
        return res.json(Object.entries(byCategory).map(([category, count]) => ({ category, count })));
      }

      // Client users não têm acesso a estatísticas por categoria
      if (user && user.role === 'client_user') {
        return res.status(403).json({ message: 'Acesso negado a estatísticas por categoria' });
      }

      return res.status(403).json({ message: 'Acesso negado a estatísticas por categoria' });
    } catch (error) {
      res.status(500).json({ message: 'An error occurred fetching category statistics' });
    }
  });

  app.get(`${apiPrefix}/statistics/volume`, requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user as any;
      if (user && (user.role === 'admin' || user.role === 'helpdesk_manager')) {
        const volumeStats = await storage.getTicketVolumeByDate();
        return res.json(volumeStats);
      }

      if (user && user.company && user.role === 'client_manager') {
        // For company managers, compute volume by date using company tickets
        const tickets = await storage.getTicketsByCompany(user.company);
        const map: Record<string, number> = {};
        tickets.forEach((t: any) => {
          const d = new Date(t.createdAt).toISOString().slice(0,10);
          map[d] = (map[d] || 0) + 1;
        });
        const arr = Object.entries(map).map(([date, count]) => ({ date, count }));
        arr.sort((a,b) => a.date.localeCompare(b.date));
        return res.json(arr);
      }

      // Client users não têm acesso a estatísticas de volume
      if (user && user.role === 'client_user') {
        return res.status(403).json({ message: 'Acesso negado a estatísticas de volume' });
      }

      return res.status(403).json({ message: 'Acesso negado a volume de tickets' });
    } catch (error) {
      res.status(500).json({ message: 'An error occurred fetching volume statistics' });
    }
  });

  // Email Template routes
  app.get(`${apiPrefix}/email-templates`, async (req: Request, res: Response) => {
    try {
      const type = req.query.type;
      
      let templates;
      if (type) {
        const validatedType = emailTemplateTypeSchema.safeParse(type);
        if (!validatedType.success) {
          return res.status(400).json({ message: 'Invalid template type' });
        }
        templates = await storage.getEmailTemplatesByType(validatedType.data);
      } else {
        templates = await storage.getAllEmailTemplates();
      }
      
      res.json(templates);
    } catch (error) {
      res.status(500).json({ message: 'An error occurred fetching email templates' });
    }
  });

  app.get(`${apiPrefix}/email-templates/:id`, async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const template = await storage.getEmailTemplate(id);
      
      if (!template) {
        return res.status(404).json({ message: 'Email template not found' });
      }
      
      res.json(template);
    } catch (error) {
      res.status(500).json({ message: 'An error occurred fetching the email template' });
    }
  });

  app.post(`${apiPrefix}/email-templates`, async (req: Request, res: Response) => {
    try {
      const data = insertEmailTemplateSchema.parse(req.body);
      const template = await storage.createEmailTemplate(data);
      res.status(201).json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Validation error', errors: error.errors });
      } else {
        res.status(500).json({ message: 'An error occurred creating the email template' });
      }
    }
  });

  app.patch(`${apiPrefix}/email-templates/:id`, async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const updates = req.body;
      
      const template = await storage.updateEmailTemplate(id, updates);
      
      if (!template) {
        return res.status(404).json({ message: 'Email template not found' });
      }
      
      res.json(template);
    } catch (error) {
      res.status(500).json({ message: 'An error occurred updating the email template' });
    }
  });

  app.delete(`${apiPrefix}/email-templates/:id`, async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const result = await storage.deleteEmailTemplate(id);
      
      if (!result) {
        return res.status(404).json({ message: 'Email template not found or cannot be deleted' });
      }
      
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: 'An error occurred deleting the email template' });
    }
  });

  // Test email route
  app.post(`${apiPrefix}/test-email`, async (req: Request, res: Response) => {
    try {
      const { to, templateType, templateData } = req.body;
      
      if (!to || !templateType) {
        return res.status(400).json({ message: 'to and templateType are required' });
      }
      
      const result = await emailService.sendEmailWithTemplate(
        templateType,
        to,
        templateData || {}
      );
      
      if (!result) {
        return res.status(500).json({ message: 'Failed to send test email' });
      }
      
      res.json({ message: 'Test email sent successfully (simulated)' });
    } catch (error) {
      res.status(500).json({ message: 'An error occurred sending test email' });
    }
  });

  // Ticket Interactions routes
  app.get(`${apiPrefix}/tickets/:id/interactions`, async (req: Request, res: Response) => {
    try {
      const ticketId = Number(req.params.id);
      const interactions = await storage.getTicketInteractions(ticketId);
      res.json(interactions);
    } catch (error) {
      console.error('Error fetching interactions:', error);
      res.status(500).json({ message: 'An error occurred fetching interactions' });
    }
  });

  app.post(`${apiPrefix}/tickets/:id/interactions`, upload.array('attachments', 5), async (req: Request, res: Response) => {
    try {
      const ticketId = Number(req.params.id);
      let { type, content, isInternal = 'false', timeSpent = 0, contractId } = req.body;
      
      if (!type || !content) {
        return res.status(400).json({ message: 'type and content are required' });
      }

      // Converter isInternal corretamente (FormData sempre envia como string)
      const isInternalBool = isInternal === 'true' || isInternal === true;

      // Buscar ticket para permitir processamento de tokens/macro no conteúdo
      const ticket = await storage.getTicketWithRelations(ticketId);

      let processedContent = content as string;

      if (ticket) {
        // Função utilitária para normalizar chave: remove diacríticos e caracteres não alfanuméricos
        const normalizeKey = (s: string) => {
          return s
            .normalize('NFD')
            .replace(/\p{M}/gu, '') // remove diacritics
            .replace(/[^\p{L}\p{N}_]/gu, '') // keep letters, numbers, underscore
            .toLowerCase();
        };

        const replacements: Record<string, string> = {
          cliente: ticket.requester?.fullName || 'Cliente',
          clienteemail: ticket.requester?.email || '',
          empresa: ticket.requester?.company || 'Nossa Empresa',
          numerochamado: ticket.id?.toString().padStart(6, '0') || '',
          assunto: ticket.subject || '',
          agente: ticket.assignee?.fullName || 'Equipe de Suporte',
        };

        // Substituir tokens no formato {{Token}} — aceita letras Unicode e números
        processedContent = (processedContent || '').replace(/\{\{\s*([\p{L}\p{N}_]+)\s*\}\}/gu, (match, p1: string) => {
          const key = normalizeKey(p1);
          if (replacements[key] !== undefined) return replacements[key];
          if (key === 'dataatual' || key === 'currentdate' || key === 'current_date') return new Date().toLocaleDateString('pt-BR');
          if (key === 'horaatual' || key === 'currenttime' || key === 'current_time') return new Date().toLocaleTimeString('pt-BR');
          return match; // manter se não houver substituição
        });
      }

      // Atualizar content com processedContent antes de salvar
      content = processedContent;

      // Criar a interação
      const interaction = await storage.createTicketInteraction({
        ticketId,
        type,
        content,
        isInternal: isInternalBool,
        timeSpent: timeSpent ? parseFloat(timeSpent.toString()) : 0,
        contractId: contractId || null,
        createdBy: (req as any).user?.id || 1, // TODO: get from auth
      });

      // Processar anexos se existirem
      const files = req.files as Express.Multer.File[];
      const createdAttachments: Array<any> = [];
      if (files && files.length > 0) {
        for (const file of files) {
          const att = await storage.createAttachment({
            ticketId,
            fileName: file.filename,
            fileSize: file.size,
            mimeType: file.mimetype,
            filePath: file.path,
          });
          createdAttachments.push({
            id: att.id,
            fileName: file.filename,
            url: `${apiPrefix}/uploads/${file.filename}`,
            originalName: file.originalname,
            size: file.size,
            mimeType: file.mimetype,
          });
        }
      }

      // Atualizar as horas utilizadas do cliente se for necessário
      if (timeSpent && timeSpent > 0) {
        if (ticket?.requester) {
          const currentUsed = parseFloat(ticket.requester.usedHours || '0');
          const newUsed = currentUsed + parseFloat(timeSpent.toString());
          await storage.updateRequester(ticket.requesterId, {
            usedHours: newUsed.toString(),
          });
        }
      }

      // Se o campo `status` foi enviado junto com a interação, aplicar alteração de status
      let updatedTicket: any = null;
      const requestedStatus = (req.body as any).status;
      if (requestedStatus && typeof requestedStatus === 'string' && requestedStatus.trim() !== '') {
        const s = requestedStatus.trim().toLowerCase();
        let normalized: string | null = s;

        // Mapear variantes em português/inglês para os status do sistema
        if ([ 'concluido', 'concluído', 'resolved', 'resolvido', 'concluded' ].includes(s)) normalized = 'resolved';
        if ([ 'cancelado', 'cancelled', 'canceled', 'closed', 'fechado' ].includes(s)) normalized = 'closed';

        try {
          updatedTicket = await storage.changeTicketStatus(ticketId, normalized as string);
        } catch (statusErr) {
          console.error('Error changing ticket status after creating interaction:', statusErr);
        }
      }

      res.status(201).json({ interaction, attachments: createdAttachments, ticket: updatedTicket });
    } catch (error) {
      console.error('Error creating interaction:', error);
      res.status(500).json({ message: 'An error occurred creating the interaction' });
    }
  });

  // Endpoint simples para upload de arquivos (usado para imagens coladas/embutidas antes de submeter o HTML)
  app.post(`${apiPrefix}/uploads`, upload.array('files', 20), async (req: Request, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) return res.status(400).json({ message: 'No files uploaded' });

      const result = files.map(f => ({
        originalName: f.originalname,
        fileName: f.filename,
        url: `${apiPrefix}/uploads/${f.filename}`,
        size: f.size,
        mimeType: f.mimetype,
      }));

      res.json(result);
    } catch (error) {
      console.error('Error uploading files:', error);
      res.status(500).json({ message: 'An error occurred uploading files' });
    }
  });

  // Response Templates routes
  app.get(`${apiPrefix}/response-templates`, async (req: Request, res: Response) => {
    try {
      const { category, isActive } = req.query;
      
      let templates;
      if (category) {
        templates = await storage.getResponseTemplatesByCategory(category as string);
      } else {
        templates = await storage.getAllResponseTemplates();
      }
      
      // Filtrar por ativo se especificado
      if (isActive !== undefined) {
        const active = isActive === 'true';
        templates = templates.filter((t: any) => t.isActive === active);
      }
      
      res.json(templates);
    } catch (error) {
      console.error('Error fetching response templates:', error);
      res.status(500).json({ message: 'An error occurred fetching response templates' });
    }
  });

  app.get(`${apiPrefix}/response-templates/:id`, async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const template = await storage.getResponseTemplate(id);
      
      if (!template) {
        return res.status(404).json({ message: 'Response template not found' });
      }
      
      res.json(template);
    } catch (error) {
      console.error('Error fetching response template:', error);
      res.status(500).json({ message: 'An error occurred fetching the response template' });
    }
  });

  // Endpoint para processar template com variáveis específicas do ticket
  app.post(`${apiPrefix}/response-templates/:id/process`, async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const { ticketId } = req.body;
      
      const template = await storage.getResponseTemplate(id);
      if (!template) {
        return res.status(404).json({ message: 'Response template not found' });
      }
      
      let processedContent = template.content;

      // Helper to safely get ticket fields
      const getTicket = async (id: number) => {
        try {
          return await storage.getTicketWithRelations(id);
        } catch (err) {
          return null;
        }
      }

      // Se ticketId for fornecido, buscar dados do ticket e substituir variáveis
      if (ticketId) {
        const ticket = await getTicket(Number(ticketId));

        if (ticket) {
          // Map de tokens (aceitamos variantes em inglês e português)
          const tokenMap: Record<string, string> = {
            // cliente
            '{{customer_name}}': ticket.requester?.fullName || 'Cliente',
            '{{cliente}}': ticket.requester?.fullName || 'Cliente',
            '{{Cliente}}': ticket.requester?.fullName || 'Cliente',
            '{{customer_email}}': ticket.requester?.email || '',
            '{{cliente_email}}': ticket.requester?.email || '',
            '{{ClienteEmail}}': ticket.requester?.email || '',
            // empresa
            '{{company_name}}': ticket.requester?.company || 'Nossa Empresa',
            '{{empresa}}': ticket.requester?.company || 'Nossa Empresa',
            '{{Empresa}}': ticket.requester?.company || 'Nossa Empresa',
            // ticket
            '{{ticket_number}}': ticket.id?.toString().padStart(6, '0') || '',
            '{{numero_chamado}}': ticket.id?.toString().padStart(6, '0') || '',
            '{{NúmeroChamado}}': ticket.id?.toString().padStart(6, '0') || '',
            '{{ticket_subject}}': ticket.subject || '',
            '{{assunto}}': ticket.subject || '',
            '{{Assunto}}': ticket.subject || '',
            // agente
            '{{agent_name}}': ticket.assignee?.fullName || 'Equipe de Suporte',
            '{{agente}}': ticket.assignee?.fullName || 'Equipe de Suporte',
            '{{Agente}}': ticket.assignee?.fullName || 'Equipe de Suporte'
          };

          for (const [token, val] of Object.entries(tokenMap)) {
            const re = new RegExp(token.replace(/[{}]/g, m => `\\${m}`), 'g');
            processedContent = processedContent.replace(re, val);
          }
        }
      }
      
      // Variáveis gerais sempre processadas
      processedContent = processedContent.replace(/\{\{current_date\}\}/g, new Date().toLocaleDateString('pt-BR'));
      processedContent = processedContent.replace(/\{\{current_time\}\}/g, new Date().toLocaleTimeString('pt-BR'));
      
      res.json({
        ...template,
        content: processedContent
      });
    } catch (error) {
      console.error('Error processing response template:', error);
      res.status(500).json({ message: 'An error occurred processing the response template' });
    }
  });

  app.post(`${apiPrefix}/response-templates`, async (req: Request, res: Response) => {
    try {
      const { title, content, category, isActive = true } = req.body;

      if (!title || !content) {
        return res.status(400).json({ message: 'title and content are required' });
      }

      // Normalize category to allowed enum values. Accept legacy value 'general' -> 'other'.
      const allowedCategories = ['technical_support', 'financial', 'commercial', 'other'];
      let cat = (category || '').toString().toLowerCase();
      if (cat === 'general') cat = 'other';
      if (!allowedCategories.includes(cat)) {
        console.warn(`Unknown response template category received: ${category} - defaulting to 'other'`);
        cat = 'other';
      }

      const template = await storage.createResponseTemplate({
        title,
        content,
        category: cat,
        isActive: Boolean(isActive),
      });

      res.status(201).json(template);
    } catch (error) {
      console.error('Error creating response template:', error);
      res.status(500).json({ message: 'An error occurred creating the response template' });
    }
  });

  // Update response template (PATCH)
  app.patch(`${apiPrefix}/response-templates/:id`, async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: 'Invalid template id' });

      const updates: any = { ...req.body };

      // Normalize category if provided
      if (updates.category) {
        const allowedCategories = ['technical_support', 'financial', 'commercial', 'other'];
        let cat = updates.category.toString().toLowerCase();
        if (cat === 'general') cat = 'other';
        if (!allowedCategories.includes(cat)) cat = 'other';
        updates.category = cat;
      }

      // If title provided, map to DB column name later in storage implementation
      const updated = await storage.updateResponseTemplate(id, updates as any);

      if (!updated) return res.status(404).json({ message: 'Response template not found' });

      res.json(updated);
    } catch (error) {
      console.error('Error updating response template:', error);
      res.status(500).json({ message: 'An error occurred updating the response template' });
    }
  });

  // Delete response template
  app.delete(`${apiPrefix}/response-templates/:id`, async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: 'Invalid template id' });

      const success = await storage.deleteResponseTemplate(id);
      if (!success) return res.status(404).json({ message: 'Response template not found' });

      res.status(204).end();
    } catch (error) {
      console.error('Error deleting response template:', error);
      res.status(500).json({ message: 'An error occurred deleting the response template' });
    }
  });

  // System Settings routes
  app.get(`${apiPrefix}/settings`, requireAuthAndPermission('settings:view'), async (req: Request, res: Response) => {
    try {
      const { category } = req.query;
      const user = req.user as any;
      
      // Client users não têm acesso a configurações do sistema
      if (user.role === 'client_user' || user.role === 'client_manager') {
        return res.status(403).json({ message: 'Acesso negado a configurações do sistema' });
      }
      
      let settings;
      if (category) {
        settings = await storage.getSystemSettingsByCategory(category as any);
      } else {
        settings = await storage.getAllSystemSettings();
      }
      
      // Transform to grouped object by category
      const groupedSettings: Record<string, Record<string, any>> = {};
      
      for (const setting of settings) {
        if (!groupedSettings[setting.category]) {
          groupedSettings[setting.category] = {};
        }
        
        // Remove category prefix from key
        const cleanKey = setting.key.replace(`${setting.category}.`, '');
        groupedSettings[setting.category][cleanKey] = setting.value;
      }
      
      res.json(groupedSettings);
    } catch (error) {
      console.error('Error fetching settings:', error);
      res.status(500).json({ message: 'An error occurred fetching settings' });
    }
  });

  app.get(`${apiPrefix}/settings/:key`, requireAuthAndPermission('settings:view'), async (req: Request, res: Response) => {
    try {
      const key = req.params.key;
      const user = req.user as any;
      
      // Client users não têm acesso a configurações do sistema
      if (user.role === 'client_user' || user.role === 'client_manager') {
        return res.status(403).json({ message: 'Acesso negado a configurações do sistema' });
      }
      
      const setting = await storage.getSystemSetting(key);
      
      if (!setting) {
        return res.status(404).json({ message: 'Setting not found' });
      }
      
      res.json(setting);
    } catch (error) {
      console.error('Error fetching setting:', error);
      res.status(500).json({ message: 'An error occurred fetching the setting' });
    }
  });

  app.post(`${apiPrefix}/settings`, requireAuthAndPermission('settings:manage'), async (req: Request, res: Response) => {
    try {
      const data = updateSystemSettingsSchema.parse(req.body);
      
      const results: Record<string, boolean> = {};
      
      // Process each category
      for (const [category, settings] of Object.entries(data)) {
        if (settings) {
          const success = await storage.bulkUpdateSettings(settings, category as any);
          results[category] = success;
        }
      }
      
      const allSuccess = Object.values(results).every(success => success);
      
      if (allSuccess) {
        res.json({ 
          success: true, 
          message: 'Settings updated successfully',
          results 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: 'Some settings failed to update',
          results 
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Validation error', errors: error.errors });
      } else {
        console.error('Error updating settings:', error);
        res.status(500).json({ message: 'An error occurred updating settings' });
      }
    }
  });

  app.put(`${apiPrefix}/settings/:key`, requireAuthAndPermission('settings:manage'), async (req: Request, res: Response) => {
    try {
      const key = req.params.key;
      const { value } = req.body;
      
      if (value === undefined) {
        return res.status(400).json({ message: 'value is required' });
      }
      
      const setting = await storage.updateSystemSetting(key, value);
      
      if (!setting) {
        return res.status(404).json({ message: 'Setting not found' });
      }
      
      res.json(setting);
    } catch (error) {
      console.error('Error updating setting:', error);
      res.status(500).json({ message: 'An error occurred updating the setting' });
    }
  });

  app.delete(`${apiPrefix}/settings/:key`, requireAuthAndPermission('settings:manage'), async (req: Request, res: Response) => {
    try {
      const key = req.params.key;
      const success = await storage.deleteSystemSetting(key);
      
      if (!success) {
        return res.status(404).json({ message: 'Setting not found' });
      }
      
      res.status(204).end();
    } catch (error) {
      console.error('Error deleting setting:', error);
      res.status(500).json({ message: 'An error occurred deleting the setting' });
    }
  });

  // Rotas para Tags
  app.get(`${apiPrefix}/tags`, async (req: Request, res: Response) => {
    try {
      const tags = await storage.getTags();
      res.json(tags);
    } catch (error) {
      console.error('Error getting tags:', error);
      res.status(500).json({ message: 'An error occurred getting tags' });
    }
  });

  app.post(`${apiPrefix}/tags`, async (req: Request, res: Response) => {
    try {
      const { name, color } = req.body;
      
      if (!name || !color) {
        return res.status(400).json({ message: 'name and color are required' });
      }
      
      const tag = await storage.createTag({ name, color });
      res.status(201).json(tag);
    } catch (error) {
      console.error('Error creating tag:', error);
      res.status(500).json({ message: 'An error occurred creating the tag' });
    }
  });

  app.put(`${apiPrefix}/tags/:id`, async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: 'Invalid tag id' });

      const { name, color } = req.body;
      if (!name && !color) return res.status(400).json({ message: 'name or color required' });

      const updated = await storage.updateTag(id, { name, color });
      if (!updated) return res.status(404).json({ message: 'Tag not found' });

      res.json(updated);
    } catch (error) {
      console.error('Error updating tag:', error);
      res.status(500).json({ message: 'An error occurred updating the tag' });
    }
  });

  // Update tag
  app.put(`${apiPrefix}/tags/:id`, async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: 'Invalid tag id' });

      const { name, color } = req.body;
      if (!name && !color) return res.status(400).json({ message: 'name or color required' });

      const updated = await storage.updateTag(id, { name, color });
      if (!updated) return res.status(404).json({ message: 'Tag not found' });

      res.json(updated);
    } catch (error) {
      console.error('Error updating tag:', error);
      res.status(500).json({ message: 'An error occurred updating the tag' });
    }
  });

  app.delete(`${apiPrefix}/tags/:id`, async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const success = await storage.deleteTag(id);
      
      if (!success) {
        return res.status(404).json({ message: 'Tag not found' });
      }
      
      res.status(204).end();
    } catch (error) {
      console.error('Error deleting tag:', error);
      res.status(500).json({ message: 'An error occurred deleting the tag' });
    }
  });

  // Rotas para Tags de Tickets
  app.get(`${apiPrefix}/tickets/:id/tags`, async (req: Request, res: Response) => {
    try {
      const ticketId = Number(req.params.id);
      const tags = await storage.getTicketTags(ticketId);
      res.json(tags);
    } catch (error) {
      console.error('Error getting ticket tags:', error);
      res.status(500).json({ message: 'An error occurred getting ticket tags' });
    }
  });

  app.post(`${apiPrefix}/tickets/:id/tags`, async (req: Request, res: Response) => {
    try {
      const ticketId = Number(req.params.id);
      const { tagId, tagName, color } = req.body;

      // If tagId provided, just link
      if (tagId) {
        await storage.addTicketTag(ticketId, Number(tagId));
        return res.status(201).json({ message: 'Tag added to ticket' });
      }

      // If tagName provided, create the tag then link
      if (tagName && typeof tagName === 'string') {
        // color is optional; provide a default if missing
        const tagColor = (color && typeof color === 'string') ? color : '#6B7280';
        const created = await storage.createTag({ name: tagName.trim(), color: tagColor });
        await storage.addTicketTag(ticketId, created.id);
        return res.status(201).json(created);
      }

      return res.status(400).json({ message: 'tagId or tagName is required' });
    } catch (error) {
      console.error('Error adding tag to ticket:', error);
      res.status(500).json({ message: 'An error occurred adding tag to ticket' });
    }
  });

  app.delete(`${apiPrefix}/tickets/:id/tags/:tagId`, async (req: Request, res: Response) => {
    try {
      const ticketId = Number(req.params.id);
      const tagId = Number(req.params.tagId);
      
      const success = await storage.removeTicketTag(ticketId, tagId);
      // Make DELETE idempotent: return 204 even if the relation did not exist.
      // This avoids spurious 404 errors when clients retry or race conditions occur.
      return res.status(204).end();
    } catch (error) {
      console.error('Error removing tag from ticket:', error);
      res.status(500).json({ message: 'An error occurred removing tag from ticket' });
    }
  });

  // Rotas para Links entre Tickets
  app.get(`${apiPrefix}/tickets/:id/links`, async (req: Request, res: Response) => {
    try {
      const ticketId = Number(req.params.id);
      const links = await storage.getTicketLinks(ticketId);
      res.json(links);
    } catch (error) {
      console.error('Error getting ticket links:', error);
      res.status(500).json({ message: 'An error occurred getting ticket links' });
    }
  });

  app.post(`${apiPrefix}/tickets/:id/links`, async (req: Request, res: Response) => {
    try {
      const sourceTicketId = Number(req.params.id);
      const { targetTicketId, linkType, description } = req.body;
      
      if (!targetTicketId || !linkType) {
        return res.status(400).json({ message: 'targetTicketId and linkType are required' });
      }
      
      // Verificar se os tickets existem
      const sourceTicket = await storage.getTicket(sourceTicketId);
      const targetTicket = await storage.getTicket(targetTicketId);
      
      if (!sourceTicket) {
        return res.status(404).json({ message: 'Source ticket not found' });
      }
      
      if (!targetTicket) {
        return res.status(404).json({ message: 'Target ticket not found' });
      }
      
      // Evitar auto-link
      if (sourceTicketId === targetTicketId) {
        return res.status(400).json({ message: 'Cannot link ticket to itself' });
      }
      
      // Map frontend link types to DB enum values
      const mapLinkType = (incoming: string) => {
        const m: Record<string, string> = {
          related_to: 'related',
          duplicate_of: 'duplicate',
          caused_by: 'parent', // interpretado como relação pai/causa
          blocks: 'blocks',
          blocked_by: 'blocked_by',
          child_of: 'child',
          parent_of: 'parent'
        };
        return m[incoming] || incoming;
      };

      const mappedType = mapLinkType(linkType);

      try {
        const link = await storage.createTicketLink({
          sourceTicketId,
          targetTicketId,
          linkType: mappedType,
          description
        });
        return res.status(201).json(link);
      } catch (dbErr: any) {
        console.error('DB error creating ticket link:', dbErr);
        // Detect enum error and return friendly message
        if (dbErr?.cause?.code === '22P02' || /enum/i.test(dbErr?.cause?.message || '')) {
          return res.status(400).json({ message: `Invalid linkType: ${linkType}` });
        }
        throw dbErr;
      }
    } catch (error) {
      console.error('Error creating ticket link:', error);
      res.status(500).json({ message: 'An error occurred creating ticket link' });
    }
  });

  app.delete(`${apiPrefix}/tickets/:id/links/:linkId`, async (req: Request, res: Response) => {
    try {
      const ticketId = Number(req.params.id);
      const linkId = Number(req.params.linkId);
      
      const success = await storage.removeTicketLink(linkId, ticketId);
      
      if (!success) {
        return res.status(404).json({ message: 'Link not found' });
      }
      
      res.status(204).end();
    } catch (error) {
      console.error('Error removing ticket link:', error);
      res.status(500).json({ message: 'An error occurred removing ticket link' });
    }
  });

  // ============ CONTRACTS ROUTES ============
  
  // Listar todos os contratos
  app.get(`${apiPrefix}/contracts`, requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      
      if (user.role === 'admin' || user.role === 'helpdesk_manager' || user.role === 'helpdesk_agent') {
        // Helpdesk pode ver todos os contratos
        const contracts = await storage.getAllContracts();
        res.json(contracts);
      } else if (user.role === 'client_manager' && user.company) {
        // Client managers só veem contratos da própria empresa
        // Primeiro buscar empresa por nome para obter o ID
        const companies = await storage.getAllCompanies();
        const company = companies.find(c => c.name === user.company);
        
        if (company) {
          const contracts = await storage.getContractsByCompany(company.id);
          res.json({ success: true, data: contracts });
        } else {
          res.json({ success: true, data: [] });
        }
      } else if (user.role === 'client_user') {
        // Client users têm acesso muito limitado - apenas contratos associados a tickets que podem ver
        return res.status(403).json({ message: 'Acesso negado aos contratos do sistema' });
      } else {
        return res.status(403).json({ message: 'Acesso negado aos contratos' });
      }
    } catch (error) {
      console.error('Error fetching contracts:', error);
      res.status(500).json({ message: 'An error occurred fetching contracts' });
    }
  });

  // Criar novo contrato
  app.post(`${apiPrefix}/contracts`, requireAuthAndPermission('companies:manage'), async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      
      // Client users não podem criar contratos
      if (user.role === 'client_user' || user.role === 'client_manager') {
        return res.status(403).json({ message: 'Acesso negado para criar contratos' });
      }
      
      const contractData = req.body;
      const contract = await storage.createContract(contractData);
      res.status(201).json(contract);
    } catch (error) {
      console.error('Error creating contract:', error);
      res.status(500).json({ message: 'An error occurred creating contract' });
    }
  });

  // Atualizar contrato
  app.put(`${apiPrefix}/contracts/:id`, requireAuthAndPermission('companies:manage'), async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      
      // Client users não podem editar contratos
      if (user.role === 'client_user' || user.role === 'client_manager') {
        return res.status(403).json({ message: 'Acesso negado para editar contratos' });
      }
      
      const contractId = req.params.id;
      const updateData = req.body;
      const contract = await storage.updateContract(contractId, updateData);
      
      if (!contract) {
        return res.status(404).json({ message: 'Contract not found' });
      }
      
      res.json(contract);
    } catch (error) {
      console.error('Error updating contract:', error);
      res.status(500).json({ message: 'An error occurred updating contract' });
    }
  });

  // Deletar contrato
  app.delete(`${apiPrefix}/contracts/:id`, requireAuthAndPermission('companies:manage'), async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      
      // Client users não podem deletar contratos
      if (user.role === 'client_user' || user.role === 'client_manager') {
        return res.status(403).json({ message: 'Acesso negado para deletar contratos' });
      }
      
      const contractId = req.params.id;
      const success = await storage.deleteContract(contractId);
      
      if (!success) {
        return res.status(404).json({ message: 'Contract not found' });
      }
      
      res.status(204).end();
    } catch (error) {
      console.error('Error deleting contract:', error);
      res.status(500).json({ message: 'An error occurred deleting contract' });
    }
  });

  // Buscar contratos disponíveis para um ticket (baseado na empresa)
  app.get(`${apiPrefix}/tickets/:id/contracts`, async (req: Request, res: Response) => {
    try {
      const ticketId = Number(req.params.id);
      const contracts = await storage.getContractsForTicket(ticketId);
      res.json(contracts);
    } catch (error) {
      console.error('Error fetching contracts for ticket:', error);
      res.status(500).json({ message: 'An error occurred fetching contracts' });
    }
  });

  // Buscar empresas (para dropdown nos contratos)
  app.get(`${apiPrefix}/companies`, requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      
      if (user.role === 'admin' || user.role === 'helpdesk_manager' || user.role === 'helpdesk_agent') {
        // Helpdesk pode ver todas as empresas
        const companies = await storage.getAllCompanies();
        res.json(companies);
      } else if (user.role === 'client_manager' && user.company) {
        // Client managers só veem sua própria empresa
        const companies = await storage.getAllCompanies();
        const userCompany = companies.find(c => c.name === user.company);
        res.json(userCompany ? [userCompany] : []);
      } else if (user.role === 'client_user') {
        // Client users não têm acesso à lista de empresas
        return res.status(403).json({ message: 'Acesso negado à lista de empresas' });
      } else {
        return res.status(403).json({ message: 'Acesso negado às empresas' });
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
      res.status(500).json({ message: 'An error occurred fetching companies' });
    }
  });

  // ============ END CONTRACTS ROUTES ============

  const httpServer = createServer(app);
  return httpServer;
}
