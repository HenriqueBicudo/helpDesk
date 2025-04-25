import React from 'react';
import { Badge } from '@/components/ui/badge';
import { translateStatus, statusToColor } from '@/lib/utils';

type TicketStatusBadgeProps = {
  status: string;
};

export function TicketStatusBadge({ status }: TicketStatusBadgeProps) {
  const statusLabel = translateStatus(status);
  const badgeVariant = statusToColor(status) as any;
  
  return (
    <Badge variant={badgeVariant}>
      {statusLabel}
    </Badge>
  );
}
