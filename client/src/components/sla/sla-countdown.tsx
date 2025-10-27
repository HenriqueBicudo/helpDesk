import React, { useState, useEffect } from 'react';
import { Clock, Timer, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { formatDistanceToNow, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export interface SlaCountdownProps {
  responseDueAt?: Date | string | null;
  solutionDueAt?: Date | string | null;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'pending' | 'resolved' | 'closed';
  size?: 'sm' | 'md' | 'lg';
  showProgressBar?: boolean;
  showPercentage?: boolean;
  realTimeUpdate?: boolean;
}

interface CountdownState {
  timeLeft: string;
  percentage: number;
  isBreached: boolean;
  isUrgent: boolean;
  deadlineType: 'response' | 'solution' | 'none';
  totalMinutes: number;
  remainingMinutes: number;
}

export const SlaCountdown: React.FC<SlaCountdownProps> = ({
  responseDueAt,
  solutionDueAt,
  priority,
  status,
  size = 'md',
  showProgressBar = true,
  showPercentage = false,
  realTimeUpdate = true
}) => {
  const [countdown, setCountdown] = useState<CountdownState>({
    timeLeft: '--',
    percentage: 0,
    isBreached: false,
    isUrgent: false,
    deadlineType: 'none',
    totalMinutes: 0,
    remainingMinutes: 0
  });

  const calculateCountdown = (): CountdownState => {
    const now = new Date();
    const isTicketClosed = status === 'resolved' || status === 'closed';

    if (isTicketClosed) {
      return {
        timeLeft: 'Concluído',
        percentage: 100,
        isBreached: false,
        isUrgent: false,
        deadlineType: 'none',
        totalMinutes: 0,
        remainingMinutes: 0
      };
    }

    // Determinar qual deadline usar
    let activeDueDate: Date | null = null;
    let deadlineType: 'response' | 'solution' | 'none' = 'none';
    let createdAt = new Date(); // Assumindo criação agora, idealmente viria como prop

    if (responseDueAt) {
      const responseDate = new Date(responseDueAt);
      if (responseDate > now || !solutionDueAt) {
        activeDueDate = responseDate;
        deadlineType = 'response';
      }
    }

    if (!activeDueDate && solutionDueAt) {
      activeDueDate = new Date(solutionDueAt);
      deadlineType = 'solution';
    }

    if (!activeDueDate) {
      return {
        timeLeft: 'Sem SLA',
        percentage: 0,
        isBreached: false,
        isUrgent: false,
        deadlineType: 'none',
        totalMinutes: 0,
        remainingMinutes: 0
      };
    }

    const timeUntilDue = activeDueDate.getTime() - now.getTime();
    const totalMinutes = differenceInMinutes(activeDueDate, createdAt);
    const remainingMinutes = Math.max(0, differenceInMinutes(activeDueDate, now));
    const percentage = totalMinutes > 0 ? Math.min(100, Math.max(0, (remainingMinutes / totalMinutes) * 100)) : 0;

    const isBreached = timeUntilDue < 0;
    const hoursUntilDue = timeUntilDue / (1000 * 60 * 60);
    
    // Definir urgência baseada na prioridade
    const urgentThreshold = priority === 'critical' ? 1 : priority === 'high' ? 2 : priority === 'medium' ? 4 : 8;
    const isUrgent = Math.abs(hoursUntilDue) <= urgentThreshold;

    const timeLeft = isBreached
      ? `Atrasado ${formatDistanceToNow(activeDueDate, { locale: ptBR })}`
      : formatDistanceToNow(activeDueDate, { locale: ptBR });

    return {
      timeLeft,
      percentage,
      isBreached,
      isUrgent,
      deadlineType,
      totalMinutes,
      remainingMinutes
    };
  };

  useEffect(() => {
    const updateCountdown = () => {
      setCountdown(calculateCountdown());
    };

    updateCountdown();

    if (!realTimeUpdate) return;

    const interval = setInterval(updateCountdown, 30000); // Atualizar a cada 30 segundos
    return () => clearInterval(interval);
  }, [responseDueAt, solutionDueAt, priority, status, realTimeUpdate]);

  const getProgressBarColor = () => {
    if (countdown.isBreached) return 'bg-red-500';
    if (countdown.percentage <= 25) return 'bg-red-500';
    if (countdown.percentage <= 50) return 'bg-orange-500';
    if (countdown.percentage <= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getTextColor = () => {
    if (countdown.isBreached) return 'text-red-600 dark:text-red-400';
    if (countdown.isUrgent) return 'text-orange-600 dark:text-orange-400';
    return 'text-gray-700 dark:text-gray-300';
  };

  const getIcon = () => {
    if (countdown.isBreached) return AlertTriangle;
    if (countdown.deadlineType === 'response') return Timer;
    return Clock;
  };

  const Icon = getIcon();

  const sizeClasses = {
    sm: {
      text: 'text-xs',
      icon: 'h-3 w-3',
      container: 'gap-1.5',
      progress: 'h-1'
    },
    md: {
      text: 'text-sm',
      icon: 'h-4 w-4',
      container: 'gap-2',
      progress: 'h-2'
    },
    lg: {
      text: 'text-base',
      icon: 'h-5 w-5',
      container: 'gap-2.5',
      progress: 'h-3'
    }
  };

  if (countdown.deadlineType === 'none') {
    return (
      <div className={cn('flex items-center', sizeClasses[size].container)}>
        <Timer className={cn(sizeClasses[size].icon, 'text-gray-400')} />
        <span className={cn(sizeClasses[size].text, 'text-gray-500')}>
          Sem SLA definido
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className={cn('flex items-center', sizeClasses[size].container)}>
        <Icon 
          className={cn(
            sizeClasses[size].icon,
            getTextColor(),
            countdown.isUrgent && 'animate-pulse'
          )} 
        />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className={cn(
              sizeClasses[size].text,
              'font-medium',
              getTextColor()
            )}>
              {countdown.deadlineType === 'response' ? 'Resposta' : 'Solução'}: {countdown.timeLeft}
            </span>
            {showPercentage && (
              <span className={cn(
                sizeClasses[size].text,
                'font-mono',
                getTextColor()
              )}>
                {countdown.percentage.toFixed(0)}%
              </span>
            )}
          </div>
        </div>
      </div>

      {showProgressBar && (
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={cn(
              'transition-all duration-500 ease-out rounded-full',
              sizeClasses[size].progress,
              getProgressBarColor(),
              countdown.isUrgent && 'animate-pulse'
            )}
            style={{ width: `${Math.min(100, Math.max(0, countdown.percentage))}%` }}
          />
        </div>
      )}

      {countdown.isBreached && (
        <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
          <TrendingDown className="h-3 w-3" />
          <span>SLA violado - Ação urgente necessária</span>
        </div>
      )}

      {countdown.isUrgent && !countdown.isBreached && (
        <div className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400">
          <TrendingUp className="h-3 w-3" />
          <span>SLA próximo do vencimento</span>
        </div>
      )}
    </div>
  );
};

export default SlaCountdown;
