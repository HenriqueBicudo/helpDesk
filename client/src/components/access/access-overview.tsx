import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Building2, 
  Users, 
  Shield, 
  UserCheck,
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface AccessStats {
  companies: {
    total: number;
    active: number;
    inactive: number;
    withContracts: number;
  };
  users: {
    total: number;
    active: number;
    byRole: Record<string, number>;
    recentlyAdded: number;
  };
  teams: {
    total: number;
    active: number;
    totalMembers: number;
    avgMembersPerTeam: number;
  };
  tickets: {
    total: number;
    withSlaRisk: number;
    byCompany: Array<{
      companyName: string;
      count: number;
    }>;
  };
}

const roleLabels = {
  admin: 'Gestor Helpdesk',
  helpdesk_manager: 'Gerente de Suporte',
  helpdesk_agent: 'Agente Helpdesk',
  client_manager: 'Admin cliente',
  client_user: 'Cliente Funcionário'
};

export function AccessOverview() {
  // Query para buscar estatísticas
  const { data: stats, isLoading } = useQuery({
    queryKey: ['access-stats'],
    queryFn: async (): Promise<AccessStats> => {
      const response = await fetch('/api/access/stats');
      if (!response.ok) throw new Error('Erro ao carregar estatísticas');
      return response.json();
    }
  });

  if (isLoading) {
    return (
      <div className="text-center py-8">
        Carregando estatísticas...
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Erro ao carregar estatísticas
      </div>
    );
  }

  const companyActivePercentage = stats.companies.total > 0 
    ? Math.round((stats.companies.active / stats.companies.total) * 100)
    : 0;

  const userActivePercentage = stats.users.total > 0 
    ? Math.round((stats.users.active / stats.users.total) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Visão Geral dos Acessos</h2>
        <p className="text-muted-foreground">
          Resumo das permissões, usuários e empresas do sistema
        </p>
      </div>

      {/* Resumo Geral */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empresas Ativas</CardTitle>
            <Building2 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.companies.active}</div>
            <div className="flex items-center gap-2 mt-2">
              <Progress value={companyActivePercentage} className="flex-1" />
              <span className="text-xs text-muted-foreground">
                {companyActivePercentage}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.companies.inactive} inativas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.users.active}</div>
            <div className="flex items-center gap-2 mt-2">
              <Progress value={userActivePercentage} className="flex-1" />
              <span className="text-xs text-muted-foreground">
                {userActivePercentage}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              +{stats.users.recentlyAdded} esta semana
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Equipes Ativas</CardTitle>
            <Shield className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.teams.active}</div>
            <p className="text-xs text-muted-foreground">
              {stats.teams.totalMembers} membros totais
            </p>
            <p className="text-xs text-muted-foreground">
              Média: {stats.teams.avgMembersPerTeam} por equipe
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tickets com SLA Crítico</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.tickets.withSlaRisk}</div>
            <p className="text-xs text-muted-foreground">
              de {stats.tickets.total} tickets totais
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Distribuição por Tipo de Usuário */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Distribuição de Usuários por Tipo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(stats.users.byRole).map(([role, count]) => {
              const percentage = stats.users.total > 0 
                ? Math.round((count / stats.users.total) * 100)
                : 0;
                
              return (
                <div key={role} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {roleLabels[role as keyof typeof roleLabels] || role}
                    </span>
                    <Badge variant="outline">{count}</Badge>
                  </div>
                  <Progress value={percentage} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {percentage}% do total
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Empresas com Mais Tickets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Empresas com Mais Tickets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.tickets.byCompany.slice(0, 5).map((company, index) => (
                <div key={company.companyName} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="w-6 h-6 p-0 flex items-center justify-center">
                      {index + 1}
                    </Badge>
                    <span className="text-sm font-medium">{company.companyName}</span>
                  </div>
                  <Badge>{company.count} tickets</Badge>
                </div>
              ))}
              {stats.tickets.byCompany.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma empresa com tickets
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Status do Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Empresas com Contratos</span>
                <Badge variant="default">
                  {stats.companies.withContracts} de {stats.companies.total}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Taxa de Ativação de Usuários</span>
                <Badge variant={userActivePercentage >= 90 ? "default" : "secondary"}>
                  {userActivePercentage}%
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Taxa de Ativação de Empresas</span>
                <Badge variant={companyActivePercentage >= 90 ? "default" : "secondary"}>
                  {companyActivePercentage}%
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm">Equipes com Membros</span>
                <Badge>
                  {stats.teams.active} de {stats.teams.total}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertas e Ações Recomendadas */}
      {(stats.tickets.withSlaRisk > 0 || userActivePercentage < 80 || companyActivePercentage < 80) && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <AlertTriangle className="h-5 w-5" />
              Ações Recomendadas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {stats.tickets.withSlaRisk > 0 && (
              <div className="flex items-center gap-2 text-orange-700">
                <Clock className="h-4 w-4" />
                <span>
                  {stats.tickets.withSlaRisk} tickets com SLA em risco - revisar atribuições de equipe
                </span>
              </div>
            )}
            
            {userActivePercentage < 80 && (
              <div className="flex items-center gap-2 text-orange-700">
                <Users className="h-4 w-4" />
                <span>
                  Taxa de usuários ativos baixa ({userActivePercentage}%) - revisar usuários inativos
                </span>
              </div>
            )}
            
            {companyActivePercentage < 80 && (
              <div className="flex items-center gap-2 text-orange-700">
                <Building2 className="h-4 w-4" />
                <span>
                  Taxa de empresas ativas baixa ({companyActivePercentage}%) - revisar status das empresas
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
