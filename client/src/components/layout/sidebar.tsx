import React from 'react';
import { Link, useLocation } from 'wouter';
import { cn, getInitials } from '@/lib/utils';
import { MessageCircleCode, ChevronRight, LayoutDashboard, Ticket, Settings, FileBarChart, Database, User, Shield, FileText, Target, BarChart3, Users } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/use-auth';
import { useClientRestrictions } from '@/hooks/use-client-restrictions';
import { ROLE_LABELS } from '@shared/permissions';
import { Skeleton } from '@/components/ui/skeleton';

type SidebarLinkProps = {
  href: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  active?: boolean;
  level?: number;
  isExpanded?: boolean;
};

const SidebarLink = ({ href, icon, children, active, level = 1, isExpanded }: SidebarLinkProps) => {
  const [, setLocation] = useLocation();
  
  return (
    <div
      className={cn(
        "flex items-center px-4 py-2.5 text-sm font-medium rounded-md group transition-colors cursor-pointer",
        level === 1 ? "mt-1" : "mt-0 py-1.5",
        active
          ? "bg-primary text-primary-foreground"
          : level === 1
            ? "text-muted-foreground hover:text-foreground hover:bg-accent"
            : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
      )}
      onClick={() => setLocation(href)}
    >
      {icon}
      <span className={icon ? "ml-3" : ""}>{children}</span>
      {isExpanded && <ChevronRight className="ml-auto h-4 w-4 transform rotate-90" />}
    </div>
  );
};

type SidebarProps = {
  isOpen?: boolean;
  onClose?: () => void;
};

export function Sidebar({ isOpen = true }: SidebarProps) {
  const [location] = useLocation();
  const { user, isLoading } = useAuth();
  const { isClient } = useClientRestrictions();
  
  return (
    <div 
      className={cn(
        "flex flex-col w-64 bg-card border-r border-border h-screen transition-transform duration-300 ease-in-out",
        !isOpen && "transform -translate-x-full md:translate-x-0 fixed inset-y-0 z-50 md:relative"
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 bg-card border-b border-border">
        <div className="flex items-center">
          <MessageCircleCode className="text-primary mr-2 h-6 w-6" />
          <span className="text-foreground font-semibold text-lg">HelpDesk</span>
        </div>
      </div>
      
      {/* User */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-border">
        <div className="flex items-center">
          {isLoading ? (
            <div className="flex items-center">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="ml-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16 mt-1" />
              </div>
            </div>
          ) : user ? (
            <>
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {getInitials(user.fullName)}
                </AvatarFallback>
              </Avatar>
              <div className="ml-3">
                <p className="text-sm font-medium text-foreground">{user.fullName}</p>
                <p className="text-xs text-muted-foreground">{(ROLE_LABELS as any)[user.role] || user.role}</p>
              </div>
            </>
          ) : (
            <Link href="/auth" className="text-muted-foreground hover:text-foreground flex items-center px-4 py-2 text-sm">
              <User className="mr-2 h-5 w-5" />
              <span>Entrar</span>
            </Link>
          )}
        </div>
      </div>
      
      {/* Navigation Menu */}
      <div className="flex-1 h-0 overflow-y-auto scrollbar-thin">
        <nav className="py-4">
          <div className="px-4 mb-2 text-xs font-semibold text-muted-foreground uppercase">Principal</div>
          
          <SidebarLink 
            href="/" 
            icon={<LayoutDashboard className="mr-3 h-5 w-5" />} 
            active={location === '/'}
          >
            Dashboard
          </SidebarLink>

          <SidebarLink 
            href="/my-team" 
            icon={<Users className="mr-3 h-5 w-5" />} 
            active={location === '/my-team'}
          >
            {isClient ? 'Meus Colegas' : 'Minha Equipe'}
          </SidebarLink>
          
          <div>
            <SidebarLink 
              href="/tickets" 
              icon={<Ticket className="mr-3 h-5 w-5" />} 
              active={location === '/tickets' || location.startsWith('/tickets/')}
              isExpanded
            >
              Chamados
            </SidebarLink>
            
            <div className="ml-10 pl-2 border-l border-border space-y-1">
              <SidebarLink 
                href="/tickets" 
                level={2}
                active={location === '/tickets' && !location.includes('/kanban')}
              >
                Lista
              </SidebarLink>
              
              <SidebarLink 
                href="/tickets/kanban" 
                level={2}
                active={location === '/tickets/kanban'}
              >
                Kanban
              </SidebarLink>
            </div>
          </div>

          {/* Seção específica para clientes */}
          {(user?.role === 'client_user' || user?.role === 'client_manager') && (
            <>
              <div className="px-4 mt-4 mb-2 text-xs font-semibold text-muted-foreground uppercase">Minha Conta</div>
              
              <SidebarLink 
                href="/profile" 
                icon={<User className="mr-3 h-5 w-5" />} 
                active={location === '/profile'}
              >
                Meu Perfil
              </SidebarLink>

              {user?.role === 'client_manager' && (
                <SidebarLink 
                  href="/team" 
                  icon={<Shield className="mr-3 h-5 w-5" />} 
                  active={location === '/team'}
                >
                  Minha Equipe
                </SidebarLink>
              )}
            </>
          )}
          
          {/* Seção Gerenciamento - Apenas para equipe helpdesk */}
          {user?.role !== 'client_user' && user?.role !== 'client_manager' && (
            <>
              <div className="px-4 mt-4 mb-2 text-xs font-semibold text-muted-foreground uppercase">Gerenciamento</div>
              
              {/* Acessos - apenas para administradores */}
              {user?.role === 'admin' && (
                <SidebarLink 
                  href="/access" 
                  icon={<Shield className="mr-3 h-5 w-5" />} 
                  active={location === '/access'}
                >
                  Acessos
                </SidebarLink>
              )}

              {/* Contratos - para administradores e gerentes */}
              {(user?.role === 'admin' || user?.role === 'helpdesk_manager') && (
                <SidebarLink 
                  href="/contracts" 
                  icon={<FileText className="mr-3 h-5 w-5" />} 
                  active={location === '/contracts'}
                >
                  Contratos
                </SidebarLink>
              )}
            </>
          )}

          {/* SLA Dashboard - Apenas para equipe helpdesk e admins */}
          {user && user.role !== 'client_user' && user.role !== 'client_manager' && (
            <div className="px-4">
              {user?.role === 'admin' && (
                <SidebarLink 
                  href="/sla/admin" 
                  icon={<Settings className="mr-3 h-5 w-5" />} 
                  active={location === '/sla/admin'}
                >
                  Administração
                </SidebarLink>
              )}
              
              <SidebarLink 
                href="/sla/manager" 
                icon={<BarChart3 className="mr-3 h-5 w-5" />} 
                active={location === '/sla/manager'}
              >
                Dashboard Gerencial
              </SidebarLink>
              
              <SidebarLink 
                href="/sla/agent" 
                icon={<Target className="mr-3 h-5 w-5" />} 
                active={location === '/sla/agent'}
              >
                Dashboard do Agente
              </SidebarLink>
            </div>
          )}
          
          {/* Seção Sistema - Apenas para equipe helpdesk e admins */}
          {user?.role !== 'client_user' && user?.role !== 'client_manager' && (
            <>
              <div className="px-4 mt-4 mb-2 text-xs font-semibold text-muted-foreground uppercase">Sistema</div>
              
              <SidebarLink 
                href="/settings" 
                icon={<Settings className="mr-3 h-5 w-5" />} 
                active={location === '/settings'}
              >
                Configurações
              </SidebarLink>
              
              <SidebarLink 
                href="/reports" 
                icon={<FileBarChart className="mr-3 h-5 w-5" />} 
                active={location === '/reports'}
              >
                Relatórios
              </SidebarLink>
              
              <SidebarLink 
                href="/knowledge" 
                icon={<Database className="mr-3 h-5 w-5" />} 
                active={location === '/knowledge'}
              >
                Base de Conhecimento
              </SidebarLink>
            </>
          )}
        </nav>
      </div>
    </div>
  );
}
