import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Ticket, User, Requester } from "@shared/schema";
import { 
  ChevronDown, 
  ChevronUp, 
  Search, 
  Filter, 
  MoreVertical, 
  CalendarDays, 
  Clock,
  Plus
} from "lucide-react";
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
import { formatDate, getInitials, translateStatus, statusToColor, priorityToColor, translatePriority } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
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

export default function TicketsKanban() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Estados para controle
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [kanbanGroups, setKanbanGroups] = useState<KanbanGroup[]>([]);

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

  // Função para navegar para a página de detalhes do ticket
  const navigateToTicket = (ticketId: number) => {
    if (ticketId) {
      setLocation(`/tickets/${ticketId}`);
    }
  };

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
                        <div key={colIndex} className="flex-1 min-w-[250px]">
                          <div className="flex justify-between items-center mb-2">
                            <h3 className="font-medium text-sm">{column.title}</h3>
                            <Badge variant="outline">{column.tickets.length}</Badge>
                          </div>
                          
                          <div className="space-y-3">
                            {column.tickets.map((ticket) => (
                              <Card 
                                key={ticket.id} 
                                className="shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer"
                                onClick={() => navigateToTicket(ticket.id || 0)}
                              >
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
                                          onClick={(e) => e.stopPropagation()}  // Impedir propagação do clique
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
                                  <div className="flex gap-1 mt-2">
                                    <Badge 
                                      variant="outline"
                                      className={`bg-${statusToColor(ticket.status)}-50 text-${statusToColor(ticket.status)}-700 border-${statusToColor(ticket.status)}-200`}
                                    >
                                      {translateStatus(ticket.status)}
                                    </Badge>
                                    <Badge variant="outline" className="bg-gray-50">
                                      #{ticket.id}
                                    </Badge>
                                  </div>
                                </CardHeader>
                                
                                <CardContent className="p-3 pt-2">
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
                                    <Badge variant="outline" className={`bg-${priorityToColor(ticket.priority)}-50 text-${priorityToColor(ticket.priority)}-700 text-[10px] py-0 px-1 h-4`}>
                                      {translatePriority(ticket.priority)}
                                    </Badge>
                                  </div>
                                </CardFooter>
                              </Card>
                            ))}
                            
                            {column.tickets.length === 0 && (
                              <div className="border border-dashed rounded-md p-4 text-center text-muted-foreground text-sm">
                                Sem tickets
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}