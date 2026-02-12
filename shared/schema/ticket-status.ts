import { z } from "zod";

// Interface para status de tickets personalizáveis
export interface TicketStatus {
  id: string;
  name: string;
  color: string;
  order: number;
  isClosedStatus: boolean;
  pauseSla: boolean;
  autoCloseAfterDays: number | null;
  requiresResponse: boolean;
  notifyCustomer: boolean;
}

// Schema de validação para ticket status
export const ticketStatusConfigSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Nome é obrigatório'),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Cor deve ser hexadecimal'),
  order: z.number().int().positive(),
  isClosedStatus: z.boolean(),
  pauseSla: z.boolean(),
  autoCloseAfterDays: z.number().int().positive().nullable(),
  requiresResponse: z.boolean(),
  notifyCustomer: z.boolean(),
});

// Status padrão do sistema (compatível com enum do PostgreSQL)
export const DEFAULT_TICKET_STATUSES: TicketStatus[] = [
  {
    id: 'open',
    name: 'Aberto',
    color: '#3b82f6',
    order: 1,
    isClosedStatus: false,
    pauseSla: false,
    autoCloseAfterDays: null,
    requiresResponse: true,
    notifyCustomer: true
  },
  {
    id: 'in_progress',
    name: 'Em Atendimento',
    color: '#f59e0b',
    order: 2,
    isClosedStatus: false,
    pauseSla: false,
    autoCloseAfterDays: null,
    requiresResponse: true,
    notifyCustomer: true
  },
  {
    id: 'pending',
    name: 'Pendente',
    color: '#8b5cf6',
    order: 3,
    isClosedStatus: false,
    pauseSla: true,
    autoCloseAfterDays: null,
    requiresResponse: false,
    notifyCustomer: true
  },
  {
    id: 'resolved',
    name: 'Resolvido',
    color: '#10b981',
    order: 4,
    isClosedStatus: false,
    pauseSla: true,
    autoCloseAfterDays: 3,
    requiresResponse: false,
    notifyCustomer: true
  },
  {
    id: 'closed',
    name: 'Fechado',
    color: '#6b7280',
    order: 5,
    isClosedStatus: true,
    pauseSla: true,
    autoCloseAfterDays: null,
    requiresResponse: false,
    notifyCustomer: false
  }
];

// Função helper para obter configuração de um status
export function getStatusConfig(statusId: string, customStatuses?: TicketStatus[]): TicketStatus | undefined {
  const statuses = customStatuses || DEFAULT_TICKET_STATUSES;
  return statuses.find(s => s.id === statusId);
}

// Função helper para verificar se um status pausa SLA
export function shouldPauseSla(statusId: string, customStatuses?: TicketStatus[]): boolean {
  const config = getStatusConfig(statusId, customStatuses);
  return config?.pauseSla ?? false;
}

// Função helper para verificar se é status final
export function isClosedStatus(statusId: string, customStatuses?: TicketStatus[]): boolean {
  const config = getStatusConfig(statusId, customStatuses);
  return config?.isClosedStatus ?? false;
}

// Função helper para obter dias para auto-fechar
export function getAutoCloseDays(statusId: string, customStatuses?: TicketStatus[]): number | null {
  const config = getStatusConfig(statusId, customStatuses);
  return config?.autoCloseAfterDays ?? null;
}
