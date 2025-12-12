import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { AppLayout } from '@/components/layout/app-layout';
import { MetricCard } from '@/components/dashboard/metric-card';
import { ChartCategory } from '@/components/dashboard/chart-category';
import { ChartVolume } from '@/components/dashboard/chart-volume';
import { TicketTable } from '@/components/tickets/ticket-table';
import { TicketFilters } from '@/components/tickets/ticket-filters';
import { NewTicketDialog } from '@/components/tickets/new-ticket-dialog';
import { SlaV2MetricsGrid } from '@/components/sla/sla-metrics-grid';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  TicketCheck, 
  Clock, 
  CheckCircle, 
  Timer,
  Plus,
  Target,
  BarChart3,
  Settings,
  Shield,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

// Componente para mostrar tickets com SLA crítico
const CriticalSlaTickets = ({ userId }: { userId?: string }) => {
  const [, setLocation] = useLocation();
  
  const { data: tickets, isLoading } = useQuery({
    queryKey: ['/api/tickets', 'critical-sla', userId],
    queryFn: async () => {
      const params = new URLSearchParams({
        assigneeId: userId
      });
      const res = await fetch(`/api/tickets?${params}`);
      if (!res.ok) return [];
      const json = await res.json();
      return Array.isArray(json) ? json : json?.tickets || [];
    },
    enabled: !!userId,
    refetchInterval: 30000, // Atualizar a cada 30 segundos
  });

  // Filtrar tickets com SLA crítico (resposta vencida ou próxima do vencimento)
  const criticalTickets = (tickets || []).filter((ticket: any) => {
    if (!ticket.responseDueAt || ['resolved', 'closed'].includes(ticket.status)) return false;
    
    const now = new Date();
    const responseDue = new Date(ticket.responseDueAt);
    const timeRemaining = responseDue.getTime() - now.getTime();
    
    // Consideramos crítico se vencido ou faltam menos de 30 minutos
    return timeRemaining <= 1800000; // 30 minutos
  });

  if (isLoading || criticalTickets.length === 0) return null;

  return (
    <Card className="mb-6 border-red-200 bg-red-50">
      <div className="p-5 border-b border-red-200">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <h3 className="text-lg font-medium text-red-800">
            Tickets com SLA Crítico ({criticalTickets.length})
          </h3>
        </div>
        <p className="text-sm text-red-600 mt-1">
          Tickets atribuídos a você com prazo de resposta vencido ou próximo do vencimento
        </p>
      </div>
      <div className="p-5">
        <div className="space-y-3">
          {criticalTickets.map((ticket: any) => {
            const now = new Date();
            const responseDue = new Date(ticket.responseDueAt);
            const timeRemaining = responseDue.getTime() - now.getTime();
            const isOverdue = timeRemaining <= 0;
            
            return (
              <div 
                key={ticket.id}
                className="flex items-center justify-between p-3 bg-white border border-red-200 rounded-lg cursor-pointer hover:bg-red-50 transition-colors"
                onClick={() => setLocation(`/tickets/${ticket.id}`)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">#{ticket.id}</span>
                    <Badge variant={ticket.priority === 'critical' ? 'destructive' : 'secondary'} className="text-xs">
                      {ticket.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-700 truncate">{ticket.subject}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                    <Clock className="h-3 w-3" />
                    <span>
                      {isOverdue 
                        ? `Vencido há ${Math.abs(Math.floor(timeRemaining / (1000 * 60)))} min`
                        : `Vence em ${Math.floor(timeRemaining / (1000 * 60))} min`
                      }
                    </span>
                  </div>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  isOverdue ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'
                }`}>
                  {isOverdue ? 'VENCIDO' : 'URGENTE'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};

// Componente específico para dashboard dos clientes
const ClientDashboard = ({ user, stats, isLoadingStats, onNavigate, onNewTicket }: any) => {
  return (
    <div className="mb-6">
      {/* Card de boas-vindas */}
      <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <div className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <TicketCheck className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Bem-vindo, {user.fullName}!
              </h2>
              <p className="text-gray-600">
                {user.role === 'client_manager' 
                  ? 'Gerencie os chamados da sua empresa' 
                  : 'Acompanhe o status dos seus chamados'
                }
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Métricas específicas do cliente */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <MetricCard
          title="Meus Chamados Abertos"
          value={isLoadingStats ? '...' : (stats as any)?.openTickets || 0}
          icon={<Clock className="h-5 w-5" />}
          iconBgColor="bg-orange-100"
          iconColor="text-orange-600"
        />

        <MetricCard
          title="Chamados Resolvidos"
          value={isLoadingStats ? '...' : (stats as any)?.resolvedToday || 0}
          icon={<CheckCircle className="h-5 w-5" />}
          iconBgColor="bg-green-100"
          iconColor="text-green-600"
        />

        <MetricCard
          title="Tempo Médio de Atendimento"
          value={isLoadingStats ? '...' : (stats as any)?.averageResponseTime || '0min'}
          icon={<Timer className="h-5 w-5" />}
          iconBgColor="bg-blue-100"
          iconColor="text-blue-600"
        />
      </div>

      {/* Ações rápidas para clientes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card 
          className="p-4 hover:bg-gray-50 transition-colors cursor-pointer" 
          onClick={() => onNavigate('/tickets')}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <TicketCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium">Ver Meus Chamados</h3>
              <p className="text-sm text-muted-foreground">Acompanhe o status dos seus chamados</p>
            </div>
          </div>
        </Card>

        <Card 
          className="p-4 hover:bg-gray-50 transition-colors cursor-pointer" 
          onClick={() => onNewTicket()}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Plus className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-medium">Novo Chamado</h3>
              <p className="text-sm text-muted-foreground">Abra um novo chamado de suporte</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const [dateRange, setDateRange] = useState('thisMonth');
  const [isNewTicketDialogOpen, setIsNewTicketDialogOpen] = useState(false);
  const [, setLocation] = useLocation();
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    category: '',
    assignee: '',
  });

  const { user } = useAuth();

  // Fetch statistics
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['/api/statistics'],
  });

  // Fetch tickets with related data
  const { data: tickets, isLoading: isLoadingTickets } = useQuery({
    queryKey: ['/api/tickets'],
    refetchInterval: 30000,
  });

  // Fetch volume (tickets per date) to compute deltas
  const { data: volume } = useQuery({
    queryKey: ['/api/statistics/volume'],
  });

  // Get only the most recent 5 tickets
  const recentTickets = React.useMemo(() => {
    if (!tickets || !Array.isArray(tickets)) return [];
    
    return [...tickets]
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [tickets]);

  const handleFilterChange = (type: string, value: string) => {
    setFilters(prev => ({ ...prev, [type]: value }));
  };

  // Componente para Cards de Acesso SLA
  const SlaAccessCards = () => {
    if (!user) return null;
    
    const userRole = user.role || 'agent';
    
    const slaCards = [
      {
        title: 'SLA Agente',
        description: 'Gerencie tickets com sistema SLA aprimorado',
        icon: <Target className="h-6 w-6" />,
        path: '/sla/agent',
        roles: ['agent', 'manager', 'admin'],
        color: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300',
        bgHover: 'hover:bg-blue-50 dark:hover:bg-blue-900/50',
        badge: 'Ativo',
        badgeColor: 'bg-blue-600 text-white'
      },
      {
        title: 'SLA Gerente',
        description: 'Analytics avançados e performance da equipe',
        icon: <BarChart3 className="h-6 w-6" />,
        path: '/sla/manager',
        roles: ['manager', 'admin'],
        color: 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300',
        bgHover: 'hover:bg-green-50 dark:hover:bg-green-900/50',
        badge: 'Ativo',
        badgeColor: 'bg-green-600 text-white'
      },
      {
        title: 'SLA Admin',
        description: 'Templates, calendários e monitoramento avançado',
        icon: <Settings className="h-6 w-6" />,
        path: '/sla/admin',
        roles: ['admin'],
        color: 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300',
        bgHover: 'hover:bg-purple-50 dark:hover:bg-purple-900/50',
        badge: 'Ativo',
        badgeColor: 'bg-purple-600 text-white'
      }
    ];

    const availableCards = slaCards.filter(card => 
      card.roles.includes(userRole)
    );

    if (availableCards.length === 0) return null;

    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Sistema SLA</h2>
            <div className="px-2 py-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-medium rounded-full">
              NOVO
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            Sistema redesenhado com templates e calendários de negócio
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {availableCards.map((card) => (
            <Card 
              key={card.path}
              className={`p-4 cursor-pointer transition-all duration-200 ${card.bgHover} border-border hover:shadow-lg hover:scale-105`}
              onClick={() => setLocation(card.path)}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${card.color}`}>
                  {card.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-foreground">{card.title}</h3>
                    <div className={`px-2 py-0.5 text-xs font-medium rounded-full ${card.badgeColor}`}>
                      {card.badge}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{card.description}</p>
                  <div className="mt-2 flex items-center text-xs text-primary">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    <span>Sistema aprimorado</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  // Dashboard Header Actions
  const DashboardActions = () => (
    <div className="flex space-x-3">
      <Select
        value={dateRange}
        onValueChange={setDateRange}
      >
        <SelectTrigger className="bg-card border-border text-foreground w-[150px]">
          <SelectValue placeholder="Período" />
        </SelectTrigger>
        <SelectContent className="bg-card border-border">
          <SelectItem value="today">Hoje</SelectItem>
          <SelectItem value="last7days">Último 7 dias</SelectItem>
          <SelectItem value="last30days">Último 30 dias</SelectItem>
          <SelectItem value="thisMonth">Este mês</SelectItem>
          <SelectItem value="thisYear">Este ano</SelectItem>
        </SelectContent>
      </Select>
      
      <Button 
        className="flex items-center shadow-sm"
        onClick={() => setIsNewTicketDialogOpen(true)}
      >
        <Plus className="mr-1.5 h-4 w-4" />
        <span>Novo Chamado</span>
      </Button>
    </div>
  );

  return (
    <AppLayout title="Dashboard">
      <div className="flex flex-col md:flex-row items-center justify-between pb-4 mb-4 border-b border-border">
        <h1 className="text-2xl font-semibold text-foreground mb-4 md:mb-0">Dashboard</h1>
        <DashboardActions />
      </div>
      
      {/* Dashboard Metrics - Apenas para equipe helpdesk e admins */}
      {user?.role !== 'client_user' && user?.role !== 'client_manager' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total de Chamados"
          value={isLoadingStats ? '...' : (stats as any)?.totalTickets || 0}
          icon={<TicketCheck className="h-5 w-5" />}
          // compute percent change based on volume data and selected dateRange
          change={(() => {
            try {
              if (!volume || !Array.isArray(volume)) return undefined;

              const toDate = new Date();
              const padDate = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

              let start: Date;
              let end: Date = padDate(toDate);

              if (dateRange === 'today') {
                start = padDate(toDate);
              } else if (dateRange === 'last7days') {
                start = padDate(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000));
              } else if (dateRange === 'last30days') {
                start = padDate(new Date(Date.now() - 29 * 24 * 60 * 60 * 1000));
              } else if (dateRange === 'thisMonth') {
                start = new Date(toDate.getFullYear(), toDate.getMonth(), 1);
              } else if (dateRange === 'thisYear') {
                start = new Date(toDate.getFullYear(), 0, 1);
              } else {
                start = padDate(toDate);
              }

              const startTime = start.getTime();
              const endTime = end.getTime();

              const sumInRange = (s: number, e: number) => volume
                .filter((r: any) => {
                  const d = new Date(r.date);
                  const t = padDate(d).getTime();
                  return t >= s && t <= e;
                })
                .reduce((acc: number, cur: any) => acc + (cur.count || 0), 0);

              const currentSum = sumInRange(startTime, endTime);

              // previous period: same length right before start
              const periodDays = Math.round((endTime - startTime) / (24 * 60 * 60 * 1000)) + 1;
              const prevEnd = new Date(startTime - 1 * 24 * 60 * 60 * 1000);
              const prevStart = new Date(prevEnd.getTime() - (periodDays - 1) * 24 * 60 * 60 * 1000);

              const prevSum = sumInRange(padDate(prevStart).getTime(), padDate(prevEnd).getTime());

              const changePercent = prevSum === 0 ? (currentSum === 0 ? 0 : 100) : Math.round(((currentSum - prevSum) / prevSum) * 100);

              return {
                value: Math.abs(changePercent),
                timeframe: dateRange === 'thisMonth' ? 'mês anterior' : 'período anterior',
                isPositive: changePercent >= 0
              };
            } catch (err) {
              return undefined;
            }
          })()}
        />

        <MetricCard
          title="Chamados Abertos"
          value={isLoadingStats ? '...' : (stats as any)?.openTickets || 0}
          icon={<Clock className="h-5 w-5" />}
          iconBgColor="bg-red-100"
          iconColor="text-red-600"
        />

        <MetricCard
          title="Resolvidos Hoje"
          value={isLoadingStats ? '...' : (stats as any)?.resolvedToday || 0}
          icon={<CheckCircle className="h-5 w-5" />}
          iconBgColor="bg-green-100"
          iconColor="text-green-600"
        />

        <MetricCard
          title="Tempo de Resposta"
          value={isLoadingStats ? '...' : (stats as any)?.averageResponseTime || '0min'}
          icon={<Timer className="h-5 w-5" />}
          iconBgColor="bg-yellow-100"
          iconColor="text-yellow-600"
        />
        </div>
      )}
      
      {/* Dashboard específico para clientes */}
      {(user?.role === 'client_user' || user?.role === 'client_manager') && (
        <ClientDashboard 
          user={user} 
          stats={stats} 
          isLoadingStats={isLoadingStats}
          onNavigate={setLocation}
          onNewTicket={() => setIsNewTicketDialogOpen(true)}
        />
      )}

      {/* Dashboard Charts - Apenas para usuários não clientes */}
      {user?.role !== 'client_user' && user?.role !== 'client_manager' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <ChartCategory />
          <ChartVolume />
        </div>
      )}

      {/* Tickets SLA Crítico - Apenas para helpdesk */}
      {user?.role !== 'client_user' && user?.role !== 'client_manager' && (
        <CriticalSlaTickets userId={user?.id} />
      )}
      
      {/* Recent Tickets */}
      <Card className="overflow-hidden mb-6 bg-card border-border">
        <div className="p-5 border-b border-border">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-foreground">Chamados Recentes</h3>
            <Button variant="link" className="text-primary text-sm" onClick={() => setLocation('/tickets')}>
              Ver todos
            </Button>
          </div>
        </div>
        
        <TicketFilters
          onFilterChange={handleFilterChange}
          filters={filters}
        />
        
        <TicketTable 
          tickets={recentTickets} 
          isLoading={isLoadingTickets}
        />
      </Card>

      {/* SLA Section - Apenas para equipe helpdesk */}
      {user?.role !== 'client_user' && user?.role !== 'client_manager' && (
        <div className="space-y-6">
          {/* SLA Access Cards */}
          <SlaAccessCards />
          
          {/* SLA Metrics */}
          <SlaV2MetricsGrid />
        </div>
      )}
      
      {/* New Ticket Dialog */}
      <NewTicketDialog
        open={isNewTicketDialogOpen}
        onOpenChange={setIsNewTicketDialogOpen}
      />
    </AppLayout>
  );
}
