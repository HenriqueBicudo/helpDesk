"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.slaEngineService = exports.SlaEngineService = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_drizzle_1 = require("../db-drizzle");
const drizzle_schema_1 = require("../../shared/drizzle-schema");
const contracts_1 = require("../../shared/schema/contracts");
const calendars_1 = require("../../shared/schema/calendars");
const sla_rules_1 = require("../../shared/schema/sla_rules");
const date_fns_1 = require("date-fns");
/**
 * Motor de SLA - Serviço responsável por calcular prazos de resposta e solução
 * baseado nas regras de SLA do contrato e calendário de atendimento
 */
class SlaEngineService {
    /**
     * Método principal para calcular os prazos de SLA de um ticket
     *
     * @param ticketId - ID do ticket para calcular os prazos
     * @returns Promise<SlaDeadlines | null> - Prazos calculados ou null se não aplicável
     */
    async calculateDeadlines(ticketId) {
        try {
            console.log(`🎯 Iniciando cálculo de SLA para ticket ${ticketId}`);
            // Passo A: Buscar dados completos do ticket com relacionamentos
            const ticketData = await this.fetchTicketWithSlaData(ticketId);
            if (!ticketData) {
                console.log(`❌ Ticket ${ticketId} não encontrado`);
                return null;
            }
            // Passo B: Validação de dados necessários
            if (!this.validateSlaData(ticketData)) {
                console.log(`⚠️ Ticket ${ticketId} não possui dados suficientes para cálculo de SLA`);
                return null;
            }
            // Passo C: Encontrar a regra de SLA correspondente à prioridade
            const slaRule = this.findSlaRuleByPriority(ticketData.priority, ticketData.contract.slaRules);
            if (!slaRule) {
                console.log(`❌ Regra de SLA não encontrada para prioridade "${ticketData.priority}" no contrato ${ticketData.contract.id}`);
                return null;
            }
            console.log(`📋 Aplicando regra SLA: ${slaRule.responseTimeMinutes}min resposta, ${slaRule.solutionTimeMinutes}min solução`);
            // Passo D: Calcular os prazos usando o calendário de atendimento
            const calendar = ticketData.contract.calendar;
            const startDate = ticketData.createdAt;
            const responseDueAt = await this.calculateBusinessTimeDueDate(startDate, slaRule.responseTimeMinutes, calendar);
            const solutionDueAt = await this.calculateBusinessTimeDueDate(startDate, slaRule.solutionTimeMinutes, calendar);
            console.log(`✅ SLA calculado para ticket ${ticketId}:`);
            console.log(`   📞 Resposta até: ${(0, date_fns_1.format)(responseDueAt, 'dd/MM/yyyy HH:mm')}`);
            console.log(`   🔧 Solução até: ${(0, date_fns_1.format)(solutionDueAt, 'dd/MM/yyyy HH:mm')}`);
            // Passo E: Retornar os prazos calculados
            return {
                responseDueAt,
                solutionDueAt
            };
        }
        catch (error) {
            console.error(`❌ Erro ao calcular SLA para ticket ${ticketId}:`, error);
            throw new Error(`Falha no cálculo de SLA: ${error.message}`);
        }
    }
    /**
     * Busca os dados completos do ticket com todas as relações necessárias para SLA
     *
     * @param ticketId - ID do ticket
     * @returns Promise<TicketWithSlaData | null> - Dados do ticket ou null se não encontrado
     */
    async fetchTicketWithSlaData(ticketId) {
        // Buscar ticket básico
        const ticketResult = await db_drizzle_1.db
            .select({
            id: drizzle_schema_1.tickets.id,
            priority: drizzle_schema_1.tickets.priority,
            createdAt: drizzle_schema_1.tickets.createdAt,
            contractId: drizzle_schema_1.tickets.contractId
        })
            .from(drizzle_schema_1.tickets)
            .where((0, drizzle_orm_1.eq)(drizzle_schema_1.tickets.id, ticketId))
            .limit(1);
        if (ticketResult.length === 0) {
            return null;
        }
        const ticket = ticketResult[0];
        // Se não tem contrato, retorna dados básicos
        if (!ticket.contractId) {
            return {
                id: ticket.id,
                priority: ticket.priority,
                createdAt: ticket.createdAt
            };
        }
        // Buscar contrato com calendário
        const contractResult = await db_drizzle_1.db
            .select({
            id: contracts_1.contracts.id,
            calendarId: contracts_1.contracts.calendarId
        })
            .from(contracts_1.contracts)
            .where((0, drizzle_orm_1.eq)(contracts_1.contracts.id, ticket.contractId))
            .limit(1);
        if (contractResult.length === 0) {
            return {
                id: ticket.id,
                priority: ticket.priority,
                createdAt: ticket.createdAt
            };
        }
        const contract = contractResult[0];
        // Buscar calendário
        const calendarResult = await db_drizzle_1.db
            .select({
            id: calendars_1.calendars.id,
            name: calendars_1.calendars.name,
            workingHours: calendars_1.calendars.workingHours,
            holidays: calendars_1.calendars.holidays
        })
            .from(calendars_1.calendars)
            .where((0, drizzle_orm_1.eq)(calendars_1.calendars.id, contract.calendarId))
            .limit(1);
        // Buscar regras de SLA do contrato
        const slaRulesResult = await db_drizzle_1.db
            .select({
            id: sla_rules_1.slaRules.id,
            priority: sla_rules_1.slaRules.priority,
            responseTimeMinutes: sla_rules_1.slaRules.responseTimeMinutes,
            solutionTimeMinutes: sla_rules_1.slaRules.solutionTimeMinutes
        })
            .from(sla_rules_1.slaRules)
            .where((0, drizzle_orm_1.eq)(sla_rules_1.slaRules.contractId, ticket.contractId));
        return {
            id: ticket.id,
            priority: ticket.priority,
            createdAt: ticket.createdAt,
            contract: {
                id: contract.id,
                calendarId: contract.calendarId,
                calendar: calendarResult.length > 0 ? calendarResult[0] : undefined,
                slaRules: slaRulesResult
            }
        };
    }
    /**
     * Valida se os dados necessários para cálculo de SLA estão presentes
     *
     * @param ticketData - Dados do ticket
     * @returns boolean - true se válido, false caso contrário
     */
    validateSlaData(ticketData) {
        return !!(ticketData.contract &&
            ticketData.contract.calendar &&
            ticketData.contract.slaRules &&
            ticketData.contract.slaRules.length > 0);
    }
    /**
     * Encontra a regra de SLA correspondente à prioridade do ticket
     *
     * @param priority - Prioridade do ticket
     * @param slaRules - Array de regras de SLA do contrato
     * @returns Regra de SLA ou undefined se não encontrada
     */
    findSlaRuleByPriority(priority, slaRules) {
        return slaRules.find(rule => rule.priority === priority);
    }
    /**
     * 🕐 FUNÇÃO PRINCIPAL DE CÁLCULO - Calcula data de vencimento considerando apenas horário comercial
     *
     * Esta é a função mais complexa do sistema. Ela:
     * 1. Itera minuto a minuto a partir da data inicial
     * 2. Decrementa o contador apenas em minutos úteis (horário comercial + não feriado)
     * 3. Pula fins de semana e feriados automaticamente
     * 4. Respeita rigorosamente os horários de trabalho do calendário
     *
     * @param startDate - Data e hora de início do cálculo
     * @param minutesToAdd - Minutos de SLA para adicionar (apenas tempo útil)
     * @param calendar - Dados do calendário com horários e feriados
     * @returns Promise<Date> - Data/hora de vencimento calculada
     */
    async calculateBusinessTimeDueDate(startDate, minutesToAdd, calendar) {
        if (minutesToAdd <= 0) {
            return startDate;
        }
        console.log(`⏱️ Calculando ${minutesToAdd} minutos úteis a partir de ${(0, date_fns_1.format)(startDate, 'dd/MM/yyyy HH:mm')}`);
        // Parse dos horários de trabalho e feriados
        const workingHours = calendar.workingHours || {};
        const holidays = Array.isArray(calendar.holidays) ? calendar.holidays : [];
        let currentDate = new Date(startDate);
        let remainingMinutes = minutesToAdd;
        let iterationCount = 0;
        const maxIterations = minutesToAdd * 10; // Proteção contra loop infinito
        // Mapear dias da semana para o formato date-fns
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        while (remainingMinutes > 0 && iterationCount < maxIterations) {
            iterationCount++;
            // Verificar se é fim de semana
            if ((0, date_fns_1.isWeekend)(currentDate)) {
                console.log(`📅 Pulando fim de semana: ${(0, date_fns_1.format)(currentDate, 'dd/MM/yyyy (EEEE)')}`);
                currentDate = this.skipToNextBusinessDay(currentDate);
                continue;
            }
            // Verificar se é feriado
            const dateString = (0, date_fns_1.format)(currentDate, 'yyyy-MM-dd');
            if (holidays.includes(dateString)) {
                console.log(`🎄 Pulando feriado: ${(0, date_fns_1.format)(currentDate, 'dd/MM/yyyy')}`);
                currentDate = (0, date_fns_1.addDays)(currentDate, 1);
                currentDate = (0, date_fns_1.setHours)((0, date_fns_1.setMinutes)(currentDate, 0), 0); // Início do próximo dia
                continue;
            }
            // Obter horário de trabalho do dia atual
            const dayName = dayNames[currentDate.getDay()];
            const todayWorkingHours = workingHours[dayName];
            if (!todayWorkingHours) {
                console.log(`📅 Sem horário de trabalho para ${dayName}: ${(0, date_fns_1.format)(currentDate, 'dd/MM/yyyy')}`);
                currentDate = (0, date_fns_1.addDays)(currentDate, 1);
                currentDate = (0, date_fns_1.setHours)((0, date_fns_1.setMinutes)(currentDate, 0), 0); // Início do próximo dia
                continue;
            }
            // Parse dos horários (formato "HH:mm")
            const [startHour, startMinute] = todayWorkingHours.start.split(':').map(Number);
            const [endHour, endMinute] = todayWorkingHours.end.split(':').map(Number);
            const workStart = (0, date_fns_1.setMinutes)((0, date_fns_1.setHours)((0, date_fns_1.startOfDay)(currentDate), startHour), startMinute);
            const workEnd = (0, date_fns_1.setMinutes)((0, date_fns_1.setHours)((0, date_fns_1.startOfDay)(currentDate), endHour), endMinute);
            // Se ainda não chegou no horário de trabalho, avançar para o início
            if (currentDate < workStart) {
                currentDate = new Date(workStart);
                console.log(`⏰ Avançando para início do expediente: ${(0, date_fns_1.format)(currentDate, 'HH:mm')}`);
                continue;
            }
            // Se passou do horário de trabalho, ir para o próximo dia
            if (currentDate >= workEnd) {
                currentDate = (0, date_fns_1.addDays)(currentDate, 1);
                currentDate = (0, date_fns_1.setHours)((0, date_fns_1.setMinutes)(currentDate, 0), 0); // Início do próximo dia
                console.log(`🌅 Fim do expediente, indo para próximo dia: ${(0, date_fns_1.format)(currentDate, 'dd/MM/yyyy')}`);
                continue;
            }
            // Estamos em horário comercial válido - decrementar contador
            remainingMinutes--;
            if (remainingMinutes > 0) {
                currentDate = (0, date_fns_1.addMinutes)(currentDate, 1);
            }
            // Log periódico para acompanhar progresso em cálculos longos
            if (iterationCount % 100 === 0) {
                console.log(`⏳ Progresso: ${minutesToAdd - remainingMinutes}/${minutesToAdd} minutos processados`);
            }
        }
        if (iterationCount >= maxIterations) {
            console.error(`⚠️ Limite de iterações atingido no cálculo de SLA`);
            throw new Error('Limite de iterações atingido no cálculo de tempo útil');
        }
        console.log(`✅ Cálculo concluído em ${iterationCount} iterações`);
        return currentDate;
    }
    /**
     * Avança para o próximo dia útil (segunda-feira se for fim de semana)
     *
     * @param date - Data atual
     * @returns Date - Próximo dia útil às 00:00
     */
    skipToNextBusinessDay(date) {
        let nextDay = (0, date_fns_1.addDays)(date, 1);
        // Se for domingo (0), avançar para segunda (1)
        // Se for sábado (6), avançar para segunda (2 dias)
        while ((0, date_fns_1.isWeekend)(nextDay)) {
            nextDay = (0, date_fns_1.addDays)(nextDay, 1);
        }
        // Retornar no início do dia
        return (0, date_fns_1.setHours)((0, date_fns_1.setMinutes)(nextDay, 0), 0);
    }
    /**
     * Atualiza os prazos de SLA de um ticket no banco de dados
     *
     * @param ticketId - ID do ticket
     * @param deadlines - Prazos calculados
     * @returns Promise<boolean> - true se atualizado com sucesso
     */
    async updateTicketDeadlines(ticketId, deadlines) {
        try {
            const result = await db_drizzle_1.db
                .update(drizzle_schema_1.tickets)
                .set({
                responseDueAt: deadlines.responseDueAt,
                solutionDueAt: deadlines.solutionDueAt,
                updatedAt: new Date()
            })
                .where((0, drizzle_orm_1.eq)(drizzle_schema_1.tickets.id, ticketId))
                .returning({ id: drizzle_schema_1.tickets.id });
            if (result.length > 0) {
                console.log(`✅ Prazos SLA atualizados para ticket ${ticketId}`);
                return true;
            }
            console.error(`❌ Falha ao atualizar prazos SLA para ticket ${ticketId}`);
            return false;
        }
        catch (error) {
            console.error(`❌ Erro ao atualizar prazos SLA:`, error);
            throw error;
        }
    }
    /**
     * Calcula e atualiza os prazos de SLA de um ticket em uma única operação
     *
     * @param ticketId - ID do ticket
     * @returns Promise<SlaDeadlines | null> - Prazos calculados e aplicados
     */
    async calculateAndApplyDeadlines(ticketId) {
        const deadlines = await this.calculateDeadlines(ticketId);
        if (deadlines) {
            await this.updateTicketDeadlines(ticketId, deadlines);
        }
        return deadlines;
    }
}
exports.SlaEngineService = SlaEngineService;
/**
 * Instância singleton do serviço SLA Engine
 */
exports.slaEngineService = new SlaEngineService();
