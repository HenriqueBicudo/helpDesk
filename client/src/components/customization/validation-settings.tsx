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
import { Plus, Edit, Trash2, CheckSquare, AlertCircle, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ValidationRule {
  id: string;
  name: string;
  field: string;
  category: 'technical_support' | 'financial' | 'commercial' | 'other' | 'all';
  priority: 'low' | 'medium' | 'high' | 'critical' | 'all';
  validationType: 'required' | 'min_length' | 'max_length' | 'regex' | 'custom';
  value: string;
  errorMessage: string;
  isActive: boolean;
  order: number;
}

interface ValidationSettingsProps {
  onChanges: () => void;
}

export function ValidationSettings({ onChanges }: ValidationSettingsProps) {
  const [validationRules, setValidationRules] = useState<ValidationRule[]>([
    {
      id: '1',
      name: 'Assunto Obrigatório',
      field: 'subject',
      category: 'all',
      priority: 'all',
      validationType: 'required',
      value: '',
      errorMessage: 'O assunto é obrigatório',
      isActive: true,
      order: 1
    },
    {
      id: '2',
      name: 'Descrição Mínima',
      field: 'description',
      category: 'all',
      priority: 'all',
      validationType: 'min_length',
      value: '10',
      errorMessage: 'A descrição deve ter pelo menos 10 caracteres',
      isActive: true,
      order: 2
    },
    {
      id: '3',
      name: 'Número da Fatura Válido',
      field: 'invoice_number',
      category: 'financial',
      priority: 'all',
      validationType: 'regex',
      value: '^[0-9]{6,12}$',
      errorMessage: 'Número da fatura deve ter entre 6 e 12 dígitos',
      isActive: true,
      order: 3
    },
    {
      id: '4',
      name: 'Justificativa para Prioridade Crítica',
      field: 'justification',
      category: 'all',
      priority: 'critical',
      validationType: 'required',
      value: '',
      errorMessage: 'Justificativa é obrigatória para tickets críticos',
      isActive: true,
      order: 4
    },
    {
      id: '5',
      name: 'Detalhes Técnicos Obrigatórios',
      field: 'technical_details',
      category: 'technical_support',
      priority: 'high',
      validationType: 'min_length',
      value: '50',
      errorMessage: 'Forneça pelo menos 50 caracteres de detalhes técnicos',
      isActive: true,
      order: 5
    }
  ]);

  const [selectedRule, setSelectedRule] = useState<ValidationRule | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<ValidationRule>>({});
  const { toast } = useToast();

  const categoryLabels = {
    technical_support: 'Suporte Técnico',
    financial: 'Financeiro',
    commercial: 'Comercial',
    other: 'Outros',
    all: 'Todas as Categorias'
  };

  const priorityLabels = {
    low: 'Baixa',
    medium: 'Média',
    high: 'Alta',
    critical: 'Crítica',
    all: 'Todas as Prioridades'
  };

  const validationTypeLabels = {
    required: 'Campo Obrigatório',
    min_length: 'Comprimento Mínimo',
    max_length: 'Comprimento Máximo',
    regex: 'Expressão Regular',
    custom: 'Validação Customizada'
  };

  const priorityColors = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800',
    all: 'bg-gray-100 text-gray-800'
  };

  const handleEdit = (rule: ValidationRule) => {
    setSelectedRule(rule);
    setFormData(rule);
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.field || !formData.validationType || !formData.errorMessage) {
      toast({
        title: "❌ Campos Obrigatórios",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    // Validar valor baseado no tipo
    if ((formData.validationType === 'min_length' || formData.validationType === 'max_length') && 
        (!formData.value || isNaN(Number(formData.value)))) {
      toast({
        title: "❌ Valor Inválido",
        description: "Para validações de comprimento, o valor deve ser um número.",
        variant: "destructive"
      });
      return;
    }

    if (formData.validationType === 'regex' && !formData.value) {
      toast({
        title: "❌ Regex Obrigatório",
        description: "Para validações regex, o padrão é obrigatório.",
        variant: "destructive"
      });
      return;
    }

    if (selectedRule) {
      // Editar regra existente
      setValidationRules(prev => prev.map(r => 
        r.id === selectedRule.id 
          ? { ...formData, id: selectedRule.id, order: selectedRule.order } as ValidationRule
          : r
      ));
      toast({
        title: "✅ Regra Atualizada",
        description: `Regra "${formData.name}" foi atualizada com sucesso.`,
      });
    } else {
      // Criar nova regra
      const newRule: ValidationRule = {
        ...formData,
        id: Date.now().toString(),
        order: validationRules.length + 1,
        isActive: true
      } as ValidationRule;
      
      setValidationRules(prev => [...prev, newRule]);
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

  const handleDelete = (rule: ValidationRule) => {
    setValidationRules(prev => prev.filter(r => r.id !== rule.id));
    toast({
      title: "🗑️ Regra Removida",
      description: `Regra "${rule.name}" foi removida.`,
    });
    onChanges();
  };

  const handleToggleActive = (rule: ValidationRule) => {
    setValidationRules(prev => prev.map(r => 
      r.id === rule.id ? { ...r, isActive: !r.isActive } : r
    ));
    toast({
      title: rule.isActive ? "⏸️ Regra Desativada" : "✅ Regra Ativada",
      description: `Regra "${rule.name}" foi ${rule.isActive ? 'desativada' : 'ativada'}.`,
    });
    onChanges();
  };

  const handleNewRule = () => {
    setSelectedRule(null);
    setFormData({
      name: '',
      field: '',
      category: 'all',
      priority: 'all',
      validationType: 'required',
      value: '',
      errorMessage: '',
      isActive: true
    });
    setIsEditing(true);
  };

  const moveRule = (ruleId: string, direction: 'up' | 'down') => {
    setValidationRules(prev => {
      const rules = [...prev];
      const index = rules.findIndex(r => r.id === ruleId);
      
      if ((direction === 'up' && index > 0) || (direction === 'down' && index < rules.length - 1)) {
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        [rules[index], rules[targetIndex]] = [rules[targetIndex], rules[index]];
        
        // Atualizar ordem
        rules.forEach((rule, i) => {
          rule.order = i + 1;
        });
      }
      
      return rules;
    });
    onChanges();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">🔒 Configurações de Validação</h2>
          <p className="text-muted-foreground">
            Configure regras de validação para garantir a qualidade dos dados dos tickets
          </p>
        </div>
        <Button onClick={handleNewRule}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Regra
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <CheckSquare className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Regras</p>
                <p className="text-2xl font-bold">{validationRules.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <Shield className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Regras Ativas</p>
                <p className="text-2xl font-bold">{validationRules.filter(r => r.isActive).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                <AlertCircle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Críticas</p>
                <p className="text-2xl font-bold">{validationRules.filter(r => r.priority === 'critical').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lista de Regras */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Regras de Validação ({validationRules.length})</h3>
          
          <div className="space-y-3">
            {validationRules
              .sort((a, b) => a.order - b.order)
              .map((rule, index) => (
                <Card key={rule.id} className={`hover:shadow-md transition-shadow ${!rule.isActive ? 'opacity-60' : ''}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-muted-foreground">#{rule.order}</span>
                          <div className="flex flex-col gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => moveRule(rule.id, 'up')}
                              disabled={index === 0}
                            >
                              ↑
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => moveRule(rule.id, 'down')}
                              disabled={index === validationRules.length - 1}
                            >
                              ↓
                            </Button>
                          </div>
                        </div>
                        <div className={`p-2 rounded-lg ${rule.isActive ? 'bg-green-100 dark:bg-green-900' : 'bg-gray-100 dark:bg-gray-800'}`}>
                          {rule.isActive ? (
                            <CheckSquare className="w-4 h-4 text-green-600" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-gray-500" />
                          )}
                        </div>
                        <div>
                          <CardTitle className="text-base">{rule.name}</CardTitle>
                          <CardDescription className="text-sm mt-1">
                            Campo: <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">{rule.field}</code>
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(rule)}
                        >
                          {rule.isActive ? <CheckSquare className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
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
                        {validationTypeLabels[rule.validationType]}
                      </Badge>
                      <Badge variant="secondary">
                        {categoryLabels[rule.category]}
                      </Badge>
                      <Badge className={priorityColors[rule.priority]}>
                        {priorityLabels[rule.priority]}
                      </Badge>
                      {rule.isActive && (
                        <Badge variant="default">Ativa</Badge>
                      )}
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      <p><strong>Validação:</strong> {validationTypeLabels[rule.validationType]}</p>
                      {rule.value && (
                        <p><strong>Valor:</strong> <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">{rule.value}</code></p>
                      )}
                      <p><strong>Erro:</strong> {rule.errorMessage}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>

        {/* Editor de Regra */}
        <div>
          {isEditing ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  {selectedRule ? 'Editar Regra' : 'Nova Regra de Validação'}
                </CardTitle>
                <CardDescription>
                  Configure os detalhes da regra de validação
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome da Regra *</Label>
                  <Input
                    id="name"
                    value={formData.name || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Assunto Obrigatório"
                  />
                </div>

                <div>
                  <Label htmlFor="field">Campo a Validar *</Label>
                  <Input
                    id="field"
                    value={formData.field || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, field: e.target.value }))}
                    placeholder="Ex: subject, description, custom_field"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Nome do campo no formulário (use nome técnico para campos personalizados)
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">Categoria</Label>
                    <Select 
                      value={formData.category} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, category: value as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as Categorias</SelectItem>
                        <SelectItem value="technical_support">Suporte Técnico</SelectItem>
                        <SelectItem value="financial">Financeiro</SelectItem>
                        <SelectItem value="commercial">Comercial</SelectItem>
                        <SelectItem value="other">Outros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="priority">Prioridade</Label>
                    <Select 
                      value={formData.priority} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as Prioridades</SelectItem>
                        <SelectItem value="low">Baixa</SelectItem>
                        <SelectItem value="medium">Média</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                        <SelectItem value="critical">Crítica</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="validationType">Tipo de Validação *</Label>
                  <Select 
                    value={formData.validationType} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, validationType: value as any, value: '' }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="required">Campo Obrigatório</SelectItem>
                      <SelectItem value="min_length">Comprimento Mínimo</SelectItem>
                      <SelectItem value="max_length">Comprimento Máximo</SelectItem>
                      <SelectItem value="regex">Expressão Regular</SelectItem>
                      <SelectItem value="custom">Validação Customizada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(formData.validationType === 'min_length' || formData.validationType === 'max_length') && (
                  <div>
                    <Label htmlFor="value">Número de Caracteres *</Label>
                    <Input
                      id="value"
                      type="number"
                      value={formData.value || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                      placeholder="Ex: 10"
                    />
                  </div>
                )}

                {formData.validationType === 'regex' && (
                  <div>
                    <Label htmlFor="value">Padrão Regex *</Label>
                    <Input
                      id="value"
                      value={formData.value || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                      placeholder="Ex: ^[0-9]{6,12}$"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Use expressões regulares válidas em JavaScript
                    </p>
                  </div>
                )}

                {formData.validationType === 'custom' && (
                  <div>
                    <Label htmlFor="value">Código de Validação *</Label>
                    <Textarea
                      id="value"
                      value={formData.value || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                      placeholder="function validate(value, ticket) { return true; }"
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Função JavaScript que retorna true se válido
                    </p>
                  </div>
                )}

                <div>
                  <Label htmlFor="errorMessage">Mensagem de Erro *</Label>
                  <Textarea
                    id="errorMessage"
                    value={formData.errorMessage || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, errorMessage: e.target.value }))}
                    placeholder="Mensagem exibida quando a validação falhar"
                    rows={2}
                  />
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
                    <CheckSquare className="w-4 h-4 mr-2" />
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
                <CheckSquare className="w-16 h-16 mx-auto text-gray-400 mb-4" />
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
