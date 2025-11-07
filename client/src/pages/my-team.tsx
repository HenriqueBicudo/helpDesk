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
  Ticket
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

  // Query para buscar informações da equipe do usuário
  const { data: teamData, isLoading } = useQuery({
    queryKey: ['my-team', user?.teamId],
    queryFn: async () => {
      if (!user?.teamId) {
        return null;
      }
      const response = await fetch(`/api/teams/${user.teamId}/details`);
      if (!response.ok) throw new Error('Erro ao carregar dados da equipe');
      return response.json();
    },
    enabled: !!user?.teamId
  });

  // Query para buscar estatísticas da equipe (apenas para helpdesk)
  const { data: teamStats } = useQuery({
    queryKey: ['team-stats', user?.teamId],
    queryFn: async () => {
      if (!user?.teamId) return null;
      const response = await fetch(`/api/teams/${user.teamId}/stats`);
      if (!response.ok) throw new Error('Erro ao carregar estatísticas');
      return response.json();
    },
    enabled: !!user?.teamId && !clientRestrictions.isClient
  });

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

  // Filtrar membros por termo de busca
  const filteredMembers = teamData?.members?.filter((member: TeamMember) =>
    member.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

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
  if (!teamData) {
    return (
      <AppLayout title="Minha Equipe">
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

  return (
    <AppLayout title="Minha Equipe">
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">{teamData.name}</h1>
            <p className="text-muted-foreground">
              {teamData.description || "Gerencie sua equipe e acompanhe o desempenho"}
            </p>
          </div>
          <Badge variant={teamData.isActive ? "default" : "secondary"}>
            <Shield className="h-4 w-4 mr-1" />
            {teamData.isActive ? "Ativa" : "Inativa"}
          </Badge>
        </div>

        {/* Estatísticas da Equipe */}
        {teamStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Membros
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{teamData._count?.members || 0}</div>
                <p className="text-xs text-muted-foreground">
                  membros ativos na equipe
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Ticket className="h-4 w-4" />
                  Tickets Atribuídos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{teamStats.assignedTickets || 0}</div>
                <p className="text-xs text-muted-foreground">
                  tickets em andamento
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Tickets Resolvidos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{teamStats.resolvedTickets || 0}</div>
                <p className="text-xs text-muted-foreground">
                  neste mês
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Taxa de Resolução
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {teamStats.resolutionRate ? `${teamStats.resolutionRate}%` : '0%'}
                </div>
                <p className="text-xs text-muted-foreground">
                  taxa de sucesso
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Busca */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar membros da equipe..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        {/* Informações da Equipe */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Informações da Equipe</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-muted-foreground">Nome:</span>
                <p>{teamData.name}</p>
              </div>
              {teamData.description && (
                <div>
                  <span className="font-medium text-muted-foreground">Descrição:</span>
                  <p>{teamData.description}</p>
                </div>
              )}
              <div>
                <span className="font-medium text-muted-foreground">Status:</span>
                <p>{teamData.isActive ? 'Ativa' : 'Inativa'}</p>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Criada em:</span>
                <p>{formatDate(new Date(teamData.createdAt), 'dd/MM/yyyy')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Membros */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Membros da Equipe</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMembers.length === 0 ? (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                {searchTerm ? "Nenhum membro encontrado" : "Nenhum membro na equipe"}
              </div>
            ) : (
              filteredMembers.map((member: TeamMember) => (
                <Card key={member.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {getInitials(member.fullName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          {member.fullName}
                          {member.id === user?.id && (
                            <Badge variant="outline" className="text-xs">Você</Badge>
                          )}
                        </CardTitle>
                        <Badge variant={roleColors[member.role]}>
                          {roleLabels[member.role]}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-3">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{member.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>Na equipe desde {formatDate(new Date(member.createdAt), 'dd/MM/yyyy')}</span>
                      </div>
                      {member.lastLogin && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>Último acesso: {formatDate(new Date(member.lastLogin), 'dd/MM/yyyy')}</span>
                        </div>
                      )}
                    </div>

                    {/* Estatísticas do membro (apenas para helpdesk) */}
                    {!clientRestrictions.isClient && (
                      <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                        <div className="text-center">
                          <div className="font-semibold">{member.ticketsAssigned || 0}</div>
                          <div className="text-xs text-muted-foreground">Atribuídos</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold">{member.ticketsResolved || 0}</div>
                          <div className="text-xs text-muted-foreground">Resolvidos</div>
                        </div>
                      </div>
                    )}

                    {/* Status */}
                    <div className="flex justify-between items-center pt-2">
                      <Badge variant={member.isActive ? "default" : "secondary"}>
                        {member.isActive ? "Ativo" : "Inativo"}
                      </Badge>
                      {member.id !== user?.id && (
                        <Button variant="outline" size="sm">
                          <Mail className="h-3 w-3 mr-1" />
                          Contato
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}