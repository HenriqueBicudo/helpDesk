import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Tickets from "@/pages/tickets";
import TicketsKanban from "@/pages/tickets-kanban";
import TicketDetails from "@/pages/ticket-details";
import Customers from "@/pages/customers";
import Agents from "@/pages/agents";
import Settings from "@/pages/settings";
import Reports from "@/pages/reports";
import Knowledge from "@/pages/knowledge";
import AuthPage from "@/pages/auth-page";
import ProfilePage from "@/pages/profile-page";

function Router() {
  return (
    <Switch>
      {/* Rotas protegidas (requerem autenticação) */}
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/tickets" component={Tickets} />
      <ProtectedRoute path="/tickets/kanban" component={TicketsKanban} />
      <ProtectedRoute path="/tickets/:id" component={TicketDetails} />
      <ProtectedRoute path="/customers" component={Customers} />
      <ProtectedRoute path="/agents" component={Agents} />
      <ProtectedRoute path="/settings" component={Settings} />
      <ProtectedRoute path="/reports" component={Reports} />
      <ProtectedRoute path="/knowledge" component={Knowledge} />
      <ProtectedRoute path="/profile" component={ProfilePage} />
      
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
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
