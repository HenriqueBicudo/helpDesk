import type { Express, Request, Response, NextFunction } from "express";
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
import { contractSimpleRoutes } from "./http/routes/contract-simple.routes";
import { slaRoutes } from "./http/routes/sla.routes";
import { accessRoutes } from "./http/routes/access.routes";

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

  // Health check endpoint
  app.get(`${apiPrefix}/health`, (req: Request, res: Response) => {
    res.json({ status: 'OK', timestamp: new Date() });
  });

  // Contract routes (modular) 
  app.use(`${apiPrefix}/contracts`, contractSimpleRoutes);
  
  // SLA routes (Sprint 4)
  app.use(`${apiPrefix}/sla`, slaRoutes);
  
  // Access routes (Admin only)
  app.use(`${apiPrefix}/access`, accessRoutes);

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

  // Ticket routes
  app.get(`${apiPrefix}/tickets`, requireAuthAndPermission('tickets:view_all'), async (req: Request, res: Response) => {
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
      } else {
        // Clientes só podem ver tickets da própria empresa
        tickets = await storage.getTicketsByCompany(user.company!);
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
      
      res.json(ticket);
    } catch (error) {
      console.error('Error fetching ticket:', error);
      res.status(500).json({ message: 'An error occurred fetching the ticket' });
    }
  });

  app.post(`${apiPrefix}/tickets`, requireAuthAndPermission('tickets:create'), async (req: Request, res: Response) => {
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
      
      // Buscar ticket atual para verificar se tem contrato associado
      const currentTicket = await storage.getTicket(id);
      if (!currentTicket) {
        return res.status(404).json({ message: 'Ticket not found' });
      }
      
      const ticket = await storage.changeTicketStatus(id, status);
      
      if (!ticket) {
        return res.status(404).json({ message: 'Ticket not found' });
      }
      
      // Se o ticket foi resolvido e tem contrato associado, contabilizar horas
      if (status === 'resolved' && currentTicket.contractId) {
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
  app.get(`${apiPrefix}/statistics`, async (req: Request, res: Response) => {
    try {
      const stats = await storage.getTicketStatistics();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: 'An error occurred fetching statistics' });
    }
  });

  app.get(`${apiPrefix}/statistics/categories`, async (req: Request, res: Response) => {
    try {
      const categoryStats = await storage.getTicketCategoriesCount();
      res.json(categoryStats);
    } catch (error) {
      res.status(500).json({ message: 'An error occurred fetching category statistics' });
    }
  });

  app.get(`${apiPrefix}/statistics/volume`, async (req: Request, res: Response) => {
    try {
      const volumeStats = await storage.getTicketVolumeByDate();
      res.json(volumeStats);
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
      const { type, content, isInternal = 'false', timeSpent = 0, contractId } = req.body;
      
      if (!type || !content) {
        return res.status(400).json({ message: 'type and content are required' });
      }
      
      // Converter isInternal corretamente (FormData sempre envia como string)
      const isInternalBool = isInternal === 'true' || isInternal === true;
      
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
      if (files && files.length > 0) {
        for (const file of files) {
          await storage.createAttachment({
            ticketId,
            fileName: file.filename,
            fileSize: file.size,
            mimeType: file.mimetype,
            filePath: file.path,
          });
        }
      }
      
      // Atualizar as horas utilizadas do cliente se for necessário
      if (timeSpent && timeSpent > 0) {
        const ticket = await storage.getTicketWithRelations(ticketId);
        if (ticket?.requester) {
          const currentUsed = parseFloat(ticket.requester.usedHours || '0');
          const newUsed = currentUsed + parseFloat(timeSpent.toString());
          await storage.updateRequester(ticket.requesterId, {
            usedHours: newUsed.toString(),
          });
        }
      }
      
      res.status(201).json(interaction);
    } catch (error) {
      console.error('Error creating interaction:', error);
      res.status(500).json({ message: 'An error occurred creating the interaction' });
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
      
      // Se ticketId for fornecido, buscar dados do ticket
      if (ticketId) {
        const ticket = await storage.getTicketWithRelations(ticketId);
        
        if (ticket) {
          // Substituir variáveis com dados reais
          processedContent = processedContent.replace(/\{\{customer_name\}\}/g, ticket.requester?.fullName || 'Cliente');
          processedContent = processedContent.replace(/\{\{customer_email\}\}/g, ticket.requester?.email || '');
          processedContent = processedContent.replace(/\{\{company_name\}\}/g, ticket.requester?.company || 'Nossa Empresa');
          processedContent = processedContent.replace(/\{\{ticket_number\}\}/g, ticket.id?.toString().padStart(6, '0') || '');
          processedContent = processedContent.replace(/\{\{ticket_subject\}\}/g, ticket.subject || '');
          processedContent = processedContent.replace(/\{\{agent_name\}\}/g, ticket.assignee?.fullName || 'Equipe de Suporte');
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
      
      if (!title || !content || !category) {
        return res.status(400).json({ message: 'title, content, and category are required' });
      }
      
      const template = await storage.createResponseTemplate({
        title,
        content,
        category,
        isActive: Boolean(isActive),
      });
      
      res.status(201).json(template);
    } catch (error) {
      console.error('Error creating response template:', error);
      res.status(500).json({ message: 'An error occurred creating the response template' });
    }
  });

  // System Settings routes
  app.get(`${apiPrefix}/settings`, async (req: Request, res: Response) => {
    try {
      const { category } = req.query;
      
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

  app.get(`${apiPrefix}/settings/:key`, async (req: Request, res: Response) => {
    try {
      const key = req.params.key;
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

  app.post(`${apiPrefix}/settings`, async (req: Request, res: Response) => {
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

  app.put(`${apiPrefix}/settings/:key`, async (req: Request, res: Response) => {
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

  app.delete(`${apiPrefix}/settings/:key`, async (req: Request, res: Response) => {
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
      const { tagId } = req.body;
      
      if (!tagId) {
        return res.status(400).json({ message: 'tagId is required' });
      }
      
      await storage.addTicketTag(ticketId, tagId);
      res.status(201).json({ message: 'Tag added to ticket' });
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
      
      if (!success) {
        return res.status(404).json({ message: 'Tag not found on ticket' });
      }
      
      res.status(204).end();
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
      
      const link = await storage.createTicketLink({
        sourceTicketId,
        targetTicketId,
        linkType,
        description
      });
      
      res.status(201).json(link);
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
  app.get(`${apiPrefix}/contracts`, async (req: Request, res: Response) => {
    try {
      const contracts = await storage.getAllContracts();
      res.json(contracts);
    } catch (error) {
      console.error('Error fetching contracts:', error);
      res.status(500).json({ message: 'An error occurred fetching contracts' });
    }
  });

  // Criar novo contrato
  app.post(`${apiPrefix}/contracts`, async (req: Request, res: Response) => {
    try {
      const contractData = req.body;
      const contract = await storage.createContract(contractData);
      res.status(201).json(contract);
    } catch (error) {
      console.error('Error creating contract:', error);
      res.status(500).json({ message: 'An error occurred creating contract' });
    }
  });

  // Atualizar contrato
  app.put(`${apiPrefix}/contracts/:id`, async (req: Request, res: Response) => {
    try {
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
  app.delete(`${apiPrefix}/contracts/:id`, async (req: Request, res: Response) => {
    try {
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
  app.get(`${apiPrefix}/companies`, async (req: Request, res: Response) => {
    try {
      const companies = await storage.getAllCompanies();
      res.json(companies);
    } catch (error) {
      console.error('Error fetching companies:', error);
      res.status(500).json({ message: 'An error occurred fetching companies' });
    }
  });

  // ============ END CONTRACTS ROUTES ============

  const httpServer = createServer(app);
  return httpServer;
}
