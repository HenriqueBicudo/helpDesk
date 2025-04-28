import { z } from "zod";

// Tipos de status, prioridade e categoria
export const TICKET_STATUS = ['open', 'in_progress', 'pending', 'resolved', 'closed'] as const;
export const TICKET_PRIORITY = ['low', 'medium', 'high', 'critical'] as const;
export const TICKET_CATEGORY = ['technical_support', 'financial', 'commercial', 'other'] as const;

export type TicketStatus = typeof TICKET_STATUS[number];
export type TicketPriority = typeof TICKET_PRIORITY[number];
export type TicketCategory = typeof TICKET_CATEGORY[number];

// Validadores Zod para os enum-like types
export const ticketStatusSchema = z.enum(TICKET_STATUS);
export const ticketPrioritySchema = z.enum(TICKET_PRIORITY);
export const ticketCategorySchema = z.enum(TICKET_CATEGORY);

// Esquema de usuário para validação com Zod
export const userSchema = z.object({
  id: z.number().optional(),
  username: z.string().min(3),
  password: z.string().min(6),
  fullName: z.string().min(3),
  email: z.string().email(),
  role: z.string().default('agent'),
  avatarInitials: z.string().nullable().optional(),
  createdAt: z.date().optional()
});

// Esquema de requester (cliente) para validação com Zod
export const requesterSchema = z.object({
  id: z.number().optional(),
  fullName: z.string().min(3),
  email: z.string().email(),
  avatarInitials: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  createdAt: z.date().optional()
});

// Esquema de ticket para validação com Zod
export const ticketSchema = z.object({
  id: z.number().optional(),
  subject: z.string().min(3),
  description: z.string().min(10),
  status: ticketStatusSchema.default('open'),
  priority: ticketPrioritySchema.default('medium'),
  category: ticketCategorySchema,
  requesterId: z.number(),
  assigneeId: z.number().optional().nullable(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

// Schemas para inserção (sem os campos gerados automaticamente)
export const insertUserSchema = userSchema.omit({ 
  id: true, 
  avatarInitials: true, 
  createdAt: true 
});

export const insertRequesterSchema = requesterSchema.omit({ 
  id: true, 
  avatarInitials: true, 
  createdAt: true 
});

export const insertTicketSchema = ticketSchema.omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

// Types
export type User = z.infer<typeof userSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Requester = z.infer<typeof requesterSchema>;
export type InsertRequester = z.infer<typeof insertRequesterSchema>;

export type Ticket = z.infer<typeof ticketSchema>;
export type InsertTicket = z.infer<typeof insertTicketSchema>;

// Extended type for tickets with requester and assignee information
export type TicketWithRelations = Ticket & {
  requester: Requester;
  assignee?: User;
};

// Email template types
export const EMAIL_TEMPLATE_TYPES = [
  'new_ticket', 
  'ticket_update', 
  'ticket_resolution', 
  'ticket_assignment',
  'welcome_user',
  'password_reset',
  'ticket_escalation',
  'sla_breach',
  'satisfaction_survey'
] as const;

export type EmailTemplateType = typeof EMAIL_TEMPLATE_TYPES[number];

export const emailTemplateTypeSchema = z.enum(EMAIL_TEMPLATE_TYPES);

// Email template schema
export const emailTemplateSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(3),
  type: emailTemplateTypeSchema,
  subject: z.string().min(3),
  body: z.string().min(10),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

export const insertEmailTemplateSchema = emailTemplateSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Types
export type EmailTemplate = z.infer<typeof emailTemplateSchema>;
export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;
