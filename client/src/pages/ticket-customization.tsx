import { TicketCustomizationManager } from '@/components/customization';
import { AppLayout } from '@/components/layout/app-layout';

export default function TicketCustomizationPage() {
  return (
    <AppLayout title="Personalização de Tickets">
      <div className="container mx-auto py-6">
        <TicketCustomizationManager />
      </div>
    </AppLayout>
  );
}
