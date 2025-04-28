import { 
  type User, type InsertUser,
  type Requester, type InsertRequester,
  type Ticket, type InsertTicket, type TicketWithRelations,
  type EmailTemplate, type InsertEmailTemplate, type EmailTemplateType
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
  getTicketCategoriesCount(): Promise<{category: string; count: number}[]>;
  getTicketVolumeByDate(): Promise<{date: string; count: number}[]>;
  
  // Email template methods
  getEmailTemplate(id: number): Promise<EmailTemplate | undefined>;
  getEmailTemplateByType(type: EmailTemplateType, active?: boolean): Promise<EmailTemplate | undefined>;
  createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate>;
  updateEmailTemplate(id: number, updates: Partial<EmailTemplate>): Promise<EmailTemplate | undefined>;
  deleteEmailTemplate(id: number): Promise<boolean>;
  getAllEmailTemplates(): Promise<EmailTemplate[]>;
  getEmailTemplatesByType(type: EmailTemplateType): Promise<EmailTemplate[]>;
}

// Import storage implementations
import { SqlServerStorage } from './sqlserver-storage';
import { MemStorage } from './storage';

// Choose storage implementation based on environment
const dbType = process.env.DB_TYPE || 'memory';

let storage: IStorage;

switch (dbType) {
  case 'sqlserver':
    console.log('Using SQL Server storage');
    storage = new SqlServerStorage();
    break;
  default:
    console.log('Using in-memory storage');
    storage = new MemStorage();
}

export { storage };