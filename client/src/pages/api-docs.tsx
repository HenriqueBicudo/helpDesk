import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Code, Database, FileText, Lock, Settings, Ticket, Users, Upload, Mail, Tag, Globe } from "lucide-react";

export default function ApiDocs() {
  const apiEndpoints = [
    {
      category: "APIs Públicas",
      icon: Globe,
      color: "text-emerald-500",
      endpoints: [
        {
          method: "GET",
          path: "/api/health",
          description: "Verifica status do servidor",
          response: {
            status: "OK",
            timestamp: "Date"
          }
        },
        {
          method: "POST",
          path: "/api/request-access",
          description: "Solicitar criação de conta (envia email para admin)",
          body: {
            username: "string",
            fullName: "string",
            email: "string",
            company: "string"
          },
          response: {
            success: "boolean",
            message: "string"
          }
        },
        {
          method: "GET",
          path: "/api/requesters",
          description: "Listar todos os solicitantes"
        },
        {
          method: "POST",
          path: "/api/requesters",
          description: "Criar novo solicitante",
          body: {
            fullName: "string",
            email: "string",
            company: "string (opcional)",
            phone: "string (opcional)",
            planType: "string (opcional)"
          }
        },
        {
          method: "GET",
          path: "/api/requesters/:id",
          description: "Buscar solicitante por ID",
          params: {
            id: "number"
          }
        },
        {
          method: "GET",
          path: "/api/teams",
          description: "Listar todas as equipes do sistema"
        },
        {
          method: "GET",
          path: "/api/tags",
          description: "Listar todas as tags disponíveis"
        },
        {
          method: "POST",
          path: "/api/uploads",
          description: "Upload de até 20 arquivos (10MB cada)",
          body: "FormData com field 'files' (array)",
          response: "Array com URLs dos arquivos"
        },
        {
          method: "GET",
          path: "/api/uploads/:filename",
          description: "Acessar arquivo enviado",
          params: {
            filename: "string"
          }
        },
        {
          method: "POST",
          path: "/api/test-email",
          description: "Enviar email de teste",
          body: {
            to: "string",
            subject: "string",
            body: "string"
          }
        }
      ]
    },
    {
      category: "Templates",
      icon: FileText,
      color: "text-pink-500",
      endpoints: [
        {
          method: "GET",
          path: "/api/email-templates",
          description: "Listar templates de email"
        },
        {
          method: "GET",
          path: "/api/email-templates/:id",
          description: "Buscar template de email específico"
        },
        {
          method: "POST",
          path: "/api/email-templates",
          description: "Criar template de email",
          body: {
            name: "string",
            type: "string",
            subject: "string",
            body: "string"
          }
        },
        {
          method: "PATCH",
          path: "/api/email-templates/:id",
          description: "Atualizar template de email"
        },
        {
          method: "DELETE",
          path: "/api/email-templates/:id",
          description: "Deletar template de email"
        },
        {
          method: "GET",
          path: "/api/response-templates",
          description: "Listar templates de resposta para tickets"
        },
        {
          method: "GET",
          path: "/api/response-templates/:id",
          description: "Buscar template de resposta específico"
        },
        {
          method: "POST",
          path: "/api/response-templates/:id/process",
          description: "Processar template (substituir variáveis)",
          body: {
            variables: "object com chave-valor"
          }
        },
        {
          method: "POST",
          path: "/api/response-templates",
          description: "Criar template de resposta",
          body: {
            name: "string",
            content: "string",
            category: "string (opcional)"
          }
        },
        {
          method: "PATCH",
          path: "/api/response-templates/:id",
          description: "Atualizar template de resposta"
        },
        {
          method: "DELETE",
          path: "/api/response-templates/:id",
          description: "Deletar template de resposta"
        }
      ]
    },
    {
      category: "Autenticação",
      icon: Lock,
      color: "text-red-500",
      endpoints: [
        {
          method: "POST",
          path: "/api/auth/login",
          description: "Autenticar usuário no sistema",
          body: {
            username: "string",
            password: "string"
          },
          response: {
            id: "number",
            username: "string",
            fullName: "string",
            email: "string",
            role: "string",
            token: "string"
          }
        },
        {
          method: "POST",
          path: "/api/auth/logout",
          description: "Deslogar usuário atual",
          auth: true
        },
        {
          method: "GET",
          path: "/api/auth/current-user",
          description: "Buscar dados do usuário logado",
          auth: true,
          response: {
            id: "number",
            username: "string",
            fullName: "string",
            email: "string",
            role: "string"
          }
        }
      ]
    },
    {
      category: "Tickets",
      icon: Ticket,
      color: "text-blue-500",
      endpoints: [
        {
          method: "GET",
          path: "/api/tickets",
          description: "Listar todos os tickets com filtros de acesso",
          auth: true,
          query: {
            status: "string (opcional)",
            priority: "string (opcional)",
            assigneeId: "number (opcional)"
          },
          response: "Array de tickets"
        },
        {
          method: "GET",
          path: "/api/tickets/:id",
          description: "Buscar ticket específico por ID",
          auth: true,
          params: {
            id: "number - ID do ticket"
          }
        },
        {
          method: "POST",
          path: "/api/tickets",
          description: "Criar novo ticket",
          auth: true,
          permission: "tickets:create",
          body: {
            subject: "string",
            description: "string",
            priority: "'low' | 'medium' | 'high' | 'urgent' | 'critical'",
            requesterId: "number",
            contractId: "string (opcional)",
            companyId: "number (opcional)"
          }
        },
        {
          method: "PATCH",
          path: "/api/tickets/:id",
          description: "Atualizar dados do ticket",
          auth: true,
          body: {
            status: "string (opcional)",
            priority: "string (opcional)",
            assigneeId: "number (opcional)",
            contractId: "string (opcional)"
          }
        },
        {
          method: "GET",
          path: "/api/tickets/:id/interactions",
          description: "Buscar interações de um ticket",
          auth: true
        },
        {
          method: "POST",
          path: "/api/tickets/:id/interactions",
          description: "Adicionar interação ao ticket",
          auth: true,
          body: {
            type: "'comment' | 'note' | 'status_change'",
            content: "string",
            isInternal: "boolean"
          }
        }
      ]
    },
    {
      category: "Usuários",
      icon: Users,
      color: "text-green-500",
      endpoints: [
        {
          method: "GET",
          path: "/api/users",
          description: "Listar todos os usuários do sistema",
          auth: true
        },
        {
          method: "GET",
          path: "/api/users/:id",
          description: "Buscar usuário específico",
          auth: true
        },
        {
          method: "POST",
          path: "/api/users",
          description: "Criar novo usuário",
          auth: true,
          permission: "users:manage",
          body: {
            username: "string",
            password: "string",
            fullName: "string",
            email: "string",
            role: "'admin' | 'helpdesk_manager' | 'helpdesk_agent' | 'client_manager' | 'client_user'",
            company: "string (opcional)",
            teamId: "number (opcional)"
          }
        },
        {
          method: "PATCH",
          path: "/api/users/:id",
          description: "Atualizar dados do usuário",
          auth: true,
          permission: "users:manage"
        }
      ]
    },
    {
      category: "Contratos",
      icon: FileText,
      color: "text-purple-500",
      endpoints: [
        {
          method: "GET",
          path: "/api/contracts",
          description: "Listar contratos (filtrado por role)",
          auth: true,
          response: {
            success: "boolean",
            data: "Array de contratos"
          }
        },
        {
          method: "GET",
          path: "/api/contracts/:id",
          description: "Buscar contrato específico",
          auth: true
        },
        {
          method: "POST",
          path: "/api/contracts",
          description: "Criar novo contrato",
          auth: true,
          permission: "companies:manage",
          body: {
            contractNumber: "string",
            companyId: "number",
            type: "'support' | 'development' | 'maintenance' | 'consulting'",
            status: "'active' | 'inactive' | 'suspended'",
            includedHours: "number",
            hourlyRate: "string",
            slaTemplateId: "number (opcional)"
          }
        },
        {
          method: "GET",
          path: "/api/tickets/:id/contracts",
          description: "Buscar contratos disponíveis para um ticket",
          auth: true
        }
      ]
    },
    {
      category: "SLA V2",
      icon: Database,
      color: "text-orange-500",
      endpoints: [
        {
          method: "GET",
          path: "/api/sla/v2/templates",
          description: "Listar templates SLA disponíveis",
          auth: true,
          response: {
            success: "boolean",
            data: "Array de templates"
          }
        },
        {
          method: "GET",
          path: "/api/sla/v2/calendars",
          description: "Listar calendários de negócio",
          auth: true
        },
        {
          method: "GET",
          path: "/api/sla/v2/statistics",
          description: "Buscar estatísticas SLA do sistema",
          auth: true,
          response: {
            totalTemplates: "number",
            activeTemplates: "number",
            totalCalculations: "number",
            complianceRate: "number",
            averageResponseTime: "number",
            averageSolutionTime: "number",
            breachedTickets: "number"
          }
        },
        {
          method: "GET",
          path: "/api/sla/v2/calculations",
          description: "Listar cálculos SLA realizados",
          auth: true,
          query: {
            ticketId: "number (opcional)",
            templateId: "number (opcional)",
            limit: "number (opcional, default: 50)"
          }
        }
      ]
    },
    {
      category: "Empresas & Equipes",
      icon: Settings,
      color: "text-cyan-500",
      endpoints: [
        {
          method: "GET",
          path: "/api/access/companies",
          description: "Listar empresas (filtrado por role)",
          auth: true
        },
        {
          method: "POST",
          path: "/api/access/companies",
          description: "Criar nova empresa",
          auth: true,
          permission: "companies:manage",
          body: {
            name: "string",
            cnpj: "string (opcional)",
            hasActiveContract: "boolean"
          }
        },
        {
          method: "GET",
          path: "/api/access/teams",
          description: "Listar equipes do helpdesk",
          auth: true
        },
        {
          method: "POST",
          path: "/api/access/teams",
          description: "Criar nova equipe",
          auth: true,
          body: {
            name: "string",
            description: "string (opcional)"
          }
        },
        {
          method: "POST",
          path: "/api/access/teams/:teamId/members/:userId",
          description: "Adicionar membro à equipe",
          auth: true
        },
        {
          method: "GET",
          path: "/api/access/stats",
          description: "Buscar estatísticas de acesso",
          auth: true,
          response: {
            companies: "object",
            users: "object",
            teams: "object"
          }
        }
      ]
    },
    {
      category: "Estatísticas",
      icon: Database,
      color: "text-yellow-500",
      endpoints: [
        {
          method: "GET",
          path: "/api/statistics",
          description: "Estatísticas gerais do sistema",
          auth: true,
          response: {
            totalTickets: "number",
            openTickets: "number",
            resolvedTickets: "number",
            avgResolutionTime: "number"
          }
        },
        {
          method: "GET",
          path: "/api/statistics/volume",
          description: "Volume de tickets por período",
          auth: true,
          query: {
            startDate: "string (opcional)",
            endDate: "string (opcional)"
          }
        },
        {
          method: "GET",
          path: "/api/statistics/categories",
          description: "Tickets agrupados por categoria",
          auth: true
        }
      ]
    }
  ];

  const getMethodColor = (method: string) => {
    switch (method) {
      case "GET": return "bg-blue-500";
      case "POST": return "bg-green-500";
      case "PATCH": return "bg-yellow-500";
      case "PUT": return "bg-orange-500";
      case "DELETE": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Documentação da API</h1>
        <p className="text-muted-foreground">
          Referência completa dos endpoints disponíveis no sistema HelpDesk
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Informações Gerais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Base URL</h3>
            <code className="bg-muted px-3 py-2 rounded block">
              http://localhost:5000
            </code>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Autenticação</h3>
            <p className="text-sm text-muted-foreground">
              A maioria dos endpoints requer autenticação via sessão. Após fazer login com <code>/api/auth/login</code>,
              o cookie de sessão será enviado automaticamente nas próximas requisições.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Headers Padrão</h3>
            <code className="bg-muted px-3 py-2 rounded block text-sm">
              Content-Type: application/json
            </code>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue={apiEndpoints[0].category} className="space-y-4">
        <TabsList className="grid grid-cols-2 lg:grid-cols-5 gap-2 h-auto">
          {apiEndpoints.map((section) => {
            const Icon = section.icon;
            return (
              <TabsTrigger 
                key={section.category} 
                value={section.category}
                className="flex items-center gap-2"
              >
                <Icon className={`h-4 w-4 ${section.color}`} />
                {section.category}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {apiEndpoints.map((section) => (
          <TabsContent key={section.category} value={section.category}>
            <div className="space-y-4">
              {section.endpoints.map((endpoint, idx) => (
                <Card key={idx}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={`${getMethodColor(endpoint.method)} text-white font-mono`}>
                            {endpoint.method}
                          </Badge>
                          <code className="text-sm font-mono">{endpoint.path}</code>
                        </div>
                        <CardDescription>{endpoint.description}</CardDescription>
                      </div>
                      <div className="flex gap-1">
                        {endpoint.auth && (
                          <Badge variant="outline" className="text-xs">
                            <Lock className="h-3 w-3 mr-1" />
                            Auth
                          </Badge>
                        )}
                        {endpoint.permission && (
                          <Badge variant="secondary" className="text-xs">
                            {endpoint.permission}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {endpoint.params && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2">Parâmetros da URL:</h4>
                        <div className="bg-muted p-3 rounded text-sm">
                          <pre className="whitespace-pre-wrap">
                            {JSON.stringify(endpoint.params, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                    {endpoint.query && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2">Query Parameters:</h4>
                        <div className="bg-muted p-3 rounded text-sm">
                          <pre className="whitespace-pre-wrap">
                            {JSON.stringify(endpoint.query, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                    {endpoint.body && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2">Request Body:</h4>
                        <div className="bg-muted p-3 rounded text-sm">
                          <pre className="whitespace-pre-wrap">
                            {JSON.stringify(endpoint.body, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                    {endpoint.response && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2">Response:</h4>
                        <div className="bg-muted p-3 rounded text-sm">
                          <pre className="whitespace-pre-wrap">
                            {typeof endpoint.response === 'string' 
                              ? endpoint.response 
                              : JSON.stringify(endpoint.response, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
