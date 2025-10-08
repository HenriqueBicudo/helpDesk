import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface Contract {
  id?: string;
  contractNumber: string;
  companyId: number;
  type: 'support' | 'maintenance' | 'development' | 'consulting';
  status: 'active' | 'inactive' | 'expired' | 'suspended';
  startDate: string;
  endDate: string;
  monthlyValue: number;
  hourlyRate: number;
  includedHours: number;
  resetDay: number;
  allowOverage: boolean;
  description?: string;
  slaRuleId?: string;
}

interface Company {
  id: number;
  name: string;
}

interface ContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract?: Contract | null;
  companies: Company[];
}

export function ContractDialog({ open, onOpenChange, contract, companies }: ContractDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<Contract>({
    contractNumber: '',
    companyId: 0,
    type: 'support',
    status: 'active',
    startDate: '',
    endDate: '',
    monthlyValue: 0,
    hourlyRate: 0,
    includedHours: 0,
    resetDay: 1,
    allowOverage: false,
    description: '',
    slaRuleId: '',
  });

  const [isEndDateIndefinite, setIsEndDateIndefinite] = useState(false);

  // Templates SLA pré-definidos (mesmo padrão da interface de aplicação)
  const slaTemplates = [
    {
      id: 'suporte-basico',
      name: 'Suporte Básico',
      description: 'Template para contratos de suporte básico',
      responseTime: '8h',
      solutionTime: '72h',
    },
    {
      id: 'suporte-premium', 
      name: 'Suporte Premium',
      description: 'Template para contratos premium com SLA otimizado',
      responseTime: '2h',
      solutionTime: '24h',
    },
    {
      id: 'suporte-critico',
      name: 'Suporte Crítico',
      description: 'Template para sistemas críticos',
      responseTime: '30min',
      solutionTime: '4h',
    },
    {
      id: 'manutencao',
      name: 'Manutenção',
      description: 'Template para contratos de manutenção',
      responseTime: '24h',
      solutionTime: '120h',
    },
    {
      id: 'desenvolvimento',
      name: 'Desenvolvimento',
      description: 'Template para projetos de desenvolvimento',
      responseTime: '4h',
      solutionTime: '48h',
    },
    {
      id: 'consultoria',
      name: 'Consultoria',
      description: 'Template para serviços de consultoria',
      responseTime: '12h',
      solutionTime: '96h',
    },
  ];

  // Resetar form quando abrir/fechar ou alterar contrato
  useEffect(() => {
    if (contract) {
      const hasIndefiniteEndDate = !contract.endDate || contract.endDate === '9999-12-31T00:00:00.000Z';
      setIsEndDateIndefinite(hasIndefiniteEndDate);
      setFormData({
        ...contract,
        startDate: contract.startDate.split('T')[0],
        endDate: hasIndefiniteEndDate ? '' : contract.endDate.split('T')[0],
      });
    } else {
      setIsEndDateIndefinite(false);
      setFormData({
        contractNumber: '',
        companyId: 0,
        type: 'support',
        status: 'active',
        startDate: '',
        endDate: '',
        monthlyValue: 0,
        hourlyRate: 0,
        includedHours: 0,
        resetDay: 1,
        allowOverage: false,
        description: '',
        slaRuleId: '',
      });
    }
  }, [contract, open]);

  const createMutation = useMutation({
    mutationFn: async (data: Contract) => {
      const endDate = isEndDateIndefinite ? '9999-12-31T23:59:59.999Z' : new Date(data.endDate).toISOString();
      const response = await apiRequest('POST', '/api/contracts', {
        ...data,
        startDate: new Date(data.startDate).toISOString(),
        endDate: endDate,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast({
        title: "✅ Contrato Criado",
        description: "O contrato foi criado com sucesso."
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "❌ Erro",
        description: "Não foi possível criar o contrato.",
        variant: "destructive"
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Contract) => {
      const endDate = isEndDateIndefinite ? '9999-12-31T23:59:59.999Z' : new Date(data.endDate).toISOString();
      const response = await apiRequest('PUT', `/api/contracts/${contract?.id}`, {
        ...data,
        startDate: new Date(data.startDate).toISOString(),
        endDate: endDate,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast({
        title: "✅ Contrato Atualizado",
        description: "O contrato foi atualizado com sucesso."
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "❌ Erro",
        description: "Não foi possível atualizar o contrato.",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.contractNumber || !formData.companyId || !formData.startDate || (!isEndDateIndefinite && !formData.endDate)) {
      toast({
        title: "⚠️ Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    if (contract) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleInputChange = (field: keyof Contract, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {contract ? 'Editar Contrato' : 'Novo Contrato'}
          </DialogTitle>
          <DialogDescription>
            {contract ? 'Edite as informações do contrato existente.' : 'Crie um novo contrato preenchendo as informações abaixo.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações Básicas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contractNumber">Número do Contrato *</Label>
              <Input
                id="contractNumber"
                value={formData.contractNumber}
                onChange={(e) => handleInputChange('contractNumber', e.target.value)}
                placeholder="ex: CONT-2024-001"
                required
              />
            </div>

            <div>
              <Label htmlFor="companyId">Empresa Cliente *</Label>
              <Select
                value={formData.companyId ? formData.companyId.toString() : ''}
                onValueChange={(value) => handleInputChange('companyId', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar empresa" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id.toString()}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="type">Tipo de Contrato</Label>
              <Select
                value={formData.type}
                onValueChange={(value: any) => handleInputChange('type', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="support">Suporte</SelectItem>
                  <SelectItem value="maintenance">Manutenção</SelectItem>
                  <SelectItem value="development">Desenvolvimento</SelectItem>
                  <SelectItem value="consulting">Consultoria</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: any) => handleInputChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                  <SelectItem value="expired">Expirado</SelectItem>
                  <SelectItem value="suspended">Suspenso</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Período do Contrato */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Data de Início *</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => handleInputChange('startDate', e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="endDate">Data de Fim</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="indefinite-end-date"
                    checked={isEndDateIndefinite}
                    onCheckedChange={(checked) => {
                      setIsEndDateIndefinite(checked as boolean);
                      if (checked) {
                        handleInputChange('endDate', '');
                      }
                    }}
                  />
                  <Label htmlFor="indefinite-end-date" className="text-sm font-normal">
                    Data fim indefinida
                  </Label>
                </div>
                {!isEndDateIndefinite && (
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => handleInputChange('endDate', e.target.value)}
                    required={!isEndDateIndefinite}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Valores */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="monthlyValue">Valor Mensal (R$)</Label>
              <Input
                id="monthlyValue"
                type="number"
                step="0.01"
                min="0"
                value={formData.monthlyValue}
                onChange={(e) => handleInputChange('monthlyValue', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="hourlyRate">Valor Hora Extra (R$)</Label>
              <Input
                id="hourlyRate"
                type="number"
                step="0.01"
                min="0"
                value={formData.hourlyRate}
                onChange={(e) => handleInputChange('hourlyRate', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Horas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="includedHours">Horas Incluídas</Label>
              <Input
                id="includedHours"
                type="number"
                min="0"
                value={formData.includedHours}
                onChange={(e) => handleInputChange('includedHours', parseInt(e.target.value) || 0)}
                placeholder="0"
              />
            </div>

            <div>
              <Label htmlFor="resetDay">Dia do Reset (1-31)</Label>
              <Input
                id="resetDay"
                type="number"
                min="1"
                max="31"
                value={formData.resetDay}
                onChange={(e) => handleInputChange('resetDay', parseInt(e.target.value) || 1)}
              />
            </div>
          </div>

          {/* SLA Template */}
          <div>
            <Label htmlFor="slaRuleId">Regra SLA (Opcional)</Label>
            <Select
              value={formData.slaRuleId || 'none'}
              onValueChange={(value) => handleInputChange('slaRuleId', value === 'none' ? null : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma regra SLA</SelectItem>
                {slaTemplates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{template.name}</span>
                      <span className="text-xs text-muted-foreground">
                        Resposta: {template.responseTime} | Resolução: {template.solutionTime}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Configurações */}
          <div className="flex items-center space-x-2">
            <Switch
              id="allowOverage"
              checked={formData.allowOverage}
              onCheckedChange={(checked) => handleInputChange('allowOverage', checked)}
            />
            <Label htmlFor="allowOverage">
              Permitir horas sobresalentes (exceder limite)
            </Label>
          </div>

          {/* Descrição */}
          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Descrição opcional do contrato..."
              rows={3}
            />
          </div>

          {/* Botões */}
          <div className="flex justify-end space-x-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending 
                ? 'Salvando...' 
                : contract ? 'Atualizar' : 'Criar'
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
