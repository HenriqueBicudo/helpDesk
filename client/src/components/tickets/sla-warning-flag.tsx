import { 
  AlertTriangle, 
  Zap,
  Timer,
  Clock
} from 'lucide-react';

interface SlaWarningFlagProps {
  responseDueAt?: Date | string;
  solutionDueAt?: Date | string;
  status: string;
  priority: string;
  hasFirstResponse?: boolean;
}

export function SlaWarningFlag({ 
  responseDueAt, 
  solutionDueAt, 
  status, 
  priority,
  hasFirstResponse = false
}: SlaWarningFlagProps) {
  const now = new Date();
  
  // Se não há SLA configurado, não mostrar flag
  if (!responseDueAt && !solutionDueAt) {
    return null;
  }

  // Verificar se tem SLA crítico
  const checkCriticalSla = () => {
    let alerts = [];
    
    // Verificar resposta
    if (responseDueAt && !hasFirstResponse) {
      const responseDeadline = new Date(responseDueAt);
      const timeRemaining = responseDeadline.getTime() - now.getTime();
      
      if (timeRemaining <= 0) {
        alerts.push({
          type: 'RESPOSTA VENCIDA',
          urgency: 'critical',
          color: 'bg-red-600',
          icon: AlertTriangle
        });
      } else if (timeRemaining <= 3600000) { // 1 hora
        alerts.push({
          type: 'RESPOSTA CRÍTICA',
          urgency: 'high',
          color: 'bg-orange-500',
          icon: Timer
        });
      }
    }
    
    // Verificar solução
    if (solutionDueAt && !['resolved', 'closed'].includes(status)) {
      const solutionDeadline = new Date(solutionDueAt);
      const timeRemaining = solutionDeadline.getTime() - now.getTime();
      
      if (timeRemaining <= 0) {
        alerts.push({
          type: 'SOLUÇÃO VENCIDA',
          urgency: 'critical',
          color: 'bg-red-600',
          icon: AlertTriangle
        });
      } else if (timeRemaining <= 7200000) { // 2 horas
        alerts.push({
          type: 'SOLUÇÃO CRÍTICA',
          urgency: 'medium',
          color: 'bg-yellow-500',
          icon: Clock
        });
      }
    }
    
    return alerts;
  };

  const alerts = checkCriticalSla();
  const hasCriticalAlert = alerts.some(alert => alert.urgency === 'critical');
  const hasHighAlert = alerts.some(alert => alert.urgency === 'high');
  const isCriticalPriority = priority === 'critical';
  
  // Não mostrar se não há alertas significativos
  if (alerts.length === 0 && !isCriticalPriority) {
    return null;
  }

  // Selecionar o alerta mais crítico
  const primaryAlert = alerts.find(a => a.urgency === 'critical') || 
                      alerts.find(a => a.urgency === 'high') || 
                      alerts[0];

  // Flag para tickets extremamente críticos (SLA vencido + prioridade crítica)
  if (hasCriticalAlert || (isCriticalPriority && hasHighAlert)) {
    return (
      <div className="absolute -top-2 -right-2 z-10">
        <div className="relative">
          {/* Flag triangular vermelha piscando */}
          <div className="w-0 h-0 border-l-[20px] border-r-[20px] border-b-[20px] border-l-transparent border-r-red-600 border-b-red-600 animate-pulse shadow-lg">
          </div>
          
          {/* Ícone dentro da flag */}
          <div className="absolute top-[4px] right-[2px] text-white">
            <Zap className="h-3 w-3 animate-bounce" />
          </div>
          
          {/* Tooltip */}
          <div className="absolute top-full right-0 mt-1 px-2 py-1 bg-red-600 text-white text-xs rounded shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-20">
            🚨 SLA CRÍTICO! 
            {primaryAlert && (
              <div className="font-bold">{primaryAlert.type}</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Flag para alertas importantes
  if (hasHighAlert || isCriticalPriority) {
    const Icon = primaryAlert?.icon || Timer;
    const color = primaryAlert?.color || 'bg-orange-500';
    
    return (
      <div className="absolute -top-1 -right-1 z-10">
        <div className={`${color} text-white rounded-full p-1 shadow-md animate-pulse`}>
          <Icon className="h-3 w-3" />
        </div>
      </div>
    );
  }

  return null;
}
