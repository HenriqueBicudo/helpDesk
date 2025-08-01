"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostgresStorage = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_drizzle_1 = require("./db-drizzle");
const schema = require("../shared/drizzle-schema");
const contracts_1 = require("../shared/schema/contracts");
const slaEngine_service_1 = require("./services/slaEngine.service");
class PostgresStorage {
    // User methods
    async getUser(id) {
        const result = await db_drizzle_1.db.select().from(schema.users).where((0, drizzle_orm_1.eq)(schema.users.id, id));
        return result[0];
    }
    async getUserByUsername(username) {
        const result = await db_drizzle_1.db.select().from(schema.users).where((0, drizzle_orm_1.eq)(schema.users.username, username));
        return result[0];
    }
    async createUser(user) {
        const result = await db_drizzle_1.db.insert(schema.users).values(user).returning();
        return result[0];
    }
    async getAllUsers() {
        return await db_drizzle_1.db.select().from(schema.users);
    }
    // Requester methods
    async getRequester(id) {
        const result = await db_drizzle_1.db.select().from(schema.requesters).where((0, drizzle_orm_1.eq)(schema.requesters.id, id));
        return result[0];
    }
    async getRequesterByEmail(email) {
        const result = await db_drizzle_1.db.select().from(schema.requesters).where((0, drizzle_orm_1.eq)(schema.requesters.email, email));
        return result[0];
    }
    async createRequester(requester) {
        const result = await db_drizzle_1.db.insert(schema.requesters).values(requester).returning();
        return result[0];
    }
    async getAllRequesters() {
        return await db_drizzle_1.db.select().from(schema.requesters);
    }
    async updateRequester(id, updates) {
        const result = await db_drizzle_1.db.update(schema.requesters)
            .set(updates)
            .where((0, drizzle_orm_1.eq)(schema.requesters.id, id))
            .returning();
        return result[0];
    }
    // Ticket methods
    async getTicket(id) {
        const result = await db_drizzle_1.db.select().from(schema.tickets).where((0, drizzle_orm_1.eq)(schema.tickets.id, id));
        return result[0];
    }
    async getTicketWithRelations(id) {
        const result = await db_drizzle_1.db
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
            .innerJoin(schema.requesters, (0, drizzle_orm_1.eq)(schema.tickets.requesterId, schema.requesters.id))
            .leftJoin(schema.users, (0, drizzle_orm_1.eq)(schema.tickets.assigneeId, schema.users.id))
            .where((0, drizzle_orm_1.eq)(schema.tickets.id, id));
        if (result.length === 0)
            return undefined;
        const ticket = result[0];
        return {
            ...ticket,
            assignee: ticket.assignee?.id ? ticket.assignee : undefined
        };
    }
    /**
     * Cria um novo ticket com vinculação automática de contrato e cálculo de SLA
     *
     * Implementa a lógica de auto-vinculação de contratos:
     * 1. Busca contratos ativos para o requesterId
     * 2. Filtra por período de vigência (startDate <= hoje <= endDate)
     * 3. Prioriza o contrato mais recente se houver múltiplos
     * 4. Vincula automaticamente o contractId ao ticket
     * 5. Calcula e aplica os prazos de SLA automaticamente
     *
     * @param ticket - Dados do ticket a ser criado
     * @returns Promise<Ticket> - Ticket criado com contractId vinculado e SLA calculado (se aplicável)
     */
    async createTicket(ticket) {
        return await db_drizzle_1.db.transaction(async (tx) => {
            let contractId = ticket.contractId || null;
            // Se contractId não foi especificado explicitamente, tenta vinculação automática
            if (!contractId) {
                try {
                    const today = new Date();
                    // Busca contratos ativos para o solicitante dentro do período de vigência
                    const activeContracts = await tx
                        .select({
                        id: contracts_1.contracts.id,
                        startDate: contracts_1.contracts.startDate,
                        endDate: contracts_1.contracts.endDate,
                        createdAt: contracts_1.contracts.createdAt
                    })
                        .from(contracts_1.contracts)
                        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(contracts_1.contracts.requesterId, ticket.requesterId), (0, drizzle_orm_1.eq)(contracts_1.contracts.isActive, true), (0, drizzle_orm_1.lte)(contracts_1.contracts.startDate, today), 
                    // Se endDate é null, contrato não tem data de fim
                    (0, drizzle_orm_1.sql) `(${contracts_1.contracts.endDate} IS NULL OR ${today} <= ${contracts_1.contracts.endDate})`))
                        .orderBy((0, drizzle_orm_1.desc)(contracts_1.contracts.createdAt)) // Mais recente primeiro
                        .limit(1);
                    // Se encontrou um contrato ativo válido, vincula automaticamente
                    if (activeContracts.length > 0) {
                        contractId = activeContracts[0].id;
                        console.log(`🔗 Contrato ${contractId} vinculado automaticamente ao ticket do solicitante ${ticket.requesterId}`);
                    }
                }
                catch (error) {
                    // Log do erro mas não falha a criação do ticket
                    console.error('Erro na vinculação automática de contrato:', error);
                }
            }
            // Cria o ticket com o contractId determinado (pode ser null)
            const ticketData = {
                ...ticket,
                contractId
            };
            const result = await tx.insert(schema.tickets).values(ticketData).returning();
            const createdTicket = result[0];
            // **NOVA FUNCIONALIDADE: Cálculo automático de SLA**
            // Se o ticket foi vinculado a um contrato, calcular os prazos de SLA
            if (contractId && createdTicket.id) {
                try {
                    console.log(`🎯 Iniciando cálculo de SLA para ticket ${createdTicket.id} com contrato ${contractId}`);
                    // Usar o serviço SLA Engine para calcular os prazos
                    const deadlines = await slaEngine_service_1.slaEngineService.calculateDeadlines(createdTicket.id);
                    if (deadlines) {
                        // Atualizar o ticket com os prazos calculados
                        const updatedResult = await tx
                            .update(schema.tickets)
                            .set({
                            responseDueAt: deadlines.responseDueAt,
                            solutionDueAt: deadlines.solutionDueAt,
                            updatedAt: new Date()
                        })
                            .where((0, drizzle_orm_1.eq)(schema.tickets.id, createdTicket.id))
                            .returning();
                        if (updatedResult.length > 0) {
                            console.log(`✅ Prazos SLA aplicados ao ticket ${createdTicket.id}`);
                            console.log(`   📞 Resposta até: ${deadlines.responseDueAt.toLocaleString('pt-BR')}`);
                            console.log(`   🔧 Solução até: ${deadlines.solutionDueAt.toLocaleString('pt-BR')}`);
                            // Retornar o ticket com os prazos atualizados
                            return {
                                ...createdTicket,
                                responseDueAt: deadlines.responseDueAt,
                                solutionDueAt: deadlines.solutionDueAt
                            };
                        }
                    }
                    else {
                        console.log(`⚠️ Não foi possível calcular SLA para ticket ${createdTicket.id} (dados insuficientes)`);
                    }
                }
                catch (slaError) {
                    // Log do erro de SLA mas não falha a criação do ticket
                    console.error(`❌ Erro no cálculo de SLA para ticket ${createdTicket.id}:`, slaError);
                    // Ticket é criado mesmo sem SLA
                }
            }
            else {
                if (!contractId) {
                    console.log(`ℹ️ Ticket ${createdTicket.id} criado sem contrato - SLA não aplicável`);
                }
                if (!createdTicket.id) {
                    console.log(`⚠️ Ticket criado sem ID - não é possível calcular SLA`);
                }
            }
            return createdTicket;
        });
    }
    async updateTicket(id, updates) {
        const result = await db_drizzle_1.db.update(schema.tickets)
            .set({ ...updates, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(schema.tickets.id, id))
            .returning();
        return result[0];
    }
    async getAllTickets() {
        return await db_drizzle_1.db.select().from(schema.tickets).orderBy((0, drizzle_orm_1.desc)(schema.tickets.createdAt));
    }
    async getAllTicketsWithRelations() {
        const result = await db_drizzle_1.db
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
            .innerJoin(schema.requesters, (0, drizzle_orm_1.eq)(schema.tickets.requesterId, schema.requesters.id))
            .leftJoin(schema.users, (0, drizzle_orm_1.eq)(schema.tickets.assigneeId, schema.users.id))
            .orderBy((0, drizzle_orm_1.desc)(schema.tickets.createdAt));
        return result.map(ticket => ({
            ...ticket,
            assignee: ticket.assignee?.id ? ticket.assignee : undefined
        }));
    }
    async getTicketsByStatus(status) {
        return await db_drizzle_1.db.select().from(schema.tickets)
            .where((0, drizzle_orm_1.eq)(schema.tickets.status, status))
            .orderBy((0, drizzle_orm_1.desc)(schema.tickets.createdAt));
    }
    async getTicketsByPriority(priority) {
        return await db_drizzle_1.db.select().from(schema.tickets)
            .where((0, drizzle_orm_1.eq)(schema.tickets.priority, priority))
            .orderBy((0, drizzle_orm_1.desc)(schema.tickets.createdAt));
    }
    async getTicketsByCategory(category) {
        return await db_drizzle_1.db.select().from(schema.tickets)
            .where((0, drizzle_orm_1.eq)(schema.tickets.category, category))
            .orderBy((0, drizzle_orm_1.desc)(schema.tickets.createdAt));
    }
    async getTicketsByAssignee(assigneeId) {
        return await db_drizzle_1.db.select().from(schema.tickets)
            .where((0, drizzle_orm_1.eq)(schema.tickets.assigneeId, assigneeId))
            .orderBy((0, drizzle_orm_1.desc)(schema.tickets.createdAt));
    }
    async getTicketsByRequester(requesterId) {
        return await db_drizzle_1.db.select().from(schema.tickets)
            .where((0, drizzle_orm_1.eq)(schema.tickets.requesterId, requesterId))
            .orderBy((0, drizzle_orm_1.desc)(schema.tickets.createdAt));
    }
    async assignTicket(ticketId, assigneeId) {
        const result = await db_drizzle_1.db.update(schema.tickets)
            .set({ assigneeId, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(schema.tickets.id, ticketId))
            .returning();
        return result[0];
    }
    async changeTicketStatus(ticketId, status) {
        const result = await db_drizzle_1.db.update(schema.tickets)
            .set({ status: status, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(schema.tickets.id, ticketId))
            .returning();
        return result[0];
    }
    // Dashboard statistics
    async getTicketStatistics() {
        const totalTickets = await db_drizzle_1.db.select({ count: (0, drizzle_orm_1.count)() }).from(schema.tickets);
        const openTickets = await db_drizzle_1.db
            .select({ count: (0, drizzle_orm_1.count)() })
            .from(schema.tickets)
            .where((0, drizzle_orm_1.eq)(schema.tickets.status, 'open'));
        // Tickets resolvidos hoje
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const resolvedToday = await db_drizzle_1.db
            .select({ count: (0, drizzle_orm_1.count)() })
            .from(schema.tickets)
            .where((0, drizzle_orm_1.sql) `${schema.tickets.status} = 'resolved' AND ${schema.tickets.updatedAt} >= ${today}`);
        return {
            totalTickets: totalTickets[0].count,
            openTickets: openTickets[0].count,
            resolvedToday: resolvedToday[0].count,
            averageResponseTime: '2.5 horas' // Placeholder - calcular tempo real se necessário
        };
    }
    async getTicketCategoriesCount() {
        const result = await db_drizzle_1.db
            .select({
            category: schema.tickets.category,
            count: (0, drizzle_orm_1.count)()
        })
            .from(schema.tickets)
            .groupBy(schema.tickets.category);
        return result.map(r => ({ category: r.category, count: r.count }));
    }
    async getTicketVolumeByDate() {
        const result = await db_drizzle_1.db
            .select({
            date: (0, drizzle_orm_1.sql) `DATE(${schema.tickets.createdAt})`,
            count: (0, drizzle_orm_1.count)()
        })
            .from(schema.tickets)
            .groupBy((0, drizzle_orm_1.sql) `DATE(${schema.tickets.createdAt})`)
            .orderBy((0, drizzle_orm_1.sql) `DATE(${schema.tickets.createdAt})`);
        return result.map(r => ({ date: r.date, count: r.count }));
    }
    // Email template methods
    async getEmailTemplate(id) {
        const result = await db_drizzle_1.db.select().from(schema.emailTemplates).where((0, drizzle_orm_1.eq)(schema.emailTemplates.id, id));
        return result[0];
    }
    async getEmailTemplateByType(type, active = true) {
        const result = await db_drizzle_1.db.select().from(schema.emailTemplates)
            .where(active
            ? (0, drizzle_orm_1.sql) `${schema.emailTemplates.type} = ${type} AND ${schema.emailTemplates.isActive} = true`
            : (0, drizzle_orm_1.eq)(schema.emailTemplates.type, type));
        return result[0];
    }
    async createEmailTemplate(template) {
        const result = await db_drizzle_1.db.insert(schema.emailTemplates).values(template).returning();
        return result[0];
    }
    async updateEmailTemplate(id, updates) {
        const result = await db_drizzle_1.db.update(schema.emailTemplates)
            .set({ ...updates, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(schema.emailTemplates.id, id))
            .returning();
        return result[0];
    }
    async deleteEmailTemplate(id) {
        const result = await db_drizzle_1.db.delete(schema.emailTemplates)
            .where((0, drizzle_orm_1.eq)(schema.emailTemplates.id, id))
            .returning();
        return result.length > 0;
    }
    async getAllEmailTemplates() {
        return await db_drizzle_1.db.select().from(schema.emailTemplates).orderBy((0, drizzle_orm_1.desc)(schema.emailTemplates.createdAt));
    }
    async getEmailTemplatesByType(type) {
        return await db_drizzle_1.db.select().from(schema.emailTemplates)
            .where((0, drizzle_orm_1.eq)(schema.emailTemplates.type, type))
            .orderBy((0, drizzle_orm_1.desc)(schema.emailTemplates.createdAt));
    }
    // Ticket Interaction methods
    async getTicketInteractions(ticketId) {
        const result = await db_drizzle_1.db
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
            .leftJoin(schema.users, (0, drizzle_orm_1.eq)(schema.ticketInteractions.userId, schema.users.id))
            .where((0, drizzle_orm_1.eq)(schema.ticketInteractions.ticketId, ticketId))
            .orderBy((0, drizzle_orm_1.desc)(schema.ticketInteractions.createdAt));
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
        }));
    }
    /**
     * Cria uma interação de ticket com apontamento automático de horas no contrato
     *
     * Implementa a lógica de débito de horas do contrato:
     * 1. Verifica se o ticket possui contractId vinculado
     * 2. Se sim, incrementa o campo usedHours do contrato com time_spent
     * 3. Operação atômica: criação da interação + atualização do contrato ou nada
     *
     * @param interaction - Dados da interação a ser criada
     * @returns Promise<TicketInteraction> - Interação criada
     */
    async createTicketInteraction(interaction) {
        return await db_drizzle_1.db.transaction(async (tx) => {
            // Cria a interação primeiro
            const result = await tx.insert(schema.ticketInteractions).values({
                ticketId: interaction.ticketId,
                userId: interaction.createdBy,
                type: interaction.type,
                content: interaction.content,
                isInternal: interaction.isInternal,
                timeSpent: interaction.timeSpent.toString(),
            }).returning();
            const createdInteraction = {
                id: result[0].id,
                ticketId: result[0].ticketId,
                type: result[0].type,
                content: result[0].content || '',
                isInternal: result[0].isInternal,
                timeSpent: parseFloat(result[0].timeSpent || '0'),
                createdBy: result[0].userId,
                createdAt: result[0].createdAt,
                updatedAt: result[0].createdAt
            };
            // Se há tempo apontado, verifica se deve debitar do contrato
            if (interaction.timeSpent > 0) {
                try {
                    // Busca o ticket para verificar se tem contrato vinculado
                    const ticketWithContract = await tx
                        .select({
                        contractId: schema.tickets.contractId
                    })
                        .from(schema.tickets)
                        .where((0, drizzle_orm_1.eq)(schema.tickets.id, interaction.ticketId))
                        .limit(1);
                    // Se o ticket tem contrato vinculado, debita as horas
                    if (ticketWithContract.length > 0 && ticketWithContract[0].contractId) {
                        const contractId = ticketWithContract[0].contractId;
                        // Atualiza o campo usedHours do contrato de forma atômica
                        const updateResult = await tx
                            .update(contracts_1.contracts)
                            .set({
                            usedHours: (0, drizzle_orm_1.sql) `${contracts_1.contracts.usedHours} + ${interaction.timeSpent.toString()}`
                        })
                            .where((0, drizzle_orm_1.eq)(contracts_1.contracts.id, contractId))
                            .returning({
                            id: contracts_1.contracts.id,
                            usedHours: contracts_1.contracts.usedHours
                        });
                        if (updateResult.length > 0) {
                            console.log(`⏰ ${interaction.timeSpent}h debitadas do contrato ${contractId} (total: ${updateResult[0].usedHours}h)`);
                        }
                    }
                }
                catch (error) {
                    // Em caso de erro na atualização do contrato, a transação falha
                    console.error('Erro ao debitar horas do contrato:', error);
                    throw new Error('Falha ao processar apontamento de horas no contrato');
                }
            }
            return createdInteraction;
        });
    }
    // Attachment methods
    async createAttachment(attachment) {
        const result = await db_drizzle_1.db.insert(schema.attachments).values({
            ticketId: attachment.ticketId,
            fileName: attachment.fileName,
            originalName: attachment.fileName, // Usando fileName como originalName por agora
            mimeType: attachment.mimeType,
            fileSize: attachment.fileSize,
            type: 'other', // Tipo padrão por agora
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
        };
    }
    async getTicketAttachments(ticketId) {
        const result = await db_drizzle_1.db.select().from(schema.attachments)
            .where((0, drizzle_orm_1.eq)(schema.attachments.ticketId, ticketId))
            .orderBy((0, drizzle_orm_1.desc)(schema.attachments.createdAt));
        return result.map(row => ({
            id: row.id,
            ticketId: row.ticketId,
            fileName: row.fileName,
            fileSize: row.fileSize,
            mimeType: row.mimeType,
            filePath: row.filePath,
            createdAt: row.createdAt,
        }));
    }
    // Response Template methods
    async getResponseTemplate(id) {
        const result = await db_drizzle_1.db.select().from(schema.responseTemplates).where((0, drizzle_orm_1.eq)(schema.responseTemplates.id, id));
        if (!result[0])
            return undefined;
        return {
            id: result[0].id,
            title: result[0].name, // Mapeando name para title
            content: result[0].content,
            category: result[0].category,
            isActive: result[0].isActive,
            createdAt: result[0].createdAt,
            updatedAt: result[0].updatedAt,
        };
    }
    async getAllResponseTemplates() {
        const result = await db_drizzle_1.db.select().from(schema.responseTemplates)
            .orderBy((0, drizzle_orm_1.desc)(schema.responseTemplates.createdAt));
        return result.map(row => ({
            id: row.id,
            title: row.name, // Mapeando name para title
            content: row.content,
            category: row.category,
            isActive: row.isActive,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        }));
    }
    async getResponseTemplatesByCategory(category) {
        const result = await db_drizzle_1.db.select().from(schema.responseTemplates)
            .where((0, drizzle_orm_1.eq)(schema.responseTemplates.category, category))
            .orderBy((0, drizzle_orm_1.desc)(schema.responseTemplates.createdAt));
        return result.map(row => ({
            id: row.id,
            title: row.name, // Mapeando name para title
            content: row.content,
            category: row.category,
            isActive: row.isActive,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        }));
    }
    async createResponseTemplate(template) {
        const result = await db_drizzle_1.db.insert(schema.responseTemplates).values({
            name: template.title, // Mapeando title para name
            category: template.category,
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
        };
    }
    // System Settings methods
    async getSystemSetting(key) {
        const result = await db_drizzle_1.db.select().from(schema.systemSettings)
            .where((0, drizzle_orm_1.eq)(schema.systemSettings.key, key));
        return result[0];
    }
    async getSystemSettingsByCategory(category) {
        const result = await db_drizzle_1.db.select().from(schema.systemSettings)
            .where((0, drizzle_orm_1.eq)(schema.systemSettings.category, category));
        return result;
    }
    async getAllSystemSettings() {
        const result = await db_drizzle_1.db.select().from(schema.systemSettings)
            .orderBy(schema.systemSettings.category, schema.systemSettings.key);
        return result;
    }
    async createSystemSetting(setting) {
        const result = await db_drizzle_1.db.insert(schema.systemSettings).values(setting).returning();
        return result[0];
    }
    async updateSystemSetting(key, value) {
        const result = await db_drizzle_1.db.update(schema.systemSettings)
            .set({
            value: value,
            updatedAt: new Date()
        })
            .where((0, drizzle_orm_1.eq)(schema.systemSettings.key, key))
            .returning();
        return result[0];
    }
    async upsertSystemSetting(setting) {
        try {
            // Try to update first
            const existing = await this.getSystemSetting(setting.key);
            if (existing) {
                const updated = await this.updateSystemSetting(setting.key, setting.value);
                return updated;
            }
            else {
                // Create new if doesn't exist
                return await this.createSystemSetting(setting);
            }
        }
        catch (error) {
            // If update fails, try create
            return await this.createSystemSetting(setting);
        }
    }
    async deleteSystemSetting(key) {
        const result = await db_drizzle_1.db.delete(schema.systemSettings)
            .where((0, drizzle_orm_1.eq)(schema.systemSettings.key, key))
            .returning();
        return result.length > 0;
    }
    async bulkUpdateSettings(settings, category) {
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
        }
        catch (error) {
            console.error('Error bulk updating settings:', error);
            return false;
        }
    }
}
exports.PostgresStorage = PostgresStorage;
