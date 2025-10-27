import { drizzle } from 'drizzle-orm/postgres-js';
import { and, lte, notInArray, isNotNull, or, sql } from 'drizzle-orm';
import postgres from 'postgres';
import { tickets } from '../../shared/drizzle-schema';
import { NotificationService } from './notification.service';
import { addHours, isBefore, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Serviço de Monitoramento de SLA
 * 
 * Responsável por verificar continuamente os prazos de SLA dos tickets
 * e tomar ações proativas quando necessário
 */
export class SlaMonitorService {
  private db: ReturnType<typeof drizzle>;
  private notificationService: NotificationService;
  
  // Configurações de tempo para alertas
  private readonly WARNING_TIME_HOURS = 2; // Alerta 2 horas antes do vencimento
  private readonly BREACH_ESCALATION_ENABLED = true; // Habilita escalação automática
  
  constructor() {
    // Inicializar conexão com banco usando variáveis de ambiente
    const connectionString = process.env.DATABASE_URL || 
      'postgresql://helpdesk_user:helpdesk_password@localhost:5432/helpdesk';
    
    const client = postgres(connectionString);
    this.db = drizzle(client);
    this.notificationService = new NotificationService();
  }

  /**
   * Método principal para verificação de SLA e execução de ações
   * 
   * Este método é executado pelo cron job a cada 5 minutos
   * e verifica todos os tickets que estão próximos do vencimento
   * ou que já violaram seus SLAs
   */
  public async checkSlaAndTakeAction(): Promise<void> {
    const startTime = new Date();
    console.log(`🔍 [${startTime.toLocaleString('pt-BR')}] Iniciando verificação de SLA...`);
    
    try {
      // Passo A: Definição dos Limites de Tempo
      const now = new Date();
      const warningTime = addHours(now, this.WARNING_TIME_HOURS);
      
      console.log(`⏰ Verificando tickets com vencimento até: ${warningTime.toLocaleString('pt-BR')}`);
      
      // Passo B: Query Otimizada de Tickets em Risco
      const ticketsAtRisk = await this.getTicketsAtRisk(now, warningTime);
      
      if (ticketsAtRisk.length === 0) {
        console.log(`✅ Nenhum ticket em risco de SLA encontrado`);
        return;
      }
      
      console.log(`🚨 ${ticketsAtRisk.length} tickets encontrados em risco de SLA`);
      
      // Passo C: Processamento dos Resultados
      let warningCount = 0;
      let breachCount = 0;
      
      for (const ticket of ticketsAtRisk) {
        try {
          const slaStatus = this.determineSlaStatus(ticket, now);
          console.log(`📋 Ticket ${ticket.id} (${ticket.subject}) - Status: ${slaStatus.type}`);
          
          // Passo D: Execução da Ação
          await this.executeSlaAction(ticket, slaStatus);
          
          if (slaStatus.type === 'warning') {
            warningCount++;
          } else if (slaStatus.type === 'breach') {
            breachCount++;
          }
          
        } catch (error) {
          console.error(`❌ Erro ao processar ticket ${ticket.id}:`, error);
          // Continua processando outros tickets mesmo se um falhar
        }
      }
      
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      
      console.log(`✅ Verificação de SLA concluída em ${duration}ms`);
      console.log(`📊 Resumo: ${warningCount} alertas, ${breachCount} violações processadas`);
      
    } catch (error) {
      console.error('❌ Erro crítico na verificação de SLA:', error);
      // Log do erro mas não interrompe o serviço
    }
  }

  /**
   * Busca tickets que estão em risco de violação de SLA
   * 
   * @param now - Data/hora atual
   * @param warningTime - Data/hora limite para alertas
   * @returns Array de tickets em risco
   */
  private async getTicketsAtRisk(now: Date, warningTime: Date) {
    console.log(`🔎 Executando query para buscar tickets em risco...`);
    
    return await this.db
      .select({
        id: tickets.id,
        subject: tickets.subject,
        status: tickets.status,
        priority: tickets.priority,
        responseDueAt: tickets.responseDueAt,
        solutionDueAt: tickets.solutionDueAt,
        assigneeId: tickets.assigneeId,
        requesterId: tickets.requesterId,
        contractId: tickets.contractId,
        createdAt: tickets.createdAt
      })
      .from(tickets)
      .where(
        and(
          // Status não resolvido
          notInArray(tickets.status, ['resolved', 'closed']),
          
          // Tem prazo de solução definido
          isNotNull(tickets.solutionDueAt),
          
          // Está próximo do vencimento OU já vencido
          or(
            // Já violado (prazo < agora)
            sql`${tickets.solutionDueAt} <= ${now.toISOString()}`,
            
            // Em zona de alerta (prazo <= agora + 2 horas)
            sql`${tickets.solutionDueAt} <= ${warningTime.toISOString()}`
          )
        )
      )
      .orderBy(tickets.solutionDueAt); // Ordenar por urgência
  }

  /**
   * Determina o status do SLA para um ticket específico
   * 
   * @param ticket - Ticket a ser analisado
   * @param now - Data/hora atual
   * @returns Status do SLA (warning, breach, response_breach)
   */
  private determineSlaStatus(ticket: any, now: Date): SlaStatus {
    const solutionDue = ticket.solutionDueAt;
    const responseDue = ticket.responseDueAt;
    
    // Verificar violação de prazo de solução
    if (solutionDue && isBefore(solutionDue, now)) {
      return {
        type: 'breach',
        dueType: 'solution',
        message: `SLA de SOLUÇÃO violado. Prazo era ${solutionDue.toLocaleString('pt-BR')}`,
        overdue: formatDistanceToNow(solutionDue, { locale: ptBR })
      };
    }
    
    // Verificar violação de prazo de resposta
    if (responseDue && isBefore(responseDue, now)) {
      return {
        type: 'breach',
        dueType: 'response',
        message: `SLA de RESPOSTA violado. Prazo era ${responseDue.toLocaleString('pt-BR')}`,
        overdue: formatDistanceToNow(responseDue, { locale: ptBR })
      };
    }
    
    // Verificar alerta de solução próxima
    if (solutionDue) {
      const timeToSolution = formatDistanceToNow(solutionDue, { locale: ptBR });
      return {
        type: 'warning',
        dueType: 'solution', 
        message: `SLA de SOLUÇÃO vence em ${timeToSolution} (${solutionDue.toLocaleString('pt-BR')})`,
        timeLeft: timeToSolution
      };
    }
    
    // Verificar alerta de resposta próxima
    if (responseDue) {
      const timeToResponse = formatDistanceToNow(responseDue, { locale: ptBR });
      return {
        type: 'warning',
        dueType: 'response',
        message: `SLA de RESPOSTA vence em ${timeToResponse} (${responseDue.toLocaleString('pt-BR')})`,
        timeLeft: timeToResponse
      };
    }
    
    // Fallback (não deveria acontecer)
    return {
      type: 'warning',
      dueType: 'unknown',
      message: 'Status de SLA indeterminado'
    };
  }

  /**
   * Executa a ação apropriada baseada no status do SLA
   * 
   * @param ticket - Ticket a ser processado
   * @param slaStatus - Status do SLA determinado
   */
  private async executeSlaAction(ticket: any, slaStatus: SlaStatus): Promise<void> {
    console.log(`🎯 Executando ação para ticket ${ticket.id}: ${slaStatus.type}`);
    
    try {
      // Criar interação de alerta/violação
      await this.notificationService.createSlaAlertInteraction(
        ticket.id,
        slaStatus.type,
        slaStatus.message
      );
      
      // Se é violação e escalação está habilitada
      if (slaStatus.type === 'breach' && this.BREACH_ESCALATION_ENABLED) {
        await this.escalateTicket(ticket, slaStatus);
      }
      
      console.log(`✅ Ação executada com sucesso para ticket ${ticket.id}`);
      
    } catch (error) {
      console.error(`❌ Erro ao executar ação para ticket ${ticket.id}:`, error);
      throw error;
    }
  }

  /**
   * Escalação automática de ticket quando SLA é violado
   * 
   * @param ticket - Ticket a ser escalado
   * @param slaStatus - Status da violação
   */
  private async escalateTicket(ticket: any, slaStatus: SlaStatus): Promise<void> {
    console.log(`📈 Escalando ticket ${ticket.id} devido à violação de SLA`);
    
    try {
      const updates: any = {};
      
      // Aumentar prioridade se não for crítica
      if (ticket.priority !== 'critical') {
        updates.priority = 'critical';
        console.log(`⚡ Prioridade do ticket ${ticket.id} alterada para CRÍTICA`);
      }
      
      // Marcar data de atualização
      updates.updatedAt = new Date();
      
      // Atualizar ticket no banco
      if (Object.keys(updates).length > 0) {
        await this.db
          .update(tickets)
          .set(updates)
          .where(sql`${tickets.id} = ${ticket.id}`);
      }
      
      // Criar interação de escalação
      await this.notificationService.createSlaAlertInteraction(
        ticket.id,
        'breach',
        `🚨 ESCALAÇÃO AUTOMÁTICA: Ticket escalado para prioridade CRÍTICA devido à violação de SLA de ${slaStatus.dueType}. Ação imediata necessária!`
      );
      
      console.log(`✅ Ticket ${ticket.id} escalado com sucesso`);
      
    } catch (error) {
      console.error(`❌ Erro ao escalar ticket ${ticket.id}:`, error);
      throw error;
    }
  }

  /**
   * Método para verificação manual de SLA (útil para testes)
   */
  public async manualSlaCheck(): Promise<void> {
    console.log('🧪 Executando verificação manual de SLA...');
    await this.checkSlaAndTakeAction();
  }

  /**
   * Estatísticas de SLA para monitoramento
   */
  public async getSlaStats(): Promise<SlaStats> {
    try {
      const now = new Date();
      const warningTime = addHours(now, this.WARNING_TIME_HOURS);
      
      // Contar tickets em diferentes estados de SLA
      const stats = await this.db
        .select({
          total: sql<number>`count(*)`,
          withSla: sql<number>`count(${tickets.solutionDueAt})`,
          atRisk: sql<number>`count(case when ${tickets.solutionDueAt} <= ${warningTime.toISOString()} and ${tickets.status} not in ('resolved', 'closed') then 1 end)`,
          breached: sql<number>`count(case when ${tickets.solutionDueAt} <= ${now.toISOString()} and ${tickets.status} not in ('resolved', 'closed') then 1 end)`
        })
        .from(tickets);
      
      return stats[0] as SlaStats;
      
    } catch (error) {
      console.error('❌ Erro ao obter estatísticas de SLA:', error);
      return { total: 0, withSla: 0, atRisk: 0, breached: 0 };
    }
  }
}

/**
 * Interfaces de tipo para o serviço
 */
interface SlaStatus {
  type: 'warning' | 'breach';
  dueType: 'response' | 'solution' | 'unknown';
  message: string;
  overdue?: string;
  timeLeft?: string;
}

interface SlaStats {
  total: number;
  withSla: number;
  atRisk: number;
  breached: number;
}

export default SlaMonitorService;
