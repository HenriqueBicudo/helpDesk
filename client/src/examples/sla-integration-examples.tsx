import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Importar as páginas SLA criadas
import SlaAgentDashboard from '@/pages/sla-agent-dashboard';
import SlaManagerDashboard from '@/pages/sla-manager-dashboard';
import SlaAdminDashboard from '@/pages/sla-admin-dashboard';

// Componentes SLA individuais
import SlaStatusBadge from '@/components/sla/sla-status-badge';
import SlaCountdown from '@/components/sla/sla-countdown';
import SlaMetricsCard from '@/components/sla/sla-metrics-card';
import SlaComplianceChart from '@/components/sla/sla-compliance-chart';
import SlaConfigurator from '@/components/sla/sla-configurator';

// Hook personalizado para SLA
import { useSlaData, useSlaMetrics, useSlaAlerts } from '@/hooks/use-sla';

// Criar cliente do React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos
      retry: 1,
    },
  },
});

/**
 * EXEMPLO 1: Integração em uma página de ticket existente
 * 
 * Este exemplo mostra como adicionar informações SLA a uma página de detalhes
 * de ticket já existente no sistema.
 */
const ExampleTicketDetailsWithSla: React.FC<{ ticketId: string }> = ({ ticketId }) => {
  // Buscar dados SLA do ticket
  const { data: slaData, isLoading } = useSlaData(ticketId);

  // Use dados reais quando disponíveis (fallback para exemplo)
  const ticket = slaData?.ticket || {
    id: ticketId,
    title: 'Problema com sistema de email',
    priority: 'high' as const,
    status: 'in_progress' as const,
    responseDueAt: '2024-01-20T16:00:00Z',
    solutionDueAt: '2024-01-21T08:00:00Z'
  };

  if (isLoading) {
    return <div>Carregando informações SLA...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Informações básicas do ticket (seu componente existente) */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-4">{ticket.title}</h1>
        
        {/* NOVA SEÇÃO SLA - Adicione isso ao seu componente existente */}
        <div className="border-t pt-4 mt-4">
          <h3 className="text-lg font-semibold mb-3">Informações SLA</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <SlaStatusBadge
                responseDueAt={ticket.responseDueAt}
                solutionDueAt={ticket.solutionDueAt}
                priority={ticket.priority}
                status={ticket.status}
                size="md"
                showTimeLeft={true}
              />
            </div>
            <div>
              <SlaCountdown
                responseDueAt={ticket.responseDueAt}
                solutionDueAt={ticket.solutionDueAt}
                priority={ticket.priority}
                status={ticket.status}
                size="md"
                showProgressBar={true}
                showPercentage={true}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * EXEMPLO 2: Integração em uma tabela de tickets existente
 * 
 * Este exemplo mostra como adicionar colunas SLA a uma tabela de tickets.
 */
const ExampleTicketTableRowWithSla: React.FC<{ ticket: any }> = ({ ticket }) => {
  return (
    <tr className="border-b">
      {/* Suas colunas existentes */}
      <td className="p-3">{ticket.id}</td>
      <td className="p-3">{ticket.title}</td>
      <td className="p-3">{ticket.customer}</td>
      
      {/* NOVA COLUNA SLA - Adicione isso à sua tabela existente */}
      <td className="p-3">
        <SlaStatusBadge
          responseDueAt={ticket.responseDueAt}
          solutionDueAt={ticket.solutionDueAt}
          priority={ticket.priority}
          status={ticket.status}
          size="sm"
          variant="minimal"
        />
      </td>
      
      {/* Suas outras colunas */}
      <td className="p-3">{ticket.status}</td>
    </tr>
  );
};

/**
 * EXEMPLO 3: Dashboard simples para gerentes
 * 
 * Este exemplo mostra como criar um widget de métricas SLA para adicionar
 * ao dashboard existente de gerentes.
 */
const ExampleSlaWidget: React.FC = () => {
  const { data: metrics, isLoading } = useSlaMetrics();
  const { data: alerts } = useSlaAlerts({ acknowledged: false, limit: 5 });

  if (isLoading) {
    return <div className="p-4">Carregando métricas SLA...</div>;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Performance SLA</h3>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-600">Compliance Geral</p>
          <p className="text-2xl font-bold text-green-600">
            {metrics?.compliancePercentage?.toFixed(1) || '0'}%
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Tickets Violados</p>
          <p className="text-2xl font-bold text-red-600">
            {metrics?.breachedTickets || 0}
          </p>
        </div>
      </div>

      {alerts && alerts.length > 0 && (
        <div className="border-t pt-4">
          <p className="text-sm font-medium text-orange-600 mb-2">
            {alerts.length} alertas ativos
          </p>
          <div className="space-y-1">
            {alerts.slice(0, 3).map((alert) => (
              <div key={alert.id} className="text-xs text-gray-600">
                • {alert.message}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * EXEMPLO 4: Rotas completas para as páginas SLA
 * 
 * Este exemplo mostra como integrar as páginas SLA completas no seu sistema de rotas.
 */
const SlaRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Página para agentes */}
      <Route path="/sla/agent" element={<SlaAgentDashboard />} />
      
      {/* Página para gerentes */}
      <Route path="/sla/manager" element={<SlaManagerDashboard />} />
      
      {/* Página para administradores */}
      <Route path="/sla/admin" element={<SlaAdminDashboard />} />
      
      {/* Redirecionamento padrão baseado no papel do usuário */}
      <Route path="/sla" element={<Navigate to="/sla/agent" replace />} />
    </Routes>
  );
};

/**
 * EXEMPLO 5: Componente de configuração rápida para administradores
 * 
 * Este exemplo mostra como usar o componente de configuração SLA de forma isolada.
 */
const ExampleQuickSlaConfig: React.FC = () => {
  const handleSaveConfig = (config: any) => {
    console.log('Salvando configuração SLA:', config);
    // Implementar salvamento via API
    // fetch('/api/sla/configurations', { method: 'POST', body: JSON.stringify(config) })
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <SlaConfigurator
        onSave={handleSaveConfig}
        onCancel={() => console.log('Cancelado')}
        isLoading={false}
      />
    </div>
  );
};

/**
 * EXEMPLO 6: Aplicação completa com todas as páginas SLA
 * 
 * Este é um exemplo de como sua aplicação principal ficaria com a integração completa.
 */
const ExampleFullApp: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-gray-50">
          {/* Seu header/navigation existente */}
          <header className="bg-white shadow-sm border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16">
                <div className="flex items-center">
                  <h1 className="text-xl font-semibold">HelpDesk System</h1>
                </div>
                <nav className="flex space-x-8">
                  <a href="/tickets" className="text-gray-500 hover:text-gray-700">Tickets</a>
                  <a href="/sla/agent" className="text-gray-500 hover:text-gray-700">SLA Dashboard</a>
                  <a href="/sla/admin" className="text-gray-500 hover:text-gray-700">SLA Config</a>
                </nav>
              </div>
            </div>
          </header>

          {/* Área de conteúdo principal */}
          <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <Routes>
              {/* Suas rotas existentes */}
              <Route path="/tickets" element={<div>Página de Tickets Existente</div>} />
              
              {/* NOVAS ROTAS SLA - Adicione isso ao seu sistema de rotas */}
              <Route path="/sla/*" element={<SlaRoutes />} />
              
              {/* Exemplos de integração */}
              <Route path="/ticket/:id" element={<ExampleTicketDetailsWithSla ticketId="123" />} />
              <Route path="/dashboard" element={<ExampleSlaWidget />} />
              <Route path="/sla-config" element={<ExampleQuickSlaConfig />} />
              
              {/* Rota padrão */}
              <Route path="/" element={<Navigate to="/sla/agent" replace />} />
            </Routes>
          </main>
        </div>
      </Router>
    </QueryClientProvider>
  );
};

/**
 * GUIA DE INTEGRAÇÃO RÁPIDA:
 * 
 * 1. INSTALAÇÃO DAS DEPENDÊNCIAS:
 *    npm install @tanstack/react-query recharts react-hook-form @hookform/resolvers date-fns lucide-react
 * 
 * 2. CONFIGURAÇÃO DO REACT QUERY:
 *    - Wrap sua aplicação com QueryClientProvider (como no exemplo acima)
 * 
 * 3. INTEGRAÇÃO BÁSICA EM PÁGINAS EXISTENTES:
 *    - Para adicionar status SLA a um ticket: use <SlaStatusBadge />
 *    - Para mostrar countdown: use <SlaCountdown />
 *    - Para métricas simples: use <SlaMetricsCard />
 * 
 * 4. DASHBOARDS COMPLETOS:
 *    - Agentes: use <SlaAgentDashboard />
 *    - Gerentes: use <SlaManagerDashboard />
 *    - Administradores: use <SlaAdminDashboard />
 * 
 * 5. CONFIGURAÇÃO DE BACKEND:
 *    - Certifique-se de que as rotas da API estão configuradas:
 *      - GET /api/sla/tickets/:id
 *      - GET /api/sla/metrics
 *      - GET /api/sla/alerts
 *      - GET /api/sla/configurations
 * 
 * 6. CUSTOMIZAÇÃO:
 *    - Todos os componentes aceitam props para customização
 *    - Use os hooks (useSlaData, useSlaMetrics, etc.) para dados
 *    - Modifique as cores e estilos conforme sua identidade visual
 */

export default ExampleFullApp;

// Exportar componentes para uso individual
export {
  ExampleTicketDetailsWithSla,
  ExampleTicketTableRowWithSla,
  ExampleSlaWidget,
  ExampleQuickSlaConfig,
  SlaRoutes
};
