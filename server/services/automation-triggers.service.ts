import { db } from '../db-postgres';
import { automationTriggers, tickets, ticketInteractions, users } from '../../shared/drizzle-schema';
import { eq, and } from 'drizzle-orm';

interface TriggerContext {
  ticket: any;
  oldTicket?: any;
  triggerType: string;
  userId?: number;
}

/**
 * Serviço para executar gatilhos de automação
 */
export class AutomationTriggersService {
  /**
   * Executa gatilhos baseados em um evento
   */
  static async executeTriggers(context: TriggerContext): Promise<void> {
    try {
      // Buscar gatilhos ativos do tipo especificado
      const activeTriggers = await db
        .select()
        .from(automationTriggers)
        .where(
          and(
            eq(automationTriggers.isActive, true),
            eq(automationTriggers.triggerType, context.triggerType)
          )
        );

      console.log(`🔍 [Automation] Encontrados ${activeTriggers.length} gatilhos ativos para ${context.triggerType}`);

      // Executar cada gatilho
      for (const trigger of activeTriggers) {
        try {
          const shouldExecute = this.evaluateConditions(trigger.conditions as any, context);

          if (shouldExecute) {
            console.log(`✅ [Automation] Executando gatilho: ${trigger.name}`);
            await this.executeActions(trigger.actions as any, context);
          } else {
            console.log(`⏭️  [Automation] Gatilho ${trigger.name} não atendeu às condições`);
          }
        } catch (error) {
          console.error(`❌ [Automation] Erro ao executar gatilho ${trigger.name}:`, error);
        }
      }
    } catch (error) {
      console.error('❌ [Automation] Erro ao buscar gatilhos:', error);
    }
  }

  /**
   * Avalia se as condições do gatilho foram atendidas
   */
  private static evaluateConditions(
    conditions: Record<string, any>,
    context: TriggerContext
  ): boolean {
    const { ticket } = context;

    // Se não houver condições, sempre executa
    if (!conditions || Object.keys(conditions).length === 0) {
      return true;
    }

    // Avaliar cada condição
    for (const [key, value] of Object.entries(conditions)) {
      // Comparação simples: ticket[key] === value
      if (ticket[key] !== value) {
        // Se alguma condição falhar, não executa
        return false;
      }
    }

    // Todas as condições foram atendidas
    return true;
  }

  /**
   * Executa as ações definidas no gatilho
   */
  private static async executeActions(
    actions: Array<{ type: string; [key: string]: any }>,
    context: TriggerContext
  ): Promise<void> {
    const { ticket, userId } = context;

    for (const action of actions) {
      try {
        switch (action.type) {
          case 'add_comment':
            await this.addComment(ticket.id, action.content, action.isInternal || false, userId);
            break;

          case 'assign_to':
            await this.assignTicket(ticket.id, action.userId);
            break;

          case 'change_priority':
            await this.changePriority(ticket.id, action.priority);
            break;

          case 'change_status':
            await this.changeStatus(ticket.id, action.status);
            break;

          case 'add_tag':
            // TODO: Implementar quando houver relação ticket_tags
            console.log(`🏷️  [Automation] Adicionar tag: ${action.tag}`);
            break;

          case 'send_email':
            // TODO: Integrar com email-service
            console.log(`📧 [Automation] Enviar email para: ${action.to}`);
            break;

          default:
            console.warn(`⚠️  [Automation] Ação desconhecida: ${action.type}`);
        }
      } catch (error) {
        console.error(`❌ [Automation] Erro ao executar ação ${action.type}:`, error);
      }
    }
  }

  /**
   * Adiciona um comentário ao ticket
   */
  private static async addComment(
    ticketId: number,
    content: string,
    isInternal: boolean,
    userId?: number
  ): Promise<void> {
    const systemUserId = userId || 1; // User ID do sistema/admin

    await db.insert(ticketInteractions).values({
      ticketId,
      type: 'note',
      content,
      isInternal,
      userId: systemUserId,
      createdAt: new Date(),
    });

    console.log(`💬 [Automation] Comentário adicionado ao ticket #${ticketId}`);
  }

  /**
   * Atribui o ticket a um usuário
   */
  private static async assignTicket(ticketId: number, assigneeId: number): Promise<void> {
    await db
      .update(tickets)
      .set({ assigneeId })
      .where(eq(tickets.id, ticketId));

    console.log(`👤 [Automation] Ticket #${ticketId} atribuído ao usuário ${assigneeId}`);
  }

  /**
   * Altera a prioridade do ticket
   */
  private static async changePriority(ticketId: number, priority: string): Promise<void> {
    await db
      .update(tickets)
      .set({ priority: priority as any }) // Cast para aceitar string
      .where(eq(tickets.id, ticketId));

    console.log(`🔥 [Automation] Prioridade do ticket #${ticketId} alterada para ${priority}`);
  }

  /**
   * Altera o status do ticket
   */
  private static async changeStatus(ticketId: number, status: string): Promise<void> {
    await db
      .update(tickets)
      .set({ status: status as any }) // Cast para aceitar string
      .where(eq(tickets.id, ticketId));

    console.log(`📊 [Automation] Status do ticket #${ticketId} alterado para ${status}`);
  }

  /**
   * Executa gatilhos quando um ticket é criado
   */
  static async onTicketCreated(ticket: any, userId?: number): Promise<void> {
    await this.executeTriggers({
      ticket,
      triggerType: 'ticket_created',
      userId,
    });
  }

  /**
   * Executa gatilhos quando um ticket é atualizado
   */
  static async onTicketUpdated(newTicket: any, oldTicket: any, userId?: number): Promise<void> {
    // Verificar se status mudou
    if (newTicket.status !== oldTicket.status) {
      await this.executeTriggers({
        ticket: newTicket,
        oldTicket,
        triggerType: 'status_changed',
        userId,
      });
    }

    // Verificar se prioridade mudou
    if (newTicket.priority !== oldTicket.priority) {
      await this.executeTriggers({
        ticket: newTicket,
        oldTicket,
        triggerType: 'priority_changed',
        userId,
      });
    }

    // Verificar se foi atribuído
    if (newTicket.assigneeId !== oldTicket.assigneeId && newTicket.assigneeId) {
      await this.executeTriggers({
        ticket: newTicket,
        oldTicket,
        triggerType: 'assigned',
        userId,
      });
    }

    // Gatilho genérico de atualização
    await this.executeTriggers({
      ticket: newTicket,
      oldTicket,
      triggerType: 'ticket_updated',
      userId,
    });
  }

  /**
   * Executa gatilhos quando um comentário é adicionado
   */
  static async onCommentAdded(ticket: any, userId?: number): Promise<void> {
    await this.executeTriggers({
      ticket,
      triggerType: 'comment_added',
      userId,
    });
  }
}
