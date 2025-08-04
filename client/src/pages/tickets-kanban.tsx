import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Ticket, User, Requester } from "@shared/schema";
import { 
  ChevronDown, 
  ChevronUp, 
  Search, 
  Filter, 
  MoreVertical, 
  CalendarDays
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
} from '@dnd-kit/sortable';
import {
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
import { SlaAlert } from "@/components/tickets/sla-alert";
import { SlaWarningFlag } from "@/components/tickets/sla-warning-flag";
import { SlaInfoCapsule } from "@/components/tickets/sla-info-capsule";
import { SlaDueWarning } from "@/components/tickets/sla-due-warning";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";

type TicketWithRelations = Ticket & {
  requester: Requester;
  assignee?: User;
};

type KanbanColumn = {
  title: string;
  status: string;
  tickets: TicketWithRelations[];
}

type KanbanGroup = {
  title: string;
  id?: number;
  collapsed: boolean;
  columns: KanbanColumn[];
}

// Componente do card de ticket com drag and drop
function TicketCard({ ticket, groupId }: { ticket: TicketWithRelations; groupId: string }) {
  const [, setLocation] = useLocation();
  const [showSlaInfo, setShowSlaInfo] = useState(false);
  
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
    >
      <Card 
        className={`shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer select-none relative group ${
          ticket.priority === 'critical' ? 'ring-2 ring-red-500 ring-opacity-50' : ''
        }`}
        onClick={() => navigateToTicket(ticket.id || 0)}
      >
        {/* Flag de alerta SLA */}
        <SlaWarningFlag
          responseDueAt={ticket.responseDueAt || undefined}
          solutionDueAt={ticket.solutionDueAt || undefined}
          status={ticket.status}
          priority={ticket.priority}
          hasFirstResponse={false} // TODO: verificar se há primeira resposta
        />
        
        <CardHeader className="p-3 pb-0">
          <div className="flex justify-between items-start">
            <CardTitle className="text-sm font-medium line-clamp-2">
              {ticket.subject}
            </CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  navigateToTicket(ticket.id || 0);
                }}>
                  Ver detalhes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                  Atribuir
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                  Mudar status
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {/* Aviso de vencimento SLA */}
          <SlaDueWarning
            responseDueAt={ticket.responseDueAt || undefined}
            solutionDueAt={ticket.solutionDueAt || undefined}
            hasFirstResponse={false} // TODO: verificar se há primeira resposta
            compact={true}
            className="mt-2"
          />
          
          <div className="flex gap-1 mt-2 flex-wrap">
            <TicketStatusBadge status={ticket.status} />
            <Badge variant="outline" className="bg-muted/30 border-border text-muted-foreground">
              #{ticket.id}
            </Badge>
            {/* Alerta de SLA inline */}
            <SlaAlert
              responseDueAt={ticket.responseDueAt || undefined}
              solutionDueAt={ticket.solutionDueAt || undefined}
              status={ticket.status}
              priority={ticket.priority}
              hasFirstResponse={false} // TODO: verificar se há primeira resposta
              showLabel={false}
            />
          </div>
        </CardHeader>
        
        <CardContent className="p-3 pt-2">
          {/* Cápsula de informações SLA */}
          {(ticket.responseDueAt || ticket.solutionDueAt) && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">Informações SLA</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowSlaInfo(!showSlaInfo);
                  }}
                >
                  {showSlaInfo ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </Button>
              </div>
              
              {showSlaInfo && (
                <SlaInfoCapsule
                  responseDueAt={ticket.responseDueAt || undefined}
                  solutionDueAt={ticket.solutionDueAt || undefined}
                  status={ticket.status}
                  priority={ticket.priority}
                  hasFirstResponse={false} // TODO: verificar se há primeira resposta
                  createdAt={ticket.createdAt || new Date()}
                  className="mb-3"
                />
              )}
            </div>
          )}
          
          <p className="text-xs text-muted-foreground line-clamp-2">
            {ticket.description}
          </p>
        </CardContent>
        
        <CardFooter className="p-3 pt-0 flex justify-between items-center text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-xs">
                {getInitials(ticket.requester.fullName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-xs font-medium">{ticket.requester.fullName}</span>
              <span className="text-xs text-muted-foreground">{ticket.requester.company || ''}</span>
            </div>
          </div>
          
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              <span>{formatDate(ticket.createdAt || new Date(), "dd/MM/yyyy")}</span>
            </div>
            <TicketPriorityBadge priority={ticket.priority} />
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function TicketsKanban() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const queryClient = useQueryClient();

  // Estados para controle
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [kanbanGroups, setKanbanGroups] = useState<KanbanGroup[]>([]);
  const [activeTicket, setActiveTicket] = useState<TicketWithRelations | null>(null);

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
  const { data: tickets, isLoading } = useQuery<TicketWithRelations[]>({ 
    queryKey: ["/api/tickets"], 
  });

  // Buscar todos os usuários
  const { data: users } = useQuery<User[]>({ 
    queryKey: ["/api/users"], 
  });

  // Agrupar tickets por responsáveis quando os dados forem carregados
  useEffect(() => {
    if (tickets && users) {
      const agentGroups: KanbanGroup[] = [];
      
      // Filtra os tickets ativos (excluindo resolvidos e fechados)
      const activeTickets = tickets.filter(ticket => 
        ticket.status !== "resolved" && ticket.status !== "closed"
      );
      
      // Criar um grupo para tickets não atribuídos
      const unassignedTickets = activeTickets.filter(ticket => !ticket.assigneeId);
      if (unassignedTickets.length > 0) {
        agentGroups.push({
          title: "Não atribuídos",
          collapsed: false,
          columns: [
            { title: "Aberto", status: "open", tickets: unassignedTickets.filter(t => t.status === "open") },
            { title: "Em Andamento", status: "in_progress", tickets: unassignedTickets.filter(t => t.status === "in_progress") },
            { title: "Pendente", status: "pending", tickets: unassignedTickets.filter(t => t.status === "pending") },
          ]
        });
      }
      
      // Agrupar por responsável
      users.forEach(agent => {
        const agentTickets = activeTickets.filter(ticket => ticket.assigneeId === agent.id);
        
        if (agentTickets.length > 0) {
          agentGroups.push({
            title: agent.fullName,
            id: agent.id,
            collapsed: false,
            columns: [
              { title: "Aberto", status: "open", tickets: agentTickets.filter(t => t.status === "open") },
              { title: "Em Andamento", status: "in_progress", tickets: agentTickets.filter(t => t.status === "in_progress") },
              { title: "Pendente", status: "pending", tickets: agentTickets.filter(t => t.status === "pending") },
            ]
          });
        }
      });
      
      setKanbanGroups(agentGroups);
    }
  }, [tickets, users]);

  // Alternar colapso de um grupo
  const toggleGroupCollapse = (index: number) => {
    setKanbanGroups(prevGroups => {
      const newGroups = [...prevGroups];
      newGroups[index].collapsed = !newGroups[index].collapsed;
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
    
    if (activeData?.type === 'ticket' && overData?.type === 'column') {
      const ticket = activeData.ticket;
      const newStatus = overData.status;
      const newAssigneeId = overData.assigneeId;
      
      // Se o status ou assignee mudou, atualizar o ticket
      if (ticket.status !== newStatus || ticket.assigneeId !== newAssigneeId) {
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
  const totalTickets = tickets?.length || 0;
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
      className={`flex-1 min-w-[250px] ${isOver ? 'bg-blue-50 border-2 border-blue-200 border-dashed rounded-lg' : ''}`}
    >
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-medium text-sm">{column.title}</h3>
        <Badge variant="outline">{column.tickets.length}</Badge>
      </div>
      
      <SortableContext 
        items={column.tickets.map(ticket => `ticket-${ticket.id}`)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-3 min-h-[100px]">
          {column.tickets.map((ticket) => (
            <TicketCard 
              key={ticket.id} 
              ticket={ticket} 
              groupId={groupId}
            />
          ))}
          
          {column.tickets.length === 0 && (
            <div className={`border border-dashed rounded-md p-4 text-center text-muted-foreground text-sm transition-colors ${
              isOver ? 'border-blue-300 bg-blue-50' : ''
            }`}>
              {isOver ? 'Solte o ticket aqui' : 'Sem tickets'}
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        
        <div className="container mx-auto py-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold">Tickets Kanban</h1>
              <p className="text-muted-foreground">Total de {totalTickets} registros</p>
            </div>
            
            <div className="flex items-center gap-2">
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
          
          {isLoading ? (
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
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="space-y-6">
                {filteredGroups.map((group, groupIndex) => (
                  <div key={groupIndex} className="border rounded-lg overflow-hidden">
                    {/* Cabeçalho do Grupo */}
                    <div 
                      className="flex justify-between items-center p-3 bg-muted cursor-pointer"
                      onClick={() => toggleGroupCollapse(groupIndex)}
                    >
                      <div className="flex items-center gap-2">
                        {group.collapsed ? (
                          <ChevronDown className="h-5 w-5" />
                        ) : (
                          <ChevronUp className="h-5 w-5" />
                        )}
                        <span className="font-medium">{group.title}</span>
                      </div>
                      
                      <div className="text-sm text-muted-foreground">
                        {group.columns.reduce((acc, col) => acc + col.tickets.length, 0)} tickets
                      </div>
                    </div>
                    
                    {/* Conteúdo do Grupo (colunas e tickets) */}
                    {!group.collapsed && (
                      <div className="flex gap-4 p-4">
                        {group.columns.map((column, colIndex) => (
                          <DroppableColumn
                            key={`${groupIndex}-${colIndex}`}
                            column={column}
                            groupId={`group-${groupIndex}`}
                            assigneeId={group.id}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
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
      </div>
    </div>
  );
}