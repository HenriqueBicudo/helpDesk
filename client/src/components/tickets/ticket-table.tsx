import React, { useState } from 'react';
import { useLocation } from 'wouter';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowUpDown, MoreHorizontal } from 'lucide-react';
import { TicketWithRelations } from '@shared/schema';
import { TicketStatusBadge } from './ticket-status-badge';
import { TicketPriorityBadge } from './ticket-priority-badge';
import { SlaStatusBadge } from './sla-status-badge';
import { SlaDueWarning } from './sla-due-warning';
import { formatDate } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

type TicketTableProps = {
  tickets: TicketWithRelations[];
  isLoading: boolean;
};

export function TicketTable({ tickets, isLoading }: TicketTableProps) {
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [, setLocation] = useLocation();
  
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  const sortedTickets = React.useMemo(() => {
    if (!sortField) return tickets;
    
    return [...tickets].sort((a, b) => {
      let aVal: any;
      let bVal: any;
      
      switch (sortField) {
        case 'id':
          aVal = a.id;
          bVal = b.id;
          break;
        case 'subject':
          aVal = a.subject;
          bVal = b.subject;
          break;
        case 'requester':
          aVal = a.requester?.fullName || '';
          bVal = b.requester?.fullName || '';
          break;
        case 'status':
          aVal = a.status;
          bVal = b.status;
          break;
        case 'priority':
          aVal = a.priority;
          bVal = b.priority;
          break;
        case 'createdAt':
          aVal = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          bVal = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          break;
        case 'assignee':
          aVal = a.assignee?.fullName || '';
          bVal = b.assignee?.fullName || '';
          break;
        default:
          return 0;
      }
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [tickets, sortField, sortDirection]);
  
  const renderSortIcon = (_field: string) => (
    <ArrowUpDown className="ml-1 h-4 w-4 text-muted-foreground" />
  );
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <p className="text-muted-foreground">Carregando chamados...</p>
      </div>
    );
  }
  
  return (
    <Table>
      <TableHeader className="bg-muted/30">
        <TableRow>
          <TableHead className="w-[100px]">
            <button 
              className="flex items-center text-xs font-medium text-muted-foreground uppercase"
              onClick={() => handleSort('id')}
            >
              ID {renderSortIcon('id')}
            </button>
          </TableHead>
          <TableHead>
            <button 
              className="flex items-center text-xs font-medium text-muted-foreground uppercase"
              onClick={() => handleSort('subject')}
            >
              Assunto {renderSortIcon('subject')}
            </button>
          </TableHead>
          <TableHead>
            <button 
              className="flex items-center text-xs font-medium text-muted-foreground uppercase"
              onClick={() => handleSort('requester')}
            >
              Solicitante {renderSortIcon('requester')}
            </button>
          </TableHead>
          <TableHead>
            <button 
              className="flex items-center text-xs font-medium text-muted-foreground uppercase"
              onClick={() => handleSort('status')}
            >
              Status {renderSortIcon('status')}
            </button>
          </TableHead>
          <TableHead>
            <button 
              className="flex items-center text-xs font-medium text-muted-foreground uppercase"
              onClick={() => handleSort('priority')}
            >
              Prioridade {renderSortIcon('priority')}
            </button>
          </TableHead>
          <TableHead className="text-xs font-medium text-muted-foreground uppercase">
            SLA
          </TableHead>
          <TableHead>
            <button 
              className="flex items-center text-xs font-medium text-muted-foreground uppercase"
              onClick={() => handleSort('createdAt')}
            >
              Criado em {renderSortIcon('createdAt')}
            </button>
          </TableHead>
          <TableHead>
            <button 
              className="flex items-center text-xs font-medium text-muted-foreground uppercase"
              onClick={() => handleSort('assignee')}
            >
              Atribuído {renderSortIcon('assignee')}
            </button>
          </TableHead>
          <TableHead className="text-right text-xs font-medium text-muted-foreground uppercase">
            Ações
          </TableHead>
        </TableRow>
      </TableHeader>
      
      <TableBody>
        {sortedTickets.length === 0 ? (
          <TableRow>
            <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
              Nenhum chamado encontrado
            </TableCell>
          </TableRow>
        ) : (
          sortedTickets.map((ticket) => (
            <TableRow
              key={ticket.id}
              className="hover:bg-muted/50 cursor-pointer border-b border-border"
              onClick={() => setLocation(`/tickets/${ticket.id}`)}
            >
              <TableCell className="font-medium text-foreground">
                #{ticket.id?.toString().padStart(6, '0') || 'N/A'}
              </TableCell>
              <TableCell className="text-foreground">
                {ticket.subject}
              </TableCell>
              <TableCell>
                <div className="flex items-center">
                  <Avatar className="h-8 w-8 mr-3">
                    <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                      {ticket.requester?.avatarInitials || '--'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      {ticket.requester?.fullName || 'Solicitante desconhecido'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {ticket.requester?.email || '—'}
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <TicketStatusBadge status={ticket.status} />
              </TableCell>
              <TableCell>
                <TicketPriorityBadge priority={ticket.priority} />
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  <SlaStatusBadge 
                    responseDueAt={ticket.responseDueAt || undefined}
                    solutionDueAt={ticket.solutionDueAt || undefined}
                    status={ticket.status}
                    hasFirstResponse={false} // TODO: buscar se há primeira resposta
                  />
                  <SlaDueWarning
                    responseDueAt={ticket.responseDueAt || undefined}
                    solutionDueAt={ticket.solutionDueAt || undefined}
                    hasFirstResponse={false}
                    compact={true}
                  />
                </div>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {ticket.createdAt ? formatDate(ticket.createdAt) : 'N/A'}
              </TableCell>
              <TableCell>
                {ticket.assignee ? (
                  <div className="flex items-center">
                    <Avatar className="h-7 w-7 mr-2">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {ticket.assignee?.avatarInitials || '--'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-sm text-foreground">
                      {ticket.assignee?.fullName || '—'}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <Avatar className="h-7 w-7 mr-2">
                      <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                        --
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-sm text-muted-foreground">
                      Não atribuído
                    </div>
                  </div>
                )}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                      <MoreHorizontal className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-card border-border">
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      setLocation(`/tickets/${ticket.id}`);
                    }} className="text-foreground hover:bg-muted">
                      Ver detalhes
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => e.stopPropagation()} className="text-foreground hover:bg-muted">
                      Atribuir
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => e.stopPropagation()} className="text-foreground hover:bg-muted">
                      Mudar status
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
