import { eq } from 'drizzle-orm';
import { db } from '../db-postgres';
import { tickets } from '../../shared/drizzle-schema';
import { contracts } from '../../shared/schema/contracts';
import { calendars } from '../../shared/schema/calendars';
import { slaRules } from '../../shared/schema/sla_rules';
import { 
  addMinutes, 
  isWeekend, 
  isWithinInterval, 
  format,
  isSameDay,
  getHours,
  getMinutes,
  setHours,
  setMinutes,
  addDays,
  startOfDay
} from 'date-fns';

/**
 * Interface para os resultados do cálculo de SLA
 */
interface SlaDeadlines {
  responseDueAt: Date;
  solutionDueAt: Date;
}

/**
 * Interface para os dados completos do ticket com relacionamentos
 */
interface TicketWithSlaData {
  id: number;
  priority: string;
  createdAt: Date;
  contract?: {
    id: number;
    calendarId: number;
    calendar?: {
      id: number;
      name: string;
      workingHours: any; // JSON com horários de trabalho
      holidays: any; // JSON com feriados
    };
    slaRules?: Array<{
      id: number;
      priority: string;
      responseTimeMinutes: number;
      solutionTimeMinutes: number;
    }>;
  };
}

/**
 * Interface para horários de trabalho do calendário
 */
interface WorkingHours {
  monday?: { start: string; end: string };
  tuesday?: { start: string; end: string };
  wednesday?: { start: string; end: string };
  thursday?: { start: string; end: string };
  friday?: { start: string; end: string };
  saturday?: { start: string; end: string };
  sunday?: { start: string; end: string };
}

/**
 * Motor de SLA - Serviço responsável por calcular prazos de resposta e solução
 * baseado nas regras de SLA do contrato e calendário de atendimento
 */
export class SlaEngineService {
  
  /**
   * Método principal para calcular os prazos de SLA de um ticket
   * 
   * @param ticketId - ID do ticket para calcular os prazos
   * @returns Promise<SlaDeadlines | null> - Prazos calculados ou null se não aplicável
   */
  public async calculateDeadlines(ticketId: number): Promise<SlaDeadlines | null> {
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
      const slaRule = this.findSlaRuleByPriority(ticketData.priority, ticketData.contract!.slaRules!);
      
      if (!slaRule) {
        console.log(`❌ Regra de SLA não encontrada para prioridade "${ticketData.priority}" no contrato ${ticketData.contract!.id}`);
        return null;
      }
      
      console.log(`📋 Aplicando regra SLA: ${slaRule.responseTimeMinutes}min resposta, ${slaRule.solutionTimeMinutes}min solução`);
      
      // Passo D: Calcular os prazos usando o calendário de atendimento
      const calendar = ticketData.contract!.calendar!;
      const startDate = ticketData.createdAt;
      
      const responseDueAt = await this.calculateBusinessTimeDueDate(
        startDate,
        slaRule.responseTimeMinutes,
        calendar
      );
      
      const solutionDueAt = await this.calculateBusinessTimeDueDate(
        startDate,
        slaRule.solutionTimeMinutes,
        calendar
      );
      
      console.log(`✅ SLA calculado para ticket ${ticketId}:`);
      console.log(`   📞 Resposta até: ${format(responseDueAt, 'dd/MM/yyyy HH:mm')}`);
      console.log(`   🔧 Solução até: ${format(solutionDueAt, 'dd/MM/yyyy HH:mm')}`);
      
      // Passo E: Retornar os prazos calculados
      return {
        responseDueAt,
        solutionDueAt
      };
      
    } catch (error) {
      console.error(`❌ Erro ao calcular SLA para ticket ${ticketId}:`, error);
      throw new Error(`Falha no cálculo de SLA: ${(error as Error).message}`);
    }
  }
  
  /**
   * Busca os dados completos do ticket com todas as relações necessárias para SLA
   * 
   * @param ticketId - ID do ticket
   * @returns Promise<TicketWithSlaData | null> - Dados do ticket ou null se não encontrado
   */
  private async fetchTicketWithSlaData(ticketId: number): Promise<TicketWithSlaData | null> {
    // Buscar ticket básico
    const ticketResult = await db
      .select({
        id: tickets.id,
        priority: tickets.priority,
        createdAt: tickets.createdAt,
        contractId: tickets.contractId
      })
      .from(tickets)
      .where(eq(tickets.id, ticketId))
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
    const contractResult = await db
      .select({
        id: contracts.id,
        calendarId: contracts.calendarId
      })
      .from(contracts)
      .where(eq(contracts.id, ticket.contractId))
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
    const calendarResult = await db
      .select({
        id: calendars.id,
        name: calendars.name,
        workingHours: calendars.workingHours,
        holidays: calendars.holidays
      })
      .from(calendars)
      .where(eq(calendars.id, contract.calendarId))
      .limit(1);
    
    // Buscar regras de SLA do contrato
    const slaRulesResult = await db
      .select({
        id: slaRules.id,
        priority: slaRules.priority,
        responseTimeMinutes: slaRules.responseTimeMinutes,
        solutionTimeMinutes: slaRules.solutionTimeMinutes
      })
      .from(slaRules)
      .where(eq(slaRules.contractId, ticket.contractId));
    
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
  private validateSlaData(ticketData: TicketWithSlaData): boolean {
    return !!(
      ticketData.contract &&
      ticketData.contract.calendar &&
      ticketData.contract.slaRules &&
      ticketData.contract.slaRules.length > 0
    );
  }
  
  /**
   * Encontra a regra de SLA correspondente à prioridade do ticket
   * 
   * @param priority - Prioridade do ticket
   * @param slaRules - Array de regras de SLA do contrato
   * @returns Regra de SLA ou undefined se não encontrada
   */
  private findSlaRuleByPriority(
    priority: string, 
    slaRules: Array<{ priority: string; responseTimeMinutes: number; solutionTimeMinutes: number }>
  ) {
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
  private async calculateBusinessTimeDueDate(
    startDate: Date,
    minutesToAdd: number,
    calendar: { workingHours: any; holidays: any }
  ): Promise<Date> {
    
    if (minutesToAdd <= 0) {
      return startDate;
    }
    
    console.log(`⏱️ Calculando ${minutesToAdd} minutos úteis a partir de ${format(startDate, 'dd/MM/yyyy HH:mm')}`);
    
    // Parse dos horários de trabalho e feriados
    const workingHours: WorkingHours = calendar.workingHours || {};
    const holidays: string[] = Array.isArray(calendar.holidays) ? calendar.holidays : [];
    
    let currentDate = new Date(startDate);
    let remainingMinutes = minutesToAdd;
    let iterationCount = 0;
    const maxIterations = minutesToAdd * 10; // Proteção contra loop infinito
    
    // Mapear dias da semana para o formato date-fns
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    
    while (remainingMinutes > 0 && iterationCount < maxIterations) {
      iterationCount++;
      
      // Verificar se é fim de semana
      if (isWeekend(currentDate)) {
        console.log(`📅 Pulando fim de semana: ${format(currentDate, 'dd/MM/yyyy (EEEE)')}`);
        currentDate = this.skipToNextBusinessDay(currentDate);
        continue;
      }
      
      // Verificar se é feriado
      const dateString = format(currentDate, 'yyyy-MM-dd');
      if (holidays.includes(dateString)) {
        console.log(`🎄 Pulando feriado: ${format(currentDate, 'dd/MM/yyyy')}`);
        currentDate = addDays(currentDate, 1);
        currentDate = setHours(setMinutes(currentDate, 0), 0); // Início do próximo dia
        continue;
      }
      
      // Obter horário de trabalho do dia atual
      const dayName = dayNames[currentDate.getDay()] as keyof WorkingHours;
      const todayWorkingHours = workingHours[dayName];
      
      if (!todayWorkingHours) {
        console.log(`📅 Sem horário de trabalho para ${dayName}: ${format(currentDate, 'dd/MM/yyyy')}`);
        currentDate = addDays(currentDate, 1);
        currentDate = setHours(setMinutes(currentDate, 0), 0); // Início do próximo dia
        continue;
      }
      
      // Parse dos horários (formato "HH:mm")
      const [startHour, startMinute] = todayWorkingHours.start.split(':').map(Number);
      const [endHour, endMinute] = todayWorkingHours.end.split(':').map(Number);
      
      const workStart = setMinutes(setHours(startOfDay(currentDate), startHour), startMinute);
      const workEnd = setMinutes(setHours(startOfDay(currentDate), endHour), endMinute);
      
      // Se ainda não chegou no horário de trabalho, avançar para o início
      if (currentDate < workStart) {
        currentDate = new Date(workStart);
        console.log(`⏰ Avançando para início do expediente: ${format(currentDate, 'HH:mm')}`);
        continue;
      }
      
      // Se passou do horário de trabalho, ir para o próximo dia
      if (currentDate >= workEnd) {
        currentDate = addDays(currentDate, 1);
        currentDate = setHours(setMinutes(currentDate, 0), 0); // Início do próximo dia
        console.log(`🌅 Fim do expediente, indo para próximo dia: ${format(currentDate, 'dd/MM/yyyy')}`);
        continue;
      }
      
      // Estamos em horário comercial válido - decrementar contador
      remainingMinutes--;
      
      if (remainingMinutes > 0) {
        currentDate = addMinutes(currentDate, 1);
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
  private skipToNextBusinessDay(date: Date): Date {
    let nextDay = addDays(date, 1);
    
    // Se for domingo (0), avançar para segunda (1)
    // Se for sábado (6), avançar para segunda (2 dias)
    while (isWeekend(nextDay)) {
      nextDay = addDays(nextDay, 1);
    }
    
    // Retornar no início do dia
    return setHours(setMinutes(nextDay, 0), 0);
  }
  
  /**
   * Atualiza os prazos de SLA de um ticket no banco de dados
   * 
   * @param ticketId - ID do ticket
   * @param deadlines - Prazos calculados
   * @returns Promise<boolean> - true se atualizado com sucesso
   */
  public async updateTicketDeadlines(ticketId: number, deadlines: SlaDeadlines): Promise<boolean> {
    try {
      const result = await db
        .update(tickets)
        .set({
          responseDueAt: deadlines.responseDueAt,
          solutionDueAt: deadlines.solutionDueAt,
          updatedAt: new Date()
        })
        .where(eq(tickets.id, ticketId))
        .returning({ id: tickets.id });
      
      if (result.length > 0) {
        console.log(`✅ Prazos SLA atualizados para ticket ${ticketId}`);
        return true;
      }
      
      console.error(`❌ Falha ao atualizar prazos SLA para ticket ${ticketId}`);
      return false;
      
    } catch (error) {
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
  public async calculateAndApplyDeadlines(ticketId: number): Promise<SlaDeadlines | null> {
    const deadlines = await this.calculateDeadlines(ticketId);
    
    if (deadlines) {
      await this.updateTicketDeadlines(ticketId, deadlines);
    }
    
    return deadlines;
  }
}

/**
 * Instância singleton do serviço SLA Engine
 */
export const slaEngineService = new SlaEngineService();
