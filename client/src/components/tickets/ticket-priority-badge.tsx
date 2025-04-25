import React from 'react';
import { Badge } from '@/components/ui/badge';
import { translatePriority, priorityToColor } from '@/lib/utils';

type TicketPriorityBadgeProps = {
  priority: string;
};

export function TicketPriorityBadge({ priority }: TicketPriorityBadgeProps) {
  const priorityLabel = translatePriority(priority);
  const badgeVariant = priorityToColor(priority) as any;
  
  return (
    <Badge variant={badgeVariant}>
      {priorityLabel}
    </Badge>
  );
}
