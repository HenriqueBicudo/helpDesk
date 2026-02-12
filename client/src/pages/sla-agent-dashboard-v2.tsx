import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AppLayout } from '@/components/layout/app-layout';
import { 
  Clock, 
  AlertTriangle, 
  RefreshCw,
  CheckCircle2,
  User,
  Calendar,
  MessageSquare,
  Target,
  Bell,
  BarChart3,
  Timer,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  useSlaV2Calculations, 
  useSlaV2Statistics,
  useSlaV2Recalculate,
  formatSlaTime,
  getSlaStatus,
  getSlaStatusColor,
  getTimeRemaining 
} from '@/hooks/use-sla-v2';

interface Ticket {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'pending' | 'resolved' | 'closed';
  assignedTo?: string;
  customer: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  responseDueAt?: string;
  solutionDueAt?: string;
}

const SlaAgentDashboardV2: React.FC = () => {
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // Buscar tickets atribuídos ao agente atual
  const { data: myTickets, isLoading: ticketsLoading, refetch: refetchTickets } = useQuery<Ticket[]>({
    queryKey: ['tickets', 'my-tickets'],
    queryFn: async () => {
      const response = await fetch('/api/tickets/my-tickets');
      if (!response.ok) throw new Error('Falha ao carregar tickets');
      return response.json();
    },
    refetchInterval: 30000 // Atualizar a cada 30 segundos
  });

  // SLA V2.0 - Hooks para dados aprimorados
  const { data: slaV2Statistics } = useSlaV2Statistics();
  const { data: slaV2Calculations } = useSlaV2Calculations({ limit: 100 });
  const recalculateMutation = useSlaV2Recalculate();

  // Filtrar tickets baseado nos filtros ativos
  const filteredTickets = React.useMemo(() => {
    if (!myTickets || !Array.isArray(myTickets)) return [];
    return myTickets.filter(ticket => {
      return priorityFilter === 'all' || ticket.priority === priorityFilter;
    });
  }, [myTickets, priorityFilter]);

  // Calcular estatísticas com base nos cálculos SLA V2
  const statsV2 = React.useMemo(() => {
    if (!slaV2Calculations?.data) return { total: 0, ok: 0, warning: 0, critical: 0 };

    const calculations = slaV2Calculations.data;
    const statusCounts = calculations.reduce((acc, calc) => {
      const status = getSlaStatus(calc);
      acc[status]++;
      return acc;
    }, { ok: 0, warning: 0, critical: 0 });

    return {
      total: calculations.length,
      ...statusCounts
    };
  }, [slaV2Calculations]);

  // Componente de card de ticket SLA V2
  const TicketCardV2: React.FC<{ ticket: Ticket }> = ({ ticket }) => {
    const slaV2Calc = slaV2Calculations?.data?.find(calc => 
      calc.ticketId.toString() === ticket.id && calc.isCurrent
    );

    const handleRecalculateSla = () => {
      if (ticket.id) {
        recalculateMutation.mutate({
          ticketId: parseInt(ticket.id),
          reason: 'Recálculo manual solicitado pelo agente'
        });
      }
    };

    return (
      <Card className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-base">
                  #{ticket.id} {ticket.title}
                </CardTitle>
                {slaV2Calc && (
                  <Badge className="bg-blue-600 text-white text-xs">SLA V2.0</Badge>
                )}
              </div>
              <CardDescription className="line-clamp-2">
                {ticket.description}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge 
                variant={ticket.priority === 'critical' ? 'destructive' : 
                        ticket.priority === 'high' ? 'default' :
                        ticket.priority === 'medium' ? 'secondary' : 'outline'}
                className="text-xs"
              >
                {ticket.priority}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {ticket.status}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <User className="h-4 w-4" />
            <span>{ticket.customer.name}</span>
            <span>•</span>
            <span>{ticket.customer.email}</span>
          </div>

          <div className="space-y-3">
            {slaV2Calc ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Target className="h-4 w-4 text-blue-500" />
                    {slaV2Calc.template?.name}
                  </h4>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleRecalculateSla}
                    disabled={recalculateMutation.isPending}
                    className="h-6 px-2 text-xs"
                  >
                    <RefreshCw className={cn("h-3 w-3", recalculateMutation.isPending && "animate-spin")} />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>Resposta</span>
                    </div>
                    <div className="text-sm font-medium">
                      {formatSlaTime(slaV2Calc.responseTimeMinutes)}
                    </div>
                    {slaV2Calc.responseDueDate && (() => {
                      const timeRemaining = getTimeRemaining(slaV2Calc.responseDueDate);
                      const colors = getSlaStatusColor(getSlaStatus(slaV2Calc));
                      return (
                        <Badge className={cn(colors.bg, colors.text, "text-xs")}>
                          {timeRemaining.formatted}
                        </Badge>
                      );
                    })()}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Solução</span>
                    </div>
                    <div className="text-sm font-medium">
                      {formatSlaTime(slaV2Calc.solutionTimeMinutes)}
                    </div>
                    {slaV2Calc.solutionDueDate && (() => {
                      const timeRemaining = getTimeRemaining(slaV2Calc.solutionDueDate);
                      const colors = getSlaStatusColor(getSlaStatus(slaV2Calc));
                      return (
                        <Badge className={cn(colors.bg, colors.text, "text-xs")}>
                          {timeRemaining.formatted}
                        </Badge>
                      );
                    })()}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {(() => {
                    const status = getSlaStatus(slaV2Calc);
                    const colors = getSlaStatusColor(status);
                    const statusLabels = {
                      'ok': 'Em Conformidade',
                      'warning': 'Próximo do Vencimento',
                      'critical': 'SLA Violado'
                    };
                    
                    return (
                      <Badge className={cn(colors.bg, colors.text, "text-xs flex items-center gap-1")}>
                        {status === 'ok' && <CheckCircle2 className="h-3 w-3" />}
                        {status === 'warning' && <AlertTriangle className="h-3 w-3" />}
                        {status === 'critical' && <Bell className="h-3 w-3" />}
                        {statusLabels[status]}
                      </Badge>
                    );
                  })()}
                </div>
              </div>
            ) : (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  SLA não configurado. Configure um contrato com template SLA V2.0.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>Criado: {new Date(ticket.createdAt).toLocaleDateString('pt-BR')}</span>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button size="sm" className="flex-1">
              <MessageSquare className="h-3 w-3 mr-1" />
              Responder
            </Button>
            <Button size="sm" variant="outline" className="flex-1">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Resolver
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const StatsCard: React.FC<{ 
    title: string; 
    value: number; 
    icon: React.ElementType;
    color: string;
    description?: string;
  }> = ({ title, value, icon: Icon, color, description }) => (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
            <p className={cn("text-2xl font-bold", color)}>{value}</p>
            {description && (
              <p className="text-xs text-gray-500 mt-1">{description}</p>
            )}
          </div>
          <Icon className={cn("h-8 w-8", color)} />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <AppLayout title="Dashboard SLA V2.0 - Agente">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">Dashboard SLA V2.0 - Agente</h1>
              <Badge className="bg-gradient-to-r from-blue-600 to-green-600 text-white">
                NOVO SISTEMA
              </Badge>
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              Gerencie seus tickets com o sistema SLA aprimorado
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => refetchTickets()} variant="outline" size="sm" disabled={ticketsLoading}>
              <RefreshCw className={cn("h-4 w-4 mr-1", ticketsLoading && "animate-spin")} />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Stats Cards SLA V2.0 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total de Tickets"
            value={statsV2.total}
            icon={BarChart3}
            color="text-blue-600"
            description="Tickets com SLA V2.0"
          />
          
          <StatsCard
            title="Em Conformidade"
            value={statsV2.ok}
            icon={CheckCircle2}
            color="text-green-600"
            description="Dentro dos prazos SLA"
          />
          
          <StatsCard
            title="Próximo Vencimento"
            value={statsV2.warning}
            icon={AlertTriangle}
            color="text-yellow-600"
            description="Atenção necessária"
          />
          
          <StatsCard
            title="SLA Violado"
            value={statsV2.critical}
            icon={Bell}
            color="text-red-600"
            description="Ação imediata necessária"
          />
        </div>

        {/* Métricas Gerais SLA V2.0 */}
        {slaV2Statistics?.data && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Timer className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Tempo Médio Resposta</p>
                    <p className="text-2xl font-bold">
                      {formatSlaTime(slaV2Statistics.data.averageResponseTime)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Tempo Médio Solução</p>
                    <p className="text-2xl font-bold">
                      {formatSlaTime(slaV2Statistics.data.averageSolutionTime)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-8 w-8 text-purple-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Taxa de Compliance</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {slaV2Statistics.data.complianceRate.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filtros */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <h3 className="font-medium">Filtrar por Prioridade:</h3>
              <div className="flex gap-2">
                {['all', 'critical', 'high', 'medium', 'low'].map((priority) => (
                  <Button
                    key={priority}
                    size="sm"
                    variant={priorityFilter === priority ? 'default' : 'outline'}
                    onClick={() => setPriorityFilter(priority)}
                  >
                    {priority === 'all' ? 'Todas' : priority}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Tickets */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">
            Meus Tickets ({filteredTickets.length})
          </h3>
          
          {ticketsLoading ? (
            <div className="grid gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              ))}
            </div>
          ) : filteredTickets.length > 0 ? (
            <div className="grid gap-4">
              {filteredTickets.map((ticket) => (
                <TicketCardV2 key={ticket.id} ticket={ticket} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Target className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum ticket encontrado</h3>
                <p className="text-muted-foreground">
                  Você não possui tickets atribuídos no momento.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default SlaAgentDashboardV2;