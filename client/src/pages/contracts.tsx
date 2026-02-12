import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { AppLayout } from '@/components/layout/app-layout';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { ContractDialog } from '@/components/contracts/contract-dialog';

interface Contract {
  id: string;
  contractNumber: string;
  companyId: number;
  companyName?: string;
  type: 'support' | 'maintenance' | 'development' | 'consulting';
  status: 'active' | 'inactive' | 'expired' | 'suspended';
  startDate: string;
  endDate: string;
  monthlyValue: number;
  hourlyRate: number;
  includedHours: number;
  usedHours: number;
  resetDay: number;
  allowOverage: boolean;
  description?: string;
  slaRuleId?: string;
  createdAt: string;
  updatedAt: string;
}

interface Company {
  id: number;
  name: string;
}

export default function ContractsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar contratos
  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ['contracts'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/contracts');
      const result = await response.json();
      return result.data || []; // Extrair o array de 'data'
    }
  });

  // Buscar empresas para o dropdown
  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/contracts/companies/all');
      const result = await response.json();
      return result.data || []; // Extrair o array de 'data'
    }
  });

  // Search / Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [companyFilter, setCompanyFilter] = useState<number | null>(null);

  const normalize = (s?: string) => (s || '').toString().toLowerCase();

  const filteredContracts = (contracts || []).filter((c: Contract) => {
    // Status filter
    if (statusFilter && c.status !== statusFilter) return false;
    // Company filter
    if (companyFilter && c.companyId !== companyFilter) return false;
    // Search query (contractNumber, type, description, companyName)
    if (searchQuery && searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      if (!(
        normalize(c.contractNumber).includes(q) ||
        normalize(c.type).includes(q) ||
        normalize(c.description).includes(q) ||
        normalize(c.companyName).includes(q)
      )) return false;
    }
    return true;
  });

  // Mutation para deletar contrato (temporariamente desabilitado)
  const deleteContractMutation = useMutation({
    mutationFn: async (_contractId: string) => {
      // await apiRequest('DELETE', `/api/contracts/${contractId}`);
      throw new Error('Funcionalidade temporariamente desabilitada');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast({
        title: "✅ Contrato Excluído",
        description: "O contrato foi removido com sucesso."
      });
    },
    onError: () => {
      toast({
        title: "❌ Erro",
        description: "Não foi possível excluir o contrato.",
        variant: "destructive"
      });
    }
  });

  const getStatusBadge = (status: string) => {
    const variants = {
      active: { variant: "default" as const, label: "Ativo" },
      inactive: { variant: "secondary" as const, label: "Inativo" },
      expired: { variant: "destructive" as const, label: "Expirado" },
      suspended: { variant: "outline" as const, label: "Suspenso" }
    };
    
    const config = variants[status as keyof typeof variants] || variants.inactive;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const types = {
      support: { color: "bg-blue-100 text-blue-800", label: "Suporte" },
      maintenance: { color: "bg-green-100 text-green-800", label: "Manutenção" },
      development: { color: "bg-purple-100 text-purple-800", label: "Desenvolvimento" },
      consulting: { color: "bg-orange-100 text-orange-800", label: "Consultoria" }
    };
    
    const config = types[type as keyof typeof types] || types.support;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getUsagePercentage = (used: number, included: number) => {
    return included > 0 ? Math.min((used / included) * 100, 100) : 0;
  };

  const getOverageHours = (used: number, included: number) => {
    return Math.max(used - included, 0);
  };

  const handleEdit = (contract: Contract) => {
    setEditingContract(contract);
    setIsDialogOpen(true);
  };

  const handleDelete = (contractId: string) => {
    if (confirm('Tem certeza que deseja excluir este contrato?')) {
      deleteContractMutation.mutate(contractId);
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingContract(null);
  };

  return (
    <AppLayout title="Contratos">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Gerenciamento de Contratos</h1>
            <p className="text-muted-foreground">
              Gerencie contratos de horas, planos de SLA e controle de consumo
            </p>
          </div>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Contrato
          </Button>
        </div>

        {/* Busca e Filtros */}
        <div className="flex flex-col lg:flex-row gap-4 items-start justify-between">
          <div className="flex-1 flex gap-2">
            <Input
              placeholder="Buscar contratos por número, tipo, empresa ou descrição..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
            <Select
              onValueChange={(v) => setStatusFilter(v === 'all' ? null : v)}
              defaultValue="all"
            >
              <SelectTrigger className="h-8 w-40 text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
                <SelectItem value="expired">Expirado</SelectItem>
                <SelectItem value="suspended">Suspenso</SelectItem>
              </SelectContent>
            </Select>
            <Select
              onValueChange={(v) => setCompanyFilter(v === 'all' ? null : parseInt(v))}
              defaultValue="all"
            >
              <SelectTrigger className="h-8 w-48 text-sm">
                <SelectValue placeholder="Empresa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as empresas</SelectItem>
                {companies.map((co: Company) => (
                  <SelectItem key={co.id} value={co.id.toString()}>{co.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Button onClick={() => { setSearchQuery(''); setStatusFilter(null); setCompanyFilter(null); }} variant="outline">Limpar</Button>
          </div>
        </div>

        {/* Resumo Geral */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Contratos Ativos</p>
                  <p className="text-2xl font-bold">
                    {filteredContracts.filter((c: Contract) => c.status === 'active').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Total de Horas</p>
                  <p className="text-2xl font-bold">
                    {filteredContracts.reduce((acc: number, c: Contract) => acc + c.includedHours, 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-orange-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Horas Consumidas</p>
                  <p className="text-2xl font-bold">
                    {filteredContracts.reduce((acc: number, c: Contract) => acc + c.usedHours, 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Horas Sobresalentes</p>
                  <p className="text-2xl font-bold text-red-600">
                    {filteredContracts.reduce((acc: number, c: Contract) => acc + getOverageHours(c.usedHours, c.includedHours), 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Contratos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredContracts.map((contract: Contract) => {
            const usagePercentage = getUsagePercentage(contract.usedHours, contract.includedHours);
            const overageHours = getOverageHours(contract.usedHours, contract.includedHours);
            const company = companies.find((c: Company) => c.id === contract.companyId);

            return (
              <Card key={contract.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {contract.contractNumber}
                        {getStatusBadge(contract.status)}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {company?.name || 'Empresa não encontrada'}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(contract)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(contract.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {getTypeBadge(contract.type)}
                    <Badge variant="outline">
                      R$ {contract.monthlyValue.toFixed(2)}/mês
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Consumo de Horas */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Consumo de Horas</span>
                      <span className="text-sm text-muted-foreground">
                        {contract.usedHours}h / {contract.includedHours}h
                      </span>
                    </div>
                    <Progress value={usagePercentage} className="h-2" />
                    
                    {overageHours > 0 && (
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-sm text-red-600 font-medium">
                          Horas Sobresalentes
                        </span>
                        <span className="text-sm text-red-600 font-bold">
                          +{overageHours.toFixed(1)}h
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Informações Adicionais */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Valor/Hora Extra</p>
                      <p className="font-medium">R$ {contract.hourlyRate.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Reset</p>
                      <p className="font-medium">Dia {contract.resetDay}</p>
                    </div>
                  </div>

                  {contract.description && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Descrição</p>
                      <p className="text-sm">{contract.description}</p>
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground">
                    Vigência: {new Date(contract.startDate).toLocaleDateString()} até {
                      contract.endDate === '9999-12-31T23:59:59.999Z' || new Date(contract.endDate).getFullYear() === 9999
                        ? 'Indefinido'
                        : new Date(contract.endDate).toLocaleDateString()
                    }
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {contracts.length === 0 && !isLoading && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Clock className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum contrato encontrado</h3>
              <p className="text-muted-foreground text-center mb-4">
                Comece criando seu primeiro contrato para gerenciar horas e SLAs
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Contrato
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog para criar/editar contrato */}
      <ContractDialog
        open={isDialogOpen}
        onOpenChange={handleCloseDialog}
        contract={editingContract}
        companies={companies}
      />
    </AppLayout>
  );
}
