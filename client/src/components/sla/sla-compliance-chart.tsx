import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  Filter,
  Download,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SlaComplianceData {
  period: string;
  compliance: number;
  target: number;
  responseTime: number;
  resolutionTime: number;
  totalTickets: number;
  breachedTickets: number;
  priority: {
    critical: { total: number; breached: number; compliance: number };
    high: { total: number; breached: number; compliance: number };
    medium: { total: number; breached: number; compliance: number };
    low: { total: number; breached: number; compliance: number };
  };
}

export interface SlaComplianceChartProps {
  data: SlaComplianceData[];
  chartType?: 'line' | 'area' | 'bar' | 'combined';
  period?: 'daily' | 'weekly' | 'monthly';
  showTarget?: boolean;
  showPriorityBreakdown?: boolean;
  height?: number;
  className?: string;
}

const PRIORITY_COLORS = {
  critical: '#dc2626',
  high: '#ea580c',
  medium: '#d97706',
  low: '#65a30d'
};

const CHART_COLORS = {
  compliance: '#22c55e',
  target: '#6b7280',
  responseTime: '#3b82f6',
  resolutionTime: '#8b5cf6',
  breached: '#ef4444'
};

export const SlaComplianceChart: React.FC<SlaComplianceChartProps> = ({
  data,
  chartType = 'combined',
  period = 'daily',
  showTarget = true,
  showPriorityBreakdown = false,
  height = 400,
  className
}) => {
  const priorityData = useMemo(() => {
    if (!showPriorityBreakdown || !data.length) return [];
    
    const latestData = data[data.length - 1];
    return Object.entries(latestData.priority).map(([priority, stats]) => ({
      name: priority.charAt(0).toUpperCase() + priority.slice(1),
      value: stats.compliance,
      total: stats.total,
      breached: stats.breached,
      color: PRIORITY_COLORS[priority as keyof typeof PRIORITY_COLORS]
    }));
  }, [data, showPriorityBreakdown]);

  const formatTooltip = (value: any, name: string) => {
    if (name === 'compliance' || name === 'target') {
      return [`${Number(value).toFixed(1)}%`, name === 'compliance' ? 'Compliance' : 'Meta'];
    }
    if (name === 'responseTime' || name === 'resolutionTime') {
      return [`${Number(value).toFixed(1)}h`, name === 'responseTime' ? 'Tempo Resposta' : 'Tempo Resolução'];
    }
    return [value, name];
  };

  const renderChart = () => {
    switch (chartType) {
      case 'line':
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="period" 
              className="text-xs"
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              className="text-xs"
              tick={{ fontSize: 12 }}
              domain={[0, 100]}
            />
            <Tooltip 
              formatter={formatTooltip}
              labelClassName="text-sm font-medium"
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px'
              }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="compliance" 
              stroke={CHART_COLORS.compliance}
              strokeWidth={3}
              dot={{ fill: CHART_COLORS.compliance, strokeWidth: 2, r: 4 }}
              name="Compliance SLA"
            />
            {showTarget && (
              <Line 
                type="monotone" 
                dataKey="target" 
                stroke={CHART_COLORS.target}
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="Meta"
              />
            )}
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="period" 
              className="text-xs"
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              className="text-xs"
              tick={{ fontSize: 12 }}
              domain={[0, 100]}
            />
            <Tooltip formatter={formatTooltip} />
            <Legend />
            <Area
              type="monotone"
              dataKey="compliance"
              stroke={CHART_COLORS.compliance}
              fill={CHART_COLORS.compliance}
              fillOpacity={0.3}
              strokeWidth={2}
              name="Compliance SLA"
            />
            {showTarget && (
              <Line 
                type="monotone" 
                dataKey="target" 
                stroke={CHART_COLORS.target}
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Meta"
              />
            )}
          </AreaChart>
        );

      case 'bar':
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="period" 
              className="text-xs"
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              className="text-xs"
              tick={{ fontSize: 12 }}
            />
            <Tooltip formatter={formatTooltip} />
            <Legend />
            <Bar 
              dataKey="compliance" 
              fill={CHART_COLORS.compliance}
              name="Compliance SLA"
              radius={[2, 2, 0, 0]}
            />
            <Bar 
              dataKey="breachedTickets" 
              fill={CHART_COLORS.breached}
              name="Tickets Violados"
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        );

      case 'combined':
      default:
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="period" 
              className="text-xs"
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              yAxisId="left"
              className="text-xs"
              tick={{ fontSize: 12 }}
              domain={[0, 100]}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              className="text-xs"
              tick={{ fontSize: 12 }}
            />
            <Tooltip formatter={formatTooltip} />
            <Legend />
            <Line 
              yAxisId="left"
              type="monotone" 
              dataKey="compliance" 
              stroke={CHART_COLORS.compliance}
              strokeWidth={3}
              dot={{ fill: CHART_COLORS.compliance, strokeWidth: 2, r: 4 }}
              name="Compliance SLA (%)"
            />
            {showTarget && (
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="target" 
                stroke={CHART_COLORS.target}
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="Meta (%)"
              />
            )}
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="responseTime" 
              stroke={CHART_COLORS.responseTime}
              strokeWidth={2}
              dot={{ fill: CHART_COLORS.responseTime, strokeWidth: 2, r: 3 }}
              name="Tempo Resposta (h)"
            />
          </LineChart>
        );
    }
  };

  const renderPriorityChart = () => {
    if (!showPriorityBreakdown) return null;

    return (
      <Card className="col-span-full lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Compliance por Prioridade
          </CardTitle>
          <CardDescription>
            Distribuição atual de compliance SLA por nível de prioridade
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={priorityData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${(value || 0).toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {priorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any) => [
                    `${Number(value).toFixed(1)}%`,
                    'Compliance'
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4">
            {priorityData.map((item) => (
              <div key={item.name} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm font-medium">{item.name}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold">{item.value.toFixed(1)}%</div>
                  <div className="text-xs text-gray-500">{item.breached}/{item.total}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  const getComplianceTrend = () => {
    if (data.length < 2) return null;
    
    const current = data[data.length - 1].compliance;
    const previous = data[data.length - 2].compliance;
    const change = current - previous;
    
    return {
      value: Math.abs(change),
      direction: change >= 0 ? 'up' : 'down',
      isPositive: change >= 0
    };
  };

  const trend = getComplianceTrend();

  return (
    <div className={cn('space-y-6', className)}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <TrendingUp className="h-6 w-6" />
                Análise de Compliance SLA
              </CardTitle>
              <CardDescription>
                Monitoramento de performance e tendências dos acordos de nível de serviço
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {trend && (
                <Badge 
                  variant={trend.isPositive ? "default" : "destructive"}
                  className="flex items-center gap-1"
                >
                  {trend.isPositive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {trend.value.toFixed(1)}%
                </Badge>
              )}
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-1" />
                Filtros
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-1" />
                Exportar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              {renderChart()}
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {showPriorityBreakdown && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Detalhamento por Período</CardTitle>
                <CardDescription>
                  Métricas detalhadas de compliance e tempo de resposta
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.slice(-5).reverse().map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">{item.period}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Compliance:</span>
                          <span className={cn(
                            "ml-1 font-medium",
                            item.compliance >= item.target ? "text-green-600" : "text-red-600"
                          )}>
                            {item.compliance.toFixed(1)}%
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Violações:</span>
                          <span className="ml-1 font-medium text-red-600">
                            {item.breachedTickets}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Total:</span>
                          <span className="ml-1 font-medium">
                            {item.totalTickets}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          {renderPriorityChart()}
        </div>
      )}
    </div>
  );
};

// Dados de exemplo para demonstração
export const sampleComplianceData: SlaComplianceData[] = [
  {
    period: '01/01',
    compliance: 92.5,
    target: 95.0,
    responseTime: 2.8,
    resolutionTime: 18.5,
    totalTickets: 45,
    breachedTickets: 3,
    priority: {
      critical: { total: 5, breached: 1, compliance: 80.0 },
      high: { total: 12, breached: 2, compliance: 83.3 },
      medium: { total: 20, breached: 0, compliance: 100.0 },
      low: { total: 8, breached: 0, compliance: 100.0 }
    }
  },
  {
    period: '02/01',
    compliance: 94.2,
    target: 95.0,
    responseTime: 2.3,
    resolutionTime: 16.8,
    totalTickets: 52,
    breachedTickets: 3,
    priority: {
      critical: { total: 6, breached: 1, compliance: 83.3 },
      high: { total: 15, breached: 2, compliance: 86.7 },
      medium: { total: 22, breached: 0, compliance: 100.0 },
      low: { total: 9, breached: 0, compliance: 100.0 }
    }
  }
];

export default SlaComplianceChart;
