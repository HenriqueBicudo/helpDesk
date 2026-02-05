import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { cn, getInitials } from '@/lib/utils';
import { ChevronRight, LayoutDashboard, Ticket, Settings, FileBarChart, Database, User, Shield, FileText, Target, BarChart3, Users, BookOpen, PanelLeftClose, PanelLeftOpen, Building2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/use-auth';
import { useClientRestrictions } from '@/hooks/use-client-restrictions';
import { ROLE_LABELS } from '@shared/permissions';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

type SidebarLinkProps = {
  href: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  active?: boolean;
  level?: number;
  isExpanded?: boolean;
  collapsed?: boolean;
};

const SidebarLink = ({ href, icon, children, active, level = 1, isExpanded, collapsed }: SidebarLinkProps) => {
  const [, setLocation] = useLocation();
  
  const linkContent = (
    <div
      className={cn(
        "flex items-center text-sm font-medium rounded-lg group transition-all cursor-pointer relative overflow-hidden",
        collapsed ? "p-2.5 justify-center mx-1" : "py-2.5 px-3 mx-2",
        level === 1 ? "my-1" : "my-0.5 py-2",
        active
          ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30 scale-[1.02]"
          : level === 1
            ? "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-white/10 hover:shadow-md backdrop-blur-sm border border-transparent hover:border-white/20"
            : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-white/5"
      )}
      onClick={() => setLocation(href)}
    >
      {/* Background gradient on hover */}
      {!active && level === 1 && (
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 to-indigo-500/0 group-hover:from-blue-500/10 group-hover:to-indigo-500/10 transition-all duration-300" />
      )}
      
      <div className="relative z-10 flex items-center w-full">
        {icon && (
          <div className={cn(
            "flex items-center justify-center transition-all",
            active ? "text-white" : "text-sidebar-foreground/70 group-hover:text-sidebar-foreground",
            collapsed ? "" : ""
          )}>
            {icon}
          </div>
        )}
        {!collapsed && (
          <>
            <span className={cn("ml-3 truncate", active && "font-semibold")}>{children}</span>
            {isExpanded && <ChevronRight className="ml-auto h-4 w-4 transform rotate-90" />}
          </>
        )}
      </div>
    </div>
  );

  if (collapsed && level === 1) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            {linkContent}
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-sidebar border-sidebar-border text-white">
            <p>{children}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return linkContent;
};

type SidebarProps = {
  isOpen?: boolean;
  onClose?: () => void;
};

export function Sidebar({ isOpen = true }: SidebarProps) {
  const [location] = useLocation();
  const { user, isLoading } = useAuth();
  const { isClient } = useClientRestrictions();
  
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved === 'true';
  });
  
  const [hoverMode, setHoverMode] = useState(() => {
    const saved = localStorage.getItem('sidebar-hover-mode');
    return saved === 'true';
  });
  
  const [isHovered, setIsHovered] = useState(false);
  
  const [expandedSections, setExpandedSections] = useState(() => {
    const saved = localStorage.getItem('sidebar-sections');
    return saved ? JSON.parse(saved) : {
      principal: true,
      account: true,
      management: true,
      sla: true,
      system: true
    };
  });
  
  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(collapsed));
  }, [collapsed]);
  
  useEffect(() => {
    localStorage.setItem('sidebar-hover-mode', String(hoverMode));
  }, [hoverMode]);
  
  useEffect(() => {
    localStorage.setItem('sidebar-sections', JSON.stringify(expandedSections));
  }, [expandedSections]);
  
  const toggleSection = (section: string) => {
    setExpandedSections((prev: any) => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  const isExpanded = !collapsed || (hoverMode && isHovered);
  
  return (
    <div 
      className={cn(
        "flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border h-screen transition-all duration-300 ease-in-out",
        isExpanded ? "w-64" : "w-16",
        !isOpen && "transform -translate-x-full md:translate-x-0 fixed inset-y-0 z-50 md:relative"
      )}
      onMouseEnter={() => hoverMode && setIsHovered(true)}
      onMouseLeave={() => hoverMode && setIsHovered(false)}
    >
      {/* Logo TOTVS */}
      <div className="flex items-center justify-between h-16 px-4 bg-sidebar border-b border-sidebar-border">
        {isExpanded && (
          <img 
            src="/logoTotvs.png" 
            alt="TOTVS" 
            className="h-12 w-auto object-contain ml-2"
          />
        )}
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all",
                  !isExpanded && "mx-auto"
                )}
                onClick={() => setCollapsed(!collapsed)}
              >
                {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-sidebar border-sidebar-border text-white">
              <p>{collapsed ? 'Expandir sidebar' : 'Recolher sidebar'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      {/* User */}
      <div className="flex-shrink-0 px-4 py-4 border-b border-sidebar-border bg-sidebar-accent/30">
        {isExpanded ? (
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
                <Avatar className="h-10 w-10 ring-2 ring-white/20">
                  <AvatarFallback className="bg-sidebar-accent text-sidebar-foreground font-semibold backdrop-blur">
                    {getInitials(user.fullName)}
                  </AvatarFallback>
                </Avatar>
                <div className="ml-3 overflow-hidden">
                  <p className="text-sm font-semibold text-sidebar-foreground truncate">{user.fullName}</p>
                  <p className="text-xs text-sidebar-foreground/70 truncate">{(ROLE_LABELS as any)[user.role] || user.role}</p>
                </div>
              </>
            ) : (
              <Link href="/auth" className="text-sidebar-foreground/80 hover:text-sidebar-foreground flex items-center px-4 py-2 text-sm">
                <User className="mr-2 h-5 w-5" />
                <span>Entrar</span>
              </Link>
            )}
          </div>
        ) : (
          <div className="flex justify-center">
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Avatar className="h-10 w-10 ring-2 ring-white/20 cursor-pointer">
                    <AvatarFallback className="bg-sidebar-accent text-sidebar-foreground font-semibold backdrop-blur">
                      {user ? getInitials(user.fullName) : <User className="h-5 w-5" />}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-sidebar border-sidebar-border text-white">
                  {user ? (
                    <div>
                      <p className="font-semibold">{user.fullName}</p>
                      <p className="text-xs text-white/70">{(ROLE_LABELS as any)[user.role] || user.role}</p>
                    </div>
                  ) : (
                    <p>Entrar</p>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>
      
      {/* Hover Mode Toggle */}
      {collapsed && !isHovered && (
        <div className="px-2 py-3 border-b border-sidebar-border">
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center justify-center">
                  <Switch
                    checked={hoverMode}
                    onCheckedChange={setHoverMode}
                    className="scale-75"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-sidebar border-sidebar-border max-w-xs text-white">
                <p className="font-semibold mb-1">Modo Hover</p>
                <p className="text-xs">Expande automaticamente ao passar o mouse</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
      
      {collapsed && isHovered && hoverMode && (
        <div className="px-4 py-3 border-b border-sidebar-border">
          <div className="flex items-center justify-between">
            <Label htmlFor="hover-mode" className="text-xs text-sidebar-foreground/80 cursor-pointer">
              Modo Hover
            </Label>
            <Switch
              id="hover-mode"
              checked={hoverMode}
              onCheckedChange={setHoverMode}
              className="scale-75"
            />
          </div>
          <p className="text-xs text-sidebar-foreground/60 mt-1">Expande ao passar o mouse</p>
        </div>
      )}
      
      {/* Navigation Menu */}
      <div className="flex-1 h-0 overflow-y-auto scrollbar-thin px-2">
        <nav className="py-4 space-y-6">
          {/* Seção Principal */}
          <div className="space-y-1">
            {isExpanded && (
              <div 
                className="px-2 mb-3 flex items-center gap-2 cursor-pointer group hover:bg-white/5 rounded-md py-1 transition-colors"
                onClick={() => toggleSection('principal')}
              >
                <div className="h-1 w-1 rounded-full bg-blue-500"></div>
                <span className="text-[10px] font-bold text-sidebar-foreground/50 uppercase tracking-wider flex-1">Principal</span>
                <ChevronRight className={cn(
                  "h-3 w-3 text-sidebar-foreground/40 transition-transform",
                  expandedSections.principal && "rotate-90"
                )} />
              </div>
            )}
          
            {expandedSections.principal && (
              <>
                <SidebarLink 
                  href="/" 
                  icon={<LayoutDashboard className="h-5 w-5" />} 
                  active={location === '/'}
                  collapsed={!isExpanded}
                >
                  Dashboard
                </SidebarLink>

                <SidebarLink 
                  href="/my-team" 
                  icon={<Users className="h-5 w-5" />} 
                  active={location === '/my-team'}
                  collapsed={!isExpanded}
                >
                  {isClient ? 'Meus Colegas' : 'Minha Equipe'}
                </SidebarLink>
          
                <div>
                  <SidebarLink 
                    href="/tickets" 
                    icon={<Ticket className="h-5 w-5" />} 
                    active={location === '/tickets' || location.startsWith('/tickets/')}
                    isExpanded={isExpanded}
                    collapsed={!isExpanded}
                  >
                    Chamados
                  </SidebarLink>
            
                  {isExpanded && (
                    <div className="ml-10 pl-2 border-l-2 border-white/10 space-y-0.5 mt-1">
                      <SidebarLink 
                        href="/tickets" 
                        level={2}
                        active={location === '/tickets' && !location.includes('/kanban')}
                        collapsed={!isExpanded}
                      >
                        Lista
                      </SidebarLink>
                
                      <SidebarLink 
                        href="/tickets/kanban" 
                        level={2}
                        active={location === '/tickets/kanban'}
                        collapsed={!isExpanded}
                      >
                        Kanban
                      </SidebarLink>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Seção específica para clientes */}
          {(user?.role === 'client_user' || user?.role === 'client_manager') && (
            <div className="space-y-1">
              {isExpanded && (
                <div 
                  className="px-2 mb-3 flex items-center gap-2 cursor-pointer group hover:bg-white/5 rounded-md py-1 transition-colors"
                  onClick={() => toggleSection('account')}
                >
                  <div className="h-1 w-1 rounded-full bg-green-500"></div>
                  <span className="text-[10px] font-bold text-sidebar-foreground/50 uppercase tracking-wider flex-1">Minha Conta</span>
                  <ChevronRight className={cn(
                    "h-3 w-3 text-sidebar-foreground/40 transition-transform",
                    expandedSections.account && "rotate-90"
                  )} />
                </div>
              )}
              
              {expandedSections.account && (
                <>
                  <SidebarLink 
                    href="/profile" 
                    icon={<User className="h-5 w-5" />} 
                    active={location === '/profile'}
                    collapsed={!isExpanded}
                  >
                    Meu Perfil
                  </SidebarLink>

                  {/* {user?.role === 'client_manager' && (
                    <SidebarLink 
                      href="/team" 
                      icon={<Shield className="h-5 w-5" />} 
                      active={location === '/team'}
                      collapsed={!isExpanded}
                    >
                      Minha Equipe
                    </SidebarLink>
                  )} */}
                </>
              )}
            </div>
          )}
          
          {/* Seção Gerenciamento - Apenas para equipe helpdesk */}
          {user?.role !== 'client_user' && user?.role !== 'client_manager' && (
            <div className="space-y-1">
              {isExpanded && (
                <div 
                  className="px-2 mb-3 flex items-center gap-2 cursor-pointer group hover:bg-white/5 rounded-md py-1 transition-colors"
                  onClick={() => toggleSection('management')}
                >
                  <div className="h-1 w-1 rounded-full bg-purple-500"></div>
                  <span className="text-[10px] font-bold text-sidebar-foreground/50 uppercase tracking-wider flex-1">Gerenciamento</span>
                  <ChevronRight className={cn(
                    "h-3 w-3 text-sidebar-foreground/40 transition-transform",
                    expandedSections.management && "rotate-90"
                  )} />
                </div>
              )}
              
              {expandedSections.management && (
                <>
                  {/* Acessos - apenas para administradores */}
                  {user?.role === 'admin' && (
                    <SidebarLink 
                      href="/access" 
                      icon={<Shield className="h-5 w-5" />} 
                      active={location === '/access'}
                      collapsed={!isExpanded}
                    >
                      Acessos
                    </SidebarLink>
                  )}

                  {/* Contratos - para administradores e gerentes */}
                  {(user?.role === 'admin' || user?.role === 'helpdesk_manager') && (
                    <SidebarLink 
                      href="/contracts" 
                      icon={<FileText className="h-5 w-5" />} 
                      active={location === '/contracts'}
                      collapsed={!isExpanded}
                    >
                      Contratos
                    </SidebarLink>
                  )}

                  {/* Clientes - para toda equipe helpdesk */}
                  <SidebarLink 
                    href="/customers" 
                    icon={<Building2 className="h-5 w-5" />} 
                    active={location === '/customers'}
                    collapsed={!isExpanded}
                  >
                    Clientes
                  </SidebarLink>
                </>
              )}
            </div>
          )}

          {/* SLA Dashboard - Apenas para equipe helpdesk e admins */}
          {user && user.role !== 'client_user' && user.role !== 'client_manager' && (
            <div className="space-y-1">
              {isExpanded && (
                <div 
                  className="px-2 mb-3 flex items-center gap-2 cursor-pointer group hover:bg-white/5 rounded-md py-1 transition-colors"
                  onClick={() => toggleSection('sla')}
                >
                  <div className="h-1 w-1 rounded-full bg-orange-500"></div>
                  <span className="text-[10px] font-bold text-sidebar-foreground/50 uppercase tracking-wider flex-1">Dashboards SLA</span>
                  <ChevronRight className={cn(
                    "h-3 w-3 text-sidebar-foreground/40 transition-transform",
                    expandedSections.sla && "rotate-90"
                  )} />
                </div>
              )}
              
              {expandedSections.sla && (
                <>
                  {user?.role === 'admin' && (
                    <SidebarLink 
                      href="/sla/admin" 
                      icon={<Settings className="h-5 w-5" />} 
                      active={location === '/sla/admin'}
                      collapsed={!isExpanded}
                    >
                      Administração
                    </SidebarLink>
                  )}
              
                  <SidebarLink 
                    href="/sla/manager" 
                    icon={<BarChart3 className="h-5 w-5" />} 
                    active={location === '/sla/manager'}
                    collapsed={!isExpanded}
                  >
                    Gerencial
                  </SidebarLink>
              
                  <SidebarLink 
                    href="/sla/agent" 
                    icon={<Target className="h-5 w-5" />} 
                    active={location === '/sla/agent'}
                    collapsed={!isExpanded}
                  >
                    Agente
                  </SidebarLink>
                </>
              )}
            </div>
          )}
          
          {/* Seção Sistema - Apenas para equipe helpdesk e admins */}
          {user?.role !== 'client_user' && user?.role !== 'client_manager' && (
            <div className="space-y-1">
              {isExpanded && (
                <div 
                  className="px-2 mb-3 flex items-center gap-2 cursor-pointer group hover:bg-white/5 rounded-md py-1 transition-colors"
                  onClick={() => toggleSection('system')}
                >
                  <div className="h-1 w-1 rounded-full bg-cyan-500"></div>
                  <span className="text-[10px] font-bold text-sidebar-foreground/50 uppercase tracking-wider flex-1">Sistema</span>
                  <ChevronRight className={cn(
                    "h-3 w-3 text-sidebar-foreground/40 transition-transform",
                    expandedSections.system && "rotate-90"
                  )} />
                </div>
              )}
              
              {expandedSections.system && (
                <>
                  <SidebarLink 
                    href="/settings" 
                    icon={<Settings className="h-5 w-5" />} 
                    active={location === '/settings'}
                    collapsed={!isExpanded}
                  >
                    Configurações
                  </SidebarLink>
              
                  <SidebarLink 
                    href="/reports" 
                    icon={<FileBarChart className="h-5 w-5" />} 
                    active={location === '/reports'}
                    collapsed={!isExpanded}
                  >
                    Relatórios
                  </SidebarLink>
              
                  <SidebarLink 
                    href="/knowledge" 
                    icon={<Database className="h-5 w-5" />} 
                    active={location === '/knowledge'}
                    collapsed={!isExpanded}
                  >
                    Base de Conhecimento
                  </SidebarLink>
                </>
              )}
            </div>
          )}
        </nav>
      </div>
    </div>
  );
}
