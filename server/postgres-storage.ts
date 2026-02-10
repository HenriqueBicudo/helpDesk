import { eq, desc, count, sql, and, gte, lte, or } from 'drizzle-orm';
import { db, client } from './db-postgres';
import * as schema from '../shared/drizzle-schema';
import { contracts } from '../shared/schema/contracts';
import { userTeams } from '../shared/schema/user-teams';
import { slaEngineService } from './services/slaEngine.service';
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
import type { Contract, InsertContract } from '../shared/schema/contracts';

// Interface para contratos compatível com a UI
interface ContractUI {
  id: string;
  contractNumber: string;
  companyId: number;
  companyName?: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  monthlyValue: number;
  hourlyRate: number;
  includedHours: number;
  usedHours: number;
  resetDay: number;
  allowOverage: boolean;
  description?: string;
  slaRuleId?: string;
  createdAt: string;
  updatedAt: string;
}

interface ContractUI {
  id: string;
  contractNumber: string;
  companyId: number;
  companyName?: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  monthlyValue: number;
  hourlyRate: number;
  includedHours: number;
  usedHours: number;
  resetDay: number;
  allowOverage: boolean;
  description?: string;
  slaRuleId?: string;
  createdAt: string;
  updatedAt: string;
}

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

  async getUserById(id: number): Promise<User | undefined> {
    const result = await db.select().from(schema.users).where(eq(schema.users.id, id));
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(schema.users).values(user as any).returning();
    return result[0] as User;
  }

  async getAllUsers(): Promise<User[]> {
    const usersWithCompanies = await db
      .select({
        id: schema.users.id,
        username: schema.users.username,
        password: schema.users.password,
        fullName: schema.users.fullName,
        email: schema.users.email,
        phone: schema.users.phone,
        role: schema.users.role,
        company: schema.users.company,
        companyName: schema.companies.name,
        teamId: schema.users.teamId,
        avatarInitials: schema.users.avatarInitials,
        isActive: schema.users.isActive,
        firstLogin: schema.users.firstLogin,
        createdAt: schema.users.createdAt,
        updatedAt: schema.users.updatedAt,
      })
      .from(schema.users)
      .leftJoin(
        schema.companies,
        eq(schema.users.company, sql`CAST(${schema.companies.id} AS VARCHAR)`)
      );

    // Mapear para incluir o nome da empresa no campo company
    return usersWithCompanies.map(user => ({
      ...user,
      company: user.companyName || user.company, // Usar o nome da empresa se disponível
    })) as User[];
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const result = await db.update(schema.users)
      .set(updates as any)
      .where(eq(schema.users.id, id))
      .returning();
    return result[0] as User | undefined;
  }

  async getUsersByCompany(company: string): Promise<User[]> {
    return await db.select().from(schema.users)
      .where(eq(schema.users.company, company)) as User[];
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return await db.select().from(schema.users)
      .where(eq(schema.users.role, role as any)) as User[];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(schema.users).where(eq(schema.users.email, email));
    return result[0] as User | undefined;
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

  async deleteRequester(id: number): Promise<void> {
    await db.delete(schema.requesters)
      .where(eq(schema.requesters.id, id));
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
        teamId: schema.tickets.teamId,
        categoryId: schema.tickets.categoryId,
        serviceId: schema.tickets.serviceId,
        requesterId: schema.tickets.requesterId,
        assigneeId: schema.tickets.assigneeId,
        companyId: schema.tickets.companyId,
        contractId: schema.tickets.contractId,
        responseDueAt: schema.tickets.responseDueAt,
        solutionDueAt: schema.tickets.solutionDueAt,
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
        },
        company: {
          id: schema.companies.id,
          name: schema.companies.name,
          email: schema.companies.email,
          isActive: schema.companies.isActive,
        },
        contract: {
          id: contracts.id,
          contractNumber: contracts.contractNumber,
          includedHours: contracts.includedHours,
          usedHours: contracts.usedHours,
          monthlyValue: contracts.monthlyValue,
          hourlyRate: contracts.hourlyRate,
          resetDay: contracts.resetDay,
          status: contracts.status,
        }
      })
      .from(schema.tickets)
      .innerJoin(schema.requesters, eq(schema.tickets.requesterId, schema.requesters.id))
      .leftJoin(schema.users, eq(schema.tickets.assigneeId, schema.users.id))
      .leftJoin(schema.companies, eq(schema.tickets.companyId, schema.companies.id))
      .leftJoin(contracts, 
        // Se o ticket tem contractId, usar esse contrato específico
        // Caso contrário, pegar o primeiro contrato ativo da empresa
        or(
          and(
            eq(contracts.id, schema.tickets.contractId),
            eq(contracts.status, 'active')
          ),
          and(
            eq(contracts.companyId, schema.companies.id),
            eq(contracts.status, 'active'),
            sql`${schema.tickets.contractId} IS NULL`
          )
        )
      )
      .where(eq(schema.tickets.id, id));

    if (result.length === 0) return undefined;

    const ticket = result[0];
    // Se join de contract não trouxe um contrato (ticket.contractId nulo), tentar buscar contrato ativo da empresa
    if (!ticket.contract && ticket.company?.id) {
      try {
        const active = await db.select({
          id: contracts.id,
          contractNumber: contracts.contractNumber,
          includedHours: contracts.includedHours,
          usedHours: contracts.usedHours,
          monthlyValue: contracts.monthlyValue,
          hourlyRate: contracts.hourlyRate,
          resetDay: contracts.resetDay,
          status: contracts.status,
          startDate: contracts.startDate,
          endDate: contracts.endDate,
        })
        .from(contracts)
        .where(and(eq(contracts.companyId, ticket.company.id), eq(contracts.status, 'active')))
        .orderBy(desc(contracts.createdAt))
        .limit(1);

        if (active && active.length > 0) {
          const c = active[0];
          ticket.contract = {
            id: c.id,
            contractNumber: c.contractNumber,
            includedHours: c.includedHours,
            usedHours: parseFloat(c.usedHours?.toString() || '0'),
            monthlyValue: parseFloat(c.monthlyValue?.toString() || '0'),
            hourlyRate: parseFloat(c.hourlyRate?.toString() || '0'),
            resetDay: c.resetDay,
            status: c.status,
            startDate: c.startDate,
            endDate: c.endDate,
          } as any;
        }
      } catch (err) {
        console.warn('⚠️ Falha ao buscar contrato ativo como fallback para ticket:', err);
      }
    }

    return {
      ...ticket,
      assignee: ticket.assignee?.id ? ticket.assignee : undefined,
      company: ticket.company?.id ? ticket.company : undefined
    } as TicketWithRelations;
  }

    /**
   * Cria um novo ticket no banco de dados com as seguintes funcionalidades:
   * 1. Vincula automaticamente o ticket ao contrato especificado (se informado)
   * 2. Mantém compatibilidade com tickets sem contrato
   * 3. Registra timestamp de criação e atualização
   * 4. Retorna o ticket criado com todas as informações
   * 5. Calcula e aplica os prazos de SLA automaticamente
   * 
   * @param ticket - Dados do ticket a ser criado
   * @returns Promise<Ticket> - Ticket criado com contractId vinculado e SLA calculado (se aplicável)
   */
  async createTicket(data: InsertTicket): Promise<Ticket> {
    // 1. Criar o ticket na transação
      // Se não foi informado contractId, tentar vincular automaticamente ao contrato ativo da empresa do requester
      let contractId = data.contractId;
      if (!contractId) {
        try {
          const requester = await this.getRequester(data.requesterId);
          const companyNameOrId = requester?.company;
          if (companyNameOrId) {
              // tentar resolver company id: solicitar a lista de companies e achar a que bate pelo nome
              // Primeiro tentar interpretar company como id numérico
              let companyId: number | undefined;
              if (typeof companyNameOrId === 'number') {
                companyId = companyNameOrId;
              } else if (typeof companyNameOrId === 'string') {
                const companiesByName = await db.select().from(schema.companies).where(eq(schema.companies.name, companyNameOrId));
                if (companiesByName && companiesByName.length > 0) {
                  companyId = companiesByName[0].id;
                } else {
                  // Caso não encontre por nome, tentar detectar pela relação de domínio com o email do requester
                  if (requester?.email) {
                    try {
                      const domain = requester.email.split('@')[1];
                      if (domain) {
                        const allCompanies = await db.select().from(schema.companies);
                        const matched = allCompanies.find(c => {
                          if (!c.email) return false;
                          const compDomain = c.email.split('@')[1];
                          return compDomain === domain;
                        });
                        if (matched) companyId = matched.id;
                      }
                    } catch (e) {
                      // ignore domain matching errors
                    }
                  }
                }
              }

            if (companyId) {
              // Buscar contratos ativos da empresa
              const activeContracts = await db.select().from(contracts)
                .where(and(eq(contracts.companyId, companyId), eq(contracts.status, 'active')))
                .orderBy(desc(contracts.createdAt));

              if (activeContracts && activeContracts.length > 0) {
                // Priorizar contrato de "support" se existir; caso contrário, usar o mais recente
                const supportContract = activeContracts.find(c => c.type === 'support');
                const selectedContract = supportContract || activeContracts[0];
                contractId = selectedContract.id;
                console.log(`🔗 Auto-linked ticket to contract ${contractId} (type: ${selectedContract.type}) for company ${companyId}`);
              }
            }
          }
        } catch (err) {
          console.warn('⚠️ Falha ao tentar auto-vincular contrato ao ticket:', err);
        }
      }

      // 1. Criar o ticket na transação
      const finalTicket = await db.transaction(async (tx) => {
        // Gerar Message-ID inicial para a thread de email
        const domain = process.env.SMTP_FROM_EMAIL?.split('@')[1] || 'helpdesk.local';
        const emailThreadId = `<ticket-${Date.now()}@${domain}>`;
        
        const ticketData = {
          subject: data.subject,
          description: data.description,
          status: data.status || 'open',
          priority: data.priority || 'medium',
          category: data.category,
          requesterId: data.requesterId,
          assigneeId: data.assigneeId || null,
          companyId: data.companyId || null, // ✅ Incluir companyId
          contractId: contractId || null,
          emailThreadId: emailThreadId, // Thread ID do email
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const result = await tx.insert(schema.tickets).values(ticketData as any).returning();
        return result[0] as Ticket;
      });

    // 2. Calcular SLA APÓS o commit da transação
    if (contractId && finalTicket.id) {
      try {
        console.log(`🎯 Iniciando cálculo de SLA para ticket ${finalTicket.id} com contrato ${contractId}`);
        
        // Usar o serviço SLA Engine para calcular os prazos
        const deadlines = await slaEngineService.calculateDeadlines(finalTicket.id);
        
        if (deadlines) {
          // Atualizar o ticket com os prazos calculados
          const updatedResult = await db
            .update(schema.tickets)
            .set({
              responseDueAt: deadlines.responseDueAt,
              solutionDueAt: deadlines.solutionDueAt,
              updatedAt: new Date()
            })
            .where(eq(schema.tickets.id, finalTicket.id))
            .returning();
          
          if (updatedResult.length > 0) {
            console.log(`✅ Prazos SLA aplicados ao ticket ${finalTicket.id}`);
            console.log(`   📞 Resposta até: ${deadlines.responseDueAt.toLocaleString('pt-BR')}`);
            console.log(`   🔧 Solução até: ${deadlines.solutionDueAt.toLocaleString('pt-BR')}`);
            
            // Retornar o ticket com os prazos atualizados
            return {
              ...finalTicket,
              responseDueAt: deadlines.responseDueAt,
              solutionDueAt: deadlines.solutionDueAt
            };
          }
        } else {
          console.log(`⚠️ Não foi possível calcular SLA para ticket ${finalTicket.id} (dados insuficientes)`);
        }
      } catch (slaError) {
        // Log do erro de SLA mas não falha a criação do ticket
        console.error(`❌ Erro no cálculo de SLA para ticket ${finalTicket.id}:`, slaError);
        // Ticket é criado mesmo sem SLA
      }
    } else {
      if (!contractId) {
        console.log(`ℹ️ Ticket ${finalTicket.id} criado sem contrato - SLA não aplicável`);
      }
      if (!finalTicket.id) {
        console.log(`⚠️ Ticket criado sem ID - não é possível calcular SLA`);
      }
    }
    
    return finalTicket;
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
        teamId: schema.tickets.teamId,
        categoryId: schema.tickets.categoryId,
        serviceId: schema.tickets.serviceId,
        requesterId: schema.tickets.requesterId,
        assigneeId: schema.tickets.assigneeId,
        companyId: schema.tickets.companyId,
        contractId: schema.tickets.contractId,
        responseDueAt: schema.tickets.responseDueAt,
        solutionDueAt: schema.tickets.solutionDueAt,
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
        },
        company: {
          id: schema.companies.id,
          name: schema.companies.name,
          email: schema.companies.email,
          isActive: schema.companies.isActive,
        }
      })
      .from(schema.tickets)
      .innerJoin(schema.requesters, eq(schema.tickets.requesterId, schema.requesters.id))
      .leftJoin(schema.users, eq(schema.tickets.assigneeId, schema.users.id))
      .leftJoin(schema.companies, eq(schema.tickets.companyId, schema.companies.id))
      .orderBy(desc(schema.tickets.createdAt));

    return result.map(ticket => ({
      ...ticket,
      assignee: ticket.assignee?.id ? ticket.assignee : undefined,
      company: ticket.company?.id ? ticket.company : undefined
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

  async getTicketsByRequester(requesterId: number): Promise<TicketWithRelations[]> {
    const result = await db
      .select({
        id: schema.tickets.id,
        subject: schema.tickets.subject,
        description: schema.tickets.description,
        status: schema.tickets.status,
        priority: schema.tickets.priority,
        category: schema.tickets.category,
        teamId: schema.tickets.teamId,
        categoryId: schema.tickets.categoryId,
        serviceId: schema.tickets.serviceId,
        requesterId: schema.tickets.requesterId,
        assigneeId: schema.tickets.assigneeId,
        companyId: schema.tickets.companyId,
        contractId: schema.tickets.contractId,
        responseDueAt: schema.tickets.responseDueAt,
        solutionDueAt: schema.tickets.solutionDueAt,
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
          company: schema.users.company,
          avatarInitials: schema.users.avatarInitials,
          isActive: schema.users.isActive,
          createdAt: schema.users.createdAt,
        },
        company: {
          id: schema.companies.id,
          name: schema.companies.name,
          email: schema.companies.email,
          isActive: schema.companies.isActive,
        }
      })
      .from(schema.tickets)
      .innerJoin(schema.requesters, eq(schema.tickets.requesterId, schema.requesters.id))
      .leftJoin(schema.users, eq(schema.tickets.assigneeId, schema.users.id))
      .leftJoin(schema.companies, eq(schema.tickets.companyId, schema.companies.id))
      .where(eq(schema.tickets.requesterId, requesterId))
      .orderBy(desc(schema.tickets.createdAt));

    return result.map(ticket => ({
      ...ticket,
      assignee: ticket.assignee?.id ? ticket.assignee : undefined,
      company: ticket.company?.id ? ticket.company : undefined
    })) as TicketWithRelations[];
  }

  async getTicketsByRequesterEmail(email: string): Promise<TicketWithRelations[]> {
    const result = await db
      .select({
        id: schema.tickets.id,
        subject: schema.tickets.subject,
        description: schema.tickets.description,
        status: schema.tickets.status,
        priority: schema.tickets.priority,
        category: schema.tickets.category,
        teamId: schema.tickets.teamId,
        categoryId: schema.tickets.categoryId,
        serviceId: schema.tickets.serviceId,
        requesterId: schema.tickets.requesterId,
        assigneeId: schema.tickets.assigneeId,
        companyId: schema.tickets.companyId,
        contractId: schema.tickets.contractId,
        responseDueAt: schema.tickets.responseDueAt,
        solutionDueAt: schema.tickets.solutionDueAt,
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
          company: schema.users.company,
          avatarInitials: schema.users.avatarInitials,
          isActive: schema.users.isActive,
          createdAt: schema.users.createdAt,
        },
        company: {
          id: schema.companies.id,
          name: schema.companies.name,
          email: schema.companies.email,
          isActive: schema.companies.isActive,
        }
      })
      .from(schema.tickets)
      .innerJoin(schema.requesters, eq(schema.tickets.requesterId, schema.requesters.id))
      .leftJoin(schema.users, eq(schema.tickets.assigneeId, schema.users.id))
      .leftJoin(schema.companies, eq(schema.tickets.companyId, schema.companies.id))
      .where(eq(schema.requesters.email, email))
      .orderBy(desc(schema.tickets.createdAt));

    return result.map(ticket => ({
      ...ticket,
      assignee: ticket.assignee?.id ? ticket.assignee : undefined,
      company: ticket.company?.id ? ticket.company : undefined
    })) as TicketWithRelations[];
  }

  async getTicketsByCompany(company: string): Promise<TicketWithRelations[]> {
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
        companyId: schema.tickets.companyId,
        contractId: schema.tickets.contractId,
        responseDueAt: schema.tickets.responseDueAt,
        solutionDueAt: schema.tickets.solutionDueAt,
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
          company: schema.users.company,
          avatarInitials: schema.users.avatarInitials,
          isActive: schema.users.isActive,
          createdAt: schema.users.createdAt,
        },
        company: {
          id: schema.companies.id,
          name: schema.companies.name,
          email: schema.companies.email,
          isActive: schema.companies.isActive,
        }
      })
      .from(schema.tickets)
      .innerJoin(schema.requesters, eq(schema.tickets.requesterId, schema.requesters.id))
      .leftJoin(schema.users, eq(schema.tickets.assigneeId, schema.users.id))
      .leftJoin(schema.companies, eq(schema.tickets.companyId, schema.companies.id))
      .where(eq(schema.requesters.company, company))
      .orderBy(desc(schema.tickets.createdAt));

    return result.map(ticket => ({
      ...ticket,
      assignee: ticket.assignee?.id ? ticket.assignee : undefined,
      company: ticket.company?.id ? ticket.company : undefined
    })) as TicketWithRelations[];
  }

  async getTicketsByCompanyId(companyId: number): Promise<TicketWithRelations[]> {
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
        companyId: schema.tickets.companyId,
        contractId: schema.tickets.contractId,
        responseDueAt: schema.tickets.responseDueAt,
        solutionDueAt: schema.tickets.solutionDueAt,
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
          company: schema.users.company,
          avatarInitials: schema.users.avatarInitials,
          isActive: schema.users.isActive,
          createdAt: schema.users.createdAt,
        },
        company: {
          id: schema.companies.id,
          name: schema.companies.name,
          email: schema.companies.email,
          isActive: schema.companies.isActive,
        }
      })
      .from(schema.tickets)
      .innerJoin(schema.requesters, eq(schema.tickets.requesterId, schema.requesters.id))
      .leftJoin(schema.users, eq(schema.tickets.assigneeId, schema.users.id))
      .leftJoin(schema.companies, eq(schema.tickets.companyId, schema.companies.id))
      .where(eq(schema.tickets.companyId, companyId))
      .orderBy(desc(schema.tickets.createdAt));

    return result.map(ticket => ({
      ...ticket,
      assignee: ticket.assignee?.id ? ticket.assignee : undefined,
      company: ticket.company?.id ? ticket.company : undefined
    })) as TicketWithRelations[];
  }

  async getTicketsByUserCompany(userId: number): Promise<TicketWithRelations[]> {
    // Primeiro buscar a empresa do usuário
    const user = await this.getUser(userId);
    if (!user?.company) {
      return [];
    }
    
    // Se user.company for um ID numérico, buscar o nome da empresa
    let companyName = user.company;
    if (!isNaN(parseInt(user.company, 10))) {
      const companyId = parseInt(user.company, 10);
      const company = await this.getCompanyById(companyId);
      if (company?.name) {
        companyName = company.name;
      }
    }
    
    // Depois buscar tickets da empresa pelo nome
    return this.getTicketsByCompany(companyName);
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
    try {
      const totalTickets = await db.select({ count: count() }).from(schema.tickets);
      
      const openTickets = await db
        .select({ count: count() })
        .from(schema.tickets)
        .where(eq(schema.tickets.status, 'open'));

      // Tickets resolvidos hoje - usando comparação mais simples
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const resolvedToday = await db
        .select({ count: count() })
        .from(schema.tickets)
        .where(
          and(
            eq(schema.tickets.status, 'resolved'),
            gte(schema.tickets.updatedAt, today)
          )
        );

      return {
        totalTickets: totalTickets[0].count,
        openTickets: openTickets[0].count,
        resolvedToday: resolvedToday[0].count,
        averageResponseTime: '2.5 horas' // Placeholder - calcular tempo real se necessário
      };
    } catch (error) {
      console.error('❌ Erro em getTicketStatistics:', error);
      throw error;
    }
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
      user: row.author?.id ? row.author : undefined
    })) as TicketInteraction[];
  }

  /**
   * Cria uma interação de ticket com apontamento automático de horas no contrato
   * 
   * Implementa a lógica de débito de horas do contrato:
   * 1. Se contractId especificado na interação, usa esse contrato
   * 2. Senão, verifica se o ticket possui contractId vinculado
   * 3. Se sim, incrementa o campo usedHours do contrato com time_spent
   * 4. Operação atômica: criação da interação + atualização do contrato ou nada
   * 
   * @param interaction - Dados da interação a ser criada
   * @returns Promise<TicketInteraction> - Interação criada
   */
  async createTicketInteraction(interaction: InsertTicketInteraction): Promise<TicketInteraction> {
    return await db.transaction(async (tx) => {
      // Cria a interação primeiro
      const result = await tx.insert(schema.ticketInteractions).values({
        ticketId: interaction.ticketId,
        userId: interaction.createdBy,
        type: interaction.type as any,
        content: interaction.content,
        isInternal: interaction.isInternal,
        timeSpent: interaction.timeSpent.toString(),
        contractId: interaction.contractId,
      }).returning();
      
      const createdInteraction = {
        id: result[0].id,
        ticketId: result[0].ticketId,
        type: result[0].type,
        content: result[0].content || '',
        isInternal: result[0].isInternal,
        timeSpent: parseFloat(result[0].timeSpent || '0'),
        contractId: interaction.contractId,
        createdBy: result[0].userId!,
        createdAt: result[0].createdAt,
        updatedAt: result[0].createdAt
      } as TicketInteraction;
      
      // Se há tempo apontado, verifica qual contrato usar para débito
      if (interaction.timeSpent > 0) {
        try {
          let contractId = interaction.contractId; // Prioridade: contractId da interação
          
          // Se não há contractId específico, busca no ticket
          if (!contractId) {
            const ticketWithContract = await tx
              .select({
                contractId: schema.tickets.contractId
              })
              .from(schema.tickets)
              .where(eq(schema.tickets.id, interaction.ticketId))
              .limit(1);
            
            if (ticketWithContract.length > 0 && ticketWithContract[0].contractId) {
              contractId = ticketWithContract[0].contractId;
            }
          }
          
          // Se tem contrato para debitar, atualiza as horas
          if (contractId) {
            
            // Atualiza o campo usedHours do contrato de forma atômica
            const updateResult = await tx
              .update(contracts)
              .set({
                usedHours: sql`${contracts.usedHours} + ${interaction.timeSpent.toString()}`
              })
              .where(eq(contracts.id, contractId))
              .returning({
                id: contracts.id,
                usedHours: contracts.usedHours
              });
            
            if (updateResult.length > 0) {
              console.log(`⏰ ${interaction.timeSpent}h debitadas do contrato ${contractId} (total: ${updateResult[0].usedHours}h)`);
            }
          }
        } catch (error) {
          // Em caso de erro na atualização do contrato, a transação falha
          console.error('Erro ao debitar horas do contrato:', error);
          throw new Error('Falha ao processar apontamento de horas no contrato');
        }
      }
      
      return createdInteraction;
    });
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

  async deleteResponseTemplate(id: number): Promise<boolean> {
    try {
      const result = await db.delete(schema.responseTemplates).where(eq(schema.responseTemplates.id, id)).returning();
      return result.length > 0;
    } catch (error) {
      console.error('Error deleting response template:', error);
      return false;
    }
  }

  async updateResponseTemplate(id: number, updates: Partial<ResponseTemplate>): Promise<ResponseTemplate | undefined> {
    try {
      const updateData: any = { ...updates, updatedAt: new Date() };

      // Map title -> name in DB
      if (updateData.title !== undefined) {
        updateData.name = updateData.title;
        delete updateData.title;
      }

      // Remove fields that don't exist on table
      delete updateData.id;
      delete updateData.createdAt;
      delete updateData.updatedAt; // we've set updatedAt above

      const result = await db.update(schema.responseTemplates).set(updateData).where(eq(schema.responseTemplates.id, id)).returning();

      if (!result || result.length === 0) return undefined;

      return await this.getResponseTemplate(id);
    } catch (error) {
      console.error('Error updating response template:', error);
      return undefined;
    }
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

  // Tags methods
  async getTags(): Promise<any[]> {
    try {
      const result = await db.select().from(schema.tags).orderBy(schema.tags.name);
      return result;
    } catch (error) {
      console.error('Error getting tags:', error);
      return [];
    }
  }

  async createTag(tag: any): Promise<any> {
    const result = await db.insert(schema.tags).values(tag).returning();
    return result[0];
  }

  async updateTag(id: number, updates: Partial<{ name: string; color: string }>): Promise<any | undefined> {
    try {
      const updateData: any = { ...updates, updatedAt: new Date() };
      const result = await db.update(schema.tags).set(updateData).where(eq(schema.tags.id, id)).returning();
      return result[0] || undefined;
    } catch (error) {
      console.error('Error updating tag:', error);
      return undefined;
    }
  }

  async updateTag(id: number, updates: Partial<{ name: string; color: string }>): Promise<any | undefined> {
    try {
      const updateData: any = { ...updates, updatedAt: new Date() };
      const result = await db.update(schema.tags).set(updateData).where(eq(schema.tags.id, id)).returning();
      return result[0];
    } catch (error) {
      console.error('Error updating tag:', error);
      return undefined;
    }
  }

  async deleteTag(id: number): Promise<boolean> {
    try {
      // Primeiro remover associações com tickets
      await db.delete(schema.ticketTags).where(eq(schema.ticketTags.tagId, id));
      
      // Depois remover a tag
      const result = await db.delete(schema.tags).where(eq(schema.tags.id, id));
      return result.length > 0;
    } catch (error) {
      console.error('Error deleting tag:', error);
      return false;
    }
  }

  // Ticket Tags methods
  async getTicketTags(ticketId: number): Promise<any[]> {
    try {
      const result = await db
        .select({
          id: schema.tags.id,
          name: schema.tags.name,
          color: schema.tags.color,
          createdAt: schema.tags.createdAt
        })
        .from(schema.ticketTags)
        .innerJoin(schema.tags, eq(schema.ticketTags.tagId, schema.tags.id))
        .where(eq(schema.ticketTags.ticketId, ticketId))
        .orderBy(schema.tags.name);
      return result;
    } catch (error) {
      console.error('Error getting ticket tags:', error);
      return [];
    }
  }

  async addTicketTag(ticketId: number, tagId: number): Promise<void> {
    await db.insert(schema.ticketTags).values({ ticketId, tagId });
  }

  async removeTicketTag(ticketId: number, tagId: number): Promise<boolean> {
    try {
      // Use raw client DELETE RETURNING to ensure we get affected rows reliably
      const rows: any[] = await client`
        DELETE FROM ticket_tags
        WHERE ticket_id = ${ticketId} AND tag_id = ${tagId}
        RETURNING id
      `;

      return Array.isArray(rows) && rows.length > 0;
    } catch (error) {
      console.error('Error removing ticket tag:', error);
      return false;
    }
  }

  // Ticket Links methods
  async getTicketLinks(ticketId: number): Promise<any[]> {
    try {
      const result = await db
        .select({
          id: schema.linkedTickets.id,
          sourceTicketId: schema.linkedTickets.sourceTicketId,
          targetTicketId: schema.linkedTickets.targetTicketId,
          linkType: schema.linkedTickets.linkType,
          description: schema.linkedTickets.description,
          createdAt: schema.linkedTickets.createdAt,
          targetTicket: {
            id: schema.tickets.id,
            subject: schema.tickets.subject,
            status: schema.tickets.status,
            priority: schema.tickets.priority,
            category: schema.tickets.category,
            createdAt: schema.tickets.createdAt
          }
        })
        .from(schema.linkedTickets)
        .innerJoin(schema.tickets, eq(schema.linkedTickets.targetTicketId, schema.tickets.id))
        .where(eq(schema.linkedTickets.sourceTicketId, ticketId))
        .orderBy(desc(schema.linkedTickets.createdAt));
      return result;
    } catch (error) {
      console.error('Error getting ticket links:', error);
      return [];
    }
  }

  async createTicketLink(link: any): Promise<any> {
    const result = await db.insert(schema.linkedTickets).values(link).returning();
    return result[0];
  }

  async removeTicketLink(linkId: number, ticketId: number): Promise<boolean> {
    try {
      const result = await db
        .delete(schema.linkedTickets)
        .where(and(
          eq(schema.linkedTickets.id, linkId),
          eq(schema.linkedTickets.sourceTicketId, ticketId)
        ));
      return result.length > 0;
    } catch (error) {
      console.error('Error removing ticket link:', error);
      return false;
    }
  }

  // Company methods
  async getAllCompanies(): Promise<any[]> {
    try {
      return await db.select().from(schema.companies);
    } catch (error) {
      console.error('Error getting companies:', error);
      return [];
    }
  }

  async getCompany(id: number): Promise<any | undefined> {
    try {
      const result = await db.select().from(schema.companies).where(eq(schema.companies.id, id));
      return result[0];
    } catch (error) {
      console.error('Error getting company:', error);
      return undefined;
    }
  }

  async getCompanyByEmail(email: string): Promise<any | undefined> {
    try {
      const result = await db.select().from(schema.companies).where(eq(schema.companies.email, email));
      return result[0];
    } catch (error) {
      console.error('Error getting company by email:', error);
      return undefined;
    }
  }

  async getCompanyByEmailDomain(domain: string): Promise<any | undefined> {
    try {
      // Buscar empresa onde o domínio do email corresponde
      const result = await db.select().from(schema.companies);
      
      // Filtrar por domínio do email
      const company = result.find(company => {
        if (!company.email) return false;
        const companyDomain = company.email.split('@')[1];
        return companyDomain === domain;
      });
      
      return company;
    } catch (error) {
      console.error('Error getting company by email domain:', error);
      return undefined;
    }
  }

  async getCompanyByName(name: string): Promise<any | undefined> {
    try {
      const result = await db.select().from(schema.companies).where(eq(schema.companies.name, name));
      return result[0];
    } catch (error) {
      console.error('Error getting company by name:', error);
      return undefined;
    }
  }

  async createCompany(company: any): Promise<any> {
    try {
      const result = await db.insert(schema.companies).values(company).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating company:', error);
      throw error;
    }
  }

  async updateCompany(id: number, updates: any): Promise<any | undefined> {
    try {
      const result = await db.update(schema.companies)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(schema.companies.id, id))
        .returning();
      return result[0];
    } catch (error) {
      console.error('Error updating company:', error);
      return undefined;
    }
  }

  // Team methods
  async getAllTeams(): Promise<any[]> {
    try {
      // Buscar equipes
      const teams = await db.select().from(schema.teams);
      
      // Para cada equipe, buscar seus membros através da tabela user_teams
      const teamsWithMembers = await Promise.all(
        teams.map(async (team) => {
          const members = await db
            .select({
              id: schema.users.id,
              name: schema.users.fullName,
              email: schema.users.email,
              role: schema.users.role,
              isPrimary: userTeams.isPrimary
            })
            .from(schema.users)
            .innerJoin(userTeams, eq(userTeams.userId, schema.users.id))
            .where(eq(userTeams.teamId, team.id));

          return {
            ...team,
            members,
            memberCount: members.length
          };
        })
      );

      return teamsWithMembers;
    } catch (error) {
      console.error('Error getting teams:', error);
      return [];
    }
  }

  async getTeam(id: number): Promise<any | undefined> {
    try {
      const result = await db.select().from(schema.teams).where(eq(schema.teams.id, id));
      return result[0];
    } catch (error) {
      console.error('Error getting team:', error);
      return undefined;
    }
  }

  async createTeam(team: any): Promise<any> {
    try {
      const result = await db.insert(schema.teams).values(team).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating team:', error);
      throw error;
    }
  }

  async updateTeam(id: number, updates: any): Promise<any | undefined> {
    try {
      const result = await db.update(schema.teams)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(schema.teams.id, id))
        .returning();
      return result[0];
    } catch (error) {
      console.error('Error updating team:', error);
      return undefined;
    }
  }

  async deleteTeam(id: number): Promise<boolean> {
    try {
      // Primeiro, remover todos os membros da equipe (setar teamId para null)
      await db.update(schema.users)
        .set({ teamId: null })
        .where(eq(schema.users.teamId, id));
      
      // Depois, excluir a equipe
      const result = await db.delete(schema.teams)
        .where(eq(schema.teams.id, id))
        .returning();
      
      return result.length > 0;
    } catch (error) {
      console.error('Error deleting team:', error);
      return false;
    }
  }

  async getTeamMembers(teamId: number): Promise<User[]> {
    try {
      // Simulação - buscar usuários que têm teamId
      return await db.select().from(schema.users)
        .where(eq(schema.users.teamId, teamId)) as User[];
    } catch (error) {
      console.error('Error getting team members:', error);
      return [];
    }
  }

  async addTeamMember(teamId: number, userId: number): Promise<void> {
    try {
      // Inserir na tabela user_teams
      await db.insert(schema.userTeams)
        .values({
          userId,
          teamId,
          isPrimary: false, // Por padrão não é primária
          joinedAt: new Date()
        })
        .onConflictDoNothing(); // Ignora se já existe
      
      // Manter compatibilidade: se o usuário não tem teamId, define como primária
      const user = await this.getUser(userId);
      if (!user?.teamId) {
        await db.update(schema.users)
          .set({ teamId })
          .where(eq(schema.users.id, userId));
        
        // Marca como equipe primária
        await db.update(schema.userTeams)
          .set({ isPrimary: true })
          .where(and(
            eq(schema.userTeams.userId, userId),
            eq(schema.userTeams.teamId, teamId)
          ));
      }
    } catch (error) {
      console.error('Error adding team member:', error);
      throw error;
    }
  }

  async removeTeamMember(teamId: number, userId: number): Promise<void> {
    try {
      // Remover da tabela user_teams
      await db.delete(schema.userTeams)
        .where(and(
          eq(schema.userTeams.userId, userId),
          eq(schema.userTeams.teamId, teamId)
        ));
      
      // Se era a equipe primária, limpar users.teamId
      const user = await this.getUser(userId);
      if (user?.teamId === teamId) {
        // Buscar outra equipe para ser a primária
        const otherTeams = await db.select()
          .from(schema.userTeams)
          .where(eq(schema.userTeams.userId, userId))
          .limit(1);
        
        if (otherTeams.length > 0) {
          // Define outra equipe como primária
          await db.update(schema.users)
            .set({ teamId: otherTeams[0].teamId })
            .where(eq(schema.users.id, userId));
          
          await db.update(schema.userTeams)
            .set({ isPrimary: true })
            .where(and(
              eq(schema.userTeams.userId, userId),
              eq(schema.userTeams.teamId, otherTeams[0].teamId)
            ));
        } else {
          // Não tem mais equipes, limpar
          await db.update(schema.users)
            .set({ teamId: null })
            .where(eq(schema.users.id, userId));
        }
      }
    } catch (error) {
      console.error('Error removing team member:', error);
      throw error;
    }
  }

  async getAvailableAgents(): Promise<User[]> {
    try {
      // Buscar agentes que não estão em nenhuma equipe
      return await db.select().from(schema.users)
        .where(and(
          eq(schema.users.role, 'helpdesk_agent'),
          sql`${schema.users.teamId} IS NULL`
        )) as User[];
    } catch (error) {
      console.error('Error getting available agents:', error);
      return [];
    }
  }

  async getTeamById(teamId: number): Promise<any | null> {
    try {
      const result = await db.select().from(schema.teams)
        .where(eq(schema.teams.id, teamId));
      return result[0] || null;
    } catch (error) {
      console.error('Error getting team by id:', error);
      return null;
    }
  }

  async getTicketsByTeam(teamId: number): Promise<any[]> {
    try {
      // Buscar tickets atribuídos aos membros da equipe
      const teamMembers = await db.select({ userId: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.teamId, teamId));
      
      const memberIds = teamMembers.map(m => m.userId);
      
      if (memberIds.length === 0) {
        return [];
      }
      
      return await db.select().from(schema.tickets)
        .where(sql`${schema.tickets.assigneeId} IN (${memberIds.join(',')})`);
    } catch (error) {
      console.error('Error getting tickets by team:', error);
      return [];
    }
  }

  // Métodos de exclusão
  async deleteUser(id: number): Promise<boolean> {
    try {
      const result = await db.delete(schema.users)
        .where(eq(schema.users.id, id))
        .returning();
      return result.length > 0;
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  }

  async deleteCompany(id: number): Promise<boolean> {
    try {
      const result = await db.delete(schema.companies)
        .where(eq(schema.companies.id, id))
        .returning();
      return result.length > 0;
    } catch (error) {
      console.error('Error deleting company:', error);
      return false;
    }
  }

  async getCompanyById(id: number): Promise<any | undefined> {
    try {
      const result = await db.select().from(schema.companies)
        .where(eq(schema.companies.id, id));
      return result[0];
    } catch (error) {
      console.error('Error getting company by id:', error);
      return undefined;
    }
  }

  // ============ CONTRACT METHODS ============

  async getAllContracts(): Promise<ContractUI[]> {
    try {
      const result = await db
        .select({
          id: contracts.id,
          contractNumber: contracts.contractNumber,
          companyId: contracts.companyId,
          companyName: schema.companies.name,
          type: contracts.type,
          status: contracts.status,
          startDate: contracts.startDate,
          endDate: contracts.endDate,
          monthlyValue: contracts.monthlyValue,
          hourlyRate: contracts.hourlyRate,
          includedHours: contracts.includedHours,
          usedHours: contracts.usedHours,
          resetDay: contracts.resetDay,
          allowOverage: contracts.allowOverage,
          description: contracts.description,
          slaRuleId: contracts.servicePackageId,
          slaTemplateId: contracts.slaTemplateId,
          createdAt: contracts.createdAt,
          updatedAt: contracts.updatedAt,
        })
        .from(contracts)
        .leftJoin(schema.companies, eq(contracts.companyId, schema.companies.id))
        .orderBy(desc(contracts.createdAt));

      return result.map(row => ({
        id: row.id,
        contractNumber: row.contractNumber,
        companyId: row.companyId,
        companyName: row.companyName || undefined,
        type: row.type,
        status: row.status,
        startDate: row.startDate!.toISOString(),
        endDate: row.endDate!.toISOString(),
        monthlyValue: parseFloat(row.monthlyValue?.toString() || '0'),
        hourlyRate: parseFloat(row.hourlyRate?.toString() || '0'),
        includedHours: row.includedHours || 0,
        usedHours: parseFloat(row.usedHours?.toString() || '0'),
        resetDay: row.resetDay || 1,
        allowOverage: row.allowOverage || false,
        description: row.description || undefined,
        slaRuleId: row.slaRuleId || undefined,
        slaTemplateId: row.slaTemplateId || undefined,
        createdAt: row.createdAt!.toISOString(),
        updatedAt: row.updatedAt!.toISOString(),
      }));
    } catch (error) {
      console.error('Error getting all contracts:', error);
      return [];
    }
  }

  async getContract(id: string): Promise<ContractUI | undefined> {
    try {
      const result = await db
        .select({
          id: contracts.id,
          contractNumber: contracts.contractNumber,
          companyId: contracts.companyId,
          companyName: schema.companies.name,
          type: contracts.type,
          status: contracts.status,
          startDate: contracts.startDate,
          endDate: contracts.endDate,
          monthlyValue: contracts.monthlyValue,
          hourlyRate: contracts.hourlyRate,
          includedHours: contracts.includedHours,
          usedHours: contracts.usedHours,
          resetDay: contracts.resetDay,
          allowOverage: contracts.allowOverage,
          description: contracts.description,
          slaRuleId: contracts.servicePackageId,
          slaTemplateId: contracts.slaTemplateId,
          createdAt: contracts.createdAt,
          updatedAt: contracts.updatedAt,
        })
        .from(contracts)
        .leftJoin(schema.companies, eq(contracts.companyId, schema.companies.id))
        .where(eq(contracts.id, id))
        .limit(1);

      if (result.length === 0) return undefined;

      const row = result[0];
      return {
        id: row.id,
        contractNumber: row.contractNumber,
        companyId: row.companyId,
        companyName: row.companyName || undefined,
        type: row.type,
        status: row.status,
        startDate: row.startDate!.toISOString(),
        endDate: row.endDate!.toISOString(),
        monthlyValue: parseFloat(row.monthlyValue?.toString() || '0'),
        hourlyRate: parseFloat(row.hourlyRate?.toString() || '0'),
        includedHours: row.includedHours || 0,
        usedHours: parseFloat(row.usedHours?.toString() || '0'),
        resetDay: row.resetDay || 1,
        allowOverage: row.allowOverage || false,
        description: row.description || undefined,
        slaRuleId: row.slaRuleId || undefined,
        slaTemplateId: row.slaTemplateId || undefined,
        createdAt: row.createdAt!.toISOString(),
        updatedAt: row.updatedAt!.toISOString(),
      };
    } catch (error) {
      console.error('Error getting contract:', error);
      return undefined;
    }
  }

  async createContract(contract: Omit<ContractUI, 'id' | 'createdAt' | 'updatedAt' | 'companyName' | 'usedHours'>): Promise<ContractUI> {
    try {
      const contractId = `CONTRACT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      // Se for informado um servicePackageId, verificar se existe na tabela service_packages
      let servicePackageIdToUse: string | null = null;
      if (contract.slaRuleId) {
        try {
          const rows: any[] = await client`SELECT id FROM service_packages WHERE id = ${contract.slaRuleId} LIMIT 1`;
          if (rows && rows.length > 0) {
            servicePackageIdToUse = contract.slaRuleId;
          } else {
            console.warn(`⚠️ Service package id not found: ${contract.slaRuleId} — inserting contract without service_package reference`);
          }
        } catch (err) {
          console.warn('⚠️ Could not validate service_package id due to DB error, proceeding without service_package:', err);
        }
      }

      const result = await db.insert(contracts).values({
        id: contractId,
        contractNumber: contract.contractNumber,
        companyId: contract.companyId || null,
        servicePackageId: servicePackageIdToUse,
        type: contract.type,
        status: contract.status,
        startDate: new Date(contract.startDate),
        endDate: new Date(contract.endDate),
        renewalDate: null,
        monthlyValue: contract.monthlyValue ? contract.monthlyValue.toString() : '0',
        setupValue: null,
        hourlyRate: contract.hourlyRate ? contract.hourlyRate.toString() : '0',
        includedHours: contract.includedHours || 0,
        usedHours: '0',
        resetDay: contract.resetDay || 1,
        lastReset: new Date(),
        allowOverage: contract.allowOverage || false,
        autoRenewal: false,
        notifyThreshold: null,
        description: contract.description || null,
        slaTemplateId: contract.slaTemplateId || null,  // Salvar template SLA selecionado
        createdAt: new Date(),
        updatedAt: new Date(),
        calendarId: null,
      }).returning();

      const created = result[0];
      return {
        id: created.id,
        contractNumber: created.contractNumber,
        companyId: created.companyId,
        type: created.type,
        status: created.status,
        startDate: created.startDate!.toISOString(),
        endDate: created.endDate!.toISOString(),
        monthlyValue: parseFloat(created.monthlyValue!.toString()),
        hourlyRate: parseFloat(created.hourlyRate!.toString()),
        includedHours: created.includedHours!,
        usedHours: parseFloat(created.usedHours!.toString()),
        resetDay: created.resetDay!,
        allowOverage: created.allowOverage!,
        description: created.description || undefined,
        slaRuleId: created.servicePackageId || undefined,
        slaTemplateId: created.slaTemplateId || undefined,  // Retornar template SLA associado
        createdAt: created.createdAt!.toISOString(),
        updatedAt: created.updatedAt!.toISOString(),
      } as ContractUI;
    } catch (error) {
      console.error('Error creating contract:', error);
      throw new Error('Failed to create contract');
    }
  }

  async updateContract(id: string, updates: Partial<ContractUI>): Promise<ContractUI | undefined> {
    try {
      const updateData: any = {
        ...updates,
        updatedAt: new Date(),
      };

      // Converter campos que precisam de transformação
      if (updates.startDate) {
        updateData.startDate = updates.startDate instanceof Date
          ? updates.startDate
          : new Date(updates.startDate);
      }
      if (updates.endDate) {
        updateData.endDate = updates.endDate instanceof Date
          ? updates.endDate
          : new Date(updates.endDate);
      }
      if (updates.monthlyValue !== undefined) updateData.monthlyValue = updates.monthlyValue?.toString() || '0';
      if (updates.hourlyRate !== undefined) updateData.hourlyRate = updates.hourlyRate?.toString() || '0';
      if (updates.usedHours !== undefined) updateData.usedHours = updates.usedHours.toString();
      if (updates.slaRuleId !== undefined) updateData.servicePackageId = updates.slaRuleId;
      if (updates.slaTemplateId !== undefined) updateData.slaTemplateId = updates.slaTemplateId;

      // Remover campos que não existem na tabela
      delete updateData.slaRuleId;
      delete updateData.companyName;
      delete updateData.createdAt;
      delete updateData.id;

      console.log(`📝 [Storage] Atualizando contrato ${id} com dados:`, updateData);

      const result = await db
        .update(contracts)
        .set(updateData)
        .where(eq(contracts.id, id))
        .returning();

      if (result.length === 0) {
        console.log(`❌ [Storage] Contrato ${id} não encontrado para atualização`);
        return undefined;
      }

      console.log(`✅ [Storage] Contrato ${id} atualizado com sucesso`);
      return await this.getContract(id);
    } catch (error) {
      console.error('Error updating contract:', error);
      return undefined;
    }
  }

  async deleteContract(id: string): Promise<boolean> {
    try {
      const result = await db
        .delete(contracts)
        .where(eq(contracts.id, id))
        .returning();
      
      return result.length > 0;
    } catch (error) {
      console.error('Error deleting contract:', error);
      return false;
    }
  }

  async getContractsForTicket(ticketId: number): Promise<ContractUI[]> {
    try {
      // Primeiro buscar o ticket para pegar a empresa
      const ticket = await this.getTicket(ticketId);
      console.log(`🎫 [getContractsForTicket] Ticket ${ticketId}:`, { 
        companyId: ticket?.companyId, 
        company: ticket?.company 
      });
      
      if (!ticket || !ticket.companyId) {
        console.log(`❌ [getContractsForTicket] Ticket sem companyId`);
        return [];
      }

      // Buscar contratos ativos da empresa
      const result = await db
        .select({
          id: contracts.id,
          contractNumber: contracts.contractNumber,
          companyId: contracts.companyId,
          type: contracts.type,
          status: contracts.status,
          includedHours: contracts.includedHours,
          usedHours: contracts.usedHours,
          allowOverage: contracts.allowOverage,
        })
        .from(contracts)
        .where(
          and(
            eq(contracts.companyId, ticket.companyId),
            eq(contracts.status, 'active')
          )
        )
        .orderBy(desc(contracts.createdAt));

      console.log(`✅ [getContractsForTicket] Encontrados ${result.length} contratos ativos para empresa ${ticket.companyId}`);
      if (result.length > 0) {
        console.log(`   Contratos:`, result.map(c => ({ id: c.id, number: c.contractNumber, type: c.type })));
      }

      return result.map(row => ({
        id: row.id,
        contractNumber: row.contractNumber,
        companyId: row.companyId,
        type: row.type,
        status: row.status,
        includedHours: row.includedHours!,
        usedHours: parseFloat(row.usedHours!.toString()),
        allowOverage: row.allowOverage!,
      })) as ContractUI[];
    } catch (error) {
      console.error('Error getting contracts for ticket:', error);
      return [];
    }
  }

  async getContractsByCompany(companyId: number): Promise<ContractUI[]> {
    try {
      const result = await db
        .select()
        .from(contracts)
        .where(eq(contracts.companyId, companyId))
        .orderBy(desc(contracts.createdAt));

      return result.map(row => ({
        id: row.id,
        contractNumber: row.contractNumber,
        companyId: row.companyId,
        type: row.type,
        status: row.status,
        startDate: row.startDate!.toISOString(),
        endDate: row.endDate!.toISOString(),
        monthlyValue: parseFloat(row.monthlyValue?.toString() || '0'),
        hourlyRate: parseFloat(row.hourlyRate?.toString() || '0'),
        includedHours: row.includedHours || 0,
        usedHours: parseFloat(row.usedHours?.toString() || '0'),
        resetDay: row.resetDay || 1,
        allowOverage: row.allowOverage || false,
        description: row.description || undefined,
        slaRuleId: row.servicePackageId || undefined,
        createdAt: row.createdAt!.toISOString(),
        updatedAt: row.updatedAt!.toISOString(),
      })) as ContractUI[];
    } catch (error) {
      console.error('Error getting contracts by company:', error);
      return [];
    }
  }

  // Requester notes methods
  async getRequesterNotes(requesterId: number): Promise<any[]> {
    try {
      const notes = await db
        .select({
          id: schema.requesterNotes.id,
          requesterId: schema.requesterNotes.requesterId,
          content: schema.requesterNotes.content,
          authorId: schema.requesterNotes.authorId,
          isImportant: schema.requesterNotes.isImportant,
          createdAt: schema.requesterNotes.createdAt,
          updatedAt: schema.requesterNotes.updatedAt,
          authorName: schema.users.fullName,
          authorEmail: schema.users.email,
        })
        .from(schema.requesterNotes)
        .leftJoin(schema.users, eq(schema.requesterNotes.authorId, schema.users.id))
        .where(eq(schema.requesterNotes.requesterId, requesterId))
        .orderBy(desc(schema.requesterNotes.createdAt));

      return notes;
    } catch (error) {
      console.error('Error getting requester notes:', error);
      return [];
    }
  }

  async createRequesterNote(note: { requesterId: number; content: string; authorId: number; isImportant?: boolean }): Promise<any> {
    const result = await db
      .insert(schema.requesterNotes)
      .values({
        requesterId: note.requesterId,
        content: note.content,
        authorId: note.authorId,
        isImportant: note.isImportant || false,
      })
      .returning();

    return result[0];
  }

  async updateRequesterNote(id: number, updates: { content?: string; isImportant?: boolean }): Promise<any | undefined> {
    const result = await db
      .update(schema.requesterNotes)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(schema.requesterNotes.id, id))
      .returning();

    return result[0];
  }

  async deleteRequesterNote(id: number): Promise<void> {
    await db.delete(schema.requesterNotes).where(eq(schema.requesterNotes.id, id));
  }
}
