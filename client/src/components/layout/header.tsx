import { Search, Menu, Bell, User, LogOut, Settings as SettingsIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { SlaNotifications } from '@/components/notifications/sla-notifications';
import { SlaNotificationBadge } from '@/components/notifications/sla-notification-badge';
import { useAuth } from '@/hooks/use-auth';
import { Link, useLocation } from 'wouter';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { getInitials } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

type HeaderProps = {
  onMenuClick: () => void;
};

export function Header({ onMenuClick }: HeaderProps) {
  const { user, isLoading, logoutMutation } = useAuth();
  const [, navigate] = useLocation();
  
  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        navigate("/auth");
      }
    });
  };
  
  return (
    <>
      <header className="bg-background border-b border-border">
        <div className="flex justify-between items-center h-16 px-4 sm:px-6">
          <div className="flex">
            <Button 
              variant="ghost"
              size="icon"
              className="md:hidden text-muted-foreground"
              onClick={onMenuClick}
            >
              <Menu className="h-5 w-5" />
            </Button>
            
            <div className="relative ml-4 md:ml-0">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-muted-foreground" />
              </div>
              <Input 
                className="pl-10 w-full md:w-64 focus:ring-primary focus:border-primary"
                placeholder="Buscar chamados..."
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <ThemeToggle />
            
            <div className="relative">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <SlaNotificationBadge />
            </div>
          
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {isLoading ? (
                <Button variant="ghost" size="icon" className="text-muted-foreground">
                  <Skeleton className="h-8 w-8 rounded-full" />
                </Button>
              ) : (
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                      {user ? getInitials(user.fullName) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card border-border">
              {user && (
                <>
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium text-foreground">{user.fullName}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-border" />
                  <DropdownMenuItem asChild className="text-foreground hover:bg-muted">
                    <Link href="/profile" className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      <span>Meu Perfil</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="text-foreground hover:bg-muted">
                    <Link href="/settings" className="cursor-pointer">
                      <SettingsIcon className="mr-2 h-4 w-4" />
                      <span>Configurações</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-border" />
                  <DropdownMenuItem onClick={handleLogout} disabled={logoutMutation.isPending} className="text-foreground hover:bg-muted">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{logoutMutation.isPending ? "Saindo..." : "Sair"}</span>
                  </DropdownMenuItem>
                </>
              )}
              {!user && !isLoading && (
                <DropdownMenuItem asChild className="text-foreground hover:bg-muted">
                  <Link href="/auth" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    <span>Entrar</span>
                  </Link>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </div>
      </header>
      
      {/* Notificações SLA - controladas internamente */}
      <SlaNotifications />
    </>
  );
}
