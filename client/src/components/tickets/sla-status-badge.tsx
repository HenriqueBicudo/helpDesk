import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Timer
} from 'lucide-react';

interface SlaStatusBadgeProps {
  responseDueAt?: Date | string;
  solutionDueAt?: Date | string;
  status: string;
  hasFirstResponse?: boolean;
}

export function SlaStatusBadge({ 
  responseDueAt, 
  solutionDueAt, 
  status, 
  hasFirstResponse = false 
}: SlaStatusBadgeProps) {
  const now = new Date();
  
  // Não mostrar badge para tickets resolvidos ou fechados
  if (status === 'resolved' || status === 'closed') {
    return null;
  }
  
  // Se não há SLA configurado, não mostrar badge
  if (!responseDueAt && !solutionDueAt) {
    return null;
  }

  // Verificar status do SLA de resposta
  const checkResponseSla = () => {
    if (!responseDueAt) return null;
    
    const responseDeadline = new Date(responseDueAt);
    
    if (hasFirstResponse) {
      return { type: 'response', status: 'met', icon: CheckCircle, variant: 'default' as const };
    }
    
    const timeRemaining = responseDeadline.getTime() - now.getTime();
    
    if (timeRemaining <= 0) {
      return { type: 'response', status: 'breached', icon: AlertTriangle, variant: 'destructive' as const };
    } else if (timeRemaining <= 3600000) { // 1 hora em ms
      return { type: 'response', status: 'critical', icon: Timer, variant: 'secondary' as const };
    } else {
      return { type: 'response', status: 'on-track', icon: Clock, variant: 'outline' as const };
    }
  };

  // Verificar status do SLA de solução
  const checkSolutionSla = () => {
    if (!solutionDueAt) return null;
    
    const solutionDeadline = new Date(solutionDueAt);
    
    if (['resolved', 'closed'].includes(status)) {
      return { type: 'solution', status: 'met', icon: CheckCircle, variant: 'default' as const };
    }
    
    const timeRemaining = solutionDeadline.getTime() - now.getTime();
    
    if (timeRemaining <= 0) {
      return { type: 'solution', status: 'breached', icon: AlertTriangle, variant: 'destructive' as const };
    } else if (timeRemaining <= 7200000) { // 2 horas em ms
      return { type: 'solution', status: 'critical', icon: Timer, variant: 'secondary' as const };
    } else {
      return { type: 'solution', status: 'on-track', icon: Clock, variant: 'outline' as const };
    }
  };

  const responseSla = checkResponseSla();
  const solutionSla = checkSolutionSla();

  // Priorizar o SLA mais crítico
  let prioritySla = null;
  
  if (responseSla?.status === 'breached' || solutionSla?.status === 'breached') {
    prioritySla = responseSla?.status === 'breached' ? responseSla : solutionSla;
  } else if (responseSla?.status === 'critical' || solutionSla?.status === 'critical') {
    prioritySla = responseSla?.status === 'critical' ? responseSla : solutionSla;
  } else {
    prioritySla = responseSla || solutionSla;
  }

  if (!prioritySla) return null;

  const getStatusText = (slaStatus: any) => {
    const prefix = slaStatus.type === 'response' ? 'Resp.' : 'Sol.';
    
    switch (slaStatus.status) {
      case 'met': return `${prefix} OK`;
      case 'breached': return `${prefix} Vencido`;
      case 'critical': return `${prefix} Crítico`;
      case 'on-track': return `${prefix} OK`;
      default: return prefix;
    }
  };

  const Icon = prioritySla.icon;

  return (
    <Badge variant={prioritySla.variant} className="text-xs flex items-center gap-1">
      <Icon className="h-3 w-3" />
      {getStatusText(prioritySla)}
    </Badge>
  );
}
