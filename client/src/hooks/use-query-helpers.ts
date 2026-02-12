import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

/**
 * Hook para gerenciar invalidação automática de queries
 * Útil para sincronizar dados entre diferentes componentes/páginas
 */
export function useAutoRefresh(queryKeys: string[], intervalMs: number = 30000) {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    // Configurar intervalo de atualização
    const interval = setInterval(() => {
      queryKeys.forEach(key => {
        queryClient.invalidateQueries({ queryKey: [key] });
      });
    }, intervalMs);
    
    return () => clearInterval(interval);
  }, [queryClient, queryKeys, intervalMs]);
}

/**
 * Hook para invalidar queries relacionadas a tickets
 * Útil após mutações que afetam tickets
 */
export function useInvalidateTickets() {
  const queryClient = useQueryClient();
  
  return {
    invalidateTickets: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tickets'] });
    },
    invalidateTicket: (ticketId: number) => {
      queryClient.invalidateQueries({ queryKey: [`/api/tickets/${ticketId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/tickets/${ticketId}/interactions`] });
      queryClient.invalidateQueries({ queryKey: ['/api/tickets'] }); // Lista também
    },
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tickets'] });
      queryClient.invalidateQueries({ predicate: (query) => 
        query.queryKey[0]?.toString().startsWith('/api/tickets/') || false
      });
    }
  };
}

/**
 * Hook para invalidar queries relacionadas a usuários
 */
export function useInvalidateUsers() {
  const queryClient = useQueryClient();
  
  return {
    invalidateUsers: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    },
    invalidateUser: (userId: number) => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    }
  };
}

/**
 * Hook para sincronização em tempo real (simulada via polling)
 */
export function useRealtimeSync(enabled: boolean = true) {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    if (!enabled) return;
    
    // Atualizar tickets a cada 30 segundos
    const ticketsInterval = setInterval(() => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/tickets'],
        refetchType: 'active' // Só refaz queries ativas
      });
    }, 30000);
    
    // Atualizar notificações a cada 1 minuto
    const notificationsInterval = setInterval(() => {
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0]?.toString();
          return key?.includes('notifications') || key?.includes('interactions') || false;
        }
      });
    }, 60000);
    
    return () => {
      clearInterval(ticketsInterval);
      clearInterval(notificationsInterval);
    };
  }, [queryClient, enabled]);
}
