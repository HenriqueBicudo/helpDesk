import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface SlaTemplate {
  id: number;
  name: string;
  description?: string;
  type: 'support' | 'maintenance' | 'development' | 'consulting' | 'other';
  isActive: boolean;
  rules?: SlaTemplateRule[];  // Tornar opcional para evitar erros de undefined
}

export interface SlaTemplateRule {
  priority: 'critical' | 'high' | 'medium' | 'low';
  responseTimeMinutes: number;
  solutionTimeMinutes: number;
}

export interface BusinessCalendar {
  id: string;
  name: string;
  timezone: string;
  workingHours: {
    monday?: { start: string; end: string };
    tuesday?: { start: string; end: string };
    wednesday?: { start: string; end: string };
    thursday?: { start: string; end: string };
    friday?: { start: string; end: string };
    saturday?: { start: string; end: string };
    sunday?: { start: string; end: string };
  };
  holidays: Array<{
    id: string;
    name: string;
    date: string;
    isRecurring: boolean;
    recurringType?: 'yearly' | 'monthly';
  }>;
  isActive: boolean;
}

export interface SlaCalculation {
  id: number;
  ticketId: number;
  templateId: number;
  calendarId: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  responseTimeMinutes: number;
  solutionTimeMinutes: number;
  responseDueDate: string;
  solutionDueDate: string;
  calculatedAt: string;
  isCurrent: boolean;
  template?: SlaTemplate;
  calendar?: BusinessCalendar;
}

export interface SlaStatistics {
  totalTemplates: number;
  activeTemplates: number;
  totalCalendars: number;
  activeCalendars: number;
  totalCalculations: number;
  todayCalculations: number;
  complianceRate: number;
  averageResponseTime: number;
  averageSolutionTime: number;
  breachedTickets: number;
  nearBreachTickets: number;
}

export interface SlaV2Response<T> {
  data: T;
  success: boolean;
  message?: string;
}

// Hook para buscar templates SLA V2
export function useSlaV2Templates() {
  return useQuery<SlaV2Response<SlaTemplate[]>>({
    queryKey: ['sla-v2', 'templates'],
    queryFn: async () => {
      const response = await fetch('/api/sla/v2/templates');
      if (!response.ok) {
        throw new Error(`Erro ao carregar templates: ${response.status}`);
      }
      return response.json();
    },
  });
}

// Hook para buscar calendários de negócio
export function useSlaV2Calendars() {
  return useQuery<SlaV2Response<BusinessCalendar[]>>({
    queryKey: ['sla-v2', 'calendars'],
    queryFn: async () => {
      const response = await fetch('/api/sla/v2/calendars');
      if (!response.ok) {
        throw new Error(`Erro ao carregar calendários: ${response.status}`);
      }
      return response.json();
    },
  });
}

// Hook para buscar cálculos SLA V2 
export function useSlaV2Calculations(filters?: {
  ticketId?: number;
  templateId?: number;
  priority?: string;
  limit?: number;
}) {
  const searchParams = new URLSearchParams();
  if (filters?.ticketId) searchParams.append('ticketId', filters.ticketId.toString());
  if (filters?.templateId) searchParams.append('templateId', filters.templateId.toString());
  if (filters?.priority) searchParams.append('priority', filters.priority);
  if (filters?.limit) searchParams.append('limit', filters.limit.toString());
  
  return useQuery<SlaV2Response<SlaCalculation[]>>({
    queryKey: ['sla-v2', 'calculations', filters],
    queryFn: async () => {
      const url = `/api/sla/v2/calculations?${searchParams.toString()}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Erro ao carregar cálculos: ${response.status}`);
      }
      return response.json();
    },
  });
}

// Hook para buscar estatísticas SLA V2
export function useSlaV2Statistics() {
  return useQuery<SlaV2Response<SlaStatistics>>({
    queryKey: ['sla-v2', 'statistics'],
    queryFn: async () => {
      const response = await fetch('/api/sla/v2/statistics');
      if (!response.ok) {
        throw new Error(`Erro ao carregar estatísticas: ${response.status}`);
      }
      return response.json();
    },
    refetchInterval: 30000, // Atualiza a cada 30 segundos
  });
}

// Hook para buscar histórico de cálculos de um ticket específico
export function useSlaV2TicketHistory(ticketId: number) {
  return useQuery<SlaV2Response<SlaCalculation[]>>({
    queryKey: ['sla-v2', 'ticket-history', ticketId],
    queryFn: async () => {
      const response = await fetch(`/api/sla/v2/calculations/ticket/${ticketId}/history`);
      if (!response.ok) {
        throw new Error(`Erro ao carregar histórico: ${response.status}`);
      }
      return response.json();
    },
    enabled: !!ticketId,
  });
}

// Hook para recalcular SLA de um ticket
export function useSlaV2Recalculate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ ticketId, reason }: { ticketId: number; reason: string }) => {
      const response = await fetch(`/api/sla/v2/calculations/recalculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId, reason }),
      });
      
      if (!response.ok) {
        throw new Error(`Erro ao recalcular SLA: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: (_, variables) => {
      // Invalidar caches relacionados
      queryClient.invalidateQueries({ queryKey: ['sla-v2', 'calculations'] });
      queryClient.invalidateQueries({ queryKey: ['sla-v2', 'statistics'] });
      queryClient.invalidateQueries({ queryKey: ['sla-v2', 'ticket-history', variables.ticketId] });
    },
  });
}

// Hook para criar/atualizar template SLA V2
export function useSlaV2SaveTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (template: Partial<SlaTemplate>) => {
      const url = template.id ? `/api/sla/v2/templates/${template.id}` : '/api/sla/v2/templates';
      const method = template.id ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(template),
      });
      
      if (!response.ok) {
        throw new Error(`Erro ao salvar template: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sla-v2', 'templates'] });
      queryClient.invalidateQueries({ queryKey: ['sla-v2', 'statistics'] });
    },
  });
}

// Hook para deletar template SLA V2
export function useSlaV2DeleteTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (templateId: number) => {
      const response = await fetch(`/api/sla/v2/templates/${templateId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`Erro ao deletar template: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sla-v2', 'templates'] });
      queryClient.invalidateQueries({ queryKey: ['sla-v2', 'statistics'] });
    },
  });
}

// Hook para salvar calendário de negócio
export function useSlaV2SaveCalendar() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (calendar: Partial<BusinessCalendar>) => {
      const url = calendar.id ? `/api/sla/v2/calendars/${calendar.id}` : '/api/sla/v2/calendars';
      const method = calendar.id ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(calendar),
      });
      
      if (!response.ok) {
        throw new Error(`Erro ao salvar calendário: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sla-v2', 'calendars'] });
      queryClient.invalidateQueries({ queryKey: ['sla-v2', 'statistics'] });
    },
  });
}

// Função utilitária para formatar tempos
export function formatSlaTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}min`;
  } else if (minutes < 1440) { // menos de 24h
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h${remainingMinutes}min` : `${hours}h`;
  } else { // 24h ou mais
    const days = Math.floor(minutes / 1440);
    const remainingHours = Math.floor((minutes % 1440) / 60);
    const remainingMinutes = minutes % 60;
    
    let result = `${days}d`;
    if (remainingHours > 0) result += `${remainingHours}h`;
    if (remainingMinutes > 0) result += `${remainingMinutes}min`;
    
    return result;
  }
}

// Função utilitária para determinar status do SLA
export function getSlaStatus(calculation: SlaCalculation): 'ok' | 'warning' | 'critical' {
  const now = new Date();
  const responseDue = new Date(calculation.responseDueDate);
  const solutionDue = new Date(calculation.solutionDueDate);
  
  // Calcular tempo restante em minutos
  const responseTimeLeft = Math.floor((responseDue.getTime() - now.getTime()) / 60000);
  const solutionTimeLeft = Math.floor((solutionDue.getTime() - now.getTime()) / 60000);
  
  // Se já passou do prazo
  if (responseTimeLeft < 0 || solutionTimeLeft < 0) {
    return 'critical';
  }
  
  // Se está próximo do vencimento (menos de 25% do tempo restante)
  const responseWarningThreshold = calculation.responseTimeMinutes * 0.25;
  const solutionWarningThreshold = calculation.solutionTimeMinutes * 0.25;
  
  if (responseTimeLeft < responseWarningThreshold || solutionTimeLeft < solutionWarningThreshold) {
    return 'warning';
  }
  
  return 'ok';
}

// Função utilitária para calcular tempo restante
export function getTimeRemaining(dueDate: string): { 
  minutes: number; 
  formatted: string; 
  isOverdue: boolean 
} {
  const now = new Date();
  const due = new Date(dueDate);
  const diffMinutes = Math.floor((due.getTime() - now.getTime()) / 60000);
  
  if (diffMinutes < 0) {
    return {
      minutes: Math.abs(diffMinutes),
      formatted: `Atrasado ${formatSlaTime(Math.abs(diffMinutes))}`,
      isOverdue: true,
    };
  }
  
  return {
    minutes: diffMinutes,
    formatted: formatSlaTime(diffMinutes),
    isOverdue: false,
  };
}

// Função utilitária para obter cor do status
export function getSlaStatusColor(status: 'ok' | 'warning' | 'critical'): {
  bg: string;
  text: string;
  border: string;
} {
  switch (status) {
    case 'ok':
      return {
        bg: 'bg-green-100 dark:bg-green-900',
        text: 'text-green-800 dark:text-green-100',
        border: 'border-green-200 dark:border-green-700',
      };
    case 'warning':
      return {
        bg: 'bg-yellow-100 dark:bg-yellow-900',
        text: 'text-yellow-800 dark:text-yellow-100',
        border: 'border-yellow-200 dark:border-yellow-700',
      };
    case 'critical':
      return {
        bg: 'bg-red-100 dark:bg-red-900',
        text: 'text-red-800 dark:text-red-100',
        border: 'border-red-200 dark:border-red-700',
      };
  }
}

// Hook para carregar templates SLA ativos para seleção em contratos
export function useSlaTemplatesForSelection() {
  return useQuery({
    queryKey: ['sla-v2', 'templates', 'selection'],
    queryFn: async () => {
      const response = await fetch('/api/sla/v2/templates?active=true', {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`Erro ao carregar templates: ${response.status}`);
      }
      
      const result = await response.json();
      return result.data as SlaTemplate[];
    },
  });
}