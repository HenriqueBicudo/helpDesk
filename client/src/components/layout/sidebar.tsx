import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { MessageCircleCode, ChevronRight, LayoutDashboard, Ticket, Users, UserCog, Settings, FileBarChart, Database } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

type SidebarLinkProps = {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  active?: boolean;
};

const SidebarLink = ({ href, icon, children, active }: SidebarLinkProps) => {
  const [, setLocation] = useLocation();
  
  return (
    <div
      className={cn(
        "flex items-center px-4 py-2.5 text-sm font-medium rounded-md group mt-1 transition-colors cursor-pointer",
        active
          ? "bg-primary text-white"
          : "text-gray-300 hover:text-white hover:bg-gray-700"
      )}
      onClick={() => setLocation(href)}
    >
      {icon}
      <span className="ml-3">{children}</span>
    </div>
  );
};

type SidebarProps = {
  isOpen?: boolean;
  onClose?: () => void;
};

export function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const [location] = useLocation();
  
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
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary/10 text-white">
              AS
            </AvatarFallback>
          </Avatar>
          <div className="ml-3">
            <p className="text-sm font-medium text-white">Ana Silva</p>
            <p className="text-xs text-gray-400">Administrador</p>
          </div>
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
          
          <SidebarLink 
            href="/tickets" 
            icon={<Ticket className="mr-3 h-5 w-5" />} 
            active={location === '/tickets' || location.startsWith('/tickets/')}
          >
            Chamados
          </SidebarLink>
          
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
