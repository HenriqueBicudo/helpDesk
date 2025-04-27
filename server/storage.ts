import { 
  type User, type InsertUser,
  type Requester, type InsertRequester,
  type Ticket, type InsertTicket, type TicketWithRelations
} from "@shared/schema";

// Storage interface
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  
  // Requester methods
  getRequester(id: number): Promise<Requester | undefined>;
  getRequesterByEmail(email: string): Promise<Requester | undefined>;
  createRequester(requester: InsertRequester): Promise<Requester>;
  getAllRequesters(): Promise<Requester[]>;
  
  // Ticket methods
  getTicket(id: number): Promise<Ticket | undefined>;
  getTicketWithRelations(id: number): Promise<TicketWithRelations | undefined>;
  createTicket(ticket: InsertTicket): Promise<Ticket>;
  updateTicket(id: number, updates: Partial<Ticket>): Promise<Ticket | undefined>;
  getAllTickets(): Promise<Ticket[]>;
  getAllTicketsWithRelations(): Promise<TicketWithRelations[]>;
  getTicketsByStatus(status: string): Promise<Ticket[]>;
  getTicketsByPriority(priority: string): Promise<Ticket[]>;
  getTicketsByCategory(category: string): Promise<Ticket[]>;
  getTicketsByAssignee(assigneeId: number): Promise<Ticket[]>;
  getTicketsByRequester(requesterId: number): Promise<Ticket[]>;
  assignTicket(ticketId: number, assigneeId: number): Promise<Ticket | undefined>;
  changeTicketStatus(ticketId: number, status: string): Promise<Ticket | undefined>;
  
  // Dashboard statistics
  getTicketStatistics(): Promise<{
    totalTickets: number;
    openTickets: number;
    resolvedToday: number;
    averageResponseTime: string;
  }>;
  getTicketsByCategory(): Promise<{category: string; count: number}[]>;
  getTicketVolumeByDate(): Promise<{date: string; count: number}[]>;
}

// In-memory storage implementation
export class DatabaseStorage implements IStorage {
  
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const avatarInitials = this.getInitials(insertUser.fullName);
    const [user] = await db
      .insert(users)
      .values({...insertUser, avatarInitials})
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }
  
  async getRequester(id: number): Promise<Requester | undefined> {
    const [requester] = await db.select().from(requesters).where(eq(requesters.id, id));
    return requester || undefined;
  }

  async getRequesterByEmail(email: string): Promise<Requester | undefined> {
    const [requester] = await db.select().from(requesters).where(eq(requesters.email, email));
    return requester || undefined;
  }

  async createRequester(insertRequester: InsertRequester): Promise<Requester> {
    const avatarInitials = this.getInitials(insertRequester.fullName);
    const [requester] = await db
      .insert(requesters)
      .values({...insertRequester, avatarInitials})
      .returning();
    return requester;
  }

  async getAllRequesters(): Promise<Requester[]> {
    return db.select().from(requesters);
  }
  
  async getTicket(id: number): Promise<Ticket | undefined> {
    const [ticket] = await db.select().from(tickets).where(eq(tickets.id, id));
    return ticket || undefined;
  }

  async getTicketWithRelations(id: number): Promise<TicketWithRelations | undefined> {
    const [ticket] = await db.select().from(tickets).where(eq(tickets.id, id));
    if (!ticket) return undefined;
    
    const [requester] = await db.select().from(requesters).where(eq(requesters.id, ticket.requesterId));
    
    let assignee = undefined;
    if (ticket.assigneeId) {
      [assignee] = await db.select().from(users).where(eq(users.id, ticket.assigneeId));
    }
    
    return {
      ...ticket,
      requester,
      assignee
    };
  }

  async createTicket(insertTicket: InsertTicket): Promise<Ticket> {
    const [ticket] = await db
      .insert(tickets)
      .values(insertTicket)
      .returning();
    return ticket;
  }

  async updateTicket(id: number, updates: Partial<Ticket>): Promise<Ticket | undefined> {
    const [updatedTicket] = await db
      .update(tickets)
      .set({...updates, updatedAt: new Date()})
      .where(eq(tickets.id, id))
      .returning();
    return updatedTicket;
  }

  async getAllTickets(): Promise<Ticket[]> {
    return db.select().from(tickets);
  }

  async getAllTicketsWithRelations(): Promise<TicketWithRelations[]> {
    const allTickets = await db.select().from(tickets);
    
    // Load all requesters and assignees at once for efficiency
    const requesterIds = [...new Set(allTickets.map(ticket => ticket.requesterId))];
    const allRequesters = await db
      .select()
      .from(requesters)
      .where(inArray(requesters.id, requesterIds));
    
    const assigneeIds = allTickets
      .map(ticket => ticket.assigneeId)
      .filter((id): id is number => id !== null && id !== undefined);
      
    const allAssignees = assigneeIds.length 
      ? await db.select().from(users).where(inArray(users.id, assigneeIds))
      : [];
    
    // Map for quick lookup
    const requesterMap = new Map(allRequesters.map(r => [r.id, r]));
    const assigneeMap = new Map(allAssignees.map(a => [a.id, a]));
    
    return allTickets.map(ticket => ({
      ...ticket,
      requester: requesterMap.get(ticket.requesterId)!,
      assignee: ticket.assigneeId ? assigneeMap.get(ticket.assigneeId) : undefined
    }));
  }

  async getTicketsByStatus(status: string): Promise<Ticket[]> {
    return db
      .select()
      .from(tickets)
      .where(eq(tickets.status, status as any));
  }

  async getTicketsByPriority(priority: string): Promise<Ticket[]> {
    return db
      .select()
      .from(tickets)
      .where(eq(tickets.priority, priority as any));
  }

  async getTicketsByCategory(category: string): Promise<Ticket[]> {
    return db
      .select()
      .from(tickets)
      .where(eq(tickets.category, category as any));
  }

  async getTicketsByAssignee(assigneeId: number): Promise<Ticket[]> {
    return db
      .select()
      .from(tickets)
      .where(eq(tickets.assigneeId, assigneeId));
  }

  async getTicketsByRequester(requesterId: number): Promise<Ticket[]> {
    return db
      .select()
      .from(tickets)
      .where(eq(tickets.requesterId, requesterId));
  }

  async assignTicket(ticketId: number, assigneeId: number): Promise<Ticket | undefined> {
    return this.updateTicket(ticketId, { assigneeId });
  }

  async changeTicketStatus(ticketId: number, status: string): Promise<Ticket | undefined> {
    return this.updateTicket(ticketId, { status: status as any });
  }

  async getTicketStatistics(): Promise<{
    totalTickets: number;
    openTickets: number;
    resolvedToday: number;
    averageResponseTime: string;
  }> {
    // Get total tickets
    const allTickets = await db.select().from(tickets);
    const totalTickets = allTickets.length;
    
    // Get open tickets
    const openTickets = await db
      .select()
      .from(tickets)
      .where(notInArray(tickets.status, ['resolved', 'closed'] as any[]));
    
    // Get tickets resolved today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const resolvedToday = await db
      .select()
      .from(tickets)
      .where(
        and(
          eq(tickets.status, 'resolved' as any),
          gte(tickets.updatedAt, today),
          lt(tickets.updatedAt, tomorrow)
        )
      );
    
    // For now, just return a placeholder for average response time
    // In a real implementation, this would calculate based on ticket history
    return {
      totalTickets,
      openTickets: openTickets.length,
      resolvedToday: resolvedToday.length,
      averageResponseTime: "4h 30m"
    };
  }

  async getTicketsByCategory(): Promise<{category: string; count: number}[]> {
    const categories = await db.select({
      category: tickets.category,
      count: sql<number>`count(*)::int`
    })
    .from(tickets)
    .groupBy(tickets.category);
    
    return categories.map(c => ({
      category: c.category,
      count: c.count
    }));
  }

  async getTicketVolumeByDate(): Promise<{date: string; count: number}[]> {
    // Get the last 7 days
    const dates: string[] = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }
    
    // Format dates for PostgreSQL comparison
    const formattedDates = dates.map(date => {
      const d = new Date(date);
      return d.toISOString().split('T')[0]; // YYYY-MM-DD format
    });
    
    // Query creation count by date
    const result = await Promise.all(
      formattedDates.map(async (dateStr) => {
        const startDate = new Date(dateStr);
        startDate.setHours(0, 0, 0, 0);
        
        const endDate = new Date(dateStr);
        endDate.setHours(23, 59, 59, 999);
        
        const dateTickets = await db
          .select()
          .from(tickets)
          .where(
            and(
              gte(tickets.createdAt, startDate),
              lte(tickets.createdAt, endDate)
            )
          );
        
        return {
          date: dateStr,
          count: dateTickets.length
        };
      })
    );
    
    return result;
  }
  
  private getInitials(name: string): string {
    return name
      .split(' ')
      .map(part => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  }

}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private requesters: Map<number, Requester>;
  private tickets: Map<number, Ticket>;
  private userIdCounter: number;
  private requesterIdCounter: number;
  private ticketIdCounter: number;

  constructor() {
    this.users = new Map();
    this.requesters = new Map();
    this.tickets = new Map();
    this.userIdCounter = 1;
    this.requesterIdCounter = 1;
    this.ticketIdCounter = 1;
    
    // Initialize with some sample data
    this.initializeData();
  }

  private initializeData() {
    // Add sample users
    const users: InsertUser[] = [
      { username: 'jsilva', password: 'password123', fullName: 'João Silva', email: 'joao@example.com', role: 'agent' },
      { username: 'moliveira', password: 'password123', fullName: 'Maria Oliveira', email: 'maria@example.com', role: 'agent' },
      { username: 'psantos', password: 'password123', fullName: 'Pedro Santos', email: 'pedro@example.com', role: 'agent' },
      { username: 'asilva', password: 'password123', fullName: 'Ana Silva', email: 'ana@example.com', role: 'admin' }
    ];
    
    users.forEach(user => this.createUser({
      ...user,
      avatarInitials: this.getInitials(user.fullName)
    }));
    
    // Add sample requesters
    const requesters: InsertRequester[] = [
      { fullName: 'Marcos Santos', email: 'marcos@example.com', company: 'ABC Corp' },
      { fullName: 'Carlos Almeida', email: 'carlos@example.com', company: 'XYZ Corp' },
      { fullName: 'Julia Ferreira', email: 'julia@example.com', company: 'ABC Corp' },
      { fullName: 'Ricardo Lima', email: 'ricardo@example.com', company: '123 Corp' },
      { fullName: 'André Silva', email: 'andre@example.com', company: 'XYZ Corp' }
    ];
    
    requesters.forEach(requester => this.createRequester({
      ...requester,
      avatarInitials: this.getInitials(requester.fullName)
    }));
    
    // Add sample tickets
    const ticketData = [
      { 
        subject: 'Problema com login no sistema', 
        description: 'Não consigo acessar o sistema desde ontem.', 
        status: 'in_progress', 
        priority: 'high', 
        category: 'technical_support',
        requesterId: 1,
        assigneeId: 1,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
        updatedAt: new Date()
      },
      {
        subject: 'Solicitação de novo equipamento',
        description: 'Preciso de um novo monitor para trabalho.',
        status: 'resolved',
        priority: 'medium',
        category: 'technical_support',
        requesterId: 2,
        assigneeId: 2,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
        updatedAt: new Date()
      },
      {
        subject: 'Erro ao gerar relatório financeiro',
        description: 'O sistema apresenta erro ao tentar gerar relatórios.',
        status: 'pending',
        priority: 'critical',
        category: 'financial',
        requesterId: 3,
        assigneeId: 3,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4),
        updatedAt: new Date()
      },
      {
        subject: 'Dúvida sobre uso da plataforma',
        description: 'Preciso de ajuda para configurar meu perfil.',
        status: 'resolved',
        priority: 'low',
        category: 'other',
        requesterId: 4,
        assigneeId: 2,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
        updatedAt: new Date()
      },
      {
        subject: 'Atualização do sistema operacional',
        description: 'Precisamos atualizar o sistema para a nova versão.',
        status: 'open',
        priority: 'medium',
        category: 'technical_support',
        requesterId: 5,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
        updatedAt: new Date()
      }
    ];
    
    ticketData.forEach(data => {
      const id = this.ticketIdCounter++;
      this.tickets.set(id, { id, ...data } as Ticket);
    });
  }
  
  private getInitials(name: string): string {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const avatarInitials = insertUser.avatarInitials || this.getInitials(insertUser.fullName);
    const user: User = { ...insertUser, id, avatarInitials, createdAt: new Date() };
    this.users.set(id, user);
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // Requester methods
  async getRequester(id: number): Promise<Requester | undefined> {
    return this.requesters.get(id);
  }

  async getRequesterByEmail(email: string): Promise<Requester | undefined> {
    return Array.from(this.requesters.values()).find(
      (requester) => requester.email === email
    );
  }

  async createRequester(insertRequester: InsertRequester): Promise<Requester> {
    const id = this.requesterIdCounter++;
    const avatarInitials = insertRequester.avatarInitials || this.getInitials(insertRequester.fullName);
    const requester: Requester = { ...insertRequester, id, avatarInitials, createdAt: new Date() };
    this.requesters.set(id, requester);
    return requester;
  }

  async getAllRequesters(): Promise<Requester[]> {
    return Array.from(this.requesters.values());
  }

  // Ticket methods
  async getTicket(id: number): Promise<Ticket | undefined> {
    return this.tickets.get(id);
  }

  async getTicketWithRelations(id: number): Promise<TicketWithRelations | undefined> {
    const ticket = this.tickets.get(id);
    if (!ticket) return undefined;

    const requester = this.requesters.get(ticket.requesterId);
    if (!requester) return undefined;

    let assignee = undefined;
    if (ticket.assigneeId) {
      assignee = this.users.get(ticket.assigneeId);
    }

    return {
      ...ticket,
      requester,
      assignee
    };
  }

  async createTicket(insertTicket: InsertTicket): Promise<Ticket> {
    const id = this.ticketIdCounter++;
    const now = new Date();
    const ticket: Ticket = { 
      ...insertTicket, 
      id, 
      createdAt: now, 
      updatedAt: now 
    };
    this.tickets.set(id, ticket);
    return ticket;
  }

  async updateTicket(id: number, updates: Partial<Ticket>): Promise<Ticket | undefined> {
    const ticket = this.tickets.get(id);
    if (!ticket) return undefined;

    const updatedTicket: Ticket = {
      ...ticket,
      ...updates,
      updatedAt: new Date()
    };
    this.tickets.set(id, updatedTicket);
    return updatedTicket;
  }

  async getAllTickets(): Promise<Ticket[]> {
    return Array.from(this.tickets.values());
  }

  async getAllTicketsWithRelations(): Promise<TicketWithRelations[]> {
    return Promise.all(
      Array.from(this.tickets.values()).map(async (ticket) => {
        const requester = await this.getRequester(ticket.requesterId);
        let assignee = undefined;
        if (ticket.assigneeId) {
          assignee = await this.getUser(ticket.assigneeId);
        }
        return {
          ...ticket,
          requester: requester!,
          assignee
        };
      })
    );
  }

  async getTicketsByStatus(status: string): Promise<Ticket[]> {
    return Array.from(this.tickets.values()).filter(
      (ticket) => ticket.status === status
    );
  }

  async getTicketsByPriority(priority: string): Promise<Ticket[]> {
    return Array.from(this.tickets.values()).filter(
      (ticket) => ticket.priority === priority
    );
  }

  async getTicketsByCategory(category: string): Promise<Ticket[]> {
    return Array.from(this.tickets.values()).filter(
      (ticket) => ticket.category === category
    );
  }

  async getTicketsByAssignee(assigneeId: number): Promise<Ticket[]> {
    return Array.from(this.tickets.values()).filter(
      (ticket) => ticket.assigneeId === assigneeId
    );
  }

  async getTicketsByRequester(requesterId: number): Promise<Ticket[]> {
    return Array.from(this.tickets.values()).filter(
      (ticket) => ticket.requesterId === requesterId
    );
  }

  async assignTicket(ticketId: number, assigneeId: number): Promise<Ticket | undefined> {
    return this.updateTicket(ticketId, { assigneeId });
  }

  async changeTicketStatus(ticketId: number, status: string): Promise<Ticket | undefined> {
    return this.updateTicket(ticketId, { status: status as any });
  }

  // Dashboard statistics
  async getTicketStatistics(): Promise<{
    totalTickets: number;
    openTickets: number;
    resolvedToday: number;
    averageResponseTime: string;
  }> {
    const allTickets = await this.getAllTickets();
    const openTickets = allTickets.filter(ticket => ticket.status === 'open' || ticket.status === 'in_progress').length;
    
    // Count tickets resolved today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const resolvedToday = allTickets.filter(ticket => 
      ticket.status === 'resolved' && 
      ticket.updatedAt.getTime() >= today.getTime()
    ).length;
    
    // Average response time - mocked for this implementation
    return {
      totalTickets: allTickets.length,
      openTickets,
      resolvedToday,
      averageResponseTime: '42min'
    };
  }

  // Este método é para consulta por categoria (filtro)
  async getTicketsByCategory(category: string): Promise<Ticket[]> {
    return Array.from(this.tickets.values()).filter(
      (ticket) => ticket.category === category
    );
  }
  
  // Este método é para estatísticas de contagem por categoria
  async getTicketCategoriesCount(): Promise<{category: string; count: number}[]> {
    const allTickets = await this.getAllTickets();
    const categories = ['technical_support', 'financial', 'commercial', 'other'];
    return categories.map(category => ({
      category,
      count: allTickets.filter(ticket => ticket.category === category).length
    }));
  }

  async getTicketVolumeByDate(): Promise<{date: string; count: number}[]> {
    const allTickets = await this.getAllTickets();
    
    // Group tickets by date (last 7 days)
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const count = allTickets.filter(ticket => 
        ticket.createdAt.getTime() >= date.getTime() && 
        ticket.createdAt.getTime() < nextDate.getTime()
      ).length;
      
      result.push({
        date: date.toISOString().split('T')[0],
        count
      });
    }
    
    return result;
  }
}

import { SqlServerStorage } from './sqlserver-storage';

// Exporta a implementação SQL Server
export const storage = new SqlServerStorage();
