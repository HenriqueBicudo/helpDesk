import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle, CheckCircle, XCircle, Timer } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export interface SlaStatusBadgeProps {
  responseDueAt?: Date | string | null;
  solutionDueAt?: Date | string | null;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'pending' | 'resolved' | 'closed';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showTimeLeft?: boolean;
  variant?: 'default' | 'outline' | 'minimal';
}

interface SlaStatus {
  type: 'within_sla' | 'approaching_breach' | 'breached' | 'no_sla' | 'completed';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  className: string;
  timeLeft?: string;
  isUrgent?: boolean;
}

export const SlaStatusBadge: React.FC<SlaStatusBadgeProps> = ({
  responseDueAt,
  solutionDueAt,
  priority,
  status,
  size = 'md',
  showIcon = true,
  showTimeLeft = true,
  variant = 'default'
}) => {
  const getSlaStatus = (): SlaStatus => {
    const now = new Date();
    const isTicketClosed = status === 'resolved' || status === 'closed';

    // Se o ticket está fechado, mostrar status completo
    if (isTicketClosed) {
      return {
        type: 'completed',
        label: 'SLA Cumprido',
        icon: CheckCircle,
        className: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-100 dark:border-green-700'
      };
    }

    // Determinar qual deadline usar (primeiro response, depois solution)
    let activeDueDate: Date | null = null;
    let deadlineType: 'response' | 'solution' = 'response';

    if (responseDueAt) {
      const responseDate = new Date(responseDueAt);
      if (responseDate > now) {
        activeDueDate = responseDate;
        deadlineType = 'response';
      }
    }

    if (!activeDueDate && solutionDueAt) {
      activeDueDate = new Date(solutionDueAt);
      deadlineType = 'solution';
    }

    // Se não há SLA definido
    if (!activeDueDate) {
      return {
        type: 'no_sla',
        label: 'Sem SLA',
        icon: Timer,
        className: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600'
      };
    }

    const timeUntilDue = activeDueDate.getTime() - now.getTime();
    const hoursUntilDue = timeUntilDue / (1000 * 60 * 60);
    
    // Calcular tempo restante para exibição
    const timeLeft = timeUntilDue > 0 
      ? formatDistanceToNow(activeDueDate, { locale: ptBR })
      : formatDistanceToNow(activeDueDate, { locale: ptBR, addSuffix: true });

    // SLA violado
    if (timeUntilDue < 0) {
      return {
        type: 'breached',
        label: `SLA Violado (${deadlineType === 'response' ? 'Resposta' : 'Solução'})`,
        icon: XCircle,
        className: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-100 dark:border-red-700',
        timeLeft,
        isUrgent: true
      };
    }

    // SLA próximo da violação (baseado na prioridade)
    const urgentThreshold = priority === 'critical' ? 1 : priority === 'high' ? 2 : priority === 'medium' ? 4 : 8;
    
    if (hoursUntilDue <= urgentThreshold) {
      return {
        type: 'approaching_breach',
        label: `SLA Crítico (${deadlineType === 'response' ? 'Resposta' : 'Solução'})`,
        icon: AlertTriangle,
        className: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900 dark:text-orange-100 dark:border-orange-700',
        timeLeft,
        isUrgent: true
      };
    }

    // SLA dentro do prazo
    return {
      type: 'within_sla',
      label: `SLA OK (${deadlineType === 'response' ? 'Resposta' : 'Solução'})`,
      icon: Clock,
      className: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-100 dark:border-blue-700',
      timeLeft
    };
  };

  const slaStatus = getSlaStatus();
  const Icon = slaStatus.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-2.5 py-1.5',
    lg: 'text-base px-3 py-2'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  const variantClasses = {
    default: slaStatus.className,
    outline: `border-2 bg-transparent ${slaStatus.className.replace(/bg-\w+-\d+/, '').replace(/dark:bg-\w+-\d+/, '')}`,
    minimal: `${slaStatus.className.replace(/bg-\w+-\d+/, 'bg-transparent').replace(/dark:bg-\w+-\d+/, 'dark:bg-transparent')} border-0`
  };

  return (
    <div className="flex items-center gap-2">
      <Badge 
        className={cn(
          'flex items-center gap-1.5 font-medium border transition-all duration-200',
          sizeClasses[size],
          variantClasses[variant],
          slaStatus.isUrgent && 'animate-pulse'
        )}
      >
        {showIcon && (
          <Icon className={iconSizes[size]} />
        )}
        <span>{slaStatus.label}</span>
      </Badge>
      
      {showTimeLeft && slaStatus.timeLeft && (
        <span className={cn(
          'text-sm font-medium',
          slaStatus.type === 'breached' ? 'text-red-600 dark:text-red-400' :
          slaStatus.type === 'approaching_breach' ? 'text-orange-600 dark:text-orange-400' :
          'text-gray-600 dark:text-gray-400'
        )}>
          {slaStatus.timeLeft}
        </span>
      )}
    </div>
  );
};

export default SlaStatusBadge;
