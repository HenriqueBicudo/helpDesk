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
      <TableHeader className="bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900">
        <TableRow className="border-b-2 border-gray-200 dark:border-gray-700">
          <TableHead className="w-[100px]">
            <button 
              className="flex items-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide hover:text-primary transition-colors"
              onClick={() => handleSort('id')}
            >
              ID {renderSortIcon('id')}
            </button>
          </TableHead>
          <TableHead>
            <button 
              className="flex items-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide hover:text-primary transition-colors"
              onClick={() => handleSort('subject')}
            >
              Assunto {renderSortIcon('subject')}
            </button>
          </TableHead>
          <TableHead>
            <button 
              className="flex items-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide hover:text-primary transition-colors"
              onClick={() => handleSort('requester')}
            >
              Solicitante {renderSortIcon('requester')}
            </button>
          </TableHead>
          <TableHead>
            <button 
              className="flex items-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide hover:text-primary transition-colors"
              onClick={() => handleSort('status')}
            >
              Status {renderSortIcon('status')}
            </button>
          </TableHead>
          <TableHead>
            <button 
              className="flex items-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide hover:text-primary transition-colors"
              onClick={() => handleSort('priority')}
            >
              Prioridade {renderSortIcon('priority')}
            </button>
          </TableHead>
          <TableHead className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
            SLA
          </TableHead>
          <TableHead>
            <button 
              className="flex items-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide hover:text-primary transition-colors"
              onClick={() => handleSort('createdAt')}
            >
              Criado em {renderSortIcon('createdAt')}
            </button>
          </TableHead>
          <TableHead>
            <button 
              className="flex items-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide hover:text-primary transition-colors"
              onClick={() => handleSort('assignee')}
            >
              Atribuído {renderSortIcon('assignee')}
            </button>
          </TableHead>
          <TableHead className="text-right text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
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
              className="hover:bg-blue-50 dark:hover:bg-blue-950/20 cursor-pointer border-b transition-colors group"
              onClick={() => setLocation(`/tickets/${ticket.id}`)}
            >
              <TableCell className="font-bold text-gray-900 dark:text-gray-100">
                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-md text-xs font-mono">
                  #{ticket.id?.toString().padStart(6, '0') || 'N/A'}
                </span>
              </TableCell>
              <TableCell className="font-medium text-gray-900 dark:text-gray-100">
                <span className="group-hover:text-primary transition-colors">{ticket.subject}</span>
              </TableCell>
              <TableCell>
                <div className="flex items-center">
                  <Avatar className="h-8 w-8 mr-3 ring-2 ring-gray-200 dark:ring-gray-700">
                    <AvatarFallback className="bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 text-blue-700 dark:text-blue-300 text-xs font-semibold">
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
                    status={ticket.status}
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
