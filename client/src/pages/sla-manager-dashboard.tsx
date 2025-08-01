import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import SlaMetricsCard, { SlaMetricsGrid, sampleSlaMetrics } from '@/components/sla/sla-metrics-card';
import SlaComplianceChart, { sampleComplianceData } from '@/components/sla/sla-compliance-chart';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  Download,
  Filter,
  Users,
  AlertTriangle,
  Clock,
  Target,
  CheckCircle2,
  RefreshCw,
  Eye,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSlaeDashboard, useSlaMetrics } from '@/hooks/use-sla';
import { DateRange } from 'react-day-picker';
import { addDays, format } from 'date-fns';

const SlaManagerDashboard: React.FC = () => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date()
  });
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [selectedContract, setSelectedContract] = useState<string>('all');

  // Construir filtros para queries
  const filters = React.useMemo(() => ({
    startDate: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
    endDate: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
    agentId: selectedAgent !== 'all' ? selectedAgent : undefined,
    contractId: selectedContract !== 'all' ? selectedContract : undefined
  }), [dateRange, selectedAgent, selectedContract]);

  // Buscar dados do dashboard
  const {
    metrics,
    alerts,
    configurations,
    monitoring,
    isLoading,
    isError,
    refetchAll
  } = useSlaeDashboard(filters);

  // Mock de dados para agentes (idealmente viria de uma API)
  const agents = [
    { id: 'agent1', name: 'João Silva' },
    { id: 'agent2', name: 'Maria Santos' },
    { id: 'agent3', name: 'Pedro Oliveira' }
  ];

  // Mock de dados para contratos
  const contracts = [
    { id: 'contract1', name: 'Contrato Empresa A' },
    { id: 'contract2', name: 'Contrato Empresa B' },
    { id: 'contract3', name: 'Contrato Empresa C' }
  ];

  const handleExportReport = () => {
    // Implementar exportação de relatório
    console.log('Exportando relatório...', filters);
  };

  const QuickStatsCard: React.FC<{
    title: string;
    value: string;
    change?: {
      value: number;
      period: string;
      positive: boolean;
    };
    icon: React.ElementType;
    color: string;
  }> = ({ title, value, change, icon: Icon, color }) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {title}
            </p>
            <p className={cn("text-3xl font-bold", color)}>
              {value}
            </p>
            {change && (
              <div className="flex items-center gap-1">
                {change.positive ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
                <span className={cn(
                  "text-sm font-medium",
                  change.positive ? "text-green-600" : "text-red-600"
                )}>
                  {change.positive ? '+' : ''}{change.value}%
                </span>
                <span className="text-sm text-gray-500">
                  vs. {change.period}
                </span>
              </div>
            )}
          </div>
          <div className={cn(
            "p-3 rounded-full",
            color.replace('text-', 'bg-').replace('-600', '-100'),
            'dark:' + color.replace('text-', 'bg-').replace('-600', '-900')
          )}>
            <Icon className={cn("h-6 w-6", color)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const AlertsPanel: React.FC = () => (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Alertas SLA Ativos
            </CardTitle>
            <CardDescription>
              Situações que requerem atenção imediata
            </CardDescription>
          </div>
          <Badge variant="destructive" className="text-sm">
            {alerts?.length || 0} alertas
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {!alerts || alerts.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              Nenhum alerta SLA ativo no momento
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.slice(0, 10).map((alert) => (
              <div key={alert.id} className={cn(
                "flex items-center justify-between p-3 rounded-lg border",
                alert.severity === 'critical' 
                  ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950"
                  : "border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950"
              )}>
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    {alert.message}
                  </p>
                  <p className="text-xs text-gray-500">
                    Ticket ID: {alert.ticketId} • {new Date(alert.createdAt).toLocaleString('pt-BR')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}
                    className="text-xs"
                  >
                    {alert.severity}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => monitoring.acknowledgeAlert.mutate(alert.id)}
                    disabled={monitoring.acknowledgeAlert.isPending}
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Confirmar
                  </Button>
                </div>
              </div>
            ))}
            {alerts.length > 10 && (
              <div className="text-center pt-2">
                <Button variant="ghost" size="sm">
                  <Eye className="h-4 w-4 mr-1" />
                  Ver todos os {alerts.length} alertas
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const TeamPerformanceCard: React.FC = () => (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5" />
          Performance da Equipe
        </CardTitle>
        <CardDescription>
          Desempenho individual dos agentes
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {agents.map((agent, index) => {
            // Mock de dados de performance
            const compliance = 95 - (index * 5);
            const tickets = 25 + (index * 8);
            const avgResponse = 2.5 + (index * 0.5);
            
            return (
              <div key={agent.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                      {agent.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">{agent.name}</p>
                    <p className="text-sm text-gray-500">{tickets} tickets ativos</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-medium">Compliance SLA</p>
                    <p className={cn(
                      "text-lg font-bold",
                      compliance >= 95 ? "text-green-600" : 
                      compliance >= 90 ? "text-orange-600" : "text-red-600"
                    )}>
                      {compliance}%
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">Tempo Resposta</p>
                    <p className="text-lg font-bold text-blue-600">
                      {avgResponse}h
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );

  if (isError) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Erro ao carregar dados</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Não foi possível carregar os dados do dashboard SLA
          </p>
          <Button onClick={refetchAll}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard SLA - Gerente</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Monitoramento avançado de performance e acordos de nível de serviço
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={refetchAll} variant="outline" size="sm" disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4 mr-1", isLoading && "animate-spin")} />
            Atualizar
          </Button>
          <Button onClick={handleExportReport} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" />
            Exportar
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-1" />
            Configurar
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <DatePickerWithRange 
                date={dateRange}
                onDateChange={setDateRange}
              />
            </div>
            <Select value={selectedAgent} onValueChange={setSelectedAgent}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Selecionar agente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os agentes</SelectItem>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedContract} onValueChange={setSelectedContract}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Selecionar contrato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os contratos</SelectItem>
                {contracts.map((contract) => (
                  <SelectItem key={contract.id} value={contract.id}>
                    {contract.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <QuickStatsCard
          title="Compliance SLA Geral"
          value={`${metrics?.compliancePercentage?.toFixed(1) || '0'}%`}
          change={{
            value: 2.3,
            period: 'mês passado',
            positive: true
          }}
          icon={Target}
          color="text-blue-600"
        />
        <QuickStatsCard
          title="Tickets Violados"
          value={`${metrics?.breachedTickets || 0}`}
          change={{
            value: 15.5,
            period: 'semana passada',
            positive: false
          }}
          icon={AlertTriangle}
          color="text-red-600"
        />
        <QuickStatsCard
          title="Tempo Médio Resposta"
          value={`${metrics?.averageResponseTime?.toFixed(1) || '0'}h`}
          change={{
            value: 8.2,
            period: 'mês passado',
            positive: false
          }}
          icon={Clock}
          color="text-green-600"
        />
        <QuickStatsCard
          title="Total de Tickets"
          value={`${metrics?.totalTickets || 0}`}
          change={{
            value: 12.0,
            period: 'mês passado',
            positive: true
          }}
          icon={BarChart3}
          color="text-purple-600"
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="analytics">Análises</TabsTrigger>
          <TabsTrigger value="team">Equipe</TabsTrigger>
          <TabsTrigger value="alerts">Alertas</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Métricas SLA */}
          <SlaMetricsGrid 
            metrics={sampleSlaMetrics}
            columns={4}
            size="md"
            showTrend={true}
            showTarget={true}
          />

          {/* Gráfico de Compliance */}
          <SlaComplianceChart
            data={sampleComplianceData}
            chartType="combined"
            showTarget={true}
            showPriorityBreakdown={true}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <SlaComplianceChart
            data={sampleComplianceData}
            chartType="area"
            showTarget={true}
            showPriorityBreakdown={true}
          />
        </TabsContent>

        <TabsContent value="team">
          <TeamPerformanceCard />
        </TabsContent>

        <TabsContent value="alerts">
          <AlertsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SlaManagerDashboard;
