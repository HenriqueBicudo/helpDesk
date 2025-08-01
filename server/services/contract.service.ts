import { eq, and, gte, lte, sql, count } from 'drizzle-orm';
import { db } from '../db-drizzle';
import { 
  contracts,
  type Contract,
  type CreateContract,
  type UpdateContract,
  type ContractWithRelations,
  type ContractFilters
} from '../../shared/schema/contracts';
import { calendars } from '../../shared/schema/calendars';
import { slaRules, type SlaRule } from '../../shared/schema/sla_rules';

/**
 * Interface para resultado paginado
 */
interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * Interface para verificação de possibilidade de deleção
 */
interface DeleteCheckResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Service para operações CRUD de contratos
 * Centraliza toda a lógica de negócio e acesso a dados relacionados a contratos
 */
export class ContractService {
  /**
   * Cria um novo contrato
   * 
   * @param data - Dados do contrato validados pelo Zod
   * @returns Promise<Contract> - Contrato criado
   * @throws Error - Se houver problemas na criação
   */
  async create(data: CreateContract): Promise<Contract> {
    try {
      // Verificar se o calendário existe
      const calendarExists = await db
        .select({ id: calendars.id })
        .from(calendars)
        .where(eq(calendars.id, data.calendarId))
        .limit(1);

      if (calendarExists.length === 0) {
        throw new Error('Calendário não encontrado');
      }

      // Preparar dados para inserção
      const insertData = {
        ...data,
        // Converter datas para timestamp se necessário
        startDate: data.startDate,
        endDate: data.endDate || null,
      };

      // Inserir contrato no banco
      const [newContract] = await db
        .insert(contracts)
        .values(insertData)
        .returning();

      return newContract;
    } catch (error) {
      console.error('Erro no ContractService.create:', error);
      throw new Error('Falha ao criar contrato: ' + (error as Error).message);
    }
  }

  /**
   * Busca contratos com filtros e paginação
   * 
   * @param filters - Filtros de busca validados pelo Zod
   * @returns Promise<PaginatedResult<ContractWithRelations>> - Resultado paginado
   */
  async findMany(filters: ContractFilters): Promise<PaginatedResult<ContractWithRelations>> {
    try {
      const { page = 1, limit = 10, ...searchFilters } = filters;
      const offset = (page - 1) * limit;

      // Construir cláusulas WHERE dinâmicas
      const whereConditions = [];

      if (searchFilters.requesterId) {
        whereConditions.push(eq(contracts.requesterId, searchFilters.requesterId));
      }

      if (searchFilters.calendarId) {
        whereConditions.push(eq(contracts.calendarId, searchFilters.calendarId));
      }

      if (searchFilters.type) {
        whereConditions.push(eq(contracts.type, searchFilters.type));
      }

      if (searchFilters.isActive !== undefined) {
        whereConditions.push(eq(contracts.isActive, searchFilters.isActive));
      }

      if (searchFilters.startDate) {
        whereConditions.push(gte(contracts.startDate, searchFilters.startDate));
      }

      if (searchFilters.endDate) {
        whereConditions.push(lte(contracts.endDate, searchFilters.endDate));
      }

      const whereClause = whereConditions.length > 0 
        ? and(...whereConditions) 
        : undefined;

      // Buscar contratos com relacionamentos
      const contractsQuery = db
        .select({
          id: contracts.id,
          requesterId: contracts.requesterId,
          calendarId: contracts.calendarId,
          name: contracts.name,
          type: contracts.type,
          monthlyHours: contracts.monthlyHours,
          baseValue: contracts.baseValue,
          extraHourValue: contracts.extraHourValue,
          startDate: contracts.startDate,
          endDate: contracts.endDate,
          isActive: contracts.isActive,
          createdAt: contracts.createdAt,
          // Dados do calendário
          calendarName: calendars.name,
          calendarDescription: calendars.description,
        })
        .from(contracts)
        .leftJoin(calendars, eq(contracts.calendarId, calendars.id))
        .where(whereClause)
        .limit(limit)
        .offset(offset)
        .orderBy(contracts.createdAt);

      const [contractsResult, totalResult] = await Promise.all([
        contractsQuery,
        db.select({ count: count() }).from(contracts).where(whereClause)
      ]);

      const total = totalResult[0]?.count || 0;
      const totalPages = Math.ceil(total / limit);

      // Formatar resultado com relacionamentos
      const formattedContracts: ContractWithRelations[] = contractsResult.map(row => ({
        id: row.id,
        requesterId: row.requesterId,
        calendarId: row.calendarId,
        name: row.name,
        type: row.type,
        monthlyHours: row.monthlyHours,
        baseValue: row.baseValue,
        extraHourValue: row.extraHourValue,
        startDate: row.startDate,
        endDate: row.endDate,
        isActive: row.isActive,
        createdAt: row.createdAt,
        calendar: row.calendarName ? {
          id: row.calendarId,
          name: row.calendarName,
          description: row.calendarDescription,
        } : undefined,
      }));

      return {
        data: formattedContracts,
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      };
    } catch (error) {
      console.error('Erro no ContractService.findMany:', error);
      throw new Error('Falha ao buscar contratos: ' + (error as Error).message);
    }
  }

  /**
   * Busca um contrato específico por ID com relacionamentos
   * 
   * @param id - ID do contrato
   * @returns Promise<ContractWithRelations | null> - Contrato encontrado ou null
   */
  async findById(id: number): Promise<ContractWithRelations | null> {
    try {
      const result = await db
        .select({
          id: contracts.id,
          requesterId: contracts.requesterId,
          calendarId: contracts.calendarId,
          name: contracts.name,
          type: contracts.type,
          monthlyHours: contracts.monthlyHours,
          baseValue: contracts.baseValue,
          extraHourValue: contracts.extraHourValue,
          startDate: contracts.startDate,
          endDate: contracts.endDate,
          isActive: contracts.isActive,
          createdAt: contracts.createdAt,
          // Dados do calendário
          calendarName: calendars.name,
          calendarDescription: calendars.description,
        })
        .from(contracts)
        .leftJoin(calendars, eq(contracts.calendarId, calendars.id))
        .where(eq(contracts.id, id))
        .limit(1);

      if (result.length === 0) {
        return null;
      }

      const row = result[0];

      return {
        id: row.id,
        requesterId: row.requesterId,
        calendarId: row.calendarId,
        name: row.name,
        type: row.type,
        monthlyHours: row.monthlyHours,
        baseValue: row.baseValue,
        extraHourValue: row.extraHourValue,
        startDate: row.startDate,
        endDate: row.endDate,
        isActive: row.isActive,
        createdAt: row.createdAt,
        calendar: row.calendarName ? {
          id: row.calendarId,
          name: row.calendarName,
          description: row.calendarDescription,
        } : undefined,
      };
    } catch (error) {
      console.error('Erro no ContractService.findById:', error);
      throw new Error('Falha ao buscar contrato: ' + (error as Error).message);
    }
  }

  /**
   * Atualiza um contrato existente
   * 
   * @param id - ID do contrato
   * @param data - Dados a serem atualizados validados pelo Zod
   * @returns Promise<Contract> - Contrato atualizado
   * @throws Error - Se o contrato não for encontrado ou houver problemas na atualização
   */
  async update(id: number, data: UpdateContract): Promise<Contract> {
    try {
      // Verificar se há dados para atualizar
      if (Object.keys(data).length === 0) {
        throw new Error('Nenhum dado fornecido para atualização');
      }

      // Se calendarId está sendo alterado, verificar se o novo calendário existe
      if (data.calendarId) {
        const calendarExists = await db
          .select({ id: calendars.id })
          .from(calendars)
          .where(eq(calendars.id, data.calendarId))
          .limit(1);

        if (calendarExists.length === 0) {
          throw new Error('Calendário não encontrado');
        }
      }

      // Preparar dados para atualização
      const updateData = {
        ...data,
        // Sempre atualizar o timestamp de modificação
        updatedAt: new Date(),
      };

      // Atualizar contrato no banco
      const [updatedContract] = await db
        .update(contracts)
        .set(updateData)
        .where(eq(contracts.id, id))
        .returning();

      if (!updatedContract) {
        throw new Error('Contrato não encontrado');
      }

      return updatedContract;
    } catch (error) {
      console.error('Erro no ContractService.update:', error);
      throw new Error('Falha ao atualizar contrato: ' + (error as Error).message);
    }
  }

  /**
   * Verifica se um contrato pode ser deletado
   * 
   * @param id - ID do contrato
   * @returns Promise<DeleteCheckResult> - Resultado da verificação
   */
  async canDelete(id: number): Promise<DeleteCheckResult> {
    try {
      // Verificar se existem regras de SLA associadas
      const slaRulesCount = await db
        .select({ count: count() })
        .from(slaRules)
        .where(eq(slaRules.contractId, id));

      if (slaRulesCount[0]?.count > 0) {
        return {
          allowed: false,
          reason: 'Contrato possui regras de SLA associadas. Remova-as primeiro.'
        };
      }

      // Aqui você pode adicionar outras verificações:
      // - Tickets associados ao contrato
      // - Histórico de horas trabalhadas
      // - Faturas pendentes, etc.

      return { allowed: true };
    } catch (error) {
      console.error('Erro no ContractService.canDelete:', error);
      throw new Error('Falha ao verificar possibilidade de deleção: ' + (error as Error).message);
    }
  }

  /**
   * Remove um contrato
   * 
   * @param id - ID do contrato
   * @returns Promise<void>
   * @throws Error - Se o contrato não puder ser removido
   */
  async delete(id: number): Promise<void> {
    try {
      // Verificar se pode deletar
      const canDeleteResult = await this.canDelete(id);
      if (!canDeleteResult.allowed) {
        throw new Error(canDeleteResult.reason);
      }

      // Deletar contrato
      const result = await db
        .delete(contracts)
        .where(eq(contracts.id, id))
        .returning({ id: contracts.id });

      if (result.length === 0) {
        throw new Error('Contrato não encontrado');
      }
    } catch (error) {
      console.error('Erro no ContractService.delete:', error);
      throw new Error('Falha ao deletar contrato: ' + (error as Error).message);
    }
  }

  /**
   * Busca as regras de SLA de um contrato
   * 
   * @param contractId - ID do contrato
   * @returns Promise<SlaRule[]> - Lista de regras de SLA
   */
  async getSlaRules(contractId: number): Promise<SlaRule[]> {
    try {
      const rules = await db
        .select()
        .from(slaRules)
        .where(eq(slaRules.contractId, contractId))
        .orderBy(slaRules.priority);

      return rules;
    } catch (error) {
      console.error('Erro no ContractService.getSlaRules:', error);
      throw new Error('Falha ao buscar regras de SLA: ' + (error as Error).message);
    }
  }

  /**
   * Busca contratos ativos de um solicitante
   * 
   * @param requesterId - ID do solicitante
   * @returns Promise<Contract[]> - Lista de contratos ativos
   */
  async findActiveByRequesterId(requesterId: number): Promise<Contract[]> {
    try {
      const activeContracts = await db
        .select()
        .from(contracts)
        .where(
          and(
            eq(contracts.requesterId, requesterId),
            eq(contracts.isActive, true)
          )
        )
        .orderBy(contracts.createdAt);

      return activeContracts;
    } catch (error) {
      console.error('Erro no ContractService.findActiveByRequesterId:', error);
      throw new Error('Falha ao buscar contratos ativos: ' + (error as Error).message);
    }
  }

  /**
   * Busca contratos que estão próximos do vencimento
   * 
   * @param daysAhead - Número de dias para verificar vencimentos
   * @returns Promise<Contract[]> - Lista de contratos próximos do vencimento
   */
  async findExpiringContracts(daysAhead: number = 30): Promise<Contract[]> {
    try {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);

      const expiringContracts = await db
        .select()
        .from(contracts)
        .where(
          and(
            eq(contracts.isActive, true),
            lte(contracts.endDate, futureDate),
            gte(contracts.endDate, new Date())
          )
        )
        .orderBy(contracts.endDate);

      return expiringContracts;
    } catch (error) {
      console.error('Erro no ContractService.findExpiringContracts:', error);
      throw new Error('Falha ao buscar contratos expirando: ' + (error as Error).message);
    }
  }

  /**
   * Calcula estatísticas básicas dos contratos
   * 
   * @returns Promise<ContractStats> - Estatísticas dos contratos
   */
  async getStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    expiring: number;
    totalMonthlyValue: string;
  }> {
    try {
      const [
        totalResult,
        activeResult,
        inactiveResult,
        expiringResult,
        valueResult
      ] = await Promise.all([
        db.select({ count: count() }).from(contracts),
        db.select({ count: count() }).from(contracts).where(eq(contracts.isActive, true)),
        db.select({ count: count() }).from(contracts).where(eq(contracts.isActive, false)),
        this.findExpiringContracts(30),
        db.select({ sum: sql<string>`sum(${contracts.baseValue})` }).from(contracts).where(eq(contracts.isActive, true))
      ]);

      return {
        total: totalResult[0]?.count || 0,
        active: activeResult[0]?.count || 0,
        inactive: inactiveResult[0]?.count || 0,
        expiring: expiringResult.length,
        totalMonthlyValue: valueResult[0]?.sum || '0',
      };
    } catch (error) {
      console.error('Erro no ContractService.getStats:', error);
      throw new Error('Falha ao calcular estatísticas: ' + (error as Error).message);
    }
  }
}
