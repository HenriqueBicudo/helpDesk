import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Ticket, User, Requester } from "@shared/schema";
import { 
  ChevronDown, 
  ChevronUp, 
  Search, 
  Filter, 
  CalendarDays,
  RefreshCw,
  Plus
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
import { TicketStatusBadge } from "@/components/tickets/ticket-status-badge";
import { TicketPriorityBadge } from "@/components/tickets/ticket-priority-badge";
import { SlaWarningFlag } from "@/components/tickets/sla-warning-flag";
import { SlaDueWarning } from "@/components/tickets/sla-due-warning";
import { AppLayout } from "@/components/layout/app-layout";
import { useClientRestrictions } from '@/hooks/use-client-restrictions';
import { useTicketStatusConfig } from '@/hooks/use-ticket-status-config';
import { NewTicketDialog } from '@/components/tickets/new-ticket-dialog';

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
    transition: opacity 0.3s ease;
  }
  
  .kanban-scroll-container::before {
    left: 0;
    background: linear-gradient(to right, rgba(255,255,255,0.95), transparent);
  }
  
  .kanban-scroll-container::after {
    right: 0;
    background: linear-gradient(to left, rgba(255,255,255,0.95), transparent);
  }
  
  .kanban-scroll-container.at-start::before {
    opacity: 0;
  }
  
  .kanban-scroll-container.at-end::after {
    opacity: 0;
  }
`;

type TicketWithRelations = Ticket & {
  requester: Requester;
  assignee?: User;
};

type KanbanColumn = {
  title: string;
  status: string;
  color: string;
  tickets: TicketWithRelations[];
}

type KanbanGroup = {
  title: string;
  id?: number;
  collapsed: boolean;
  columns: KanbanColumn[];
}

// Componente do card de ticket com drag and drop
function TicketCard({ ticket, groupId, disableDrag }: { ticket: TicketWithRelations; groupId: string; disableDrag?: boolean }) {
  const [, setLocation] = useLocation();
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `ticket-${ticket.id}`,
    data: {
      type: 'ticket',
      ticket,
      groupId,
    },
    disabled: disableDrag,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const navigateToTicket = (ticketId: number) => {
    if (ticketId) {
      setLocation(`/tickets/${ticketId}`);
    }
  };

  const handleCardClick = () => {
    if (!isDragging) {
      navigateToTicket(ticket.id || 0);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...(!disableDrag ? listeners : {})}
    >
      <Card 
        className={`shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer select-none relative group ${
          ticket.priority === 'critical' ? 'ring-2 ring-red-500 ring-opacity-50' : ''
        } ${!disableDrag ? 'cursor-grab active:cursor-grabbing' : ''}`}
        onClick={handleCardClick}
      >
        {/* Flag de alerta SLA */}
        <SlaWarningFlag
          responseDueAt={ticket.responseDueAt || undefined}
          solutionDueAt={ticket.solutionDueAt || undefined}
          status={ticket.status}
          priority={ticket.priority}
          hasFirstResponse={false}
        />
        
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm font-medium line-clamp-2">
            {ticket.subject}
          </CardTitle>
          
          <div className="flex gap-1 mt-2 flex-wrap">
            <Badge variant="outline" className="text-xs">
              #{ticket.id}
            </Badge>
            <TicketStatusBadge status={ticket.status} />
            <TicketPriorityBadge priority={ticket.priority} />
          </div>
        </CardHeader>
        
        <CardContent className="p-3 pt-2">
          <p className="text-xs text-muted-foreground line-clamp-2">
            {ticket.description}
          </p>
          
          <SlaDueWarning
            responseDueAt={ticket.responseDueAt || undefined}
            solutionDueAt={ticket.solutionDueAt || undefined}
            hasFirstResponse={false}
            compact={true}
            className="mt-2"
          />
        </CardContent>
        
        <CardFooter className="p-3 pt-0 flex justify-between items-center text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-xs">
                {getInitials(ticket.requester.fullName)}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium truncate">{ticket.requester.fullName}</span>
          </div>
          
          <div className="flex items-center gap-1">
            <CalendarDays className="h-3 w-3" />
            <span>{formatDate(ticket.createdAt || new Date(), "dd/MM/yy")}</span>
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
  // Remove # se presente
  hex = hex.replace('#', '');
  
  // Converte para RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

// Chave para localStorage
const KANBAN_COLLAPSED_KEY = 'kanban-collapsed-groups';

export default function TicketsKanban() {
  const queryClient = useQueryClient();
  const clientRestrictions = useClientRestrictions();

  // Buscar configurações de status
  const { statuses, isLoading: statusLoading } = useTicketStatusConfig();
  const activeStatuses = useMemo(() => {
    return statuses
      .filter(s => !s.isClosedStatus && !s.name.toLowerCase().includes('resolvido'))
      .sort((a, b) => a.order - b.order);
  }, [statuses]);

  // Estados para controle
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [kanbanGroups, setKanbanGroups] = useState<KanbanGroup[]>([]);
  const [activeTicket, setActiveTicket] = useState<TicketWithRelations | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isNewTicketDialogOpen, setIsNewTicketDialogOpen] = useState(false);

  // Configurar sensores para drag and drop
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

  // Mutation para atualizar ticket
  const updateTicketMutation = useMutation({
    mutationFn: async ({ ticketId, updates }: { ticketId: number; updates: Partial<Ticket> }) => {
      const response = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update ticket');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
    },
  });

  // Buscar todos os tickets
  const { data: tickets, isLoading, refetch, isFetching } = useQuery<TicketWithRelations[]>({ 
    queryKey: ["/api/tickets"],
    refetchInterval: 10000, // Atualiza automaticamente a cada 10 segundos
    refetchOnWindowFocus: true, // Atualiza quando a janela recebe foco
  });

  // Atualizar timestamp quando os dados são recebidos
  useEffect(() => {
    if (tickets) {
      setLastUpdate(new Date());
    }
  }, [tickets]);

  // Buscar todos os usuários
  const { data: users } = useQuery<User[]>({ 
    queryKey: ["/api/users"], 
  });

  // Agrupar tickets por responsáveis quando os dados forem carregados
  useEffect(() => {
    if (tickets && Array.isArray(tickets) && users && activeStatuses.length > 0) {
      const agentGroups: KanbanGroup[] = [];
      
      // Restaurar estado collapsed do localStorage
      const savedCollapsed = localStorage.getItem(KANBAN_COLLAPSED_KEY);
      const collapsedMap: Record<string, boolean> = savedCollapsed ? JSON.parse(savedCollapsed) : {};
      
      // Filtra apenas usuários do helpdesk
      const helpdeskUsers = users.filter((user: User) => 
        user.role === 'admin' || 
        user.role === 'helpdesk_manager' || 
        user.role === 'helpdesk_agent'
      );
      
      // Filtra os tickets ativos (baseado nas configurações)
      const closedStatusIds = activeStatuses
        .filter(s => s.isClosedStatus)
        .map(s => s.id);
      
      const activeTickets = tickets.filter((ticket: TicketWithRelations) => 
        !closedStatusIds.includes(ticket.status)
      );
      
      // Criar colunas dinamicamente baseado nos status configurados
      const createColumns = (ticketsList: TicketWithRelations[]): KanbanColumn[] => {
        return activeStatuses.map(status => ({
          title: status.name,
          status: status.id,
          color: status.color,
          tickets: ticketsList.filter((t: TicketWithRelations) => t.status === status.id)
        }));
      };
      
      // Criar um grupo para tickets não atribuídos
      const unassignedTickets = activeTickets.filter((ticket: TicketWithRelations) => !ticket.assigneeId);
      if (unassignedTickets.length > 0) {
        const groupKey = 'unassigned';
        agentGroups.push({
          title: "Não atribuídos",
          collapsed: collapsedMap[groupKey] ?? false,
          columns: createColumns(unassignedTickets)
        });
      }
      
      // Agrupar por responsável
      helpdeskUsers.forEach((agent: User) => {
        const agentTickets = activeTickets.filter((ticket: TicketWithRelations) => ticket.assigneeId === agent.id);
        
        if (agentTickets.length > 0) {
          const groupKey = `agent-${agent.id}`;
          agentGroups.push({
            title: agent.fullName,
            id: agent.id,
            collapsed: collapsedMap[groupKey] ?? false,
            columns: createColumns(agentTickets)
          });
        }
      });
      
      setKanbanGroups(agentGroups);
    }
  }, [tickets, users, activeStatuses]);

  // Alternar colapso de um grupo
  const toggleGroupCollapse = (index: number) => {
    setKanbanGroups(prevGroups => {
      const newGroups = [...prevGroups];
      newGroups[index].collapsed = !newGroups[index].collapsed;
      
      // Salvar estado no localStorage
      const collapsedMap: Record<string, boolean> = {};
      newGroups.forEach((group) => {
        const groupKey = group.id ? `agent-${group.id}` : 'unassigned';
        collapsedMap[groupKey] = group.collapsed;
      });
      localStorage.setItem(KANBAN_COLLAPSED_KEY, JSON.stringify(collapsedMap));
      
      return newGroups;
    });
  };

  // Função para lidar com o início do arraste
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const ticketData = active.data.current;
    
    if (ticketData?.type === 'ticket') {
      setActiveTicket(ticketData.ticket);
    }
  };

  // Função para lidar com o fim do arraste
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTicket(null);
    
    if (!over) return;
    
    const activeData = active.data.current;
    const overData = over.data.current;
    
    // Se arrastou um ticket
    if (activeData?.type === 'ticket') {
      const ticket = activeData.ticket;
      let newStatus: string | undefined;
      let newAssigneeId: number | undefined;
      
      // Se soltou sobre uma coluna
      if (overData?.type === 'column') {
        newStatus = overData.status;
        newAssigneeId = overData.assigneeId;
      }
      // Se soltou sobre outro ticket, pegar o status e assignee desse ticket
      else if (overData?.type === 'ticket') {
        newStatus = overData.ticket.status;
        newAssigneeId = overData.ticket.assigneeId;
      }
      
      // Se o status ou assignee mudou, atualizar o ticket
      if (newStatus && (ticket.status !== newStatus || ticket.assigneeId !== newAssigneeId)) {
        const updates: Partial<Ticket> = { status: newStatus };
        
        // Se moveu para uma coluna de um agente específico, atribuir o ticket
        if (newAssigneeId !== undefined) {
          updates.assigneeId = newAssigneeId;
        }
        
        updateTicketMutation.mutate({
          ticketId: ticket.id,
          updates,
        });
      }
    }
  };

  // Filtrar tickets por pesquisa e prioridade
  const filteredGroups = kanbanGroups.map(group => {
    const filteredColumns = group.columns.map(column => {
      let filteredTickets = column.tickets;
      
      // Filtrar por texto de pesquisa
      if (searchQuery.trim() !== "") {
        filteredTickets = filteredTickets.filter(ticket => 
          ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) || 
          ticket.description.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      
      // Filtrar por prioridade
      if (priorityFilter) {
        filteredTickets = filteredTickets.filter(ticket => 
          ticket.priority === priorityFilter
        );
      }
      
      return { ...column, tickets: filteredTickets };
    });
    
    return { ...group, columns: filteredColumns };
  });

  // Total de tickets
  const totalTickets = (tickets && Array.isArray(tickets)) ? tickets.length : 0;
  
  // Loading quando autenticação ou status estão carregando
  const isLoadingData = isLoading || statusLoading;

function DroppableColumn({ 
  column, 
  groupId, 
  assigneeId
}: { 
  column: KanbanColumn; 
  groupId: string; 
  assigneeId?: number;
}) {
  const {
    setNodeRef,
    isOver,
  } = useSortable({
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
      className={`p-3 ${isOver ? 'bg-blue-50' : ''}`}
    >
      <SortableContext 
        items={column.tickets.map(ticket => `ticket-${ticket.id}`)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2 min-h-[120px]">
          {column.tickets.map((ticket) => (
            <TicketCard 
              key={ticket.id} 
              ticket={ticket} 
              groupId={groupId}
              disableDrag={false}
            />
          ))}
          
          {column.tickets.length === 0 && (
            <div className={`text-center text-muted-foreground text-xs py-8 transition-all ${
              isOver ? 'text-blue-600 opacity-100' : 'opacity-50'
            }`}>
              {isOver ? '↓ Solte aqui' : '-'}
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

  return (
    <AppLayout title="Tickets Kanban" fullWidth={true}>
      <style>{kanbanScrollStyles}</style>
      <div className="w-full py-4 px-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold">Tickets Kanban</h1>
              <p className="text-muted-foreground">
                Total de {totalTickets} registros • 
                Última atualização: {lastUpdate.toLocaleTimeString('pt-BR')}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                onClick={() => setIsNewTicketDialogOpen(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Criar Ticket
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => refetch()}
                disabled={isFetching}
                title="Atualizar agora"
              >
                <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              </Button>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar tickets..."
                  className="pl-8 w-[300px]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className={priorityFilter ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}>
                    <Filter className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Filtrar por prioridade</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    checked={priorityFilter === "critical"}
                    onCheckedChange={() => setPriorityFilter(priorityFilter === "critical" ? null : "critical")}
                  >
                    Crítica
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={priorityFilter === "high"}
                    onCheckedChange={() => setPriorityFilter(priorityFilter === "high" ? null : "high")}
                  >
                    Alta
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={priorityFilter === "medium"}
                    onCheckedChange={() => setPriorityFilter(priorityFilter === "medium" ? null : "medium")}
                  >
                    Média
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={priorityFilter === "low"}
                    onCheckedChange={() => setPriorityFilter(priorityFilter === "low" ? null : "low")}
                  >
                    Baixa
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setPriorityFilter(null)} disabled={!priorityFilter}>
                    Limpar filtro
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>                            
            </div>
          </div>
          
          {isLoadingData ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-8 w-64" />
                  <div className="flex gap-4">
                    {[1, 2, 3, 4, 5].map((j) => (
                      <Skeleton key={j} className="h-[200px] w-full" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : clientRestrictions.isClient ? (
            // Versão sem drag and drop para clientes - Layout em grade
            <div className="space-y-6 overflow-x-auto">
              {/* Cabeçalho fixo com status (compartilhado por todas as linhas) */}
              <div className="border-2 rounded-xl overflow-hidden shadow-md bg-card sticky top-0 z-10 min-w-max">
                <div className="flex items-stretch">
                  {/* Espaço para o nome do agente */}
                  <div className="w-[200px] flex-shrink-0 bg-muted p-4 font-semibold border-r-2 flex items-center">
                    Agente / Status
                  </div>
                  
                  {/* Cabeçalhos de status */}
                  <ScrollableKanbanContainer>
                    <div className="flex min-w-max">
                      {filteredGroups[0]?.columns.map((column, idx) => (
                        <div 
                          key={column.status} 
                            className={`flex-shrink-0 w-[280px] p-4 ${idx > 0 ? 'border-l-2' : ''}`}
                            style={{
                              backgroundColor: hexToRgba(column.color, 0.35)
                            }}
                        >
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-sm truncate">{column.title}</h4>
                            <Badge 
                              variant="secondary" 
                              className="ml-2 text-xs"
                              style={{ 
                                backgroundColor: column.color + '20',
                                borderColor: column.color,
                                color: column.color
                              }}
                            >
                              {filteredGroups.reduce((total, group) => 
                                total + (group.columns.find(c => c.status === column.status)?.tickets.length || 0), 0
                              )}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollableKanbanContainer>
                </div>
              </div>

              {/* Linhas por agente */}
              <div className="space-y-2">
                {filteredGroups.map((group, groupIndex) => (
                  <div key={groupIndex} className="border-2 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow min-w-max">
                    <div className="flex items-stretch">
                      {/* Nome do agente (coluna fixa à esquerda) */}
                      <div 
                        className="w-[200px] flex-shrink-0 bg-muted/30 p-4 border-r-2 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => toggleGroupCollapse(groupIndex)}
                      >
                        <div className="flex items-center gap-2">
                          {group.collapsed ? (
                            <ChevronDown className="h-4 w-4 flex-shrink-0" />
                          ) : (
                            <ChevronUp className="h-4 w-4 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-sm truncate">{group.title}</h3>
                            <Badge variant="secondary" className="text-xs mt-1">
                              {group.columns.reduce((acc, col) => acc + col.tickets.length, 0)} total
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Células por status (alinhadas com o cabeçalho) */}
                      {!group.collapsed && (
                        <ScrollableKanbanContainer>
                          <div className="flex min-w-max">
                            {group.columns.map((column, colIdx) => (
                              <div 
                                key={column.status} 
                                className={`flex-shrink-0 w-[280px] p-3 ${colIdx > 0 ? 'border-l-2' : ''}`}
                                style={{
                                  backgroundColor: hexToRgba(column.color)
                                }}
                              >
                                {/* Cards dos Tickets */}
                                <div className="space-y-2 min-h-[120px]">
                                  {column.tickets.map((ticket) => (
                                    <TicketCard 
                                      key={ticket.id} 
                                      ticket={ticket} 
                                      groupId={`${groupIndex}-${column.status}`}
                                      disableDrag={true}
                                    />
                                  ))}
                                  
                                  {column.tickets.length === 0 && (
                                    <div className="text-center text-muted-foreground text-xs py-8 opacity-50">
                                      -
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollableKanbanContainer>
                      )}
                      
                      {/* Linha colapsada - mostrar resumo */}
                      {group.collapsed && (
                        <div className="flex-1 p-4 flex items-center gap-2">
                          {group.columns.map((column) => (
                            column.tickets.length > 0 && (
                              <Badge 
                                key={column.status}
                                variant="outline" 
                                className="text-xs"
                                style={{ 
                                  borderColor: column.color,
                                  color: column.color
                                }}
                              >
                                {column.tickets.length}
                              </Badge>
                            )
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="space-y-6 overflow-x-auto">
                {/* Cabeçalho fixo com status (compartilhado por todas as linhas) */}
                <div className="border-2 rounded-xl overflow-hidden shadow-md bg-card sticky top-0 z-10 min-w-max">
                  <div className="flex items-stretch">
                    {/* Espaço para o nome do agente */}
                    <div className="w-[200px] flex-shrink-0 bg-muted p-4 font-semibold border-r-2 flex items-center">
                      Agente / Status
                    </div>
                    
                    {/* Cabeçalhos de status */}
                    <ScrollableKanbanContainer>
                      <div className="flex min-w-max">
                        {filteredGroups[0]?.columns.map((column, idx) => (
                          <div 
                            key={column.status} 
                            className={`flex-shrink-0 w-[280px] p-4 ${idx > 0 ? 'border-l-2' : ''}`}
                            style={{
                              backgroundColor: hexToRgba(column.color, 0.35)
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold text-sm truncate">{column.title}</h4>
                              <Badge 
                                variant="secondary" 
                                className="ml-2 text-xs"
                                style={{ 
                                  backgroundColor: column.color + '20',
                                  borderColor: column.color,
                                  color: column.color
                                }}
                              >
                                {filteredGroups.reduce((total, group) => 
                                  total + (group.columns.find(c => c.status === column.status)?.tickets.length || 0), 0
                                )}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollableKanbanContainer>
                  </div>
                </div>

                {/* Linhas por agente */}
                <div className="space-y-2">
                  {filteredGroups.map((group, groupIndex) => (
                    <div key={groupIndex} className="border-2 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow min-w-max">
                      <div className="flex items-stretch">
                        {/* Nome do agente (coluna fixa à esquerda) */}
                        <div 
                          className="w-[200px] flex-shrink-0 bg-muted/30 p-4 border-r-2 cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => toggleGroupCollapse(groupIndex)}
                        >
                          <div className="flex items-center gap-2">
                            {group.collapsed ? (
                              <ChevronDown className="h-4 w-4 flex-shrink-0" />
                            ) : (
                              <ChevronUp className="h-4 w-4 flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-sm truncate">{group.title}</h3>
                              <Badge variant="secondary" className="text-xs mt-1">
                                {group.columns.reduce((acc, col) => acc + col.tickets.length, 0)} total
                              </Badge>
                            </div>
                          </div>
                        </div>

                        {/* Células por status (alinhadas com o cabeçalho) */}
                        {!group.collapsed && (
                          <ScrollableKanbanContainer>
                            <div className="flex min-w-max">
                              {group.columns.map((column, colIdx) => (
                                <div
                                  key={`${groupIndex}-${colIdx}`}
                                  className={`flex-shrink-0 w-[280px] ${colIdx > 0 ? 'border-l-2' : ''}`}
                                  style={{
                                    backgroundColor: hexToRgba(column.color)
                                  }}
                                >
                                  <DroppableColumn
                                    column={column}
                                    groupId={`group-${groupIndex}`}
                                    assigneeId={group.id}
                                  />
                                </div>
                              ))}
                            </div>
                          </ScrollableKanbanContainer>
                        )}
                        
                        {/* Linha colapsada - mostrar resumo */}
                        {group.collapsed && (
                          <div className="flex-1 p-4 flex items-center gap-2">
                            {group.columns.map((column) => (
                              column.tickets.length > 0 && (
                                <Badge 
                                  key={column.status}
                                  variant="outline" 
                                  className="text-xs"
                                  style={{ 
                                    borderColor: column.color,
                                    color: column.color
                                  }}
                                >
                                  {column.tickets.length}
                                </Badge>
                              )
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <DragOverlay>
                {activeTicket ? (
                  <Card className="shadow-lg rotate-3 opacity-90">
                    <CardHeader className="p-3 pb-0">
                      <CardTitle className="text-sm font-medium line-clamp-2">
                        {activeTicket.subject}
                      </CardTitle>
                      <div className="flex gap-1 mt-2">
                        <Badge variant="outline" className="bg-muted/30 border-border text-muted-foreground">
                          #{activeTicket.id}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3 pt-2">
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {activeTicket.description}
                      </p>
                    </CardContent>
                  </Card>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </div>
      
      <NewTicketDialog
        open={isNewTicketDialogOpen}
        onOpenChange={setIsNewTicketDialogOpen}
      />
      </AppLayout>
  );
}