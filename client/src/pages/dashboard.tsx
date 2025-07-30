import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/app-layout';
import { MetricCard } from '@/components/dashboard/metric-card';
import { ChartCategory } from '@/components/dashboard/chart-category';
import { ChartVolume } from '@/components/dashboard/chart-volume';
import { TicketTable } from '@/components/tickets/ticket-table';
import { TicketFilters } from '@/components/tickets/ticket-filters';
import { NewTicketDialog } from '@/components/tickets/new-ticket-dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  TicketCheck, 
  Clock, 
  CheckCircle, 
  Timer,
  Plus
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function Dashboard() {
  const [dateRange, setDateRange] = useState('today');
  const [isNewTicketDialogOpen, setIsNewTicketDialogOpen] = useState(false);
  const [, setLocation] = useLocation();
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    category: '',
    assignee: '',
  });

  // Fetch statistics
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['/api/statistics'],
  });

  // Fetch tickets with related data
  const { data: tickets, isLoading: isLoadingTickets } = useQuery({
    queryKey: ['/api/tickets'],
  });

  // Get only the most recent 5 tickets
  const recentTickets = React.useMemo(() => {
    if (!tickets) return [];
    
    return [...tickets]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [tickets]);

  const handleFilterChange = (type: string, value: string) => {
    setFilters(prev => ({ ...prev, [type]: value }));
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
      
      {/* Dashboard Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total de Chamados"
          value={isLoadingStats ? '...' : stats?.totalTickets || 0}
          icon={<TicketCheck className="h-5 w-5" />}
          change={{
            value: 12,
            timeframe: "o último mês",
            isPositive: true
          }}
        />
        
        <MetricCard
          title="Chamados Abertos"
          value={isLoadingStats ? '...' : stats?.openTickets || 0}
          icon={<Clock className="h-5 w-5" />}
          change={{
            value: 8,
            timeframe: "ontem",
            isPositive: false
          }}
          iconBgColor="bg-red-100"
          iconColor="text-red-600"
        />
        
        <MetricCard
          title="Resolvidos Hoje"
          value={isLoadingStats ? '...' : stats?.resolvedToday || 0}
          icon={<CheckCircle className="h-5 w-5" />}
          change={{
            value: 24,
            timeframe: "ontem",
            isPositive: true
          }}
          iconBgColor="bg-green-100"
          iconColor="text-green-600"
        />
        
        <MetricCard
          title="Tempo de Resposta"
          value={isLoadingStats ? '...' : stats?.averageResponseTime || '0min'}
          icon={<Timer className="h-5 w-5" />}
          change={{
            value: 15,
            timeframe: "a última semana",
            isPositive: true
          }}
          iconBgColor="bg-yellow-100"
          iconColor="text-yellow-600"
        />
      </div>
      
      {/* Dashboard Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <ChartCategory />
        <ChartVolume />
      </div>
      
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
      
      {/* New Ticket Dialog */}
      <NewTicketDialog
        open={isNewTicketDialogOpen}
        onOpenChange={setIsNewTicketDialogOpen}
      />
    </AppLayout>
  );
}
