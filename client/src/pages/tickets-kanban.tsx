import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Ticket, User, Requester } from "@shared/schema";
import { 
  ChevronDown, 
  ChevronUp, 
  Search, 
  Filter, 
  MoreVertical, 
  CalendarDays, 
  Clock 
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
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, getInitials, translateStatus, statusToColor } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

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

  // Estado para controlar a pesquisa
  const [searchQuery, setSearchQuery] = useState("");
  
  // Estado para controlar os grupos de kanban
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
      
      // Criar um grupo para tickets não atribuídos
      const unassignedTickets = tickets.filter(ticket => !ticket.assigneeId);
      if (unassignedTickets.length > 0) {
        agentGroups.push({
          title: "Não atribuídos",
          collapsed: false,
          columns: [
            { title: "Aberto", status: "open", tickets: unassignedTickets.filter(t => t.status === "open") },
            { title: "Em Andamento", status: "in_progress", tickets: unassignedTickets.filter(t => t.status === "in_progress") },
            { title: "Pendente", status: "pending", tickets: unassignedTickets.filter(t => t.status === "pending") },
            { title: "Resolvido", status: "resolved", tickets: unassignedTickets.filter(t => t.status === "resolved") },
            { title: "Fechado", status: "closed", tickets: unassignedTickets.filter(t => t.status === "closed") },
          ]
        });
      }
      
      // Agrupar por responsável
      users.forEach(agent => {
        const agentTickets = tickets.filter(ticket => ticket.assigneeId === agent.id);
        
        if (agentTickets.length > 0) {
          agentGroups.push({
            title: agent.fullName,
            id: agent.id,
            collapsed: false,
            columns: [
              { title: "Aberto", status: "open", tickets: agentTickets.filter(t => t.status === "open") },
              { title: "Em Andamento", status: "in_progress", tickets: agentTickets.filter(t => t.status === "in_progress") },
              { title: "Pendente", status: "pending", tickets: agentTickets.filter(t => t.status === "pending") },
              { title: "Resolvido", status: "resolved", tickets: agentTickets.filter(t => t.status === "resolved") },
              { title: "Fechado", status: "closed", tickets: agentTickets.filter(t => t.status === "closed") },
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

  // Filtrar tickets por pesquisa
  const filteredGroups = kanbanGroups.map(group => {
    if (searchQuery.trim() === "") return group;
    
    const filteredColumns = group.columns.map(column => {
      const filteredTickets = column.tickets.filter(ticket => 
        ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) || 
        ticket.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
      
      return { ...column, tickets: filteredTickets };
    });
    
    return { ...group, columns: filteredColumns };
  });

  // Total de tickets
  const totalTickets = tickets?.length || 0;

  return (
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
          
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
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
                          <Card key={ticket.id} className="shadow-sm hover:shadow transition-shadow duration-200">
                            <CardHeader className="p-3 pb-0">
                              <div className="flex justify-between items-start">
                                <CardTitle className="text-sm font-medium line-clamp-2">
                                  {ticket.subject}
                                </CardTitle>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem>Ver detalhes</DropdownMenuItem>
                                    <DropdownMenuItem>Atribuir</DropdownMenuItem>
                                    <DropdownMenuItem>Mudar status</DropdownMenuItem>
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
                                <span>{ticket.requester.fullName}</span>
                              </div>
                              
                              <div className="flex items-center gap-1">
                                <CalendarDays className="h-3 w-3" />
                                <span>{formatDate(ticket.createdAt || new Date(), "dd/MM")}</span>
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
  );
}