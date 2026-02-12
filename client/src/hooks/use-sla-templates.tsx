import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface SlaTemplateRule {
  priority: 'low' | 'medium' | 'high' | 'critical';
  responseTimeMinutes: number;
  solutionTimeMinutes: number;
}

export interface SlaTemplate {
  id: string;
  name: string;
  description: string | null;
  type: string;
  rules: SlaTemplateRule[];
  isActive: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApplyTemplateRequest {
  templateId: string;
  contractId: string;
  replaceExisting?: boolean;
}

/**
 * Hook para buscar todos os templates SLA
 */
export function useSlaTemplates(includeInactive = false) {
  return useQuery({
    queryKey: ['slaTemplates', includeInactive],
    queryFn: async () => {
      const url = `/api/sla/templates${includeInactive ? '?includeInactive=true' : ''}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Erro ao carregar templates SLA');
      }
      const result = await response.json();
      return result.data as SlaTemplate[];
    }
  });
}

/**
 * Hook para buscar templates por tipo
 */
export function useSlaTemplatesByType(type: string) {
  return useQuery({
    queryKey: ['slaTemplates', 'byType', type],
    queryFn: async () => {
      const response = await fetch(`/api/sla/templates/by-type/${type}`);
      if (!response.ok) {
        throw new Error('Erro ao carregar templates SLA por tipo');
      }
      const result = await response.json();
      return result.data as SlaTemplate[];
    },
    enabled: !!type
  });
}

/**
 * Hook para aplicar template a um contrato
 */
export function useApplySlaTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ templateId, contractId, replaceExisting = false }: ApplyTemplateRequest) => {
      const response = await fetch(
        `/api/sla/templates/${templateId}/apply/${contractId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ replaceExisting })
        }
      );
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao aplicar template SLA');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalida queries relacionadas para refetch
      queryClient.invalidateQueries({ queryKey: ['slaConfigurations'] });
      queryClient.invalidateQueries({ queryKey: ['slaRules'] });
    }
  });
}

/**
 * Hook para deletar/desativar template
 */
export function useDeleteSlaTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ templateId, hardDelete = false }: { templateId: string; hardDelete?: boolean }) => {
      const url = `/api/sla/templates/${templateId}${hardDelete ? '?hard=true' : ''}`;
      const response = await fetch(url, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao deletar template SLA');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slaTemplates'] });
    }
  });
}

/**
 * Hook para criar ou atualizar template
 */
export function useSaveTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      templateId, 
      data 
    }: { 
      templateId?: string; 
      data: {
        name: string;
        description?: string;
        type: string;
        rules: SlaTemplateRule[];
      }
    }) => {
      const url = templateId ? `/api/sla/templates/${templateId}` : '/api/sla/templates';
      const method = templateId ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          rules: JSON.stringify(data.rules)
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao salvar template SLA');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slaTemplates'] });
    }
  });
}

/**
 * Helper: Converte minutos para formato de exibição (ex: "2h", "30min", "72h")
 */
export function formatTimeMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}min`;
  }
  
  const hours = minutes / 60;
  if (hours < 24) {
    return `${hours}h`;
  }
  
  const days = hours / 24;
  return `${days}d`;
}

/**
 * Helper: Calcula tempos de resposta e solução principais de um template
 */
export function getTemplateMainTimes(template: SlaTemplate): { responseTime: string; resolutionTime: string } {
  // Pega as regras de prioridade média como referência
  const mediumRule = template.rules.find(r => r.priority === 'medium');
  if (mediumRule) {
    return {
      responseTime: formatTimeMinutes(mediumRule.responseTimeMinutes),
      resolutionTime: formatTimeMinutes(mediumRule.solutionTimeMinutes)
    };
  }
  
  // Fallback: pega a primeira regra
  if (template.rules.length > 0) {
    const firstRule = template.rules[0];
    return {
      responseTime: formatTimeMinutes(firstRule.responseTimeMinutes),
      resolutionTime: formatTimeMinutes(firstRule.solutionTimeMinutes)
    };
  }
  
  return { responseTime: '-', resolutionTime: '-' };
}

/**
 * Helper: Conta quantos contratos usam cada template (seria necessária uma API para isso)
 * Por enquanto retorna 0, mas pode ser implementado quando tivermos a relação
 */
export function getTemplateUsageCount(templateId: string): number {
  // TODO: Implementar quando houver endpoint para contar uso de templates
  return 0;
}
