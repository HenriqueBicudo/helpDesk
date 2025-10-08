import { Router } from 'express';
import { z } from 'zod';
// import { ContractService } from '../../services/contract.service';
import { 
  createContractSchema, 
  updateContractSchema,
  type Contract,
  type InsertContract
} from '../../../shared/schema/contracts';
import { storage } from '../../storage';

// Schema simplificado para filtros
const contractFiltersSchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(10),
  companyId: z.coerce.number().optional(),
  status: z.string().optional(),
  type: z.string().optional(),
});

type ContractFilters = z.infer<typeof contractFiltersSchema>;

/**
 * Router para operações CRUD de contratos
 * Implementa todas as operações básicas com validação Zod
 */
export const contractRoutes = Router();
// const contractService = new ContractService();

/**
 * Schema para validação de parâmetros de ID
 */
const idParamSchema = z.object({
  id: z.string().transform((val) => {
    const parsed = parseInt(val, 10);
    if (isNaN(parsed) || parsed <= 0) {
      throw new Error('ID deve ser um número positivo');
    }
    return parsed;
  }),
});

/**
 * POST /api/contracts
 * Cria um novo contrato
 * 
 * @body CreateContract - Dados do contrato a ser criado
 * @returns Contract - Contrato criado
 */
contractRoutes.post('/', async (req, res) => {
  try {
    // Validação do corpo da requisição usando Zod
    const validatedData: InsertContract = createContractSchema.parse(req.body);
    
    // Criação do contrato através do service
    const contract = await contractService.create(validatedData);
    
    res.status(201).json({
      success: true,
      data: contract,
      message: 'Contrato criado com sucesso'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Erro de validação Zod
      return res.status(400).json({
        success: false,
        error: 'Dados inválidos',
        details: error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }))
      });
    }
    
    // Outros erros (banco de dados, etc.)
    console.error('Erro ao criar contrato:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * GET /api/contracts
 * Lista contratos com filtros opcionais
 * 
 * @query ContractFilters - Filtros de busca
 * @returns PaginatedResult<Contract> - Lista paginada de contratos
 */
contractRoutes.get('/', async (req, res) => {
  try {
    // Validação dos query parameters
    const filters: ContractFilters = contractFiltersSchema.parse(req.query);
    
    // Busca dos contratos através do service
    const result = await contractService.findMany(filters);
    
    res.json({
      success: true,
      data: result.data,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
        hasNext: result.hasNext,
        hasPrevious: result.hasPrevious
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Parâmetros de busca inválidos',
        details: error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }))
      });
    }
    
    console.error('Erro ao buscar contratos:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * GET /api/contracts/:id
 * Busca um contrato específico por ID
 * 
 * @param id - ID do contrato
 * @returns ContractWithRelations - Contrato com relacionamentos
 */
contractRoutes.get('/:id', async (req, res) => {
  try {
    // Validação do parâmetro ID
    const { id } = idParamSchema.parse(req.params);
    
    // Busca do contrato através do service
    const contract = await contractService.findById(id);
    
    if (!contract) {
      return res.status(404).json({
        success: false,
        error: 'Contrato não encontrado'
      });
    }
    
    res.json({
      success: true,
      data: contract
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'ID inválido',
        details: error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }))
      });
    }
    
    console.error('Erro ao buscar contrato:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * PUT /api/contracts/:id
 * Atualiza um contrato existente
 * 
 * @param id - ID do contrato
 * @body UpdateContract - Dados a serem atualizados
 * @returns Contract - Contrato atualizado
 */
contractRoutes.put('/:id', async (req, res) => {
  try {
    // Validação do parâmetro ID
    const { id } = idParamSchema.parse(req.params);
    
    // Validação do corpo da requisição
    const validatedData: Partial<Contract> = updateContractSchema.parse(req.body);
    
    // Verificar se o contrato existe
    const existingContract = await contractService.findById(id);
    if (!existingContract) {
      return res.status(404).json({
        success: false,
        error: 'Contrato não encontrado'
      });
    }
    
    // Atualização do contrato através do service
    const updatedContract = await contractService.update(id, validatedData);
    
    res.json({
      success: true,
      data: updatedContract,
      message: 'Contrato atualizado com sucesso'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Dados inválidos',
        details: error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }))
      });
    }
    
    console.error('Erro ao atualizar contrato:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * DELETE /api/contracts/:id
 * Remove um contrato
 * 
 * @param id - ID do contrato
 * @returns SuccessMessage - Confirmação da remoção
 */
contractRoutes.delete('/:id', async (req, res) => {
  try {
    // Validação do parâmetro ID
    const { id } = idParamSchema.parse(req.params);
    
    // Verificar se o contrato existe
    const existingContract = await contractService.findById(id);
    if (!existingContract) {
      return res.status(404).json({
        success: false,
        error: 'Contrato não encontrado'
      });
    }
    
    // Verificar se o contrato pode ser removido (sem tickets ativos, etc.)
    const canDelete = await contractService.canDelete(id);
    if (!canDelete.allowed) {
      return res.status(409).json({
        success: false,
        error: 'Contrato não pode ser removido',
        reason: canDelete.reason
      });
    }
    
    // Remoção do contrato através do service
    await contractService.delete(id);
    
    res.json({
      success: true,
      message: 'Contrato removido com sucesso'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'ID inválido',
        details: error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }))
      });
    }
    
    console.error('Erro ao remover contrato:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * GET /api/contracts/:id/sla-rules
 * Busca as regras de SLA de um contrato específico
 * 
 * @param id - ID do contrato
 * @returns SlaRule[] - Lista de regras de SLA
 */
contractRoutes.get('/:id/sla-rules', async (req, res) => {
  try {
    // Validação do parâmetro ID
    const { id } = idParamSchema.parse(req.params);
    
    // Verificar se o contrato existe
    const contract = await contractService.findById(id);
    if (!contract) {
      return res.status(404).json({
        success: false,
        error: 'Contrato não encontrado'
      });
    }
    
    // Busca das regras de SLA através do service
    const slaRules = await contractService.getSlaRules(id);
    
    res.json({
      success: true,
      data: slaRules
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'ID inválido',
        details: error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }))
      });
    }
    
    console.error('Erro ao buscar regras de SLA:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * POST /api/contracts/:id/activate
 * Ativa um contrato
 * 
 * @param id - ID do contrato
 * @returns Contract - Contrato ativado
 */
contractRoutes.post('/:id/activate', async (req, res) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    
    const contract = await contractService.findById(id);
    if (!contract) {
      return res.status(404).json({
        success: false,
        error: 'Contrato não encontrado'
      });
    }
    
    if (contract.isActive) {
      return res.status(400).json({
        success: false,
        error: 'Contrato já está ativo'
      });
    }
    
    const updatedContract = await contractService.update(id, { isActive: true });
    
    res.json({
      success: true,
      data: updatedContract,
      message: 'Contrato ativado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao ativar contrato:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * POST /api/contracts/:id/deactivate
 * Desativa um contrato
 * 
 * @param id - ID do contrato
 * @returns Contract - Contrato desativado
 */
contractRoutes.post('/:id/deactivate', async (req, res) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    
    const contract = await contractService.findById(id);
    if (!contract) {
      return res.status(404).json({
        success: false,
        error: 'Contrato não encontrado'
      });
    }
    
    if (!contract.isActive) {
      return res.status(400).json({
        success: false,
        error: 'Contrato já está inativo'
      });
    }
    
    const updatedContract = await contractService.update(id, { isActive: false });
    
    res.json({
      success: true,
      data: updatedContract,
      message: 'Contrato desativado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao desativar contrato:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

export default contractRoutes;
