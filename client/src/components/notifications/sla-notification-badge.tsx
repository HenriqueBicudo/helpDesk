import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';

export function SlaNotificationBadge() {
  // Buscar tickets com SLA
  const { data: tickets } = useQuery({
    queryKey: ['/api/tickets'],
    refetchInterval: 30000, // Atualizar a cada 30 segundos
  });

  if (!tickets || !Array.isArray(tickets)) return null;

  const now = new Date();
  let criticalCount = 0;

  tickets.forEach((ticket: any) => {
    // Verificar SLA de resposta
    if (ticket.responseDueAt && !['resolved', 'closed'].includes(ticket.status)) {
      const responseDue = new Date(ticket.responseDueAt);
      const timeRemaining = responseDue.getTime() - now.getTime();
      
      // TODO: Verificar se já teve primeira resposta
      const hasFirstResponse = false;
      
      if (!hasFirstResponse && timeRemaining <= 3600000) { // 1 hora
        criticalCount++;
      }
    }

    // Verificar SLA de solução
    if (ticket.solutionDueAt && !['resolved', 'closed'].includes(ticket.status)) {
      const solutionDue = new Date(ticket.solutionDueAt);
      const timeRemaining = solutionDue.getTime() - now.getTime();
      
      if (timeRemaining <= 7200000) { // 2 horas
        criticalCount++;
      }
    }
  });

  if (criticalCount === 0) return null;

  return (
    <Badge 
      variant="destructive" 
      className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs animate-pulse"
    >
      {criticalCount > 9 ? '9+' : criticalCount}
    </Badge>
  );
}
