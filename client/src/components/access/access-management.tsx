import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, 
  Users, 
  Shield, 
  BarChart3,
  Settings
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { AccessOverview } from "./access-overview";
import { CompanyManagement } from "./company-management";
import { UserManagement } from "./user-management";
import { TeamManagement } from "./team-management";

export function AccessManagement() {
  const { user } = useAuth();

  // Verificar se o usuário é administrador
  if (user?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <Settings className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold text-muted-foreground mb-2">
          Acesso Restrito
        </h2>
        <p className="text-muted-foreground max-w-md">
          Esta área é restrita para administradores do sistema. 
          Entre em contato com seu administrador se precisar de acesso.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gerenciamento de Acessos</h1>
          <p className="text-muted-foreground">
            Gerencie empresas, usuários, permissões e equipes do sistema
          </p>
        </div>
        <Badge variant="outline" className="px-3 py-1">
          <Shield className="h-4 w-4 mr-1" />
          Admin
        </Badge>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="companies" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Empresas
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Usuários
          </TabsTrigger>
          <TabsTrigger value="teams" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Equipes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <AccessOverview />
        </TabsContent>

        <TabsContent value="companies" className="mt-6">
          <CompanyManagement />
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <UserManagement />
        </TabsContent>

        <TabsContent value="teams" className="mt-6">
          <TeamManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}
