import { Request, Response, NextFunction } from 'express';
import { User as DrizzleUser, UserRole } from '@shared/drizzle-schema';
import { hasPermission, Permission, canAccessTicket, canEditTicket } from '@shared/permissions';

// Tipo do usuário com todos os campos necessários
export type AuthUser = DrizzleUser & {
  role: UserRole;
  company: string | null;
  isActive: boolean;
};

// Interface estendida do Request
interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

// Middleware para verificar autenticação (versão simples para Express)
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  console.log('🔒 [Auth Middleware]', {
    path: req.path,
    authenticated: req.isAuthenticated(),
    hasUser: !!req.user,
    userId: req.user ? (req.user as any).id : null,
    userRole: req.user ? (req.user as any).role : null,
    sessionID: req.sessionID
  });
  
  if (!req.isAuthenticated() || !req.user) {
    console.warn('⚠️ [Auth Middleware] Acesso negado - não autenticado');
    return res.status(401).json({ message: 'Não autenticado' });
  }
  next();
};

// Middleware para verificar permissões específicas
export function requirePermission(permission: Permission) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Não autenticado' });
    }

    const userRole = req.user.role as UserRole;
    
    if (!hasPermission(userRole, permission)) {
      return res.status(403).json({ 
        message: `Acesso negado: permissão '${permission}' necessária`,
        userRole,
        requiredPermission: permission
      });
    }

    next();
  };
}

// Middleware para verificar se o usuário pode acessar recursos de uma empresa específica
export function requireCompanyAccess() {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Não autenticado' });
    }

    const userRole = req.user.role as UserRole;
    const userCompany = req.user.company;
    const targetCompany = req.params.company || req.body.company || req.query.company;

    // Admin e helpdesk têm acesso a qualquer empresa
    if (hasPermission(userRole, 'companies:view_all')) {
      return next();
    }

    // Usuários clientes só podem acessar dados da própria empresa
    if (userCompany && userCompany === targetCompany) {
      return next();
    }

    return res.status(403).json({ 
      message: 'Acesso negado: você só pode acessar dados da sua própria empresa',
      userCompany,
      targetCompany
    });
  };
}

// Middleware para verificar se o usuário está ativo
export function requireActiveUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: 'Não autenticado' });
  }

  if (!req.user.isActive) {
    return res.status(403).json({ message: 'Usuário desativado' });
  }

  next();
}

// Middleware combinado para auth + ativo + permissão
export function requireAuthAndPermission(permission: Permission) {
  return [
    (req: Request, res: Response, next: NextFunction) => {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: 'Não autenticado' });
      }
      next();
    },
    (req: Request, res: Response, next: NextFunction) => {
      const user = req.user as any; // Type assertion temporária
      if (!user.isActive) {
        return res.status(403).json({ message: 'Usuário desativado' });
      }
      next();
    },
    (req: Request, res: Response, next: NextFunction) => {
      const user = req.user as any; // Type assertion temporária
      const userRole = user.role as UserRole;
      
      if (!hasPermission(userRole, permission)) {
        return res.status(403).json({ 
          message: `Acesso negado: permissão '${permission}' necessária`,
          userRole,
          requiredPermission: permission
        });
      }
      next();
    }
  ];
}

// Função helper para verificar se um usuário pode acessar um ticket específico
export function canUserAccessTicket(user: any, ticket: any): boolean {
  // Delegate to shared permission helper to keep logic in one place
  try {
    // Para clientes, comparar por companyId ao invés de nome da empresa
    const userCompanyId = user.company && !isNaN(parseInt(user.company, 10)) 
      ? parseInt(user.company, 10) 
      : null;
    
    const ticketCompanyId = ticket.companyId || ticket.company?.id || null;
    
    // Se temos IDs numéricos, comparar por ID
    if (userCompanyId && ticketCompanyId) {
      if (userCompanyId === ticketCompanyId) {
        return true; // Mesma empresa, acesso liberado
      }
    }
    
    // Fallback: validação pelo e-mail para clientes
    const isOwnTicketByEmail = Boolean(ticket?.requester?.email && user?.email && ticket.requester.email === user.email);
    if (isOwnTicketByEmail) {
      return true;
    }
    
    // Usar a função canAccessTicket como fallback
    const effectiveRequesterId = isOwnTicketByEmail ? user.id : ticket.requesterId;
    return canAccessTicket(
      user.role as UserRole,
      user.company ?? null,
      ticket.requester?.company ?? null,
      effectiveRequesterId,
      user.id,
      ticket.assigneeId === user.id
    );
  } catch (err) {
    // Fallback conservative deny
    console.error('❌ Erro ao verificar acesso ao ticket:', err);
    return false;
  }
}

// Função helper para verificar se um usuário pode editar um ticket específico
export function canUserEditTicket(user: any, ticket: any): boolean {
  try {
    return canEditTicket(
      user.role as UserRole,
      user.company ?? null,
      ticket.requester?.company ?? null,
      ticket.requesterId,
      user.id,
      ticket.assigneeId === user.id
    );
  } catch (err) {
    return false;
  }
}

// Middleware para permitir apenas administradores
export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Não autenticado' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      message: 'Acesso negado: apenas administradores podem realizar esta ação',
      userRole: req.user.role
    });
  }

  next();
};
