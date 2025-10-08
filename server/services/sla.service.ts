import { eq, desc, and, asc, count } from 'drizzle-orm';
import { db } from '../db-drizzle';
import { slaRules } from '../../shared/schema/sla_rules';
import { contracts } from '../../shared/schema/contracts';

/**
 * Tipos para o serviço SLA, adaptados para trabalhar com contract_id como string (UUID)
 */
interface SlaRuleWithStringContractId {
  id: number;
  contractId: string; // UUID como string
  priority: string;
  responseTimeMinutes: number;
  solutionTimeMinutes: number;
  createdAt: Date | null;
}

interface SlaRuleFilters {
  contractId?: string; // UUID como string
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
   * @returns Promise<SlaRuleWithStringContractId[]> - Lista de regras SLA
   */
  async getAllConfigurations(filters?: SlaRuleFilters): Promise<SlaRuleWithStringContractId[]> {
    try {
      let query = db
        .select({
          id: slaRules.id,
          contractId: slaRules.contractId,
          priority: slaRules.priority,
          responseTimeMinutes: slaRules.responseTimeMinutes,
          solutionTimeMinutes: slaRules.solutionTimeMinutes,
          createdAt: slaRules.createdAt,
        })
        .from(slaRules);

      // Aplicar filtros se fornecidos
      const conditions = [];
      if (filters?.contractId) {
        conditions.push(eq(slaRules.contractId, filters.contractId));
      }
      if (filters?.priority) {
        conditions.push(eq(slaRules.priority, filters.priority));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      // Ordenar por contractId e depois por prioridade
      query = query.orderBy(asc(slaRules.contractId), asc(slaRules.priority));

      // Aplicar paginação se fornecida
      if (filters?.limit) {
        query = query.limit(filters.limit);
        if (filters?.page && filters.page > 1) {
          query = query.offset((filters.page - 1) * filters.limit);
        }
      }

      const results = await query;
      
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
   * @param contractId - ID do contrato (UUID)
   * @returns Promise<SlaRuleWithStringContractId[]> - Lista de regras SLA do contrato
   */
  async getByContractId(contractId: string): Promise<SlaRuleWithStringContractId[]> {
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
   * @returns Promise<SlaRuleWithStringContractId | null> - Regra SLA ou null se não encontrada
   */
  async getById(id: number): Promise<SlaRuleWithStringContractId | null> {
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
      let query = db
        .select({
          // Campos da regra SLA
          id: slaRules.id,
          contractId: slaRules.contractId,
          priority: slaRules.priority,
          responseTimeMinutes: slaRules.responseTimeMinutes,
          solutionTimeMinutes: slaRules.solutionTimeMinutes,
          createdAt: slaRules.createdAt,
        })
        .from(slaRules);

      // Aplicar filtros
      const conditions = [];
      if (filters?.contractId) {
        conditions.push(eq(slaRules.contractId, filters.contractId));
      }
      if (filters?.priority) {
        conditions.push(eq(slaRules.priority, filters.priority));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      query = query.orderBy(asc(slaRules.contractId), asc(slaRules.priority));

      // Aplicar paginação
      if (filters?.limit) {
        query = query.limit(filters.limit);
        if (filters?.page && filters.page > 1) {
          query = query.offset((filters.page - 1) * filters.limit);
        }
      }

      const results = await query;

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
          name: row.contractId ? `Contrato ${String(row.contractId).substring(0, 8)}...` : 'Contrato não especificado',
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
   * @param contractId - ID do contrato (UUID)
   * @param priority - Prioridade do ticket
   * @returns Promise<SlaRuleWithStringContractId | null> - Regra SLA específica ou null
   */
  async findByContractAndPriority(contractId: string, priority: string): Promise<SlaRuleWithStringContractId | null> {
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
}

/**
 * Instância singleton do serviço SLA
 */
export const slaService = new SlaService();
