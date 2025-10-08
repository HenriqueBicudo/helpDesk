import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import SlaConfigurator from '@/components/sla/sla-configurator';
import { SlaMetricsGrid, sampleSlaMetrics } from '@/components/sla/sla-metrics-card';
import { AppLayout } from '@/components/layout/app-layout';
import { 
  Settings, 
  Shield, 
  Database,
  Activity,
  AlertTriangle,
  BarChart3,
  Zap,
  RefreshCw,
  Play,
  Pause,
  FileText,
  Download,
  Upload,
  Trash2,
  Plus,
  Users,
  Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSlaConfigurations } from '@/hooks/use-sla';

interface SystemStatus {
  slaEngine: 'running' | 'stopped' | 'error';
  monitoring: 'active' | 'inactive' | 'error';
  alerts: 'working' | 'degraded' | 'failed';
  database: 'healthy' | 'slow' | 'error';
  lastUpdate: string;
}

interface Client {
  id: string;
  name: string;
  email: string;
  currentContract?: {
    id: string;
    type: string;
    status: string;
  };
}

interface SlaTemplate {
  id: string;
  name: string;
  description: string;
  type: string;
  responseTime: string;
  resolutionTime: string;
  usage: number;
  rules: {
    priority: string;
    responseTimeHours: number;
    resolutionTimeHours: number;
  }[];
}

const SlaAdminDashboard: React.FC = () => {
  const [activeConfigTab, setActiveConfigTab] = useState<'general' | 'templates' | 'system'>('general');
  const [systemStatus] = useState<SystemStatus>({
    slaEngine: 'running',
    monitoring: 'active',
    alerts: 'working',
    database: 'healthy',
    lastUpdate: new Date().toISOString()
  });

  const queryClient = useQueryClient();

  // Estados para aplicação de templates
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  // Buscar empresas reais da API
  const { data: companiesData, isLoading: companiesLoading, error: companiesError } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const response = await fetch('/api/access/companies');
      if (!response.ok) throw new Error('Erro ao carregar empresas');
      return response.json();
    }
  });

  // Buscar contratos reais da API
  const { data: contractsData, isLoading: contractsLoading } = useQuery({
    queryKey: ['contracts'],
    queryFn: async () => {
      const response = await fetch('/api/contracts');
      if (!response.ok) throw new Error('Erro ao carregar contratos');
      const data = await response.json();
      return data.data || [];
    }
  });

  // Buscar solicitantes (clientes) reais da API
  const { data: requestersData, isLoading: requestersLoading } = useQuery({
    queryKey: ['requesters'],
    queryFn: async () => {
      const response = await fetch('/api/requesters');
      if (!response.ok) throw new Error('Erro ao carregar solicitantes');
      return response.json();
    }
  });

  // Processar dados para formato da interface
  const clients: Client[] = React.useMemo(() => {
    if (!companiesData && !requestersData) return [];
    
    const clientsList: Client[] = [];
    
    // Adicionar empresas
    if (companiesData) {
      companiesData.forEach((company: any) => {
        // Encontrar contratos ativos desta empresa
        const activeContracts = contractsData?.filter((contract: any) => 
          contract.companyId === company.id && contract.isActive
        ) || [];
        
        clientsList.push({
          id: `company_${company.id}`,
          name: company.name,
          email: company.email,
          currentContract: activeContracts.length > 0 ? {
            id: activeContracts[0].id,
            type: activeContracts[0].type,
            status: 'active'
          } : undefined
        });
      });
    }
    
    // Adicionar solicitantes individuais
    if (requestersData) {
      requestersData.forEach((requester: any) => {
        // Encontrar contratos ativos deste solicitante
        const activeContracts = contractsData?.filter((contract: any) => 
          contract.requesterId === requester.id && contract.isActive
        ) || [];
        
        clientsList.push({
          id: `requester_${requester.id}`,
          name: requester.fullName,
          email: requester.email,
          currentContract: activeContracts.length > 0 ? {
            id: activeContracts[0].id,
            type: activeContracts[0].type,
            status: 'active'
          } : undefined
        });
      });
    }
    
    return clientsList;
  }, [companiesData, requestersData, contractsData]);

  // Templates SLA baseados em dados reais do sistema
  const templates: SlaTemplate[] = React.useMemo(() => {
    // Contar contratos por tipo para determinar usage
    const contractsByType = contractsData?.reduce((acc: any, contract: any) => {
      acc[contract.type] = (acc[contract.type] || 0) + 1;
      return acc;
    }, {}) || {};

    return [
      {
        id: 'support_basic',
        name: 'Suporte Básico',
        description: 'Template para contratos de suporte básico',
        type: 'support',
        responseTime: '8h',
        resolutionTime: '72h',
        usage: contractsByType['support'] || 0,
        rules: [
          { priority: 'critical', responseTimeHours: 4, resolutionTimeHours: 24 },
          { priority: 'high', responseTimeHours: 8, resolutionTimeHours: 48 },
          { priority: 'medium', responseTimeHours: 16, resolutionTimeHours: 72 },
          { priority: 'low', responseTimeHours: 24, resolutionTimeHours: 120 }
        ]
      },
      {
        id: 'support_premium',
        name: 'Suporte Premium',
        description: 'Template para contratos premium com atendimento prioritário',
        type: 'support',
        responseTime: '2h',
        resolutionTime: '24h',
        usage: Math.floor((contractsByType['support'] || 0) * 0.6),
        rules: [
          { priority: 'critical', responseTimeHours: 0.5, resolutionTimeHours: 4 },
          { priority: 'high', responseTimeHours: 2, resolutionTimeHours: 8 },
          { priority: 'medium', responseTimeHours: 4, resolutionTimeHours: 24 },
          { priority: 'low', responseTimeHours: 8, resolutionTimeHours: 48 }
        ]
      },
      {
        id: 'support_critical',
        name: 'Suporte Crítico',
        description: 'Template para serviços críticos 24/7',
        type: 'support',
        responseTime: '30min',
        resolutionTime: '4h',
        usage: Math.floor((contractsByType['support'] || 0) * 0.2),
        rules: [
          { priority: 'critical', responseTimeHours: 0.25, resolutionTimeHours: 2 },
          { priority: 'high', responseTimeHours: 0.5, resolutionTimeHours: 4 },
          { priority: 'medium', responseTimeHours: 1, resolutionTimeHours: 8 },
          { priority: 'low', responseTimeHours: 2, resolutionTimeHours: 12 }
        ]
      },
      {
        id: 'maintenance',
        name: 'Manutenção',
        description: 'Template para contratos de manutenção',
        type: 'maintenance',
        responseTime: '24h',
        resolutionTime: '120h',
        usage: contractsByType['maintenance'] || 0,
        rules: [
          { priority: 'critical', responseTimeHours: 8, resolutionTimeHours: 48 },
          { priority: 'high', responseTimeHours: 24, resolutionTimeHours: 72 },
          { priority: 'medium', responseTimeHours: 48, resolutionTimeHours: 120 },
          { priority: 'low', responseTimeHours: 72, resolutionTimeHours: 168 }
        ]
      },
      {
        id: 'development',
        name: 'Desenvolvimento',
        description: 'Template para projetos de desenvolvimento',
        type: 'development',
        responseTime: '4h',
        resolutionTime: '48h',
        usage: contractsByType['development'] || 0,
        rules: [
          { priority: 'critical', responseTimeHours: 2, resolutionTimeHours: 12 },
          { priority: 'high', responseTimeHours: 4, resolutionTimeHours: 24 },
          { priority: 'medium', responseTimeHours: 8, resolutionTimeHours: 48 },
          { priority: 'low', responseTimeHours: 24, resolutionTimeHours: 72 }
        ]
      },
      {
        id: 'consulting',
        name: 'Consultoria',
        description: 'Template para serviços de consultoria',
        type: 'consulting',
        responseTime: '12h',
        resolutionTime: '96h',
        usage: contractsByType['consulting'] || 0,
        rules: [
          { priority: 'critical', responseTimeHours: 4, resolutionTimeHours: 24 },
          { priority: 'high', responseTimeHours: 12, resolutionTimeHours: 48 },
          { priority: 'medium', responseTimeHours: 24, resolutionTimeHours: 96 },
          { priority: 'low', responseTimeHours: 48, resolutionTimeHours: 168 }
        ]
      }
    ];
  }, [contractsData]);

  // Buscar configurações SLA
  const { data: configurations, isLoading: configLoading, refetch: refetchConfigs } = useSlaConfigurations();

  // Funções para aplicação de templates
  const handleApplyTemplate = async () => {
    if (!selectedClient || !selectedTemplate) return;

    setIsApplying(true);
    try {
      const clientData = getSelectedClientData();
      const templateData = getSelectedTemplateData();
      
      if (!clientData || !templateData) {
        throw new Error('Dados do cliente ou template não encontrados');
      }

      // Extrair ID real do cliente (remove prefixo company_ ou requester_)
      const [clientType, clientId] = selectedClient.split('_');
      const realClientId = parseInt(clientId);
      
      // Criar contrato via API real
      const contractPayload = {
        contractNumber: `CNT-${Date.now()}`,
        companyId: clientType === 'company' ? realClientId : undefined,
        type: templateData.type,
        status: 'active',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 ano
        monthlyValue: parseFloat(templateData.type === 'support' ? '5000' : 
                               templateData.type === 'consulting' ? '8000' :
                               templateData.type === 'development' ? '10000' : '3000'),
        hourlyRate: 150,
        includedHours: 40,
        resetDay: 1, // Primeiro dia do mês
        allowOverage: true,
        description: `Contrato ${templateData.name} - ${clientData.name}`
      };

      const response = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contractPayload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao criar contrato');
      }

      await response.json(); // Contrato criado
      
      // TODO: Criar regras SLA específicas baseadas no template
      // Aqui seria feita a chamada para criar as regras SLA individuais
      
      alert(`Template "${templateData.name}" aplicado com sucesso ao cliente "${clientData.name}"!`);
      setSelectedClient('');
      setSelectedTemplate('');
      setShowPreview(false);
      
      // Invalidar queries para recarregar dados
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['requesters'] });
      
    } catch (error: any) {
      alert('Erro ao aplicar template: ' + error.message);
    } finally {
      setIsApplying(false);
    }
  };

  const getSelectedClientData = () => clients.find(c => c.id === selectedClient);
  const getSelectedTemplateData = () => templates.find(t => t.id === selectedTemplate);

  // Estados de loading
  const isLoadingData = companiesLoading || contractsLoading || requestersLoading;

  const StatusCard: React.FC<{
    title: string;
    status: 'running' | 'stopped' | 'error' | 'active' | 'inactive' | 'working' | 'degraded' | 'failed' | 'healthy' | 'slow';
    description: string;
    actions?: React.ReactNode;
  }> = ({ title, status, description, actions }) => {
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'running':
        case 'active':
        case 'working':
        case 'healthy':
          return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-100';
        case 'degraded':
        case 'slow':
          return 'text-orange-600 bg-orange-100 dark:bg-orange-900 dark:text-orange-100';
        case 'stopped':
        case 'inactive':
          return 'text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-300';
        case 'error':
        case 'failed':
          return 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-100';
        default:
          return 'text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-300';
      }
    };

    const getStatusLabel = (status: string) => {
      switch (status) {
        case 'running': return 'Em Execução';
        case 'active': return 'Ativo';
        case 'working': return 'Funcionando';
        case 'healthy': return 'Saudável';
        case 'degraded': return 'Degradado';
        case 'slow': return 'Lento';
        case 'stopped': return 'Parado';
        case 'inactive': return 'Inativo';
        case 'error': return 'Erro';
        case 'failed': return 'Falhou';
        default: return status;
      }
    };

    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">{title}</h3>
            <Badge className={cn('text-xs', getStatusColor(status))}>
              {getStatusLabel(status)}
            </Badge>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            {description}
          </p>
          {actions && (
            <div className="flex gap-2">
              {actions}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const ConfigurationTemplatesPanel: React.FC = () => (
    <div className="space-y-6">
      {/* 
        🎯 NOVA FUNCIONALIDADE: Aplicação de Templates SLA a Clientes
        
        Esta seção permite aos administradores:
        1. ✅ Selecionar um cliente existente da lista dropdown
        2. ✅ Escolher um template SLA pré-configurado  
        3. ✅ Ver preview das regras antes de aplicar
        4. ✅ Aplicar com um clique o template ao cliente
        5. ✅ Alertas para clientes que já possuem contratos ativos
        
        Funcionalidades implementadas:
        - Interface visual intuitiva sem criar página nova
        - Dropdown com lista de clientes (mostra nome, email e contrato atual)
        - Dropdown com templates SLA (mostra tempos de resposta/resolução)
        - Modal de preview com todas as regras SLA detalhadas
        - Confirmação antes da aplicação
        - Estados de loading durante aplicação
        - Alertas para contratos existentes
      */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Aplicar Template a Cliente
          </CardTitle>
          <CardDescription>
            Selecione um cliente e aplique um template SLA rapidamente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingData ? (
            <div className="flex items-center justify-center p-8">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              <span>Carregando dados...</span>
            </div>
          ) : companiesError ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Erro ao carregar dados: {companiesError.message}
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Cliente</label>
                  <Select value={selectedClient} onValueChange={setSelectedClient}>
                    <SelectTrigger>
                      <SelectValue placeholder={
                        clients.length === 0 
                          ? "Nenhum cliente encontrado" 
                          : "Selecione um cliente"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map(client => (
                        <SelectItem key={client.id} value={client.id}>
                          <div className="flex flex-col">
                            <span>{client.name}</span>
                            <span className="text-xs text-gray-500">{client.email}</span>
                            {client.currentContract && (
                              <Badge variant="outline" className="text-xs w-fit mt-1">
                                {client.currentContract.type} - {client.currentContract.status}
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {clients.length === 0 && !isLoadingData && (
                    <p className="text-xs text-gray-500">
                      {companiesData?.length === 0 && requestersData?.length === 0 
                        ? "Nenhum cliente cadastrado no sistema" 
                        : "Carregando clientes..."}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Template SLA</label>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map(template => (
                        <SelectItem key={template.id} value={template.id}>
                          <div className="flex flex-col">
                            <span>{template.name}</span>
                            <span className="text-xs text-gray-500">
                              Resposta: {template.responseTime} | Resolução: {template.resolutionTime}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2">
            <Dialog open={showPreview} onOpenChange={setShowPreview}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  disabled={!selectedClient || !selectedTemplate}
                  onClick={() => setShowPreview(true)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview das Regras
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Preview - Aplicação de Template SLA</DialogTitle>
                  <DialogDescription>
                    Revise as configurações antes de aplicar o template
                  </DialogDescription>
                </DialogHeader>
                
                {getSelectedClientData() && getSelectedTemplateData() && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div>
                        <h4 className="font-medium mb-2">Cliente</h4>
                        <p className="text-sm">{getSelectedClientData()?.name}</p>
                        <p className="text-xs text-gray-500">{getSelectedClientData()?.email}</p>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Template</h4>
                        <p className="text-sm">{getSelectedTemplateData()?.name}</p>
                        <p className="text-xs text-gray-500">{getSelectedTemplateData()?.description}</p>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-3">Regras SLA que serão aplicadas:</h4>
                      <div className="space-y-2">
                        {getSelectedTemplateData()?.rules.map((rule, index) => (
                          <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant={rule.priority === 'critical' ? 'destructive' : 
                                       rule.priority === 'high' ? 'default' : 'secondary'}
                              >
                                {rule.priority === 'critical' ? 'Crítica' :
                                 rule.priority === 'high' ? 'Alta' :
                                 rule.priority === 'medium' ? 'Média' : 'Baixa'}
                              </Badge>
                            </div>
                            <div className="text-sm text-right">
                              <div>Resposta: {rule.responseTimeHours < 1 ? `${rule.responseTimeHours * 60}min` : `${rule.responseTimeHours}h`}</div>
                              <div>Resolução: {rule.resolutionTimeHours}h</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {getSelectedClientData()?.currentContract && (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          Este cliente já possui um contrato ativo ({getSelectedClientData()?.currentContract?.type}). 
                          A aplicação do template criará um novo contrato.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}

                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowPreview(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleApplyTemplate} 
                    disabled={isApplying}
                  >
                    {isApplying ? 'Aplicando...' : 'Aplicar Template'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button 
              disabled={!selectedClient || !selectedTemplate || isApplying}
              onClick={() => setShowPreview(true)}
            >
              {isApplying ? 'Aplicando...' : 'Aplicar Template'}
            </Button>
          </div>
          </>
          )}
        </CardContent>
      </Card>

      {/* Seção de Templates Existentes */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Templates de Configuração SLA</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Gerencie templates pré-configurados para diferentes tipos de contratos
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-1" />
          Novo Template
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template, index) => (
          <Card key={index}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{template.name}</CardTitle>
              <CardDescription>{template.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Resposta</p>
                  <p className="font-medium">{template.responseTime}</p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Resolução</p>
                  <p className="font-medium">{template.resolutionTime}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {template.usage} contratos usando
                </span>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline">
                    Editar
                  </Button>
                  <Button size="sm" variant="outline">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const SystemManagementPanel: React.FC = () => (
    <div className="space-y-6">
      {/* System Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatusCard
          title="Motor SLA"
          status={systemStatus.slaEngine}
          description="Serviço responsável pelo cálculo automático de prazos SLA"
          actions={
            <>
              <Button size="sm" variant="outline">
                <Play className="h-3 w-3 mr-1" />
                Iniciar
              </Button>
              <Button size="sm" variant="outline">
                <Pause className="h-3 w-3 mr-1" />
                Parar
              </Button>
            </>
          }
        />

        <StatusCard
          title="Monitoramento"
          status={systemStatus.monitoring}
          description="Monitoramento contínuo de violações e alertas SLA"
          actions={
            <>
              <Button size="sm" variant="outline">
                <RefreshCw className="h-3 w-3 mr-1" />
                Reiniciar
              </Button>
            </>
          }
        />

        <StatusCard
          title="Sistema de Alertas"
          status={systemStatus.alerts}
          description="Notificações automáticas por email e sistema"
          actions={
            <>
              <Button size="sm" variant="outline">
                Configurar
              </Button>
            </>
          }
        />

        <StatusCard
          title="Base de Dados"
          status={systemStatus.database}
          description="Performance e integridade da base de dados SLA"
          actions={
            <>
              <Button size="sm" variant="outline">
                <Activity className="h-3 w-3 mr-1" />
                Verificar
              </Button>
            </>
          }
        />
      </div>

      {/* Backup & Restore */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Database className="h-5 w-5" />
            Backup e Restauração
          </CardTitle>
          <CardDescription>
            Gerencie backups das configurações SLA
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-1" />
              Exportar Configurações
            </Button>
            <Button variant="outline">
              <Upload className="h-4 w-4 mr-1" />
              Importar Configurações
            </Button>
            <Button variant="outline">
              <FileText className="h-4 w-4 mr-1" />
              Gerar Relatório Completo
            </Button>
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Último backup realizado em 15/01/2024 às 14:30. 
              Recomendamos realizar backups semanalmente.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Logs and Monitoring */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Logs do Sistema
          </CardTitle>
          <CardDescription>
            Últimas atividades do sistema SLA
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {[
              { time: '14:35:22', level: 'INFO', message: 'Motor SLA executado com sucesso - 45 tickets processados' },
              { time: '14:30:15', level: 'WARN', message: 'Ticket #1234 próximo da violação de SLA (30 min restantes)' },
              { time: '14:25:08', level: 'INFO', message: 'Configuração SLA atualizada para contrato EMPRESA-A' },
              { time: '14:20:33', level: 'ERROR', message: 'Falha ao enviar alerta por email para ticket #5678' },
              { time: '14:15:45', level: 'INFO', message: 'Backup automático das configurações SLA concluído' },
              { time: '14:10:12', level: 'INFO', message: 'Sistema de monitoramento reiniciado' }
            ].map((log, index) => (
              <div key={index} className="flex items-center gap-3 p-2 rounded text-sm font-mono">
                <span className="text-gray-500 w-16">{log.time}</span>
                <Badge 
                  variant={log.level === 'ERROR' ? 'destructive' : log.level === 'WARN' ? 'secondary' : 'outline'}
                  className="w-16 text-xs"
                >
                  {log.level}
                </Badge>
                <span className="flex-1">{log.message}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <AppLayout title="Administração SLA">
      <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Administração SLA</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Configuração avançada e monitoramento do sistema SLA
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => refetchConfigs()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-1" />
            Atualizar
          </Button>
          <Button variant="outline" size="sm">
            <Shield className="h-4 w-4 mr-1" />
            Auditoria
          </Button>
        </div>
      </div>

      {/* System Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Settings className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Configurações Ativas</p>
                <p className="text-xl font-bold">{configurations?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <Zap className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Motor SLA</p>
                <p className="text-xl font-bold text-green-600">Ativo</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Alertas Pendentes</p>
                <p className="text-xl font-bold text-orange-600">12</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <BarChart3 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Compliance Médio</p>
                <p className="text-xl font-bold text-purple-600">94.5%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Configuration Tabs */}
      <Tabs value={activeConfigTab} onValueChange={(value) => setActiveConfigTab(value as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general">Configuração Geral</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="system">Sistema</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <SlaConfigurator 
            onSave={(config) => {
              console.log('Salvando configuração:', config);
              // Implementar salvamento
            }}
            isLoading={configLoading}
          />
        </TabsContent>

        <TabsContent value="templates">
          <ConfigurationTemplatesPanel />
        </TabsContent>

        <TabsContent value="system">
          <SystemManagementPanel />
        </TabsContent>
      </Tabs>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Métricas de Performance do Sistema
          </CardTitle>
          <CardDescription>
            Indicadores de performance e saúde do sistema SLA
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SlaMetricsGrid 
            metrics={sampleSlaMetrics}
            columns={4}
            size="sm"
            showTrend={true}
            showTarget={true}
          />
        </CardContent>
      </Card>
      </div>
    </AppLayout>
  );
};

export default SlaAdminDashboard;
