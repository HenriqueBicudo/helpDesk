import { Router, Request, Response } from 'express';
import { slaV2Service } from '../../services/slaV2.service.js';
import { slaTemplateService } from '../../services/slaTemplate.service.js';
import { requireAuth, requirePermission, requireAdmin } from '../../middleware/auth.js';
import { z } from 'zod';
import { db } from '../../db-postgres.js';
import { slaTemplates, businessCalendars, slaCalculations } from '../../../shared/schema/sla_v2.js';
import { tickets } from '../../../shared/drizzle-schema.js';
import { eq, sql, desc, and, gte } from 'drizzle-orm';

const router = Router();

// =============================================================================
// TEMPLATES SLA V2
// =============================================================================

/**
 * GET /api/sla/v2/templates
 * Lista todos os templates SLA disponíveis
 */
router.get('/templates', requireAuth, async (req: Request, res: Response) => {
  try {
    const onlyActive = req.query.active === 'true';
    const templates = await slaV2Service.getAllSlaTemplates({ onlyActive });
    res.json({
      success: true,
      data: templates,
      count: templates.length,
    });
  } catch (error) {
    console.error('Erro ao listar templates SLA V2:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/sla/v2/templates/:id
 * Busca template SLA específico com suas regras
 */
router.get('/templates/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const templateId = Number(req.params.id);
    
    if (isNaN(templateId)) {
      return res.status(400).json({
        success: false,
        message: 'ID do template inválido',
      });
    }
    
    const template = await slaV2Service.getSlaTemplateWithRules(templateId);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template SLA não encontrado',
      });
    }
    
    res.json({
      success: true,
      data: template,
    });
  } catch (error) {
    console.error('Erro ao buscar template SLA V2:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /api/sla/v2/templates
 * Criar novo template SLA (apenas admin)
 */
router.post('/templates', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, description, type, rules } = req.body;

    // Validação básica
    if (!name || !type || !rules) {
      return res.status(400).json({
        success: false,
        message: 'Nome, tipo e regras são obrigatórios',
      });
    }

    const template = await slaTemplateService.create({
      name,
      description: description || '',
      contractType: type, // Frontend envia 'type', banco usa 'contractType'
      rules: JSON.stringify(rules),
      isActive: 1
    });

    res.status(201).json({
      success: true,
      data: template,
      message: 'Template criado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao criar template SLA V2:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * PUT /api/sla/v2/templates/:id
 * Atualizar template SLA existente (apenas admin)
 */
router.put('/templates/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const templateId = Number(req.params.id);
    const { name, description, type, rules } = req.body;

    if (isNaN(templateId)) {
      return res.status(400).json({
        success: false,
        message: 'ID do template inválido',
      });
    }

    const template = await slaTemplateService.update(templateId, {
      name,
      description,
      contractType: type, // Frontend envia 'type', banco usa 'contractType'
      rules: JSON.stringify(rules)
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template não encontrado',
      });
    }

    res.json({
      success: true,
      data: template,
      message: 'Template atualizado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao atualizar template SLA V2:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * DELETE /api/sla/v2/templates/:id
 * Deletar template SLA (apenas admin)
 */
router.delete('/templates/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    console.log(`🗑️ [SLA V2] Iniciando DELETE de template ID: ${req.params.id}`);
    
    const templateId = Number(req.params.id);

    if (isNaN(templateId)) {
      console.log(`❌ [SLA V2] ID inválido: ${req.params.id}`);
      return res.status(400).json({
        success: false,
        message: 'ID do template inválido',
      });
    }

    console.log(`🔍 [SLA V2] Chamando slaTemplateService.delete(${templateId})`);
    const result = await slaTemplateService.delete(templateId);
    console.log(`📊 [SLA V2] Resultado do delete: ${result}`);

    if (!result) {
      console.log(`❌ [SLA V2] Template ${templateId} não encontrado`);
      return res.status(404).json({
        success: false,
        message: 'Template não encontrado',
      });
    }

    console.log(`✅ [SLA V2] Template ${templateId} deletado com sucesso`);
    res.json({
      success: true,
      message: 'Template deletado com sucesso'
    });
  } catch (error) {
    console.error('🚨 [SLA V2] Erro ao deletar template:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// =============================================================================
// CALENDÁRIOS DE NEGÓCIO V2
// =============================================================================

/**
 * GET /api/sla/v2/calendars
 * Lista todos os calendários de negócio disponíveis
 */
router.get('/calendars', requireAuth, async (req: Request, res: Response) => {
  try {
    const calendars = await slaV2Service.getAllBusinessCalendars();
    res.json({
      success: true,
      data: calendars,
      count: calendars.length,
    });
  } catch (error) {
    console.error('Erro ao listar calendários V2:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/sla/v2/calendars/:id
 * Busca calendário específico com configurações completas
 */
router.get('/calendars/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const calendarId = Number(req.params.id);
    
    if (isNaN(calendarId)) {
      return res.status(400).json({
        success: false,
        message: 'ID do calendário inválido',
      });
    }
    
    const calendar = await slaV2Service.getBusinessCalendarWithConfig(calendarId);
    
    if (!calendar) {
      return res.status(404).json({
        success: false,
        message: 'Calendário não encontrado',
      });
    }
    
    res.json({
      success: true,
      data: calendar,
    });
  } catch (error) {
    console.error('Erro ao buscar calendário V2:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// =============================================================================
// CÁLCULOS SLA V2
// =============================================================================

/**
 * GET /api/sla/v2/calculations/:ticketId
 * Busca histórico completo de cálculos SLA de um ticket
 */
router.get('/calculations/:ticketId', requireAuth, async (req: Request, res: Response) => {
  try {
    const ticketId = Number(req.params.ticketId);
    
    if (isNaN(ticketId)) {
      return res.status(400).json({
        success: false,
        message: 'ID do ticket inválido',
      });
    }
    
    const history = await slaV2Service.getSlaHistory(ticketId);
    
    res.json({
      success: true,
      data: history,
      count: history.length,
    });
  } catch (error) {
    console.error('Erro ao buscar histórico SLA V2:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /api/sla/v2/calculations/:ticketId/recalculate
 * Recalcula SLA de um ticket específico
 */
router.post('/calculations/:ticketId/recalculate', requireAuth, async (req: Request, res: Response) => {
  try {
    const ticketId = Number(req.params.ticketId);
    const { reason } = req.body;
    
    if (isNaN(ticketId)) {
      return res.status(400).json({
        success: false,
        message: 'ID do ticket inválido',
      });
    }
    
    if (!reason || typeof reason !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Motivo do recálculo é obrigatório',
      });
    }
    
    const result = await slaV2Service.recalculateTicketSla(ticketId, reason);
    
    res.json({
      success: true,
      message: 'SLA recalculado com sucesso',
      data: {
        ticketId,
        reason,
        responseDueAt: result.responseDueAt,
        solutionDueAt: result.solutionDueAt,
        escalationDueAt: result.escalationDueAt,
        templateId: result.templateId,
        calendarId: result.calendarId,
      },
    });
  } catch (error) {
    console.error('Erro ao recalcular SLA V2:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao recalcular SLA',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /api/sla/v2/calculations/calculate
 * Calcula SLA para um contexto específico (sem salvar no banco)
 */
const calculateSlaSchema = z.object({
  priority: z.enum(['low', 'medium', 'high', 'urgent', 'critical']),
  contractId: z.number().int().positive().optional(),
  companyId: z.number().int().positive().optional(),
  createdAt: z.string().datetime().optional(),
});

router.post('/calculations/calculate', requireAuth, async (req: Request, res: Response) => {
  try {
    const data = calculateSlaSchema.parse(req.body);
    
    const mockContext = {
      ticketId: 0, // ID fictício para cálculo
      priority: data.priority,
      contractId: data.contractId,
      companyId: data.companyId,
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
    };
    
    // Esta função calculará SLA mas não salvará no banco
    // Precisamos criar uma versão que não salve
    const result = await slaV2Service.calculateTicketSla(mockContext);
    
    res.json({
      success: true,
      message: 'SLA calculado com sucesso',
      data: {
        priority: data.priority,
        responseDueAt: result.responseDueAt,
        solutionDueAt: result.solutionDueAt,
        escalationDueAt: result.escalationDueAt,
        templateId: result.templateId,
        calendarId: result.calendarId,
        businessMinutesUsed: result.businessMinutesUsed,
      },
    });
  } catch (error) {
    console.error('Erro ao calcular SLA V2:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Dados de entrada inválidos',
        errors: error.errors,
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Erro ao calcular SLA',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// =============================================================================
// ESTATÍSTICAS E RELATÓRIOS
// =============================================================================

/**
 * GET /api/sla/v2/stats
 * Estatísticas gerais do sistema SLA V2
 */
router.get('/stats', requireAuth, async (req: Request, res: Response) => {
  try {
    const [templates, calendars] = await Promise.all([
      slaV2Service.getAllSlaTemplates(),
      slaV2Service.getAllBusinessCalendars(),
    ]);
    
    const stats = {
      templates: {
        total: templates.length,
        byType: templates.reduce((acc, template) => {
          acc[template.contractType] = (acc[template.contractType] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        defaults: templates.filter(t => t.isDefault).length,
      },
      calendars: {
        total: calendars.length,
        withHolidays: calendars.filter(c => c.skipHolidays).length,
        withWeekends: calendars.filter(c => c.skipWeekends).length,
      },
    };
    
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas SLA V2:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// =============================================================================
// ESTATÍSTICAS SLA V2
// =============================================================================

/**
 * GET /api/sla/v2/statistics
 * Retorna estatísticas gerais do sistema SLA V2
 */
router.get('/statistics', requireAuth, async (req: Request, res: Response) => {
  try {
    // Buscar contagem de templates
    const templatesCount = await db.select({ count: sql<number>`count(*)::int` })
      .from(slaTemplates);
    const activeTemplatesCount = await db.select({ count: sql<number>`count(*)::int` })
      .from(slaTemplates)
      .where(eq(slaTemplates.isActive, 1));

    // Buscar contagem de calendários (não possui campo isActive)
    const calendarsCount = await db.select({ count: sql<number>`count(*)::int` })
      .from(businessCalendars);

    // Buscar contagem de cálculos
    const calculationsCount = await db.select({ count: sql<number>`count(*)::int` })
      .from(slaCalculations);

    // Cálculos de hoje
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = new Date(today); // Clonar o objeto Date
    const todayCalculationsCount = await db.select({ count: sql<number>`count(*)::int` })
      .from(slaCalculations)
      .where(gte(slaCalculations.calculatedAt, todayStart));

    // Buscar tickets com SLA definido
    const ticketsWithSla = await db.select({
      id: tickets.id,
      responseDueAt: tickets.responseDueAt,
      solutionDueAt: tickets.solutionDueAt,
      status: tickets.status,
      createdAt: tickets.createdAt,
    })
    .from(tickets)
    .where(sql`${tickets.responseDueAt} IS NOT NULL`);

    const now = new Date();
    let breachedTickets = 0;
    let nearBreachTickets = 0;
    let totalResponseTime = 0;
    let totalSolutionTime = 0;
    let completedTickets = 0;

    ticketsWithSla.forEach(ticket => {
      const responseDue = ticket.responseDueAt ? new Date(ticket.responseDueAt) : null;
      const solutionDue = ticket.solutionDueAt ? new Date(ticket.solutionDueAt) : null;
      
      // Contar violações (prazo vencido)
      if (responseDue && responseDue < now && !['resolved', 'closed'].includes(ticket.status)) {
        breachedTickets++;
      }
      
      // Contar tickets próximos ao vencimento (menos de 1 hora)
      if (responseDue && responseDue > now && !['resolved', 'closed'].includes(ticket.status)) {
        const timeRemaining = responseDue.getTime() - now.getTime();
        if (timeRemaining < 3600000) { // 1 hora
          nearBreachTickets++;
        }
      }

      // Calcular tempos médios para tickets fechados
      if (['resolved', 'closed'].includes(ticket.status)) {
        completedTickets++;
        
        if (responseDue) {
          const responseTime = responseDue.getTime() - new Date(ticket.createdAt).getTime();
          totalResponseTime += responseTime / 60000; // converter para minutos
        }
        
        if (solutionDue) {
          const solutionTime = solutionDue.getTime() - new Date(ticket.createdAt).getTime();
          totalSolutionTime += solutionTime / 60000; // converter para minutos
        }
      }
    });

    const averageResponseTime = completedTickets > 0 ? totalResponseTime / completedTickets : 0;
    const averageSolutionTime = completedTickets > 0 ? totalSolutionTime / completedTickets : 0;
    
    // Calcular compliance rate (tickets que não violaram SLA)
    const totalTicketsWithSla = ticketsWithSla.length;
    const complianceRate = totalTicketsWithSla > 0 
      ? ((totalTicketsWithSla - breachedTickets) / totalTicketsWithSla) * 100 
      : 100;

    const stats = {
      totalTemplates: templatesCount[0]?.count || 0,
      activeTemplates: activeTemplatesCount[0]?.count || 0,
      totalCalendars: calendarsCount[0]?.count || 0,
      activeCalendars: calendarsCount[0]?.count || 0, // Todos calendários são considerados ativos
      totalCalculations: calculationsCount[0]?.count || 0,
      todayCalculations: todayCalculationsCount[0]?.count || 0,
      complianceRate: Math.round(complianceRate * 10) / 10,
      averageResponseTime: Math.round(averageResponseTime),
      averageSolutionTime: Math.round(averageSolutionTime),
      breachedTickets,
      nearBreachTickets,
    };
    
    res.json({
      success: true,
      data: stats,
      message: 'Estatísticas SLA V2 carregadas com sucesso'
    });
  } catch (error) {
    console.error('Erro ao carregar estatísticas SLA V2:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// =============================================================================
// LISTAGEM DE CÁLCULOS SLA V2
// =============================================================================

/**
 * GET /api/sla/v2/calculations
 * Lista cálculos SLA com filtros e paginação
 */
router.get('/calculations', requireAuth, async (req: Request, res: Response) => {
  try {
    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;
    const ticketId = req.query.ticketId ? Number(req.query.ticketId) : undefined;
    const templateId = req.query.templateId ? Number(req.query.templateId) : undefined;
    
    // Construir query base
    let query = db.select({
      id: slaCalculations.id,
      ticketId: slaCalculations.ticketId,
      slaTemplateId: slaCalculations.slaTemplateId,
      calendarId: slaCalculations.calendarId,
      priority: slaCalculations.priority,
      responseDueAt: slaCalculations.responseDueAt,
      solutionDueAt: slaCalculations.solutionDueAt,
      calculatedAt: slaCalculations.calculatedAt,
      templateName: slaTemplates.name,
      calendarName: businessCalendars.name,
    })
    .from(slaCalculations)
    .leftJoin(slaTemplates, eq(slaCalculations.slaTemplateId, slaTemplates.id))
    .leftJoin(businessCalendars, eq(slaCalculations.calendarId, businessCalendars.id))
    .orderBy(desc(slaCalculations.calculatedAt))
    .limit(limit)
    .offset(offset);

    // Aplicar filtros
    const conditions = [];
    if (ticketId) {
      conditions.push(eq(slaCalculations.ticketId, ticketId));
    }
    if (templateId) {
      conditions.push(eq(slaCalculations.slaTemplateId, templateId));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const calculations = await query;
    
    // Buscar contagem total
    let countQuery = db.select({ count: sql<number>`count(*)::int` })
      .from(slaCalculations);
    
    if (conditions.length > 0) {
      countQuery = countQuery.where(and(...conditions)) as any;
    }
    
    const countResult = await countQuery;
    const totalCount = countResult[0]?.count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      success: true,
      data: calculations,
      pagination: {
        total: totalCount,
        limit,
        offset,
        pages: totalPages
      }
    });
  } catch (error) {
    console.error('Erro ao listar cálculos SLA V2:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

export { router as slaV2Routes };