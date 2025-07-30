import { eq, desc, count, sql } from 'drizzle-orm';
import { db } from './db-drizzle';
import * as schema from '../shared/drizzle-schema';
import type { IStorage } from './storage-interface';
import type { 
  User, InsertUser,
  Requester, InsertRequester,
  Ticket, InsertTicket, TicketWithRelations,
  EmailTemplate, InsertEmailTemplate, EmailTemplateType,
  TicketInteraction, InsertTicketInteraction,
  Attachment, InsertAttachment,
  ResponseTemplate, InsertResponseTemplate,
  SystemSetting, InsertSystemSetting, SettingCategory
} from '@shared/schema';

export class PostgresStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(schema.users).where(eq(schema.users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(schema.users).where(eq(schema.users.username, username));
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(schema.users).values(user as any).returning();
    return result[0] as User;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(schema.users) as User[];
  }

  // Requester methods
  async getRequester(id: number): Promise<Requester | undefined> {
    const result = await db.select().from(schema.requesters).where(eq(schema.requesters.id, id));
    return result[0] as Requester | undefined;
  }

  async getRequesterByEmail(email: string): Promise<Requester | undefined> {
    const result = await db.select().from(schema.requesters).where(eq(schema.requesters.email, email));
    return result[0] as Requester | undefined;
  }

  async createRequester(requester: InsertRequester): Promise<Requester> {
    const result = await db.insert(schema.requesters).values(requester as any).returning();
    return result[0] as Requester;
  }

  async getAllRequesters(): Promise<Requester[]> {
    return await db.select().from(schema.requesters) as Requester[];
  }

  async updateRequester(id: number, updates: Partial<Requester>): Promise<Requester | undefined> {
    const result = await db.update(schema.requesters)
      .set(updates as any)
      .where(eq(schema.requesters.id, id))
      .returning();
    return result[0] as Requester | undefined;
  }

  // Ticket methods
  async getTicket(id: number): Promise<Ticket | undefined> {
    const result = await db.select().from(schema.tickets).where(eq(schema.tickets.id, id));
    return result[0] as Ticket | undefined;
  }

  async getTicketWithRelations(id: number): Promise<TicketWithRelations | undefined> {
    const result = await db
      .select({
        id: schema.tickets.id,
        subject: schema.tickets.subject,
        description: schema.tickets.description,
        status: schema.tickets.status,
        priority: schema.tickets.priority,
        category: schema.tickets.category,
        requesterId: schema.tickets.requesterId,
        assigneeId: schema.tickets.assigneeId,
        createdAt: schema.tickets.createdAt,
        updatedAt: schema.tickets.updatedAt,
        requester: {
          id: schema.requesters.id,
          fullName: schema.requesters.fullName,
          email: schema.requesters.email,
          company: schema.requesters.company,
          avatarInitials: schema.requesters.avatarInitials,
          planType: schema.requesters.planType,
          monthlyHours: schema.requesters.monthlyHours,
          usedHours: schema.requesters.usedHours,
          resetDate: schema.requesters.resetDate,
          createdAt: schema.requesters.createdAt,
        },
        assignee: {
          id: schema.users.id,
          username: schema.users.username,
          fullName: schema.users.fullName,
          email: schema.users.email,
          role: schema.users.role,
          avatarInitials: schema.users.avatarInitials,
          createdAt: schema.users.createdAt,
        }
      })
      .from(schema.tickets)
      .innerJoin(schema.requesters, eq(schema.tickets.requesterId, schema.requesters.id))
      .leftJoin(schema.users, eq(schema.tickets.assigneeId, schema.users.id))
      .where(eq(schema.tickets.id, id));

    if (result.length === 0) return undefined;

    const ticket = result[0];
    return {
      ...ticket,
      assignee: ticket.assignee?.id ? ticket.assignee : undefined
    } as TicketWithRelations;
  }

  async createTicket(ticket: InsertTicket): Promise<Ticket> {
    const result = await db.insert(schema.tickets).values(ticket as any).returning();
    return result[0] as Ticket;
  }

  async updateTicket(id: number, updates: Partial<Ticket>): Promise<Ticket | undefined> {
    const result = await db.update(schema.tickets)
      .set({ ...updates as any, updatedAt: new Date() })
      .where(eq(schema.tickets.id, id))
      .returning();
    return result[0] as Ticket | undefined;
  }

  async getAllTickets(): Promise<Ticket[]> {
    return await db.select().from(schema.tickets).orderBy(desc(schema.tickets.createdAt)) as Ticket[];
  }

  async getAllTicketsWithRelations(): Promise<TicketWithRelations[]> {
    const result = await db
      .select({
        id: schema.tickets.id,
        subject: schema.tickets.subject,
        description: schema.tickets.description,
        status: schema.tickets.status,
        priority: schema.tickets.priority,
        category: schema.tickets.category,
        requesterId: schema.tickets.requesterId,
        assigneeId: schema.tickets.assigneeId,
        createdAt: schema.tickets.createdAt,
        updatedAt: schema.tickets.updatedAt,
        requester: {
          id: schema.requesters.id,
          fullName: schema.requesters.fullName,
          email: schema.requesters.email,
          company: schema.requesters.company,
          avatarInitials: schema.requesters.avatarInitials,
          createdAt: schema.requesters.createdAt,
        },
        assignee: {
          id: schema.users.id,
          username: schema.users.username,
          fullName: schema.users.fullName,
          email: schema.users.email,
          role: schema.users.role,
          avatarInitials: schema.users.avatarInitials,
          createdAt: schema.users.createdAt,
        }
      })
      .from(schema.tickets)
      .innerJoin(schema.requesters, eq(schema.tickets.requesterId, schema.requesters.id))
      .leftJoin(schema.users, eq(schema.tickets.assigneeId, schema.users.id))
      .orderBy(desc(schema.tickets.createdAt));

    return result.map(ticket => ({
      ...ticket,
      assignee: ticket.assignee?.id ? ticket.assignee : undefined
    })) as TicketWithRelations[];
  }

  async getTicketsByStatus(status: string): Promise<Ticket[]> {
    return await db.select().from(schema.tickets)
      .where(eq(schema.tickets.status, status as any))
      .orderBy(desc(schema.tickets.createdAt)) as Ticket[];
  }

  async getTicketsByPriority(priority: string): Promise<Ticket[]> {
    return await db.select().from(schema.tickets)
      .where(eq(schema.tickets.priority, priority as any))
      .orderBy(desc(schema.tickets.createdAt)) as Ticket[];
  }

  async getTicketsByCategory(category: string): Promise<Ticket[]> {
    return await db.select().from(schema.tickets)
      .where(eq(schema.tickets.category, category as any))
      .orderBy(desc(schema.tickets.createdAt)) as Ticket[];
  }

  async getTicketsByAssignee(assigneeId: number): Promise<Ticket[]> {
    return await db.select().from(schema.tickets)
      .where(eq(schema.tickets.assigneeId, assigneeId))
      .orderBy(desc(schema.tickets.createdAt)) as Ticket[];
  }

  async getTicketsByRequester(requesterId: number): Promise<Ticket[]> {
    return await db.select().from(schema.tickets)
      .where(eq(schema.tickets.requesterId, requesterId))
      .orderBy(desc(schema.tickets.createdAt)) as Ticket[];
  }

  async assignTicket(ticketId: number, assigneeId: number): Promise<Ticket | undefined> {
    const result = await db.update(schema.tickets)
      .set({ assigneeId, updatedAt: new Date() })
      .where(eq(schema.tickets.id, ticketId))
      .returning();
    return result[0] as Ticket | undefined;
  }

  async changeTicketStatus(ticketId: number, status: string): Promise<Ticket | undefined> {
    const result = await db.update(schema.tickets)
      .set({ status: status as any, updatedAt: new Date() })
      .where(eq(schema.tickets.id, ticketId))
      .returning();
    return result[0] as Ticket | undefined;
  }

  // Dashboard statistics
  async getTicketStatistics(): Promise<{
    totalTickets: number;
    openTickets: number;
    resolvedToday: number;
    averageResponseTime: string;
  }> {
    const totalTickets = await db.select({ count: count() }).from(schema.tickets);
    
    const openTickets = await db
      .select({ count: count() })
      .from(schema.tickets)
      .where(eq(schema.tickets.status, 'open'));

    // Tickets resolvidos hoje
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const resolvedToday = await db
      .select({ count: count() })
      .from(schema.tickets)
      .where(
        sql`${schema.tickets.status} = 'resolved' AND ${schema.tickets.updatedAt} >= ${today}`
      );

    return {
      totalTickets: totalTickets[0].count,
      openTickets: openTickets[0].count,
      resolvedToday: resolvedToday[0].count,
      averageResponseTime: '2.5 horas' // Placeholder - calcular tempo real se necessário
    };
  }

  async getTicketCategoriesCount(): Promise<{category: string; count: number}[]> {
    const result = await db
      .select({
        category: schema.tickets.category,
        count: count()
      })
      .from(schema.tickets)
      .groupBy(schema.tickets.category);

    return result.map(r => ({ category: r.category, count: r.count }));
  }

  async getTicketVolumeByDate(): Promise<{date: string; count: number}[]> {
    const result = await db
      .select({
        date: sql<string>`DATE(${schema.tickets.createdAt})`,
        count: count()
      })
      .from(schema.tickets)
      .groupBy(sql`DATE(${schema.tickets.createdAt})`)
      .orderBy(sql`DATE(${schema.tickets.createdAt})`);

    return result.map(r => ({ date: r.date, count: r.count }));
  }

  // Email template methods
  async getEmailTemplate(id: number): Promise<EmailTemplate | undefined> {
    const result = await db.select().from(schema.emailTemplates).where(eq(schema.emailTemplates.id, id));
    return result[0] as EmailTemplate | undefined;
  }

  async getEmailTemplateByType(type: EmailTemplateType, active = true): Promise<EmailTemplate | undefined> {
    const result = await db.select().from(schema.emailTemplates)
      .where(
        active
          ? sql`${schema.emailTemplates.type} = ${type} AND ${schema.emailTemplates.isActive} = true`
          : eq(schema.emailTemplates.type, type as any)
      );
    return result[0] as EmailTemplate | undefined;
  }

  async createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate> {
    const result = await db.insert(schema.emailTemplates).values(template as any).returning();
    return result[0] as EmailTemplate;
  }

  async updateEmailTemplate(id: number, updates: Partial<EmailTemplate>): Promise<EmailTemplate | undefined> {
    const result = await db.update(schema.emailTemplates)
      .set({ ...updates as any, updatedAt: new Date() })
      .where(eq(schema.emailTemplates.id, id))
      .returning();
    return result[0] as EmailTemplate | undefined;
  }

  async deleteEmailTemplate(id: number): Promise<boolean> {
    const result = await db.delete(schema.emailTemplates)
      .where(eq(schema.emailTemplates.id, id))
      .returning();
    return result.length > 0;
  }

  async getAllEmailTemplates(): Promise<EmailTemplate[]> {
    return await db.select().from(schema.emailTemplates).orderBy(desc(schema.emailTemplates.createdAt)) as EmailTemplate[];
  }

  async getEmailTemplatesByType(type: EmailTemplateType): Promise<EmailTemplate[]> {
    return await db.select().from(schema.emailTemplates)
      .where(eq(schema.emailTemplates.type, type as any))
      .orderBy(desc(schema.emailTemplates.createdAt)) as EmailTemplate[];
  }

  // Ticket Interaction methods
  async getTicketInteractions(ticketId: number): Promise<TicketInteraction[]> {
    const result = await db
      .select({
        id: schema.ticketInteractions.id,
        ticketId: schema.ticketInteractions.ticketId,
        type: schema.ticketInteractions.type,
        content: schema.ticketInteractions.content,
        isInternal: schema.ticketInteractions.isInternal,
        timeSpent: schema.ticketInteractions.timeSpent,
        createdBy: schema.ticketInteractions.userId,
        createdAt: schema.ticketInteractions.createdAt,
        author: {
          id: schema.users.id,
          fullName: schema.users.fullName,
          email: schema.users.email,
          role: schema.users.role,
          avatarInitials: schema.users.avatarInitials,
        }
      })
      .from(schema.ticketInteractions)
      .leftJoin(schema.users, eq(schema.ticketInteractions.userId, schema.users.id))
      .where(eq(schema.ticketInteractions.ticketId, ticketId))
      .orderBy(desc(schema.ticketInteractions.createdAt));
    
    return result.map(row => ({
      id: row.id,
      ticketId: row.ticketId,
      type: row.type,
      content: row.content || '',
      isInternal: row.isInternal,
      timeSpent: parseFloat(row.timeSpent || '0'),
      createdBy: row.createdBy || 0,
      createdAt: row.createdAt,
      author: row.author?.id ? row.author : undefined
    })) as TicketInteraction[];
  }

  async createTicketInteraction(interaction: InsertTicketInteraction): Promise<TicketInteraction> {
    const result = await db.insert(schema.ticketInteractions).values({
      ticketId: interaction.ticketId,
      userId: interaction.createdBy,
      type: interaction.type as any,
      content: interaction.content,
      isInternal: interaction.isInternal,
      timeSpent: interaction.timeSpent.toString(),
    }).returning();
    
    return {
      id: result[0].id,
      ticketId: result[0].ticketId,
      type: result[0].type,
      content: result[0].content || '',
      isInternal: result[0].isInternal,
      timeSpent: parseFloat(result[0].timeSpent || '0'),
      createdBy: result[0].userId || 0,
      createdAt: result[0].createdAt,
    } as TicketInteraction;
  }

  // Attachment methods
  async createAttachment(attachment: InsertAttachment): Promise<Attachment> {
    const result = await db.insert(schema.attachments).values({
      ticketId: attachment.ticketId,
      fileName: attachment.fileName,
      originalName: attachment.fileName, // Usando fileName como originalName por agora
      mimeType: attachment.mimeType,
      fileSize: attachment.fileSize,
      type: 'other' as any, // Tipo padrão por agora
      filePath: attachment.filePath,
    }).returning();
    
    return {
      id: result[0].id,
      ticketId: result[0].ticketId,
      fileName: result[0].fileName,
      fileSize: result[0].fileSize,
      mimeType: result[0].mimeType,
      filePath: result[0].filePath,
      createdAt: result[0].createdAt,
    } as Attachment;
  }

  async getTicketAttachments(ticketId: number): Promise<Attachment[]> {
    const result = await db.select().from(schema.attachments)
      .where(eq(schema.attachments.ticketId, ticketId))
      .orderBy(desc(schema.attachments.createdAt));
    
    return result.map(row => ({
      id: row.id,
      ticketId: row.ticketId,
      fileName: row.fileName,
      fileSize: row.fileSize,
      mimeType: row.mimeType,
      filePath: row.filePath,
      createdAt: row.createdAt,
    })) as Attachment[];
  }

  // Response Template methods
  async getResponseTemplate(id: number): Promise<ResponseTemplate | undefined> {
    const result = await db.select().from(schema.responseTemplates).where(eq(schema.responseTemplates.id, id));
    if (!result[0]) return undefined;
    
    return {
      id: result[0].id,
      title: result[0].name, // Mapeando name para title
      content: result[0].content,
      category: result[0].category,
      isActive: result[0].isActive,
      createdAt: result[0].createdAt,
      updatedAt: result[0].updatedAt,
    } as ResponseTemplate;
  }

  async getAllResponseTemplates(): Promise<ResponseTemplate[]> {
    const result = await db.select().from(schema.responseTemplates)
      .orderBy(desc(schema.responseTemplates.createdAt));
    
    return result.map(row => ({
      id: row.id,
      title: row.name, // Mapeando name para title
      content: row.content,
      category: row.category,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })) as ResponseTemplate[];
  }

  async getResponseTemplatesByCategory(category: string): Promise<ResponseTemplate[]> {
    const result = await db.select().from(schema.responseTemplates)
      .where(eq(schema.responseTemplates.category, category as any))
      .orderBy(desc(schema.responseTemplates.createdAt));
    
    return result.map(row => ({
      id: row.id,
      title: row.name, // Mapeando name para title
      content: row.content,
      category: row.category,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })) as ResponseTemplate[];
  }

  async createResponseTemplate(template: InsertResponseTemplate): Promise<ResponseTemplate> {
    const result = await db.insert(schema.responseTemplates).values({
      name: template.title, // Mapeando title para name
      category: template.category as any,
      content: template.content,
      isActive: template.isActive,
    }).returning();
    
    return {
      id: result[0].id,
      title: result[0].name, // Mapeando name para title
      content: result[0].content,
      category: result[0].category,
      isActive: result[0].isActive,
      createdAt: result[0].createdAt,
      updatedAt: result[0].updatedAt,
    } as ResponseTemplate;
  }

  // System Settings methods
  async getSystemSetting(key: string): Promise<SystemSetting | undefined> {
    const result = await db.select().from(schema.systemSettings)
      .where(eq(schema.systemSettings.key, key));
    return result[0] as SystemSetting | undefined;
  }

  async getSystemSettingsByCategory(category: SettingCategory): Promise<SystemSetting[]> {
    const result = await db.select().from(schema.systemSettings)
      .where(eq(schema.systemSettings.category, category));
    return result as SystemSetting[];
  }

  async getAllSystemSettings(): Promise<SystemSetting[]> {
    const result = await db.select().from(schema.systemSettings)
      .orderBy(schema.systemSettings.category, schema.systemSettings.key);
    return result as SystemSetting[];
  }

  async createSystemSetting(setting: InsertSystemSetting): Promise<SystemSetting> {
    const result = await db.insert(schema.systemSettings).values(setting as any).returning();
    return result[0] as SystemSetting;
  }

  async updateSystemSetting(key: string, value: any): Promise<SystemSetting | undefined> {
    const result = await db.update(schema.systemSettings)
      .set({ 
        value: value,
        updatedAt: new Date()
      })
      .where(eq(schema.systemSettings.key, key))
      .returning();
    return result[0] as SystemSetting | undefined;
  }

  async upsertSystemSetting(setting: InsertSystemSetting): Promise<SystemSetting> {
    try {
      // Try to update first
      const existing = await this.getSystemSetting(setting.key);
      if (existing) {
        const updated = await this.updateSystemSetting(setting.key, setting.value);
        return updated!;
      } else {
        // Create new if doesn't exist
        return await this.createSystemSetting(setting);
      }
    } catch (error) {
      // If update fails, try create
      return await this.createSystemSetting(setting);
    }
  }

  async deleteSystemSetting(key: string): Promise<boolean> {
    const result = await db.delete(schema.systemSettings)
      .where(eq(schema.systemSettings.key, key))
      .returning();
    return result.length > 0;
  }

  async bulkUpdateSettings(settings: Record<string, any>, category: SettingCategory): Promise<boolean> {
    try {
      for (const [key, value] of Object.entries(settings)) {
        await this.upsertSystemSetting({
          key: `${category}.${key}`,
          value,
          category,
          description: `${category} setting: ${key}`,
          isActive: true
        });
      }
      return true;
    } catch (error) {
      console.error('Error bulk updating settings:', error);
      return false;
    }
  }
}
