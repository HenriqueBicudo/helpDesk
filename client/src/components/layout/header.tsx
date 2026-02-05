import { Menu, Bell, User, LogOut, Settings as SettingsIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { NotificationsPopover } from '@/components/notifications/notifications-popover';
import { SlaNotificationBadge } from '@/components/notifications/sla-notification-badge';
import { GlobalSearch } from '@/components/layout/global-search';
import { useAuth } from '@/hooks/use-auth';
import { Link, useLocation } from 'wouter';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { getInitials } from '@/lib/utils';
import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

type HeaderProps = {
  onMenuClick: () => void;
};

export function Header({ onMenuClick }: HeaderProps) {
  const { user, isLoading, logoutMutation } = useAuth();
  const [, navigate] = useLocation();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  
  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        navigate("/auth");
      }
    });
  };
  
  return (
    <>
      <header className="bg-white dark:bg-card border-b-2 border-primary shadow-sm">
        <div className="flex justify-between items-center h-16 px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost"
              size="icon"
              className="md:hidden text-foreground hover:bg-primary/10"
              onClick={onMenuClick}
            >
              <Menu className="h-5 w-5" />
            </Button>
            
            <GlobalSearch />
          </div>
          
          <div className="flex items-center gap-3">
            <ThemeToggle />
            
            <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative hover:bg-primary/10">
                  <Bell className="h-5 w-5 text-foreground" />
                  <SlaNotificationBadge />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-96 p-0 bg-card">
                <div className="flex items-center justify-between p-4 border-b">
                  <h3 className="font-semibold text-foreground">Notificações</h3>
                </div>
                <NotificationsPopover />
              </PopoverContent>
            </Popover>
          
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {isLoading ? (
                <Button variant="ghost" size="icon" className="text-muted-foreground">
                  <Skeleton className="h-9 w-9 rounded-full" />
                </Button>
              ) : (
                <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-primary/10">
                  <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                    <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white font-semibold text-sm">
                      {user ? getInitials(user.fullName) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-card border-border shadow-lg">
              {user && (
                <>
                  <DropdownMenuLabel className="pb-2">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-semibold text-foreground">{user.fullName}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-border" />
                  <DropdownMenuItem asChild className="text-foreground hover:bg-primary/10 cursor-pointer">
                    <Link href="/profile" className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      <span>Meu Perfil</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="text-foreground hover:bg-primary/10 cursor-pointer">
                    <Link href="/settings" className="cursor-pointer">
                      <SettingsIcon className="mr-2 h-4 w-4" />
                      <span>Configurações</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-border" />
                  <DropdownMenuItem onClick={handleLogout} disabled={logoutMutation.isPending} className="text-destructive hover:bg-destructive/10 cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{logoutMutation.isPending ? "Saindo..." : "Sair"}</span>
                  </DropdownMenuItem>
                </>
              )}
              {!user && !isLoading && (
                <DropdownMenuItem asChild className="text-foreground hover:bg-primary/10 cursor-pointer">
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
    </>
  );
}
