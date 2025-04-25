import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { User, Ticket, TicketWithRelations } from '@shared/schema';
import { CalendarIcon, Download, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function Reports() {
  const [dateRange, setDateRange] = useState({
    from: startOfMonth(subMonths(new Date(), 1)),
    to: endOfMonth(new Date()),
  });
  const [reportPeriod, setReportPeriod] = useState('30days');
  
  // Fetch tickets
  const { data: tickets, isLoading: isLoadingTickets } = useQuery<TicketWithRelations[]>({
    queryKey: ['/api/tickets'],
  });
  
  // Fetch users (agents)
  const { data: users, isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });
  
  // Fetch statistics
  const { data: statistics, isLoading: isLoadingStats } = useQuery({
    queryKey: ['/api/statistics'],
  });
  
  // Fetch category statistics
  const { data: categoryStats, isLoading: isLoadingCategoryStats } = useQuery({
    queryKey: ['/api/statistics/categories'],
  });
  
  // Fetch volume statistics
  const { data: volumeStats, isLoading: isLoadingVolumeStats } = useQuery({
    queryKey: ['/api/statistics/volume'],
  });
  
  const isLoading = isLoadingTickets || isLoadingUsers || isLoadingStats || isLoadingCategoryStats || isLoadingVolumeStats;
  
  // Calculate metrics based on data
  const calculateMetrics = () => {
    if (!tickets || !users) return null;
    
    // Filter tickets by date range if needed
    const filteredTickets = tickets.filter(ticket => {
      const ticketDate = parseISO(ticket.createdAt.toString());
      return ticketDate >= dateRange.from && ticketDate <= dateRange.to;
    });
    
    // Calculate resolution time (in hours) for resolved tickets
    const resolvedTickets = filteredTickets.filter(ticket => 
      ticket.status === 'resolved' || ticket.status === 'closed'
    );
    
    const avgResolutionTime = resolvedTickets.length 
      ? resolvedTickets.reduce((total, ticket) => {
          const createdAt = parseISO(ticket.createdAt.toString());
          const updatedAt = parseISO(ticket.updatedAt.toString());
          const diffHours = (updatedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
          return total + diffHours;
        }, 0) / resolvedTickets.length
      : 0;
    
    // Calculate tickets by status
    const ticketsByStatus = {
      open: filteredTickets.filter(t => t.status === 'open').length,
      in_progress: filteredTickets.filter(t => t.status === 'in_progress').length,
      pending: filteredTickets.filter(t => t.status === 'pending').length,
      resolved: filteredTickets.filter(t => t.status === 'resolved').length,
      closed: filteredTickets.filter(t => t.status === 'closed').length,
    };
    
    // Calculate tickets by priority
    const ticketsByPriority = {
      low: filteredTickets.filter(t => t.priority === 'low').length,
      medium: filteredTickets.filter(t => t.priority === 'medium').length,
      high: filteredTickets.filter(t => t.priority === 'high').length,
      critical: filteredTickets.filter(t => t.priority === 'critical').length,
    };
    
    // Calculate tickets by agent
    const ticketsByAgent = users.map(user => ({
      agent: user.fullName,
      assigned: filteredTickets.filter(t => t.assigneeId === user.id).length,
      resolved: filteredTickets.filter(t => 
        t.assigneeId === user.id && 
        (t.status === 'resolved' || t.status === 'closed')
      ).length,
    }));
    
    return {
      totalTickets: filteredTickets.length,
      avgResolutionTime,
      ticketsByStatus,
      ticketsByPriority,
      ticketsByAgent,
    };
  };
  
  const metrics = calculateMetrics();
  
  // Data for status chart
  const statusChartData = metrics ? [
    { name: 'Aberto', value: metrics.ticketsByStatus.open },
    { name: 'Em Progresso', value: metrics.ticketsByStatus.in_progress },
    { name: 'Pendente', value: metrics.ticketsByStatus.pending },
    { name: 'Resolvido', value: metrics.ticketsByStatus.resolved },
    { name: 'Fechado', value: metrics.ticketsByStatus.closed },
  ] : [];
  
  // Data for priority chart
  const priorityChartData = metrics ? [
    { name: 'Baixa', value: metrics.ticketsByPriority.low },
    { name: 'Média', value: metrics.ticketsByPriority.medium },
    { name: 'Alta', value: metrics.ticketsByPriority.high },
    { name: 'Crítica', value: metrics.ticketsByPriority.critical },
  ] : [];
  
  // Helper to translate the category names
  const translateCategory = (category: string) => {
    switch (category) {
      case 'technical_support': return 'Suporte Técnico';
      case 'financial': return 'Financeiro';
      case 'commercial': return 'Comercial';
      case 'other': return 'Outros';
      default: return category;
    }
  };
  
  // Data for category chart
  const categoryChartData = categoryStats ? categoryStats.map(stat => ({
    name: translateCategory(stat.category),
    value: stat.count
  })) : [];
  
  // Data for volume chart
  const volumeChartData = volumeStats ? volumeStats.map(stat => ({
    name: format(parseISO(stat.date), 'dd/MM'),
    value: stat.count
  })) : [];

  const handleExportCSV = () => {
    if (!tickets) return;
    
    // Filter tickets by date range
    const filteredTickets = tickets.filter(ticket => {
      const ticketDate = parseISO(ticket.createdAt.toString());
      return ticketDate >= dateRange.from && ticketDate <= dateRange.to;
    });
    
    // Create CSV content
    const headers = 'ID,Assunto,Descrição,Status,Prioridade,Categoria,Cliente,Agente,Data de Criação,Data de Atualização\n';
    
    const csvContent = filteredTickets.reduce((acc, ticket) => {
      const requester = ticket.requester?.fullName || '';
      const assignee = users?.find(u => u.id === ticket.assigneeId)?.fullName || '';
      
      return acc + `${ticket.id},"${ticket.subject.replace(/"/g, '""')}","${ticket.description.replace(/"/g, '""')}",${ticket.status},${ticket.priority},${ticket.category},"${requester}","${assignee}",${format(parseISO(ticket.createdAt.toString()), 'dd/MM/yyyy')},${format(parseISO(ticket.updatedAt.toString()), 'dd/MM/yyyy')}\n`;
    }, headers);
    
    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `tickets-report-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handlePeriodChange = (value: string) => {
    setReportPeriod(value);
    
    // Update date range based on selected period
    const now = new Date();
    let from;
    
    switch (value) {
      case '7days':
        from = new Date(now);
        from.setDate(now.getDate() - 7);
        break;
      case '30days':
        from = new Date(now);
        from.setDate(now.getDate() - 30);
        break;
      case '90days':
        from = new Date(now);
        from.setDate(now.getDate() - 90);
        break;
      case 'thisMonth':
        from = startOfMonth(now);
        break;
      case 'lastMonth':
        from = startOfMonth(subMonths(now, 1));
        break;
      default:
        from = new Date(now);
        from.setDate(now.getDate() - 30);
    }
    
    setDateRange({
      from,
      to: now
    });
  };

  if (isLoading) {
    return (
      <AppLayout title="Relatórios">
        <div className="flex items-center justify-center h-[80vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Relatórios">
      <div className="p-6 space-y-6">
        {/* Report Controls */}
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="space-y-1 w-full md:w-auto">
              <Label htmlFor="period">Período</Label>
              <Select 
                value={reportPeriod} 
                onValueChange={handlePeriodChange}
              >
                <SelectTrigger id="period" className="w-[180px]">
                  <SelectValue placeholder="Selecione o período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7days">Últimos 7 dias</SelectItem>
                  <SelectItem value="30days">Últimos 30 dias</SelectItem>
                  <SelectItem value="90days">Últimos 90 dias</SelectItem>
                  <SelectItem value="thisMonth">Este mês</SelectItem>
                  <SelectItem value="lastMonth">Mês passado</SelectItem>
                  <SelectItem value="custom">Período personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {reportPeriod === 'custom' && (
              <div className="flex flex-col md:flex-row gap-2">
                <div className="grid gap-2">
                  <Label>Data inicial</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-[240px] justify-start text-left font-normal",
                          !dateRange.from && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange.from ? (
                          format(dateRange.from, "dd/MM/yyyy")
                        ) : (
                          <span>Selecione a data</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={dateRange.from}
                        onSelect={(date) => date && setDateRange({ ...dateRange, from: date })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div className="grid gap-2">
                  <Label>Data final</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-[240px] justify-start text-left font-normal",
                          !dateRange.to && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange.to ? (
                          format(dateRange.to, "dd/MM/yyyy")
                        ) : (
                          <span>Selecione a data</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={dateRange.to}
                        onSelect={(date) => date && setDateRange({ ...dateRange, to: date })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}
          </div>
          
          <Button 
            onClick={handleExportCSV}
            variant="outline"
          >
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
        </div>
        
        {/* Report Content */}
        <Tabs defaultValue="overview">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="performance">Desempenho</TabsTrigger>
            <TabsTrigger value="agents">Agentes</TabsTrigger>
          </TabsList>
          
          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Summary Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Resumo</CardTitle>
                  <CardDescription>
                    Resumo dos chamados no período selecionado
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <p className="text-sm text-blue-600 font-medium">Total de Chamados</p>
                        <p className="text-3xl font-bold">{metrics?.totalTickets || 0}</p>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg">
                        <p className="text-sm text-green-600 font-medium">Resolvidos</p>
                        <p className="text-3xl font-bold">{metrics?.ticketsByStatus.resolved || 0}</p>
                      </div>
                      <div className="bg-yellow-50 p-4 rounded-lg">
                        <p className="text-sm text-yellow-600 font-medium">Em Andamento</p>
                        <p className="text-3xl font-bold">{metrics?.ticketsByStatus.in_progress || 0}</p>
                      </div>
                      <div className="bg-red-50 p-4 rounded-lg">
                        <p className="text-sm text-red-600 font-medium">Críticos</p>
                        <p className="text-3xl font-bold">{metrics?.ticketsByPriority.critical || 0}</p>
                      </div>
                    </div>
                    <div className="pt-4 border-t">
                      <p className="text-sm font-medium mb-2">Tempo Médio de Resolução</p>
                      <p className="text-2xl font-bold">
                        {metrics?.avgResolutionTime ? metrics.avgResolutionTime.toFixed(1) : 0}
                        <span className="text-sm text-gray-500 ml-1">horas</span>
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Status Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Distribuição por Status</CardTitle>
                  <CardDescription>
                    Chamados por status no período
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {statusChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              {/* Category Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Distribuição por Categoria</CardTitle>
                  <CardDescription>
                    Chamados por categoria no período
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={categoryChartData}
                        margin={{
                          top: 5,
                          right: 30,
                          left: 20,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              {/* Priority Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Distribuição por Prioridade</CardTitle>
                  <CardDescription>
                    Chamados por prioridade no período
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={priorityChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {priorityChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* Performance Tab */}
          <TabsContent value="performance">
            <div className="grid grid-cols-1 gap-6">
              {/* Volume Over Time */}
              <Card>
                <CardHeader>
                  <CardTitle>Volume de Chamados</CardTitle>
                  <CardDescription>
                    Número de chamados ao longo do tempo
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={volumeChartData}
                        margin={{
                          top: 5,
                          right: 30,
                          left: 20,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="value" 
                          stroke="#3b82f6" 
                          activeDot={{ r: 8 }} 
                          name="Número de Chamados"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              {/* Resolution Time Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle>Métricas de Desempenho</CardTitle>
                  <CardDescription>
                    Detalhes de desempenho no período selecionado
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-lg border">
                      <h3 className="text-sm font-medium text-gray-500">Tempo Médio de Resolução</h3>
                      <p className="text-2xl font-bold mt-2">
                        {metrics?.avgResolutionTime ? metrics.avgResolutionTime.toFixed(1) : 0}
                        <span className="text-sm text-gray-500 ml-1">horas</span>
                      </p>
                    </div>
                    
                    <div className="bg-white p-6 rounded-lg border">
                      <h3 className="text-sm font-medium text-gray-500">Taxa de Resolução</h3>
                      <p className="text-2xl font-bold mt-2">
                        {metrics && metrics.totalTickets 
                          ? Math.round((metrics.ticketsByStatus.resolved / metrics.totalTickets) * 100) 
                          : 0}
                        <span className="text-sm text-gray-500 ml-1">%</span>
                      </p>
                    </div>
                    
                    <div className="bg-white p-6 rounded-lg border">
                      <h3 className="text-sm font-medium text-gray-500">Chamados por Dia</h3>
                      <p className="text-2xl font-bold mt-2">
                        {metrics && metrics.totalTickets && dateRange.from && dateRange.to
                          ? (metrics.totalTickets / (((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)) || 1)).toFixed(1)
                          : 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* Agents Tab */}
          <TabsContent value="agents">
            <Card>
              <CardHeader>
                <CardTitle>Desempenho de Agentes</CardTitle>
                <CardDescription>
                  Estatísticas de desempenho por agente
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Agente</TableHead>
                        <TableHead>Chamados Atribuídos</TableHead>
                        <TableHead>Chamados Resolvidos</TableHead>
                        <TableHead>Taxa de Resolução</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {metrics?.ticketsByAgent.map((agentStat, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{agentStat.agent}</TableCell>
                          <TableCell>{agentStat.assigned}</TableCell>
                          <TableCell>{agentStat.resolved}</TableCell>
                          <TableCell>
                            {agentStat.assigned 
                              ? `${Math.round((agentStat.resolved / agentStat.assigned) * 100)}%` 
                              : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                      {!metrics?.ticketsByAgent.length && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-4 text-gray-500">
                            Nenhum dado disponível para o período selecionado
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                
                {/* Agent Performance Chart */}
                {metrics?.ticketsByAgent.length ? (
                  <div className="mt-6 h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={metrics.ticketsByAgent}
                        margin={{
                          top: 5,
                          right: 30,
                          left: 20,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="agent" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="assigned" name="Atribuídos" fill="#3b82f6" />
                        <Bar dataKey="resolved" name="Resolvidos" fill="#10b981" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}