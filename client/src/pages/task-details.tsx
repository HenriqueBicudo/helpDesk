import { useState } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/app-layout';
import { RichTextEditor } from '@/components/tickets/rich-text-editor';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest } from '@/lib/queryClient';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft,
  Clock,
  Calendar,
  CheckCircle2,
  Pause,
  PlayCircle,
  Users,
  ExternalLink,
  MessageSquare,
  AlertCircle,
  UserPlus,
} from 'lucide-react';
import { formatDate, getInitials } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Task {
  task: {
    id: number;
    ticketId: number;
    taskCode: string;
    type: 'support' | 'parallel';
    subject: string;
    description: string;
    status: string;
    priority: string;
    timeSpent: string;
    createdAt: string;
    completedAt?: string;
    completedBy?: number;
    assignedToId?: number;
  };
  ticket: {
    id: number;
    subject: string;
    status: string;
  };
  team?: {
    id: number;
    name: string;
  };
  createdBy?: {
    id: number;
    fullName: string;
    email: string;
  };
  assignedTo?: {
    id: number;
    fullName: string;
    email: string;
  };
}

interface TaskInteraction {
  interaction: {
    id: number;
    type: string;
    content: string;
    isInternal: boolean;
    timeSpent?: string;
    createdAt: string;
  };
  user?: {
    id: number;
    fullName: string;
    email: string;
  };
}

interface InteractionData {
  content: string;
  isInternal: boolean;
  timeSpent?: number;
  status?: string;
  attachments: File[];
}

export default function TaskDetails() {
  const [, params] = useRoute('/tasks/:taskCode');
  const taskCode = params?.taskCode || '';
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const [showInternalNotes, setShowInternalNotes] = useState(true);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);

  // Fetch task details
  const { data: taskData, isLoading, error } = useQuery<Task>({
    queryKey: [`/api/tasks/${taskCode}`],
    enabled: !!taskCode,
  });

  // Fetch task interactions
  const { data: interactions = [] } = useQuery<TaskInteraction[]>({
    queryKey: [`/api/tasks/${taskCode}/interactions`],
    enabled: !!taskCode,
  });

  // Fetch contracts for the parent ticket
  const { data: ticketDetails } = useQuery({
    queryKey: [`/api/tickets/${taskData?.task.ticketId}`],
    enabled: !!taskData?.task.ticketId,
  });

  // Buscar contratos vinculados ao ticket
  const contracts = ticketDetails?.contract ? [ticketDetails.contract] : [];

  // Add interaction mutation
  const addInteractionMutation = useMutation({
    mutationFn: async (data: InteractionData) => {
      return apiRequest('POST', `/api/tasks/${taskCode}/interactions`, {
        type: 'comment',
        content: data.content,
        isInternal: data.isInternal,
        timeSpent: data.timeSpent,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskCode}/interactions`] });
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskCode}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      toast({
        title: 'Comentário adicionado',
        description: 'Sua interação foi registrada com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao adicionar comentário',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: async (updates: any) => {
      return apiRequest('PATCH', `/api/tasks/${taskCode}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskCode}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      if (taskData?.task.ticketId) {
        queryClient.invalidateQueries({ queryKey: [`/api/tickets/${taskData.task.ticketId}`] });
      }
      toast({
        title: 'Tarefa atualizada',
        description: 'As alterações foram salvas com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar tarefa',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleAddInteraction = async (data: InteractionData) => {
    // Se marcou para concluir tarefa, verificar antes
    if (data.status === 'completed') {
      setPendingStatus('completed');
      setShowCompleteDialog(true);
      // Guardar os dados da interação para enviar depois
      (window as any).__pendingInteraction = data;
      return;
    }
    
    addInteractionMutation.mutate(data);
  };

  const confirmComplete = () => {
    if (pendingStatus) {
      // Primeiro atualizar o status
      updateTaskMutation.mutate({ status: pendingStatus });
      
      // Depois enviar a interação se houver
      const pendingData = (window as any).__pendingInteraction;
      if (pendingData) {
        addInteractionMutation.mutate(pendingData);
        delete (window as any).__pendingInteraction;
      }
      
      setShowCompleteDialog(false);
      setPendingStatus(null);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando tarefa...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !taskData) {
    return (
      <AppLayout>
        <div className="container mx-auto p-6">
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-destructive mb-2">Tarefa não encontrada</h2>
                <p className="text-muted-foreground mb-4">
                  A tarefa solicitada não existe ou você não tem permissão para visualizá-la.
                </p>
                <Button onClick={() => setLocation('/tasks')}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar para Tarefas
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const task = taskData.task;
  const ticket = taskData.ticket;
  const team = taskData.team;

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
      <Badge className={`${config.color} text-white border-0`}>
        {config.text}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      low: { color: 'bg-gray-500', text: 'Baixa' },
      medium: { color: 'bg-blue-500', text: 'Média' },
      high: { color: 'bg-orange-500', text: 'Alta' },
      critical: { color: 'bg-red-500', text: 'Crítica' },
    };
    
    const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.medium;
    return (
      <Badge className={`${config.color} text-white border-0`}>
        {config.text}
      </Badge>
    );
  };

  const getTypeBadge = (type: string) => {
    return type === 'support' ? (
      <Badge variant="outline" className="border-red-500 text-red-500">
        <Pause className="h-3 w-3 mr-1" />
        Apoio (Pausa Ticket)
      </Badge>
    ) : (
      <Badge variant="outline" className="border-blue-500 text-blue-500">
        <PlayCircle className="h-3 w-3 mr-1" />
        Paralela
      </Badge>
    );
  };

  return (
    <AppLayout>
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => setLocation('/tasks')}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Tarefas
          </Button>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-3xl font-bold">{task.subject}</h1>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-lg font-medium text-blue-600">
                  {task.taskCode}
                </span>
                {getTypeBadge(task.type)}
                {getStatusBadge(task.status)}
                {getPriorityBadge(task.priority)}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle>Descrição da Tarefa</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap text-foreground">{task.description}</p>
                </div>
              </CardContent>
            </Card>

            {/* Interactions Timeline */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Comentários e Atualizações
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-muted-foreground flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showInternalNotes}
                        onChange={(e) => setShowInternalNotes(e.target.checked)}
                        className="rounded"
                      />
                      Mostrar notas internas
                    </label>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {interactions
                    .filter(item => showInternalNotes || !item.interaction.isInternal)
                    .map((item) => (
                      <div
                        key={item.interaction.id}
                        className={`border rounded-lg p-4 ${
                          item.interaction.isInternal ? 'bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {item.user ? getInitials(item.user.fullName) : '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">
                                {item.user?.fullName || 'Sistema'}
                              </span>
                              {item.interaction.isInternal && (
                                <Badge variant="secondary" className="text-xs">
                                  Nota Interna
                                </Badge>
                              )}
                              {item.interaction.timeSpent && (
                                <Badge variant="outline" className="text-xs">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {item.interaction.timeSpent}h
                                </Badge>
                              )}
                              <span className="text-sm text-muted-foreground">
                                {formatDistanceToNow(new Date(item.interaction.createdAt), {
                                  addSuffix: true,
                                  locale: ptBR,
                                })}
                              </span>
                            </div>
                            <div
                              className="prose prose-sm max-w-none dark:prose-invert"
                              dangerouslySetInnerHTML={{ __html: item.interaction.content }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                  {interactions.filter(item => showInternalNotes || !item.interaction.isInternal).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Nenhum comentário ainda</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Add Interaction */}
            {task.status !== 'completed' && task.status !== 'cancelled' && (
              <Card>
                <CardHeader>
                  <CardTitle>Adicionar Comentário</CardTitle>
                </CardHeader>
                <CardContent>
                  <RichTextEditor
                    content={user?.emailSignature ? `<p></p><hr/><br/>${user.emailSignature}` : ''}
                    resetContent={user?.emailSignature ? `<p></p><hr/><br/>${user.emailSignature}` : ''}
                    onSubmit={handleAddInteraction}
                    submitLabel="Adicionar Comentário"
                    showInternalToggle
                    showTimeLog
                    showTemplates={false}
                    showTimeTracking={false}
                    showTaskCompletion
                  />
                  </CardContent>
                </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Ticket Origin */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ExternalLink className="h-4 w-4" />
                  Ticket de Origem
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setLocation(`/tickets/${ticket.id}`)}
                >
                  <span className="font-mono mr-2">#{ticket.id}</span>
                  <span className="truncate">{ticket.subject}</span>
                </Button>
              </CardContent>
            </Card>

            {/* Task Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Informações da Tarefa</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Assigned To / Assign to Me */}
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Responsável</p>
                  {taskData.assignedTo ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {getInitials(taskData.assignedTo.fullName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{taskData.assignedTo.fullName}</p>
                          <p className="text-xs text-muted-foreground">{taskData.assignedTo.email}</p>
                        </div>
                      </div>
                      {user && task.assignedToId !== user.id && task.status !== 'completed' && task.status !== 'cancelled' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            updateTaskMutation.mutate({ 
                              assignedToId: user.id,
                              status: task.status === 'open' ? 'in_progress' : task.status
                            });
                          }}
                          disabled={updateTaskMutation.isPending}
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          Assumir tarefa
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground italic">Não atribuída</p>
                      {user && task.status !== 'completed' && task.status !== 'cancelled' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            updateTaskMutation.mutate({ 
                              assignedToId: user.id,
                              status: task.status === 'open' ? 'in_progress' : task.status
                            });
                          }}
                          disabled={updateTaskMutation.isPending}
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          Atribuir para mim
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Status - Apenas visualização */}
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Status</p>
                  <div>{getStatusBadge(task.status)}</div>
                  {task.status !== 'completed' && task.status !== 'cancelled' && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Use o formulário abaixo para concluir a tarefa
                    </p>
                  )}
                </div>

                <Separator />

                {/* Priority */}
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Prioridade</p>
                  <div>{getPriorityBadge(task.priority)}</div>
                </div>

                <Separator />

                {/* Team */}
                {team && (
                  <>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Equipe Responsável</p>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{team.name}</span>
                      </div>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Time Spent */}
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Tempo Investido</p>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{task.timeSpent || '0'}h</span>
                  </div>
                </div>

                <Separator />

                {/* Created At */}
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Criado em</p>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{formatDate(task.createdAt)}</span>
                  </div>
                </div>

                {/* Completed At */}
                {task.completedAt && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Concluído em</p>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span>{formatDate(task.completedAt)}</span>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Contrato e Barra de Horas - Visualização compacta */}
            {contracts.length > 0 && contracts[0] && (
              <Card>
                <CardContent className="px-4 py-3">
                  <div className="flex items-center gap-4">
                    {/* Label de Contrato */}
                    <div className="flex items-center gap-2 min-w-fit">
                      <label className="text-sm font-semibold flex items-center gap-1.5">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Contrato
                      </label>
                      <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-md border">
                        <span className="font-medium text-sm">{contracts[0].contractNumber}</span>
                        <span className="text-xs text-muted-foreground capitalize">
                          {contracts[0].type === 'support' ? 'Suporte' :
                            contracts[0].type === 'maintenance' ? 'Manutenção' :
                              contracts[0].type === 'development' ? 'Desenvolvimento' :
                                contracts[0].type}
                        </span>
                      </div>
                    </div>

                    {/* Barra de Horas */}
                    <div className="flex-1 space-y-0.5">
                      <Progress 
                        value={((parseFloat(contracts[0].usedHours || '0') / contracts[0].includedHours) * 100)} 
                        className="h-1.5"
                      />
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>Usado: {contracts[0].usedHours || '0'}h / {contracts[0].includedHours}h</span>
                        <span className="font-semibold text-primary">
                          {(contracts[0].includedHours - parseFloat(contracts[0].usedHours || '0')).toFixed(2)}h restantes
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Complete Dialog */}
      <AlertDialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Concluir Tarefa
            </AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a concluir esta tarefa. Uma interação será automaticamente enviada para o ticket principal #{taskData?.ticket.id} com os dados informados.
              {task?.type === 'support' && (
                <span className="block mt-2 text-orange-600 dark:text-orange-400 font-medium">
                  ⚠️ Esta é uma tarefa de apoio. O ticket principal será despausado automaticamente.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowCompleteDialog(false);
              setPendingStatus(null);
              delete (window as any).__pendingInteraction;
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmComplete}>
              Concluir Tarefa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
