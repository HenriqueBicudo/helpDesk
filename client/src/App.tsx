import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { ThemeProvider } from "next-themes";
import { ThemeProvider as CustomThemeProvider } from "@/hooks/use-theme-provider";
import { ProtectedRoute } from "@/lib/protected-route";
import { RoleProtectedRoute, HelpdeskRoles, AdminRoles } from "@/lib/role-protected-route";
import { ForcePasswordChangeDialog } from "@/components/auth/force-password-change-dialog";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Tickets from "@/pages/tickets";
import Tasks from "@/pages/tasks";
import TaskDetails from "@/pages/task-details";
import TasksKanban from "@/pages/tasks-kanban";
import TicketsKanban from "@/pages/tickets-kanban";
import TicketDetails from "@/pages/ticket-details";
import Settings from "@/pages/settings";
import Reports from "@/pages/reports";
import Knowledge from "@/pages/knowledge";
import AuthPage from "@/pages/auth-page";
import AccessPage from "@/pages/access";
import ContractsPage from "@/pages/contracts";
import SlaAgentDashboard from "@/pages/sla-agent-dashboard";
import SlaManagerDashboard from "@/pages/sla-manager-dashboard";
import SlaAdminDashboard from "@/pages/sla-admin-dashboard";
import ClientProfile from "@/pages/client-profile";
import MyTeam from "@/pages/my-team";
import ApiDocs from "@/pages/api-docs";
import Customers from "@/pages/customers";
import CustomerProfile from "@/pages/customer-profile";

function Router() {
  return (
    <Switch>
      {/* Rotas protegidas (requerem autenticação) */}
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/tickets" component={Tickets} />
      <ProtectedRoute path="/tickets/kanban" component={TicketsKanban} />
      <ProtectedRoute path="/tickets/:id" component={TicketDetails} />
      <ProtectedRoute path="/tasks" component={Tasks} />
      <ProtectedRoute path="/tasks/kanban" component={TasksKanban} />      
      <ProtectedRoute path="/tasks/:taskCode" component={TaskDetails} />
      <ProtectedRoute 
        path="/access" 
        component={() => (
          <RoleProtectedRoute allowedRoles={AdminRoles}>
            <AccessPage />
          </RoleProtectedRoute>
        )} 
      />
      <ProtectedRoute 
        path="/contracts" 
        component={() => (
          <RoleProtectedRoute allowedRoles={HelpdeskRoles}>
            <ContractsPage />
          </RoleProtectedRoute>
        )} 
      />
      <ProtectedRoute 
        path="/settings" 
        component={() => (
          <RoleProtectedRoute allowedRoles={HelpdeskRoles}>
            <Settings />
          </RoleProtectedRoute>
        )} 
      />
      <ProtectedRoute 
        path="/reports" 
        component={() => (
          <RoleProtectedRoute allowedRoles={HelpdeskRoles}>
            <Reports />
          </RoleProtectedRoute>
        )} 
      />
      <ProtectedRoute 
        path="/knowledge" 
        component={() => (
          <RoleProtectedRoute allowedRoles={HelpdeskRoles}>
            <Knowledge />
          </RoleProtectedRoute>
        )} 
      />
      <ProtectedRoute path="/profile" component={ClientProfile} />
      <ProtectedRoute path="/my-team" component={MyTeam} />
      <ProtectedRoute 
        path="/docs" 
        component={() => (
          <RoleProtectedRoute allowedRoles={HelpdeskRoles}>
            <ApiDocs />
          </RoleProtectedRoute>
        )} 
      />
      <ProtectedRoute 
        path="/customers" 
        component={() => (
          <RoleProtectedRoute allowedRoles={HelpdeskRoles}>
            <Customers />
          </RoleProtectedRoute>
        )} 
      />
      <ProtectedRoute 
        path="/customers/:id" 
        component={() => (
          <RoleProtectedRoute allowedRoles={HelpdeskRoles}>
            <CustomerProfile />
          </RoleProtectedRoute>
        )} 
      />
      
      {/* Rotas SLA */}
      <ProtectedRoute 
        path="/sla/agent" 
        component={() => (
          <RoleProtectedRoute allowedRoles={HelpdeskRoles}>
            <SlaAgentDashboard />
          </RoleProtectedRoute>
        )} 
      />
      <ProtectedRoute 
        path="/sla/manager" 
        component={() => (
          <RoleProtectedRoute allowedRoles={HelpdeskRoles}>
            <SlaManagerDashboard />
          </RoleProtectedRoute>
        )} 
      />
      <ProtectedRoute 
        path="/sla/admin" 
        component={() => (
          <RoleProtectedRoute allowedRoles={AdminRoles}>
            <SlaAdminDashboard />
          </RoleProtectedRoute>
        )} 
      />
      
      {/* Rota pública de autenticação */}
      <Route path="/auth" component={AuthPage} />
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light">
        <CustomThemeProvider>
          <AuthProvider>
            <TooltipProvider>
              <Toaster />
              <AppContent />
            </TooltipProvider>
          </AuthProvider>
        </CustomThemeProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function AppContent() {
  const { user, isLoading } = useAuth();
  
  // Verificar se o usuário precisa trocar a senha
  // Importante: usar dados do localStorage como fallback caso o user fique null
  const userRequiresPasswordChange = user && (user as any).requiresPasswordChange === true;
  
  // Verificar se há dados de usuário recém-logado no sessionStorage
  const sessionUser = sessionStorage.getItem('pending-password-change');
  const hasPendingPasswordChange = sessionUser ? JSON.parse(sessionUser) : false;
  
  const requiresPasswordChange = !isLoading && (userRequiresPasswordChange || hasPendingPasswordChange);

  return (
    <>
      {requiresPasswordChange ? (
        <ForcePasswordChangeDialog open={true} />
      ) : (
        <Router />
      )}
    </>
  );
}

export default App;
