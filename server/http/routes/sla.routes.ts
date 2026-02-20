import { Router } from 'express';
import { getSlaMonitorJob } from '../../jobs/sla-monitor.job';
import { SlaMonitorService } from '../../services/slaMonitor.service';
import { slaService } from '../../services/sla.service';
import { db } from '../../db-postgres';
import { slaRules } from '../../../shared/schema/sla_rules';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '../../middleware/auth';

/**
 * Rotas para monitoramento e controle do sistema SLA
 */
export const slaRoutes = Router();
const slaMonitorService = new SlaMonitorService();

/**
 * GET /api/sla/stats
 * Obtém estatísticas atuais do SLA
 */
slaRoutes.get('/stats', async (req, res) => {
  try {
    const stats = await slaMonitorService.getSlaStats();
    
    res.json({
      success: true,
      data: {
        ...stats,
        timestamp: new Date().toISOString(),
        message: 'Estatísticas de SLA obtidas com sucesso'
      }
    });
  } catch (error) {
    console.error('Erro ao obter estatísticas SLA:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * GET /api/sla/monitor/status
 * Obtém status do job de monitoramento
 */
slaRoutes.get('/monitor/status', (req, res) => {
  try {
    const slaJob = getSlaMonitorJob();
    const jobInfo = slaJob.getJobInfo();
    
    res.json({
      success: true,
      data: {
        ...jobInfo,
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Erro ao obter status do monitor SLA:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * POST /api/sla/monitor/check
 * Executa verificação manual de SLA (apenas admin)
 */
slaRoutes.post('/monitor/check', requireAdmin, async (req, res) => {
  try {
    console.log('🧪 Iniciando verificação manual de SLA via API...');
    
    const slaJob = getSlaMonitorJob();
    await slaJob.runManual();
    
    const stats = await slaMonitorService.getSlaStats();
    
    res.json({
      success: true,
      data: {
        message: 'Verificação manual de SLA executada com sucesso',
        stats,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Erro na verificação manual de SLA:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao executar verificação manual',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

/**
 * POST /api/sla/monitor/restart
 * Reinicia o job de monitoramento (apenas admin)
 */
slaRoutes.post('/monitor/restart', requireAdmin, (req, res) => {
  try {
    console.log('🔄 Reiniciando job de monitoramento SLA via API...');
    
    const slaJob = getSlaMonitorJob();
    slaJob.restart();
    
    res.json({
      success: true,
      data: {
        message: 'Job de monitoramento SLA reiniciado com sucesso',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Erro ao reiniciar monitor SLA:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao reiniciar monitoramento'
    });
  }
});

/**
 * GET /api/sla/configurations
 * Obtém todas as regras/configurações SLA disponíveis
 */
slaRoutes.get('/configurations', async (req, res) => {
  try {
    console.log('📋 [API] Buscando configurações SLA no banco de dados...');
    
    // Extrair filtros da query string
    const contractId = req.query.contractId as string | undefined;
    
    // Validar prioridade se fornecida
    const validPriorities = ['low', 'medium', 'high', 'urgent', 'critical'] as const;
    type ValidPriority = typeof validPriorities[number];
    const priorityParam = req.query.priority as string;
    const priority = (priorityParam && validPriorities.includes(priorityParam as ValidPriority)) 
      ? priorityParam as ValidPriority 
      : undefined;
    
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    
    const filters = {
      contractId,
      priority,
      page,
      limit,
    };

    // Buscar configurações SLA com dados dos contratos relacionados
    const configurations = await slaService.getConfigurationsWithContracts(filters);
    
    // Usar o comprimento das configurações como total temporariamente
    const total = configurations.length;
    
    console.log(`📋 [API] Retornando ${configurations.length} configurações SLA`);
    
    res.json({
      success: true,
      data: configurations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      meta: {
        message: 'Configurações SLA obtidas com sucesso',
        timestamp: new Date().toISOString(),
      }
    });
  } catch (error) {
    console.error('Erro ao obter configurações SLA:', error);
    
    // Em caso de erro, tentar retornar dados básicos sem causar falha na aplicação
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar configurações SLA',
      details: errorMessage,
      data: [], // Array vazio para manter compatibilidade com o frontend
      meta: {
        timestamp: new Date().toISOString(),
      }
    });
  }
});

/**
 * POST /api/sla/configurations
 * Cria uma nova regra/configuração SLA (apenas admin)
 */
slaRoutes.post('/configurations', requireAdmin, async (req, res) => {
  try {
    console.log('➕ [API] Criando nova configuração SLA...');
    
    const newConfiguration = await slaService.create(req.body);
    
    console.log(`✅ [API] Configuração SLA criada: ID ${newConfiguration.id}`);
    
    res.status(201).json({
      success: true,
      data: newConfiguration,
      meta: {
        message: 'Configuração SLA criada com sucesso',
        timestamp: new Date().toISOString(),
      }
    });
  } catch (error) {
    console.error('Erro ao criar configuração SLA:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    
    res.status(400).json({
      success: false,
      error: 'Erro ao criar configuração SLA',
      details: errorMessage,
      meta: {
        timestamp: new Date().toISOString(),
      }
    });
  }
});

/**
 * GET /api/sla/configurations/:id
 * Obtém uma configuração SLA específica por ID
 */
slaRoutes.get('/configurations/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID inválido',
        meta: { timestamp: new Date().toISOString() }
      });
    }
    
    console.log(`📋 [API] Buscando configuração SLA ${id}...`);
    
    const configuration = await slaService.getById(id);
    
    if (!configuration) {
      return res.status(404).json({
        success: false,
        error: 'Configuração SLA não encontrada',
        meta: { timestamp: new Date().toISOString() }
      });
    }
    
    console.log(`📋 [API] Configuração SLA ${id} encontrada`);
    
    res.json({
      success: true,
      data: configuration,
      meta: {
        message: 'Configuração SLA obtida com sucesso',
        timestamp: new Date().toISOString(),
      }
    });
  } catch (error) {
    console.error('Erro ao buscar configuração SLA:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar configuração SLA',
      details: errorMessage,
      meta: { timestamp: new Date().toISOString() }
    });
  }
});

/**
 * PUT /api/sla/configurations/:id
 * Atualiza uma configuração SLA existente (apenas admin)
 */
slaRoutes.put('/configurations/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID inválido',
        meta: { timestamp: new Date().toISOString() }
      });
    }
    
    console.log(`✏️ [API] Atualizando configuração SLA ${id}...`);
    
    const updatedConfiguration = await slaService.update(id, req.body);
    
    if (!updatedConfiguration) {
      return res.status(404).json({
        success: false,
        error: 'Configuração SLA não encontrada',
        meta: { timestamp: new Date().toISOString() }
      });
    }
    
    console.log(`✅ [API] Configuração SLA ${id} atualizada`);
    
    res.json({
      success: true,
      data: updatedConfiguration,
      meta: {
        message: 'Configuração SLA atualizada com sucesso',
        timestamp: new Date().toISOString(),
      }
    });
  } catch (error) {
    console.error('Erro ao atualizar configuração SLA:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    
    res.status(400).json({
      success: false,
      error: 'Erro ao atualizar configuração SLA',
      details: errorMessage,
      meta: { timestamp: new Date().toISOString() }
    });
  }
});

/**
 * DELETE /api/sla/configurations/:id
 * Remove uma configuração SLA (apenas admin)
 */
slaRoutes.delete('/configurations/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID inválido',
        meta: { timestamp: new Date().toISOString() }
      });
    }
    
    console.log(`🗑️ [API] Removendo configuração SLA ${id}...`);
    
    const wasDeleted = await slaService.delete(id);
    
    if (!wasDeleted) {
      return res.status(404).json({
        success: false,
        error: 'Configuração SLA não encontrada',
        meta: { timestamp: new Date().toISOString() }
      });
    }
    
    console.log(`✅ [API] Configuração SLA ${id} removida`);
    
    res.status(204).send(); // No content
  } catch (error) {
    console.error('Erro ao remover configuração SLA:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    
    res.status(500).json({
      success: false,
      error: 'Erro ao remover configuração SLA',
      details: errorMessage,
      meta: { timestamp: new Date().toISOString() }
    });
  }
});

/**
 * GET /api/sla/contracts/:contractId/configurations
 * Obtém todas as regras SLA de um contrato específico
 */
slaRoutes.get('/contracts/:contractId/configurations', async (req, res) => {
  try {
    const contractId = req.params.contractId as string;
    
    if (!contractId || contractId.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'ID do contrato inválido',
        meta: { timestamp: new Date().toISOString() }
      });
    }
    
    console.log(`📋 [API] Buscando configurações SLA do contrato ${contractId}...`);
    
    const configurations = await slaService.getByContractId(contractId);
    
    console.log(`📋 [API] Encontradas ${configurations.length} configurações para o contrato ${contractId}`);
    
    res.json({
      success: true,
      data: configurations,
      meta: {
        message: `Configurações SLA do contrato ${contractId} obtidas com sucesso`,
        timestamp: new Date().toISOString(),
        contractId,
        count: configurations.length,
      }
    });
  } catch (error) {
    console.error('Erro ao buscar configurações SLA do contrato:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar configurações SLA do contrato',
      details: errorMessage,
      meta: { timestamp: new Date().toISOString() }
    });
  }
});

/**
 * GET /api/sla/health
 * Health check do sistema SLA
 */
slaRoutes.get('/health', async (req, res) => {
  try {
    const slaJob = getSlaMonitorJob();
    const jobInfo = slaJob.getJobInfo();
    const stats = await slaMonitorService.getSlaStats();
    
    // Determinar saúde geral do sistema
    const isHealthy = jobInfo.isActive && stats.total >= 0;
    const statusCode = isHealthy ? 200 : 503;
    
    res.status(statusCode).json({
      success: isHealthy,
      data: {
        status: isHealthy ? 'healthy' : 'unhealthy',
        monitor: {
          active: jobInfo.isActive,
          running: jobInfo.isRunning
        },
        statistics: stats,
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      }
    });
  } catch (error) {
    console.error('Erro no health check SLA:', error);
    res.status(503).json({
      success: false,
      data: {
        status: 'unhealthy',
        error: 'Sistema SLA não disponível'
      }
    });
  }
});

/**
 * GET /api/sla/rules
 * Obtém lista simplificada das regras SLA para seleção em formulários
 */
slaRoutes.get('/rules', async (req, res) => {
  try {
    console.log('📋 [API] Buscando regras SLA para seleção...');
    
    const rules = await db
      .select({
        id: slaRules.id,
        priority: slaRules.priority,
        responseTimeMinutes: slaRules.responseTimeMinutes,
        solutionTimeMinutes: slaRules.solutionTimeMinutes,
        contractId: slaRules.contractId,
      })
      .from(slaRules)
      .orderBy(slaRules.priority);
    
    // Transformar em formato adequado para select
    const formattedRules = rules.map(rule => ({
      id: rule.id,
      name: `${rule.priority.toUpperCase()} - Resposta: ${rule.responseTimeMinutes}min, Solução: ${rule.solutionTimeMinutes}min`,
      priority: rule.priority,
      responseTimeMinutes: rule.responseTimeMinutes,
      solutionTimeMinutes: rule.solutionTimeMinutes,
      contractId: rule.contractId,
    }));
    
    console.log(`📋 [API] Retornando ${formattedRules.length} regras SLA`);
    
    res.json({
      success: true,
      data: formattedRules,
      meta: {
        message: 'Regras SLA obtidas com sucesso',
        timestamp: new Date().toISOString(),
      }
    });
  } catch (error) {
    console.error('Erro ao obter regras SLA:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar regras SLA',
      details: errorMessage,
      data: [],
      meta: {
        timestamp: new Date().toISOString(),
      }
    });
  }
});

/**
 * GET /api/sla/metrics
 * Obtém métricas de SLA para dashboards
 */
slaRoutes.get('/metrics', async (req, res) => {
  try {
    console.log('📊 [API] Buscando métricas SLA...');
    const useMock = process.env.MOCK_DATA === 'true';

    if (useMock) {
      // Mock data por enquanto
      const mockMetrics = {
        totalTickets: 150,
        slaCompliance: 85.5,
        averageResponseTime: 45,
        averageResolutionTime: 180,
        breachedTickets: 22,
        pendingTickets: 38,
      };

      return res.json({
        success: true,
        data: mockMetrics,
        meta: {
          message: 'Métricas SLA obtidas com sucesso (mock)',
          timestamp: new Date().toISOString(),
        }
      });
    }

    // Se MOCK_DATA !== 'true', retornar array vazio conforme regra de refatoração
    res.json({
      success: true,
      data: [],
      meta: {
        message: 'Métricas SLA não disponíveis (modo produção)',
        timestamp: new Date().toISOString(),
      }
    });
  } catch (error) {
    console.error('Erro ao obter métricas SLA:', error);
    
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar métricas SLA',
      meta: {
        timestamp: new Date().toISOString(),
      }
    });
  }
});

/**
 * GET /api/sla/alerts
 * Obtém alertas de SLA não reconhecidos
 */
slaRoutes.get('/alerts', async (req, res) => {
  try {
    console.log('🚨 [API] Buscando alertas SLA...');
    
    const acknowledged = req.query.acknowledged === 'true';
    const limit = parseInt(req.query.limit as string) || 10;
    const useMock = process.env.MOCK_DATA === 'true';

    if (useMock) {
      const mockAlerts = [
        {
          id: 1,
          ticketId: 123,
          type: 'breach',
          message: 'SLA violado - Ticket #123',
          acknowledged: false,
          createdAt: new Date().toISOString(),
        },
        {
          id: 2,
          ticketId: 124,
          type: 'warning',
          message: 'SLA próximo do vencimento - Ticket #124',
          acknowledged: false,
          createdAt: new Date().toISOString(),
        },
      ].slice(0, limit);

      return res.json({
        success: true,
        data: mockAlerts,
        meta: {
          message: 'Alertas SLA obtidos com sucesso (mock)',
          timestamp: new Date().toISOString(),
        }
      });
    }

    // Se MOCK_DATA !== 'true', retornar array vazio para compatibilidade com front-end
    res.json({
      success: true,
      data: [],
      meta: {
        message: 'Alertas SLA não disponíveis (modo produção)',
        timestamp: new Date().toISOString(),
      }
    });
  } catch (error) {
    console.error('Erro ao obter alertas SLA:', error);
    
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar alertas SLA',
      meta: {
        timestamp: new Date().toISOString(),
      }
    });
  }
});

export default slaRoutes;
