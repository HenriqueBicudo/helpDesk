import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SlaV2MetricsGrid } from '@/components/sla/sla-metrics-grid';
import { SlaTemplatesManager } from '@/components/sla/sla-templates-manager';
import { AppLayout } from '@/components/layout/app-layout';
import { 
  Settings, 
  BarChart3,
  Zap,
  Activity,
  FileText,
  RefreshCw,
  Play,
  Pause
} from 'lucide-react';
import { useSlaV2Statistics, useSlaV2Templates, useSlaV2Calendars } from '@/hooks/use-sla-v2';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface SystemStatus {
  slaEngine: 'running' | 'stopped' | 'error';
  monitoring: 'active' | 'inactive' | 'error';
  alerts: 'working' | 'degraded' | 'failed';
  database: 'healthy' | 'slow' | 'error';
  lastUpdate: string;
}

const SlaAdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'templates' | 'system'>('overview');
  const [systemStatus] = useState<SystemStatus>({
    slaEngine: 'running',
    monitoring: 'active',
    alerts: 'working',
    database: 'healthy',
    lastUpdate: new Date().toISOString()
  });

  // Buscar dados SLA
  const { data: slaStats } = useSlaV2Statistics();
  const { data: slaTemplates } = useSlaV2Templates();
  const { data: slaCalendars } = useSlaV2Calendars();

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
          return 'border-green-500 bg-green-50 dark:bg-green-950';
        case 'stopped':
        case 'inactive':
          return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950';
        case 'error':
        case 'failed':
          return 'border-red-500 bg-red-50 dark:bg-red-950';
        case 'degraded':
        case 'slow':
          return 'border-orange-500 bg-orange-50 dark:bg-orange-950';
        default:
          return 'border-gray-500 bg-gray-50 dark:bg-gray-950';
      }
    };

    return (
      <Card className={`${getStatusColor(status)} border-l-4`}>
        <CardContent className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-sm">{title}</h3>
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
              <Badge variant="outline" className="text-xs mt-2 capitalize">
                {status}
              </Badge>
            </div>
            {actions && (
              <div className="flex gap-2">
                {actions}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const SystemManagementPanel: React.FC = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Status do Sistema SLA
          </CardTitle>
          <CardDescription>
            Monitor de componentes e serviços do sistema SLA
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StatusCard
              title="Motor SLA"
              status={systemStatus.slaEngine}
              description="Processamento de regras e cálculos SLA"
              actions={
                <Button size="sm" variant="outline">
                  {systemStatus.slaEngine === 'running' ? (
                    <>
                      <Pause className="h-3 w-3 mr-1" />
                      Parar
                    </>
                  ) : (
                    <>
                      <Play className="h-3 w-3 mr-1" />
                      Iniciar
                    </>
                  )}
                </Button>
              }
            />
            
            <StatusCard
              title="Monitoramento"
              status={systemStatus.monitoring}
              description="Sistema de alertas e notificações"
              actions={
                <Button size="sm" variant="outline">
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Verificar
                </Button>
              }
            />
            
            <StatusCard
              title="Alertas"
              status={systemStatus.alerts}
              description="Processamento de notificações automáticas"
            />
            
            <StatusCard
              title="Banco de Dados"
              status={systemStatus.database}
              description="Conectividade e performance do PostgreSQL"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <AppLayout title="Administração SLA">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Administração SLA</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie templates, métricas e configurações do sistema SLA
            </p>
          </div>
          <div className="px-3 py-1 bg-gradient-to-r from-blue-600 to-green-600 text-white text-sm font-medium rounded-full">
            SISTEMA SLA ATIVO
          </div>
        </div>

        {/* System Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <Settings className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Templates SLA</p>
                  <p className="text-xl font-bold">{slaTemplates?.data?.length || 0}</p>
                  <p className="text-xs text-blue-600">
                    {slaTemplates?.data?.filter(t => t.isActive)?.length || 0} ativos
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                  <Zap className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Calendários</p>
                  <p className="text-xl font-bold">{slaCalendars?.data?.length || 0}</p>
                  <p className="text-xs text-green-600">
                    {slaCalendars?.data?.filter(c => c.isActive)?.length || 0} ativos
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                  <Activity className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Cálculos Hoje</p>
                  <p className="text-xl font-bold">{slaStats?.data?.todayCalculations || 0}</p>
                  <p className="text-xs text-orange-600">Processados hoje</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Violações SLA</p>
                  <p className="text-xl font-bold">{slaStats?.data?.violationsCount || 0}</p>
                  <p className="text-xs text-purple-600">Últimas 24h</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Configuration Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Sistema
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <SlaV2MetricsGrid />
          </TabsContent>

          <TabsContent value="templates">
            <SlaTemplatesManager />
          </TabsContent>

          <TabsContent value="system">
            <SystemManagementPanel />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default SlaAdminDashboard;