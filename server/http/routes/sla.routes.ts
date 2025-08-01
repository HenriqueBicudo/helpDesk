import { Router } from 'express';
import { getSlaMonitorJob } from '../../jobs/sla-monitor.job';
import { SlaMonitorService } from '../../services/slaMonitor.service';

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
 * Executa verificação manual de SLA
 */
slaRoutes.post('/monitor/check', async (req, res) => {
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
 * Reinicia o job de monitoramento
 */
slaRoutes.post('/monitor/restart', (req, res) => {
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

export default slaRoutes;
