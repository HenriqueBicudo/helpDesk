import { 
  type User, type InsertUser,
  type Requester, type InsertRequester,
  type Ticket, type InsertTicket, type TicketWithRelations,
  type EmailTemplate, type InsertEmailTemplate, type EmailTemplateType,
  type TicketInteraction, type InsertTicketInteraction,
  type Attachment, type InsertAttachment,
  type ResponseTemplate, type InsertResponseTemplate,
  type SystemSetting, type InsertSystemSetting, type SettingCategory
} from "@shared/schema";

// Interface para contratos compatível com a UI
export interface ContractUI {
  id: string;
  contractNumber: string;
  companyId?: number;
  companyName?: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  monthlyValue?: number;
  hourlyRate?: number;
  includedHours?: number;
  usedHours: number;
  resetDay?: number;
  allowOverage?: boolean;
  description?: string;
  slaRuleId?: string;
  createdAt: string;
  updatedAt: string;
}

export type InsertContract = Omit<ContractUI, 'id' | 'createdAt' | 'updatedAt' | 'companyName' | 'usedHours'>;

// Tipos para Tags
export interface Tag {
  id: number;
  name: string;
  color: string;
  createdAt: Date;
}

export interface InsertTag {
  name: string;
  color: string;
}

// Tipos para Links entre Tickets
export interface TicketLink {
  id: number;
  sourceTicketId: number;
  targetTicketId: number;
  linkType: 'related' | 'duplicate' | 'blocks' | 'blocked_by' | 'child' | 'parent';
  description?: string;
  createdAt: Date;
}

export interface InsertTicketLink {
  sourceTicketId: number;
  targetTicketId: number;
  linkType: 'related' | 'duplicate' | 'blocks' | 'blocked_by' | 'child' | 'parent';
  description?: string;
}

export interface TicketLinkWithTicket extends TicketLink {
  targetTicket: Ticket;
}

// Tipos para Empresas (Companies)
export interface Company {
  id: number;
  name: string;
  cnpj?: string;
  email: string;
  phone?: string;
  address?: string;
  isActive: boolean;
  hasActiveContract?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface InsertCompany {
  name: string;
  cnpj?: string;
  email: string;
  phone?: string;
  address?: string;
  isActive?: boolean;
}

// Tipos para Equipes (Teams)
export interface Team {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  members?: User[];
  createdAt: Date;
  updatedAt: Date;
}

export interface InsertTeam {
  name: string;
  description?: string;
  isActive?: boolean;
}

// Storage interface
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  getUsersByCompany(company: string): Promise<User[]>;
  getUsersByRole(role: string): Promise<User[]>;
  getUserByEmail(email: string): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  
  // Company methods
  getAllCompanies(): Promise<Company[]>;
  getCompany(id: number): Promise<Company | undefined>;
  getCompanyById(id: number): Promise<Company | undefined>;
  getCompanyByEmail(email: string): Promise<Company | undefined>;
  getCompanyByEmailDomain(domain: string): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: number, updates: Partial<Company>): Promise<Company | undefined>;
  deleteCompany(id: number): Promise<boolean>;
  
  // Team methods
  getAllTeams(): Promise<Team[]>;
  getTeam(id: number): Promise<Team | undefined>;
  createTeam(team: InsertTeam): Promise<Team>;
  updateTeam(id: number, updates: Partial<Team>): Promise<Team | undefined>;
  deleteTeam(id: number): Promise<boolean>;
  getTeamMembers(teamId: number): Promise<User[]>;
  addTeamMember(teamId: number, userId: number): Promise<void>;
  removeTeamMember(teamId: number, userId: number): Promise<void>;
  getAvailableAgents(): Promise<User[]>;
  
  // Requester methods
  getRequester(id: number): Promise<Requester | undefined>;
  getRequesterByEmail(email: string): Promise<Requester | undefined>;
  createRequester(requester: InsertRequester): Promise<Requester>;
  updateRequester(id: number, updates: Partial<Requester>): Promise<Requester | undefined>;
  getAllRequesters(): Promise<Requester[]>;
  
  // Ticket methods
  getTicket(id: number): Promise<Ticket | undefined>;
  getTicketWithRelations(id: number): Promise<TicketWithRelations | undefined>;
  createTicket(ticket: InsertTicket): Promise<Ticket>;
  updateTicket(id: number, updates: Partial<Ticket>): Promise<Ticket | undefined>;
  getAllTickets(): Promise<Ticket[]>;
  getAllTicketsWithRelations(): Promise<TicketWithRelations[]>;
  getTicketsByCompany(company: string): Promise<TicketWithRelations[]>;
  getTicketsByUserCompany(userId: number): Promise<TicketWithRelations[]>;
  getTicketsByStatus(status: string): Promise<Ticket[]>;
  getTicketsByPriority(priority: string): Promise<Ticket[]>;
  getTicketsByCategory(category: string): Promise<Ticket[]>;
  getTicketsByAssignee(assigneeId: number): Promise<Ticket[]>;
  getTicketsByRequester(requesterId: number): Promise<Ticket[]>;
  assignTicket(ticketId: number, assigneeId: number): Promise<Ticket | undefined>;
  changeTicketStatus(ticketId: number, status: string): Promise<Ticket | undefined>;
  
  // Ticket Interaction methods
  getTicketInteractions(ticketId: number): Promise<TicketInteraction[]>;
  createTicketInteraction(interaction: InsertTicketInteraction): Promise<TicketInteraction>;
  
  // Attachment methods
  createAttachment(attachment: InsertAttachment): Promise<Attachment>;
  getTicketAttachments(ticketId: number): Promise<Attachment[]>;
  
  // Response Template methods
  getResponseTemplate(id: number): Promise<ResponseTemplate | undefined>;
  getAllResponseTemplates(): Promise<ResponseTemplate[]>;
  getResponseTemplatesByCategory(category: string): Promise<ResponseTemplate[]>;
  createResponseTemplate(template: InsertResponseTemplate): Promise<ResponseTemplate>;
  updateResponseTemplate(id: number, updates: Partial<ResponseTemplate>): Promise<ResponseTemplate | undefined>;
  deleteResponseTemplate(id: number): Promise<boolean>;
  
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
  
  // System settings methods
  getSystemSetting(key: string): Promise<SystemSetting | undefined>;
  getSystemSettingsByCategory(category: SettingCategory): Promise<SystemSetting[]>;
  getAllSystemSettings(): Promise<SystemSetting[]>;
  createSystemSetting(setting: InsertSystemSetting): Promise<SystemSetting>;
  updateSystemSetting(key: string, value: any): Promise<SystemSetting | undefined>;
  upsertSystemSetting(setting: InsertSystemSetting): Promise<SystemSetting>;
  deleteSystemSetting(key: string): Promise<boolean>;
  bulkUpdateSettings(settings: Record<string, any>, category: SettingCategory): Promise<boolean>;
  
  // Tags methods
  getTags(): Promise<Tag[]>;
  createTag(tag: InsertTag): Promise<Tag>;
  updateTag(id: number, updates: Partial<InsertTag>): Promise<Tag | undefined>;
  deleteTag(id: number): Promise<boolean>;
  
  // Ticket Tags methods
  getTicketTags(ticketId: number): Promise<Tag[]>;
  addTicketTag(ticketId: number, tagId: number): Promise<void>;
  removeTicketTag(ticketId: number, tagId: number): Promise<boolean>;
  
  // Ticket Links methods
  getTicketLinks(ticketId: number): Promise<TicketLinkWithTicket[]>;
  createTicketLink(link: InsertTicketLink): Promise<TicketLink>;
  removeTicketLink(linkId: number, ticketId: number): Promise<boolean>;

  // Contract methods
  getAllContracts(): Promise<ContractUI[]>;
  getContract(id: string): Promise<ContractUI | undefined>;
  createContract(contract: InsertContract): Promise<ContractUI>;
  updateContract(id: string, updates: Partial<ContractUI>): Promise<ContractUI | undefined>;
  deleteContract(id: string): Promise<boolean>;
  getContractsForTicket(ticketId: number): Promise<ContractUI[]>;
  getContractsByCompany(companyId: number): Promise<ContractUI[]>;
}

// Import storage implementations
import { PostgresStorage } from './postgres-storage';

// Choose storage implementation based on environment
const dbType = process.env.DB_TYPE || 'postgres';

let storage: IStorage;

switch (dbType) {
  case 'postgres':
    console.log('Using PostgreSQL storage');
    storage = new PostgresStorage();
    break;
  default:
    console.log('Using PostgreSQL storage (default)');
    storage = new PostgresStorage();
}

export { storage };