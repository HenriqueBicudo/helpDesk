import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { User, Requester } from '@shared/schema';

type TicketFiltersProps = {
  onFilterChange: (type: string, value: string) => void;
  filters: {
    status: string;
    priority: string;
    category: string;
    assignee: string;
  };
};

export function TicketFilters({ onFilterChange, filters }: TicketFiltersProps) {
  const { data: users } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });
  
  return (
    <div className="p-4 border-b border-border bg-muted/30">
      <div className="flex flex-wrap gap-3">
        <Select
          value={filters.status}
          onValueChange={(value) => onFilterChange('status', value)}
        >
          <SelectTrigger className="w-[180px] bg-card border-border text-foreground">
            <SelectValue placeholder="Status: Todos" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="all_status">Status: Todos</SelectItem>
            <SelectItem value="open">Aberto</SelectItem>
            <SelectItem value="in_progress">Em andamento</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="resolved">Resolvido</SelectItem>
            <SelectItem value="closed">Fechado</SelectItem>
          </SelectContent>
        </Select>
        
        <Select
          value={filters.priority}
          onValueChange={(value) => onFilterChange('priority', value)}
        >
          <SelectTrigger className="w-[180px] bg-card border-border text-foreground">
            <SelectValue placeholder="Prioridade: Todas" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="all_priority">Prioridade: Todas</SelectItem>
            <SelectItem value="low">Baixa</SelectItem>
            <SelectItem value="medium">Média</SelectItem>
            <SelectItem value="high">Alta</SelectItem>
            <SelectItem value="critical">Crítica</SelectItem>
          </SelectContent>
        </Select>
        
        <Select
          value={filters.category}
          onValueChange={(value) => onFilterChange('category', value)}
        >
          <SelectTrigger className="w-[180px] bg-card border-border text-foreground">
            <SelectValue placeholder="Categoria: Todas" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="all_category">Categoria: Todas</SelectItem>
            <SelectItem value="technical_support">Suporte técnico</SelectItem>
            <SelectItem value="financial">Financeiro</SelectItem>
            <SelectItem value="commercial">Comercial</SelectItem>
            <SelectItem value="other">Outros</SelectItem>
          </SelectContent>
        </Select>
        
        <Select
          value={filters.assignee}
          onValueChange={(value) => onFilterChange('assignee', value)}
        >
          <SelectTrigger className="w-[180px] bg-card border-border text-foreground">
            <SelectValue placeholder="Agente: Todos" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="all_assignee">Agente: Todos</SelectItem>
            {users?.map((user) => (
              <SelectItem key={user.id} value={user.id.toString()}>
                {user.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
