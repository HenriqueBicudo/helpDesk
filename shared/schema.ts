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
  planType: z.string().default('basic'),
  monthlyHours: z.number().default(10),
  usedHours: z.string().default('0'),
  resetDate: z.date().nullable().optional(),
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
  contractId: z.number().optional().nullable(), // Campo para vincular ao contrato
  responseDueAt: z.date().optional().nullable(), // Prazo para primeira resposta
  solutionDueAt: z.date().optional().nullable(), // Prazo para solução definitiva
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

// Interaction types
export const INTERACTION_TYPES = ['comment', 'internal_note', 'status_change', 'assignment'] as const;
export type InteractionType = typeof INTERACTION_TYPES[number];
export const interactionTypeSchema = z.enum(INTERACTION_TYPES);

// Attachment types
export const ATTACHMENT_TYPES = ['image', 'document', 'other'] as const;
export type AttachmentType = typeof ATTACHMENT_TYPES[number];
export const attachmentTypeSchema = z.enum(ATTACHMENT_TYPES);

// Ticket interaction schema
export const ticketInteractionSchema = z.object({
  id: z.number().optional(),
  ticketId: z.number(),
  type: interactionTypeSchema,
  content: z.string().min(1),
  isInternal: z.boolean().default(false),
  timeSpent: z.number().min(0).default(0), // Tempo gasto em horas (decimal)
  createdBy: z.number(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

export const insertTicketInteractionSchema = ticketInteractionSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Attachment schema
export const attachmentSchema = z.object({
  id: z.number().optional(),
  ticketId: z.number(),
  fileName: z.string().min(1),
  fileSize: z.number().min(0),
  mimeType: z.string().min(1),
  filePath: z.string().min(1),
  createdAt: z.date().optional()
});

export const insertAttachmentSchema = attachmentSchema.omit({
  id: true,
  createdAt: true
});

// Response template schema
export const responseTemplateSchema = z.object({
  id: z.number().optional(),
  title: z.string().min(3),
  content: z.string().min(10),
  category: z.string().min(3),
  isActive: z.boolean().default(true),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

export const insertResponseTemplateSchema = responseTemplateSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Types for new schemas
export type TicketInteraction = z.infer<typeof ticketInteractionSchema>;
export type InsertTicketInteraction = z.infer<typeof insertTicketInteractionSchema>;

export type Attachment = z.infer<typeof attachmentSchema>;
export type InsertAttachment = z.infer<typeof insertAttachmentSchema>;

export type ResponseTemplate = z.infer<typeof responseTemplateSchema>;
export type InsertResponseTemplate = z.infer<typeof insertResponseTemplateSchema>;

// System settings schemas
export const SETTING_CATEGORIES = ['general', 'notifications', 'security', 'automation', 'customization', 'integrations'] as const;
export type SettingCategory = typeof SETTING_CATEGORIES[number];
export const settingCategorySchema = z.enum(SETTING_CATEGORIES);

export const systemSettingSchema = z.object({
  id: z.number().optional(),
  key: z.string().min(1),
  value: z.any(),
  category: settingCategorySchema,
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

export const insertSystemSettingSchema = systemSettingSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const updateSystemSettingsSchema = z.object({
  general: z.record(z.any()).optional(),
  notifications: z.record(z.any()).optional(),
  security: z.record(z.any()).optional(),
  automation: z.record(z.any()).optional(),
  customization: z.record(z.any()).optional(),
  integrations: z.record(z.any()).optional(),
});

export type SystemSetting = z.infer<typeof systemSettingSchema>;
export type InsertSystemSetting = z.infer<typeof insertSystemSettingSchema>;
export type UpdateSystemSettings = z.infer<typeof updateSystemSettingsSchema>;
