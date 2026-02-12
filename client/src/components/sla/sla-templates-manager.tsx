import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { 
  Settings,
  Plus,
  Edit3,
  Trash2,
  Clock,
  CheckCircle,
  AlertTriangle,
  Target,
  RefreshCw,
  Copy,
  Eye,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { 
  useSlaV2SaveTemplate as useSlaSaveTemplate,
  useSlaV2DeleteTemplate as useSlaDeleteTemplate,
  formatSlaTime,
  type SlaTemplate,
  type SlaTemplateRule
} from '@/hooks/use-sla-v2';
import { useQuery } from '@tanstack/react-query';

interface SlaTemplatesManagerProps {
  className?: string;
  onTemplateSelect?: (template: SlaTemplate) => void;
  showActions?: boolean;
  viewMode?: 'grid' | 'list';
}

export function SlaTemplatesManager({ 
  className,
  onTemplateSelect,
  showActions = true,
  viewMode = 'grid'
}: SlaTemplatesManagerProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SlaTemplate | null>(null);
  const [previewingTemplate, setPreviewingTemplate] = useState<SlaTemplate | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<number | null>(null);

  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    type: 'support' as 'support' | 'maintenance' | 'development' | 'consulting' | 'other',
    rules: [
      { priority: 'critical' as const, responseTimeMinutes: 30, solutionTimeMinutes: 240 },
      { priority: 'high' as const, responseTimeMinutes: 120, solutionTimeMinutes: 480 },
      { priority: 'medium' as const, responseTimeMinutes: 240, solutionTimeMinutes: 1440 },
      { priority: 'low' as const, responseTimeMinutes: 480, solutionTimeMinutes: 2880 }
    ] as SlaTemplateRule[]
  });

  // Hook para usar a rota de templates SLA V2 consistentemente
  const { data: templatesResponse, isLoading, refetch } = useQuery<{ data: SlaTemplate[] }>({
    queryKey: ['sla-v2', 'templates'],
    queryFn: async () => {
      const response = await fetch('/api/sla/v2/templates', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error(`Erro ao carregar templates: ${response.status}`);
      }
      return response.json();
    }
  });
  const saveTemplateMutation = useSlaSaveTemplate();
  const deleteTemplateMutation = useSlaDeleteTemplate();

  const templates = templatesResponse?.data || [];
  const activeTemplates = templates.filter(t => t.isActive);
  const inactiveTemplates = templates.filter(t => !t.isActive);

  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setTemplateForm({
      name: '',
      description: '',
      type: 'support',
      rules: [
        { priority: 'critical', responseTimeMinutes: 30, solutionTimeMinutes: 240 },
        { priority: 'high', responseTimeMinutes: 120, solutionTimeMinutes: 480 },
        { priority: 'medium', responseTimeMinutes: 240, solutionTimeMinutes: 1440 },
        { priority: 'low', responseTimeMinutes: 480, solutionTimeMinutes: 2880 }
      ]
    });
    setShowCreateDialog(true);
  };

  const handleEditTemplate = (template: SlaTemplate) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      description: template.description || '',
      type: template.type,
      rules: Array.isArray(template.rules) ? template.rules : [
        { priority: 'critical' as const, responseTimeMinutes: 30, solutionTimeMinutes: 240 },
        { priority: 'high' as const, responseTimeMinutes: 120, solutionTimeMinutes: 480 },
        { priority: 'medium' as const, responseTimeMinutes: 240, solutionTimeMinutes: 1440 },
        { priority: 'low' as const, responseTimeMinutes: 480, solutionTimeMinutes: 2880 }
      ]
    });
    setShowEditDialog(true);
  };

  const handleCloneTemplate = (template: SlaTemplate) => {
    setEditingTemplate(null);
    setTemplateForm({
      name: `${template.name} (Cópia)`,
      description: template.description || '',
      type: template.type,
      rules: Array.isArray(template.rules) ? template.rules : [
        { priority: 'critical' as const, responseTimeMinutes: 30, solutionTimeMinutes: 240 },
        { priority: 'high' as const, responseTimeMinutes: 120, solutionTimeMinutes: 480 },
        { priority: 'medium' as const, responseTimeMinutes: 240, solutionTimeMinutes: 1440 },
        { priority: 'low' as const, responseTimeMinutes: 480, solutionTimeMinutes: 2880 }
      ]
    });
    setShowCreateDialog(true);
  };

  const handlePreviewTemplate = (template: SlaTemplate) => {
    setPreviewingTemplate(template);
    setShowPreviewDialog(true);
  };

  const handleSaveTemplate = async () => {
    try {
      await saveTemplateMutation.mutateAsync({
        ...(editingTemplate ? { id: editingTemplate.id } : {}),
        ...templateForm,
        isActive: true
      });
      
      setShowCreateDialog(false);
      setShowEditDialog(false);
      setEditingTemplate(null);
      
      toast({
        title: editingTemplate ? "✅ Template Atualizado" : "✅ Template Criado",
        description: `Template "${templateForm.name}" foi ${editingTemplate ? 'atualizado' : 'criado'} com sucesso.`,
      });
    } catch (error: any) {
      console.error('Erro ao salvar template:', error);
      toast({
        title: "❌ Erro ao Salvar",
        description: "Não foi possível salvar o template. Verifique os dados e tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTemplate = (templateId: number) => {
    setTemplateToDelete(templateId);
    setShowDeleteDialog(true);
  };

  const confirmDeleteTemplate = async () => {
    if (!templateToDelete) return;

    try {
      await deleteTemplateMutation.mutateAsync(templateToDelete);
      setShowDeleteDialog(false);
      setTemplateToDelete(null);
      
      toast({
        title: "✅ Template Deletado",
        description: "Template SLA foi removido com sucesso.",
      });
    } catch (error: any) {
      console.error('Erro ao deletar template:', error);
      toast({
        title: "❌ Erro ao Deletar",
        description: "Não foi possível deletar o template. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const getTemplateTypeLabel = (type: string) => {
    const labels = {
      support: 'Suporte',
      maintenance: 'Manutenção',
      development: 'Desenvolvimento',
      consulting: 'Consultoria',
      other: 'Outro'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getTemplateTypeBadge = (type: string) => {
    const variants = {
      support: 'default',
      maintenance: 'secondary',
      development: 'outline',
      consulting: 'destructive',
      other: 'secondary'
    };
    return variants[type as keyof typeof variants] || 'secondary';
  };

  const getPriorityBadgeVariant = (priority: string) => {
    const variants = {
      critical: 'destructive',
      high: 'default',
      medium: 'secondary',
      low: 'outline'
    };
    return variants[priority as keyof typeof variants] || 'outline';
  };

  const getPriorityLabel = (priority: string) => {
    const labels = {
      critical: 'Crítica',
      high: 'Alta',
      medium: 'Média',
      low: 'Baixa'
    };
    return labels[priority as keyof typeof labels] || priority;
  };

  const getMainTimes = (template: SlaTemplate) => {
    if (!template.rules || template.rules.length === 0) {
      return {
        responseTime: formatSlaTime(0),
        solutionTime: formatSlaTime(0)
      };
    }
    
    const criticalRule = template.rules.find(r => r.priority === 'critical');
    const highRule = template.rules.find(r => r.priority === 'high');
    const mainRule = criticalRule || highRule || template.rules[0];
    
    return {
      responseTime: formatSlaTime(mainRule?.responseTimeMinutes || 0),
      solutionTime: formatSlaTime(mainRule?.solutionTimeMinutes || 0)
    };
  };

  const TemplateCard = ({ template }: { template: SlaTemplate }) => {
    const times = getMainTimes(template);
    
    return (
      <Card className={cn(
        "group hover:shadow-md transition-all duration-200",
        !template.isActive && "opacity-60 bg-gray-50 dark:bg-gray-900"
      )}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                {template.name}
                {!template.isActive && (
                  <Badge variant="outline" className="text-xs">Inativo</Badge>
                )}
              </CardTitle>
              <CardDescription>{template.description || 'Sem descrição'}</CardDescription>
            </div>
            <Badge variant={getTemplateTypeBadge(template.type) as any}>
              {getTemplateTypeLabel(template.type)}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Tempos principais */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-muted-foreground">Resposta</p>
                <p className="font-medium">{times.responseTime}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-muted-foreground">Solução</p>
                <p className="font-medium">{times.solutionTime}</p>
              </div>
            </div>
          </div>

          {/* Resumo das regras */}
          <div className="flex flex-wrap gap-1">
            {template.rules && template.rules.length > 0 ? template.rules.map((rule) => (
              <Badge
                key={rule.priority}
                variant={getPriorityBadgeVariant(rule.priority) as any}
                className="text-xs"
              >
                {getPriorityLabel(rule.priority)}: {formatSlaTime(rule.responseTimeMinutes)}
              </Badge>
            )) : (
              <Badge variant="secondary" className="text-xs">
                Nenhuma regra definida
              </Badge>
            )}
          </div>

          {/* Ações */}
          {showActions && (
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="text-xs text-muted-foreground">
                {template.rules?.length || 0} regra(s)
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handlePreviewTemplate(template)}
                >
                  <Eye className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleCloneTemplate(template)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleEditTemplate(template)}
                >
                  <Edit3 className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDeleteTemplate(template.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}

          {/* Callback de seleção */}
          {onTemplateSelect && (
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => onTemplateSelect(template)}
            >
              Selecionar Template
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Gerenciador de Templates SLA
          </h3>
          <p className="text-sm text-muted-foreground">
            {activeTemplates.length} template(s) ativo(s) de {templates.length} total
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Atualizar
          </Button>
          {showActions && (
            <Button onClick={handleCreateTemplate}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Template
            </Button>
          )}
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{templates.length}</p>
                <p className="text-sm text-muted-foreground">Total Templates</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Target className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{activeTemplates.length}</p>
                <p className="text-sm text-muted-foreground">Templates Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{inactiveTemplates.length}</p>
                <p className="text-sm text-muted-foreground">Templates Inativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Templates Grid/List */}
      {activeTemplates.length > 0 ? (
        <div className={cn(
          viewMode === 'grid' 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            : "space-y-4"
        )}>
          {activeTemplates.map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <Settings className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum template encontrado</h3>
            <p className="text-muted-foreground mb-4">
              Crie seu primeiro template SLA para começar a usar o sistema.
            </p>
            {showActions && (
              <Button onClick={handleCreateTemplate}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Template
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Templates Inativos */}
      {inactiveTemplates.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-md font-medium text-muted-foreground">Templates Inativos</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inactiveTemplates.map((template) => (
              <TemplateCard key={template.id} template={template} />
            ))}
          </div>
        </div>
      )}

      {/* Template Creation/Edit Dialog */}
      <Dialog open={showCreateDialog || showEditDialog} onOpenChange={(open) => {
        setShowCreateDialog(false);
        setShowEditDialog(false);
        if (!open) setEditingTemplate(null);
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Editar Template SLA' : 'Novo Template SLA'}
            </DialogTitle>
            <DialogDescription>
              Configure um template SLA com regras personalizadas por prioridade
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="template-name">Nome do Template *</Label>
                <Input
                  id="template-name"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                  placeholder="Ex: Suporte Premium"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="template-type">Tipo de Contrato *</Label>
                <Select
                  value={templateForm.type}
                  onValueChange={(value) => setTemplateForm({ ...templateForm, type: value as 'support' | 'maintenance' | 'development' | 'consulting' | 'other' })}
                >
                  <SelectTrigger id="template-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="support">Suporte</SelectItem>
                    <SelectItem value="maintenance">Manutenção</SelectItem>
                    <SelectItem value="development">Desenvolvimento</SelectItem>
                    <SelectItem value="consulting">Consultoria</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-description">Descrição</Label>
              <Textarea
                id="template-description"
                value={templateForm.description}
                onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                placeholder="Descreva este template..."
                rows={3}
              />
            </div>

            {/* SLA Rules */}
            <div className="space-y-4">
              <h4 className="font-medium">Regras SLA por Prioridade</h4>
              
              {templateForm.rules && Array.isArray(templateForm.rules) ? templateForm.rules.map((rule, index) => (
                <Card key={rule.priority}>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-3 gap-4 items-center">
                      <div>
                        <Badge variant={getPriorityBadgeVariant(rule.priority) as any}>
                          {getPriorityLabel(rule.priority)}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-xs">Tempo de Resposta (minutos)</Label>
                        <Input
                          type="number"
                          min="1"
                          value={rule.responseTimeMinutes}
                          onChange={(e) => {
                            const newRules = [...(templateForm.rules || [])];
                            newRules[index].responseTimeMinutes = parseInt(e.target.value) || 0;
                            setTemplateForm({ ...templateForm, rules: newRules });
                          }}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-xs">Tempo de Solução (minutos)</Label>
                        <Input
                          type="number"
                          min="1"
                          value={rule.solutionTimeMinutes}
                          onChange={(e) => {
                            const newRules = [...(templateForm.rules || [])];
                            newRules[index].solutionTimeMinutes = parseInt(e.target.value) || 0;
                            setTemplateForm({ ...templateForm, rules: newRules });
                          }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )) : (
                <p className="text-muted-foreground text-sm">Nenhuma regra SLA definida</p>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowCreateDialog(false);
              setShowEditDialog(false);
            }}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveTemplate}
              disabled={!templateForm.name || saveTemplateMutation.isPending}
            >
              {saveTemplateMutation.isPending ? 'Salvando...' : 'Salvar Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Preview do Template</DialogTitle>
            <DialogDescription>
              Visualização detalhada das regras SLA
            </DialogDescription>
          </DialogHeader>
          
          {previewingTemplate && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <h4 className="font-medium mb-2">Informações</h4>
                  <p className="text-sm">{previewingTemplate.name}</p>
                  <p className="text-xs text-muted-foreground">{previewingTemplate.description}</p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Tipo</h4>
                  <Badge variant={getTemplateTypeBadge(previewingTemplate.type) as any}>
                    {getTemplateTypeLabel(previewingTemplate.type)}
                  </Badge>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Regras SLA</h4>
                <div className="space-y-2">
                  {previewingTemplate.rules && Array.isArray(previewingTemplate.rules) ? 
                    previewingTemplate.rules.map((rule) => (
                      <div key={rule.priority} className="flex justify-between items-center p-3 border rounded-lg">
                        <Badge variant={getPriorityBadgeVariant(rule.priority) as any}>
                          {getPriorityLabel(rule.priority)}
                        </Badge>
                        <div className="text-sm text-right">
                          <div>Resposta: {formatSlaTime(rule.responseTimeMinutes)}</div>
                          <div>Resolução: {formatSlaTime(rule.solutionTimeMinutes)}</div>
                        </div>
                      </div>
                    )) : (
                      <p className="text-muted-foreground text-sm">Nenhuma regra SLA definida</p>
                    )
                  }
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja desativar este template? Esta ação pode ser revertida.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDeleteTemplate}
              disabled={deleteTemplateMutation.isPending}
            >
              {deleteTemplateMutation.isPending ? 'Deletando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}