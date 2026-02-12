import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Power, PowerOff, Zap, X, Info } from 'lucide-react';

interface AutomationTrigger {
  id: number;
  name: string;
  description: string | null;
  triggerType: string;
  conditions: Record<string, any>;
  actions: Array<{ type: string; [key: string]: any }>;
  isActive: boolean;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
  creator?: {
    id: number;
    fullName: string;
    email: string;
  };
}

const TRIGGER_TYPES = [
  { value: 'ticket_created', label: '🎫 Ticket Criado', description: 'Quando um novo ticket é criado' },
  { value: 'ticket_updated', label: '📝 Ticket Atualizado', description: 'Quando qualquer campo do ticket é modificado' },
  { value: 'status_changed', label: '🔄 Status Alterado', description: 'Quando o status do ticket muda' },
  { value: 'priority_changed', label: '⚡ Prioridade Alterada', description: 'Quando a prioridade do ticket muda' },
  { value: 'assigned', label: '👤 Ticket Atribuído', description: 'Quando um ticket é atribuído a alguém' },
  { value: 'comment_added', label: '💬 Comentário Adicionado', description: 'Quando um novo comentário é adicionado' },
  { value: 'time_based', label: '⏰ Baseado em Tempo', description: 'Executar quando o tempo desde um evento específico exceder um limite' },
];

const ACTION_TYPES = [
  { value: 'add_comment', label: '💬 Adicionar Comentário' },
  { value: 'assign_to', label: '👤 Atribuir Para' },
  { value: 'change_priority', label: '⚡ Mudar Prioridade' },
  { value: 'change_status', label: '📊 Mudar Status' },
  { value: 'add_tag', label: '🏷️ Adicionar Tag' },
  { value: 'remove_tag', label: '🗑️ Remover Tag' },
  { value: 'set_category', label: '📁 Definir Categoria' },
  // { value: 'send_email', label: '📧 Enviar Email' }, // TODO: Implementar
];

// Campos disponíveis para condições
const CONDITION_FIELDS = [
  { value: 'priority', label: 'Prioridade', type: 'select', options: ['low', 'medium', 'high', 'critical'] },
  { value: 'status', label: 'Status', type: 'select', options: ['open', 'pending', 'in_progress', 'resolved', 'closed'] },
  { value: 'category', label: 'Categoria', type: 'text' },
  { value: 'assigneeId', label: 'Responsável', type: 'user' },
  { value: 'companyId', label: 'Empresa', type: 'company' },
  { value: 'requesterId', label: 'Solicitante', type: 'requester' },
  { value: 'subject', label: 'Assunto', type: 'text' },
  { value: 'description', label: 'Descrição', type: 'text' },
  { value: 'contractId', label: 'Contrato', type: 'text' },
];

// Campos de tempo disponíveis para gatilhos time_based
const TIME_FIELDS = [
  { value: 'created_at', label: 'Data de Criação' },
  { value: 'updated_at', label: 'Última Atualização' },
  { value: 'response_due_at', label: 'Prazo de Resposta (SLA)' },
  { value: 'solution_due_at', label: 'Prazo de Solução (SLA)' },
];

// Unidades de tempo
const TIME_UNITS = [
  { value: 'minutes', label: 'Minutos' },
  { value: 'hours', label: 'Horas' },
  { value: 'days', label: 'Dias' },
];

// Prioridades
const PRIORITIES = [
  { value: 'low', label: 'Baixa' },
  { value: 'medium', label: 'Média' },
  { value: 'high', label: 'Alta' },
  { value: 'critical', label: 'Crítica' },
];

// Status
const STATUSES = [
  { value: 'open', label: 'Aberto' },
  { value: 'pending', label: 'Pendente' },
  { value: 'in_progress', label: 'Em Progresso' },
  { value: 'resolved', label: 'Resolvido' },
  { value: 'closed', label: 'Fechado' },
];

// Operadores disponíveis
const OPERATORS = [
  { value: 'equals', label: '= (igual a)', symbol: '=' },
  { value: 'not_equals', label: '!= (diferente de)', symbol: '!=' },
  { value: 'greater_than', label: '> (maior que)', symbol: '>' },
  { value: 'less_than', label: '< (menor que)', symbol: '<' },
  { value: 'greater_or_equal', label: '>= (maior ou igual)', symbol: '>=' },
  { value: 'less_or_equal', label: '<= (menor ou igual)', symbol: '<=' },
  { value: 'contains', label: 'contém', symbol: '∋' },
  { value: 'not_contains', label: 'não contém', symbol: '∌' },
  { value: 'starts_with', label: 'começa com', symbol: '⌐' },
  { value: 'ends_with', label: 'termina com', symbol: '¬' },
  { value: 'in', label: 'está em (lista)', symbol: '∈' },
  { value: 'not_in', label: 'não está em', symbol: '∉' },
  { value: 'exists', label: 'existe / tem valor', symbol: '∃' },
  { value: 'not_exists', label: 'não existe / vazio', symbol: '∄' },
];

interface Condition {
  id: string;
  field: string;
  operator: string;
  value: any;
}

interface Action {
  id: string;
  type: string;
  params: Record<string, any>;
}

// Componente de conteúdo (sem AppLayout) para usar em tabs
export function AutomationTriggersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showDialog, setShowDialog] = useState(false);
  const [editingTrigger, setEditingTrigger] = useState<AutomationTrigger | null>(null);
  const [showAdvancedMode, setShowAdvancedMode] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    triggerType: 'ticket_created',
    isActive: true,
  });

  // Estados para modo visual
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  
  // Estado para condição temporal (time_based)
  const [timeCondition, setTimeCondition] = useState({
    field: 'created_at',
    operator: 'greater_than',
    value: 24,
    unit: 'hours',
  });

  // Estados para modo avançado (JSON)
  const [conditionsJson, setConditionsJson] = useState('{}');
  const [actionsJson, setActionsJson] = useState('[]');

  // Buscar todos os gatilhos
  const { data: triggers = [], isLoading } = useQuery<AutomationTrigger[]>({
    queryKey: ['/api/automation-triggers'],
  });

  // Buscar usuários para o select
  const { data: users = [] } = useQuery<any[]>({
    queryKey: ['/api/users'],
  });

  // Buscar equipes
  const { data: teams = [] } = useQuery<any[]>({
    queryKey: ['/api/access/teams'],
  });

  // Buscar empresas
  const { data: companies = [] } = useQuery<any[]>({
    queryKey: ['/api/access/companies'],
  });

  // Buscar solicitantes
  const { data: requesters = [] } = useQuery<any[]>({
    queryKey: ['/api/requesters'],
  });

  // Buscar tags
  const { data: tags = [] } = useQuery<any[]>({
    queryKey: ['/api/tags'],
  });

  // Converter conditions array para objeto JSON
  const conditionsToJson = (conditions: Condition[]): Record<string, any> => {
    const result: Record<string, any> = {};
    
    // Se for time_based, incluir timeCondition
    if (formData.triggerType === 'time_based') {
      result.timeCondition = timeCondition;
    }
    
    if (conditions.length === 0) return result;
    
    // Se todas as condições usam 'equals', manter formato simples
    const allEquals = conditions.every(c => !c.operator || c.operator === 'equals');
    if (allEquals) {
      conditions.forEach(condition => {
        if (condition.field && condition.value !== undefined && condition.value !== '') {
          result[condition.field] = condition.value === 'null' ? null : condition.value;
        }
      });
      return result;
    }
    
    // Formato avançado com operadores
    return {
      ...result,
      _advanced: true,
      _operator: 'AND',
      conditions: conditions.map(c => ({
        field: c.field,
        operator: c.operator || 'equals',
        value: c.value === 'null' ? null : c.value
      }))
    };
  };

  // Converter objeto JSON para conditions array
  const jsonToConditions = (json: Record<string, any>): Condition[] => {
    // Extrair timeCondition se existir
    if (json.timeCondition) {
      setTimeCondition(json.timeCondition);
    }
    
    // Formato avançado com operadores
    if (json._advanced && json.conditions) {
      return json.conditions.map((c: any, index: number) => ({
        id: `cond-${index}`,
        field: c.field,
        operator: c.operator || 'equals',
        value: c.value === null ? 'null' : c.value,
      }));
    }
    
    // Formato simples (backwards compatibility)
    return Object.entries(json)
      .filter(([key]) => !key.startsWith('_') && key !== 'timeCondition')
      .map(([field, value], index) => ({
        id: `cond-${index}`,
        field,
        operator: 'equals',
        value: value === null ? 'null' : value,
      }));
  };

  // Converter actions array para formato esperado pelo backend
  const actionsToJson = (actions: Action[]): any[] => {
    return actions.map(action => {
      const { type, params } = action;
      return { type, ...params };
    });
  };

  // Converter JSON para actions array
  const jsonToActions = (json: any[]): Action[] => {
    return json.map((action, index) => {
      const { type, ...params } = action;
      return {
        id: `action-${index}`,
        type,
        params,
      };
    });
  };

  // Mutation para criar/atualizar
  const saveMutation = useMutation({
    mutationFn: async () => {
      const url = editingTrigger
        ? `/api/automation-triggers/${editingTrigger.id}`
        : '/api/automation-triggers';
      
      const method = editingTrigger ? 'PUT' : 'POST';
      
      let conditionsData: Record<string, any>;
      let actionsData: any[];

      if (showAdvancedMode) {
        // Modo avançado: usar JSON diretamente
        try {
          conditionsData = JSON.parse(conditionsJson);
          actionsData = JSON.parse(actionsJson);
        } catch (e) {
          throw new Error('JSON inválido');
        }
      } else {
        // Modo visual: converter arrays para JSON
        conditionsData = conditionsToJson(conditions);
        actionsData = actionsToJson(actions);
      }
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          conditions: conditionsData,
          actions: actionsData,
        }),
      });

      if (!res.ok) throw new Error('Erro ao salvar gatilho');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/automation-triggers'] });
      setShowDialog(false);
      resetForm();
      toast({
        title: editingTrigger ? 'Gatilho atualizado' : 'Gatilho criado',
        description: 'O gatilho foi salvo com sucesso',
      });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar o gatilho',
        variant: 'destructive',
      });
    },
  });

  // Mutation para alternar ativo/inativo
  const toggleMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/automation-triggers/${id}/toggle`, {
        method: 'PATCH',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Erro ao alternar gatilho');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/automation-triggers'] });
      toast({ title: 'Status alterado' });
    },
  });

  // Mutation para excluir
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/automation-triggers/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Erro ao excluir gatilho');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/automation-triggers'] });
      toast({ title: 'Gatilho excluído' });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      triggerType: 'ticket_created',
      isActive: true,
    });
    setConditions([]);
    setActions([]);
    setTimeCondition({
      field: 'created_at',
      operator: 'greater_than',
      value: 24,
      unit: 'hours',
    });
    setConditionsJson('{}');
    setActionsJson('[]');
    setShowAdvancedMode(false);
    setEditingTrigger(null);
  };

  const handleEdit = (trigger: AutomationTrigger) => {
    setEditingTrigger(trigger);
    setFormData({
      name: trigger.name,
      description: trigger.description || '',
      triggerType: trigger.triggerType,
      isActive: trigger.isActive,
    });
    
    // Carregar condições e ações
    setConditions(jsonToConditions(trigger.conditions));
    setActions(jsonToActions(trigger.actions));
    setConditionsJson(JSON.stringify(trigger.conditions, null, 2));
    setActionsJson(JSON.stringify(trigger.actions, null, 2));
    
    setShowDialog(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('Tem certeza que deseja excluir este gatilho?')) {
      deleteMutation.mutate(id);
    }
  };

  const getTriggerTypeLabel = (type: string) => {
    return TRIGGER_TYPES.find(t => t.value === type)?.label || type;
  };

  // Gerenciar condições
  const addCondition = () => {
    setConditions([...conditions, {
      id: `cond-${Date.now()}`,
      field: 'priority',
      operator: 'equals',
      value: '',
    }]);
  };

  const updateCondition = (id: string, updates: Partial<Condition>) => {
    setConditions(conditions.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const removeCondition = (id: string) => {
    setConditions(conditions.filter(c => c.id !== id));
  };

  // Gerenciar ações
  const addAction = () => {
    setActions([...actions, {
      id: `action-${Date.now()}`,
      type: 'add_comment',
      params: {},
    }]);
  };

  const updateAction = (id: string, updates: Partial<Action>) => {
    setActions(actions.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  const removeAction = (id: string) => {
    setActions(actions.filter(a => a.id !== id));
  };

  const updateActionParam = (id: string, paramName: string, value: any) => {
    setActions(actions.map(a => 
      a.id === id ? { ...a, params: { ...a.params, [paramName]: value } } : a
    ));
  };

  // Conteúdo interno reutilizável
  const triggersContent = (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Gatilhos Personalizados
              </CardTitle>
              <CardDescription>
                Configure gatilhos automáticos para executar ações quando certas condições forem atendidas
              </CardDescription>
            </div>
            <Button onClick={() => { resetForm(); setShowDialog(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Gatilho
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p>Carregando...</p>
            ) : triggers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum gatilho configurado ainda</p>
                <p className="text-sm mt-2">Clique em "Novo Gatilho" para começar</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Evento</TableHead>
                    <TableHead>Condições & Ações</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Opções</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {triggers.map((trigger) => (
                    <TableRow key={trigger.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div>{trigger.name}</div>
                          {trigger.description && (
                            <div className="text-xs text-muted-foreground mt-1 max-w-xs">
                              {trigger.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getTriggerTypeLabel(trigger.triggerType)}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          {/* Condições */}
                          <div className="text-xs">
                            <div className="font-medium text-muted-foreground mb-1">SE:</div>
                            <div className="space-y-1">
                              {Object.entries(trigger.conditions || {}).length > 0 ? (
                                Object.entries(trigger.conditions).map(([key, value], idx) => (
                                  <div key={idx} className="flex items-center gap-1 text-muted-foreground">
                                    <span className="font-medium">{key}:</span>
                                    <span className="bg-muted px-1.5 py-0.5 rounded text-xs">{String(value)}</span>
                                  </div>
                                ))
                              ) : (
                                <span className="text-muted-foreground italic">Sempre executar</span>
                              )}
                            </div>
                          </div>
                          {/* Ações */}
                          <div className="text-xs">
                            <div className="font-medium text-muted-foreground mb-1">ENTÃO:</div>
                            <div className="flex flex-wrap gap-1">
                              {trigger.actions.map((action, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {ACTION_TYPES.find(a => a.value === action.type)?.label || action.type}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleMutation.mutate(trigger.id)}
                          >
                            {trigger.isActive ? (
                              <Power className="h-4 w-4 text-green-600" />
                            ) : (
                              <PowerOff className="h-4 w-4 text-gray-400" />
                            )}
                          </Button>
                          <Badge variant={trigger.isActive ? 'default' : 'secondary'}>
                            {trigger.isActive ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(trigger)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(trigger.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Dialog de Criar/Editar */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTrigger ? 'Editar Gatilho' : 'Novo Gatilho'}
              </DialogTitle>
              <DialogDescription>
                Configure as condições e ações do gatilho automático de forma visual
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Informações básicas */}
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nome do Gatilho *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Auto-atribuir tickets urgentes"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descreva o que este gatilho faz..."
                    rows={2}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="triggerType">Quando executar? *</Label>
                  <Select
                    value={formData.triggerType}
                    onValueChange={(value) => setFormData({ ...formData, triggerType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TRIGGER_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex flex-col">
                            <span>{type.label}</span>
                            <span className="text-xs text-muted-foreground">{type.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {TRIGGER_TYPES.find(t => t.value === formData.triggerType)?.description}
                  </p>
                </div>
              </div>

              {/* Condição Temporal - apenas para time_based */}
              {formData.triggerType === 'time_based' && (
                <Card className="border-blue-200 bg-blue-50/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      ⏰ Condição Temporal *
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Defina após quanto tempo desde um evento o gatilho deve ser executado
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-4 gap-3">
                      <div className="col-span-2">
                        <Label className="text-xs">Campo de Data/Hora</Label>
                        <Select
                          value={timeCondition.field}
                          onValueChange={(value) => setTimeCondition({ ...timeCondition, field: value })}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIME_FIELDS.map((field) => (
                              <SelectItem key={field.value} value={field.value}>
                                {field.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-xs">Operador</Label>
                        <Select
                          value={timeCondition.operator}
                          onValueChange={(value) => setTimeCondition({ ...timeCondition, operator: value })}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="greater_than">&gt; maior que</SelectItem>
                            <SelectItem value="less_than">&lt; menor que</SelectItem>
                            <SelectItem value="equals">= igual a</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-xs">Valor</Label>
                        <Input
                          type="number"
                          min="0"
                          className="h-9"
                          value={timeCondition.value}
                          onChange={(e) => setTimeCondition({ ...timeCondition, value: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs">Unidade de Tempo</Label>
                      <Select
                        value={timeCondition.unit}
                        onValueChange={(value) => setTimeCondition({ ...timeCondition, unit: value })}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIME_UNITS.map((unit) => (
                            <SelectItem key={unit.value} value={unit.value}>
                              {unit.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Alert className="bg-blue-50 border-blue-200">
                      <Info className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-xs text-blue-800">
                        <strong>Exemplo:</strong> Se configurar "Data de Criação &gt; 24 horas", 
                        o gatilho será executado em tickets que foram criados há mais de 24 horas.
                        O sistema verifica a cada 5 minutos.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              )}

              {/* Toggle entre modo visual e avançado */}
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {showAdvancedMode ? 'Modo Avançado (JSON)' : 'Modo Visual (Recomendado)'}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAdvancedMode(!showAdvancedMode)}
                >
                  {showAdvancedMode ? 'Usar Modo Visual' : 'Modo Avançado'}
                </Button>
              </div>

              {!showAdvancedMode ? (
                <>
                  {/* Modo Visual - Condições */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-base">Condições (AND)</Label>
                      <Button type="button" onClick={addCondition} size="sm" variant="outline">
                        <Plus className="h-4 w-4 mr-1" />
                        Adicionar Condição
                      </Button>
                    </div>

                    {conditions.length === 0 ? (
                      <div className="text-sm text-muted-foreground italic p-4 border border-dashed rounded">
                        Nenhuma condição - executará sempre
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {conditions.map((condition) => (
                          <Card key={condition.id}>
                            <CardContent className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="flex-1 grid grid-cols-3 gap-2">
                                  <div>
                                    <Label className="text-xs">Campo</Label>
                                    <Select
                                      value={condition.field}
                                      onValueChange={(value) => updateCondition(condition.id, { field: value, value: '' })}
                                    >
                                      <SelectTrigger className="h-9">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {CONDITION_FIELDS.map((field) => (
                                          <SelectItem key={field.value} value={field.value}>
                                            {field.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div>
                                    <Label className="text-xs">Operador</Label>
                                    <Select
                                      value={condition.operator || 'equals'}
                                      onValueChange={(value) => updateCondition(condition.id, { operator: value })}
                                    >
                                      <SelectTrigger className="h-9">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {OPERATORS.map((op) => (
                                          <SelectItem key={op.value} value={op.value}>
                                            {op.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div>
                                    <Label className="text-xs">Valor</Label>
                                    {condition.field === 'priority' ? (
                                      <Select
                                        value={condition.value}
                                        onValueChange={(value) => updateCondition(condition.id, { value })}
                                      >
                                        <SelectTrigger className="h-9">
                                          <SelectValue placeholder="Selecione..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {PRIORITIES.map((p) => (
                                            <SelectItem key={p.value} value={p.value}>
                                              {p.label}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    ) : condition.field === 'status' ? (
                                      <Select
                                        value={condition.value}
                                        onValueChange={(value) => updateCondition(condition.id, { value })}
                                      >
                                        <SelectTrigger className="h-9">
                                          <SelectValue placeholder="Selecione..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {STATUSES.map((s) => (
                                            <SelectItem key={s.value} value={s.value}>
                                              {s.label}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    ) : condition.field === 'assigneeId' || condition.field === 'createdBy' ? (
                                      <Select
                                        value={condition.value?.toString()}
                                        onValueChange={(value) => updateCondition(condition.id, { value: value === 'null' ? 'null' : parseInt(value) })}
                                      >
                                        <SelectTrigger className="h-9">
                                          <SelectValue placeholder="Selecione..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="null">(Sem responsável)</SelectItem>
                                          {users.map((user: any) => (
                                            <SelectItem key={user.id} value={user.id.toString()}>
                                              {user.fullName}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    ) : condition.field === 'teamId' ? (
                                      <Select
                                        value={condition.value?.toString()}
                                        onValueChange={(value) => updateCondition(condition.id, { value: parseInt(value) })}
                                      >
                                        <SelectTrigger className="h-9">
                                          <SelectValue placeholder="Selecione..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {teams.map((team: any) => (
                                            <SelectItem key={team.id} value={team.id.toString()}>
                                              {team.name}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    ) : condition.field === 'companyId' ? (
                                      <Select
                                        value={condition.value?.toString()}
                                        onValueChange={(value) => updateCondition(condition.id, { value: parseInt(value) })}
                                      >
                                        <SelectTrigger className="h-9">
                                          <SelectValue placeholder="Selecione..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {companies.map((company: any) => (
                                            <SelectItem key={company.id} value={company.id.toString()}>
                                              {company.name}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    ) : condition.field === 'requesterId' ? (
                                      <Select
                                        value={condition.value?.toString()}
                                        onValueChange={(value) => updateCondition(condition.id, { value: parseInt(value) })}
                                      >
                                        <SelectTrigger className="h-9">
                                          <SelectValue placeholder="Selecione..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {requesters.map((req: any) => (
                                            <SelectItem key={req.id} value={req.id.toString()}>
                                              {req.fullName} ({req.email})
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    ) : (
                                      <Input
                                        className="h-9"
                                        value={condition.value}
                                        onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
                                        placeholder="Digite o valor..."
                                      />
                                    )}
                                  </div>
                                </div>

                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeCondition(condition.id)}
                                  className="mt-5"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Modo Visual - Ações */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-base">Ações *</Label>
                      <Button type="button" onClick={addAction} size="sm" variant="outline">
                        <Plus className="h-4 w-4 mr-1" />
                        Adicionar Ação
                      </Button>
                    </div>

                    {actions.length === 0 ? (
                      <div className="text-sm text-destructive p-4 border border-destructive border-dashed rounded">
                        Pelo menos uma ação é obrigatória
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {actions.map((action) => (
                          <Card key={action.id}>
                            <CardContent className="p-4">
                              <div className="space-y-3">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <Label className="text-xs">Tipo de Ação</Label>
                                    <Select
                                      value={action.type}
                                      onValueChange={(value) => updateAction(action.id, { type: value, params: {} })}
                                    >
                                      <SelectTrigger className="h-9 mt-1">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {ACTION_TYPES.map((type) => (
                                          <SelectItem key={type.value} value={type.value}>
                                            {type.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeAction(action.id)}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>

                                {/* Parâmetros específicos por tipo de ação */}
                                {action.type === 'add_comment' && (
                                  <div className="space-y-2">
                                    <div>
                                      <Label className="text-xs">Conteúdo do Comentário *</Label>
                                      <Textarea
                                        value={action.params.content || ''}
                                        onChange={(e) => updateActionParam(action.id, 'content', e.target.value)}
                                        placeholder="Digite o comentário que será adicionado..."
                                        rows={3}
                                        className="mt-1"
                                      />
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <Switch
                                        id={`internal-${action.id}`}
                                        checked={action.params.isInternal || false}
                                        onCheckedChange={(checked) => updateActionParam(action.id, 'isInternal', checked)}
                                      />
                                      <Label htmlFor={`internal-${action.id}`} className="text-xs">
                                        Comentário interno (visível apenas para agentes)
                                      </Label>
                                    </div>
                                  </div>
                                )}

                                {action.type === 'assign_to' && (
                                  <div>
                                    <Label className="text-xs">Atribuir para usuário *</Label>
                                    <Select
                                      value={action.params.userId?.toString()}
                                      onValueChange={(value) => updateActionParam(action.id, 'userId', parseInt(value))}
                                    >
                                      <SelectTrigger className="h-9 mt-1">
                                        <SelectValue placeholder="Selecione o usuário..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {users.map((user: any) => (
                                          <SelectItem key={user.id} value={user.id.toString()}>
                                            {user.fullName} ({user.email})
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}

                                {action.type === 'change_priority' && (
                                  <div>
                                    <Label className="text-xs">Nova Prioridade *</Label>
                                    <Select
                                      value={action.params.priority}
                                      onValueChange={(value) => updateActionParam(action.id, 'priority', value)}
                                    >
                                      <SelectTrigger className="h-9 mt-1">
                                        <SelectValue placeholder="Selecione a prioridade..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {PRIORITIES.map((p) => (
                                          <SelectItem key={p.value} value={p.value}>
                                            {p.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}

                                {action.type === 'change_status' && (
                                  <div>
                                    <Label className="text-xs">Novo Status *</Label>
                                    <Select
                                      value={action.params.status}
                                      onValueChange={(value) => updateActionParam(action.id, 'status', value)}
                                    >
                                      <SelectTrigger className="h-9 mt-1">
                                        <SelectValue placeholder="Selecione o status..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {STATUSES.map((s) => (
                                          <SelectItem key={s.value} value={s.value}>
                                            {s.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}

                                {action.type === 'send_email' && (
                                  <div className="space-y-2">
                                    <div>
                                      <Label className="text-xs">Para (email) *</Label>
                                      <Input
                                        value={action.params.to || ''}
                                        onChange={(e) => updateActionParam(action.id, 'to', e.target.value)}
                                        placeholder="email@exemplo.com"
                                        className="mt-1 h-9"
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs">Assunto *</Label>
                                      <Input
                                        value={action.params.subject || ''}
                                        onChange={(e) => updateActionParam(action.id, 'subject', e.target.value)}
                                        placeholder="Assunto do email"
                                        className="mt-1 h-9"
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs">Mensagem *</Label>
                                      <Textarea
                                        value={action.params.body || ''}
                                        onChange={(e) => updateActionParam(action.id, 'body', e.target.value)}
                                        placeholder="Conteúdo do email..."
                                        rows={3}
                                        className="mt-1"
                                      />
                                    </div>
                                  </div>
                                )}

                                {action.type === 'add_tag' && (
                                  <div>
                                    <Label className="text-xs">Nome da Tag *</Label>
                                    <Select
                                      value={action.params.tag || ''}
                                      onValueChange={(value) => updateActionParam(action.id, 'tag', value)}
                                    >
                                      <SelectTrigger className="h-9 mt-1">
                                        <SelectValue placeholder="Selecione uma tag..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {tags.map((tag: any) => (
                                          <SelectItem key={tag.id} value={tag.name}>
                                            <div className="flex items-center gap-2">
                                              <div 
                                                className="w-3 h-3 rounded-full" 
                                                style={{ backgroundColor: tag.color }}
                                              />
                                              {tag.name}
                                            </div>
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}

                                {action.type === 'remove_tag' && (
                                  <div>
                                    <Label className="text-xs">Nome da Tag *</Label>
                                    <Select
                                      value={action.params.tag || ''}
                                      onValueChange={(value) => updateActionParam(action.id, 'tag', value)}
                                    >
                                      <SelectTrigger className="h-9 mt-1">
                                        <SelectValue placeholder="Selecione uma tag..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {tags.map((tag: any) => (
                                          <SelectItem key={tag.id} value={tag.name}>
                                            <div className="flex items-center gap-2">
                                              <div 
                                                className="w-3 h-3 rounded-full" 
                                                style={{ backgroundColor: tag.color }}
                                              />
                                              {tag.name}
                                            </div>
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}

                                {action.type === 'set_category' && (
                                  <div>
                                    <Label className="text-xs">Categoria *</Label>
                                    <Input
                                      value={action.params.category || ''}
                                      onChange={(e) => updateActionParam(action.id, 'category', e.target.value)}
                                      placeholder="Ex: Suporte Técnico"
                                      className="mt-1 h-9"
                                    />
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Modo Avançado - JSON */}
                  <div className="space-y-4">
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        Modo avançado: Edite diretamente o JSON das condições e ações. 
                        Use o modo visual para uma experiência mais fácil.
                      </AlertDescription>
                    </Alert>

                    <div className="grid gap-2">
                      <Label htmlFor="conditions">
                        Condições (JSON)
                      </Label>
                      <Textarea
                        id="conditions"
                        value={conditionsJson}
                        onChange={(e) => setConditionsJson(e.target.value)}
                        placeholder='{"priority": "urgent"}'
                        rows={4}
                        className="font-mono text-sm"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="actions">
                        Ações (JSON Array)
                      </Label>
                      <Textarea
                        id="actions"
                        value={actionsJson}
                        onChange={(e) => setActionsJson(e.target.value)}
                        placeholder='[{"type": "add_comment", "content": "..."}]'
                        rows={6}
                        className="font-mono text-sm"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Ativar gatilho */}
              <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="isActive">Ativar gatilho imediatamente</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={() => saveMutation.mutate()} disabled={!showAdvancedMode && actions.length === 0}>
                {editingTrigger ? 'Atualizar' : 'Criar'} Gatilho
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </div>
  );

  return triggersContent;
}

// Página completa com AppLayout para rota standalone
export default function AutomationTriggersPageWithLayout() {
  return (
    <AppLayout title="Gatilhos de Automação">
      <div className="container mx-auto py-6">
        <AutomationTriggersPage />
      </div>
    </AppLayout>
  );
}
