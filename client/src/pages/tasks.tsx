import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  ListTodo, 
  UserCheck, 
  UserX,
  Search,
  Eye,
  FileText,
  Calendar,
  Timer
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLocation } from 'wouter';
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { getInitials, formatRelativeTime } from "@/lib/utils";

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
    assignedToId?: number;
  };
  ticket: {
    id: number;
    subject: string;
  };
  team?: {
    id: number;
    name: string;
  };
  createdBy?: {
    id: number;
    fullName: string;
  };
  assignedTo?: {
    id: number;
    fullName: string;
    email: string;
  };
}

const statusColors = {
  'open': 'bg-blue-500',
  'in_progress': 'bg-yellow-500', 
  'pending': 'bg-orange-500',
  'completed': 'bg-green-500',
  'cancelled': 'bg-red-500'
};

const statusLabels = {
  'open': 'Aberto',
  'in_progress': 'Em Progresso',
  'pending': 'Pendente',
  'completed': 'Concluído',
  'cancelled': 'Cancelado'
};

const priorityColors = {
  'low': 'bg-green-100 text-green-800',
  'medium': 'bg-yellow-100 text-yellow-800',
  'high': 'bg-orange-100 text-orange-800',
  'urgent': 'bg-red-100 text-red-800'
};

const priorityLabels = {
  'low': 'Baixa',
  'medium': 'Média', 
  'high': 'Alta',
  'urgent': 'Urgente'
};

export default function Tasks() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [assignmentFilter, setAssignmentFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeTab, setActiveTab] = useState('all');
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ['/api/tasks'],
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  // Mutation para assumir tarefa
  const assignTaskMutation = useMutation({
    mutationFn: async (taskCode: string) => {
      const response = await fetch(`/api/tasks/${taskCode}/assign`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao assumir tarefa');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      toast({
        title: 'Tarefa assumida',
        description: 'Você assumiu a tarefa com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao assumir tarefa',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Mutation para liberar tarefa
  const unassignTaskMutation = useMutation({
    mutationFn: async (taskCode: string) => {
      const response = await fetch(`/api/tasks/${taskCode}/unassign`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao liberar tarefa');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      toast({
        title: 'Tarefa liberada',
        description: 'A tarefa foi liberada para a equipe.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao liberar tarefa',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const filteredTasks = React.useMemo(() => {
    let filtered = tasks;
    
    // Filtro de busca por texto
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(task =>
        task.task.subject.toLowerCase().includes(searchLower) ||
        task.task.taskCode.toLowerCase().includes(searchLower) ||
        task.ticket.subject.toLowerCase().includes(searchLower) ||
        task.assignedTo?.fullName.toLowerCase().includes(searchLower)
      );
    }
    
    // Filtro de status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(task => task.task.status === statusFilter);
    }
    
    // Filtro de tipo
    if (typeFilter !== 'all') {
      filtered = filtered.filter(task => task.task.type === typeFilter);
    }
    
    // Filtro de atribuição
    if (assignmentFilter === 'my-tasks') {
      filtered = filtered.filter(task => task.task.assignedToId === user?.id);
    } else if (assignmentFilter === 'unassigned') {
      filtered = filtered.filter(task => !task.task.assignedToId);
    }

    // Filtro por tab
    if (activeTab === 'active') {
      filtered = filtered.filter(task => 
        task.task.status === 'open' || task.task.status === 'in_progress'
      );
    } else if (activeTab === 'completed') {
      filtered = filtered.filter(task => task.task.status === 'completed');
    }
    
    return filtered;
  }, [tasks, searchTerm, statusFilter, typeFilter, assignmentFilter, activeTab, user]);

  const getTaskCard = (task: Task) => (
    <Card key={task.task.id} className="mb-3">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-sm font-medium text-blue-600">
                {task.task.taskCode}
              </span>
              <Badge variant="outline" className="text-xs">
                {task.task.type === 'support' ? 'Suporte' : 'Paralelo'}
              </Badge>
            </div>
            
            <h3 className="font-medium text-sm mb-1 line-clamp-2">
              {task.task.subject}
            </h3>
            
            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
              <div className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                <span>#{task.ticket.id}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{formatRelativeTime(task.task.createdAt)}</span>
              </div>
              {parseFloat(task.task.timeSpent) > 0 && (
                <div className="flex items-center gap-1">
                  <Timer className="h-3 w-3" />
                  <span>{parseFloat(task.task.timeSpent).toFixed(1)}h</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div 
                className={`w-2 h-2 rounded-full ${statusColors[task.task.status as keyof typeof statusColors]}`}
              />
              <span className="text-xs text-muted-foreground">
                {statusLabels[task.task.status as keyof typeof statusLabels]}
              </span>
              
              <Badge 
                variant="secondary" 
                className={`text-xs ml-2 ${priorityColors[task.task.priority as keyof typeof priorityColors]}`}
              >
                {priorityLabels[task.task.priority as keyof typeof priorityLabels]}
              </Badge>

              {task.assignedTo && (
                <div className="flex items-center gap-1 ml-auto">
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-xs">
                      {getInitials(task.assignedTo.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground">
                    {task.assignedTo.fullName}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation(`/tasks/${task.task.taskCode}`)}
              className="text-xs"
            >
              <Eye className="h-3 w-3 mr-1" />
              Ver
            </Button>

            {!task.task.assignedToId && (
              <Button
                variant="default"
                size="sm"
                className="text-xs"
                onClick={() => assignTaskMutation.mutate(task.task.taskCode)}
                disabled={assignTaskMutation.isPending}
              >
                <UserCheck className="h-3 w-3 mr-1" />
                Assumir
              </Button>
            )}

            {task.task.assignedToId === user?.id && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => unassignTaskMutation.mutate(task.task.taskCode)}
                disabled={unassignTaskMutation.isPending}
              >
                <UserX className="h-3 w-3 mr-1" />
                Liberar
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <AppLayout title="Tarefas">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-border mx-auto"></div>
            <p className="mt-2 text-sm text-muted-foreground">Carregando tarefas...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Tarefas">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Tarefas</h1>
            <p className="text-muted-foreground">
              Gerencie suas tarefas e acompanhe o progresso do trabalho
            </p>
          </div>
          <Button 
            onClick={() => setLocation('/tasks/kanban')} 
            variant="outline"
          >
            Ver Kanban
          </Button>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar tarefas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="open">Aberto</SelectItem>
                  <SelectItem value="in_progress">Em Progresso</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="support">Suporte</SelectItem>
                  <SelectItem value="parallel">Paralelo</SelectItem>
                </SelectContent>
              </Select>

              <Select value={assignmentFilter} onValueChange={setAssignmentFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Atribuição" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="my-tasks">Minhas Tarefas</SelectItem>
                  <SelectItem value="unassigned">Não Atribuídas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">Todas</TabsTrigger>
            <TabsTrigger value="active">Ativas</TabsTrigger>
            <TabsTrigger value="completed">Concluídas</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            {filteredTasks.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <ListTodo className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhuma tarefa encontrada</h3>
                  <p className="text-muted-foreground">
                    {searchTerm || statusFilter !== 'all' || typeFilter !== 'all' || assignmentFilter !== 'all'
                      ? 'Tente ajustar os filtros para encontrar as tarefas desejadas.'
                      : 'Não há tarefas disponíveis no momento.'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {filteredTasks.length} tarefa{filteredTasks.length !== 1 ? 's' : ''} encontrada{filteredTasks.length !== 1 ? 's' : ''}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {filteredTasks.map(getTaskCard)}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}