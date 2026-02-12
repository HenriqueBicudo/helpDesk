import type { Express, Request, Response, NextFunction } from "express";
import express from 'express';
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage-interface";
import { db } from "./db-postgres";
import { eq } from "drizzle-orm";
import { userTeams, teams } from "@shared/drizzle-schema";
import { 
  insertTicketSchema, 
  insertRequesterSchema, 
  insertUserSchema, 
  insertEmailTemplateSchema,
  emailTemplateTypeSchema,
  updateSystemSettingsSchema,
  insertCompanySchema
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
import { loginRateLimiter, createResourceRateLimiter, resetPasswordRateLimiter } from "./middleware/rate-limit";
import { sanitizeRequestBody } from "./middleware/sanitize";
import { emailService } from "./email-service";
import { ContractService } from "./services/contract.service";
import { slaEngineService } from "./services/slaEngine.service";
import { slaV2Service } from "./services/slaV2.service";
import { automationService } from "./services/automation.service";
import { contractSimpleRoutes } from "./http/routes/contract-simple.routes";
import { slaRoutes } from "./http/routes/sla.routes";
import slaTemplateRoutes from "./http/routes/sla-templates.routes";
import { slaV2Routes } from "./http/routes/sla-v2.routes";
import { accessRoutes } from "./http/routes/access.routes";
import { knowledgeRoutes } from './http/routes/knowledge.routes';
import ticketParticipantsRoutes from './http/routes/ticket-participants.routes';
import emailWebhookRoutes from './http/routes/email-webhook.routes';
import { settingsRoutes } from './http/routes/settings.routes';
import { tagsRoutes } from './http/routes/tags.routes';
import automationTriggersRoutes from './http/routes/automation-triggers.routes';
import teamCategoriesRoutes from './http/routes/team-categories.routes';
import servicesRoutes from './http/routes/services.routes';
import { resetUserPassword } from './routes/auth-reset';
// import googleMeetRoutes from './http/routes/google-meet.routes'; // DESABILITADO

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
  
  // Rota adicional para resetar senha de usuário (admin/manager)
  app.post('/api/auth/reset-user-password', resetUserPassword);
  
  // API routes prefix
  const apiPrefix = '/api';

  // Servir arquivos de upload estaticamente em /api/uploads
  app.use(`${apiPrefix}/uploads`, express.static(uploadDir));

  // Health check endpoint
  app.get(`${apiPrefix}/health`, (req: Request, res: Response) => {
    res.json({ status: 'OK', timestamp: new Date() });
  });

  // Rota para solicitação de registro (sem criar conta)
  app.post(`${apiPrefix}/request-access`, async (req: Request, res: Response) => {
    try {
      const { username, fullName, email, company } = req.body;
      
      // Validações básicas
      if (!username || !fullName || !email || !company) {
        return res.status(400).json({ 
          message: 'Todos os campos são obrigatórios' 
        });
      }
      
      if (!/\S+@\S+\.\S+/.test(email)) {
        return res.status(400).json({ 
          message: 'E-mail inválido' 
        });
      }
      
      // Verificar se já existe usuário com esse email ou username
      const existingUsers = await storage.getAllUsers();
      const emailExists = existingUsers.some((u: any) => u.email === email);
      const usernameExists = existingUsers.some((u: any) => u.username === username);
      
      if (emailExists || usernameExists) {
        return res.status(409).json({ 
          message: emailExists 
            ? 'Este e-mail já está em uso. Entre em contato com o administrador.' 
            : 'Este nome de usuário já está em uso. Tente outro.'
        });
      }
      
      // Enviar email para o administrador
      const adminEmail = 'henrique.bicudo@totvs.com.br';
      const timestamp = new Date().toLocaleString('pt-BR');
      
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">
            🔔 Nova Solicitação de Acesso - HelpDesk
          </h2>
          
          <p>Uma nova solicitação de acesso ao sistema foi recebida:</p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; width: 150px;">👤 Nome Completo:</td>
                <td style="padding: 8px 0;">${fullName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">🔑 Usuário:</td>
                <td style="padding: 8px 0;">${username}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">📧 E-mail:</td>
                <td style="padding: 8px 0;">${email}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">🏢 Empresa:</td>
                <td style="padding: 8px 0;">${company}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">🕐 Data/Hora:</td>
                <td style="padding: 8px 0;">${timestamp}</td>
              </tr>
            </table>
          </div>
          
          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
            <p style="margin: 0;"><strong>⚠️ Ação Necessária:</strong></p>
            <p style="margin: 10px 0 0 0;">
              Para conceder acesso a este usuário, você precisa:
              <ol style="margin: 10px 0;">
                <li>Criar a conta manualmente no sistema</li>
                <li>Definir uma senha temporária</li>
                <li>Enviar as credenciais para o usuário</li>
              </ol>
            </p>
          </div>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <p style="color: #6b7280; font-size: 12px; text-align: center;">
            Este é um email automático do Sistema HelpDesk TOTVS Curitiba<br>
            Enviado em ${timestamp}
          </p>
        </div>
      `;
      
      const emailSent = await emailService.sendEmail({
        to: adminEmail,
        from: adminEmail,
        subject: `🔔 Nova Solicitação de Acesso - ${fullName}`,
        html: emailHtml
      });
      
      if (emailSent) {
        console.log(`✅ Solicitação de acesso recebida de ${fullName} (${email})`);
        res.json({ 
          success: true,
          message: 'Solicitação enviada com sucesso!' 
        });
      } else {
        throw new Error('Falha ao enviar email');
      }
      
    } catch (error) {
      console.error('❌ Erro ao processar solicitação de acesso:', error);
      res.status(500).json({ 
        success: false,
        message: 'Erro ao processar solicitação. Tente novamente mais tarde.' 
      });
    }
  });

  // Contract routes (modular) 
  app.use(`${apiPrefix}/contracts`, contractSimpleRoutes);
  
  // SLA routes (Sprint 4)
  app.use(`${apiPrefix}/sla`, slaRoutes);
  app.use(`${apiPrefix}/sla/templates`, slaTemplateRoutes);
  
  // SLA V2 routes (Nova arquitetura)
  app.use(`${apiPrefix}/sla/v2`, slaV2Routes);
  
  // Access routes (Admin only)
  app.use(`${apiPrefix}/access`, accessRoutes);

  // Knowledge (Base de Conhecimento) routes
  app.use(`${apiPrefix}/knowledge`, knowledgeRoutes);

  // Tags routes
  app.use(`${apiPrefix}/tags`, tagsRoutes);

  // Google Meet routes (criar reuniões para tickets) - DESABILITADO
  // app.use(`${apiPrefix}`, googleMeetRoutes);

  // Ticket participants routes (solicitantes e CC)
  app.use(`${apiPrefix}/tickets`, ticketParticipantsRoutes);

  // Email webhook routes (receber respostas via email)
  app.use(`${apiPrefix}/email-webhook`, emailWebhookRoutes);

  // Settings routes (configurações do sistema)
  app.use(`${apiPrefix}/settings`, settingsRoutes);

  // Automation triggers routes (gatilhos personalizados)
  app.use(`${apiPrefix}/automation-triggers`, automationTriggersRoutes);

  // Team categories routes (categorias hierárquicas de equipes)
  app.use(`${apiPrefix}/team-categories`, teamCategoriesRoutes);

  // Services routes (serviços hierárquicos)
  app.use(`${apiPrefix}/services`, servicesRoutes);

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
  app.get(`${apiPrefix}/users`, requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      let users;
      
      // Admin e helpdesk managers podem ver todos os usuários
      if (user.role === 'admin' || user.role === 'helpdesk_manager') {
        users = await storage.getAllUsers();
      } else if (user.role === 'client_manager') {
        // Client managers veem usuários da própria empresa + agentes helpdesk (para atribuição)
        const clientUsers = await storage.getUsersByCompany(user.company!);
        const helpdeskUsers = (await storage.getAllUsers()).filter((u: any) => 
          ['admin', 'helpdesk_manager', 'helpdesk_agent'].includes(u.role)
        );
        users = [...clientUsers, ...helpdeskUsers];
      } else if (user.role === 'client_user') {
        // Client users só veem agentes/managers helpdesk (para atribuição)
        users = (await storage.getAllUsers()).filter((u: any) => 
          ['admin', 'helpdesk_manager', 'helpdesk_agent'].includes(u.role)
        );
      } else {
        // Outros roles: todos os usuários
        users = await storage.getAllUsers();
      }
      
      res.json(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ message: 'An error occurred fetching users' });
    }
  });
  
  // Endpoint para retornar as equipes de um usuário específico
  app.get(`${apiPrefix}/users/:userId/teams`, requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const user = req.user as any;
      
      // Verificar permissões: usuário pode ver apenas suas próprias equipes, 
      // a menos que seja admin ou manager
      if (userId !== user.id && user.role !== 'admin' && user.role !== 'helpdesk_manager') {
        return res.status(403).json({ message: 'Sem permissão para visualizar equipes de outros usuários' });
      }
      
      const result = await db.select({
        id: teams.id,
        name: teams.name,
        description: teams.description,
        isActive: teams.isActive,
        isPrimary: userTeams.isPrimary,
        joinedAt: userTeams.joinedAt
      })
      .from(userTeams)
      .innerJoin(teams, eq(userTeams.teamId, teams.id))
      .where(eq(userTeams.userId, userId));
      
      res.json(result);
    } catch (error) {
      console.error('Error fetching user teams:', error);
      res.status(500).json({ message: 'An error occurred fetching user teams' });
    }
  });
  
  app.post(`${apiPrefix}/users`, 
    requireAuthAndPermission('users:create'),
    createResourceRateLimiter,
    async (req: Request, res: Response) => {
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

  app.get(`${apiPrefix}/requesters/:id`, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const requester = await storage.getRequester(id);
      
      if (!requester) {
        return res.status(404).json({ message: 'Requester not found' });
      }
      
      res.json(requester);
    } catch (error) {
      console.error('Error fetching requester:', error);
      res.status(500).json({ message: 'An error occurred fetching the requester' });
    }
  });

  app.put(`${apiPrefix}/requesters/:id`, requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const data = insertRequesterSchema.partial().parse(req.body);
      const requester = await storage.updateRequester(id, data);
      res.json(requester);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Validation error', errors: error.errors });
      } else {
        res.status(500).json({ message: 'An error occurred updating the requester' });
      }
    }
  });

  app.delete(`${apiPrefix}/requesters/:id`, requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteRequester(id);
      res.json({ message: 'Requester deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'An error occurred deleting the requester' });
    }
  });

  // Requester notes routes (apenas para helpdesk)
  app.get(`${apiPrefix}/requesters/:id/notes`, requireAuth, async (req: Request, res: Response) => {
    try {
      const requesterId = parseInt(req.params.id);
      const user = req.user as any;

      // Apenas helpdesk pode ver anotações
      if (!['admin', 'helpdesk_manager', 'helpdesk_agent'].includes(user.role)) {
        return res.status(403).json({ message: 'Acesso negado' });
      }

      const notes = await storage.getRequesterNotes(requesterId);
      res.json(notes);
    } catch (error) {
      console.error('Error fetching requester notes:', error);
      res.status(500).json({ message: 'An error occurred fetching notes' });
    }
  });

  app.post(`${apiPrefix}/requesters/:id/notes`, requireAuth, async (req: Request, res: Response) => {
    try {
      const requesterId = parseInt(req.params.id);
      const user = req.user as any;
      const { content, isImportant } = req.body;

      // Apenas helpdesk pode criar anotações
      if (!['admin', 'helpdesk_manager', 'helpdesk_agent'].includes(user.role)) {
        return res.status(403).json({ message: 'Acesso negado' });
      }

      if (!content || content.trim() === '') {
        return res.status(400).json({ message: 'Content is required' });
      }

      const note = await storage.createRequesterNote({
        requesterId,
        content: content.trim(),
        authorId: user.id,
        isImportant: isImportant || false,
      });

      res.status(201).json(note);
    } catch (error) {
      console.error('Error creating requester note:', error);
      res.status(500).json({ message: 'An error occurred creating the note' });
    }
  });

  app.put(`${apiPrefix}/requesters/notes/:noteId`, requireAuth, async (req: Request, res: Response) => {
    try {
      const noteId = parseInt(req.params.noteId);
      const user = req.user as any;
      const { content, isImportant } = req.body;

      // Apenas helpdesk pode editar anotações
      if (!['admin', 'helpdesk_manager', 'helpdesk_agent'].includes(user.role)) {
        return res.status(403).json({ message: 'Acesso negado' });
      }

      const updates: any = {};
      if (content !== undefined) updates.content = content.trim();
      if (isImportant !== undefined) updates.isImportant = isImportant;

      const note = await storage.updateRequesterNote(noteId, updates);
      
      if (!note) {
        return res.status(404).json({ message: 'Note not found' });
      }

      res.json(note);
    } catch (error) {
      console.error('Error updating requester note:', error);
      res.status(500).json({ message: 'An error occurred updating the note' });
    }
  });

  app.delete(`${apiPrefix}/requesters/notes/:noteId`, requireAuth, async (req: Request, res: Response) => {
    try {
      const noteId = parseInt(req.params.noteId);
      const user = req.user as any;

      // Apenas helpdesk pode deletar anotações
      if (!['admin', 'helpdesk_manager', 'helpdesk_agent'].includes(user.role)) {
        return res.status(403).json({ message: 'Acesso negado' });
      }

      await storage.deleteRequesterNote(noteId);
      res.json({ message: 'Note deleted successfully' });
    } catch (error) {
      console.error('Error deleting requester note:', error);
      res.status(500).json({ message: 'An error occurred deleting the note' });
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

  // Global search endpoint
  app.get(`${apiPrefix}/search`, requireAuth, async (req: Request, res: Response) => {
    try {
      const { q } = req.query;
      const user = req.user as any;

      if (!q || typeof q !== 'string' || q.length < 2) {
        return res.json([]);
      }

      const searchTerm = q.toLowerCase();
      const results: any[] = [];

      // Buscar tickets
      try {
        let tickets;
        
        // Filtrar tickets baseado no role do usuário
        if (user.role === 'admin' || user.role === 'helpdesk_manager' || user.role === 'helpdesk_agent') {
          tickets = await storage.getAllTicketsWithRelations();
        } else if (user.role === 'client_manager') {
          const companyId = !isNaN(parseInt(user.company, 10)) 
            ? parseInt(user.company, 10) 
            : null;
          
          if (companyId) {
            tickets = await storage.getTicketsByCompanyId(companyId);
          } else {
            tickets = await storage.getTicketsByCompany(user.company);
          }
        } else if (user.role === 'client_user') {
          tickets = await storage.getTicketsByRequesterEmail(user.email);
        } else {
          tickets = [];
        }

        // Filtrar tickets pela busca
        const filteredTickets = tickets
          .filter(ticket => {
            const matchesId = ticket.id.toString().includes(searchTerm);
            const matchesSubject = ticket.subject.toLowerCase().includes(searchTerm);
            const matchesDescription = ticket.description?.toLowerCase().includes(searchTerm);
            const matchesRequester = ticket.requester?.fullName?.toLowerCase().includes(searchTerm) ||
                                    ticket.requester?.email?.toLowerCase().includes(searchTerm);
            
            return matchesId || matchesSubject || matchesDescription || matchesRequester;
          })
          .slice(0, 5); // Limitar a 5 resultados por tipo

        filteredTickets.forEach(ticket => {
          results.push({
            type: 'ticket',
            id: ticket.id,
            title: `#${ticket.id} - ${ticket.subject}`,
            subtitle: ticket.requester?.fullName || ticket.requester?.email,
            url: `/tickets/${ticket.id}`
          });
        });
      } catch (error) {
        console.error('Error searching tickets:', error);
      }

      // Buscar empresas (apenas para helpdesk)
      if (user.role === 'admin' || user.role === 'helpdesk_manager' || user.role === 'helpdesk_agent') {
        try {
          const companies = await storage.getAllCompanies();
          const filteredCompanies = companies
            .filter(company => 
              company.name.toLowerCase().includes(searchTerm) ||
              company.email?.toLowerCase().includes(searchTerm) ||
              company.cnpj?.includes(searchTerm)
            )
            .slice(0, 5);

          filteredCompanies.forEach(company => {
            results.push({
              type: 'company',
              id: company.id,
              title: company.name,
              subtitle: company.email || company.cnpj,
              url: `/customers?company=${company.id}`
            });
          });
        } catch (error) {
          console.error('Error searching companies:', error);
        }

        // Buscar clientes/requesters
        try {
          const requesters = await storage.getAllRequesters();
          const filteredRequesters = requesters
            .filter(requester =>
              requester.fullName.toLowerCase().includes(searchTerm) ||
              requester.email.toLowerCase().includes(searchTerm) ||
              requester.company?.toLowerCase().includes(searchTerm)
            )
            .slice(0, 5);

          filteredRequesters.forEach(requester => {
            results.push({
              type: 'requester',
              id: requester.id,
              title: requester.fullName,
              subtitle: `${requester.email}${requester.company ? ` - ${requester.company}` : ''}`,
              url: `/customers?requester=${requester.id}`
            });
          });
        } catch (error) {
          console.error('Error searching requesters:', error);
        }
      }

      // Ordenar resultados: tickets primeiro, depois empresas, depois requesters
      results.sort((a, b) => {
        const typeOrder = { ticket: 0, company: 1, requester: 2 };
        return typeOrder[a.type as keyof typeof typeOrder] - typeOrder[b.type as keyof typeof typeOrder];
      });

      res.json(results.slice(0, 10)); // Limitar a 10 resultados no total
    } catch (error) {
      console.error('Error performing search:', error);
      res.status(500).json({ message: 'Erro ao realizar busca' });
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
          console.error(`❌ [Tickets] client_manager ${user.id} não tem empresa!`);
          return res.status(403).json({ message: 'Usuário não está associado a uma empresa' });
        }
        
        // user.company pode ser ID numérico (string "4") ou nome da empresa
        const companyId = !isNaN(parseInt(user.company, 10)) 
          ? parseInt(user.company, 10) 
          : null;
        
        if (companyId) {
          console.log(`🏢 [Tickets] client_manager ${user.id} buscando tickets por companyId=${companyId}`);
          // Buscar por companyId numérico
          tickets = await storage.getTicketsByCompanyId(companyId);
        } else {
          console.log(`🏢 [Tickets] client_manager ${user.id} buscando tickets por company name="${user.company}"`);
          // Fallback: buscar pelo nome da empresa no requester
          tickets = await storage.getTicketsByCompany(user.company);
        }
        
        console.log(`🏢 [Tickets] encontrados ${tickets?.length ?? 0} tickets para empresa ${user.company}`);
        console.log(`🏢 [Tickets] IDs dos tickets:`, tickets?.map(t => ({ id: t.id, companyId: t.companyId, company: t.company?.name })));
      } else if (user.role === 'client_user') {
        // Client users só veem seus próprios tickets (associados ao e-mail do requester)
        console.log(`👤 [Tickets] client_user ${user.id} (${user.email}) buscando seus próprios tickets por e-mail...`);
        if (!user.email) {
          console.error(`❌ [Tickets] client_user ${user.id} não tem email!`);
          return res.status(403).json({ message: 'Usuário sem email configurado' });
        }
        tickets = await storage.getTicketsByRequesterEmail(user.email);
        console.log(`👤 [Tickets] encontrados ${tickets?.length ?? 0} tickets para requesterEmail=${user.email}`);
        console.log(`👤 [Tickets] IDs dos tickets:`, tickets?.map(t => ({ id: t.id, requesterEmail: t.requester?.email })));
      } else {
        return res.status(403).json({ message: 'Acesso negado aos tickets' });
      }
      
      // Filtrar tickets baseado nas permissões do usuário
      // Para clientes (client_user e client_manager), já limitamos a consulta corretamente,
      // então podemos liberar sem filtro adicional para evitar falsos negativos.
      const accessibleTickets = (user.role === 'client_user' || user.role === 'client_manager')
        ? tickets
        : tickets.filter(ticket => canUserAccessTicket(user, ticket));
      console.log(`🔒 [Tickets] Após filtro de acesso, restaram ${accessibleTickets.length} tickets para usuário ${user.id} (${user.role})`);
      
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
      
      // Log para debug
      console.log(`📋 [GET Ticket] ID: ${id}, serviceId: ${ticket.serviceId}, teamId: ${ticket.teamId}`);
      
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

  app.post(`${apiPrefix}/tickets`, 
    requireAuthAndPermission('tickets:create'),
    sanitizeRequestBody(['subject', 'description']),
    createResourceRateLimiter,
    async (req: Request, res: Response) => {
    try {
      const data = insertTicketSchema.parse(req.body);
      const user = req.user as any;
      
      console.log(`🎫 [Criar Ticket] Dados recebidos:`, {
        requesterId: data.requesterId,
        companyId: data.companyId,
        contractId: data.contractId,
        subject: data.subject,
        userRole: user?.role
      });

      // Para clientes (user ou manager), forçar solicitante e empresa vinculada
      if (user && (user.role === 'client_user' || user.role === 'client_manager')) {
        try {
          // Try to find an existing requester by the user's email
          let requester = await storage.getRequesterByEmail(user.email);
          if (!requester) {
            // Obter nome da empresa se user.company for um ID
            let companyName = user.company || undefined;
            if (companyName && !isNaN(parseInt(companyName, 10))) {
              // É um ID numérico, buscar o nome real da empresa
              try {
                const userCompanyId = parseInt(companyName, 10);
                const company = await storage.getCompanyById(userCompanyId);
                companyName = company?.name || companyName;
              } catch (err) {
                console.warn('Não foi possível resolver nome da empresa do ID:', companyName);
              }
            }
            
            // Create a requester record based on the authenticated user
            requester = await storage.createRequester({
              fullName: user.fullName,
              email: user.email,
              company: companyName,
              planType: 'basic',
              monthlyHours: 10,
              usedHours: '0'
            });
          }

          // Override the requesterId to the authenticated user's requester entry
          (data as any).requesterId = requester.id;

          // Vincular empresa do usuário ao ticket via lookup direto por nome
          if (!data.companyId && user.company) {
            try {
              // Se user.company for ID numérico, usar diretamente
              if (!isNaN(parseInt(user.company, 10))) {
                (data as any).companyId = parseInt(user.company, 10);
              } else {
                // Caso contrário, buscar por nome
                const company = await storage.getCompanyByName(user.company);
                if (company?.id) {
                  (data as any).companyId = company.id;
                }
              }
            } catch (cmpErr) {
              console.warn('Não foi possível vincular companyId ao ticket do cliente (lookup por nome):', cmpErr);
            }
          }

          // Auto-detectar contrato support da empresa se não especificado
          if (!data.contractId && data.companyId) {
            try {
              const contracts = await storage.getContractsByCompany(data.companyId);
              // Priorizar contratos type='support' ativos
              const supportContract = contracts.find((c: any) => 
                c.type === 'support' && c.status === 'active'
              );
              if (supportContract) {
                (data as any).contractId = supportContract.id;
                console.log(`🔗 [Auto-link] Contrato support ${supportContract.contractNumber} vinculado ao ticket`);
              }
            } catch (contractErr) {
              console.warn('Não foi possível auto-detectar contrato support:', contractErr);
            }
          }
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
      
      // Estratégia 1: Se usuário é client_manager/client_user, usar empresa dele
      if (!data.companyId && user && 
          (user.role === 'client_manager' || user.role === 'client_user') && 
          user.company) {
        try {
          console.log(`🔍 [Auto-link via User] Vinculando empresa do usuário ${user.role}: "${user.company}"`);
          // Se user.company for ID numérico, usar diretamente
          if (!isNaN(parseInt(user.company, 10))) {
            (data as any).companyId = parseInt(user.company, 10);
            console.log(`✅ [Auto-link via User] Empresa ID ${user.company} vinculada via usuário`);
          } else {
            // Caso contrário, buscar por nome
            const company = await storage.getCompanyByName(user.company);
            if (company?.id) {
              (data as any).companyId = company.id;
              console.log(`✅ [Auto-link via User] Empresa ${company.name} (ID: ${company.id}) vinculada via usuário`);
            }
          }
        } catch (cmpErr) {
          console.warn('❌ [Auto-link via User] Erro ao vincular empresa via usuário:', cmpErr);
        }
      }
      
      // Preencher companyId com base no requester se ainda não definido
      if (!data.companyId && data.requesterId) {
        try {
          console.log(`🔍 [Auto-link] Buscando requester ${data.requesterId}...`);
          const requester = await storage.getRequester(data.requesterId);
          console.log(`🔍 [Auto-link] Requester encontrado:`, {
            id: requester?.id,
            name: requester?.fullName,
            email: requester?.email,
            company: requester?.company
          });
          
          if (requester?.company) {
            // Tentar encontrar empresa pelo nome
            console.log(`🔍 [Auto-link] Buscando empresa com nome "${requester.company}"...`);
            const companies = await storage.getAllCompanies();
            console.log(`🔍 [Auto-link] Empresas disponíveis:`, companies.map(c => ({ id: c.id, name: c.name })));
            
            const matchingCompany = companies.find(c => c.name === requester.company);
            if (matchingCompany) {
              (data as any).companyId = matchingCompany.id;
              console.log(`✅ [Auto-link] Empresa ${matchingCompany.name} (ID: ${matchingCompany.id}) vinculada ao ticket via requester`);
            } else {
              console.log(`❌ [Auto-link] Nenhuma empresa encontrada com nome "${requester.company}"`);
            }
          } else {
            console.log(`⚠️ [Auto-link] Requester não tem campo "company" preenchido`);
            
            // Estratégia alternativa: buscar empresa através de usuários da empresa
            if (requester?.email) {
              console.log(`🔍 [Auto-link] Tentando encontrar empresa via email do requester: ${requester.email}`);
              try {
                // Buscar se existe um usuário com esse email
                const userByEmail = await storage.getUserByEmail(requester.email);
                if (userByEmail?.company) {
                  console.log(`🔍 [Auto-link] Usuário encontrado com empresa: ${userByEmail.company}`);
                  // Se user.company for ID numérico, usar diretamente
                  if (!isNaN(parseInt(userByEmail.company, 10))) {
                    (data as any).companyId = parseInt(userByEmail.company, 10);
                    console.log(`✅ [Auto-link] Empresa ID ${userByEmail.company} vinculada via usuário do requester`);
                  } else {
                    // Buscar por nome
                    const companies = await storage.getAllCompanies();
                    const matchingCompany = companies.find(c => c.name === userByEmail.company);
                    if (matchingCompany) {
                      (data as any).companyId = matchingCompany.id;
                      console.log(`✅ [Auto-link] Empresa ${matchingCompany.name} (ID: ${matchingCompany.id}) vinculada via usuário do requester`);
                    }
                  }
                }
              } catch (emailErr) {
                console.log(`⚠️ [Auto-link] Não foi possível buscar usuário por email:`, emailErr);
              }
            }
          }
        } catch (err) {
          console.warn('❌ [Auto-link] Erro ao auto-detectar companyId via requester:', err);
        }
      }
      
      // Alternativa: Se tem contractId mas não tem companyId, buscar empresa pelo contrato
      if (!data.companyId && data.contractId) {
        try {
          console.log(`🔍 [Auto-link via Contrato] Buscando empresa pelo contrato ${data.contractId}...`);
          const contract = await storage.getContract(data.contractId);
          if (contract?.companyId) {
            (data as any).companyId = contract.companyId;
            console.log(`✅ [Auto-link via Contrato] Empresa ID ${contract.companyId} vinculada ao ticket via contrato`);
          } else {
            console.log(`❌ [Auto-link via Contrato] Contrato não tem companyId`);
          }
        } catch (err) {
          console.warn('❌ [Auto-link via Contrato] Erro ao buscar empresa via contrato:', err);
        }
      }
      
      console.log(`📝 [Criar Ticket] Dados finais antes de criar:`, {
        requesterId: data.requesterId,
        companyId: data.companyId,
        contractId: data.contractId,
        subject: data.subject
      });
      
      console.log('🚀🚀🚀 [DEBUG] CÓDIGO ATUALIZADO - VERSÃO COM AUTOMAÇÃO 🚀🚀🚀');
      
      const ticket = await storage.createTicket(data);
      
      console.log(`✅ [Ticket Criado] Ticket #${ticket.id} criado com:`, {
        id: ticket.id,
        requesterId: ticket.requesterId,
        companyId: ticket.companyId,
        contractId: ticket.contractId
      });
      
      // Executar gatilhos de automação para ticket_created
      console.log('\n🎯 [Automation] Iniciando execução de gatilhos para ticket_created...');
      try {
        await automationService.executeTriggers('ticket_created', ticket, {});
        console.log('✅ [Automation] Gatilhos processados com sucesso\n');
      } catch (autoError) {
        console.error('❌ [Automation] Erro ao executar gatilhos:', autoError);
        // Não bloquear a criação do ticket por erro nos gatilhos
      }
      
      // Calcular e aplicar SLA V2.0 automaticamente
      if (ticket && ticket.id) {
        try {
          console.log(`🎯 [SLA V2] Calculando SLA para ticket #${ticket.id}...`);
          
          // Contratos usam string IDs (ex: CONTRACT_...), não converter para número
          const ticketContext = {
            ticketId: ticket.id,
            priority: ticket.priority as 'low' | 'medium' | 'high' | 'urgent' | 'critical',
            contractId: ticket.contractId || undefined,
            companyId: ticket.companyId || undefined,
            createdAt: ticket.createdAt,
          };
          
          console.log(`🔍 [SLA V2] Contexto do ticket:`, {
            ticketId: ticketContext.ticketId,
            priority: ticketContext.priority,
            contractId: ticketContext.contractId,
            companyId: ticketContext.companyId
          });
          
          const slaResult = await slaV2Service.calculateTicketSla(ticketContext);
          
          console.log(`✅ [SLA V2] SLA calculado para ticket #${ticket.id}:`, {
            resposta: slaResult.responseDueAt.toISOString(),
            solucao: slaResult.solutionDueAt.toISOString(),
            template: slaResult.templateId,
            calendario: slaResult.calendarId,
          });
          
          // Atualizar o ticket com os prazos calculados
          await storage.updateTicket(ticket.id, {
            responseDueAt: slaResult.responseDueAt,
            solutionDueAt: slaResult.solutionDueAt,
          });
          
          console.log(`📅 [SLA V2] Prazos aplicados ao ticket #${ticket.id}`);
          
        } catch (slaError) {
          console.error(`⚠️ [SLA V2] Erro ao calcular SLA para ticket #${ticket.id}:`, slaError);
          
          // Fallback para sistema SLA V1 em caso de erro
          if (ticket.contractId) {
            try {
              console.log(`🔄 [SLA V1] Fallback - usando sistema antigo para ticket #${ticket.id}`);
              await slaEngineService.calculateAndApplyDeadlines(ticket.id);
              console.log(`✅ [SLA V1] SLA aplicado via fallback ao ticket #${ticket.id}`);
            } catch (fallbackError) {
              console.error(`❌ [SLA] Falha completa no cálculo SLA para ticket #${ticket.id}:`, fallbackError);
            }
          }
        }
      }
      
      res.status(201).json(ticket);
    } catch (error) {
      console.error('Error creating ticket:', error);
      if (error instanceof z.ZodError) {
        console.error('Validation errors:', error.errors);
        res.status(400).json({ message: 'Validation error', errors: error.errors });
      } else {
        console.error('Detailed error:', error);
        res.status(500).json({ message: 'An error occurred creating the ticket', error: error instanceof Error ? error.message : String(error) });
      }
    }
  });

  app.patch(`${apiPrefix}/tickets/:id`, async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const updates = req.body;
      
      // Log para debug
      console.log(`🔄 [PATCH Ticket] ID: ${id}, updates:`, { serviceId: updates.serviceId, teamId: updates.teamId, ...updates });
      
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
      
      // Executar gatilhos de automação
      try {
        // Gatilho genérico de atualização
        await automationService.executeTriggers('ticket_updated', ticket, updates);
        
        // Gatilhos específicos
        if (updates.status) {
          await automationService.executeTriggers('status_changed', ticket, { oldStatus: updates._oldStatus, newStatus: updates.status });
        }
        if (updates.priority) {
          await automationService.executeTriggers('priority_changed', ticket, { oldPriority: updates._oldPriority, newPriority: updates.priority });
        }
      } catch (autoError) {
        console.error('❌ [Automation] Erro ao executar gatilhos:', autoError);
        // Não bloquear a atualização do ticket por erro nos gatilhos
      }
      
      // Recalcular SLA se a prioridade, contrato ou status foram alterados
      const shouldRecalculateSla = updates.priority || updates.contractId !== undefined || updates.status;
      
      if (shouldRecalculateSla) {
        try {
          console.log(`🔄 [SLA V2] Recalculando SLA para ticket #${id} devido a alterações...`);
          
          let reason = 'Atualização de ticket';
          if (updates.priority) reason = `Mudança de prioridade para ${updates.priority}`;
          else if (updates.contractId !== undefined) reason = 'Alteração de contrato';
          else if (updates.status) reason = `Mudança de status para ${updates.status}`;
          
          await slaV2Service.recalculateTicketSla(id, reason);
          console.log(`✅ [SLA V2] SLA recalculado para ticket #${id}`);
          
        } catch (slaError) {
          console.error(`⚠️ [SLA V2] Erro ao recalcular SLA para ticket #${id}:`, slaError);
          // Não falha a atualização do ticket, apenas loga o erro
        }
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
      
      // Executar gatilhos de automação para ticket atribuído
      try {
        await automationService.executeTriggers('assigned', ticket, { assigneeId });
      } catch (autoError) {
        console.error('❌ [Automation] Erro ao executar gatilhos:', autoError);
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
      console.log('📊 [Statistics] Requisição de:', { id: user?.id, role: user?.role });
      
      // If user can view full dashboard, return global stats
      if (user && (user.role === 'admin' || user.role === 'helpdesk_manager' || user.role === 'helpdesk_agent')) {
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
      if (user && (user.role === 'admin' || user.role === 'helpdesk_manager' || user.role === 'helpdesk_agent')) {
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
      if (user && (user.role === 'admin' || user.role === 'helpdesk_manager' || user.role === 'helpdesk_agent')) {
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

  app.post(`${apiPrefix}/tickets/:id/interactions`, 
    upload.array('attachments', 5),
    sanitizeRequestBody(['content']),
    async (req: Request, res: Response) => {
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

      // Executar gatilhos de automação para comentário adicionado
      if (ticket) {
        try {
          await automationService.executeTriggers('comment_added', ticket, { 
            interactionType: type, 
            isInternal: isInternalBool 
          });
        } catch (autoError) {
          console.error('❌ [Automation] Erro ao executar gatilhos:', autoError);
        }
      }

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

      // Atualizar as horas utilizadas já é feito dentro de createTicketInteraction
      // O método createTicketInteraction já debita automaticamente do contrato
      // quando há contractId ou quando o ticket tem um contrato vinculado

      // Enviar notificação por email para solicitantes e pessoas em cópia (apenas se não for interna)
      if (!isInternalBool) {
        try {
          // Buscar ticket completo com relações
          const fullTicket = await storage.getTicketWithRelations(ticketId);
          
          if (fullTicket) {
            // Se o ticket ainda não tem emailThreadId, criar e salvar
            if (!fullTicket.emailThreadId) {
              const domain = process.env.SMTP_FROM_EMAIL?.split('@')[1] || 'helpdesk.local';
              const emailThreadId = `<ticket-${ticketId}@${domain}>`;
              
              // Atualizar ticket com o emailThreadId
              await storage.updateTicket(ticketId, { emailThreadId });
              fullTicket.emailThreadId = emailThreadId;
            }
            
            // Buscar requester principal
            const ticketRequesters = fullTicket.requester ? [{
              requester: {
                email: fullTicket.requester.email,
                fullName: fullTicket.requester.fullName
              }
            }] : [];
            
            // TODO: Buscar requesters adicionais e CC quando implementado
            const ticketCc: any[] = [];
            
            // Buscar autor da interação
            const author = await storage.getUserById((req as any).user?.id || 1);
            
            if (author && ticketRequesters.length > 0) {
              console.log(`📧 Enviando notificação de interação para ${fullTicket.requester?.email}`);
              
              // Enviar notificações de forma assíncrona (não bloquear a resposta)
              emailService.sendTicketInteractionNotification(
                fullTicket,
                { ...interaction, id: interaction.id },
                author,
                ticketRequesters.map((tr: any) => ({
                  email: tr.requester.email,
                  fullName: tr.requester.fullName
                })),
                ticketCc
              ).catch(error => {
                console.error('❌ Erro ao enviar notificação de interação:', error);
              });
            } else {
              console.log('ℹ️  Não há destinatários para enviar notificação de interação');
            }
          }
        } catch (emailError) {
          console.error('❌ Erro ao processar envio de email:', emailError);
          // Não falhar a requisição se o email falhar
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
      console.log('Buscando contratos...');
      const user = req.user as any;
      
      if (user.role === 'admin' || user.role === 'helpdesk_manager' || user.role === 'helpdesk_agent') {
        // Helpdesk pode ver todos os contratos
        const contracts = await storage.getAllContracts();
        console.log('Contratos encontrados:', contracts.length);
        console.log('Primeiros contratos:', contracts.slice(0, 2).map(c => ({ id: c.id, companyId: c.companyId, number: c.contractNumber })));
        res.json({ success: true, data: contracts });
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

  app.post(`${apiPrefix}/companies`, requireAuth, async (req: Request, res: Response) => {
    try {
      const data = insertCompanySchema.parse(req.body);
      const company = await storage.createCompany(data);
      res.status(201).json(company);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Validation error', errors: error.errors });
      } else {
        res.status(500).json({ message: 'An error occurred creating the company' });
      }
    }
  });

  app.get(`${apiPrefix}/companies/:id`, requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const company = await storage.getCompanyById(id);
      if (!company) {
        return res.status(404).json({ message: 'Company not found' });
      }
      res.json(company);
    } catch (error) {
      res.status(500).json({ message: 'An error occurred fetching the company' });
    }
  });

  app.put(`${apiPrefix}/companies/:id`, requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const data = insertCompanySchema.partial().parse(req.body);
      const company = await storage.updateCompany(id, data);
      if (!company) {
        return res.status(404).json({ message: 'Company not found' });
      }
      res.json(company);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Validation error', errors: error.errors });
      } else {
        res.status(500).json({ message: 'An error occurred updating the company' });
      }
    }
  });

  app.delete(`${apiPrefix}/companies/:id`, requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteCompany(id);
      res.json({ message: 'Company deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'An error occurred deleting the company' });
    }
  });

  // ============ END CONTRACTS ROUTES ============

  const httpServer = createServer(app);
  return httpServer;
}
