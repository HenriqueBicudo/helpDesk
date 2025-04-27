import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { cn, getInitials } from '@/lib/utils';
import { MessageCircleCode, ChevronRight, LayoutDashboard, Ticket, Users, UserCog, Settings, FileBarChart, Database, User } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/use-auth';
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
          ? "bg-primary text-white"
          : level === 1
            ? "text-gray-300 hover:text-white hover:bg-gray-700"
            : "text-gray-400 hover:text-white hover:bg-gray-800"
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

export function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const [location] = useLocation();
  const { user, isLoading } = useAuth();
  
  return (
    <div 
      className={cn(
        "flex flex-col w-64 bg-[#2c3e50] h-screen transition-transform duration-300 ease-in-out",
        !isOpen && "transform -translate-x-full md:translate-x-0 fixed inset-y-0 z-50 md:relative"
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 bg-[#2c3e50] border-b border-gray-700">
        <div className="flex items-center">
          <MessageCircleCode className="text-white mr-2 h-6 w-6" />
          <span className="text-white font-semibold text-lg">HelpDesk</span>
        </div>
      </div>
      
      {/* User */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-gray-700">
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
                <AvatarFallback className="bg-primary/10 text-white">
                  {getInitials(user.fullName)}
                </AvatarFallback>
              </Avatar>
              <div className="ml-3">
                <p className="text-sm font-medium text-white">{user.fullName}</p>
                <p className="text-xs text-gray-400">{user.role}</p>
              </div>
            </>
          ) : (
            <Link href="/auth" className="text-gray-300 hover:text-white flex items-center px-4 py-2 text-sm">
              <User className="mr-2 h-5 w-5" />
              <span>Entrar</span>
            </Link>
          )}
        </div>
      </div>
      
      {/* Navigation Menu */}
      <div className="flex-1 h-0 overflow-y-auto scrollbar-thin">
        <nav className="py-4">
          <div className="px-4 mb-2 text-xs font-semibold text-gray-400 uppercase">Principal</div>
          
          <SidebarLink 
            href="/" 
            icon={<LayoutDashboard className="mr-3 h-5 w-5" />} 
            active={location === '/'}
          >
            Dashboard
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
            
            <div className="ml-10 pl-2 border-l border-gray-700 space-y-1">
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
          
          <SidebarLink 
            href="/customers" 
            icon={<Users className="mr-3 h-5 w-5" />} 
            active={location === '/customers'}
          >
            Clientes
          </SidebarLink>
          
          <SidebarLink 
            href="/agents" 
            icon={<UserCog className="mr-3 h-5 w-5" />} 
            active={location === '/agents'}
          >
            Agentes
          </SidebarLink>
          
          <div className="px-4 mt-4 mb-2 text-xs font-semibold text-gray-400 uppercase">Gerenciamento</div>
          
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
        </nav>
      </div>
    </div>
  );
}
