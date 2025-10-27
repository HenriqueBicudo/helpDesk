import * as cron from 'node-cron';
import { SlaMonitorService } from '../services/slaMonitor.service';

/**
 * Job de Monitoramento de SLA
 * 
 * Este job roda a cada 5 minutos para verificar tickets
 * que estão próximos de vencer ou já violaram seus SLAs
 */
export class SlaMonitorJob {
  private slaMonitorService: SlaMonitorService;
  private isRunning: boolean = false;
  private jobTask: cron.ScheduledTask | null = null;
  
  // Configurações do job
  private readonly CRON_SCHEDULE = '*/5 * * * *'; // A cada 5 minutos
  private readonly JOB_TIMEZONE = 'America/Sao_Paulo';
  
  constructor() {
    this.slaMonitorService = new SlaMonitorService();
  }

  /**
   * Inicia o job de monitoramento de SLA
   */
  public start(): void {
    if (this.jobTask) {
      console.log('⚠️  Job de monitoramento SLA já está rodando');
      return;
    }

    console.log('🚀 Iniciando job de monitoramento de SLA...');
    console.log(`⏰ Agendamento: ${this.CRON_SCHEDULE} (a cada 5 minutos)`);
    console.log(`🌍 Timezone: ${this.JOB_TIMEZONE}`);
    
    // Criar e agendar a tarefa
    this.jobTask = cron.schedule(
      this.CRON_SCHEDULE,
      this.executeJob.bind(this),
      {
        timezone: this.JOB_TIMEZONE,
        name: 'sla-monitor'
      }
    );
    
    console.log('✅ Job de monitoramento SLA iniciado com sucesso');
    
    // Executar uma verificação inicial (opcional)
    this.executeInitialCheck();
  }

  /**
   * Para o job de monitoramento
   */
  public stop(): void {
    if (this.jobTask) {
      this.jobTask.stop();
      this.jobTask = null;
      console.log('🛑 Job de monitoramento SLA parado');
    } else {
      console.log('ℹ️  Job de monitoramento SLA não estava rodando');
    }
  }

  /**
   * Função principal executada pelo cron
   */
  private async executeJob(): Promise<void> {
    // Evitar execuções sobrepostas
    if (this.isRunning) {
      console.log('⏭️  Pulando execução - job anterior ainda em andamento');
      return;
    }

    this.isRunning = true;
    const jobId = this.generateJobId();
    
    try {
      console.log(`\n🔄 [${jobId}] ======= INICIANDO VERIFICAÇÃO DE SLA =======`);
      console.log(`🕐 Timestamp: ${new Date().toLocaleString('pt-BR')}`);
      
      // Executar verificação de SLA
      await this.slaMonitorService.checkSlaAndTakeAction();
      
      // Obter estatísticas pós-execução
      const stats = await this.slaMonitorService.getSlaStats();
      this.logJobStats(jobId, stats);
      
      console.log(`✅ [${jobId}] ======= VERIFICAÇÃO CONCLUÍDA =======\n`);
      
    } catch (error) {
      console.error(`❌ [${jobId}] ERRO CRÍTICO no job de monitoramento SLA:`, error);
      
      // Log estruturado do erro para debugging
      console.error(`❌ [${jobId}] Detalhes do erro:`, {
        message: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
        jobId
      });
      
      // Não re-throw o erro para não quebrar o cron job
      
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Executa uma verificação inicial ao iniciar o servidor
   */
  private async executeInitialCheck(): Promise<void> {
    console.log('🔍 Executando verificação inicial de SLA...');
    
    try {
      // Aguarda um pouco para o servidor terminar de inicializar
      setTimeout(async () => {
        await this.executeJob();
      }, 5000); // 5 segundos
      
    } catch (error) {
      console.error('❌ Erro na verificação inicial de SLA:', error);
    }
  }

  /**
   * Gera ID único para cada execução do job
   */
  private generateJobId(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const random = Math.random().toString(36).substr(2, 4);
    return `SLA-${timestamp}-${random}`;
  }

  /**
   * Log das estatísticas pós-execução
   */
  private logJobStats(jobId: string, stats: any): void {
    console.log(`📊 [${jobId}] Estatísticas de SLA:`);
    console.log(`   📋 Total de tickets: ${stats.total}`);
    console.log(`   ⏰ Com SLA definido: ${stats.withSla}`);
    console.log(`   🔔 Em risco: ${stats.atRisk}`);
    console.log(`   🚨 Violados: ${stats.breached}`);
    
    // Calcular porcentagens se houver tickets com SLA
    if (stats.withSla > 0) {
      const riskPercentage = ((stats.atRisk / stats.withSla) * 100).toFixed(1);
      const breachPercentage = ((stats.breached / stats.withSla) * 100).toFixed(1);
      
      console.log(`   📈 Taxa de risco: ${riskPercentage}%`);
      console.log(`   📉 Taxa de violação: ${breachPercentage}%`);
    }
  }

  /**
   * Verifica se o job está rodando
   */
  public isJobRunning(): boolean {
    return this.jobTask !== null && this.isRunning;
  }

  /**
   * Obtém informações sobre o job
   */
  public getJobInfo(): JobInfo {
    return {
      isActive: this.jobTask !== null,
      isRunning: this.isRunning,
      schedule: this.CRON_SCHEDULE,
      timezone: this.JOB_TIMEZONE,
      nextRun: this.jobTask ? 'Próxima execução em ~5 minutos' : null
    };
  }

  /**
   * Execução manual para testes (não interfere com o cron)
   */
  public async runManual(): Promise<void> {
    console.log('🧪 Executando verificação manual de SLA...');
    
    try {
      await this.slaMonitorService.manualSlaCheck();
      console.log('✅ Verificação manual concluída');
      
    } catch (error) {
      console.error('❌ Erro na verificação manual:', error);
      throw error;
    }
  }

  /**
   * Restart do job (para reconfiguração em runtime)
   */
  public restart(): void {
    console.log('🔄 Reiniciando job de monitoramento SLA...');
    this.stop();
    
    // Aguarda um momento antes de reiniciar
    setTimeout(() => {
      this.start();
    }, 1000);
  }
}

/**
 * Interface para informações do job
 */
interface JobInfo {
  isActive: boolean;
  isRunning: boolean;
  schedule: string;
  timezone: string;
  nextRun: string | null;
}

// Instância singleton do job
let slaJobInstance: SlaMonitorJob | null = null;

/**
 * Função para obter/criar instância do job SLA
 */
export function getSlaMonitorJob(): SlaMonitorJob {
  if (!slaJobInstance) {
    slaJobInstance = new SlaMonitorJob();
  }
  return slaJobInstance;
}

/**
 * Função para iniciar o monitoramento automático
 * Chamada pelo servidor principal
 */
export function startSlaMonitoring(): void {
  const job = getSlaMonitorJob();
  job.start();
}

/**
 * Função para parar o monitoramento
 */
export function stopSlaMonitoring(): void {
  if (slaJobInstance) {
    slaJobInstance.stop();
  }
}

export default SlaMonitorJob;
