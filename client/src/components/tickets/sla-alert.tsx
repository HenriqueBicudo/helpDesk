import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  Clock, 
  Timer,
  Zap
} from 'lucide-react';

interface SlaAlertProps {
  responseDueAt?: Date | string;
  solutionDueAt?: Date | string;
  status: string;
  priority: string;
  hasFirstResponse?: boolean;
  showLabel?: boolean;
}

export function SlaAlert({ 
  responseDueAt, 
  solutionDueAt, 
  status, 
  priority,
  hasFirstResponse = false,
  showLabel = true 
}: SlaAlertProps) {
  const now = new Date();
  
  // Se não há SLA configurado, não mostrar alerta
  if (!responseDueAt && !solutionDueAt) {
    return null;
  }

  // Verificar status do SLA de resposta
  const checkResponseSla = () => {
    if (!responseDueAt) return null;
    
    const responseDeadline = new Date(responseDueAt);
    
    if (hasFirstResponse) {
      return null; // Não mostrar alerta se já respondeu
    }
    
    const timeRemaining = responseDeadline.getTime() - now.getTime();
    const criticalThreshold = 3600000; // 1 hora em ms
    
    if (timeRemaining <= 0) {
      return { 
        type: 'response', 
        status: 'breached', 
        icon: AlertTriangle, 
        variant: 'destructive' as const,
        urgency: 'critical',
        message: 'Resposta VENCIDA'
      };
    } else if (timeRemaining <= criticalThreshold) {
      return { 
        type: 'response', 
        status: 'critical', 
        icon: Timer, 
        variant: 'destructive' as const,
        urgency: 'high',
        message: 'Resposta CRÍTICA'
      };
    }
    
    return null;
  };

  // Verificar status do SLA de solução
  const checkSolutionSla = () => {
    if (!solutionDueAt) return null;
    
    const solutionDeadline = new Date(solutionDueAt);
    
    if (['resolved', 'closed'].includes(status)) {
      return null; // Não mostrar alerta se já resolveu
    }
    
    const timeRemaining = solutionDeadline.getTime() - now.getTime();
    const criticalThreshold = 7200000; // 2 horas em ms
    
    if (timeRemaining <= 0) {
      return { 
        type: 'solution', 
        status: 'breached', 
        icon: AlertTriangle, 
        variant: 'destructive' as const,
        urgency: 'critical',
        message: 'Solução VENCIDA'
      };
    } else if (timeRemaining <= criticalThreshold) {
      return { 
        type: 'solution', 
        status: 'critical', 
        icon: Clock, 
        variant: 'secondary' as const,
        urgency: 'medium',
        message: 'Solução CRÍTICA'
      };
    }
    
    return null;
  };

  const responseSla = checkResponseSla();
  const solutionSla = checkSolutionSla();

  // Priorizar o alerta mais crítico
  let priorityAlert = null;
  
  if (responseSla?.urgency === 'critical' || solutionSla?.urgency === 'critical') {
    priorityAlert = responseSla?.urgency === 'critical' ? responseSla : solutionSla;
  } else if (responseSla?.urgency === 'high' || solutionSla?.urgency === 'high') {
    priorityAlert = responseSla?.urgency === 'high' ? responseSla : solutionSla;
  } else {
    priorityAlert = responseSla || solutionSla;
  }

  if (!priorityAlert) return null;

  const Icon = priorityAlert.icon;

  // Estilo especial para tickets críticos
  const isCriticalPriority = priority === 'critical';
  const isUrgentAlert = priorityAlert.urgency === 'critical';

  if (isUrgentAlert || isCriticalPriority) {
    return (
      <div className="flex items-center gap-1 animate-pulse">
        <Badge 
          variant={priorityAlert.variant} 
          className={`text-xs flex items-center gap-1 font-bold ${
            isUrgentAlert ? 'bg-red-600 text-white border-red-600 animate-pulse' : ''
          }`}
        >
          <Icon className="h-3 w-3" />
          {isUrgentAlert && <Zap className="h-3 w-3 animate-bounce" />}
          {showLabel ? priorityAlert.message : '!'}
        </Badge>
      </div>
    );
  }

  return (
    <Badge 
      variant={priorityAlert.variant} 
      className="text-xs flex items-center gap-1"
    >
      <Icon className="h-3 w-3" />
      {showLabel ? priorityAlert.message : '!'}
    </Badge>
  );
}
