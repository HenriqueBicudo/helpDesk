import { storage } from '../storage-interface';
import { db, client } from '../db-postgres';
import { automationTriggers } from '../../shared/drizzle-schema';
import { eq, and } from 'drizzle-orm';
import type { Ticket } from '@shared/schema';

interface AutomationTrigger {
  id: number;
  name: string;
  triggerType: string;
  conditions: Record<string, any>;
  actions: Array<{ type: string; [key: string]: any }>;
  isActive: boolean;
}

/**
 * Serviço de Automação - Executa gatilhos personalizados
 */
class AutomationService {
  /**
   * Executa gatilhos baseados em um evento de ticket
   */
  async executeTriggers(
    triggerType: string,
    ticket: Ticket,
    changes?: Record<string, any>,
    userId?: number
  ): Promise<void> {
    try {
      console.log(`\n🎯 [Automation] Verificando gatilhos para evento: ${triggerType}`);
      console.log(`📋 [Automation] Ticket #${ticket.id}: ${ticket.subject}`);

      // Buscar gatilhos ativos do tipo especificado
      const triggers = await this.getActiveTriggers(triggerType);

      if (triggers.length === 0) {
        console.log(`ℹ️  [Automation] Nenhum gatilho ativo encontrado para ${triggerType}`);
        return;
      }

      console.log(`✅ [Automation] Encontrados ${triggers.length} gatilhos ativos`);

      // Executar cada gatilho que atende às condições
      for (const trigger of triggers) {
        try {
          console.log(`\n🔍 [Automation] Avaliando gatilho: ${trigger.name} (ID: ${trigger.id})`);
          console.log(`   Condições:`, JSON.stringify(trigger.conditions));
          
          if (await this.checkConditions(trigger.conditions, ticket, changes)) {
            console.log(`\n▶️  [Automation] Executando gatilho: ${trigger.name}`);
            await this.executeActions(trigger.actions, ticket, userId);
            console.log(`✅ [Automation] Gatilho "${trigger.name}" executado com sucesso`);
          } else {
            console.log(`⏭️  [Automation] Gatilho "${trigger.name}" não atende às condições`);
          }
        } catch (error) {
          console.error(`❌ [Automation] Erro ao executar gatilho "${trigger.name}":`, error);
        }
      }
      
      console.log(`\n✅ [Automation] Processamento de gatilhos concluído para ${triggerType}\n`);
    } catch (error) {
      console.error('❌ [Automation] Erro geral ao executar gatilhos:', error);
    }
  }

  /**
   * Executa ações específicas em um ticket (usado pelo job time_based)
   * Método público para permitir execução externa
   */
  async executeActionsOnTicket(
    actions: Array<{ type: string; [key: string]: any }>,
    ticket: Ticket,
    userId?: number
  ): Promise<void> {
    return this.executeActions(actions, ticket, userId);
  }

  /**
   * Busca gatilhos ativos de um tipo específico
   */
  private async getActiveTriggers(triggerType: string): Promise<AutomationTrigger[]> {
    try {
      console.log(`  🔍 Buscando gatilhos ativos do tipo: ${triggerType}`);
      
      const result = await db.select().from(automationTriggers)
        .where(
          and(
            eq(automationTriggers.isActive, true),
            eq(automationTriggers.triggerType, triggerType)
          )
        );

      console.log(`  📋 Encontrados ${result.length} gatilhos`);
      
      return result.map((r: any) => ({
        id: r.id,
        name: r.name,
        triggerType: r.triggerType,
        conditions: r.conditions as Record<string, any>,
        actions: r.actions as Array<{ type: string; [key: string]: any }>,
        isActive: r.isActive
      }));
    } catch (error) {
      console.error('❌ Erro ao buscar gatilhos:', error);
      return [];
    }
  }

  /**
   * Verifica se as condições do gatilho são atendidas
   */
  private async checkConditions(
    conditions: Record<string, any>,
    ticket: Ticket,
    changes?: Record<string, any>
  ): Promise<boolean> {
    // Se não há condições, sempre executa
    if (!conditions || Object.keys(conditions).length === 0) {
      console.log('  ✓ Nenhuma condição definida - sempre executa');
      return true;
    }

    // Formato avançado com operadores
    if (conditions._advanced && conditions.conditions) {
      console.log(`  📊 Verificando ${conditions.conditions.length} condição(ões) avançadas...`);
      
      for (const condition of conditions.conditions) {
        const { field, operator, value: expectedValue } = condition;
        const actualValue = ticket[field as keyof Ticket];
        
        const result = this.evaluateOperator(actualValue, operator, expectedValue);
        console.log(`  🔍 ${field} ${operator} ${expectedValue} | Atual: ${actualValue} | Resultado: ${result ? '✓' : '✗'}`);
        
        if (!result) {
          console.log(`  ✗ Condição não atendida`);
          return false;
        }
      }
      
      console.log(`  ✅ Todas as condições avançadas foram atendidas!`);
      return true;
    }

    // Formato simples (backwards compatibility)
    console.log(`  📊 Verificando ${Object.keys(conditions).length} condição(ões) simples...`);

    for (const [field, expectedValue] of Object.entries(conditions)) {
      if (field.startsWith('_')) continue; // Skip meta fields
      
      const actualValue = ticket[field as keyof Ticket];

      console.log(`  🔍 Campo: ${field} | Esperado: ${expectedValue} | Atual: ${actualValue}`);

      // Comparação especial para null
      if (expectedValue === null) {
        if (actualValue !== null && actualValue !== undefined) {
          console.log(`  ✗ Condição não atendida: ${field} esperado null, mas é ${actualValue}`);
          return false;
        }
      } else {
        // Comparação normal
        if (actualValue !== expectedValue) {
          console.log(`  ✗ Condição não atendida: ${field} esperado ${expectedValue}, mas é ${actualValue}`);
          return false;
        }
      }

      console.log(`  ✓ Condição atendida: ${field} = ${expectedValue}`);
    }

    console.log(`  ✅ Todas as condições foram atendidas!`);
    return true;
  }

  /**
   * Avalia um operador de comparação
   */
  private evaluateOperator(actualValue: any, operator: string, expectedValue: any): boolean {
    switch (operator) {
      case 'equals':
        return actualValue === expectedValue;
      
      case 'not_equals':
        return actualValue !== expectedValue;
      
      case 'greater_than':
        return Number(actualValue) > Number(expectedValue);
      
      case 'less_than':
        return Number(actualValue) < Number(expectedValue);
      
      case 'greater_or_equal':
        return Number(actualValue) >= Number(expectedValue);
      
      case 'less_or_equal':
        return Number(actualValue) <= Number(expectedValue);
      
      case 'contains':
        return String(actualValue).toLowerCase().includes(String(expectedValue).toLowerCase());
      
      case 'not_contains':
        return !String(actualValue).toLowerCase().includes(String(expectedValue).toLowerCase());
      
      case 'starts_with':
        return String(actualValue).toLowerCase().startsWith(String(expectedValue).toLowerCase());
      
      case 'ends_with':
        return String(actualValue).toLowerCase().endsWith(String(expectedValue).toLowerCase());
      
      case 'in':
        // expectedValue deve ser array ou string separada por vírgula
        const list = Array.isArray(expectedValue) ? expectedValue : String(expectedValue).split(',').map(s => s.trim());
        return list.includes(actualValue);
      
      case 'not_in':
        const notInList = Array.isArray(expectedValue) ? expectedValue : String(expectedValue).split(',').map(s => s.trim());
        return !notInList.includes(actualValue);
      
      case 'exists':
        return actualValue !== null && actualValue !== undefined && actualValue !== '';
      
      case 'not_exists':
        return actualValue === null || actualValue === undefined || actualValue === '';
      
      default:
        console.log(`  ⚠️  Operador desconhecido: ${operator}, usando equals`);
        return actualValue === expectedValue;
    }
  }

  /**
   * Executa as ações do gatilho
   */
  private async executeActions(
    actions: Array<{ type: string; [key: string]: any }>,
    ticket: Ticket,
    userId?: number
  ): Promise<void> {
    if (!ticket.id) {
      console.log('  ⚠️  Ticket sem ID, não é possível executar ações');
      return;
    }

    for (const action of actions) {
      try {
        console.log(`  🔧 Executando ação: ${action.type}`);
        
        switch (action.type) {
          case 'add_comment':
            if (action.content) {
              await this.addComment(ticket.id, action.content, action.isInternal || false, userId);
            }
            break;

          case 'assign_to':
            if (action.userId) {
              await this.assignTicket(ticket.id, action.userId);
            }
            break;

          case 'change_priority':
            if (action.priority) {
              await this.changePriority(ticket.id, action.priority);
            }
            break;

          case 'change_status':
            if (action.status) {
              await this.changeStatus(ticket.id, action.status);
            }
            break;

          case 'add_tag':
            if (action.tag) {
              await this.addTag(ticket.id, action.tag);
            }
            break;

          case 'remove_tag':
            if (action.tag) {
              await this.removeTag(ticket.id, action.tag);
            }
            break;

          case 'set_category':
            if (action.category) {
              await this.setCategory(ticket.id, action.category);
            }
            break;

          case 'send_email':
            if (action.to && action.subject && action.body) {
              await this.sendEmail(action.to, action.subject, action.body, ticket);
            }
            break;

          default:
            console.log(`  ⚠️  Tipo de ação desconhecido: ${action.type}`);
        }
      } catch (error) {
        console.error(`  ❌ Erro ao executar ação ${action.type}:`, error);
      }
    }
  }

  /**
   * Adiciona um comentário ao ticket
   */
  private async addComment(
    ticketId: number,
    content: string,
    isInternal: boolean = false,
    userId?: number
  ): Promise<void> {
    await storage.createTicketInteraction({
      ticketId,
      createdBy: userId || null, // null indica interação automática do sistema
      content,
      type: 'comment',
      isInternal,
      timeSpent: 0,
    });
    console.log(`    ✓ Comentário ${userId ? 'adicionado' : 'automático adicionado (sistema)'} ao ticket #${ticketId}`);
  }

  /**
   * Atribui o ticket a um usuário
   */
  private async assignTicket(ticketId: number, userId: number): Promise<void> {
    await storage.updateTicket(ticketId, { assigneeId: userId });
    console.log(`    ✓ Ticket #${ticketId} atribuído ao usuário #${userId}`);
  }

  /**
   * Muda a prioridade do ticket
   */
  private async changePriority(ticketId: number, priority: string): Promise<void> {
    await storage.updateTicket(ticketId, { priority: priority as any });
    console.log(`    ✓ Prioridade do ticket #${ticketId} alterada para ${priority}`);
  }

  /**
   * Muda o status do ticket
   */
  private async changeStatus(ticketId: number, status: string): Promise<void> {
    await storage.updateTicket(ticketId, { status: status as any });
    console.log(`    ✓ Status do ticket #${ticketId} alterado para ${status}`);
  }

  /**
   * Adiciona uma tag ao ticket
   */
  private async addTag(ticketId: number, tagName: string): Promise<void> {
    try {
      // Buscar ou criar a tag usando raw SQL com postgres-js
      const tagResult = await client`
        SELECT id FROM tags WHERE name = ${tagName}
      `;

      let tagId: number;
      if (tagResult.length > 0) {
        tagId = tagResult[0].id;
      } else {
        // Criar nova tag
        const newTag = await client`
          INSERT INTO tags (name, color) VALUES (${tagName}, '#808080') RETURNING id
        `;
        tagId = newTag[0].id;
      }

      // Verificar se a tag já está associada
      const existingAssoc = await client`
        SELECT 1 FROM ticket_tags WHERE ticket_id = ${ticketId} AND tag_id = ${tagId}
      `;

      if (existingAssoc.length === 0) {
        await client`
          INSERT INTO ticket_tags (ticket_id, tag_id) VALUES (${ticketId}, ${tagId})
        `;
        console.log(`    ✓ Tag "${tagName}" adicionada ao ticket #${ticketId}`);
      } else {
        console.log(`    ℹ️  Tag "${tagName}" já existe no ticket #${ticketId}`);
      }
    } catch (error) {
      console.error(`    ❌ Erro ao adicionar tag: ${error}`);
    }
  }

  /**
   * Remove uma tag do ticket
   */
  private async removeTag(ticketId: number, tagName: string): Promise<void> {
    try {
      // Buscar a tag
      const tagResult = await client`
        SELECT id FROM tags WHERE name = ${tagName}
      `;

      if (tagResult.length > 0) {
        const tagId = tagResult[0].id;
        await client`
          DELETE FROM ticket_tags WHERE ticket_id = ${ticketId} AND tag_id = ${tagId}
        `;
        console.log(`    ✓ Tag "${tagName}" removida do ticket #${ticketId}`);
      } else {
        console.log(`    ℹ️  Tag "${tagName}" não encontrada`);
      }
    } catch (error) {
      console.error(`    ❌ Erro ao remover tag: ${error}`);
    }
  }

  /**
   * Define a categoria do ticket
   */
  private async setCategory(ticketId: number, category: string): Promise<void> {
    await storage.updateTicket(ticketId, { category });
    console.log(`    ✓ Categoria do ticket #${ticketId} definida como "${category}"`);
  }

  /**
   * Envia um email (placeholder - implementar com emailService se necessário)
   */
  private async sendEmail(
    to: string,
    subject: string,
    body: string,
    ticket: Ticket
  ): Promise<void> {
    console.log(`    ℹ️  Envio de email programado (não implementado):`);
    console.log(`       Para: ${to}`);
    console.log(`       Assunto: ${subject}`);
    console.log(`       Ticket: #${ticket.id}`);
    // TODO: Implementar envio de email usando emailService
  }
}

export const automationService = new AutomationService();
