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
import { useAuth } from '@/hooks/use-auth';
import { useTeams } from '@/hooks/use-teams';
import { apiRequest } from '@/lib/queryClient';

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
  const { user } = useAuth(); // Usuário logado
  const { data: teams = [] } = useTeams(); // Hook para buscar teams

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

  // Obtém as categorias disponíveis baseadas nos teams
  const getAvailableCategories = () => {
    if (!teams || teams.length === 0) return [{ value: 'Geral', label: 'Geral' }]
    
    // Se é admin, pode ver todas as categorias dos teams
    if (user?.role === 'admin') {
      return teams.map(team => ({ 
        value: team.name, 
        label: team.name 
      }))
    }
    
    // Se o usuário tem uma equipe, mostrar apenas a categoria da sua equipe
    if (user?.teamId) {
      const userTeam = teams.find(team => team.id === user.teamId)
      if (userTeam) {
        return [{ value: userTeam.name, label: userTeam.name }]
      }
    }
    
    // Se não tem equipe específica, mostrar todas
    return teams.map(team => ({ 
      value: team.name, 
      label: team.name 
    }))
  }

  const availableCategories = getAvailableCategories();

  const updateTicketMutation = useMutation({
    mutationFn: async (updateData: any) => {
      const response = await apiRequest('PATCH', `/api/tickets/${ticket.id}`, updateData);
      return response.json();
    },
    onMutate: async (updateData) => {
      // Cancelar queries pendentes para evitar conflitos
      await queryClient.cancelQueries({ queryKey: ['ticket', ticket.id] });
      await queryClient.cancelQueries({ queryKey: ['tickets'] });
      
      // Snapshot dos valores anteriores
      const previousTicket = queryClient.getQueryData(['ticket', ticket.id]);
      const previousTickets = queryClient.getQueryData(['tickets']);
      
      // Atualização otimista - ticket individual
      queryClient.setQueryData(['ticket', ticket.id], (old: any) => ({
        ...old,
        ...updateData,
        updatedAt: new Date().toISOString()
      }));
      
      // Atualização otimista - lista de tickets
      queryClient.setQueryData(['tickets'], (old: any) => {
        if (!old) return old;
        return old.map((t: any) => 
          t.id === ticket.id 
            ? { ...t, ...updateData, updatedAt: new Date().toISOString() }
            : t
        );
      });
      
      // Retornar contexto com os valores anteriores
      return { previousTicket, previousTickets };
    },
    onError: (err, updateData, context) => {
      // Reverter para os valores anteriores em caso de erro
      if (context?.previousTicket) {
        queryClient.setQueryData(['ticket', ticket.id], context.previousTicket);
      }
      if (context?.previousTickets) {
        queryClient.setQueryData(['tickets'], context.previousTickets);
      }
    },
    onSuccess: () => {
      // Invalidar múltiplas queries relacionadas para garantir atualização
      queryClient.invalidateQueries({ queryKey: ['ticket', ticket.id] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tickets'] });
      
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

  const handleAssigneeChange = (value: string) => {
    const newAssigneeId = value === 'unassigned' ? null : parseInt(value);
    
    // Atualizar o assigneeId
    handlePropertyChange('assigneeId', newAssigneeId);
    
    // Se foi atribuído a um agente, automaticamente atualizar a categoria baseada no team
    if (newAssigneeId) {
      const assignedAgent = agents.find(agent => agent.id === newAssigneeId);
      if (assignedAgent) {
        // Buscar o team do agente
        // Nota: Assumindo que a estrutura de Agent terá teamId em futuras implementações
        // Por enquanto, não alteramos automaticamente a categoria aqui
        // Esta lógica será implementada no backend quando o ticket for atualizado
      }
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
                  {availableCategories.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="mt-1">
                <Badge variant="secondary">
                  {ticket.category}
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
                onValueChange={handleAssigneeChange}
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
