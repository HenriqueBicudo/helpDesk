import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/app-layout';
import { TicketTable } from '@/components/tickets/ticket-table';
import { TicketFilters } from '@/components/tickets/ticket-filters';
import { TicketsPagination } from '@/components/tickets/tickets-pagination';
import { NewTicketDialog } from '@/components/tickets/new-ticket-dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import { TicketWithRelations } from '@shared/schema';

export default function Tickets() {
  const [isNewTicketDialogOpen, setIsNewTicketDialogOpen] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    category: '',
    assignee: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Fetch all tickets with relations
  const { data: allTickets, isLoading } = useQuery<TicketWithRelations[]>({
    queryKey: ['/api/tickets'],
  });
  
  // Apply filters to tickets
  const filteredTickets = React.useMemo(() => {
    if (!allTickets) return [];
    
    return allTickets.filter(ticket => {
      if (filters.status && filters.status !== 'all_status' && ticket.status !== filters.status) return false;
      if (filters.priority && filters.priority !== 'all_priority' && ticket.priority !== filters.priority) return false;
      if (filters.category && filters.category !== 'all_category' && ticket.category !== filters.category) return false;
      if (filters.assignee && filters.assignee !== 'all_assignee' && (!ticket.assigneeId || ticket.assigneeId.toString() !== filters.assignee)) return false;
      return true;
    });
  }, [allTickets, filters]);
  
  // Get current page tickets
  const currentTickets = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredTickets.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTickets, currentPage, itemsPerPage]);
  
  // Calculate total pages
  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage);
  
  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);
  
  const handleFilterChange = (type: string, value: string) => {
    setFilters(prev => ({ ...prev, [type]: value }));
  };
  
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };
  
  // Tickets Header Actions
  const TicketsActions = () => (
    <div className="flex space-x-2">
      <Button 
        className="flex items-center shadow-sm"
        onClick={() => setIsNewTicketDialogOpen(true)}
      >
        <Plus className="mr-1.5 h-4 w-4" />
        <span>Novo Chamado</span>
      </Button>
    </div>
  );
  
  return (
    <AppLayout title="Chamados">
      <div className="flex flex-col md:flex-row items-center justify-between pb-4 mb-4 border-b border-border">
        <h1 className="text-2xl font-semibold text-foreground mb-4 md:mb-0">Chamados</h1>
        <TicketsActions />
      </div>
      
      <Card className="overflow-hidden mb-6">
        <TicketFilters
          onFilterChange={handleFilterChange}
          filters={filters}
        />
        
        <TicketTable 
          tickets={currentTickets} 
          isLoading={isLoading}
        />
        
        {!isLoading && filteredTickets.length > 0 && (
          <TicketsPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredTickets.length}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
          />
        )}
      </Card>
      
      {/* New Ticket Dialog */}
      <NewTicketDialog
        open={isNewTicketDialogOpen}
        onOpenChange={setIsNewTicketDialogOpen}
      />
    </AppLayout>
  );
}
