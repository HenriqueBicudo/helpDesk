import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { z } from 'zod';
import type { insertTaskSchema } from '@shared/schema';

type InsertTask = z.infer<typeof insertTaskSchema>;

interface NewTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketId: number;
  ticketSubject?: string;
}

export function NewTaskDialog({ open, onOpenChange, ticketId, ticketSubject }: NewTaskDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    type: 'support' as 'support' | 'parallel',
    subject: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    teamId: null as number | null,
  });

  // Buscar times disponíveis
  const { data: teams } = useQuery({
    queryKey: ['/api/teams'],
  });

  const createTaskMutation = useMutation({
    mutationFn: async (taskData: any) => {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(taskData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao criar tarefa');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Tarefa criada com sucesso!',
        description: `Tarefa ${data.taskCode} foi criada.`,
      });

      // Atualizar cache
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: [`/api/tickets/${ticketId}`] });

      // Fechar dialog e resetar form
      onOpenChange(false);
      setFormData({
        type: 'support',
        subject: '',
        description: '',
        priority: 'medium',
        teamId: null,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao criar tarefa',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.subject.trim() || !formData.description.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha o assunto e a descrição da tarefa.',
        variant: 'destructive',
      });
      return;
    }

    createTaskMutation.mutate({
      ticketId,
      type: formData.type,
      subject: formData.subject,
      description: formData.description,
      context: formData.description,
      priority: formData.priority,
      teamId: formData.teamId,
      status: 'open',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Nova Tarefa</DialogTitle>
          <DialogDescription>
            Criar uma tarefa para o ticket #{ticketId} {ticketSubject && `- ${ticketSubject}`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo de Tarefa */}
          <div className="space-y-2">
            <Label htmlFor="type">Tipo de Tarefa *</Label>
            <Select
              value={formData.type}
              onValueChange={(value: 'support' | 'parallel') =>
                setFormData({ ...formData, type: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="support">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Tarefa de Apoio</span>
                    <span className="text-xs text-muted-foreground">
                      Pausa o ticket até a conclusão
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="parallel">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Tarefa Paralela</span>
                    <span className="text-xs text-muted-foreground">
                      Executa em paralelo ao ticket
                    </span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            {formData.type === 'support' && (
              <p className="text-sm text-orange-600 dark:text-orange-400">
                ⚠️ Esta tarefa pausará o ticket até ser concluída.
              </p>
            )}
          </div>

          {/* Assunto */}
          <div className="space-y-2">
            <Label htmlFor="subject">Assunto *</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="Ex: Configurar servidor de email"
              required
            />
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descreva os detalhes da tarefa..."
              rows={5}
              required
            />
            <p className="text-xs text-muted-foreground">
              Esta descrição será adicionada como primeiro comentário da tarefa
            </p>
          </div>

          {/* Prioridade */}
          <div className="space-y-2">
            <Label htmlFor="priority">Prioridade</Label>
            <Select
              value={formData.priority}
              onValueChange={(value: any) => setFormData({ ...formData, priority: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baixa</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="critical">Crítica</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Equipe Responsável */}
          <div className="space-y-2">
            <Label htmlFor="team">Equipe Responsável</Label>
            <Select
              value={formData.teamId?.toString() || 'unassigned'}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  teamId: value === 'unassigned' ? null : parseInt(value)
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma equipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Não atribuído</SelectItem>
                {teams && teams.map((team: any) => (
                  <SelectItem key={team.id} value={team.id.toString()}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createTaskMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createTaskMutation.isPending}
            >
              {createTaskMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Criar Tarefa
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
