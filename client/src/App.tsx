import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ThemeProvider } from "next-themes";
import { ThemeProvider as CustomThemeProvider } from "@/hooks/use-theme-provider";
import { ProtectedRoute } from "@/lib/protected-route";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Tickets from "@/pages/tickets";
import TicketsKanban from "@/pages/tickets-kanban";
import TicketDetails from "@/pages/ticket-details";
import Settings from "@/pages/settings";
import Reports from "@/pages/reports";
import Knowledge from "@/pages/knowledge";
import AuthPage from "@/pages/auth-page";
import ProfilePage from "@/pages/profile-page";
import AccessPage from "@/pages/access";
import ContractsPage from "@/pages/contracts";
import SlaAgentDashboard from "@/pages/sla-agent-dashboard";
import SlaManagerDashboard from "@/pages/sla-manager-dashboard";
import SlaAdminDashboard from "@/pages/sla-admin-dashboard";

function Router() {
  return (
    <Switch>
      {/* Rotas protegidas (requerem autenticação) */}
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/tickets" component={Tickets} />
      <ProtectedRoute path="/tickets/kanban" component={TicketsKanban} />
      <ProtectedRoute path="/tickets/:id" component={TicketDetails} />
      <ProtectedRoute path="/access" component={AccessPage} />
      <ProtectedRoute path="/contracts" component={ContractsPage} />
      <ProtectedRoute path="/settings" component={Settings} />
      <ProtectedRoute path="/reports" component={Reports} />
      <ProtectedRoute path="/knowledge" component={Knowledge} />
      <ProtectedRoute path="/profile" component={ProfilePage} />
      
      {/* Rotas SLA */}
      <ProtectedRoute path="/sla/agent" component={SlaAgentDashboard} />
      <ProtectedRoute path="/sla/manager" component={SlaManagerDashboard} />
      <ProtectedRoute path="/sla/admin" component={SlaAdminDashboard} />
      
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
              <Router />
            </TooltipProvider>
          </AuthProvider>
        </CustomThemeProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
