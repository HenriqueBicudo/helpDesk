import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Timer,
  Calendar,
  Target,
  Info
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SlaInfoCapsuleProps {
  responseDueAt?: Date | string;
  solutionDueAt?: Date | string;
  status: string;
  priority: string;
  hasFirstResponse?: boolean;
  createdAt: Date | string;
  className?: string;
}

export function SlaInfoCapsule({ 
  responseDueAt, 
  solutionDueAt, 
  status, 
  priority,
  hasFirstResponse = false,
  createdAt,
  className = ""
}: SlaInfoCapsuleProps) {
  const now = new Date();
  
  // Função para calcular o status do SLA
  const getSlaStatus = (deadline: Date | string, isCompleted: boolean) => {
    if (isCompleted) {
      return { status: 'completed', variant: 'default' as const, icon: CheckCircle, color: 'text-green-600' };
    }
    
    const deadlineDate = new Date(deadline);
    const timeRemaining = deadlineDate.getTime() - now.getTime();
    const criticalThreshold = 3600000; // 1 hora
    
    if (timeRemaining <= 0) {
      return { status: 'breached', variant: 'destructive' as const, icon: AlertTriangle, color: 'text-red-600' };
    } else if (timeRemaining <= criticalThreshold) {
      return { status: 'critical', variant: 'secondary' as const, icon: Timer, color: 'text-yellow-600' };
    } else {
      return { status: 'on-track', variant: 'outline' as const, icon: Clock, color: 'text-blue-600' };
    }
  };

  // Função para formatar tempo restante
  const getTimeRemaining = (deadline: Date | string) => {
    const deadlineDate = new Date(deadline);
    const timeRemaining = deadlineDate.getTime() - now.getTime();
    
    if (timeRemaining <= 0) {
      return `Venceu ${formatDistanceToNow(deadlineDate, { 
        locale: ptBR, 
        addSuffix: false 
      })} atrás`;
    } else {
      return `${formatDistanceToNow(deadlineDate, { 
        locale: ptBR, 
        addSuffix: true 
      })}`;
    }
  };

  // Status dos SLAs
  const responseStatus = responseDueAt ? getSlaStatus(responseDueAt, hasFirstResponse) : null;
  const solutionStatus = solutionDueAt ? getSlaStatus(solutionDueAt, ['resolved', 'closed'].includes(status)) : null;

  // Se não há SLA configurado, não mostrar a cápsula
  if (!responseDueAt && !solutionDueAt) {
    return null;
  }

  return (
    <Card className={`w-full max-w-sm ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Info className="h-4 w-4 text-blue-600" />
          Informações de SLA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Informações básicas */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            Criado: {format(new Date(createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Target className="h-3 w-3" />
            Prioridade: 
            <Badge variant={priority === 'critical' ? 'destructive' : priority === 'high' ? 'secondary' : 'outline'} className="text-xs">
              {priority === 'critical' ? 'Crítica' : 
               priority === 'high' ? 'Alta' : 
               priority === 'medium' ? 'Média' : 'Baixa'}
            </Badge>
          </div>
        </div>

        {/* SLA de Resposta */}
        {responseDueAt && responseStatus && (
          <div className="border rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">SLA de Resposta</span>
              <Badge variant={responseStatus.variant} className="text-xs">
                {responseStatus.status === 'completed' ? 'Cumprido' :
                 responseStatus.status === 'breached' ? 'Vencido' :
                 responseStatus.status === 'critical' ? 'Crítico' : 'No prazo'}
              </Badge>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <responseStatus.icon className={`h-3 w-3 ${responseStatus.color}`} />
                Prazo: {format(new Date(responseDueAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
              </div>
              
              {!hasFirstResponse && (
                <div className="text-xs font-medium">
                  {responseStatus.status === 'breached' ? (
                    <span className="text-red-600">⚠️ {getTimeRemaining(responseDueAt)}</span>
                  ) : responseStatus.status === 'critical' ? (
                    <span className="text-yellow-600">⏰ {getTimeRemaining(responseDueAt)}</span>
                  ) : (
                    <span className="text-blue-600">🕐 {getTimeRemaining(responseDueAt)}</span>
                  )}
                </div>
              )}
              
              {hasFirstResponse && (
                <div className="text-xs text-green-600 font-medium">
                  ✅ Primeira resposta enviada
                </div>
              )}
            </div>
          </div>
        )}

        {/* SLA de Solução */}
        {solutionDueAt && solutionStatus && (
          <div className="border rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">SLA de Solução</span>
              <Badge variant={solutionStatus.variant} className="text-xs">
                {solutionStatus.status === 'completed' ? 'Cumprido' :
                 solutionStatus.status === 'breached' ? 'Vencido' :
                 solutionStatus.status === 'critical' ? 'Crítico' : 'No prazo'}
              </Badge>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <solutionStatus.icon className={`h-3 w-3 ${solutionStatus.color}`} />
                Prazo: {format(new Date(solutionDueAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
              </div>
              
              {!['resolved', 'closed'].includes(status) && (
                <div className="text-xs font-medium">
                  {solutionStatus.status === 'breached' ? (
                    <span className="text-red-600">⚠️ {getTimeRemaining(solutionDueAt)}</span>
                  ) : solutionStatus.status === 'critical' ? (
                    <span className="text-yellow-600">⏰ {getTimeRemaining(solutionDueAt)}</span>
                  ) : (
                    <span className="text-blue-600">🕐 {getTimeRemaining(solutionDueAt)}</span>
                  )}
                </div>
              )}
              
              {['resolved', 'closed'].includes(status) && (
                <div className="text-xs text-green-600 font-medium">
                  ✅ Ticket resolvido
                </div>
              )}
            </div>
          </div>
        )}

        {/* Legenda de cores */}
        <div className="border-t pt-3 space-y-1">
          <div className="text-xs font-medium text-muted-foreground mb-2">Legenda:</div>
          <div className="grid grid-cols-2 gap-1 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span>Cumprido</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span>No prazo</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
              <span>Crítico</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <span>Vencido</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
