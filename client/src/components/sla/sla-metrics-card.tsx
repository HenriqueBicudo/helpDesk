import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Clock, 
  AlertTriangle, 
  CheckCircle2,
  
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SlaMetric {
  id: string;
  title: string;
  value: number;
  target?: number;
  unit: 'percentage' | 'hours' | 'minutes' | 'count';
  trend?: {
    value: number;
    direction: 'up' | 'down';
    period: string;
  };
  status: 'good' | 'warning' | 'critical';
  description?: string;
}

export interface SlaMetricsCardProps {
  metric: SlaMetric;
  size?: 'sm' | 'md' | 'lg';
  showTrend?: boolean;
  showTarget?: boolean;
  className?: string;
}

export const SlaMetricsCard: React.FC<SlaMetricsCardProps> = ({
  metric,
  size = 'md',
  showTrend = true,
  showTarget = true,
  className
}) => {
  const formatValue = (value: number, unit: SlaMetric['unit']): string => {
    switch (unit) {
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'hours':
        return `${value.toFixed(1)}h`;
      case 'minutes':
        return `${Math.round(value)}min`;
      case 'count':
        return value.toString();
      default:
        return value.toString();
    }
  };

  const getStatusColor = (status: SlaMetric['status']) => {
    switch (status) {
      case 'good':
        return 'text-green-600 dark:text-green-400';
      case 'warning':
        return 'text-orange-600 dark:text-orange-400';
      case 'critical':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: SlaMetric['status']) => {
    switch (status) {
      case 'good':
        return CheckCircle2;
      case 'warning':
        return AlertTriangle;
      case 'critical':
        return AlertTriangle;
      default:
        return Target;
    }
  };

  const getStatusBadge = (status: SlaMetric['status']) => {
    const variants = {
      good: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-100',
      warning: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900 dark:text-orange-100',
      critical: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-100'
    };

    const labels = {
      good: 'Dentro da Meta',
      warning: 'Atenção',
      critical: 'Crítico'
    };

    return { variant: variants[status], label: labels[status] };
  };

  const StatusIcon = getStatusIcon(metric.status);
  const statusBadge = getStatusBadge(metric.status);

  const sizeClasses = {
    sm: {
      card: 'p-3',
      title: 'text-sm',
      value: 'text-lg',
      icon: 'h-4 w-4',
      badge: 'text-xs px-1.5 py-0.5'
    },
    md: {
      card: 'p-4',
      title: 'text-sm',
      value: 'text-2xl',
      icon: 'h-5 w-5',
      badge: 'text-xs px-2 py-1'
    },
    lg: {
      card: 'p-6',
      title: 'text-base',
      value: 'text-3xl',
      icon: 'h-6 w-6',
      badge: 'text-sm px-2.5 py-1.5'
    }
  };

  return (
    <Card className={cn('transition-all duration-200 hover:shadow-md', className)}>
      <CardHeader className={cn('flex flex-row items-center justify-between space-y-0', sizeClasses[size].card)}>
        <div className="flex items-center gap-2">
          <StatusIcon className={cn(sizeClasses[size].icon, getStatusColor(metric.status))} />
          <CardTitle className={sizeClasses[size].title}>{metric.title}</CardTitle>
        </div>
        <Badge className={cn(sizeClasses[size].badge, statusBadge.variant)}>
          {statusBadge.label}
        </Badge>
      </CardHeader>
      
      <CardContent className={sizeClasses[size].card}>
        <div className="space-y-3">
          {/* Valor Principal */}
          <div className="flex items-baseline gap-2">
            <span className={cn('font-bold', sizeClasses[size].value, getStatusColor(metric.status))}>
              {formatValue(metric.value, metric.unit)}
            </span>
            {showTarget && metric.target && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                / {formatValue(metric.target, metric.unit)}
              </span>
            )}
          </div>

          {/* Barra de Progresso (se houver meta) */}
          {showTarget && metric.target && metric.unit === 'percentage' && (
            <div className="space-y-1">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className={cn(
                    'h-2 rounded-full transition-all duration-500',
                    metric.status === 'good' ? 'bg-green-500' :
                    metric.status === 'warning' ? 'bg-orange-500' : 'bg-red-500'
                  )}
                  style={{ width: `${Math.min(100, (metric.value / metric.target) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Tendência */}
          {showTrend && metric.trend && (
            <div className="flex items-center gap-1.5">
              {metric.trend.direction === 'up' ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              <span className={cn(
                'text-xs font-medium',
                metric.trend.direction === 'up' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              )}>
                {metric.trend.direction === 'up' ? '+' : ''}{metric.trend.value}%
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                vs. {metric.trend.period}
              </span>
            </div>
          )}

          {/* Descrição */}
          {metric.description && (
            <CardDescription className="text-xs leading-relaxed">
              {metric.description}
            </CardDescription>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Componente para múltiplas métricas em grid
export interface SlaMetricsGridProps {
  metrics: SlaMetric[];
  columns?: 1 | 2 | 3 | 4;
  size?: 'sm' | 'md' | 'lg';
  showTrend?: boolean;
  showTarget?: boolean;
  className?: string;
}

export const SlaMetricsGrid: React.FC<SlaMetricsGridProps> = ({
  metrics,
  columns = 3,
  size = 'md',
  showTrend = true,
  showTarget = true,
  className
}) => {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
  };

  return (
    <div className={cn('grid gap-4', gridCols[columns], className)}>
      {metrics.map((metric) => (
        <SlaMetricsCard
          key={metric.id}
          metric={metric}
          size={size}
          showTrend={showTrend}
          showTarget={showTarget}
        />
      ))}
    </div>
  );
};

// Dados de exemplo para demonstração
// sampleSlaMetrics removed — use API-driven metrics instead (SlaMetricsGrid receives data from API)

export default SlaMetricsCard;
