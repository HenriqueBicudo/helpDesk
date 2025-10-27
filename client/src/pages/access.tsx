import { AccessManagement } from "@/components/access/access-management";
import { AppLayout } from '@/components/layout/app-layout';

export default function AccessPage() {
  return (
    <AppLayout title="Gerenciamento de Acessos">
      <AccessManagement />
    </AppLayout>
  );
}
