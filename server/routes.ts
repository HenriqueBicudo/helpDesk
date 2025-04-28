import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage-interface";
import { 
  insertTicketSchema, 
  insertRequesterSchema, 
  insertUserSchema, 
  insertEmailTemplateSchema,
  emailTemplateTypeSchema
} from "@shared/schema";
import { z } from "zod";
import { setupAuth } from "./auth";
import { emailService } from "./email-service";

export async function registerRoutes(app: Express): Promise<Server> {
  // Configurar autenticação
  setupAuth(app);
  
  // API routes prefix
  const apiPrefix = '/api';

  // Health check endpoint
  app.get(`${apiPrefix}/health`, (req: Request, res: Response) => {
    res.json({ status: 'OK', timestamp: new Date() });
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
      
      const ticket = await storage.changeTicketStatus(id, status);
      
      if (!ticket) {
        return res.status(404).json({ message: 'Ticket not found' });
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
      
      const ticket = await storage.changeTicketStatus(id, status);
      
      if (!ticket) {
        return res.status(404).json({ message: 'Ticket not found' });
      }
      
      // Enviar email de notificação se o status for "resolved"
      if (status === 'resolved') {
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

  const httpServer = createServer(app);
  return httpServer;
}
