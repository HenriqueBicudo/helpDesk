import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { 
  ChevronDown, 
  ChevronUp, 
  Search, 
  Filter, 
  CalendarDays,
  RefreshCw
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, getInitials } from "@/lib/utils";
import { AppLayout } from "@/components/layout/app-layout";
import { useToast } from "@/hooks/use-toast";

// Estilos customizados para scroll horizontal suave
const kanbanScrollStyles = `
  .kanban-scroll {
    scrollbar-width: thin;
    scrollbar-color: rgba(155, 155, 155, 0.5) transparent;
    position: relative;
  }
  
  .kanban-scroll::-webkit-scrollbar {
    height: 8px;
  }
  
  .kanban-scroll::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.05);
    border-radius: 4px;
  }
  
  .kanban-scroll::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
  }
  
  .kanban-scroll::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.3);
  }
  
  /* Indicador de scroll (gradiente nas bordas) */
  .kanban-scroll-container {
    position: relative;
  }
  
  .kanban-scroll-container::before,
  .kanban-scroll-container::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 8px;
    width: 40px;
    pointer-events: none;
    z-index: 10;
    transition: opacity 0.2s;
  }
  
  .kanban-scroll-container::before {
    left: 0;
    background: linear-gradient(to right, white, transparent);
    opacity: 0;
  }
  
  .kanban-scroll-container::after {
    right: 0;
    background: linear-gradient(to left, white, transparent);
    opacity: 1;
  }
  
  .kanban-scroll-container.at-start::before {
    opacity: 0;
  }
  
  .kanban-scroll-container.at-end::after {
    opacity: 0;
  }
  
  .kanban-scroll-container:not(.at-start)::before {
    opacity: 1;
  }
  
  .kanban-scroll-container:not(.at-end)::after {
    opacity: 1;
  }
`;

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
    teamId?: number;
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
    email: string;
  };
  assignedTo?: {
    id: number;
    fullName: string;
    email: string;
  };
}

interface User {
  id: number;
  fullName: string;
  email: string;
  role: string;
}

interface Team {
  id: number;
  name: string;
  description: string;
  isActive: boolean;
  members?: User[];
}

type KanbanColumn = {
  title: string;
  status: string;
  color: string;
  tasks: Task[];
};

type AgentSubGroup = {
  title: string;
  id?: number;
  type: 'agent' | 'unassigned';
  collapsed: boolean;
  columns: KanbanColumn[];
};

type TeamGroup = {
  title: string;
  id: number;
  type: 'team';
  collapsed: boolean;
  subGroups: AgentSubGroup[];
};

const KANBAN_COLLAPSED_KEY = 'tasks-kanban-collapsed-groups';

// Componente para card de tarefa arrastável
function TaskCard({ 
  task, 
  disableDrag = false
}: { 
  task: Task; 
  groupId?: string;
  disableDrag?: boolean;
}) {
  const [, setLocation] = useLocation();
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `task-${task.task.id}`,
    disabled: disableDrag,
    data: {
      task,
      type: 'task'
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const priorityColors = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800'
  };

  const statusColors = {
    open: 'bg-blue-500',
    in_progress: 'bg-yellow-500',
    pending: 'bg-orange-500',
    completed: 'bg-green-500',
    cancelled: 'bg-red-500'
  };

  const priorityLabels = {
    low: 'Baixa',
    medium: 'Média',
    high: 'Alta',
    urgent: 'Urgente'
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => setLocation(`/tasks/${task.task.taskCode}`)}
    >
      <Card 
        className="mb-3 cursor-grab active:cursor-grabbing hover:shadow-lg transition-all duration-200 hover:scale-[1.02] border-l-4"
        style={{ borderLeftColor: isDragging ? 'transparent' : undefined }}
      >
        <div 
          className={`h-1 rounded-t-lg ${statusColors[task.task.status as keyof typeof statusColors]}`}
        />
        
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm font-medium line-clamp-2">
            {task.task.subject}
          </CardTitle>
          
          <div className="flex gap-1 mt-2 flex-wrap">
            <Badge variant="outline" className="text-xs">
              {task.task.taskCode}
            </Badge>
            <Badge 
              variant="secondary" 
              className={`text-xs ${priorityColors[task.task.priority as keyof typeof priorityColors]}`}
            >
              {priorityLabels[task.task.priority as keyof typeof priorityLabels]}
            </Badge>
            {task.task.type && (
              <Badge variant="outline" className="text-xs">
                {task.task.type === 'support' ? 'Suporte' : 'Paralela'}
              </Badge>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="p-3 pt-2">
          <p className="text-xs text-muted-foreground line-clamp-2">
            {task.task.description || task.ticket.subject}
          </p>
        </CardContent>
        
        <CardFooter className="p-3 pt-0 flex justify-between items-center text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            {task.assignedTo ? (
              <>
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs">
                    {getInitials(task.assignedTo.fullName)}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium truncate">{task.assignedTo.fullName}</span>
              </>
            ) : (
              <span className="text-muted-foreground italic">Não atribuída</span>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            <CalendarDays className="h-3 w-3" />
            <span>{formatDate(task.task.createdAt || new Date(), "dd/MM/yy")}</span>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

// Componente para container com scroll horizontal inteligente
function ScrollableKanbanContainer({ children }: { children: React.ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollState, setScrollState] = useState({ atStart: true, atEnd: false });

  const updateScrollState = () => {
    if (!scrollRef.current) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    const atStart = scrollLeft === 0;
    const atEnd = scrollLeft + clientWidth >= scrollWidth - 5; // 5px de tolerância
    
    setScrollState({ atStart, atEnd });
  };

  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;

    // Verificar estado inicial
    updateScrollState();

    // Adicionar listener de scroll
    scrollElement.addEventListener('scroll', updateScrollState);
    
    // Adicionar listener de resize para recalcular
    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(scrollElement);

    return () => {
      scrollElement.removeEventListener('scroll', updateScrollState);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div 
      className={`kanban-scroll-container ${scrollState.atStart ? 'at-start' : ''} ${scrollState.atEnd ? 'at-end' : ''}`}
    >
      <div ref={scrollRef} className="overflow-x-auto kanban-scroll">
        {children}
      </div>
    </div>
  );
}

// Função helper para converter hex em rgba com opacidade configurável
const hexToRgba = (hex: string, opacity: number = 0.15) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return `rgba(0, 0, 0, ${opacity})`;
  
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

export default function TasksKanban() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [teamGroups, setTeamGroups] = useState<TeamGroup[]>([]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // Configurações de sensor para arrastar
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Buscar todas as tarefas
  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ['/api/tasks'],
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  // Buscar todos os usuários
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  // Buscar todas as equipes
  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ['/api/teams'],
  });

  // Mutation para atualizar status da tarefa
  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskCode, status, assignedToId }: { taskCode: string; status: string; assignedToId?: number }) => {
      const response = await fetch(`/api/tasks/${taskCode}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status, assignedToId }),
      });
      if (!response.ok) throw new Error('Erro ao atualizar tarefa');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      toast({
        title: 'Tarefa atualizada',
        description: 'Status da tarefa foi atualizado com sucesso.',
      });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a tarefa.',
        variant: 'destructive',
      });
    },
  });

  // Estados disponíveis para tarefas
  const taskStatuses = [
    { id: 'open', name: 'Abertas', color: '#3B82F6' },
    { id: 'in_progress', name: 'Em Progresso', color: '#EAB308' },
  ];

  // Organizar tarefas em grupos por equipe e agente
  useEffect(() => {
    if (!tasks || !users || !teams) return;

    const newTeamGroups: TeamGroup[] = [];
    
    // Carregar estado de collapse do localStorage
    const collapsedMapJson = localStorage.getItem(KANBAN_COLLAPSED_KEY);
    const collapsedMap: Record<string, boolean> = collapsedMapJson 
      ? JSON.parse(collapsedMapJson) 
      : {};

    // Filtrar apenas usuários helpdesk
    const helpdeskUsers = users.filter((u: User) => 
      u.role === 'admin' || 
      u.role === 'helpdesk_manager' || 
      u.role === 'helpdesk_agent'
    );
    
    // Filtrar tarefas ativas (não concluídas/canceladas)
    const activeTasks = tasks.filter((task: Task) => 
      task.task.status !== 'cancelled'
    );
    
    // Criar colunas dinamicamente baseado nos status configurados
    const createColumns = (tasksList: Task[]): KanbanColumn[] => {
      return taskStatuses.map(status => ({
        title: status.name,
        status: status.id,
        color: status.color,
        tasks: tasksList.filter((t: Task) => t.task.status === status.id)
      }));
    };
    
    // Para cada equipe, criar um grupo com subgrupos
    teams.forEach((team: Team) => {
      const teamTasks = activeTasks.filter((task: Task) => task.task.teamId === team.id);
      
      if (teamTasks.length === 0) return;
      
      const subGroups: AgentSubGroup[] = [];
      
      // Subgrupo de tarefas não atribuídas da equipe
      const unassignedTeamTasks = teamTasks.filter((task: Task) => !task.task.assignedToId);
      if (unassignedTeamTasks.length > 0) {
        const subGroupKey = `team-${team.id}-unassigned`;
        subGroups.push({
          title: "Sem Atribuição",
          type: 'unassigned',
          collapsed: collapsedMap[subGroupKey] ?? false,
          columns: createColumns(unassignedTeamTasks)
        });
      }
      
      // Subgrupos por agente dentro da equipe
      helpdeskUsers.forEach((agent: User) => {
        const agentTeamTasks = teamTasks.filter((task: Task) => 
          task.task.assignedToId === agent.id
        );
        
        if (agentTeamTasks.length > 0) {
          const subGroupKey = `team-${team.id}-agent-${agent.id}`;
          subGroups.push({
            title: agent.fullName,
            id: agent.id,
            type: 'agent',
            collapsed: collapsedMap[subGroupKey] ?? false,
            columns: createColumns(agentTeamTasks)
          });
        }
      });
      
      // Adicionar o grupo da equipe se tiver subgrupos
      if (subGroups.length > 0) {
        const teamKey = `team-${team.id}`;
        newTeamGroups.push({
          title: team.name,
          id: team.id,
          type: 'team',
          collapsed: collapsedMap[teamKey] ?? false,
          subGroups
        });
      }
    });
    
    setTeamGroups(newTeamGroups);
  }, [tasks, users, teams]);

  // Alternar colapso de um grupo de equipe
  const toggleTeamCollapse = (teamIndex: number) => {
    setTeamGroups(prevGroups => {
      const newGroups = [...prevGroups];
      newGroups[teamIndex].collapsed = !newGroups[teamIndex].collapsed;
      
      // Salvar estado no localStorage
      const collapsedMap: Record<string, boolean> = {};
      newGroups.forEach((team) => {
        const teamKey = `team-${team.id}`;
        collapsedMap[teamKey] = team.collapsed;
        
        // Salvar também o estado dos subgrupos
        team.subGroups.forEach((subGroup) => {
          const subGroupKey = subGroup.type === 'unassigned' 
            ? `team-${team.id}-unassigned`
            : `team-${team.id}-agent-${subGroup.id}`;
          collapsedMap[subGroupKey] = subGroup.collapsed;
        });
      });
      localStorage.setItem(KANBAN_COLLAPSED_KEY, JSON.stringify(collapsedMap));
      
      return newGroups;
    });
  };

  // Alternar colapso de um subgrupo dentro de uma equipe
  const toggleSubGroupCollapse = (teamIndex: number, subGroupIndex: number) => {
    setTeamGroups(prevGroups => {
      const newGroups = [...prevGroups];
      newGroups[teamIndex].subGroups[subGroupIndex].collapsed = !newGroups[teamIndex].subGroups[subGroupIndex].collapsed;
      
      // Salvar estado no localStorage
      const collapsedMap: Record<string, boolean> = {};
      newGroups.forEach((team) => {
        const teamKey = `team-${team.id}`;
        collapsedMap[teamKey] = team.collapsed;
        
        team.subGroups.forEach((subGroup) => {
          const subGroupKey = subGroup.type === 'unassigned' 
            ? `team-${team.id}-unassigned`
            : `team-${team.id}-agent-${subGroup.id}`;
          collapsedMap[subGroupKey] = subGroup.collapsed;
        });
      });
      localStorage.setItem(KANBAN_COLLAPSED_KEY, JSON.stringify(collapsedMap));
      
      return newGroups;
    });
  };

  // Função para lidar com o início do arraste
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const taskData = active.data.current;
    
    if (taskData?.type === 'task') {
      setActiveTask(taskData.task);
    }
  };

  // Função para lidar com o fim do arraste
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    
    if (!over) return;
    
    const activeData = active.data.current;
    const overData = over.data.current;
    
    // Se arrastou uma tarefa
    if (activeData?.type === 'task') {
      const task = activeData.task;
      let newStatus: string | undefined;
      let newAssigneeId: number | undefined;
      
      // Se soltou sobre uma coluna
      if (overData?.type === 'column') {
        newStatus = overData.status;
        newAssigneeId = overData.assigneeId;
      }
      // Se soltou sobre outra tarefa, pegar o status e assignee dessa tarefa
      else if (overData?.type === 'task') {
        newStatus = overData.task.task.status;
        newAssigneeId = overData.task.task.assignedToId;
      }
      
      // Se o status ou assignee mudou, atualizar a tarefa
      if (newStatus && (task.task.status !== newStatus || task.task.assignedToId !== newAssigneeId)) {
        updateTaskMutation.mutate({
          taskCode: task.task.taskCode,
          status: newStatus,
          assignedToId: newAssigneeId,
        });
      }
    }
  };

  // Filtrar tarefas por pesquisa e prioridade
  const filteredTeamGroups = teamGroups.map(team => {
    const filteredSubGroups = team.subGroups.map(subGroup => {
      const filteredColumns = subGroup.columns.map(column => {
        let filteredTasks = column.tasks;
        
        // Filtrar por texto de pesquisa
        if (searchQuery.trim() !== "") {
          filteredTasks = filteredTasks.filter(task => 
            task.task.subject.toLowerCase().includes(searchQuery.toLowerCase()) || 
            task.task.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            task.task.taskCode.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }
        
        // Filtrar por prioridade
        if (priorityFilter) {
          filteredTasks = filteredTasks.filter(task => 
            task.task.priority === priorityFilter
          );
        }
        
        return { ...column, tasks: filteredTasks };
      });
      
      return { ...subGroup, columns: filteredColumns };
    });
    
    return { ...team, subGroups: filteredSubGroups };
  });

  function DroppableColumn({ 
    column, 
    groupId, 
    assigneeId
  }: { 
    column: KanbanColumn; 
    groupId: string; 
    assigneeId?: number;
  }) {
    const { setNodeRef } = useSortable({
      id: `column-${groupId}-${column.status}`,
      data: {
        type: 'column',
        status: column.status,
        assigneeId,
      },
    });

    return (
      <div 
        ref={setNodeRef} 
        className="p-3"
      >
        <SortableContext 
          items={column.tasks.map(task => `task-${task.task.id}`)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2 min-h-[120px]">
            {column.tasks.map((task) => (
              <TaskCard 
                key={task.task.id} 
                task={task} 
                groupId={groupId}
                disableDrag={false}
              />
            ))}
            
            {column.tasks.length === 0 && (
              <div className="text-center text-muted-foreground text-xs py-8 opacity-50">
                -
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    );
  }

  return (
    <AppLayout title="Tarefas Kanban">
      <style dangerouslySetInnerHTML={{ __html: kanbanScrollStyles }} />
      
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Tarefas - Kanban</h1>
            <p className="text-muted-foreground">
              Visualize e gerencie tarefas organizadas por status
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              onClick={() => setLocation('/tasks')} 
              variant="outline"
            >
              Ver Lista
            </Button>
            
            <Button 
              onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/tasks'] })}
              variant="outline"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar tarefas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="mr-2 h-4 w-4" />
                  Filtros
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Filtrar por prioridade</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {['low', 'medium', 'high', 'urgent'].map((priority) => (
                  <DropdownMenuCheckboxItem
                    key={priority}
                    checked={priorityFilter === priority}
                    onCheckedChange={(checked) => {
                      setPriorityFilter(checked ? priority : '');
                    }}
                  >
                    {priority === 'low' ? 'Baixa' : priority === 'medium' ? 'Média' : priority === 'high' ? 'Alta' : 'Urgente'}
                  </DropdownMenuCheckboxItem>
                ))}
                {priorityFilter && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setPriorityFilter('')}>
                      Limpar filtros
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </Card>

        {/* Kanban Board */}
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {isLoading ? (
            <div className="space-y-6">
              {Array.from({ length: 2 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-48" />
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-6">
                      {taskStatuses.map((status) => (
                        <div key={status.id} className="flex-1">
                          <Skeleton className="h-8 w-full mb-4" />
                          <div className="space-y-3">
                            {Array.from({ length: 2 }).map((_, j) => (
                              <Skeleton key={j} className="h-24 w-full" />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {filteredTeamGroups.map((team, teamIndex) => (
                <Card key={teamIndex} className="overflow-hidden border-l-4 border-l-primary/20">
                  {/* Header da Equipe */}
                  <CardHeader 
                    className="cursor-pointer bg-muted/30"
                    onClick={() => toggleTeamCollapse(teamIndex)}
                  >
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl font-bold flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-primary animate-pulse"></div>
                        {team.title}
                      </CardTitle>
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="font-semibold">
                          {team.subGroups.reduce((sum, sg) => 
                            sum + sg.columns.reduce((colSum, col) => colSum + col.tasks.length, 0), 0
                          )} tarefas
                        </Badge>
                        {team.collapsed ? (
                          <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform" />
                        ) : (
                          <ChevronUp className="h-5 w-5 text-muted-foreground transition-transform" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  {/* Subgrupos da Equipe */}
                  {!team.collapsed && (
                    <CardContent className="p-4 space-y-4">
                      {team.subGroups.map((subGroup, subGroupIndex) => (
                        <Card key={subGroupIndex} className="overflow-hidden border-l-2 border-l-primary/10">
                          <CardHeader 
                            className="cursor-pointer py-3"
                            onClick={() => toggleSubGroupCollapse(teamIndex, subGroupIndex)}
                          >
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-primary/60"></div>
                                {subGroup.title}
                              </CardTitle>
                              <div className="flex items-center gap-3">
                                <Badge variant="outline" className="text-xs">
                                  {subGroup.columns.reduce((sum, col) => sum + col.tasks.length, 0)} tarefas
                                </Badge>
                                {subGroup.collapsed ? (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                )}
                              </div>
                            </div>
                          </CardHeader>
                          
                          {!subGroup.collapsed && (
                            <CardContent className="p-0">
                              <ScrollableKanbanContainer>
                                <div className="flex gap-0">
                                  <SortableContext 
                                    items={subGroup.columns.map(col => `column-${teamIndex}-${subGroupIndex}-${col.status}`)}
                                    strategy={verticalListSortingStrategy}
                                  >
                                    {subGroup.columns.map((column) => (
                                      <div 
                                        key={column.status} 
                                        className="flex-1 min-w-[300px] border-r last:border-r-0"
                                      >
                                        <div 
                                          className="p-4 border-b-2 backdrop-blur-sm"
                                          style={{ 
                                            backgroundColor: hexToRgba(column.color, 0.1),
                                            borderBottomColor: column.color
                                          }}
                                        >
                                          <div className="flex items-center justify-between">
                                            <h3 className="font-bold text-sm flex items-center gap-2">
                                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: column.color }}></div>
                                              {column.title}
                                            </h3>
                                            <Badge 
                                              variant="secondary" 
                                              className="text-xs font-bold min-w-[24px] justify-center"
                                              style={{ 
                                                backgroundColor: hexToRgba(column.color, 0.2),
                                                color: column.color
                                              }}
                                            >
                                              {column.tasks.length}
                                            </Badge>
                                          </div>
                                        </div>
                                        
                                        <DroppableColumn 
                                          column={column}
                                          groupId={`group-${teamIndex}-${subGroupIndex}`}
                                          assigneeId={subGroup.id}
                                        />
                                      </div>
                                    ))}
                                  </SortableContext>
                                </div>
                              </ScrollableKanbanContainer>
                            </CardContent>
                          )}
                        </Card>
                      ))}
                    </CardContent>
                  )}
                </Card>
              ))}
              
              {filteredTeamGroups.length === 0 && (
                <Card>
                  <CardContent className="p-12 text-center">
                    <p className="text-muted-foreground">
                      Nenhuma tarefa encontrada.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <DragOverlay>
            {activeTask && <TaskCard task={activeTask} groupId="overlay" disableDrag />}
          </DragOverlay>
        </DndContext>
      </div>
    </AppLayout>
  );
}
