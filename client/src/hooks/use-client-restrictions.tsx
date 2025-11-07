import { useAuth } from './use-auth';

export function useClientRestrictions() {
  const { user } = useAuth();
  
  const isClient = user?.role === 'client_user' || user?.role === 'client_manager';
  const isClientUser = user?.role === 'client_user';
  const isClientManager = user?.role === 'client_manager';
  
  return {
    isClient,
    isClientUser,
    isClientManager,
    
    // Restrições específicas para clientes
    canViewInternalComments: false,
    canLogTime: false,
    canUseMacros: false,
    canChangeStatus: !isClientUser, // Client managers podem alterar status
    canAssignTickets: false,
    canEditTags: false,
    canLinkTickets: false,
    canViewAllTickets: false,
    canAccessSettings: false,
    canAccessReports: false,
    canAccessKnowledgeBase: false,
    
    // Funcionalidades permitidas
    canCreateTickets: true,
    canCommentOnTickets: true,
    canViewOwnTickets: true,
    canAttachFiles: true,
  };
}