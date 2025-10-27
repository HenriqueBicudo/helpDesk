import { drizzle } from 'drizzle-orm/postgres-js';
import { and, gte, eq, sql, like } from 'drizzle-orm';
import postgres from 'postgres';
import { ticketInteractions } from '../../shared/drizzle-schema';

/**
 * Serviço de Notificação e Ações Automáticas
 * 
 * Responsável por criar interações automáticas nos tickets
 * quando eventos de SLA ocorrem (alertas e violações)
 */
export class NotificationService {
  private db: ReturnType<typeof drizzle>;
  
  // ID do usuário do sistema para interações automáticas
  private readonly SYSTEM_USER_ID = null; // Pode ser configurado para um usuário específico
  
  constructor() {
    // Inicializar conexão com banco usando variáveis de ambiente
    const connectionString = process.env.DATABASE_URL || 
      'postgresql://helpdesk_user:helpdesk_password@localhost:5432/helpdesk';
    
    const client = postgres(connectionString);
    this.db = drizzle(client);
  }

  /**
   * Cria uma interação de alerta de SLA no ticket
   * 
   * @param ticketId - ID do ticket
   * @param alertType - Tipo de alerta ('warning' ou 'breach')
   * @param customMessage - Mensagem personalizada (opcional)
   */
  public async createSlaAlertInteraction(
    ticketId: number, 
    alertType: 'warning' | 'breach',
    customMessage?: string
  ): Promise<void> {
    
    console.log(`📝 Criando interação de SLA para ticket ${ticketId} - Tipo: ${alertType}`);
    
    try {
      // Gerar mensagem padrão se não foi fornecida
      const message = customMessage || this.generateStandardMessage(alertType);
      
      // Criar a interação no banco de dados
      const interaction = await this.db
        .insert(ticketInteractions)
        .values({
          ticketId: ticketId,
          userId: this.SYSTEM_USER_ID, // Sistema automático
          type: 'internal_note', // Nota interna automática
          content: message,
          isInternal: true, // Visível apenas para a equipe
          createdAt: new Date()
        })
        .returning();
      
      console.log(`✅ Interação de SLA criada: ID ${interaction[0]?.id}`);
      
      // Log da ação para auditoria
      await this.logSlaEvent(ticketId, alertType, message);
      
    } catch (error) {
      console.error(`❌ Erro ao criar interação de SLA para ticket ${ticketId}:`, error);
      throw error;
    }
  }

  /**
   * Cria múltiplas interações em lote (otimização para muitos tickets)
   * 
   * @param notifications - Array de notificações a serem criadas
   */
  public async createBulkSlaInteractions(
    notifications: Array<{
      ticketId: number;
      alertType: 'warning' | 'breach';
      message: string;
    }>
  ): Promise<void> {
    
    if (notifications.length === 0) {
      return;
    }
    
    console.log(`📝 Criando ${notifications.length} interações de SLA em lote...`);
    
    try {
      // Preparar dados para inserção em lote
      const interactionsData = notifications.map(notification => ({
        ticketId: notification.ticketId,
        userId: this.SYSTEM_USER_ID,
        type: 'internal_note' as const,
        content: notification.message,
        isInternal: true,
        createdAt: new Date()
      }));
      
      // Inserção em lote para melhor performance
      const createdInteractions = await this.db
        .insert(ticketInteractions)
        .values(interactionsData)
        .returning();
      
      console.log(`✅ ${createdInteractions.length} interações de SLA criadas em lote`);
      
    } catch (error) {
      console.error('❌ Erro ao criar interações de SLA em lote:', error);
      throw error;
    }
  }

  /**
   * Cria uma notificação de escalação automática
   * 
   * @param ticketId - ID do ticket
   * @param reason - Motivo da escalação
   * @param previousPriority - Prioridade anterior
   * @param newPriority - Nova prioridade
   */
  public async createEscalationNotification(
    ticketId: number,
    reason: string,
    previousPriority?: string,
    newPriority?: string
  ): Promise<void> {
    
    console.log(`📈 Criando notificação de escalação para ticket ${ticketId}`);
    
    try {
      const escalationMessage = this.generateEscalationMessage(
        reason, 
        previousPriority, 
        newPriority
      );
      
      await this.db
        .insert(ticketInteractions)
        .values({
          ticketId: ticketId,
          userId: this.SYSTEM_USER_ID,
          type: 'internal_note',
          content: escalationMessage,
          isInternal: true,
          createdAt: new Date()
        });
      
      console.log(`✅ Notificação de escalação criada para ticket ${ticketId}`);
      
    } catch (error) {
      console.error(`❌ Erro ao criar notificação de escalação:`, error);
      throw error;
    }
  }

  /**
   * Gera mensagem padrão para alertas de SLA
   * 
   * @param alertType - Tipo de alerta
   * @returns Mensagem formatada
   */
  private generateStandardMessage(alertType: 'warning' | 'breach'): string {
    const timestamp = new Date().toLocaleString('pt-BR');
    
    switch (alertType) {
      case 'warning':
        return `🔔 **ALERTA DE SLA** | ${timestamp}
        
O prazo de SLA deste ticket está próximo do vencimento. 

⚠️ **Ação necessária**: Verifique o andamento e tome as medidas necessárias para cumprir o prazo acordado.

🤖 *Mensagem gerada automaticamente pelo sistema de monitoramento de SLA*`;

      case 'breach':
        return `🚨 **VIOLAÇÃO DE SLA** | ${timestamp}

**ATENÇÃO: O SLA deste ticket foi violado!**

❌ **Status**: Prazo ultrapassado
🎯 **Ação requerida**: Resolução URGENTE necessária
📊 **Impacto**: Possível impacto no acordo de nível de serviço

🤖 *Alerta automático do sistema de monitoramento de SLA*`;

      default:
        return `📋 **EVENTO DE SLA** | ${timestamp}

Um evento relacionado ao SLA foi detectado para este ticket.

🤖 *Notificação automática do sistema*`;
    }
  }

  /**
   * Gera mensagem de escalação automática
   * 
   * @param reason - Motivo da escalação
   * @param previousPriority - Prioridade anterior
   * @param newPriority - Nova prioridade
   * @returns Mensagem formatada
   */
  private generateEscalationMessage(
    reason: string,
    previousPriority?: string,
    newPriority?: string
  ): string {
    const timestamp = new Date().toLocaleString('pt-BR');
    
    let message = `📈 **ESCALAÇÃO AUTOMÁTICA** | ${timestamp}

🚨 **Motivo**: ${reason}`;

    if (previousPriority && newPriority) {
      message += `
🔄 **Prioridade alterada**: ${previousPriority.toUpperCase()} → ${newPriority.toUpperCase()}`;
    }

    message += `

⚡ **Ação imediata necessária**: Este ticket requer atenção urgente da equipe.

🤖 *Escalação automática do sistema de monitoramento de SLA*`;

    return message;
  }

  /**
   * Registra evento de SLA para auditoria e relatórios
   * 
   * @param ticketId - ID do ticket
   * @param eventType - Tipo de evento
   * @param message - Mensagem do evento
   */
  private async logSlaEvent(
    ticketId: number,
    eventType: 'warning' | 'breach',
    message: string
  ): Promise<void> {
    
    try {
      // Log estruturado para possível integração futura com sistema de métricas
      const logEntry = {
        timestamp: new Date().toISOString(),
        ticketId,
        eventType,
        service: 'SlaMonitorService',
        action: 'alert_created',
        details: {
          messageLength: message.length,
          automated: true
        }
      };
      
      // Log para console (pode ser integrado com sistema de logs mais avançado)
      console.log(`📊 [SLA_EVENT] ${JSON.stringify(logEntry)}`);
      
      // TODO: Integração futura com sistema de métricas (ex: Prometheus, DataDog)
      // await this.metricsService.recordSlaEvent(logEntry);
      
    } catch (error) {
      console.error('❌ Erro ao registrar evento de SLA:', error);
      // Não falha a operação principal se log falhar
    }
  }

  /**
   * Envia notificação por email (implementação futura)
   * 
   * @param ticketId - ID do ticket
   * @param recipients - Lista de emails
   * @param subject - Assunto do email
   * @param content - Conteúdo do email
   */
  public async sendEmailNotification(
    ticketId: number,
    recipients: string[],
    subject: string,
    content: string
  ): Promise<void> {
    
    console.log(`📧 [FUTURO] Email de SLA para ticket ${ticketId} seria enviado para:`, recipients);
    
    // TODO: Implementar integração com serviço de email
    // Possíveis integrações: SendGrid, AWS SES, Nodemailer
    /*
    try {
      await this.emailService.send({
        to: recipients,
        subject: `[HELPDESK] ${subject} - Ticket #${ticketId}`,
        html: content,
        metadata: {
          ticketId,
          type: 'sla_alert'
        }
      });
      
      console.log(`✅ Email de SLA enviado para ticket ${ticketId}`);
    } catch (error) {
      console.error(`❌ Erro ao enviar email de SLA:`, error);
    }
    */
  }

  /**
   * Verifica se uma interação de SLA já foi criada recentemente
   * (evita spam de notificações)
   * 
   * @param ticketId - ID do ticket
   * @param alertType - Tipo de alerta
   * @param timeWindowMinutes - Janela de tempo em minutos
   * @returns true se já existe interação recente
   */
  public async hasRecentSlaInteraction(
    ticketId: number,
    alertType: 'warning' | 'breach',
    timeWindowMinutes: number = 30
  ): Promise<boolean> {
    
    try {
      const timeAgo = new Date(Date.now() - timeWindowMinutes * 60 * 1000);
      
      const recentInteractions = await this.db
        .select()
        .from(ticketInteractions)
        .where(
          and(
            eq(ticketInteractions.ticketId, ticketId),
            eq(ticketInteractions.type, 'internal_note'),
            like(ticketInteractions.content, `%${alertType.toUpperCase()}%`),
            gte(ticketInteractions.createdAt, timeAgo)
          )
        )
        .limit(1);
      
      return recentInteractions.length > 0;
      
    } catch (error) {
      console.error('❌ Erro ao verificar interações recentes:', error);
      return false; // Em caso de erro, permite criar nova interação
    }
  }
}

export default NotificationService;
