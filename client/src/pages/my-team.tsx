import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AppLayout } from "@/components/layout/app-layout";
import { useAuth } from "@/hooks/use-auth";
import { useClientRestrictions } from "@/hooks/use-client-restrictions";
import { 
  Users, 
  Search, 
  Mail, 
  Calendar, 
  Shield, 
  Building2,
  UserCheck,
  Clock,
  BarChart3,
  Ticket,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Timer,
  User
} from "lucide-react";
import { getInitials, formatDate } from "@/lib/utils";

interface TeamMember {
  id: number;
  fullName: string;
  email: string;
  role: 'admin' | 'helpdesk_manager' | 'helpdesk_agent' | 'client_manager' | 'client_user';
  isActive: boolean;
  createdAt: string;
  company?: string;
  avatarUrl?: string;
  lastLogin?: string;
  ticketsAssigned?: number;
  ticketsResolved?: number;
}

const roleLabels = {
  admin: 'Gestor Helpdesk',
  helpdesk_manager: 'Gerente de Suporte',
  helpdesk_agent: 'Agente Helpdesk',
  client_manager: 'Admin Cliente',
  client_user: 'Cliente'
};

const roleColors = {
  admin: 'destructive',
  helpdesk_manager: 'default',
  helpdesk_agent: 'secondary',
  client_manager: 'outline',
  client_user: 'outline'
} as const;

export default function MyTeam() {
  const { user } = useAuth();
  const clientRestrictions = useClientRestrictions();
  const [searchTerm, setSearchTerm] = useState("");

  // Query para buscar todas as equipes do usuário
  const { data: userTeams = [], isLoading } = useQuery({
    queryKey: ['user-teams', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await fetch(`/api/users/${user.id}/teams`);
      if (!response.ok) throw new Error('Erro ao carregar equipes');
      return response.json();
    },
    enabled: !!user?.id && !clientRestrictions.isClient
  });

  // Query para buscar todos os tickets
  const { data: allTickets = [] } = useQuery({
    queryKey: ['all-tickets'],
    queryFn: async () => {
      const response = await fetch(`/api/tickets`);
      if (!response.ok) throw new Error('Erro ao carregar tickets');
      return response.json();
    },
    enabled: !!user?.id && !clientRestrictions.isClient
  });

  // Função para filtrar tickets ativos de uma equipe específica
  const getTeamActiveTickets = (teamId: number) => {
    return allTickets.filter((ticket: any) => {
      const isActive = ['open', 'in_progress', 'pending'].includes(ticket.status);
      const belongsToTeam = ticket.teamId === teamId;
      return isActive && belongsToTeam;
    });
  };

  // Query para buscar colegas da empresa (para clientes)
  const { data: colleagues } = useQuery({
    queryKey: ['company-colleagues', user?.company],
    queryFn: async () => {
      const response = await fetch(`/api/users/company-colleagues`);
      if (!response.ok) throw new Error('Erro ao carregar colegas');
      return response.json();
    },
    enabled: clientRestrictions.isClient && !!user?.company
  });

  // Filtrar colegas por termo de busca (apenas para clientes)
  const filteredColleagues = colleagues?.filter((colleague: TeamMember) =>
    colleague.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    colleague.email.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (isLoading) {
    return (
      <AppLayout title="Minha Equipe">
        <div className="container mx-auto py-6">
          <div className="text-center py-8">Carregando...</div>
        </div>
      </AppLayout>
    );
  }

  // Se o usuário não tem equipe e é cliente, mostrar colegas da empresa
  if (clientRestrictions.isClient) {
    return (
      <AppLayout title="Meus Colegas">
        <div className="container mx-auto py-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold">Meus Colegas</h1>
              <p className="text-muted-foreground">
                Veja os colegas da sua empresa cadastrados no sistema
              </p>
            </div>
            <Badge variant="outline" className="px-3 py-1">
              <Building2 className="h-4 w-4 mr-1" />
              {user?.company || 'Empresa'}
            </Badge>
          </div>

          {/* Estatísticas simples */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Total de Colegas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{colleagues?.length || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
                  Ativos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {colleagues?.filter((c: TeamMember) => c.isActive).length || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Administradores
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {colleagues?.filter((c: TeamMember) => c.role === 'client_manager').length || 0}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Busca */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar colegas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {/* Lista de Colegas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredColleagues.length === 0 ? (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                {searchTerm ? "Nenhum colega encontrado" : "Nenhum colega cadastrado"}
              </div>
            ) : (
              filteredColleagues.map((colleague: TeamMember) => (
                <Card key={colleague.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {getInitials(colleague.fullName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <CardTitle className="text-lg">{colleague.fullName}</CardTitle>
                        <Badge variant={roleColors[colleague.role]}>
                          {roleLabels[colleague.role]}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-3">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{colleague.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>Desde {formatDate(new Date(colleague.createdAt), 'dd/MM/yyyy')}</span>
                      </div>
                      {colleague.lastLogin && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>Último acesso: {formatDate(new Date(colleague.lastLogin), 'dd/MM/yyyy')}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </AppLayout>
    );
  }

  // Se usuário não tem equipe (helpdesk sem equipe)
  if (!clientRestrictions.isClient && userTeams.length === 0) {
    return (
      <AppLayout title="Minhas Equipes">
        <div className="container mx-auto py-6">
          <div className="text-center py-12">
            <Users className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Você não está em nenhuma equipe</h2>
            <p className="text-muted-foreground">
              Entre em contato com um administrador para ser adicionado a uma equipe.
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Renderização para usuários helpdesk (com múltiplas equipes)
  if (!clientRestrictions.isClient) {
    return (
      <AppLayout title="Minhas Equipes">
        <div className="container mx-auto py-6 space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold">Minhas Equipes</h1>
              <p className="text-muted-foreground">
                Dashboard completo dos chamados e performance das suas equipes
              </p>
            </div>
            <Badge variant="outline" className="px-3 py-1">
              <Users className="h-4 w-4 mr-1" />
              {userTeams.length} {userTeams.length === 1 ? 'equipe' : 'equipes'}
            </Badge>
          </div>

          {/* Cards das Equipes */}
          {userTeams.map((team: any) => {
            const teamTickets = getTeamActiveTickets(team.id);
            
            // Calcular estatísticas da equipe
            const ticketsByStatus = {
              open: teamTickets.filter(t => t.status === 'open').length,
              in_progress: teamTickets.filter(t => t.status === 'in_progress').length,
              pending: teamTickets.filter(t => t.status === 'pending').length
            };

            const ticketsByPriority = {
              critical: teamTickets.filter(t => t.priority === 'critical').length,
              high: teamTickets.filter(t => t.priority === 'high').length,
              medium: teamTickets.filter(t => t.priority === 'medium').length,
              low: teamTickets.filter(t => t.priority === 'low').length
            };

            // Tickets com SLA próximo do vencimento (próximas 2 horas)
            const now = new Date();
            const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
            const ticketsWithSLAWarning = teamTickets.filter((ticket: any) => {
              if (!ticket.solutionDueAt) return false;
              const dueDate = new Date(ticket.solutionDueAt);
              return dueDate > now && dueDate <= twoHoursFromNow;
            });

            // Tickets com SLA vencido
            const ticketsWithExpiredSLA = teamTickets.filter((ticket: any) => {
              if (!ticket.solutionDueAt) return false;
              return new Date(ticket.solutionDueAt) < now;
            });

            // Agrupar tickets por agente
            const ticketsByAgent = teamTickets.reduce((acc: any, ticket: any) => {
              const agentName = ticket.assignee?.fullName || 'Não atribuído';
              const agentId = ticket.assignee?.id || 0;
              if (!acc[agentId]) {
                acc[agentId] = {
                  name: agentName,
                  tickets: [],
                  count: 0
                };
              }
              acc[agentId].tickets.push(ticket);
              acc[agentId].count++;
              return acc;
            }, {});

            const agentStats = Object.values(ticketsByAgent).sort((a: any, b: any) => b.count - a.count);
            
            return (
              <Card key={team.id} className="overflow-hidden">
                <CardHeader className="bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl flex items-center gap-2">
                        {team.name}
                        {team.isPrimary && (
                          <Badge variant="default" className="text-xs">
                            Principal
                          </Badge>
                        )}
                      </CardTitle>
                      {team.description && (
                        <p className="text-sm text-muted-foreground mt-1">{team.description}</p>
                      )}
                    </div>
                    <Badge variant="secondary" className="text-lg px-4 py-2">
                      <Ticket className="h-4 w-4 mr-2" />
                      {teamTickets.length}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="pt-6 space-y-6">
                  {/* Estatísticas rápidas */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <Card className="bg-blue-50 border-blue-200">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs text-blue-700">Abertos</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-blue-900">{ticketsByStatus.open}</div>
                      </CardContent>
                    </Card>

                    <Card className="bg-yellow-50 border-yellow-200">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs text-yellow-700">Em Progresso</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-yellow-900">{ticketsByStatus.in_progress}</div>
                      </CardContent>
                    </Card>

                    <Card className="bg-purple-50 border-purple-200">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs text-purple-700">Pendentes</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-purple-900">{ticketsByStatus.pending}</div>
                      </CardContent>
                    </Card>

                    <Card className={ticketsWithExpiredSLA.length > 0 ? "bg-red-50 border-red-300" : "bg-gray-50"}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs flex items-center gap-1 text-red-700">
                          <AlertTriangle className="h-3 w-3" />
                          SLA Vencido
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className={`text-2xl font-bold ${ticketsWithExpiredSLA.length > 0 ? 'text-red-900' : 'text-gray-500'}`}>
                          {ticketsWithExpiredSLA.length}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className={ticketsWithSLAWarning.length > 0 ? "bg-orange-50 border-orange-200" : "bg-gray-50"}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs flex items-center gap-1 text-orange-700">
                          <Timer className="h-3 w-3" />
                          SLA 2h
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className={`text-2xl font-bold ${ticketsWithSLAWarning.length > 0 ? 'text-orange-900' : 'text-gray-500'}`}>
                          {ticketsWithSLAWarning.length}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Distribuição por Prioridade */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Distribuição por Prioridade
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <span className="text-sm">Crítica: <strong>{ticketsByPriority.critical}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                        <span className="text-sm">Alta: <strong>{ticketsByPriority.high}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <span className="text-sm">Média: <strong>{ticketsByPriority.medium}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span className="text-sm">Baixa: <strong>{ticketsByPriority.low}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Distribuição por Agente */}
                  {agentStats.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Chamados por Agente
                      </h3>
                      <div className="space-y-2">
                        {agentStats.map((agent: any, index: number) => (
                          <div key={index} className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {getInitials(agent.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-medium truncate">{agent.name}</span>
                                <Badge variant="secondary" className="shrink-0">
                                  {agent.count}
                                </Badge>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full transition-all" 
                                  style={{ width: `${Math.min((agent.count / teamTickets.length) * 100, 100)}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tickets com SLA Crítico */}
                  {(ticketsWithExpiredSLA.length > 0 || ticketsWithSLAWarning.length > 0) && (
                    <div>
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-red-600">
                        <AlertTriangle className="h-4 w-4" />
                        Tickets com SLA Crítico
                      </h3>
                      <div className="space-y-2">
                        {[...ticketsWithExpiredSLA, ...ticketsWithSLAWarning].slice(0, 5).map((ticket: any) => {
                          const isExpired = new Date(ticket.solutionDueAt) < now;
                          return (
                            <Card 
                              key={ticket.id}
                              className={`cursor-pointer hover:shadow-md transition-shadow ${isExpired ? 'border-red-300 bg-red-50' : 'border-orange-300 bg-orange-50'}`}
                              onClick={() => window.location.href = `/tickets/${ticket.id}`}
                            >
                              <CardContent className="py-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">#{ticket.id} - {ticket.subject}</p>
                                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                      {ticket.assignee && (
                                        <span className="flex items-center gap-1">
                                          <User className="h-3 w-3" />
                                          {ticket.assignee.fullName}
                                        </span>
                                      )}
                                      {ticket.solutionDueAt && (
                                        <span className={`flex items-center gap-1 font-medium ${isExpired ? 'text-red-600' : 'text-orange-600'}`}>
                                          <Clock className="h-3 w-3" />
                                          {isExpired ? 'Vencido' : 'Vence'} em{' '}
                                          {formatDate(new Date(ticket.solutionDueAt), 'dd/MM/yyyy HH:mm')}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <Badge variant={isExpired ? 'destructive' : 'default'}>
                                    {ticket.priority === 'critical' ? 'Crítica' :
                                     ticket.priority === 'high' ? 'Alta' :
                                     ticket.priority === 'medium' ? 'Média' : 'Baixa'}
                                  </Badge>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Lista de Tickets */}
                  {teamTickets.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-50 text-green-500" />
                      <p className="font-medium">Excelente! Nenhum chamado ativo</p>
                      <p className="text-sm">Esta equipe está sem tickets pendentes</p>
                    </div>
                  ) : (
                    <>
                      <div>
                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                          <Ticket className="h-4 w-4" />
                          Todos os Chamados Ativos
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {teamTickets.slice(0, 9).map((ticket: any) => {
                            const hasSLA = ticket.solutionDueAt && new Date(ticket.solutionDueAt) > now;
                            const slaExpired = ticket.solutionDueAt && new Date(ticket.solutionDueAt) < now;
                            
                            return (
                              <Card 
                                key={ticket.id} 
                                className={`hover:shadow-md transition-shadow cursor-pointer ${
                                  slaExpired ? 'border-red-300' : ''
                                }`}
                                onClick={() => window.location.href = `/tickets/${ticket.id}`}
                              >
                                <CardHeader className="pb-3">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <CardTitle className="text-sm line-clamp-2">{ticket.subject}</CardTitle>
                                      <p className="text-xs text-muted-foreground mt-1">#{ticket.id}</p>
                                    </div>
                                    <Badge 
                                      variant={
                                        ticket.priority === 'critical' ? 'destructive' :
                                        ticket.priority === 'high' ? 'default' :
                                        ticket.priority === 'medium' ? 'secondary' : 'outline'
                                      }
                                      className="shrink-0"
                                    >
                                      {ticket.priority === 'critical' ? 'Crítica' :
                                       ticket.priority === 'high' ? 'Alta' :
                                       ticket.priority === 'medium' ? 'Média' : 'Baixa'}
                                    </Badge>
                                  </div>
                                </CardHeader>
                                
                                <CardContent className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Badge variant={
                                      ticket.status === 'open' ? 'default' :
                                      ticket.status === 'in_progress' ? 'secondary' :
                                      'outline'
                                    }>
                                      {ticket.status === 'open' ? 'Aberto' :
                                       ticket.status === 'in_progress' ? 'Em Progresso' :
                                       ticket.status === 'pending' ? 'Pendente' : ticket.status}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {formatDate(new Date(ticket.createdAt), 'dd/MM')}
                                    </span>
                                  </div>
                                  
                                  {ticket.assignee && (
                                    <div className="flex items-center gap-2">
                                      <Avatar className="h-5 w-5">
                                        <AvatarFallback className="text-xs">
                                          {getInitials(ticket.assignee.fullName)}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="text-xs text-muted-foreground truncate">
                                        {ticket.assignee.fullName}
                                      </span>
                                    </div>
                                  )}
                                  
                                  {ticket.requester && (
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <Mail className="h-3 w-3" />
                                      <span className="truncate">{ticket.requester.fullName}</span>
                                    </div>
                                  )}

                                  {(hasSLA || slaExpired) && (
                                    <div className={`flex items-center gap-1 text-xs ${slaExpired ? 'text-red-600 font-semibold' : 'text-orange-600'}`}>
                                      <Timer className="h-3 w-3" />
                                      <span>
                                        {slaExpired ? 'SLA Vencido!' : `SLA: ${formatDate(new Date(ticket.solutionDueAt), 'dd/MM HH:mm')}`}
                                      </span>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                      
                      {teamTickets.length > 9 && (
                        <div className="text-center">
                          <Button 
                            variant="outline" 
                            onClick={() => window.location.href = `/tickets?team=${team.id}`}
                          >
                            Ver todos os {teamTickets.length} chamados
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </AppLayout>
    );
  }

  // Renderização para clientes
  return (
    <AppLayout title="Meus Colegas">
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Meus Colegas</h1>
            <p className="text-muted-foreground">
              Veja os colegas da sua empresa cadastrados no sistema
            </p>
          </div>
          <Badge variant="outline" className="px-3 py-1">
            <Building2 className="h-4 w-4 mr-1" />
            {user?.company || 'Empresa'}
          </Badge>
        </div>

        {/* Estatísticas simples */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total de Colegas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{colleagues?.length || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <UserCheck className="h-4 w-4" />
                Ativos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {colleagues?.filter((c: TeamMember) => c.isActive).length || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Administradores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {colleagues?.filter((c: TeamMember) => c.role === 'client_manager').length || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Busca */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar colegas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        {/* Lista de Colegas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredColleagues.length === 0 ? (
            <div className="col-span-full text-center py-8 text-muted-foreground">
              {searchTerm ? "Nenhum colega encontrado" : "Nenhum colega cadastrado"}
            </div>
          ) : (
            filteredColleagues.map((colleague: TeamMember) => (
              <Card key={colleague.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {getInitials(colleague.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{colleague.fullName}</CardTitle>
                      <Badge variant={roleColors[colleague.role]}>
                        {roleLabels[colleague.role]}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{colleague.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>Desde {formatDate(new Date(colleague.createdAt), 'dd/MM/yyyy')}</span>
                    </div>
                    {colleague.lastLogin && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>Último acesso: {formatDate(new Date(colleague.lastLogin), 'dd/MM/yyyy')}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}