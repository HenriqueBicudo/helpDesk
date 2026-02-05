import * as cron from 'node-cron';
import { storage } from '../storage-interface';
import { client } from '../db-postgres';
import { automationService } from '../services/automation.service';

/**
 * Job de Automação Baseada em Tempo
 * 
 * Este job roda a cada 5 minutos para verificar tickets
 * que atendem aos critérios de tempo dos gatilhos configurados
 */
export class TimeBasedAutomationJob {
  private isRunning: boolean = false;
  private jobTask: cron.ScheduledTask | null = null;
  
  // Configurações do job
  private readonly CRON_SCHEDULE = '*/5 * * * *'; // A cada 5 minutos
  private readonly JOB_TIMEZONE = 'America/Sao_Paulo';

  /**
   * Inicia o job de automação baseada em tempo
   */
  public start(): void {
    if (this.jobTask) {
      console.log('⚠️  Job de automação baseada em tempo já está rodando');
      return;
    }

    console.log('🚀 Iniciando job de automação baseada em tempo...');
    console.log(`⏰ Agendamento: ${this.CRON_SCHEDULE} (a cada 5 minutos)`);
    console.log(`🌍 Timezone: ${this.JOB_TIMEZONE}`);
    
    // Criar e agendar a tarefa
    this.jobTask = cron.schedule(
      this.CRON_SCHEDULE,
      this.executeJob.bind(this),
      {
        timezone: this.JOB_TIMEZONE,
        name: 'time-based-automation'
      }
    );
    
    console.log('✅ Job de automação baseada em tempo iniciado com sucesso');
  }

  /**
   * Para o job
   */
  public stop(): void {
    if (this.jobTask) {
      this.jobTask.stop();
      this.jobTask = null;
      console.log('🛑 Job de automação baseada em tempo parado');
    }
  }

  /**
   * Executa a verificação de automação baseada em tempo
   */
  private async executeJob(): Promise<void> {
    if (this.isRunning) {
      console.log('⏭️  Pulando execução - job anterior ainda em andamento');
      return;
    }

    this.isRunning = true;
    const jobId = `TIME-AUTO-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    
    try {
      console.log(`\n🔄 [${jobId}] ======= INICIANDO VERIFICAÇÃO DE AUTOMAÇÃO BASEADA EM TEMPO =======`);
      console.log(`🕐 Timestamp: ${new Date().toLocaleString('pt-BR', { timeZone: this.JOB_TIMEZONE })}`);
      
      await this.processTimeBasedTriggers();
      
      console.log(`✅ [${jobId}] ======= VERIFICAÇÃO CONCLUÍDA =======\n`);
    } catch (error) {
      console.error(`❌ [${jobId}] Erro ao processar automação baseada em tempo:`, error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Processa gatilhos baseados em tempo
   */
  private async processTimeBasedTriggers(): Promise<void> {
    try {
      console.log('🔍 Buscando gatilhos ativos baseados em tempo...');
      
      // Buscar todos os gatilhos time_based ativos usando SQL direto
      const triggersResult = await client`
        SELECT * FROM automation_triggers 
        WHERE is_active = true AND trigger_type = 'time_based'
      `;

      if (triggersResult.length === 0) {
        console.log('ℹ️  Nenhum gatilho baseado em tempo ativo encontrado');
        return;
      }

      console.log(`✅ Encontrados ${triggersResult.length} gatilhos baseados em tempo`);

      // Buscar todos os tickets ativos (não fechados)
      const allTickets = await storage.getAllTickets();
      const activeTickets = allTickets.filter(t => 
        t.status !== 'closed' && t.status !== 'resolved'
      );

      console.log(`📋 Processando ${activeTickets.length} tickets ativos...`);

      let triggersExecuted = 0;

      // Para cada gatilho baseado em tempo
      for (const trigger of triggersResult) {
        try {
          const conditions = trigger.conditions as any;
          
          // Extrair condições de tempo
          if (!conditions.timeCondition) {
            console.log(`  ⚠️  Gatilho "${trigger.name}" não possui timeCondition, pulando...`);
            continue;
          }

          const { field, operator, value, unit } = conditions.timeCondition;
          
          console.log(`\n🔧 Processando gatilho: ${trigger.name}`);
          console.log(`   Condição: ${field} ${operator} ${value} ${unit}`);

          // Processar cada ticket
          for (const ticket of activeTickets) {
            const shouldExecute = await this.evaluateTimeCondition(
              ticket,
              field,
              operator,
              value,
              unit
            );

            if (shouldExecute) {
              console.log(`  ⏰ Ticket #${ticket.id} atende condição de tempo - executando ações...`);
              
              try {
                // Executar as ações do gatilho usando o automationService
                const actions = trigger.actions as Array<{ type: string; [key: string]: any }>;
                
                // Usar método público do automationService
                await automationService.executeActionsOnTicket(actions, ticket);
                
                triggersExecuted++;
                console.log(`    ✅ Ações executadas com sucesso no ticket #${ticket.id}`);
              } catch (actionError) {
                console.error(`    ❌ Erro ao executar ações no ticket #${ticket.id}:`, actionError);
              }
            }
          }
        } catch (error) {
          console.error(`  ❌ Erro ao processar gatilho "${trigger.name}":`, error);
        }
      }

      console.log(`\n📊 Resumo: ${triggersExecuted} execuções realizadas`);
    } catch (error) {
      console.error('❌ Erro ao processar gatilhos baseados em tempo:', error);
    }
  }

  /**
   * Avalia condição de tempo
   */
  private async evaluateTimeCondition(
    ticket: any,
    field: string,
    operator: string,
    value: number,
    unit: string
  ): Promise<boolean> {
    const now = new Date();
    let compareDate: Date | null = null;

    // Determinar a data de referência
    switch (field) {
      case 'created_at':
        compareDate = new Date(ticket.createdAt);
        break;
      case 'updated_at':
        compareDate = new Date(ticket.updatedAt);
        break;
      case 'response_due_at':
        if (ticket.responseDueAt) {
          compareDate = new Date(ticket.responseDueAt);
        }
        break;
      case 'solution_due_at':
        if (ticket.solutionDueAt) {
          compareDate = new Date(ticket.solutionDueAt);
        }
        break;
      default:
        return false;
    }

    if (!compareDate) {
      return false;
    }

    // Calcular a diferença em minutos
    const diffMs = now.getTime() - compareDate.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    // Converter valor para minutos baseado na unidade
    let thresholdMinutes = value;
    switch (unit) {
      case 'hours':
        thresholdMinutes = value * 60;
        break;
      case 'days':
        thresholdMinutes = value * 60 * 24;
        break;
      case 'minutes':
      default:
        thresholdMinutes = value;
    }

    // Avaliar operador
    switch (operator) {
      case 'greater_than':
        return diffMinutes > thresholdMinutes;
      case 'greater_or_equal':
        return diffMinutes >= thresholdMinutes;
      case 'less_than':
        return diffMinutes < thresholdMinutes;
      case 'less_or_equal':
        return diffMinutes <= thresholdMinutes;
      case 'equals':
        // Para equals, consideramos um intervalo de ±5 minutos
        return Math.abs(diffMinutes - thresholdMinutes) <= 5;
      default:
        return false;
    }
  }
}

// Exportar instância singleton
export const timeBasedAutomationJob = new TimeBasedAutomationJob();
