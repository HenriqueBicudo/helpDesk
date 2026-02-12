import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, 
  Clock, 
  ExternalLink,
  Timer,
  BellOff
} from 'lucide-react';
import { useLocation } from 'wouter';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SlaNotification {
  ticketId: number;
  subject: string;
  priority: string;
  urgencyLevel: 'critical' | 'high' | 'medium';
  message: string;
  timeRemaining?: string;
  type: 'response' | 'solution';
}

export function NotificationsPopover() {
  const [, setLocation] = useLocation();
  const [notifications, setNotifications] = useState<SlaNotification[]>([]);

  // Buscar tickets com SLA
  const { data: tickets } = useQuery({
    queryKey: ['/api/tickets'],
    refetchInterval: 30000, // Atualizar a cada 30 segundos
  });

  // Processar notificações de SLA
  useEffect(() => {
    if (!tickets || !Array.isArray(tickets)) return;

    const now = new Date();
    const slaNotifications: SlaNotification[] = [];

    tickets.forEach((ticket: any) => {
      // Ignorar tickets fechados ou resolvidos
      if (['resolved', 'closed'].includes(ticket.status)) return;
      
      // Verificar SLA de resposta
      if (ticket.responseDueAt) {
        const responseDue = new Date(ticket.responseDueAt);
        const timeRemaining = responseDue.getTime() - now.getTime();
        
        // TODO: Verificar se já teve primeira resposta
        const hasFirstResponse = false;
        
        if (!hasFirstResponse) {
          if (timeRemaining <= 0) {
            slaNotifications.push({
              ticketId: ticket.id,
              subject: ticket.subject,
              priority: ticket.priority,
              urgencyLevel: 'critical',
              message: 'SLA de resposta VENCIDO',
              timeRemaining: `Atrasado há ${Math.abs(Math.floor(timeRemaining / (1000 * 60)))} minutos`,
              type: 'response'
            });
          } else if (timeRemaining <= 1800000) { // 30 minutos
            slaNotifications.push({
              ticketId: ticket.id,
              subject: ticket.subject,
              priority: ticket.priority,
              urgencyLevel: 'critical',
              message: 'SLA de resposta CRÍTICO',
              timeRemaining: `${Math.floor(timeRemaining / (1000 * 60))} minutos restantes`,
              type: 'response'
            });
          } else if (timeRemaining <= 3600000) { // 1 hora
            slaNotifications.push({
              ticketId: ticket.id,
              subject: ticket.subject,
              priority: ticket.priority,
              urgencyLevel: 'high',
              message: 'SLA de resposta próximo',
              timeRemaining: `${Math.floor(timeRemaining / (1000 * 60))} minutos restantes`,
              type: 'response'
            });
          }
        }
      }

      // Verificar SLA de solução
      if (ticket.solutionDueAt) {
        const solutionDue = new Date(ticket.solutionDueAt);
        const timeRemaining = solutionDue.getTime() - now.getTime();
        
        if (timeRemaining <= 0) {
          slaNotifications.push({
            ticketId: ticket.id,
            subject: ticket.subject,
            priority: ticket.priority,
            urgencyLevel: 'critical',
            message: 'SLA de solução VENCIDO',
            timeRemaining: `Atrasado há ${Math.abs(Math.floor(timeRemaining / (1000 * 60 * 60)))} horas`,
            type: 'solution'
          });
        } else if (timeRemaining <= 3600000) { // 1 hora
          slaNotifications.push({
            ticketId: ticket.id,
            subject: ticket.subject,
            priority: ticket.priority,
            urgencyLevel: 'high',
            message: 'SLA de solução CRÍTICO',
            timeRemaining: `${Math.floor(timeRemaining / (1000 * 60))} minutos restantes`,
            type: 'solution'
          });
        } else if (timeRemaining <= 7200000) { // 2 horas
          slaNotifications.push({
            ticketId: ticket.id,
            subject: ticket.subject,
            priority: ticket.priority,
            urgencyLevel: 'medium',
            message: 'SLA de solução próximo',
            timeRemaining: `${Math.floor(timeRemaining / (1000 * 60 * 60))} horas restantes`,
            type: 'solution'
          });
        }
      }
    });

    // Ordenar por urgência e tempo
    slaNotifications.sort((a, b) => {
      const urgencyOrder = { critical: 0, high: 1, medium: 2 };
      return urgencyOrder[a.urgencyLevel] - urgencyOrder[b.urgencyLevel];
    });

    setNotifications(slaNotifications);
  }, [tickets]);

  const navigateToTicket = (ticketId: number) => {
    setLocation(`/tickets/${ticketId}`);
  };

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="rounded-full bg-muted p-3 mb-4">
          <BellOff className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="font-medium text-sm text-foreground mb-1">
          Nenhuma notificação
        </h3>
        <p className="text-xs text-muted-foreground">
          Você não tem alertas de SLA no momento
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full max-h-[400px]">
      <div className="space-y-2 p-2">
        {notifications.map((notification) => (
          <div 
            key={`${notification.ticketId}-${notification.type}`}
            className={`p-3 rounded-lg border-l-4 transition-colors hover:bg-muted/50 ${
              notification.urgencyLevel === 'critical' 
                ? 'border-l-red-500 bg-red-50 dark:bg-red-950/20' 
                : notification.urgencyLevel === 'high'
                ? 'border-l-orange-500 bg-orange-50 dark:bg-orange-950/20'
                : 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20'
            }`}
          >
            <div className="flex items-start gap-2">
              <div className="flex-shrink-0 mt-0.5">
                {notification.urgencyLevel === 'critical' && (
                  <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                )}
                {notification.urgencyLevel === 'high' && (
                  <Timer className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                )}
                {notification.urgencyLevel === 'medium' && (
                  <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge 
                    variant={notification.urgencyLevel === 'critical' ? 'destructive' : 'secondary'}
                    className="text-xs"
                  >
                    {notification.message}
                  </Badge>
                </div>
                
                <h4 className="text-sm font-medium text-foreground mb-1">
                  Ticket #{notification.ticketId.toString().padStart(6, '0')}
                </h4>
                
                <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                  {notification.subject}
                </p>
                
                {notification.timeRemaining && (
                  <p className={`text-xs font-medium mb-2 ${
                    notification.urgencyLevel === 'critical' 
                      ? 'text-red-600 dark:text-red-400' 
                      : 'text-muted-foreground'
                  }`}>
                    ⏰ {notification.timeRemaining}
                  </p>
                )}
                
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => navigateToTicket(notification.ticketId)}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Ver ticket
                  </Button>
                  
                  <Badge variant="outline" className="text-xs">
                    {notification.priority}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
