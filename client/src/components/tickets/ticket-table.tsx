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
          aVal = a.requester.fullName;
          bVal = b.requester.fullName;
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
          aVal = new Date(a.createdAt).getTime();
          bVal = new Date(b.createdAt).getTime();
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
  
  const renderSortIcon = (field: string) => (
    <ArrowUpDown className="ml-1 h-4 w-4 text-gray-400" />
  );
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <p>Carregando chamados...</p>
      </div>
    );
  }
  
  return (
    <Table>
      <TableHeader className="bg-gray-50">
        <TableRow>
          <TableHead className="w-[100px]">
            <button 
              className="flex items-center text-xs font-medium text-gray-500 uppercase"
              onClick={() => handleSort('id')}
            >
              ID {renderSortIcon('id')}
            </button>
          </TableHead>
          <TableHead>
            <button 
              className="flex items-center text-xs font-medium text-gray-500 uppercase"
              onClick={() => handleSort('subject')}
            >
              Assunto {renderSortIcon('subject')}
            </button>
          </TableHead>
          <TableHead>
            <button 
              className="flex items-center text-xs font-medium text-gray-500 uppercase"
              onClick={() => handleSort('requester')}
            >
              Solicitante {renderSortIcon('requester')}
            </button>
          </TableHead>
          <TableHead>
            <button 
              className="flex items-center text-xs font-medium text-gray-500 uppercase"
              onClick={() => handleSort('status')}
            >
              Status {renderSortIcon('status')}
            </button>
          </TableHead>
          <TableHead>
            <button 
              className="flex items-center text-xs font-medium text-gray-500 uppercase"
              onClick={() => handleSort('priority')}
            >
              Prioridade {renderSortIcon('priority')}
            </button>
          </TableHead>
          <TableHead>
            <button 
              className="flex items-center text-xs font-medium text-gray-500 uppercase"
              onClick={() => handleSort('createdAt')}
            >
              Criado em {renderSortIcon('createdAt')}
            </button>
          </TableHead>
          <TableHead>
            <button 
              className="flex items-center text-xs font-medium text-gray-500 uppercase"
              onClick={() => handleSort('assignee')}
            >
              Atribuído {renderSortIcon('assignee')}
            </button>
          </TableHead>
          <TableHead className="text-right text-xs font-medium text-gray-500 uppercase">
            Ações
          </TableHead>
        </TableRow>
      </TableHeader>
      
      <TableBody>
        {sortedTickets.length === 0 ? (
          <TableRow>
            <TableCell colSpan={8} className="text-center py-8 text-gray-500">
              Nenhum chamado encontrado
            </TableCell>
          </TableRow>
        ) : (
          sortedTickets.map((ticket) => (
            <TableRow
              key={ticket.id}
              className="hover:bg-gray-50 cursor-pointer"
              onClick={() => setLocation(`/tickets/${ticket.id}`)}
            >
              <TableCell className="font-medium">
                #{ticket.id.toString().padStart(6, '0')}
              </TableCell>
              <TableCell>
                {ticket.subject}
              </TableCell>
              <TableCell>
                <div className="flex items-center">
                  <Avatar className="h-8 w-8 mr-3">
                    <AvatarFallback className="bg-gray-300 text-gray-700 text-xs">
                      {ticket.requester.avatarInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {ticket.requester.fullName}
                    </div>
                    <div className="text-xs text-gray-500">
                      {ticket.requester.email}
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
              <TableCell className="text-sm text-gray-500">
                {formatDate(ticket.createdAt)}
              </TableCell>
              <TableCell>
                {ticket.assignee ? (
                  <div className="flex items-center">
                    <Avatar className="h-7 w-7 mr-2">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {ticket.assignee.avatarInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-sm text-gray-900">
                      {ticket.assignee.fullName}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <Avatar className="h-7 w-7 mr-2">
                      <AvatarFallback className="bg-gray-100 text-gray-500 text-xs">
                        --
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-sm text-gray-500">
                      Não atribuído
                    </div>
                  </div>
                )}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="text-primary">
                      <MoreHorizontal className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      setLocation(`/tickets/${ticket.id}`);
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
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
