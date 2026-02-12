import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Timer,
  Calendar
} from 'lucide-react';
import { formatDate, formatTimeRemaining } from '@/lib/utils';

interface SlaIndicatorsProps {
  ticket: {
    id: number;
    status: string;
    priority: string;
    createdAt: Date | string;
    responseDueAt?: Date | string;
    solutionDueAt?: Date | string;
    updatedAt?: Date | string;
  };
  hasFirstResponse?: boolean;
}

export function SlaIndicators({ ticket, hasFirstResponse = false }: SlaIndicatorsProps) {
  const now = new Date();
  const createdAt = new Date(ticket.createdAt);
  const responseDueAt = ticket.responseDueAt ? new Date(ticket.responseDueAt) : null;
  const solutionDueAt = ticket.solutionDueAt ? new Date(ticket.solutionDueAt) : null;

  // Calcular status do SLA de resposta
  const getResponseSlaStatus = () => {
    if (!responseDueAt) return { status: 'no-sla', color: 'default', icon: Clock };
    
    if (hasFirstResponse) {
      return { status: 'met', color: 'success', icon: CheckCircle };
    }
    
    const timeRemaining = responseDueAt.getTime() - now.getTime();
    const totalTime = responseDueAt.getTime() - createdAt.getTime();
    const progress = Math.max(0, Math.min(100, ((totalTime - timeRemaining) / totalTime) * 100));
    
    if (timeRemaining <= 0) {
      return { status: 'breached', color: 'destructive', icon: AlertTriangle, progress: 100 };
    } else if (timeRemaining <= 0.25 * totalTime) {
      return { status: 'critical', color: 'warning', icon: Timer, progress };
    } else {
      return { status: 'on-track', color: 'default', icon: Clock, progress };
    }
  };

  // Calcular status do SLA de solução
  const getSolutionSlaStatus = () => {
    if (!solutionDueAt) return { status: 'no-sla', color: 'default', icon: Clock };
    
    if (['resolved', 'closed'].includes(ticket.status)) {
      return { status: 'met', color: 'success', icon: CheckCircle };
    }
    
    const timeRemaining = solutionDueAt.getTime() - now.getTime();
    const totalTime = solutionDueAt.getTime() - createdAt.getTime();
    const progress = Math.max(0, Math.min(100, ((totalTime - timeRemaining) / totalTime) * 100));
    
    if (timeRemaining <= 0) {
      return { status: 'breached', color: 'destructive', icon: AlertTriangle, progress: 100 };
    } else if (timeRemaining <= 0.25 * totalTime) {
      return { status: 'critical', color: 'warning', icon: Timer, progress };
    } else {
      return { status: 'on-track', color: 'default', icon: Clock, progress };
    }
  };

  const responseSla = getResponseSlaStatus();
  const solutionSla = getSolutionSlaStatus();

  const getSlaStatusText = (status: string) => {
    switch (status) {
      case 'met': return 'Cumprido';
      case 'breached': return 'Violado';
      case 'critical': return 'Crítico';
      case 'on-track': return 'No prazo';
      case 'no-sla': return 'Sem SLA';
      default: return 'Indefinido';
    }
  };

  const getBadgeVariant = (color: string) => {
    switch (color) {
      case 'success': return 'default';
      case 'destructive': return 'destructive';
      case 'warning': return 'secondary';
      default: return 'outline';
    }
  };

  // Se não há SLA configurado, não exibir o componente
  if (!responseDueAt && !solutionDueAt) {
    return null;
  }

  return (
    <Card className="shadow-md hover:shadow-lg transition-all border-2 border-l-4 border-l-red-500 dark:border-l-red-400 bg-white dark:bg-gray-800">
      <CardHeader className="py-3 bg-red-50/50 dark:bg-red-950/20">
        <CardTitle className="text-base flex items-center gap-2 font-semibold">
          <Timer className="h-4.5 w-4.5" />
          Indicadores de SLA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pb-4">
        {/* SLA de Primeira Resposta */}
        {responseDueAt && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <responseSla.icon className="h-4.5 w-4.5 text-muted-foreground" />
                <span className="text-sm font-semibold">Primeira Resposta</span>
              </div>
              <Badge variant={getBadgeVariant(responseSla.color)} className="text-xs px-3 py-1">
                {getSlaStatusText(responseSla.status)}
              </Badge>
            </div>
            
            <div className="text-sm text-muted-foreground space-y-1">
              <div className="flex items-center justify-between">
                <span>Prazo máximo:</span>
                <span className="font-medium">{formatDate(responseDueAt)}</span>
              </div>
              
              {responseSla.status !== 'met' && responseSla.status !== 'no-sla' && (
                <>
                  {responseSla.progress !== undefined && (
                    <div className="space-y-1">
                      <Progress value={responseSla.progress} className="h-2" />
                      <div className="flex justify-between text-xs">
                        <span>Tempo decorrido: {responseSla.progress.toFixed(1)}%</span>
                        <span>
                          {responseSla.status === 'breached' 
                            ? `Atrasado: ${formatTimeRemaining(now.getTime() - responseDueAt.getTime())}`
                            : `Restante: ${formatTimeRemaining(responseDueAt.getTime() - now.getTime())}`
                          }
                        </span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Separador */}
        {responseDueAt && solutionDueAt && (
          <div className="border-t pt-3" />
        )}

        {/* SLA de Solução */}
        {solutionDueAt && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <solutionSla.icon className="h-4.5 w-4.5 text-muted-foreground" />
                <span className="text-sm font-semibold">Resolução Final</span>
              </div>
              <Badge variant={getBadgeVariant(solutionSla.color)} className="text-xs px-3 py-1">
                {getSlaStatusText(solutionSla.status)}
              </Badge>
            </div>
            
            <div className="text-sm text-muted-foreground space-y-1">
              <div className="flex items-center justify-between">
                <span>Prazo máximo:</span>
                <span className="font-medium">{formatDate(solutionDueAt)}</span>
              </div>
              
              {solutionSla.status !== 'met' && solutionSla.status !== 'no-sla' && (
                <>
                  {solutionSla.progress !== undefined && (
                    <div className="space-y-1">
                      <Progress value={solutionSla.progress} className="h-2" />
                      <div className="flex justify-between text-xs">
                        <span>Tempo decorrido: {solutionSla.progress.toFixed(1)}%</span>
                        <span>
                          {solutionSla.status === 'breached' 
                            ? `Atrasado: ${formatTimeRemaining(now.getTime() - solutionDueAt.getTime())}`
                            : `Restante: ${formatTimeRemaining(solutionDueAt.getTime() - now.getTime())}`
                          }
                        </span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Informações adicionais */}
        <div className="border-t pt-2.5 space-y-1.5">
          <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Ticket aberto em: {formatDate(createdAt)}</span>
          </div>
          
          <div className="text-sm text-muted-foreground">
            Prioridade: <span className="font-semibold capitalize">{ticket.priority}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
