import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DEFAULT_TICKET_STATUSES, type TicketStatus } from '@shared/schema/ticket-status';

/**
 * Hook para gerenciar configurações de status de tickets
 * Usa API do backend com fallback para valores padrão
 */
export function useTicketStatusConfig() {
  const queryClient = useQueryClient();

  // Buscar status da API
  const { data: statuses = DEFAULT_TICKET_STATUSES, isLoading } = useQuery<TicketStatus[]>({
    queryKey: ['/api/settings/ticket-statuses'],
    queryFn: async () => {
      const response = await fetch('/api/settings/ticket-statuses', {
        credentials: 'include',
      });
      
      if (!response.ok) {
        // Se falhar, usar valores padrão
        console.warn('Usando status padrão, não foi possível carregar da API');
        return DEFAULT_TICKET_STATUSES;
      }
      
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
    retry: false, // Não tentar novamente em caso de erro
  });

  // Mutation para salvar/atualizar status
  const saveMutation = useMutation({
    mutationFn: async (status: TicketStatus) => {
      const isNew = !statuses.find(s => s.id === status.id);
      const url = isNew 
        ? '/api/settings/ticket-statuses'
        : `/api/settings/ticket-statuses/${status.id}`;
      
      const response = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(status),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao salvar status');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings/ticket-statuses'] });
    },
  });

  // Mutation para deletar status
  const deleteMutation = useMutation({
    mutationFn: async (statusId: string) => {
      const response = await fetch(`/api/settings/ticket-statuses/${statusId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao deletar status');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings/ticket-statuses'] });
    },
  });

  // Adicionar ou atualizar status
  const saveStatus = async (status: TicketStatus) => {
    return saveMutation.mutateAsync(status);
  };

  // Remover status
  const deleteStatus = async (statusId: string) => {
    return deleteMutation.mutateAsync(statusId);
  };

  // Obter status por ID
  const getStatusById = (statusId: string): TicketStatus | undefined => {
    return statuses.find(s => s.id === statusId);
  };

  // Obter status ativos (não fechados) para usar no Kanban
  const getActiveStatuses = (): TicketStatus[] => {
    return statuses
      .filter(s => !s.isClosedStatus)
      .sort((a, b) => a.order - b.order);
  };

  return {
    statuses,
    isLoading,
    saveStatus,
    deleteStatus,
    getStatusById,
    getActiveStatuses,
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
