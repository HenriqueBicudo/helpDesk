import { Request, Response, NextFunction } from 'express';
import { User as DrizzleUser, UserRole } from '@shared/drizzle-schema';
import { hasPermission, Permission } from '@shared/permissions';

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
  if (!req.isAuthenticated() || !req.user) {
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
  const userRole = user.role as UserRole;
  const userCompany = user.company;
  
  // Admin e helpdesk têm acesso a todos os tickets
  if (hasPermission(userRole, 'tickets:view_all')) {
    return true;
  }
  
  // Usuários podem ver tickets da própria empresa
  if (hasPermission(userRole, 'tickets:view_company')) {
    if (userCompany && userCompany === ticket.requester?.company) {
      return true;
    }
  }
  
  // Usuários podem ver seus próprios tickets
  if (hasPermission(userRole, 'tickets:view_own')) {
    // Se é o requester original ou está atribuído ao ticket
    if (ticket.requesterId === user.id || ticket.assigneeId === user.id) {
      return true;
    }
  }
  
  return false;
}

// Função helper para verificar se um usuário pode editar um ticket específico
export function canUserEditTicket(user: any, ticket: any): boolean {
  const userRole = user.role as UserRole;
  const userCompany = user.company;
  
  // Admin e helpdesk agents podem editar todos os tickets
  if (hasPermission(userRole, 'tickets:edit_all')) {
    return true;
  }
  
  // Client managers podem editar tickets da própria empresa
  if (hasPermission(userRole, 'tickets:edit_company')) {
    if (userCompany && userCompany === ticket.requester?.company) {
      return true;
    }
  }
  
  // Usuários podem editar seus próprios tickets (limitado)
  if (hasPermission(userRole, 'tickets:edit_own')) {
    if (ticket.requesterId === user.id || ticket.assigneeId === user.id) {
      return true;
    }
  }
  
  return false;
}
