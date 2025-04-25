import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Tickets from "@/pages/tickets";
import TicketDetails from "@/pages/ticket-details";
import Customers from "@/pages/customers";
import Agents from "@/pages/agents";
import Settings from "@/pages/settings";
import Reports from "@/pages/reports";
import Knowledge from "@/pages/knowledge";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/tickets" component={Tickets} />
      <Route path="/tickets/:id" component={TicketDetails} />
      <Route path="/customers" component={Customers} />
      <Route path="/agents" component={Agents} />
      <Route path="/settings" component={Settings} />
      <Route path="/reports" component={Reports} />
      <Route path="/knowledge" component={Knowledge} />
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
