import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

// Helper para normalizar respostas da API que podem vir no formato { success, data }
async function parseApi<T = any>(response: Response): Promise<T> {
  const json = await response.json();
  if (json && typeof json === 'object' && Object.prototype.hasOwnProperty.call(json, 'data')) {
    return json.data as T;
  }
  return json as T;
}

// Interfaces para os dados SLA
export interface SlaData {
  ticketId: string;
  responseDueAt: string | null;
  solutionDueAt: string | null;
  responseStatus: 'pending' | 'completed' | 'breached';
  solutionStatus: 'pending' | 'completed' | 'breached';
  escalationLevel: number;
  lastAlertSent?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SlaMetrics {
  totalTickets: number;
  compliantTickets: number;
  breachedTickets: number;
  compliancePercentage: number;
  averageResponseTime: number;
  averageResolutionTime: number;
  priorityBreakdown: {
    critical: { total: number; breached: number; compliance: number };
    high: { total: number; breached: number; compliance: number };
    medium: { total: number; breached: number; compliance: number };
    low: { total: number; breached: number; compliance: number };
  };
  trends: {
    compliance: number;
    responseTime: number;
    resolutionTime: number;
  };
}

export interface SlaAlert {
  id: string;
  ticketId: string;
  type: 'response_approaching' | 'response_breached' | 'solution_approaching' | 'solution_breached';
  severity: 'warning' | 'critical';
  message: string;
  createdAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
}

export interface SlaConfiguration {
  id: string;
  contractId?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  responseTimeHours: number;
  resolutionTimeHours: number;
  businessHoursOnly: boolean;
  escalationEnabled: boolean;
  escalationLevels: {
    level: number;
    timeAfterHours: number;
    action: 'email' | 'sms' | 'assign_manager' | 'create_incident';
  }[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Hook para dados SLA de um ticket específico
export const useSlaData = (ticketId: string) => {
  return useQuery<SlaData>({
    queryKey: ['sla', 'ticket', ticketId],
    queryFn: async () => {
      const response = await fetch(`/api/sla/tickets/${ticketId}`);
      if (!response.ok) {
        throw new Error('Falha ao carregar dados SLA');
      }
      return parseApi<SlaData>(response);
    },
    enabled: !!ticketId,
    staleTime: 30000, // 30 segundos
    refetchInterval: 60000 // 1 minuto
  });
};

// Hook para métricas SLA gerais
export const useSlaMetrics = (params?: {
  startDate?: string;
  endDate?: string;
  priority?: string;
  agentId?: string;
  contractId?: string;
}) => {
  const queryString = params ? new URLSearchParams(params).toString() : '';
  
  return useQuery<SlaMetrics>({
    queryKey: ['sla', 'metrics', queryString],
    queryFn: async () => {
      const url = `/api/sla/metrics${queryString ? `?${queryString}` : ''}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Falha ao carregar métricas SLA');
      }
      return parseApi<SlaMetrics>(response);
    },
    staleTime: 120000, // 2 minutos
    refetchInterval: 300000 // 5 minutos
  });
};

// Hook para alerts SLA ativos
export const useSlaAlerts = (filters?: {
  severity?: 'warning' | 'critical';
  type?: string;
  acknowledged?: boolean;
  limit?: number;
}) => {
  const queryString = filters ? new URLSearchParams(filters as any).toString() : '';
  
  return useQuery<SlaAlert[]>({
    queryKey: ['sla', 'alerts', queryString],
    queryFn: async () => {
      const url = `/api/sla/alerts${queryString ? `?${queryString}` : ''}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Falha ao carregar alertas SLA');
      }
      return parseApi<SlaAlert[]>(response);
    },
    staleTime: 30000, // 30 segundos
    refetchInterval: 60000 // 1 minuto
  });
};

// Hook para configurações SLA
export const useSlaConfigurations = (contractId?: string) => {
  return useQuery<SlaConfiguration[]>({
    queryKey: ['sla', 'configurations', contractId],
    queryFn: async () => {
      const url = contractId 
        ? `/api/sla/configurations?contractId=${contractId}`
        : '/api/sla/configurations';
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Falha ao carregar configurações SLA');
      }
      return parseApi<SlaConfiguration[]>(response);
    },
    staleTime: 300000, // 5 minutos
  });
};

// Hook para monitoramento SLA em tempo real
export const useSlaMonitoring = () => {
  const queryClient = useQueryClient();

  // Mutation para reconhecer alertas
  const acknowledgeAlert = useMutation({
    mutationFn: async (alertId: string) => {
      const response = await fetch(`/api/sla/alerts/${alertId}/acknowledge`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) {
        throw new Error('Falha ao reconhecer alerta');
      }
      return parseApi(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sla', 'alerts'] });
    }
  });

  // Mutation para reconfigurar SLA
  const updateSlaConfiguration = useMutation({
    mutationFn: async (config: Partial<SlaConfiguration> & { id: string }) => {
      const response = await fetch(`/api/sla/configurations/${config.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (!response.ok) {
        throw new Error('Falha ao atualizar configuração SLA');
      }
      return parseApi(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sla', 'configurations'] });
      queryClient.invalidateQueries({ queryKey: ['sla', 'metrics'] });
    }
  });

  // Mutation para recalcular SLA de um ticket
  const recalculateSla = useMutation({
    mutationFn: async (ticketId: string) => {
      const response = await fetch(`/api/sla/tickets/${ticketId}/recalculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) {
        throw new Error('Falha ao recalcular SLA');
      }
      return parseApi(response);
    },
    onSuccess: (_, ticketId) => {
      queryClient.invalidateQueries({ queryKey: ['sla', 'ticket', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['sla', 'metrics'] });
    }
  });

  // Função para invalidar dados SLA (útil para atualizações em tempo real)
  const invalidateSlaData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['sla'] });
  }, [queryClient]);

  // Função para buscar status SLA de múltiplos tickets
  const getSlaStatus = useCallback(async (ticketIds: string[]) => {
    const response = await fetch('/api/sla/tickets/bulk-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticketIds })
    });
    if (!response.ok) {
      throw new Error('Falha ao carregar status SLA');
    }
    return parseApi(response);
  }, []);

  return {
    acknowledgeAlert,
    updateSlaConfiguration,
    recalculateSla,
    invalidateSlaData,
    getSlaStatus
  };
};

// Hook combinado para dashboard SLA
export const useSlaeDashboard = (filters?: {
  startDate?: string;
  endDate?: string;
  agentId?: string;
  contractId?: string;
}) => {
  const metrics = useSlaMetrics(filters);
  const alerts = useSlaAlerts({ acknowledged: false, limit: 10 });
  const configurations = useSlaConfigurations(filters?.contractId);
  const monitoring = useSlaMonitoring();

  const isLoading = metrics.isLoading || alerts.isLoading || configurations.isLoading;
  const isError = metrics.isError || alerts.isError || configurations.isError;

  const refetchAll = useCallback(() => {
    metrics.refetch();
    alerts.refetch();
    configurations.refetch();
  }, [metrics, alerts, configurations]);

  return {
    metrics: metrics.data,
    alerts: alerts.data || [],
    configurations: configurations.data || [],
    monitoring,
    isLoading,
    isError,
    refetchAll
  };
};

// Utilities para cálculos SLA
export const slaUtils = {
  // Verificar se SLA está próximo do vencimento
  isApproachingBreach: (dueAt: string | null, thresholdHours = 2): boolean => {
    if (!dueAt) return false;
    const due = new Date(dueAt);
    const now = new Date();
    const hoursUntilDue = (due.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilDue <= thresholdHours && hoursUntilDue > 0;
  },

  // Verificar se SLA foi violado
  isBreached: (dueAt: string | null): boolean => {
    if (!dueAt) return false;
    return new Date(dueAt) < new Date();
  },

  // Calcular tempo restante em formato legível
  getTimeRemaining: (dueAt: string | null): string => {
    if (!dueAt) return 'Sem prazo definido';
    
    const due = new Date(dueAt);
    const now = new Date();
    const diff = due.getTime() - now.getTime();
    
    if (diff < 0) {
      const hoursOverdue = Math.abs(diff) / (1000 * 60 * 60);
      return `Atrasado ${hoursOverdue.toFixed(1)} horas`;
    }
    
    const hoursRemaining = diff / (1000 * 60 * 60);
    if (hoursRemaining < 1) {
      const minutesRemaining = Math.floor(diff / (1000 * 60));
      return `${minutesRemaining} minutos restantes`;
    }
    
    return `${hoursRemaining.toFixed(1)} horas restantes`;
  },

  // Obter cor baseada no status SLA
  getStatusColor: (dueAt: string | null, priority: string): string => {
    if (!dueAt) return 'gray';
    
    const isBreached = slaUtils.isBreached(dueAt);
    if (isBreached) return 'red';
    
    const thresholdHours = priority === 'critical' ? 1 : priority === 'high' ? 2 : 4;
    const isApproaching = slaUtils.isApproachingBreach(dueAt, thresholdHours);
    if (isApproaching) return 'orange';
    
    return 'green';
  }
};

export default {
  useSlaData,
  useSlaMetrics,
  useSlaAlerts,
  useSlaConfigurations,
  useSlaMonitoring,
  useSlaeDashboard,
  slaUtils
};
