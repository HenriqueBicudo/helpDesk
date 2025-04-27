import { 
  User, InsertUser, Requester, InsertRequester, 
  Ticket, InsertTicket, TicketWithRelations
} from "@shared/schema";
import { DB } from "./db";
import { IStorage } from "./storage-interface";

export class SqlServerStorage implements IStorage {
  
  // ----- USER METHODS -----
  
  async getUser(id: number): Promise<User | undefined> {
    console.log(`Buscando user com id ${id}`);
    const user = await DB.getOne<any>(`
      SELECT id, username, password, full_name, email, role, 
             avatar_initials, created_at
      FROM users 
      WHERE id = $1
    `, [id]);
    
    if (!user) {
      console.log(`User com id ${id} não encontrado`);
      return undefined;
    }
    
    // Mapear manualmente os nomes de colunas
    const mappedUser = {
      id: user.id,
      username: user.username,
      password: user.password,
      fullName: user.full_name,
      email: user.email,
      role: user.role,
      avatarInitials: user.avatar_initials,
      createdAt: user.created_at
    };
    
    console.log(`User encontrado:`, JSON.stringify(mappedUser));
    return mappedUser;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return DB.getOne<User>(`
      SELECT id, username, password, full_name AS fullName, email, role, 
             avatar_initials AS avatarInitials, created_at AS createdAt
      FROM users 
      WHERE username = $1
    `, [username]);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const avatarInitials = this.getInitials(insertUser.fullName);
    
    const id = await DB.insert('users', {
      username: insertUser.username,
      password: insertUser.password,
      full_name: insertUser.fullName,
      email: insertUser.email,
      role: insertUser.role || 'agent',
      avatar_initials: avatarInitials
    });
    
    return {
      id,
      username: insertUser.username,
      password: insertUser.password,
      fullName: insertUser.fullName,
      email: insertUser.email,
      role: insertUser.role || 'agent',
      avatarInitials,
      createdAt: new Date()
    };
  }

  async getAllUsers(): Promise<User[]> {
    return DB.query<User>(`
      SELECT id, username, password, full_name AS fullName, email, role, 
             avatar_initials AS avatarInitials, created_at AS createdAt
      FROM users
      ORDER BY full_name
    `);
  }
  
  // ----- REQUESTER METHODS -----
  
  async getRequester(id: number): Promise<Requester | undefined> {
    console.log(`Buscando requester com id ${id}`);
    const requester = await DB.getOne<any>(`
      SELECT id, full_name, email, company, 
             avatar_initials, created_at
      FROM requesters 
      WHERE id = $1
    `, [id]);
    
    if (!requester) {
      console.log(`Requester com id ${id} não encontrado`);
      return undefined;
    }
    
    // Mapear manualmente os nomes de colunas
    const mappedRequester = {
      id: requester.id,
      fullName: requester.full_name,
      email: requester.email,
      company: requester.company,
      avatarInitials: requester.avatar_initials,
      createdAt: requester.created_at
    };
    
    console.log(`Requester encontrado:`, JSON.stringify(mappedRequester));
    return mappedRequester;
  }

  async getRequesterByEmail(email: string): Promise<Requester | undefined> {
    return DB.getOne<Requester>(`
      SELECT id, full_name AS fullName, email, company, 
             avatar_initials AS avatarInitials, created_at AS createdAt
      FROM requesters 
      WHERE email = $1
    `, [email]);
  }

  async createRequester(insertRequester: InsertRequester): Promise<Requester> {
    const avatarInitials = this.getInitials(insertRequester.fullName);
    
    const id = await DB.insert('requesters', {
      full_name: insertRequester.fullName,
      email: insertRequester.email,
      company: insertRequester.company || null,
      avatar_initials: avatarInitials
    });
    
    return {
      id,
      fullName: insertRequester.fullName,
      email: insertRequester.email,
      company: insertRequester.company || null,
      avatarInitials,
      createdAt: new Date()
    };
  }

  async getAllRequesters(): Promise<Requester[]> {
    return DB.query<Requester>(`
      SELECT id, full_name AS fullName, email, company, 
             avatar_initials AS avatarInitials, created_at AS createdAt
      FROM requesters
      ORDER BY full_name
    `);
  }
  
  // ----- TICKET METHODS -----
  
  async getTicket(id: number): Promise<Ticket | undefined> {
    return DB.getOne<Ticket>(`
      SELECT id, subject, description, status, priority, category, 
             requester_id AS requesterId, assignee_id AS assigneeId,
             created_at AS createdAt, updated_at AS updatedAt
      FROM tickets 
      WHERE id = $1
    `, [id]);
  }

  async getTicketWithRelations(id: number): Promise<TicketWithRelations | undefined> {
    const ticket = await this.getTicket(id);
    if (!ticket) return undefined;
    
    const requester = await this.getRequester(ticket.requesterId);
    if (!requester) throw new Error(`Requester with ID ${ticket.requesterId} not found`);
    
    let assignee = undefined;
    if (ticket.assigneeId) {
      assignee = await this.getUser(ticket.assigneeId);
    }
    
    return {
      ...ticket,
      requester,
      assignee
    };
  }

  async createTicket(insertTicket: InsertTicket): Promise<Ticket> {
    const now = new Date();
    
    const id = await DB.insert('tickets', {
      subject: insertTicket.subject,
      description: insertTicket.description,
      status: insertTicket.status || 'open',
      priority: insertTicket.priority || 'medium',
      category: insertTicket.category,
      requester_id: insertTicket.requesterId,
      assignee_id: insertTicket.assigneeId || null,
      created_at: now,
      updated_at: now
    });
    
    return {
      id,
      subject: insertTicket.subject,
      description: insertTicket.description,
      status: insertTicket.status || 'open',
      priority: insertTicket.priority || 'medium',
      category: insertTicket.category,
      requesterId: insertTicket.requesterId,
      assigneeId: insertTicket.assigneeId || null,
      createdAt: now,
      updatedAt: now
    };
  }

  async updateTicket(id: number, updates: Partial<Ticket>): Promise<Ticket | undefined> {
    const ticket = await this.getTicket(id);
    if (!ticket) return undefined;
    
    const updateData: Record<string, any> = {};
    
    if (updates.subject) updateData.subject = updates.subject;
    if (updates.description) updateData.description = updates.description;
    if (updates.status) updateData.status = updates.status;
    if (updates.priority) updateData.priority = updates.priority;
    if (updates.category) updateData.category = updates.category;
    if (updates.requesterId) updateData.requester_id = updates.requesterId;
    
    // assigneeId can be null, so we need to check if it's undefined
    if (updates.assigneeId !== undefined) {
      updateData.assignee_id = updates.assigneeId;
    }
    
    updateData.updated_at = new Date();
    
    await DB.update('tickets', id, updateData);
    
    return this.getTicket(id);
  }

  async getAllTickets(): Promise<Ticket[]> {
    console.log("Buscando todos os tickets");
    const tickets = await DB.query<any>(`
      SELECT id, subject, description, status, priority, category, 
             requester_id, assignee_id,
             created_at, updated_at
      FROM tickets
      ORDER BY updated_at DESC
    `);
    
    // Mapear manualmente os nomes de colunas
    const mappedTickets = tickets.map(ticket => ({
      id: ticket.id,
      subject: ticket.subject,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      category: ticket.category,
      requesterId: ticket.requester_id,
      assigneeId: ticket.assignee_id,
      createdAt: ticket.created_at,
      updatedAt: ticket.updated_at
    }));
    
    console.log(`Encontrados ${mappedTickets.length} tickets`);
    console.log('Exemplo de ticket mapeado:', JSON.stringify(mappedTickets[0]));
    return mappedTickets;
  }

  async getAllTicketsWithRelations(): Promise<TicketWithRelations[]> {
    const tickets = await this.getAllTickets();
    console.log('Tickets encontrados:', tickets.length);
    const results: TicketWithRelations[] = [];
    
    for (const ticket of tickets) {
      console.log('Processando ticket:', ticket.id, 'com requesterId:', ticket.requesterId);
      const requester = await this.getRequester(ticket.requesterId);
      if (!requester) {
        console.log('Requester não encontrado para o ticket:', ticket.id);
        continue; // Skip tickets with invalid requesterId
      }
      
      let assignee = undefined;
      if (ticket.assigneeId) {
        console.log('Buscando assignee:', ticket.assigneeId);
        assignee = await this.getUser(ticket.assigneeId);
        if (!assignee) {
          console.log('Assignee não encontrado:', ticket.assigneeId);
        }
      }
      
      results.push({
        ...ticket,
        requester,
        assignee
      });
    }
    
    console.log('Total de tickets com relações:', results.length);
    return results;
  }

  async getTicketsByStatus(status: string): Promise<Ticket[]> {
    return DB.query<Ticket>(`
      SELECT id, subject, description, status, priority, category, 
             requester_id AS requesterId, assignee_id AS assigneeId,
             created_at AS createdAt, updated_at AS updatedAt
      FROM tickets
      WHERE status = $1
      ORDER BY updated_at DESC
    `, [status]);
  }

  async getTicketsByPriority(priority: string): Promise<Ticket[]> {
    return DB.query<Ticket>(`
      SELECT id, subject, description, status, priority, category, 
             requester_id AS requesterId, assignee_id AS assigneeId,
             created_at AS createdAt, updated_at AS updatedAt
      FROM tickets
      WHERE priority = $1
      ORDER BY updated_at DESC
    `, [priority]);
  }

  async getTicketsByCategory(category: string): Promise<Ticket[]> {
    return DB.query<Ticket>(`
      SELECT id, subject, description, status, priority, category, 
             requester_id AS requesterId, assignee_id AS assigneeId,
             created_at AS createdAt, updated_at AS updatedAt
      FROM tickets
      WHERE category = $1
      ORDER BY updated_at DESC
    `, [category]);
  }

  async getTicketsByAssignee(assigneeId: number): Promise<Ticket[]> {
    return DB.query<Ticket>(`
      SELECT id, subject, description, status, priority, category, 
             requester_id AS requesterId, assignee_id AS assigneeId,
             created_at AS createdAt, updated_at AS updatedAt
      FROM tickets
      WHERE assignee_id = $1
      ORDER BY updated_at DESC
    `, [assigneeId]);
  }

  async getTicketsByRequester(requesterId: number): Promise<Ticket[]> {
    return DB.query<Ticket>(`
      SELECT id, subject, description, status, priority, category, 
             requester_id AS requesterId, assignee_id AS assigneeId,
             created_at AS createdAt, updated_at AS updatedAt
      FROM tickets
      WHERE requester_id = $1
      ORDER BY updated_at DESC
    `, [requesterId]);
  }

  async assignTicket(ticketId: number, assigneeId: number): Promise<Ticket | undefined> {
    return this.updateTicket(ticketId, { assigneeId });
  }

  async changeTicketStatus(ticketId: number, status: string): Promise<Ticket | undefined> {
    return this.updateTicket(ticketId, { status: status as any });
  }
  
  // ----- STATISTICS METHODS -----
  
  async getTicketStatistics(): Promise<{
    totalTickets: number;
    openTickets: number;
    resolvedToday: number;
    averageResponseTime: string;
  }> {
    // Get total tickets
    const totalResult = await DB.query<{count: number}>(`
      SELECT COUNT(*) AS count FROM tickets
    `);
    const totalTickets = totalResult[0]?.count || 0;
    
    // Get open tickets (not resolved or closed)
    const openResult = await DB.query<{count: number}>(`
      SELECT COUNT(*) AS count FROM tickets
      WHERE status NOT IN ('resolved', 'closed')
    `);
    const openTickets = openResult[0]?.count || 0;
    
    // Get tickets resolved today
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
    
    const resolvedResult = await DB.query<{count: number}>(`
      SELECT COUNT(*) AS count FROM tickets
      WHERE status = 'resolved'
      AND DATE(updated_at) = $1
    `, [todayStr]);
    const resolvedToday = resolvedResult[0]?.count || 0;
    
    // For now, just return a placeholder for average response time
    // In a real implementation, this would calculate based on ticket history
    return {
      totalTickets,
      openTickets,
      resolvedToday,
      averageResponseTime: "4h 30m"
    };
  }
  
  async getTicketCategoriesCount(): Promise<{category: string; count: number}[]> {
    return DB.query<{category: string; count: number}>(`
      SELECT category, COUNT(*) AS count
      FROM tickets
      GROUP BY category
    `);
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
    
    const result: {date: string; count: number}[] = [];
    
    for (const dateStr of dates) {
      const countResult = await DB.query<{count: number}>(`
        SELECT COUNT(*) AS count
        FROM tickets
        WHERE DATE(created_at) = $1
      `, [dateStr]);
      
      result.push({
        date: dateStr,
        count: countResult[0]?.count || 0
      });
    }
    
    return result;
  }
  
  // ----- HELPER METHODS -----
  
  private getInitials(name: string): string {
    return name
      .split(' ')
      .map(part => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  }
}