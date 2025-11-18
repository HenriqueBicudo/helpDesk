import { Router } from 'express';
import { slaTemplateService } from '../../services/slaTemplate.service';
import { slaService } from '../../services/sla.service';
import { insertSlaTemplateSchema, updateSlaTemplateSchema, type SlaTemplateRule } from '../../../shared/schema/sla_templates';
import { requireAdmin } from '../../middleware/auth';

const router = Router();

/**
 * GET /api/sla/templates
 * Listar todos os templates SLA
 */
router.get('/', async (req, res) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const templates = await slaTemplateService.getAll(includeInactive);
    
    res.json({
      success: true,
      data: templates,
      count: templates.length
    });
  } catch (error) {
    console.error('❌ Erro ao listar templates SLA:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao listar templates SLA'
    });
  }
});

/**
 * GET /api/sla/templates/by-type/:type
 * Listar templates por tipo
 */
router.get('/by-type/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const templates = await slaTemplateService.getByType(type);
    
    res.json({
      success: true,
      data: templates,
      count: templates.length
    });
  } catch (error) {
    console.error('❌ Erro ao listar templates por tipo:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao listar templates por tipo'
    });
  }
});

/**
 * GET /api/sla/templates/:id
 * Buscar template específico por ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const template = await slaTemplateService.getById(id);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template não encontrado'
      });
    }
    
    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('❌ Erro ao buscar template:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar template'
    });
  }
});

/**
 * POST /api/sla/templates
 * Criar novo template SLA (apenas admin)
 */
router.post('/', requireAdmin, async (req, res) => {
  try {
    // Validar dados com Zod
    const validatedData = insertSlaTemplateSchema.omit({ id: true }).parse({
      ...req.body,
      rules: typeof req.body.rules === 'string' 
        ? req.body.rules 
        : slaTemplateService.stringifyRules(req.body.rules)
    });
    
    const newTemplate = await slaTemplateService.create(validatedData);
    
    res.status(201).json({
      success: true,
      data: newTemplate,
      message: 'Template SLA criado com sucesso'
    });
  } catch (error: any) {
    console.error('❌ Erro ao criar template SLA:', error);
    
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Dados inválidos',
        details: error.errors
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Erro ao criar template SLA'
    });
  }
});

/**
 * PUT /api/sla/templates/:id
 * Atualizar template existente (apenas admin)
 */
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validar dados com Zod
    const validatedData = updateSlaTemplateSchema.parse({
      ...req.body,
      rules: req.body.rules 
        ? (typeof req.body.rules === 'string' 
            ? req.body.rules 
            : slaTemplateService.stringifyRules(req.body.rules))
        : undefined
    });
    
    const updated = await slaTemplateService.update(id, validatedData);
    
    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Template não encontrado'
      });
    }
    
    res.json({
      success: true,
      data: updated,
      message: 'Template SLA atualizado com sucesso'
    });
  } catch (error: any) {
    console.error('❌ Erro ao atualizar template SLA:', error);
    
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Dados inválidos',
        details: error.errors
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Erro ao atualizar template SLA'
    });
  }
});

/**
 * DELETE /api/sla/templates/:id
 * Desativar template (soft delete) - apenas admin
 */
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const hardDelete = req.query.hard === 'true';
    
    let success: boolean;
    if (hardDelete) {
      success = await slaTemplateService.delete(id);
    } else {
      success = await slaTemplateService.deactivate(id);
    }
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Template não encontrado'
      });
    }
    
    res.json({
      success: true,
      message: hardDelete 
        ? 'Template SLA deletado permanentemente' 
        : 'Template SLA desativado com sucesso'
    });
  } catch (error) {
    console.error('❌ Erro ao deletar template SLA:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao deletar template SLA'
    });
  }
});

/**
 * POST /api/sla/templates/:templateId/apply/:contractId
 * Aplicar template SLA a um contrato específico
 * Cria todas as regras SLA baseadas no template
 */
router.post('/:templateId/apply/:contractId', requireAdmin, async (req, res) => {
  try {
    const { templateId, contractId } = req.params;
    
    console.log(`🎯 Aplicando template ${templateId} ao contrato ${contractId}...`);
    
    // 1. Buscar template
    const template = await slaTemplateService.getById(templateId);
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template não encontrado'
      });
    }
    
    // 2. Verificar se já existem regras SLA para este contrato
    const existingRules = await slaService.getByContractId(contractId);
    if (existingRules.length > 0) {
      const shouldReplace = req.body.replaceExisting === true;
      
      if (!shouldReplace) {
        return res.status(409).json({
          success: false,
          error: 'Este contrato já possui regras SLA configuradas',
          existingRulesCount: existingRules.length,
          hint: 'Envie replaceExisting: true no body para substituir as regras existentes'
        });
      }
      
      // Deletar regras existentes
      console.log(`🗑️  Deletando ${existingRules.length} regras SLA existentes...`);
      for (const rule of existingRules) {
        await slaService.delete(rule.id);
      }
    }
    
    // 3. Criar regras SLA baseadas no template
    const createdRules = [];
    
    for (const rule of template.rules) {
      console.log(`📝 Criando regra SLA: ${rule.priority} - Resposta: ${rule.responseTimeMinutes}min, Solução: ${rule.solutionTimeMinutes}min`);
      
      const newRule = await slaService.create({
        contractId,
        priority: rule.priority,
        responseTimeMinutes: rule.responseTimeMinutes,
        solutionTimeMinutes: rule.solutionTimeMinutes
      });
      
      createdRules.push(newRule);
    }
    
    console.log(`✅ Template aplicado com sucesso! ${createdRules.length} regras criadas.`);
    
    res.json({
      success: true,
      message: `Template "${template.name}" aplicado com sucesso ao contrato`,
      data: {
        template: {
          id: template.id,
          name: template.name,
          type: template.type
        },
        contractId,
        rulesCreated: createdRules.length,
        rules: createdRules
      }
    });
  } catch (error) {
    console.error('❌ Erro ao aplicar template SLA:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao aplicar template SLA',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

/**
 * GET /api/sla/templates/stats/by-type
 * Estatísticas de templates por tipo
 */
router.get('/stats/by-type', async (req, res) => {
  try {
    const stats = await slaTemplateService.countByType();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('❌ Erro ao buscar estatísticas de templates:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar estatísticas de templates'
    });
  }
});

export default router;
