import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Settings, Save, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { TicketStatusBadge } from './ticket-status-badge';
import { TicketPriorityBadge } from './ticket-priority-badge';

interface Ticket {
  id: number;
  subject: string;
  status: string;
  priority: string;
  category: string;
  assigneeId?: number;
  assignee?: {
    id: number;
    name: string;
    email: string;
  };
}

interface Agent {
  id: number;
  name: string;
  email: string;
}

interface TicketActionsProps {
  ticket: Ticket;
  agents: Agent[];
}

export function TicketActions({ ticket, agents }: TicketActionsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [changes, setChanges] = useState<Record<string, any>>({});
  const [comment, setComment] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const statusOptions = [
    { value: 'open', label: 'Aberto' },
    { value: 'in_progress', label: 'Em Andamento' },
    { value: 'pending', label: 'Pendente' },
    { value: 'resolved', label: 'Resolvido' },
    { value: 'closed', label: 'Fechado' }
  ];

  const priorityOptions = [
    { value: 'low', label: 'Baixa' },
    { value: 'medium', label: 'Média' },
    { value: 'high', label: 'Alta' },
    { value: 'critical', label: 'Crítica' }
  ];

  const categoryOptions = [
    { value: 'technical_support', label: 'Suporte Técnico' },
    { value: 'financial', label: 'Financeiro' },
    { value: 'commercial', label: 'Comercial' },
    { value: 'other', label: 'Outros' }
  ];

  const updateTicketMutation = useMutation({
    mutationFn: async (updateData: any) => {
      const response = await fetch(`/api/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      if (!response.ok) throw new Error('Erro ao atualizar ticket');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticket.id] });
      setIsEditing(false);
      setChanges({});
      setComment('');
      toast({
        title: "✅ Ticket Atualizado",
        description: "As alterações foram salvas com sucesso."
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Erro",
        description: error.message || "Não foi possível atualizar o ticket.",
        variant: "destructive"
      });
    }
  });

  const handleSave = () => {
    if (Object.keys(changes).length === 0) {
      toast({
        title: "⚠️ Nenhuma Alteração",
        description: "Nenhuma propriedade foi modificada.",
        variant: "destructive"
      });
      return;
    }

    const updateData = { ...changes };
    if (comment.trim()) {
      updateData.comment = comment.trim();
    }

    updateTicketMutation.mutate(updateData);
  };

  const handleReset = () => {
    setChanges({});
    setComment('');
    setIsEditing(false);
  };

  const handlePropertyChange = (property: string, value: any) => {
    if (value === ticket[property as keyof Ticket]) {
      // Se o valor é igual ao original, remove da lista de mudanças
      const newChanges = { ...changes };
      delete newChanges[property];
      setChanges(newChanges);
    } else {
      // Adiciona/atualiza a mudança
      setChanges(prev => ({ ...prev, [property]: value }));
    }
  };

  const getCurrentValue = (property: string) => {
    return changes[property] !== undefined ? changes[property] : ticket[property as keyof Ticket];
  };

  const hasChanges = Object.keys(changes).length > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Ações do Ticket
          </CardTitle>
          
          {!isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              Editar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Status */}
          <div>
            <label className="text-xs text-muted-foreground">Status:</label>
            {isEditing ? (
              <Select 
                value={getCurrentValue('status')} 
                onValueChange={(value) => handlePropertyChange('status', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="mt-1">
                <TicketStatusBadge status={ticket.status} />
              </div>
            )}
          </div>

          {/* Prioridade */}
          <div>
            <label className="text-xs text-muted-foreground">Prioridade:</label>
            {isEditing ? (
              <Select 
                value={getCurrentValue('priority')} 
                onValueChange={(value) => handlePropertyChange('priority', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="mt-1">
                <TicketPriorityBadge priority={ticket.priority} />
              </div>
            )}
          </div>

          {/* Categoria */}
          <div>
            <label className="text-xs text-muted-foreground">Categoria:</label>
            {isEditing ? (
              <Select 
                value={getCurrentValue('category')} 
                onValueChange={(value) => handlePropertyChange('category', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="mt-1">
                <Badge variant="secondary">
                  {categoryOptions.find(c => c.value === ticket.category)?.label || ticket.category}
                </Badge>
              </div>
            )}
          </div>

          {/* Agente Responsável */}
          <div>
            <label className="text-xs text-muted-foreground">Agente Responsável:</label>
            {isEditing ? (
              <Select 
                value={getCurrentValue('assigneeId')?.toString() || 'unassigned'} 
                onValueChange={(value) => handlePropertyChange('assigneeId', value === 'unassigned' ? null : parseInt(value))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Não atribuído</SelectItem>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id.toString()}>
                      {agent.name} ({agent.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="mt-1">
                {ticket.assignee ? (
                  <Badge variant="outline">
                    {ticket.assignee.name}
                  </Badge>
                ) : (
                  <Badge variant="secondary">Não atribuído</Badge>
                )}
              </div>
            )}
          </div>

          {/* Comentário da alteração */}
          {isEditing && hasChanges && (
            <div>
              <label className="text-xs text-muted-foreground">Comentário da alteração (opcional):</label>
              <Textarea
                placeholder="Descreva o motivo das alterações..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                className="mt-1"
              />
            </div>
          )}

          {/* Mudanças pendentes */}
          {hasChanges && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                Alterações pendentes:
              </h4>
              <ul className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1">
                {Object.entries(changes).map(([key, value]) => {
                  const oldValue = ticket[key as keyof Ticket];
                  const labels = {
                    status: 'Status',
                    priority: 'Prioridade', 
                    category: 'Categoria',
                    assigneeId: 'Agente'
                  };
                  return (
                    <li key={key}>
                      <strong>{labels[key as keyof typeof labels] || key}:</strong> {oldValue} → {value}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Botões de ação */}
          {isEditing && (
            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleSave}
                disabled={!hasChanges || updateTicketMutation.isPending}
                className="flex-1"
              >
                <Save className="w-4 h-4 mr-2" />
                {updateTicketMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={updateTicketMutation.isPending}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
