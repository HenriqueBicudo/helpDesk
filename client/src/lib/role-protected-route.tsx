import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import NotFound from '@/pages/not-found';
import { UserRole } from '@shared/drizzle-schema';

interface RoleProtectedRouteProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RoleProtectedRoute({ 
  allowedRoles, 
  children, 
  fallback 
}: RoleProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  // Ainda carregando
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Não autenticado
  if (!user) {
    return fallback || <NotFound />;
  }

  // Verificar se o role do usuário está na lista de roles permitidos
  if (!allowedRoles.includes(user.role as UserRole)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Acesso Negado</h1>
          <p className="text-gray-600 mb-4">
            Você não tem permissão para acessar esta página.
          </p>
          <button 
            onClick={() => window.history.back()}
            className="text-primary hover:text-primary/80 underline"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// Helper para roles de helpdesk (admin, manager, agent)
export const HelpdeskRoles: UserRole[] = ['admin', 'helpdesk_manager', 'helpdesk_agent'];

// Helper para roles de admin apenas
export const AdminRoles: UserRole[] = ['admin'];

// Helper para roles de cliente
export const ClientRoles: UserRole[] = ['client_user', 'client_manager'];

// Helper para todos os roles
export const AllRoles: UserRole[] = ['admin', 'helpdesk_manager', 'helpdesk_agent', 'client_manager', 'client_user'];