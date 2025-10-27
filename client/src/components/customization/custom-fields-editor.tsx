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
import { Plus, Edit, Trash2, Settings, Type, Hash, Calendar, CheckSquare, List } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CustomField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'boolean' | 'textarea';
  category: 'technical_support' | 'financial' | 'commercial' | 'other' | 'all';
  required: boolean;
  defaultValue?: string;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
  helpText?: string;
  isActive: boolean;
}

interface CustomFieldsEditorProps {
  onChanges: () => void;
}

export function CustomFieldsEditor({ onChanges }: CustomFieldsEditorProps) {
  const [customFields, setCustomFields] = useState<CustomField[]>([
    {
      id: '1',
      name: 'severity',
      label: 'Severidade do Problema',
      type: 'select',
      category: 'technical_support',
      required: true,
      options: ['Baixa', 'Média', 'Alta', 'Crítica'],
      helpText: 'Indique o nível de impacto do problema',
      isActive: true
    },
    {
      id: '2',
      name: 'affected_users',
      label: 'Usuários Afetados',
      type: 'number',
      category: 'technical_support',
      required: false,
      validation: { min: 0, max: 10000 },
      helpText: 'Quantidade aproximada de usuários impactados',
      isActive: true
    },
    {
      id: '3',
      name: 'invoice_number',
      label: 'Número da Fatura',
      type: 'text',
      category: 'financial',
      required: true,
      validation: { pattern: '^[0-9]{6,12}$' },
      helpText: 'Número da fatura relacionada ao problema',
      isActive: true
    }
  ]);

  const [selectedField, setSelectedField] = useState<CustomField | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<CustomField>>({});
  const { toast } = useToast();

  const fieldTypeLabels = {
    text: 'Texto',
    number: 'Número',
    date: 'Data',
    select: 'Seleção Única',
    multiselect: 'Seleção Múltipla',
    boolean: 'Sim/Não',
    textarea: 'Texto Longo'
  };

  const fieldTypeIcons = {
    text: Type,
    number: Hash,
    date: Calendar,
    select: List,
    multiselect: List,
    boolean: CheckSquare,
    textarea: Type
  };

  const categoryLabels = {
    technical_support: 'Suporte Técnico',
    financial: 'Financeiro',
    commercial: 'Comercial',
    other: 'Outros',
    all: 'Todas as Categorias'
  };

  const handleEdit = (field: CustomField) => {
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

    // Validar nome do campo (apenas letras, números e underscore)
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(formData.name || '')) {
      toast({
        title: "❌ Nome Inválido",
        description: "O nome do campo deve conter apenas letras, números e underscore.",
        variant: "destructive"
      });
      return;
    }

    if (selectedField) {
      // Editar campo existente
      setCustomFields(prev => prev.map(f => 
        f.id === selectedField.id 
          ? { ...formData, id: selectedField.id } as CustomField
          : f
      ));
      toast({
        title: "✅ Campo Atualizado",
        description: `Campo "${formData.label}" foi atualizado com sucesso.`,
      });
    } else {
      // Verificar se já existe um campo com o mesmo nome
      if (customFields.some(f => f.name === formData.name)) {
        toast({
          title: "❌ Nome Duplicado",
          description: "Já existe um campo com este nome.",
          variant: "destructive"
        });
        return;
      }

      // Criar novo campo
      const newField: CustomField = {
        ...formData,
        id: Date.now().toString(),
        isActive: true
      } as CustomField;
      
      setCustomFields(prev => [...prev, newField]);
      toast({
        title: "✅ Campo Criado",
        description: `Campo "${formData.label}" foi criado com sucesso.`,
      });
    }

    setIsEditing(false);
    setSelectedField(null);
    setFormData({});
    onChanges();
  };

  const handleDelete = (field: CustomField) => {
    setCustomFields(prev => prev.filter(f => f.id !== field.id));
    toast({
      title: "🗑️ Campo Removido",
      description: `Campo "${field.label}" foi removido.`,
    });
    onChanges();
  };

  const handleNewField = () => {
    setSelectedField(null);
    setFormData({
      name: '',
      label: '',
      type: 'text',
      category: 'all',
      required: false,
      isActive: true
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">⚙️ Editor de Campos Personalizados</h2>
          <p className="text-muted-foreground">
            Crie campos adicionais para capturar informações específicas por categoria
          </p>
        </div>
        <Button onClick={handleNewField}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Campo
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lista de Campos */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Campos Personalizados ({customFields.length})</h3>
          
          {customFields.map((field) => {
            const IconComponent = fieldTypeIcons[field.type];
            return (
              <Card key={field.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{field.label}</CardTitle>
                        <CardDescription className="text-sm mt-1">
                          <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">
                            {field.name}
                          </code>
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
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
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline">
                      {fieldTypeLabels[field.type]}
                    </Badge>
                    <Badge variant="secondary">
                      {categoryLabels[field.category]}
                    </Badge>
                    {field.required && (
                      <Badge variant="destructive">Obrigatório</Badge>
                    )}
                    {field.isActive && (
                      <Badge variant="default">Ativo</Badge>
                    )}
                  </div>
                  
                  {field.helpText && (
                    <p className="text-sm text-muted-foreground mb-2">
                      {field.helpText}
                    </p>
                  )}

                  {field.options && field.options.length > 0 && (
                    <div className="text-sm">
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
            );
          })}
        </div>

        {/* Editor de Campo */}
        <div>
          {isEditing ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  {selectedField ? 'Editar Campo' : 'Novo Campo Personalizado'}
                </CardTitle>
                <CardDescription>
                  Configure os detalhes do campo personalizado
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="label">Rótulo do Campo *</Label>
                  <Input
                    id="label"
                    value={formData.label || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                    placeholder="Ex: Severidade do Problema"
                  />
                </div>

                <div>
                  <Label htmlFor="name">Nome Técnico *</Label>
                  <Input
                    id="name"
                    value={formData.name || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') }))}
                    placeholder="Ex: severity_level"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Usado na API e banco de dados (apenas letras, números e _)
                  </p>
                </div>

                <div>
                  <Label htmlFor="type">Tipo de Campo *</Label>
                  <Select 
                    value={formData.type} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as any, options: value === 'select' || value === 'multiselect' ? [''] : undefined }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Texto</SelectItem>
                      <SelectItem value="textarea">Texto Longo</SelectItem>
                      <SelectItem value="number">Número</SelectItem>
                      <SelectItem value="date">Data</SelectItem>
                      <SelectItem value="select">Seleção Única</SelectItem>
                      <SelectItem value="multiselect">Seleção Múltipla</SelectItem>
                      <SelectItem value="boolean">Sim/Não</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="category">Categoria de Aplicação *</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, category: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a categoria" />
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

                <div className="flex items-center space-x-2">
                  <Switch
                    id="required"
                    checked={formData.required || false}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, required: checked }))}
                  />
                  <Label htmlFor="required">Campo obrigatório</Label>
                </div>

                {(formData.type === 'select' || formData.type === 'multiselect') && (
                  <div>
                    <Label>Opções de Seleção</Label>
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

                {formData.type === 'number' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="min">Valor Mínimo</Label>
                      <Input
                        id="min"
                        type="number"
                        value={formData.validation?.min || ''}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          validation: { 
                            ...prev.validation, 
                            min: e.target.value ? parseInt(e.target.value) : undefined 
                          } 
                        }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="max">Valor Máximo</Label>
                      <Input
                        id="max"
                        type="number"
                        value={formData.validation?.max || ''}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          validation: { 
                            ...prev.validation, 
                            max: e.target.value ? parseInt(e.target.value) : undefined 
                          } 
                        }))}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="helpText">Texto de Ajuda</Label>
                  <Textarea
                    id="helpText"
                    value={formData.helpText || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, helpText: e.target.value }))}
                    placeholder="Texto explicativo para ajudar o usuário"
                    rows={2}
                  />
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
                <h3 className="text-lg font-semibold mb-2">Selecione um Campo</h3>
                <p className="text-muted-foreground mb-4">
                  Escolha um campo da lista para editar ou crie um novo
                </p>
                <Button onClick={handleNewField}>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeiro Campo
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
