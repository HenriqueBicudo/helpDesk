import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Timer,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Target,
  BarChart3,
  Activity,
  AlertCircle,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  useSlaV2Statistics,
  useSlaV2Templates,
  useSlaV2Calendars,
  useSlaV2Calculations,
  formatSlaTime,
  getSlaStatus,
  getSlaStatusColor
} from '@/hooks/use-sla-v2';

interface SlaV2MetricsGridProps {
  className?: string;
  onRefresh?: () => void;
}

export function SlaV2MetricsGrid({ className, onRefresh }: SlaV2MetricsGridProps) {
  const { data: statistics, isLoading: statsLoading, refetch: refetchStats } = useSlaV2Statistics();
  const { data: templates, isLoading: templatesLoading } = useSlaV2Templates();
  const { data: calendars, isLoading: calendarsLoading } = useSlaV2Calendars();
  const { data: calculations, isLoading: calculationsLoading } = useSlaV2Calculations({ limit: 5 });

  const handleRefresh = () => {
    refetchStats();
    onRefresh?.();
  };

  const isLoading = statsLoading || templatesLoading || calendarsLoading || calculationsLoading;
  
  const stats = statistics?.data;
  const templatesData = templates?.data || [];
  const calendarsData = calendars?.data || [];
  const calculationsData = calculations?.data || [];

  // Calcular métricas derivadas
  const activeTemplates = templatesData.filter(t => t.isActive).length;
  const activeCalendars = calendarsData.filter(c => c.isActive).length;
  
  // Analisar status dos cálculos recentes
  const recentCalculations = calculationsData.slice(0, 10);
  const slaStatuses = recentCalculations.map(calc => getSlaStatus(calc));
  const criticalCount = slaStatuses.filter(s => s === 'critical').length;
  const warningCount = slaStatuses.filter(s => s === 'warning').length;
  const okCount = slaStatuses.filter(s => s === 'ok').length;

  const MetricCard = ({ 
    title, 
    value, 
    subtitle, 
    icon: Icon, 
    trend, 
    status = 'neutral',
    onClick
  }: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ElementType;
    trend?: { value: number; isPositive?: boolean; timeframe?: string };
    status?: 'good' | 'warning' | 'critical' | 'neutral';
    onClick?: () => void;
  }) => {
    const statusColors = {
      good: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
      warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100', 
      critical: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
      neutral: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100'
    };

    return (
      <Card className={cn("cursor-pointer hover:shadow-md transition-shadow", onClick && "hover:bg-gray-50 dark:hover:bg-gray-800")} onClick={onClick}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Icon className={cn("h-5 w-5", statusColors[status].split(' ').find(c => c.includes('text-')))} />
            {trend && (
              <div className="flex items-center text-xs">
                {trend.isPositive ? (
                  <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
                )}
                <span className={trend.isPositive ? 'text-green-600' : 'text-red-600'}>
                  {Math.abs(trend.value)}%
                </span>
              </div>
            )}
          </div>
          
          <div className="space-y-1">
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4", className)}>
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="animate-pulse">
                <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header com botão de refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Métricas SLA V2.0</h3>
          <p className="text-sm text-muted-foreground">
            Monitoramento em tempo real do sistema SLA
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isLoading}
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
          Atualizar
        </Button>
      </div>

      {/* Grid principal de métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Compliance Geral */}
        <MetricCard
          title="Compliance SLA"
          value={`${(stats?.complianceRate || 0).toFixed(1)}%`}
          subtitle="Taxa de cumprimento dos prazos"
          icon={Target}
          status={
            (stats?.complianceRate || 0) >= 95 ? 'good' : 
            (stats?.complianceRate || 0) >= 90 ? 'warning' : 'critical'
          }
          trend={{
            value: 2.3,
            isPositive: true,
            timeframe: 'vs. mês anterior'
          }}
        />

        {/* Templates Ativos */}
        <MetricCard
          title="Templates Ativos"
          value={`${activeTemplates}/${stats?.totalTemplates || 0}`}
          subtitle="Templates de SLA configurados"
          icon={BarChart3}
          status={activeTemplates >= 3 ? 'good' : 'warning'}
        />

        {/* Calendários de Negócio */}
        <MetricCard
          title="Calendários Ativos"
          value={`${activeCalendars}/${stats?.totalCalendars || 0}`}
          subtitle="Calendários de negócio"
          icon={Activity}
          status={activeCalendars >= 1 ? 'good' : 'warning'}
        />

        {/* Cálculos Hoje */}
        <MetricCard
          title="Cálculos Hoje"
          value={stats?.todayCalculations || 0}
          subtitle="Tickets processados hoje"
          icon={Zap}
          status="neutral"
        />

        {/* Tempo Médio de Resposta */}
        <MetricCard
          title="Tempo Médio Resposta"
          value={formatSlaTime(stats?.averageResponseTime || 0)}
          subtitle="Primeira resposta aos tickets"
          icon={Timer}
          status={
            (stats?.averageResponseTime || 0) <= 240 ? 'good' :
            (stats?.averageResponseTime || 0) <= 480 ? 'warning' : 'critical'
          }
          trend={{
            value: 8.5,
            isPositive: false,
            timeframe: 'vs. semana anterior'
          }}
        />

        {/* Tempo Médio de Solução */}
        <MetricCard
          title="Tempo Médio Solução"
          value={formatSlaTime(stats?.averageSolutionTime || 0)}
          subtitle="Resolução completa dos tickets"
          icon={CheckCircle}
          status={
            (stats?.averageSolutionTime || 0) <= 1440 ? 'good' :
            (stats?.averageSolutionTime || 0) <= 2880 ? 'warning' : 'critical'
          }
          trend={{
            value: 12.1,
            isPositive: false,
            timeframe: 'vs. mês anterior'
          }}
        />

        {/* Tickets com Violação */}
        <MetricCard
          title="SLA Violado"
          value={stats?.breachedTickets || 0}
          subtitle="Tickets que perderam o prazo"
          icon={AlertTriangle}
          status={(stats?.breachedTickets || 0) === 0 ? 'good' : 'critical'}
        />

        {/* Tickets Próximos ao Vencimento */}
        <MetricCard
          title="Próximo Vencimento"
          value={stats?.nearBreachTickets || 0}
          subtitle="Tickets com prazo próximo"
          icon={Clock}
          status={(stats?.nearBreachTickets || 0) <= 5 ? 'good' : 'warning'}
        />
      </div>

      {/* Status dos Cálculos Recentes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Status dos Cálculos Recentes
          </CardTitle>
          <CardDescription>
            Análise dos últimos {recentCalculations.length} cálculos de SLA processados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Em conformidade */}
            <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              <div>
                <p className="text-2xl font-bold text-green-800 dark:text-green-100">{okCount}</p>
                <p className="text-sm font-medium text-green-700 dark:text-green-200">Em Conformidade</p>
              </div>
            </div>

            {/* Próximo ao Vencimento */}
            <div className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <AlertCircle className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
              <div>
                <p className="text-2xl font-bold text-yellow-800 dark:text-yellow-100">{warningCount}</p>
                <p className="text-sm font-medium text-yellow-700 dark:text-yellow-200">Próximo Vencimento</p>
              </div>
            </div>

            {/* SLA Violado */}
            <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
              <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
              <div>
                <p className="text-2xl font-bold text-red-800 dark:text-red-100">{criticalCount}</p>
                <p className="text-sm font-medium text-red-700 dark:text-red-200">SLA Violado</p>
              </div>
            </div>
          </div>

          {/* Lista dos cálculos mais recentes */}
          {recentCalculations.length > 0 && (
            <div className="mt-6 space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground mb-3">
                Últimos Cálculos Processados
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {recentCalculations.map((calc) => {
                  const status = getSlaStatus(calc);
                  const colors = getSlaStatusColor(status);
                  
                  return (
                    <div
                      key={calc.id}
                      className="flex items-center justify-between p-2 rounded border bg-card"
                    >
                      <div className="flex items-center gap-3">
                        <Badge
                          className={cn(colors.bg, colors.text, colors.border)}
                        >
                          Ticket #{calc.ticketId}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {calc.template?.name || 'Template não encontrado'}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {calc.priority}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Resp: {formatSlaTime(calc.responseTimeMinutes)}</span>
                        <span>Sol: {formatSlaTime(calc.solutionTimeMinutes)}</span>
                        <span>{new Date(calc.calculatedAt).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}