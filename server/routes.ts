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
import { emailService } from "./email-service";
import { ContractService } from "./services/contract.service";
import { contractRoutes } from "./http/routes/contract.routes";
import { slaRoutes } from "./http/routes/sla.routes";

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
  app.use(`${apiPrefix}/contracts`, contractRoutes);
  
  // SLA routes (Sprint 4)
  app.use(`${apiPrefix}/sla`, slaRoutes);

  // Rota específica para contratos ativos de um solicitante (para uso no frontend)
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

  // User routes
  app.get(`${apiPrefix}/users`, async (req: Request, res: Response) => {
    const users = await storage.getAllUsers();
    res.json(users);
  });
  
  app.post(`${apiPrefix}/users`, async (req: Request, res: Response) => {
    try {
      const data = insertUserSchema.parse(req.body);
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

  // Ticket routes
  app.get(`${apiPrefix}/tickets`, async (req: Request, res: Response) => {
    try {
      const { status, priority, category, assigneeId } = req.query;
      
      let tickets;
      
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
      
      res.json(tickets);
    } catch (error) {
      res.status(500).json({ message: 'An error occurred fetching tickets' });
    }
  });

  app.get(`${apiPrefix}/tickets/:id`, async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const ticket = await storage.getTicketWithRelations(id);
      
      if (!ticket) {
        return res.status(404).json({ message: 'Ticket not found' });
      }
      
      res.json(ticket);
    } catch (error) {
      res.status(500).json({ message: 'An error occurred fetching the ticket' });
    }
  });

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

  app.patch(`${apiPrefix}/tickets/:id`, async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const updates = req.body;
      
      const ticket = await storage.updateTicket(id, updates);
      
      if (!ticket) {
        return res.status(404).json({ message: 'Ticket not found' });
      }
      
      res.json(ticket);
    } catch (error) {
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
      
      const ticket = await storage.assignTicket(id, assigneeId);
      
      if (!ticket) {
        return res.status(404).json({ message: 'Ticket not found' });
      }
      
      res.json(ticket);
    } catch (error) {
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
      const { type, content, isInternal = 'false', timeSpent = 0 } = req.body;
      
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

  // Atualizar a rota de criação de tickets para enviar email
  app.post(`${apiPrefix}/tickets`, async (req: Request, res: Response) => {
    try {
      const data = insertTicketSchema.parse(req.body);
      const ticket = await storage.createTicket(data);
      
      // Enviar email de notificação
      try {
        const requester = await storage.getRequester(ticket.requesterId);
        if (requester) {
          await emailService.sendNewTicketNotification(ticket, requester);
        }
      } catch (emailError) {
        console.error('Error sending ticket notification email:', emailError);
        // Não falhar a criação do ticket se o email falhar
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

  // Atualizar a rota de atribuição de tickets para enviar email
  app.post(`${apiPrefix}/tickets/:id/assign`, async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const { assigneeId } = req.body;
      
      if (typeof assigneeId !== 'number') {
        return res.status(400).json({ message: 'assigneeId is required and must be a number' });
      }
      
      const ticket = await storage.assignTicket(id, assigneeId);
      
      if (!ticket) {
        return res.status(404).json({ message: 'Ticket not found' });
      }
      
      // Enviar email de notificação
      try {
        const requester = await storage.getRequester(ticket.requesterId);
        const assignee = await storage.getUser(assigneeId);
        if (requester && assignee) {
          await emailService.sendTicketAssignmentNotification(ticket, requester, assignee);
        }
      } catch (emailError) {
        console.error('Error sending ticket assignment email:', emailError);
        // Não falhar a atribuição do ticket se o email falhar
      }
      
      res.json(ticket);
    } catch (error) {
      res.status(500).json({ message: 'An error occurred assigning the ticket' });
    }
  });

  // Atualizar a rota de mudança de status para enviar email
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
      
      // Se o ticket foi resolvido
      if (status === 'resolved') {
        // Contabilizar horas no contrato se associado
        if (currentTicket.contractId) {
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
        
        // Enviar email de notificação
        try {
          const requester = await storage.getRequester(ticket.requesterId);
          if (requester) {
            await emailService.sendTicketResolutionNotification(
              ticket, 
              requester, 
              "Seu chamado foi resolvido pela nossa equipe de suporte."
            );
          }
        } catch (emailError) {
          console.error('Error sending ticket resolution email:', emailError);
          // Não falhar a mudança de status se o email falhar
        }
      }
      
      res.json(ticket);
    } catch (error) {
      res.status(500).json({ message: 'An error occurred changing the ticket status' });
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

  const httpServer = createServer(app);
  return httpServer;
}
