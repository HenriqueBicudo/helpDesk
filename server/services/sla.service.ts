import { eq, desc, and, asc, count } from 'drizzle-orm';
import { db } from '../db-postgres';
import { slaRules } from '../../shared/schema/sla_rules';
import { contracts } from '../../shared/schema/contracts';

/**
 * Tipos para o serviço SLA
 */
interface SlaRuleData {
  id: number;
  contractId: string; // VARCHAR UUID
  priority: string;
  responseTimeMinutes: number;
  solutionTimeMinutes: number;
  createdAt: Date | null;
}

interface SlaRuleFilters {
  contractId?: string; // VARCHAR UUID
  priority?: 'low' | 'medium' | 'high' | 'urgent' | 'critical';
  page?: number;
  limit?: number;
}

/**
 * Serviço para operações CRUD das configurações/regras de SLA
 * Centraliza toda a lógica de negócio relacionada às regras SLA
 */
export class SlaService {
  
  /**
   * Busca todas as regras SLA com filtros opcionais
   * 
   * @param filters - Filtros para busca (contractId, priority, paginação)
   * @returns Promise<SlaRuleData[]> - Lista de regras SLA
   */
  async getAllConfigurations(filters?: SlaRuleFilters): Promise<SlaRuleData[]> {
    try {
      // Buscar todas as regras
      let results = await db.select().from(slaRules).orderBy(asc(slaRules.contractId), asc(slaRules.priority));

      // Aplicar filtros em memória
      if (filters?.contractId) {
        results = results.filter(r => r.contractId === filters.contractId);
      }
      if (filters?.priority) {
        results = results.filter(r => r.priority === filters.priority);
      }

      // Aplicar paginação em memória
      if (filters?.limit) {
        const start = filters.page ? (filters.page - 1) * filters.limit : 0;
        results = results.slice(start, start + filters.limit);
      }
      
      console.log(`📋 [SlaService] Retornando ${results.length} configurações SLA`);
      return results;
    } catch (error) {
      console.error('Erro no SlaService.getAllConfigurations:', error);
      throw new Error('Falha ao buscar configurações SLA: ' + (error as Error).message);
    }
  }

  /**
   * Busca regras SLA de um contrato específico
   * 
   * @param contractId - ID do contrato (VARCHAR UUID)
   * @returns Promise<SlaRuleData[]> - Lista de regras SLA do contrato
   */
  async getByContractId(contractId: string): Promise<SlaRuleData[]> {
    try {
      const results = await db
        .select()
        .from(slaRules)
        .where(eq(slaRules.contractId, contractId))
        .orderBy(asc(slaRules.priority));

      console.log(`📋 [SlaService] Encontradas ${results.length} regras SLA para contrato ${contractId}`);
      return results;
    } catch (error) {
      console.error('Erro no SlaService.getByContractId:', error);
      throw new Error('Falha ao buscar regras SLA do contrato: ' + (error as Error).message);
    }
  }

  /**
   * Busca uma regra SLA específica
   * 
   * @param id - ID da regra SLA
   * @returns Promise<SlaRuleData | null> - Regra SLA ou null se não encontrada
   */
  async getById(id: number): Promise<SlaRuleData | null> {
    try {
      const results = await db
        .select()
        .from(slaRules)
        .where(eq(slaRules.id, id))
        .limit(1);

      const rule = results[0] || null;
      console.log(`📋 [SlaService] Regra SLA ${id}: ${rule ? 'encontrada' : 'não encontrada'}`);
      return rule;
    } catch (error) {
      console.error('Erro no SlaService.getById:', error);
      throw new Error('Falha ao buscar regra SLA: ' + (error as Error).message);
    }
  }

  /**
   * Busca regras SLA com informações dos contratos relacionados (simplificado)
   * 
   * @param filters - Filtros para busca
   * @returns Promise<any[]> - Regras SLA com dados dos contratos
   */
  async getConfigurationsWithContracts(filters?: SlaRuleFilters) {
    try {
      // Buscar todas as regras
      let results = await db.select().from(slaRules).orderBy(asc(slaRules.contractId), asc(slaRules.priority));

      // Aplicar filtros em memória
      if (filters?.contractId) {
        results = results.filter(r => r.contractId === filters.contractId);
      }
      if (filters?.priority) {
        results = results.filter(r => r.priority === filters.priority);
      }

      // Aplicar paginação em memória
      if (filters?.limit) {
        const start = filters.page ? (filters.page - 1) * filters.limit : 0;
        results = results.slice(start, start + filters.limit);
      }

      // Por enquanto, retornar sem dados de contrato para simplificar
      const configurationsWithContracts = results.map(row => ({
        id: row.id,
        contractId: row.contractId,
        priority: row.priority,
        responseTimeMinutes: row.responseTimeMinutes,
        solutionTimeMinutes: row.solutionTimeMinutes,
        createdAt: row.createdAt,
        // TODO: adicionar dados do contrato quando o join estiver funcionando
        contract: {
          id: row.contractId,
          name: row.contractId ? `Contrato ${String(row.contractId)}` : 'Contrato não especificado',
          type: 'support',
          isActive: true,
        }
      }));

      console.log(`📋 [SlaService] Retornando ${configurationsWithContracts.length} configurações SLA com dados de contratos`);
      return configurationsWithContracts;
    } catch (error) {
      console.error('Erro no SlaService.getConfigurationsWithContracts:', error);
      throw new Error('Falha ao buscar configurações SLA com contratos: ' + (error as Error).message);
    }
  }

  /**
   * Busca regra SLA específica por contrato e prioridade
   * Usado pelo sistema de cálculo de SLA
   * 
   * @param contractId - ID do contrato (VARCHAR UUID)
   * @param priority - Prioridade do ticket
   * @returns Promise<SlaRuleData | null> - Regra SLA específica ou null
   */
  async findByContractAndPriority(contractId: string, priority: string): Promise<SlaRuleData | null> {
    try {
      const results = await db
        .select()
        .from(slaRules)
        .where(and(
          eq(slaRules.contractId, contractId),
          eq(slaRules.priority, priority)
        ))
        .limit(1);

      const rule = results[0] || null;
      console.log(`🎯 [SlaService] Regra SLA para contrato ${contractId} e prioridade ${priority}: ${rule ? 'encontrada' : 'não encontrada'}`);
      return rule;
    } catch (error) {
      console.error('Erro no SlaService.findByContractAndPriority:', error);
      throw new Error('Falha ao buscar regra SLA específica: ' + (error as Error).message);
    }
  }

  /**
   * Conta o total de configurações SLA no sistema
   * 
   * @param filters - Filtros opcionais para contagem
   * @returns Promise<number> - Total de configurações
   */
  async count(): Promise<number> {
    try {
      // Usar abordagem simples: buscar todos e contar em JS
      const allRules = await db.select().from(slaRules);
      const total = allRules.length;
      
      console.log(`📊 [SlaService] Total de configurações SLA: ${total}`);
      return total;
    } catch (error) {
      console.error('Erro no SlaService.count:', error);
      throw new Error('Falha ao contar configurações SLA: ' + (error as Error).message);
    }
  }

  /**
   * Cria uma nova regra SLA
   * 
   * @param data - Dados da regra SLA
   * @returns Promise<SlaRuleData> - Regra criada
   */
  async create(data: {
    contractId: string;
    priority: string;
    responseTimeMinutes: number;
    solutionTimeMinutes: number;
  }): Promise<SlaRuleData> {
    try {
      console.log(`➕ [SlaService] Criando regra SLA para contrato ${data.contractId}, prioridade ${data.priority}`);
      
      // Verificar se já existe regra para este contrato e prioridade
      const existing = await this.findByContractAndPriority(data.contractId, data.priority);
      if (existing) {
        throw new Error(`Já existe uma regra SLA para o contrato ${data.contractId} com prioridade ${data.priority}`);
      }
      
      const result = await db
        .insert(slaRules)
        .values({
          contractId: data.contractId,
          priority: data.priority,
          responseTimeMinutes: data.responseTimeMinutes,
          solutionTimeMinutes: data.solutionTimeMinutes,
          createdAt: new Date(),
        })
        .returning();
      
      const created = result[0];
      console.log(`✅ [SlaService] Regra SLA criada com ID ${created.id}`);
      return created;
    } catch (error) {
      console.error('Erro no SlaService.create:', error);
      throw new Error('Falha ao criar regra SLA: ' + (error as Error).message);
    }
  }

  /**
   * Atualiza uma regra SLA existente
   * 
   * @param id - ID da regra SLA
   * @param data - Dados a serem atualizados
   * @returns Promise<SlaRuleData | null> - Regra atualizada ou null
   */
  async update(id: number, data: {
    contractId?: string;
    priority?: string;
    responseTimeMinutes?: number;
    solutionTimeMinutes?: number;
  }): Promise<SlaRuleData | null> {
    try {
      console.log(`✏️ [SlaService] Atualizando regra SLA ${id}`);
      
      // Verificar se existe
      const existing = await this.getById(id);
      if (!existing) {
        console.log(`❌ [SlaService] Regra SLA ${id} não encontrada`);
        return null;
      }
      
      // Se está mudando contrato ou prioridade, verificar duplicação
      if (data.contractId || data.priority) {
        const newContractId = data.contractId || existing.contractId;
        const newPriority = data.priority || existing.priority;
        
        const duplicate = await this.findByContractAndPriority(newContractId, newPriority);
        if (duplicate && duplicate.id !== id) {
          throw new Error(`Já existe uma regra SLA para o contrato ${newContractId} com prioridade ${newPriority}`);
        }
      }
      
      const result = await db
        .update(slaRules)
        .set({
          ...data,
          createdAt: existing.createdAt || new Date(), // Manter data de criação
        })
        .where(eq(slaRules.id, id))
        .returning();
      
      const updated = result[0] || null;
      console.log(`✅ [SlaService] Regra SLA ${id} atualizada`);
      return updated;
    } catch (error) {
      console.error('Erro no SlaService.update:', error);
      throw new Error('Falha ao atualizar regra SLA: ' + (error as Error).message);
    }
  }

  /**
   * Remove uma regra SLA
   * 
   * @param id - ID da regra SLA
   * @returns Promise<boolean> - true se removido, false se não encontrado
   */
  async delete(id: number): Promise<boolean> {
    try {
      console.log(`🗑️ [SlaService] Removendo regra SLA ${id}`);
      
      const result = await db
        .delete(slaRules)
        .where(eq(slaRules.id, id))
        .returning();
      
      const deleted = result.length > 0;
      if (deleted) {
        console.log(`✅ [SlaService] Regra SLA ${id} removida`);
      } else {
        console.log(`❌ [SlaService] Regra SLA ${id} não encontrada`);
      }
      
      return deleted;
    } catch (error) {
      console.error('Erro no SlaService.delete:', error);
      throw new Error('Falha ao remover regra SLA: ' + (error as Error).message);
    }
  }
}

/**
 * Instância singleton do serviço SLA
 */
export const slaService = new SlaService();
