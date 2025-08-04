import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, 
  Clock, 
  X,
  ExternalLink,
  Timer
} from 'lucide-react';
import { useLocation } from 'wouter';

interface SlaNotification {
  ticketId: number;
  subject: string;
  priority: string;
  urgencyLevel: 'critical' | 'high' | 'medium';
  message: string;
  timeRemaining?: string;
  type: 'response' | 'solution';
}

export function SlaNotifications() {
  const [, setLocation] = useLocation();
  const [dismissedNotifications, setDismissedNotifications] = useState<number[]>([]);
  const [notifications, setNotifications] = useState<SlaNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Buscar tickets com SLA
  const { data: tickets } = useQuery({
    queryKey: ['/api/tickets'],
    refetchInterval: 30000, // Atualizar a cada 30 segundos
  });

  // Controlar exibição baseado no localStorage
  useEffect(() => {
    const lastLoginTime = localStorage.getItem('sla-notifications-last-check');
    const currentTime = Date.now();
    
    // Mostrar notificações se:
    // 1. Nunca mostrou antes (primeiro login)
    // 2. Passou mais de 1 hora desde a última verificação
    if (!lastLoginTime || (currentTime - parseInt(lastLoginTime)) > 3600000) { // 1 hora
      setShowNotifications(true);
      localStorage.setItem('sla-notifications-last-check', currentTime.toString());
    }
  }, []);

  // Processar notificações de SLA
  useEffect(() => {
    if (!tickets || !Array.isArray(tickets)) return;

    const now = new Date();
    const slaNotifications: SlaNotification[] = [];

    tickets.forEach((ticket: any) => {
      // Pular tickets dispensados
      if (dismissedNotifications.includes(ticket.id)) return;
      
      // Verificar SLA de resposta
      if (ticket.responseDueAt && !['resolved', 'closed'].includes(ticket.status)) {
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
              message: 'SLA de resposta se aproximando',
              timeRemaining: `${Math.floor(timeRemaining / (1000 * 60))} minutos restantes`,
              type: 'response'
            });
          }
        }
      }

      // Verificar SLA de solução
      if (ticket.solutionDueAt && !['resolved', 'closed'].includes(ticket.status)) {
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
            message: 'SLA de solução se aproximando',
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

    // Verificar se há novas notificações críticas
    const newCriticalNotifications = slaNotifications.filter(n => n.urgencyLevel === 'critical');
    const currentCriticalIds = notifications.filter(n => n.urgencyLevel === 'critical').map(n => `${n.ticketId}-${n.type}`);
    const newCriticalIds = newCriticalNotifications.map(n => `${n.ticketId}-${n.type}`);
    
    // Se há novas notificações críticas, mostrar painel
    const hasNewCritical = newCriticalIds.some(id => !currentCriticalIds.includes(id));
    if (hasNewCritical && newCriticalNotifications.length > 0 && notifications.length > 0) {
      setShowNotifications(true);
    }

    setNotifications(slaNotifications);
  }, [tickets, dismissedNotifications]);

  const dismissNotification = (ticketId: number) => {
    setDismissedNotifications(prev => [...prev, ticketId]);
    
    // Se não há mais notificações críticas, ocultar o painel
    const remainingCritical = notifications.filter(
      n => n.ticketId !== ticketId && n.urgencyLevel === 'critical'
    );
    if (remainingCritical.length === 0) {
      setShowNotifications(false);
    }
  };

  const navigateToTicket = (ticketId: number) => {
    setLocation(`/tickets/${ticketId}`);
    setShowNotifications(false); // Ocultar após navegação
  };

  // Não mostrar se:
  // 1. Não há notificações
  // 2. Configurado para não mostrar
  // 3. Apenas notificações não críticas
  const criticalNotifications = notifications.filter(n => n.urgencyLevel === 'critical');
  if (notifications.length === 0 || !showNotifications || criticalNotifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-20 right-4 z-50 space-y-2 max-w-md">
      {/* Header com opção de fechar */}
      <div className="flex justify-between items-center mb-2">
        <Badge variant="destructive" className="text-xs">
          {criticalNotifications.length} SLA{criticalNotifications.length > 1 ? 's' : ''} Crítico{criticalNotifications.length > 1 ? 's' : ''}
        </Badge>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0"
          onClick={() => setShowNotifications(false)}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
      
      {notifications.slice(0, 5).map((notification) => (
        <Card 
          key={`${notification.ticketId}-${notification.type}`}
          className={`shadow-lg border-l-4 ${
            notification.urgencyLevel === 'critical' 
              ? 'border-l-red-500 bg-red-50' 
              : notification.urgencyLevel === 'high'
              ? 'border-l-orange-500 bg-orange-50'
              : 'border-l-yellow-500 bg-yellow-50'
          }`}
        >
          <CardContent className="p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {notification.urgencyLevel === 'critical' && (
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  )}
                  {notification.urgencyLevel === 'high' && (
                    <Timer className="h-4 w-4 text-orange-600" />
                  )}
                  {notification.urgencyLevel === 'medium' && (
                    <Clock className="h-4 w-4 text-yellow-600" />
                  )}
                  
                  <Badge 
                    variant={notification.urgencyLevel === 'critical' ? 'destructive' : 'secondary'}
                    className="text-xs"
                  >
                    {notification.message}
                  </Badge>
                </div>
                
                <h4 className="text-sm font-medium text-gray-900 mb-1">
                  Ticket #{notification.ticketId.toString().padStart(6, '0')}
                </h4>
                
                <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                  {notification.subject}
                </p>
                
                {notification.timeRemaining && (
                  <p className={`text-xs font-medium ${
                    notification.urgencyLevel === 'critical' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    ⏰ {notification.timeRemaining}
                  </p>
                )}
                
                <div className="flex items-center gap-2 mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-xs"
                    onClick={() => navigateToTicket(notification.ticketId)}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Ver ticket
                  </Button>
                  
                  <Badge variant="outline" className="text-xs">
                    Prioridade: {notification.priority}
                  </Badge>
                </div>
              </div>
              
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={() => dismissNotification(notification.ticketId)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
      
      {notifications.length > 5 && (
        <div className="text-center">
          <Badge variant="outline" className="text-xs">
            +{notifications.length - 5} alertas adicionais
          </Badge>
        </div>
      )}
    </div>
  );
}
