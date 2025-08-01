import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import SlaConfigurator from '@/components/sla/sla-configurator';
import { SlaMetricsGrid, sampleSlaMetrics } from '@/components/sla/sla-metrics-card';
import { 
  Settings, 
  Shield, 
  Database,
  Activity,
  AlertTriangle,
  BarChart3,
  Zap,
  RefreshCw,
  Play,
  Pause,
  FileText,
  Download,
  Upload,
  Trash2,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSlaConfigurations } from '@/hooks/use-sla';

interface SystemStatus {
  slaEngine: 'running' | 'stopped' | 'error';
  monitoring: 'active' | 'inactive' | 'error';
  alerts: 'working' | 'degraded' | 'failed';
  database: 'healthy' | 'slow' | 'error';
  lastUpdate: string;
}

const SlaAdminDashboard: React.FC = () => {
  const [activeConfigTab, setActiveConfigTab] = useState<'general' | 'templates' | 'system'>('general');
  const [systemStatus] = useState<SystemStatus>({
    slaEngine: 'running',
    monitoring: 'active',
    alerts: 'working',
    database: 'healthy',
    lastUpdate: new Date().toISOString()
  });

  // Buscar configurações SLA
  const { data: configurations, isLoading: configLoading, refetch: refetchConfigs } = useSlaConfigurations();

  const StatusCard: React.FC<{
    title: string;
    status: 'running' | 'stopped' | 'error' | 'active' | 'inactive' | 'working' | 'degraded' | 'failed' | 'healthy' | 'slow';
    description: string;
    actions?: React.ReactNode;
  }> = ({ title, status, description, actions }) => {
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'running':
        case 'active':
        case 'working':
        case 'healthy':
          return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-100';
        case 'degraded':
        case 'slow':
          return 'text-orange-600 bg-orange-100 dark:bg-orange-900 dark:text-orange-100';
        case 'stopped':
        case 'inactive':
          return 'text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-300';
        case 'error':
        case 'failed':
          return 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-100';
        default:
          return 'text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-300';
      }
    };

    const getStatusLabel = (status: string) => {
      switch (status) {
        case 'running': return 'Em Execução';
        case 'active': return 'Ativo';
        case 'working': return 'Funcionando';
        case 'healthy': return 'Saudável';
        case 'degraded': return 'Degradado';
        case 'slow': return 'Lento';
        case 'stopped': return 'Parado';
        case 'inactive': return 'Inativo';
        case 'error': return 'Erro';
        case 'failed': return 'Falhou';
        default: return status;
      }
    };

    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">{title}</h3>
            <Badge className={cn('text-xs', getStatusColor(status))}>
              {getStatusLabel(status)}
            </Badge>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            {description}
          </p>
          {actions && (
            <div className="flex gap-2">
              {actions}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const ConfigurationTemplatesPanel: React.FC = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Templates de Configuração SLA</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Gerencie templates pré-configurados para diferentes tipos de contratos
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-1" />
          Novo Template
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          {
            name: 'Suporte Básico',
            description: 'Template para contratos de suporte básico',
            responseTime: '8h',
            resolutionTime: '72h',
            usage: 12
          },
          {
            name: 'Suporte Premium',
            description: 'Template para contratos premium',
            responseTime: '2h',
            resolutionTime: '24h',
            usage: 8
          },
          {
            name: 'Suporte Crítico',
            description: 'Template para serviços críticos',
            responseTime: '30min',
            resolutionTime: '4h',
            usage: 3
          }
        ].map((template, index) => (
          <Card key={index}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{template.name}</CardTitle>
              <CardDescription>{template.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Resposta</p>
                  <p className="font-medium">{template.responseTime}</p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Resolução</p>
                  <p className="font-medium">{template.resolutionTime}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {template.usage} contratos usando
                </span>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline">
                    Editar
                  </Button>
                  <Button size="sm" variant="outline">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const SystemManagementPanel: React.FC = () => (
    <div className="space-y-6">
      {/* System Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatusCard
          title="Motor SLA"
          status={systemStatus.slaEngine}
          description="Serviço responsável pelo cálculo automático de prazos SLA"
          actions={
            <>
              <Button size="sm" variant="outline">
                <Play className="h-3 w-3 mr-1" />
                Iniciar
              </Button>
              <Button size="sm" variant="outline">
                <Pause className="h-3 w-3 mr-1" />
                Parar
              </Button>
            </>
          }
        />

        <StatusCard
          title="Monitoramento"
          status={systemStatus.monitoring}
          description="Monitoramento contínuo de violações e alertas SLA"
          actions={
            <>
              <Button size="sm" variant="outline">
                <RefreshCw className="h-3 w-3 mr-1" />
                Reiniciar
              </Button>
            </>
          }
        />

        <StatusCard
          title="Sistema de Alertas"
          status={systemStatus.alerts}
          description="Notificações automáticas por email e sistema"
          actions={
            <>
              <Button size="sm" variant="outline">
                Configurar
              </Button>
            </>
          }
        />

        <StatusCard
          title="Base de Dados"
          status={systemStatus.database}
          description="Performance e integridade da base de dados SLA"
          actions={
            <>
              <Button size="sm" variant="outline">
                <Activity className="h-3 w-3 mr-1" />
                Verificar
              </Button>
            </>
          }
        />
      </div>

      {/* Backup & Restore */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Database className="h-5 w-5" />
            Backup e Restauração
          </CardTitle>
          <CardDescription>
            Gerencie backups das configurações SLA
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-1" />
              Exportar Configurações
            </Button>
            <Button variant="outline">
              <Upload className="h-4 w-4 mr-1" />
              Importar Configurações
            </Button>
            <Button variant="outline">
              <FileText className="h-4 w-4 mr-1" />
              Gerar Relatório Completo
            </Button>
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Último backup realizado em 15/01/2024 às 14:30. 
              Recomendamos realizar backups semanalmente.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Logs and Monitoring */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Logs do Sistema
          </CardTitle>
          <CardDescription>
            Últimas atividades do sistema SLA
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {[
              { time: '14:35:22', level: 'INFO', message: 'Motor SLA executado com sucesso - 45 tickets processados' },
              { time: '14:30:15', level: 'WARN', message: 'Ticket #1234 próximo da violação de SLA (30 min restantes)' },
              { time: '14:25:08', level: 'INFO', message: 'Configuração SLA atualizada para contrato EMPRESA-A' },
              { time: '14:20:33', level: 'ERROR', message: 'Falha ao enviar alerta por email para ticket #5678' },
              { time: '14:15:45', level: 'INFO', message: 'Backup automático das configurações SLA concluído' },
              { time: '14:10:12', level: 'INFO', message: 'Sistema de monitoramento reiniciado' }
            ].map((log, index) => (
              <div key={index} className="flex items-center gap-3 p-2 rounded text-sm font-mono">
                <span className="text-gray-500 w-16">{log.time}</span>
                <Badge 
                  variant={log.level === 'ERROR' ? 'destructive' : log.level === 'WARN' ? 'secondary' : 'outline'}
                  className="w-16 text-xs"
                >
                  {log.level}
                </Badge>
                <span className="flex-1">{log.message}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Administração SLA</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Configuração avançada e monitoramento do sistema SLA
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => refetchConfigs()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-1" />
            Atualizar
          </Button>
          <Button variant="outline" size="sm">
            <Shield className="h-4 w-4 mr-1" />
            Auditoria
          </Button>
        </div>
      </div>

      {/* System Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Settings className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Configurações Ativas</p>
                <p className="text-xl font-bold">{configurations?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <Zap className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Motor SLA</p>
                <p className="text-xl font-bold text-green-600">Ativo</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Alertas Pendentes</p>
                <p className="text-xl font-bold text-orange-600">12</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <BarChart3 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Compliance Médio</p>
                <p className="text-xl font-bold text-purple-600">94.5%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Configuration Tabs */}
      <Tabs value={activeConfigTab} onValueChange={(value) => setActiveConfigTab(value as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general">Configuração Geral</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="system">Sistema</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <SlaConfigurator 
            onSave={(config) => {
              console.log('Salvando configuração:', config);
              // Implementar salvamento
            }}
            isLoading={configLoading}
          />
        </TabsContent>

        <TabsContent value="templates">
          <ConfigurationTemplatesPanel />
        </TabsContent>

        <TabsContent value="system">
          <SystemManagementPanel />
        </TabsContent>
      </Tabs>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Métricas de Performance do Sistema
          </CardTitle>
          <CardDescription>
            Indicadores de performance e saúde do sistema SLA
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SlaMetricsGrid 
            metrics={sampleSlaMetrics}
            columns={4}
            size="sm"
            showTrend={true}
            showTarget={true}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default SlaAdminDashboard;
