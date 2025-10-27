import { Clock, AlertTriangle } from 'lucide-react';
import { isBefore, format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SlaDueWarningProps {
  responseDueAt?: Date;
  solutionDueAt?: Date;
  hasFirstResponse?: boolean;
  compact?: boolean;
  className?: string;
}

export function SlaDueWarning({
  responseDueAt,
  solutionDueAt,
  hasFirstResponse = false,
  compact = false,
  className
}: SlaDueWarningProps) {
  const now = new Date();
  
  // Determinar qual prazo mostrar
  let dueDate: Date | null = null;
  
  // Se não teve primeira resposta, mostrar prazo de resposta
  if (!hasFirstResponse && responseDueAt) {
    dueDate = new Date(responseDueAt);
  }
  // Senão, mostrar prazo de solução
  else if (solutionDueAt) {
    dueDate = new Date(solutionDueAt);
  }
  
  if (!dueDate) return null;
  
  // Verificar se está vencido ou próximo do vencimento
  const isOverdue = isBefore(dueDate, now);
  const timeToExpiry = dueDate.getTime() - now.getTime();
  const hoursToExpiry = Math.abs(timeToExpiry) / (1000 * 60 * 60);
  
  // Só mostrar se está vencido ou vence em menos de 24 horas
  if (!isOverdue && hoursToExpiry > 24) return null;
  
  // Determinar a cor baseada na urgência
  let variant: 'default' | 'destructive' | 'warning' | 'secondary' = 'default';
  let bgColor = '';
  let textColor = '';
  
  if (isOverdue) {
    variant = 'destructive';
    bgColor = 'bg-red-100 dark:bg-red-900/20';
    textColor = 'text-red-700 dark:text-red-400';
  } else if (hoursToExpiry <= 2) {
    variant = 'destructive';
    bgColor = 'bg-orange-100 dark:bg-orange-900/20';
    textColor = 'text-orange-700 dark:text-orange-400';
  } else if (hoursToExpiry <= 6) {
    variant = 'warning';
    bgColor = 'bg-yellow-100 dark:bg-yellow-900/20';
    textColor = 'text-yellow-700 dark:text-yellow-400';
  } else {
    variant = 'secondary';
    bgColor = 'bg-blue-100 dark:bg-blue-900/20';
    textColor = 'text-blue-700 dark:text-blue-400';
  }
  
  const formatDueDate = (date: Date) => {
    return format(date, "dd/MM HH:mm");
  };
  
  const Icon = isOverdue ? AlertTriangle : Clock;
  
  if (compact) {
    return (
      <Badge 
        variant={variant}
        className={cn(
          "text-xs font-medium flex items-center gap-1",
          bgColor,
          textColor,
          className
        )}
      >
        <Icon className="h-3 w-3" />
        {isOverdue ? 'Venceu' : 'Vence'} {formatDueDate(dueDate)}
      </Badge>
    );
  }
  
  return (
    <div 
      className={cn(
        "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border",
        bgColor,
        textColor,
        isOverdue 
          ? "border-red-200 dark:border-red-800" 
          : hoursToExpiry <= 2 
            ? "border-orange-200 dark:border-orange-800"
            : hoursToExpiry <= 6
              ? "border-yellow-200 dark:border-yellow-800"
              : "border-blue-200 dark:border-blue-800",
        className
      )}
    >
      <Icon className="h-3 w-3" />
      <span>
        {isOverdue ? 'Venceu' : 'Vence'} {formatDueDate(dueDate)}
      </span>
    </div>
  );
}
