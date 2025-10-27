import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, Edit, Trash2, Zap, Play, Pause } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AutomationRule {
  id: string;
  name: string;
  description: string;
  trigger: 'ticket_created' | 'status_changed' | 'priority_changed' | 'keyword_detected' | 'time_based' | 'user_action';
  conditions: {
    field: string;
    operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'regex';
    value: string;
  }[];
  actions: {
    type: 'set_priority' | 'set_category' | 'assign_agent' | 'add_tag' | 'send_notification' | 'escalate';
    value: string;
  }[];
  isActive: boolean;
  executionCount: number;
  lastExecuted?: Date;
}

interface AutomationRulesProps {
  onChanges: () => void;
}

export function AutomationRules({ onChanges }: AutomationRulesProps) {
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([
    {
      id: '1',
      name: 'Auto-priorizar Tickets Críticos',
      description: 'Automaticamente define prioridade crítica para tickets que contêm palavras-chave de emergência',
      trigger: 'keyword_detected',
      conditions: [
        { field: 'description', operator: 'contains', value: 'produção|emergência|fora do ar' }
      ],
      actions: [
        { type: 'set_priority', value: 'critical' },
        { type: 'send_notification', value: 'manager_team' }
      ],
      isActive: true,
      executionCount: 45,
      lastExecuted: new Date('2025-01-15T10:30:00')
    },
    {
      id: '2',
      name: 'Atribuição por Categoria',
      description: 'Atribui automaticamente tickets técnicos para a equipe de suporte',
      trigger: 'ticket_created',
      conditions: [
        { field: 'category', operator: 'equals', value: 'technical_support' }
      ],
      actions: [
        { type: 'assign_agent', value: 'tech_team' },
        { type: 'add_tag', value: 'auto-assigned' }
      ],
      isActive: true,
      executionCount: 128,
      lastExecuted: new Date('2025-01-15T09:15:00')
    },
    {
      id: '3',
      name: 'Escalação por Tempo',
      description: 'Escala tickets não respondidos após 2 horas em prioridade alta',
      trigger: 'time_based',
      conditions: [
        { field: 'priority', operator: 'equals', value: 'high' },
        { field: 'response_time', operator: 'greater_than', value: '120' }
      ],
      actions: [
        { type: 'escalate', value: 'manager' },
        { type: 'send_notification', value: 'escalation_team' }
      ],
      isActive: false,
      executionCount: 12,
      lastExecuted: new Date('2025-01-14T16:20:00')
    }
  ]);

  const [selectedRule, setSelectedRule] = useState<AutomationRule | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<AutomationRule>>({});
  const { toast } = useToast();

  const triggerLabels = {
    ticket_created: 'Ticket Criado',
    status_changed: 'Status Alterado',
    priority_changed: 'Prioridade Alterada',
    keyword_detected: 'Palavra-chave Detectada',
    time_based: 'Baseado em Tempo',
    user_action: 'Ação do Usuário'
  };

  const operatorLabels = {
    equals: 'Igual a',
    contains: 'Contém',
    greater_than: 'Maior que',
    less_than: 'Menor que',
    regex: 'Expressão Regular'
  };

  const actionTypeLabels = {
    set_priority: 'Definir Prioridade',
    set_category: 'Definir Categoria',
    assign_agent: 'Atribuir Agente',
    add_tag: 'Adicionar Tag',
    send_notification: 'Enviar Notificação',
    escalate: 'Escalar Ticket'
  };

  const handleEdit = (rule: AutomationRule) => {
    setSelectedRule(rule);
    setFormData({
      ...rule,
      conditions: [...rule.conditions],
      actions: [...rule.actions]
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.trigger || !formData.conditions?.length || !formData.actions?.length) {
      toast({
        title: "❌ Dados Incompletos",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    if (selectedRule) {
      // Editar regra existente
      setAutomationRules(prev => prev.map(r => 
        r.id === selectedRule.id 
          ? { ...formData, id: selectedRule.id, executionCount: selectedRule.executionCount, lastExecuted: selectedRule.lastExecuted } as AutomationRule
          : r
      ));
      toast({
        title: "✅ Regra Atualizada",
        description: `Regra "${formData.name}" foi atualizada com sucesso.`,
      });
    } else {
      // Criar nova regra
      const newRule: AutomationRule = {
        ...formData,
        id: Date.now().toString(),
        executionCount: 0,
        isActive: true
      } as AutomationRule;
      
      setAutomationRules(prev => [...prev, newRule]);
      toast({
        title: "✅ Regra Criada",
        description: `Regra "${formData.name}" foi criada com sucesso.`,
      });
    }

    setIsEditing(false);
    setSelectedRule(null);
    setFormData({});
    onChanges();
  };

  const handleDelete = (rule: AutomationRule) => {
    setAutomationRules(prev => prev.filter(r => r.id !== rule.id));
    toast({
      title: "🗑️ Regra Removida",
      description: `Regra "${rule.name}" foi removida.`,
    });
    onChanges();
  };

  const handleToggleActive = (rule: AutomationRule) => {
    setAutomationRules(prev => prev.map(r => 
      r.id === rule.id ? { ...r, isActive: !r.isActive } : r
    ));
    toast({
      title: rule.isActive ? "⏸️ Regra Pausada" : "▶️ Regra Ativada",
      description: `Regra "${rule.name}" foi ${rule.isActive ? 'pausada' : 'ativada'}.`,
    });
    onChanges();
  };

  const handleNewRule = () => {
    setSelectedRule(null);
    setFormData({
      name: '',
      description: '',
      trigger: 'ticket_created',
      conditions: [{ field: '', operator: 'equals', value: '' }],
      actions: [{ type: 'set_priority', value: '' }],
      isActive: true
    });
    setIsEditing(true);
  };

  const addCondition = () => {
    setFormData(prev => ({
      ...prev,
      conditions: [...(prev.conditions || []), { field: '', operator: 'equals', value: '' }]
    }));
  };

  const updateCondition = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      conditions: prev.conditions?.map((condition, i) => 
        i === index ? { ...condition, [field]: value } : condition
      )
    }));
  };

  const removeCondition = (index: number) => {
    setFormData(prev => ({
      ...prev,
      conditions: prev.conditions?.filter((_, i) => i !== index)
    }));
  };

  const addAction = () => {
    setFormData(prev => ({
      ...prev,
      actions: [...(prev.actions || []), { type: 'set_priority', value: '' }]
    }));
  };

  const updateAction = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      actions: prev.actions?.map((action, i) => 
        i === index ? { ...action, [field]: value } : action
      )
    }));
  };

  const removeAction = (index: number) => {
    setFormData(prev => ({
      ...prev,
      actions: prev.actions?.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">⚡ Regras de Automação</h2>
          <p className="text-muted-foreground">
            Configure automações para otimizar o fluxo de trabalho dos tickets
          </p>
        </div>
        <Button onClick={handleNewRule}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Regra
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lista de Regras */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Regras Configuradas ({automationRules.length})</h3>
          
          {automationRules.map((rule) => (
            <Card key={rule.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${rule.isActive ? 'bg-green-100 dark:bg-green-900' : 'bg-gray-100 dark:bg-gray-800'}`}>
                      {rule.isActive ? (
                        <Zap className="w-4 h-4 text-green-600" />
                      ) : (
                        <Pause className="w-4 h-4 text-gray-500" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-base">{rule.name}</CardTitle>
                      <CardDescription className="text-sm mt-1">
                        {rule.description}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(rule)}
                    >
                      {rule.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(rule)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(rule)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="outline">
                    {triggerLabels[rule.trigger]}
                  </Badge>
                  <Badge variant={rule.isActive ? "default" : "secondary"}>
                    {rule.isActive ? 'Ativa' : 'Pausada'}
                  </Badge>
                  {rule.executionCount > 0 && (
                    <Badge variant="secondary">
                      {rule.executionCount} execuções
                    </Badge>
                  )}
                </div>
                
                <div className="text-sm text-muted-foreground">
                  <p><strong>Condições:</strong> {rule.conditions.length}</p>
                  <p><strong>Ações:</strong> {rule.actions.length}</p>
                  {rule.lastExecuted && (
                    <p><strong>Última execução:</strong> {rule.lastExecuted.toLocaleString()}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Editor de Regra */}
        <div>
          {isEditing ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  {selectedRule ? 'Editar Regra' : 'Nova Regra de Automação'}
                </CardTitle>
                <CardDescription>
                  Configure as condições e ações da regra
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome da Regra *</Label>
                  <Input
                    id="name"
                    value={formData.name || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Auto-priorizar Tickets Críticos"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={formData.description || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descreva o que esta regra faz"
                    rows={2}
                  />
                </div>

                <div>
                  <Label htmlFor="trigger">Gatilho *</Label>
                  <Select 
                    value={formData.trigger} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, trigger: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o gatilho" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ticket_created">Ticket Criado</SelectItem>
                      <SelectItem value="status_changed">Status Alterado</SelectItem>
                      <SelectItem value="priority_changed">Prioridade Alterada</SelectItem>
                      <SelectItem value="keyword_detected">Palavra-chave Detectada</SelectItem>
                      <SelectItem value="time_based">Baseado em Tempo</SelectItem>
                      <SelectItem value="user_action">Ação do Usuário</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* Condições */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label>Condições *</Label>
                    <Button variant="outline" size="sm" onClick={addCondition}>
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Condição
                    </Button>
                  </div>
                  
                  {formData.conditions?.map((condition, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 mb-3">
                      <div className="col-span-4">
                        <Input
                          value={condition.field}
                          onChange={(e) => updateCondition(index, 'field', e.target.value)}
                          placeholder="Campo"
                        />
                      </div>
                      <div className="col-span-3">
                        <Select 
                          value={condition.operator} 
                          onValueChange={(value) => updateCondition(index, 'operator', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="equals">Igual a</SelectItem>
                            <SelectItem value="contains">Contém</SelectItem>
                            <SelectItem value="greater_than">Maior que</SelectItem>
                            <SelectItem value="less_than">Menor que</SelectItem>
                            <SelectItem value="regex">Regex</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-4">
                        <Input
                          value={condition.value}
                          onChange={(e) => updateCondition(index, 'value', e.target.value)}
                          placeholder="Valor"
                        />
                      </div>
                      <div className="col-span-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeCondition(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Ações */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label>Ações *</Label>
                    <Button variant="outline" size="sm" onClick={addAction}>
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Ação
                    </Button>
                  </div>
                  
                  {formData.actions?.map((action, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 mb-3">
                      <div className="col-span-5">
                        <Select 
                          value={action.type} 
                          onValueChange={(value) => updateAction(index, 'type', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="set_priority">Definir Prioridade</SelectItem>
                            <SelectItem value="set_category">Definir Categoria</SelectItem>
                            <SelectItem value="assign_agent">Atribuir Agente</SelectItem>
                            <SelectItem value="add_tag">Adicionar Tag</SelectItem>
                            <SelectItem value="send_notification">Enviar Notificação</SelectItem>
                            <SelectItem value="escalate">Escalar Ticket</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-6">
                        <Input
                          value={action.value}
                          onChange={(e) => updateAction(index, 'value', e.target.value)}
                          placeholder="Valor da ação"
                        />
                      </div>
                      <div className="col-span-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeAction(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    checked={formData.isActive || false}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                  />
                  <Label htmlFor="isActive">Regra ativa</Label>
                </div>

                <Separator />

                <div className="flex gap-2">
                  <Button onClick={handleSave} className="flex-1">
                    <Zap className="w-4 h-4 mr-2" />
                    {selectedRule ? 'Atualizar' : 'Criar'} Regra
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsEditing(false);
                      setSelectedRule(null);
                      setFormData({});
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Zap className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Selecione uma Regra</h3>
                <p className="text-muted-foreground mb-4">
                  Escolha uma regra da lista para editar ou crie uma nova
                </p>
                <Button onClick={handleNewRule}>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeira Regra
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
