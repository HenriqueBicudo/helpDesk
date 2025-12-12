import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import SlaStatusBadge from '@/components/sla/sla-status-badge';
import SlaCountdown from '@/components/sla/sla-countdown';
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
  Search
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useSlaAlerts, slaUtils } from '@/hooks/use-sla';
import { 
  useSlaV2Calculations, 
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

const SlaAgentDashboard: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [slaFilter, setSlaFilter] = useState<string>('all');

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

  // Buscar alertas SLA para o agente (V1 - Legacy)
  const { data: slaAlerts } = useSlaAlerts({ 
    acknowledged: false,
    limit: 20 
  });

  // SLA V2.0 - Hooks para dados aprimorados
  const { data: slaV2Calculations } = useSlaV2Calculations({ limit: 50 });
  const recalculateMutation = useSlaV2Recalculate();

  // Filtrar tickets baseado nos filtros ativos
  const filteredTickets = React.useMemo(() => {
    if (!myTickets || !Array.isArray(myTickets)) return [];

    return myTickets.filter(ticket => {
      const matchesSearch = !searchQuery || 
        ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.customer.name.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;

      const matchesSla = (() => {
        if (slaFilter === 'all') return true;
        
        const responseBreach = slaUtils.isBreached(ticket.responseDueAt || null);
        const solutionBreach = slaUtils.isBreached(ticket.solutionDueAt || null);
        const responseApproaching = slaUtils.isApproachingBreach(ticket.responseDueAt || null);
        const solutionApproaching = slaUtils.isApproachingBreach(ticket.solutionDueAt || null);

        switch (slaFilter) {
          case 'breached':
            return responseBreach || solutionBreach;
          case 'approaching':
            return responseApproaching || solutionApproaching;
          case 'ok':
            return !responseBreach && !solutionBreach && !responseApproaching && !solutionApproaching;
          default:
            return true;
        }
      })();

      return matchesSearch && matchesPriority && matchesSla;
    });
  }, [myTickets, searchQuery, priorityFilter, slaFilter]);

  // Calcular estatísticas rápidas
  const stats = React.useMemo(() => {
    if (!myTickets || !Array.isArray(myTickets)) return { total: 0, breached: 0, approaching: 0, ok: 0 };

    const breached = myTickets.filter(t => 
      slaUtils.isBreached(t.responseDueAt || null) || 
      slaUtils.isBreached(t.solutionDueAt || null)
    ).length;

    const approaching = myTickets.filter(t => 
      slaUtils.isApproachingBreach(t.responseDueAt || null) || 
      slaUtils.isApproachingBreach(t.solutionDueAt || null)
    ).length;

    return {
      total: myTickets.length,
      breached,
      approaching,
      ok: myTickets.length - breached - approaching
    };
  }, [myTickets]);

  // Componente aprimorado de ticket com SLA V2
  const TicketCardV2: React.FC<{ ticket: Ticket }> = ({ ticket }) => {
    // Buscar cálculo SLA V2 para este ticket
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
                <CardTitle className="text-base line-clamp-1">
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
          {/* Informações do Cliente */}
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <User className="h-4 w-4" />
            <span>{ticket.customer.name}</span>
            <span>•</span>
            <span>{ticket.customer.email}</span>
          </div>

          {/* Status SLA V2.0 Aprimorado */}
          <div className="space-y-3">
            {slaV2Calc ? (
              <div className="space-y-3">
                {/* Header SLA V2 */}
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Target className="h-4 w-4 text-blue-500" />
                    SLA V2.0 - {slaV2Calc.template?.name}
                  </h4>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleRecalculateSla}
                    disabled={recalculateMutation.isPending}
                    className="h-6 px-2 text-xs"
                  >
                    <RefreshCw className={cn(
                      "h-3 w-3", 
                      recalculateMutation.isPending && "animate-spin"
                    )} />
                  </Button>
                </div>

                {/* Prazos SLA V2 */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Prazo de Resposta */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>Resposta</span>
                    </div>
                    <div className="space-y-1">
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
                  </div>

                  {/* Prazo de Solução */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Solução</span>
                    </div>
                    <div className="space-y-1">
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
                </div>

                {/* Status Geral SLA */}
                <div className="flex items-center gap-2">
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
                  <span className="text-xs text-muted-foreground">
                    Calculado em {new Date(slaV2Calc.calculatedAt).toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>
            ) : (
              /* Fallback para SLA V1 ou sem SLA */
              <div className="space-y-2">
                {(ticket.responseDueAt || ticket.solutionDueAt) ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-orange-600">
                      <AlertTriangle className="h-4 w-4" />
                      <span>SLA V1 (Legacy)</span>
                    </div>
                    <SlaStatusBadge
                      responseDueAt={ticket.responseDueAt}
                      solutionDueAt={ticket.solutionDueAt}
                      priority={ticket.priority}
                      status={ticket.status}
                      size="sm"
                    />
                    <SlaCountdown
                      responseDueAt={ticket.responseDueAt}
                      solutionDueAt={ticket.solutionDueAt}
                      priority={ticket.priority}
                      status={ticket.status}
                      size="sm"
                      showProgressBar={true}
                    />
                  </div>
                ) : (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      SLA não configurado para este ticket. Configure um contrato com template SLA V2.0.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </div>

          {/* Timestamps */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>Criado: {new Date(ticket.createdAt).toLocaleDateString('pt-BR')}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>Atualizado: {new Date(ticket.updatedAt).toLocaleDateString('pt-BR')}</span>
            </div>
          </div>

          {/* Ações */}
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
    <AppLayout title="Dashboard SLA - Agente">
      <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard SLA - Agente</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gerencie seus tickets e monitore prazos de SLA
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => refetchTickets()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-1" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard
          title="Total de Tickets"
          value={stats.total}
          icon={Target}
          color="text-blue-600"
          description="Tickets atribuídos a você"
        />
        <StatsCard
          title="SLA Violado"
          value={stats.breached}
          icon={AlertTriangle}
          color="text-red-600"
          description="Ação urgente necessária"
        />
        <StatsCard
          title="SLA Crítico"
          value={stats.approaching}
          icon={Clock}
          color="text-orange-600"
          description="Próximos do vencimento"
        />
        <StatsCard
          title="SLA OK"
          value={stats.ok}
          icon={CheckCircle2}
          color="text-green-600"
          description="Dentro do prazo"
        />
      </div>

      {/* Alertas SLA */}
      {slaAlerts && slaAlerts.length > 0 && (
        <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
          <Bell className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium mb-2">Você tem {slaAlerts.length} alertas SLA ativos</div>
            <div className="space-y-1">
              {slaAlerts.slice(0, 3).map((alert) => (
                <div key={alert.id} className="text-sm">
                  • {alert.message}
                </div>
              ))}
              {slaAlerts.length > 3 && (
                <div className="text-sm font-medium">
                  + {slaAlerts.length - 3} outros alertas
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Filtros e Busca */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Meus Tickets</CardTitle>
          <CardDescription>
            Tickets atribuídos a você com informações de SLA
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por título ou cliente..."
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-3 py-2 border rounded-md bg-background"
              >
                <option value="all">Todas as Prioridades</option>
                <option value="critical">Crítica</option>
                <option value="high">Alta</option>
                <option value="medium">Média</option>
                <option value="low">Baixa</option>
              </select>

              <select
                value={slaFilter}
                onChange={(e) => setSlaFilter(e.target.value)}
                className="px-3 py-2 border rounded-md bg-background"
              >
                <option value="all">Todos os SLA</option>
                <option value="breached">SLA Violado</option>
                <option value="approaching">SLA Crítico</option>
                <option value="ok">SLA OK</option>
              </select>
            </div>
          </div>

          {/* Lista de Tickets */}
          {ticketsLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span className="ml-2">Carregando tickets...</span>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center py-8">
              <Target className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                {myTickets?.length === 0 
                  ? 'Nenhum ticket atribuído a você' 
                  : 'Nenhum ticket encontrado com os filtros aplicados'
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredTickets.map((ticket) => (
                <TicketCardV2 key={ticket.id} ticket={ticket} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </AppLayout>
  );
};

export default SlaAgentDashboard;
