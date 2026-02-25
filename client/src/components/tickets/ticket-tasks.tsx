import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Clock, ListTodo, Pause, PlayCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { NewTaskDialog } from './new-task-dialog';

interface Task {
  task: {
    id: number;
    taskCode: string;
    type: 'support' | 'parallel';
    subject: string;
    description: string;
    status: string;
    priority: string;
    createdAt: string;
  };
  ticket: {
    id: number;
    subject: string;
  };
  team?: {
    id: number;
    name: string;
  };
}

interface TicketTasksProps {
  ticketId: number;
  ticketSubject?: string;
}

export function TicketTasks({ ticketId, ticketSubject }: TicketTasksProps) {
  const [isNewTaskDialogOpen, setIsNewTaskDialogOpen] = useState(false);
  const [, setLocation] = useLocation();

  const { data: tasks, isLoading } = useQuery<Task[]>({
    queryKey: [`/api/tasks?ticketId=${ticketId}`],
    refetchInterval: 30000,
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      open: { color: 'bg-blue-500', text: 'Aberta' },
      in_progress: { color: 'bg-yellow-500', text: 'Em Progresso' },
      pending: { color: 'bg-orange-500', text: 'Pendente' },
      completed: { color: 'bg-green-500', text: 'Concluída' },
      cancelled: { color: 'bg-gray-500', text: 'Cancelada' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.open;
    return (
      <Badge className={`${config.color} text-white border-0 text-xs`}>
        {config.text}
      </Badge>
    );
  };

  const getTypeBadge = (type: string) => {
    return type === 'support' ? (
      <Badge variant="outline" className="border-red-500 text-red-500 text-xs">
        <Pause className="h-3 w-3 mr-1" />
        Apoio
      </Badge>
    ) : (
      <Badge variant="outline" className="border-blue-500 text-blue-500 text-xs">
        <PlayCircle className="h-3 w-3 mr-1" />
        Paralela
      </Badge>
    );
  };

  const activeTasks = tasks?.filter(t => 
    ['open', 'in_progress', 'pending'].includes(t.task.status)
  );
  
  const completedTasks = tasks?.filter(t => 
    ['completed', 'cancelled'].includes(t.task.status)
  );

  return (
    <>
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ListTodo className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold text-lg">Tarefas</h3>
            {tasks && tasks.length > 0 && (
              <Badge variant="secondary">{tasks.length}</Badge>
            )}
          </div>
          <Button
            size="sm"
            onClick={() => setIsNewTaskDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Nova Tarefa
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Carregando tarefas...
          </div>
        ) : !tasks || tasks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ListTodo className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhuma tarefa criada para este ticket.</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => setIsNewTaskDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Criar Primeira Tarefa
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Tarefas Ativas */}
            {activeTasks && activeTasks.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  Ativas ({activeTasks.length})
                </h4>
                <div className="space-y-2">
                  {activeTasks.map((item) => (
                    <div
                      key={item.task.id}
                      className="border rounded-lg p-3 hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={() => setLocation(`/tasks/${item.task.taskCode}`)}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm font-medium text-blue-600">
                            {item.task.taskCode}
                          </span>
                          {getTypeBadge(item.task.type)}
                          {getStatusBadge(item.task.status)}
                        </div>
                      </div>
                      
                      <h4 className="font-medium mb-1">{item.task.subject}</h4>
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {item.task.description}
                      </p>
                      
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        {item.team && (
                          <span>
                            Equipe: <span className="font-medium">{item.team.name}</span>
                          </span>
                        )}
                        <span>
                          Criada {formatDistanceToNow(new Date(item.task.createdAt), { 
                            addSuffix: true,
                            locale: ptBR 
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tarefas Concluídas */}
            {completedTasks && completedTasks.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  Concluídas ({completedTasks.length})
                </h4>
                <div className="space-y-2">
                  {completedTasks.map((item) => (
                    <div
                      key={item.task.id}
                      className="border rounded-lg p-3 opacity-75 hover:opacity-100 transition-opacity cursor-pointer"
                      onClick={() => setLocation(`/tasks/${item.task.taskCode}`)}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm font-medium text-muted-foreground">
                            {item.task.taskCode}
                          </span>
                          {getTypeBadge(item.task.type)}
                          {getStatusBadge(item.task.status)}
                        </div>
                      </div>
                      
                      <h4 className="font-medium text-muted-foreground mb-1">
                        {item.task.subject}
                      </h4>
                      
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        {item.team && (
                          <span>
                            Equipe: {item.team.name}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      <NewTaskDialog
        open={isNewTaskDialogOpen}
        onOpenChange={setIsNewTaskDialogOpen}
        ticketId={ticketId}
        ticketSubject={ticketSubject}
      />
    </>
  );
}
