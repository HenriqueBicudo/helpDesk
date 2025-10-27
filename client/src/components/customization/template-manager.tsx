import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, Edit, Trash2, Copy, FileText, Settings, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Template {
  id: string;
  name: string;
  subject: string;
  description: string;
  category: 'technical_support' | 'financial' | 'commercial' | 'other';
  priority: 'low' | 'medium' | 'high' | 'critical';
  variables: string[];
  isActive: boolean;
  metadata: Record<string, any>;
}

interface TemplateManagerProps {
  onChanges: () => void;
}

export function TemplateManager({ onChanges }: TemplateManagerProps) {
  const [templates, setTemplates] = useState<Template[]>([
    {
      id: '1',
      name: 'Incidente de Sistema',
      subject: '[INCIDENTE] {{system}} - {{brief_description}}',
      description: `**Sistema Afetado:** {{system}}
**Horário do Incidente:** {{timestamp}}
**Usuários Impactados:** {{user_count}}
**Severidade:** {{severity}}
**Descrição:** {{description}}
**Passos para Reproduzir:** {{steps}}`,
      category: 'technical_support',
      priority: 'critical',
      variables: ['system', 'brief_description', 'timestamp', 'user_count', 'severity', 'description', 'steps'],
      isActive: true,
      metadata: { type: 'incident' }
    },
    {
      id: '2',
      name: 'Solicitação Comercial',
      subject: '[COMERCIAL] {{request_type}} - {{client_name}}',
      description: `**Cliente:** {{client_name}}
**Tipo de Solicitação:** {{request_type}}
**Plano Atual:** {{current_plan}}
**Solicitação:** {{request_details}}
**Urgência:** {{urgency}}`,
      category: 'commercial',
      priority: 'low',
      variables: ['request_type', 'client_name', 'current_plan', 'request_details', 'urgency'],
      isActive: true,
      metadata: { type: 'commercial_request' }
    }
  ]);

  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Template>>({});
  const { toast } = useToast();

  const categoryLabels = {
    technical_support: 'Suporte Técnico',
    financial: 'Financeiro',
    commercial: 'Comercial',
    other: 'Outros'
  };

  const priorityLabels = {
    low: 'Baixa',
    medium: 'Média',
    high: 'Alta',
    critical: 'Crítica'
  };

  const priorityColors = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800'
  };

  const handleEdit = (template: Template) => {
    setSelectedTemplate(template);
    setFormData(template);
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.subject || !formData.description) {
      toast({
        title: "❌ Campos Obrigatórios",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    const variables = extractVariables(formData.subject + ' ' + formData.description);
    
    if (selectedTemplate) {
      // Editar template existente
      setTemplates(prev => prev.map(t => 
        t.id === selectedTemplate.id 
          ? { ...formData, id: selectedTemplate.id, variables } as Template
          : t
      ));
      toast({
        title: "✅ Template Atualizado",
        description: `Template "${formData.name}" foi atualizado com sucesso.`,
      });
    } else {
      // Criar novo template
      const newTemplate: Template = {
        ...formData,
        id: Date.now().toString(),
        variables,
        isActive: true
      } as Template;
      
      setTemplates(prev => [...prev, newTemplate]);
      toast({
        title: "✅ Template Criado",
        description: `Template "${formData.name}" foi criado com sucesso.`,
      });
    }

    setIsEditing(false);
    setSelectedTemplate(null);
    setFormData({});
    onChanges();
  };

  const handleDelete = (template: Template) => {
    setTemplates(prev => prev.filter(t => t.id !== template.id));
    toast({
      title: "🗑️ Template Removido",
      description: `Template "${template.name}" foi removido.`,
    });
    onChanges();
  };

  const handleDuplicate = (template: Template) => {
    const duplicated: Template = {
      ...template,
      id: Date.now().toString(),
      name: `${template.name} (Cópia)`
    };
    setTemplates(prev => [...prev, duplicated]);
    toast({
      title: "📋 Template Duplicado",
      description: `Template "${duplicated.name}" foi criado.`,
    });
    onChanges();
  };

  const extractVariables = (text: string): string[] => {
    const matches = text.match(/{{(\w+)}}/g);
    return matches ? [...new Set(matches.map(m => m.slice(2, -2)))] : [];
  };

  const handleNewTemplate = () => {
    setSelectedTemplate(null);
    setFormData({
      name: '',
      subject: '',
      description: '',
      category: 'technical_support',
      priority: 'medium',
      metadata: {}
    });
    setIsEditing(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">📝 Gerenciador de Templates</h2>
          <p className="text-muted-foreground">
            Crie e gerencie templates pré-configurados para diferentes tipos de tickets
          </p>
        </div>
        <Button onClick={handleNewTemplate}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Template
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lista de Templates */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Templates Disponíveis ({templates.length})</h3>
          
          {templates.map((template) => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{template.name}</CardTitle>
                    <CardDescription className="text-sm mt-1">
                      {template.subject}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(template)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDuplicate(template)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(template)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="outline">
                    {categoryLabels[template.category]}
                  </Badge>
                  <Badge className={priorityColors[template.priority]}>
                    {priorityLabels[template.priority]}
                  </Badge>
                  {template.isActive && (
                    <Badge variant="default">Ativo</Badge>
                  )}
                </div>
                
                <div className="text-sm text-muted-foreground">
                  <p><strong>Variáveis:</strong> {template.variables.length}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {template.variables.slice(0, 4).map((variable) => (
                      <code key={variable} className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                        {`{{${variable}}}`}
                      </code>
                    ))}
                    {template.variables.length > 4 && (
                      <span className="text-xs text-muted-foreground">
                        +{template.variables.length - 4} mais
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Editor de Template */}
        <div>
          {isEditing ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  {selectedTemplate ? 'Editar Template' : 'Novo Template'}
                </CardTitle>
                <CardDescription>
                  Configure os detalhes do template
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome do Template *</Label>
                  <Input
                    id="name"
                    value={formData.name || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Incidente de Sistema"
                  />
                </div>

                <div>
                  <Label htmlFor="category">Categoria *</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, category: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technical_support">Suporte Técnico</SelectItem>
                      <SelectItem value="financial">Financeiro</SelectItem>
                      <SelectItem value="commercial">Comercial</SelectItem>
                      <SelectItem value="other">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="priority">Prioridade Padrão *</Label>
                  <Select 
                    value={formData.priority} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma prioridade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="medium">Média</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="critical">Crítica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="subject">Assunto do Ticket *</Label>
                  <Input
                    id="subject"
                    value={formData.subject || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="Ex: [INCIDENTE] {{system}} - {{brief_description}}"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Use {{variavel}} para campos dinâmicos
                  </p>
                </div>

                <div>
                  <Label htmlFor="description">Descrição do Ticket *</Label>
                  <Textarea
                    id="description"
                    value={formData.description || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descreva o template usando {{variaveis}} para campos dinâmicos"
                    rows={8}
                  />
                </div>

                {formData.subject || formData.description ? (
                  <div>
                    <Label>Variáveis Detectadas:</Label>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {extractVariables((formData.subject || '') + ' ' + (formData.description || '')).map((variable) => (
                        <code key={variable} className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs">
                          {`{{${variable}}}`}
                        </code>
                      ))}
                    </div>
                  </div>
                ) : null}

                <Separator />

                <div className="flex gap-2">
                  <Button onClick={handleSave} className="flex-1">
                    <FileText className="w-4 h-4 mr-2" />
                    {selectedTemplate ? 'Atualizar' : 'Criar'} Template
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsEditing(false);
                      setSelectedTemplate(null);
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
                <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Selecione um Template</h3>
                <p className="text-muted-foreground mb-4">
                  Escolha um template da lista para editar ou crie um novo
                </p>
                <Button onClick={handleNewTemplate}>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeiro Template
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
