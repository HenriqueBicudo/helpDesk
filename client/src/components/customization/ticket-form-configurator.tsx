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
import { Plus, Edit, Trash2, Settings, GripVertical, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FormField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'multiselect' | 'number' | 'date' | 'checkbox';
  placeholder?: string;
  options?: string[];
  required: boolean;
  visible: boolean;
  order: number;
  width: 'full' | 'half' | 'third';
  category?: 'all' | 'technical_support' | 'financial' | 'commercial' | 'other';
  defaultValue?: string;
  helpText?: string;
}

interface TicketFormConfiguratorProps {
  onChanges: () => void;
}

export function TicketFormConfigurator({ onChanges }: TicketFormConfiguratorProps) {
  const [formFields, setFormFields] = useState<FormField[]>([
    {
      id: '1',
      name: 'subject',
      label: 'Assunto',
      type: 'text',
      placeholder: 'Descreva o problema brevemente',
      required: true,
      visible: true,
      order: 1,
      width: 'full',
      category: 'all'
    },
    {
      id: '2',
      name: 'description',
      label: 'Descrição',
      type: 'textarea',
      placeholder: 'Detalhe o problema ou solicitação',
      required: true,
      visible: true,
      order: 2,
      width: 'full',
      category: 'all'
    },
    {
      id: '3',
      name: 'category',
      label: 'Categoria',
      type: 'select',
      options: ['Suporte Técnico', 'Financeiro', 'Comercial', 'Outros'],
      required: true,
      visible: true,
      order: 3,
      width: 'half',
      category: 'all'
    },
    {
      id: '4',
      name: 'priority',
      label: 'Urgência',
      type: 'select',
      options: ['Baixa', 'Média', 'Alta', 'Crítica'],
      required: true,
      visible: true,
      order: 4,
      width: 'half',
      category: 'all',
      defaultValue: 'Média'
    },
    {
      id: '5',
      name: 'contract',
      label: 'Contrato',
      type: 'select',
      options: ['Básico - 10h/mês', 'Padrão - 20h/mês', 'Premium - 50h/mês', 'Enterprise - Ilimitado'],
      required: false,
      visible: true,
      order: 5,
      width: 'half',
      category: 'all',
      helpText: 'Contrato que será debitado as horas'
    },
    {
      id: '6',
      name: 'affected_users',
      label: 'Usuários Afetados',
      type: 'number',
      placeholder: 'Quantidade de usuários impactados',
      required: false,
      visible: true,
      order: 6,
      width: 'half',
      category: 'technical_support'
    },
    {
      id: '7',
      name: 'invoice_number',
      label: 'Número da Fatura',
      type: 'text',
      placeholder: 'Ex: 123456789',
      required: false,
      visible: true,
      order: 7,
      width: 'half',
      category: 'financial'
    },
    {
      id: '8',
      name: 'due_date',
      label: 'Data de Vencimento',
      type: 'date',
      required: false,
      visible: true,
      order: 8,
      width: 'half',
      category: 'commercial'
    }
  ]);

  const [selectedField, setSelectedField] = useState<FormField | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<FormField>>({});
  const [previewMode, setPreviewMode] = useState(false);
  const { toast } = useToast();

  const fieldTypeLabels = {
    text: 'Texto',
    textarea: 'Texto Longo',
    select: 'Lista Suspensa',
    multiselect: 'Seleção Múltipla',
    number: 'Número',
    date: 'Data',
    checkbox: 'Checkbox'
  };

  const widthLabels = {
    full: 'Largura Total',
    half: 'Meia Largura',
    third: 'Um Terço'
  };

  const categoryLabels = {
    all: 'Todas as Categorias',
    technical_support: 'Suporte Técnico',
    financial: 'Financeiro',
    commercial: 'Comercial',
    other: 'Outros'
  };

  const handleEdit = (field: FormField) => {
    setSelectedField(field);
    setFormData({
      ...field,
      options: field.options ? [...field.options] : []
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.label || !formData.type) {
      toast({
        title: "❌ Campos Obrigatórios",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    if (selectedField) {
      setFormFields(prev => prev.map(f => 
        f.id === selectedField.id 
          ? { ...formData, id: selectedField.id, order: selectedField.order } as FormField
          : f
      ));
      toast({
        title: "✅ Campo Atualizado",
        description: `Campo "${formData.label}" foi atualizado.`,
      });
    } else {
      const newField: FormField = {
        ...formData,
        id: Date.now().toString(),
        order: formFields.length + 1,
        visible: true
      } as FormField;
      
      setFormFields(prev => [...prev, newField]);
      toast({
        title: "✅ Campo Criado",
        description: `Campo "${formData.label}" foi criado.`,
      });
    }

    setIsEditing(false);
    setSelectedField(null);
    setFormData({});
    onChanges();
  };

  const handleDelete = (field: FormField) => {
    setFormFields(prev => prev.filter(f => f.id !== field.id));
    toast({
      title: "🗑️ Campo Removido",
      description: `Campo "${field.label}" foi removido.`,
    });
    onChanges();
  };

  const handleToggleVisible = (field: FormField) => {
    setFormFields(prev => prev.map(f => 
      f.id === field.id ? { ...f, visible: !f.visible } : f
    ));
    onChanges();
  };

  const moveField = (fieldId: string, direction: 'up' | 'down') => {
    setFormFields(prev => {
      const fields = [...prev].sort((a, b) => a.order - b.order);
      const index = fields.findIndex(f => f.id === fieldId);
      
      if ((direction === 'up' && index > 0) || (direction === 'down' && index < fields.length - 1)) {
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        [fields[index], fields[targetIndex]] = [fields[targetIndex], fields[index]];
        
        fields.forEach((field, i) => {
          field.order = i + 1;
        });
      }
      
      return fields;
    });
    onChanges();
  };

  const handleNewField = () => {
    setSelectedField(null);
    setFormData({
      name: '',
      label: '',
      type: 'text',
      required: false,
      visible: true,
      width: 'full',
      category: 'all'
    });
    setIsEditing(true);
  };

  const handleAddOption = () => {
    setFormData(prev => ({
      ...prev,
      options: [...(prev.options || []), '']
    }));
  };

  const handleUpdateOption = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options?.map((opt, i) => i === index ? value : opt)
    }));
  };

  const handleRemoveOption = (index: number) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options?.filter((_, i) => i !== index)
    }));
  };

  const visibleFields = formFields
    .filter(f => f.visible)
    .sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">📝 Configurar Formulário de Tickets</h2>
          <p className="text-muted-foreground">
            Personalize os campos que aparecem no formulário de criação/edição de tickets
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => setPreviewMode(!previewMode)}
          >
            {previewMode ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
            {previewMode ? 'Editar' : 'Visualizar'}
          </Button>
          <Button onClick={handleNewField}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Campo
          </Button>
        </div>
      </div>

      {previewMode ? (
        /* Preview do Formulário */
        <Card>
          <CardHeader>
            <CardTitle>📋 Preview do Formulário</CardTitle>
            <CardDescription>
              Assim ficará o formulário para os usuários
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-12 gap-4">
              {visibleFields.map((field) => {
                const colSpan = field.width === 'full' ? 12 : field.width === 'half' ? 6 : 4;
                
                return (
                  <div key={field.id} className={`col-span-${colSpan}`}>
                    <Label htmlFor={field.name}>
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    
                    {field.type === 'text' && (
                      <Input
                        id={field.name}
                        placeholder={field.placeholder}
                        defaultValue={field.defaultValue}
                        disabled
                      />
                    )}
                    
                    {field.type === 'textarea' && (
                      <Textarea
                        id={field.name}
                        placeholder={field.placeholder}
                        defaultValue={field.defaultValue}
                        disabled
                        rows={3}
                      />
                    )}
                    
                    {field.type === 'select' && (
                      <Select disabled>
                        <SelectTrigger>
                          <SelectValue placeholder={field.placeholder || `Selecione ${field.label.toLowerCase()}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {field.options?.map((option, index) => (
                            <SelectItem key={index} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    
                    {field.type === 'number' && (
                      <Input
                        id={field.name}
                        type="number"
                        placeholder={field.placeholder}
                        defaultValue={field.defaultValue}
                        disabled
                      />
                    )}
                    
                    {field.type === 'date' && (
                      <Input
                        id={field.name}
                        type="date"
                        defaultValue={field.defaultValue}
                        disabled
                      />
                    )}
                    
                    {field.helpText && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {field.helpText}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Lista de Campos */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Campos do Formulário ({formFields.length})</h3>
            
            <div className="space-y-3">
              {formFields
                .sort((a, b) => a.order - b.order)
                .map((field, index) => (
                  <Card key={field.id} className={`hover:shadow-md transition-shadow ${!field.visible ? 'opacity-60' : ''}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="flex flex-col gap-1 pt-1">
                            <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />
                            <div className="flex flex-col gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => moveField(field.id, 'up')}
                                disabled={index === 0}
                              >
                                ↑
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => moveField(field.id, 'down')}
                                disabled={index === formFields.length - 1}
                              >
                                ↓
                              </Button>
                            </div>
                          </div>
                          <div>
                            <CardTitle className="text-base flex items-center gap-2">
                              {field.label}
                              {field.required && <Badge variant="destructive" className="text-xs">Obrigatório</Badge>}
                            </CardTitle>
                            <CardDescription className="text-sm mt-1">
                              <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">
                                {field.name}
                              </code> • {fieldTypeLabels[field.type]}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleVisible(field)}
                          >
                            {field.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(field)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(field)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">
                          {widthLabels[field.width]}
                        </Badge>
                        <Badge variant="secondary">
                          {categoryLabels[field.category || 'all']}
                        </Badge>
                        {field.visible && (
                          <Badge variant="default">Visível</Badge>
                        )}
                      </div>
                      
                      {field.placeholder && (
                        <p className="text-sm text-muted-foreground">
                          <strong>Placeholder:</strong> {field.placeholder}
                        </p>
                      )}
                      
                      {field.options && field.options.length > 0 && (
                        <div className="text-sm mt-2">
                          <p className="font-medium mb-1">Opções:</p>
                          <div className="flex flex-wrap gap-1">
                            {field.options.slice(0, 3).map((option, index) => (
                              <code key={index} className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                                {option}
                              </code>
                            ))}
                            {field.options.length > 3 && (
                              <span className="text-xs text-muted-foreground">
                                +{field.options.length - 3} mais
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>

          {/* Editor de Campo */}
          <div>
            {isEditing ? (
              <Card>
                <CardHeader>
                  <CardTitle>
                    {selectedField ? 'Editar Campo' : 'Novo Campo'}
                  </CardTitle>
                  <CardDescription>
                    Configure os detalhes do campo do formulário
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="label">Rótulo do Campo *</Label>
                    <Input
                      id="label"
                      value={formData.label || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                      placeholder="Ex: Urgência"
                    />
                  </div>

                  <div>
                    <Label htmlFor="name">Nome Técnico *</Label>
                    <Input
                      id="name"
                      value={formData.name || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') }))}
                      placeholder="Ex: priority"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Nome usado na API (apenas letras, números e _)
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="type">Tipo de Campo *</Label>
                      <Select 
                        value={formData.type} 
                        onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as any, options: value === 'select' || value === 'multiselect' ? [''] : undefined }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Texto</SelectItem>
                          <SelectItem value="textarea">Texto Longo</SelectItem>
                          <SelectItem value="select">Lista Suspensa</SelectItem>
                          <SelectItem value="multiselect">Seleção Múltipla</SelectItem>
                          <SelectItem value="number">Número</SelectItem>
                          <SelectItem value="date">Data</SelectItem>
                          <SelectItem value="checkbox">Checkbox</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="width">Largura</Label>
                      <Select 
                        value={formData.width} 
                        onValueChange={(value) => setFormData(prev => ({ ...prev, width: value as any }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="full">Largura Total</SelectItem>
                          <SelectItem value="half">Meia Largura</SelectItem>
                          <SelectItem value="third">Um Terço</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="category">Categoria de Exibição</Label>
                    <Select 
                      value={formData.category} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, category: value as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as Categorias</SelectItem>
                        <SelectItem value="technical_support">Suporte Técnico</SelectItem>
                        <SelectItem value="financial">Financeiro</SelectItem>
                        <SelectItem value="commercial">Comercial</SelectItem>
                        <SelectItem value="other">Outros</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Campo aparece apenas para tickets desta categoria
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="placeholder">Placeholder</Label>
                    <Input
                      id="placeholder"
                      value={formData.placeholder || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, placeholder: e.target.value }))}
                      placeholder="Texto de exemplo no campo"
                    />
                  </div>

                  {(formData.type === 'select' || formData.type === 'multiselect') && (
                    <div>
                      <Label>Opções</Label>
                      <div className="space-y-2 mt-2">
                        {formData.options?.map((option, index) => (
                          <div key={index} className="flex gap-2">
                            <Input
                              value={option}
                              onChange={(e) => handleUpdateOption(index, e.target.value)}
                              placeholder="Digite uma opção"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveOption(index)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleAddOption}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Adicionar Opção
                        </Button>
                      </div>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="defaultValue">Valor Padrão</Label>
                    <Input
                      id="defaultValue"
                      value={formData.defaultValue || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, defaultValue: e.target.value }))}
                      placeholder="Valor inicial do campo"
                    />
                  </div>

                  <div>
                    <Label htmlFor="helpText">Texto de Ajuda</Label>
                    <Textarea
                      id="helpText"
                      value={formData.helpText || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, helpText: e.target.value }))}
                      placeholder="Texto explicativo para o usuário"
                      rows={2}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="required"
                      checked={formData.required || false}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, required: checked }))}
                    />
                    <Label htmlFor="required">Campo obrigatório</Label>
                  </div>

                  <Separator />

                  <div className="flex gap-2">
                    <Button onClick={handleSave} className="flex-1">
                      <Settings className="w-4 h-4 mr-2" />
                      {selectedField ? 'Atualizar' : 'Criar'} Campo
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setIsEditing(false);
                        setSelectedField(null);
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
                  <Settings className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Configure os Campos</h3>
                  <p className="text-muted-foreground mb-4">
                    Selecione um campo para editar ou crie um novo
                  </p>
                  <Button onClick={handleNewField}>
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Campo
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
