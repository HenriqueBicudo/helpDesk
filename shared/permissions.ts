import { UserRole } from './drizzle-schema';

// Definir permissões específicas
export const PERMISSIONS = {
  // Permissões de tickets
  'tickets:view_all': 'Ver todos os tickets do sistema',
  'tickets:view_company': 'Ver tickets da própria empresa',
  'tickets:view_own': 'Ver apenas os próprios tickets',
  'tickets:create': 'Criar novos tickets',
  'tickets:edit_all': 'Editar todos os tickets',
  'tickets:edit_company': 'Editar tickets da própria empresa',
  'tickets:edit_own': 'Editar apenas os próprios tickets',
  'tickets:delete': 'Deletar tickets',
  'tickets:assign': 'Atribuir tickets a agentes',
  'tickets:change_status': 'Alterar status de tickets',
  'tickets:escalate': 'Escalar tickets',
  'tickets:close': 'Fechar tickets',
  
  // Permissões de SLA
  'sla:view': 'Ver informações de SLA',
  'sla:manage': 'Gerenciar configurações de SLA',
  'sla:extend_deadline': 'Estender prazos de SLA',
  
  // Permissões de usuários
  'users:view_all': 'Ver todos os usuários',
  'users:view_company': 'Ver usuários da própria empresa',
  'users:create': 'Criar novos usuários',
  'users:edit': 'Editar usuários',
  'users:delete': 'Deletar usuários',
  'users:manage_roles': 'Gerenciar roles de usuários',
  
  // Permissões de empresa/clientes
  'companies:view_all': 'Ver todas as empresas',
  'companies:manage': 'Gerenciar empresas',
  'requesters:view_all': 'Ver todos os solicitantes',
  'requesters:view_company': 'Ver solicitantes da própria empresa',
  'requesters:manage': 'Gerenciar solicitantes',
  
  // Permissões de relatórios
  'reports:view_all': 'Ver todos os relatórios',
  'reports:view_company': 'Ver relatórios da própria empresa',
  'reports:export': 'Exportar relatórios',
  
  // Permissões de configurações
  'settings:view': 'Ver configurações do sistema',
  'settings:manage': 'Gerenciar configurações do sistema',
  'templates:manage': 'Gerenciar templates de resposta',
  'email:manage': 'Gerenciar templates de email',
  
  // Permissões de tempo/horas
  'time:log': 'Apontar horas de trabalho',
  'time:view_all': 'Ver todas as horas apontadas',
  'time:view_company': 'Ver horas da própria empresa',
  'time:edit': 'Editar horas apontadas',
  
  // Permissões de dashboard
  'dashboard:view_all': 'Ver dashboard completo',
  'dashboard:view_company': 'Ver dashboard da própria empresa'
} as const;

export type Permission = keyof typeof PERMISSIONS;

// Mapeamento de roles para permissões
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  // Administrador - acesso total
  admin: [
    'tickets:view_all',
    'tickets:create', 
    'tickets:edit_all',
    'tickets:delete',
    'tickets:assign',
    'tickets:change_status',
    'tickets:escalate',
    'tickets:close',
    'sla:view',
    'sla:manage',
    'sla:extend_deadline',
    'users:view_all',
    'users:create',
    'users:edit',
    'users:delete',
    'users:manage_roles',
    'companies:view_all',
    'companies:manage',
    'requesters:view_all',
    'requesters:manage',
    'reports:view_all',
    'reports:export',
    'settings:view',
    'settings:manage',
    'templates:manage',
    'email:manage',
    'time:log',
    'time:view_all',
    'time:edit',
    'dashboard:view_all'
  ],
  
  // Gerente da empresa de helpdesk - acesso total exceto configurações críticas
  helpdesk_manager: [
    'tickets:view_all',
    'tickets:create',
    'tickets:edit_all',
    'tickets:assign',
    'tickets:change_status',
    'tickets:escalate',
    'tickets:close',
    'sla:view',
    'sla:manage',
    'sla:extend_deadline',
    'users:view_all',
    'users:create',
    'users:edit',
    'companies:view_all',
    'companies:manage',
    'requesters:view_all',
    'requesters:manage',
    'reports:view_all',
    'reports:export',
    'settings:view',
    'templates:manage',
    'email:manage',
    'time:log',
    'time:view_all',
    'time:edit',
    'dashboard:view_all'
  ],
  
  // Agente da empresa de helpdesk - acesso operacional a todos os tickets
  helpdesk_agent: [
    'tickets:view_all',
    'tickets:create',
    'tickets:edit_all',
    'tickets:assign',
    'tickets:change_status',
    'tickets:escalate',
    'tickets:close',
    'sla:view',
    'sla:extend_deadline',
    'users:view_company',
    'requesters:view_all',
    'reports:view_all',
    'reports:export',
    'templates:manage',
    'time:log',
    'time:view_all',
    'dashboard:view_all'
  ],
  
  // Gestor da empresa cliente - acesso gerencial aos tickets da empresa
  client_manager: [
    'tickets:view_company',
    'tickets:create',
    'tickets:edit_company',
    'tickets:change_status',
    'tickets:close',
    'sla:view',
    'users:view_company',
    'users:create', // Pode criar usuários da própria empresa
    'users:edit',   // Pode editar usuários da própria empresa
    'requesters:view_company',
    'requesters:manage', // Pode gerenciar solicitantes da própria empresa
    'reports:view_company',
    'reports:export',
    'time:view_company',
    'dashboard:view_company'
  ],
  
  // Usuário padrão da empresa cliente - acesso básico
  client_user: [
    'tickets:view_own',
    'tickets:create',
    'tickets:edit_own',
    'sla:view'
  ]
};

// Função para verificar se um usuário tem uma permissão específica
export function hasPermission(userRole: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[userRole].includes(permission);
}

// Função para obter todas as permissões de um role
export function getRolePermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role];
}

// Função para verificar se um usuário pode acessar um ticket
export function canAccessTicket(
  userRole: UserRole, 
  userCompany: string | null, 
  ticketRequesterCompany: string | null,
  ticketRequesterId: number,
  userId: number,
  isAssignee: boolean = false
): boolean {
  // Admin e helpdesk têm acesso a todos os tickets
  if (hasPermission(userRole, 'tickets:view_all')) {
    return true;
  }
  
  // Usuários podem ver tickets da própria empresa
  if (hasPermission(userRole, 'tickets:view_company')) {
    if (userCompany && userCompany === ticketRequesterCompany) {
      return true;
    }
  }
  
  // Usuários podem ver seus próprios tickets
  if (hasPermission(userRole, 'tickets:view_own')) {
    // Se é o requester original ou está atribuído ao ticket
    if (ticketRequesterId === userId || isAssignee) {
      return true;
    }
  }
  
  return false;
}

// Função para verificar se um usuário pode editar um ticket
export function canEditTicket(
  userRole: UserRole,
  userCompany: string | null,
  ticketRequesterCompany: string | null,
  ticketRequesterId: number,
  userId: number,
  isAssignee: boolean = false
): boolean {
  // Admin e helpdesk agents podem editar todos os tickets
  if (hasPermission(userRole, 'tickets:edit_all')) {
    return true;
  }
  
  // Client managers podem editar tickets da própria empresa
  if (hasPermission(userRole, 'tickets:edit_company')) {
    if (userCompany && userCompany === ticketRequesterCompany) {
      return true;
    }
  }
  
  // Usuários podem editar seus próprios tickets (limitado)
  if (hasPermission(userRole, 'tickets:edit_own')) {
    if (ticketRequesterId === userId || isAssignee) {
      return true;
    }
  }
  
  return false;
}

// Função para validar permissões em tempo de execução
export function requirePermission(userRole: UserRole, permission: Permission): void {
  if (!hasPermission(userRole, permission)) {
    throw new Error(`Acesso negado: permissão '${permission}' necessária`);
  }
}

// Labels amigáveis para os roles
export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Gestor Helpdesk',
  helpdesk_manager: 'Gerente de Suporte',
  helpdesk_agent: 'Agente Helpdesk',
  client_manager: 'Admin cliente',
  client_user: 'Cliente Funcionário'
};

// Descrições dos roles
export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  admin: 'Gestor Helpdesk — acesso total ao sistema e responsabilidades administrativas do time de suporte',
  helpdesk_manager: 'Gerenciamento completo de tickets e usuários, configurações de templates e SLA',
  helpdesk_agent: 'Agente Helpdesk — funcionário do time de suporte com acesso operacional a tickets e comentários',
  client_manager: 'Admin cliente — pode ver todos os chamados da sua empresa e indicadores da empresa',
  client_user: 'Cliente Funcionário — vinculado a uma empresa; não vê indicadores e só enxerga os próprios tickets'
};
