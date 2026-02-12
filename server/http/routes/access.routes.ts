import { Router, Request, Response } from 'express';
import { storage } from '../../storage-interface';
import { requireAuth, requirePermission } from '../../middleware/auth';
import { hashPassword } from '../../auth';
import { z } from 'zod';
import { db } from '../../db-postgres';
import { eq, or } from 'drizzle-orm';
import * as schema from '@shared/drizzle-schema';
import { userTeams } from '@shared/drizzle-schema';

const router = Router();

// Schema para criação de empresa
const createCompanySchema = z.object({
  name: z.string().min(1, 'Nome da empresa é obrigatório'),
  cnpj: z.string().optional(),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
  address: z.string().optional(),
  representativeData: z.object({
    fullName: z.string().min(1, 'Nome do representante é obrigatório'),
    email: z.string().email('Email do representante inválido'),
    phone: z.string().optional(),
    password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres')
  })
});

// Schema para criação de usuário
const createUserSchema = z.object({
  fullName: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  role: z.enum(['admin', 'helpdesk_manager', 'helpdesk_agent', 'client_manager', 'client_user']),
  company: z.union([z.string(), z.number()]).optional().transform((val) => {
    if (val === null || val === undefined) return undefined;
    return String(val);
  }),
  teamId: z.number().optional(),
  isActive: z.boolean().default(true)
});

// Schema para criação de equipe
const createTeamSchema = z.object({
  name: z.string().min(1, 'Nome da equipe é obrigatório'),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  memberIds: z.array(z.number()).optional()
});

// Middleware para verificar se é admin
const requireAdmin = (req: Request, res: Response, next: any) => {
  const user = req.user as any;
  if (user?.role !== 'admin') {
    return res.status(403).json({ message: 'Acesso restrito para administradores' });
  }
  next();
};

// ===== ESTATÍSTICAS =====
router.get('/stats', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    // Buscar dados para estatísticas
    const [companies, users, teams, tickets] = await Promise.all([
      storage.getAllCompanies(),
      storage.getAllUsers(),
      storage.getAllTeams(),
      storage.getAllTicketsWithRelations()
    ]);

    // Calcular estatísticas de empresas
    const companyStats = {
      total: companies.length,
      active: companies.filter((c: any) => c.isActive).length,
      inactive: companies.filter((c: any) => !c.isActive).length,
      withContracts: companies.filter((c: any) => c.hasActiveContract).length || 0
    };

    // Calcular estatísticas de usuários
    const userStats = {
      total: users.length,
      active: users.filter((u: any) => u.isActive).length,
      byRole: users.reduce((acc: any, user: any) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
      }, {}),
      recentlyAdded: users.filter((u: any) => {
        const createdAt = new Date(u.createdAt);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return createdAt > weekAgo;
      }).length
    };

    // Calcular estatísticas de equipes
    const teamStats = {
      total: teams.length,
      active: teams.filter((t: any) => t.isActive).length,
      totalMembers: teams.reduce((acc: number, team: any) => acc + (team.members?.length || 0), 0),
      avgMembersPerTeam: teams.length > 0 ? 
        Math.round(teams.reduce((acc: number, team: any) => acc + (team.members?.length || 0), 0) / teams.length) : 0
    };

    // Calcular estatísticas de tickets
    const ticketStats = {
      total: tickets.length,
      withSlaRisk: tickets.filter((t: any) => {
        // Verificar se ticket tem SLA em risco
        if (!t.slaDeadline) return false;
        const deadline = new Date(t.slaDeadline);
        const now = new Date();
        const hoursLeft = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
        return hoursLeft > 0 && hoursLeft <= 4; // SLA em risco nas próximas 4 horas
      }).length,
      byCompany: companies.map((company: any) => ({
        companyName: company.name,
        count: tickets.filter((t: any) => t.requester?.company === company.name).length
      })).sort((a: any, b: any) => b.count - a.count)
    };

    const stats = {
      companies: companyStats,
      users: userStats,
      teams: teamStats,
      tickets: ticketStats
    };

    res.json(stats);
  } catch (error) {
    console.error('Erro ao buscar estatísticas de acesso:', error);
    res.status(500).json({ message: 'Erro ao buscar estatísticas' });
  }
});

// ===== EMPRESAS =====
router.get('/companies', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { search, status } = req.query;
    
    let companies = await storage.getAllCompanies();
    // Campo 'company' armazena ID da empresa como string, converter para número
    const userCompanyId = user.company ? parseInt(user.company, 10) : null;
    console.log('📋 [/companies] User:', { id: user.id, role: user.role, company: user.company, companyId: userCompanyId });
    console.log('📋 [/companies] Total de empresas no DB:', companies.length);
    
    // Clientes só veem a própria empresa
    if (user.role === 'client_user' || user.role === 'client_manager') {
      if (!userCompanyId) {
        console.log('❌ [/companies] User sem company vinculada!');
        return res.status(400).json({ message: 'Seu usuário não está vinculado a uma empresa' });
      }
      console.log('🔍 [/companies] Filtrando para companyId:', userCompanyId);
      companies = companies.filter((c: any) => {
        const match = c.id === userCompanyId;
        console.log(`  - ${c.name} (ID: ${c.id}) === ${userCompanyId} ? ${match}`);
        return match;
      });
      console.log('✅ [/companies] Após filtro, empresas:', companies.length);
    }
    
    // Filtrar por busca
    if (search) {
      const searchTerm = search.toString().toLowerCase();
      companies = companies.filter((company: any) => 
        company.name.toLowerCase().includes(searchTerm) ||
        company.email.toLowerCase().includes(searchTerm) ||
        (company.cnpj && company.cnpj.includes(searchTerm))
      );
    }
    
    // Filtrar por status
    if (status === 'active') {
      companies = companies.filter((company: any) => company.isActive);
    } else if (status === 'inactive') {
      companies = companies.filter((company: any) => !company.isActive);
    }
    
    res.json(companies);
  } catch (error) {
    console.error('Erro ao buscar empresas:', error);
    res.status(500).json({ message: 'Erro ao buscar empresas' });
  }
});

router.post('/companies', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    console.log('Dados recebidos para criação de empresa:', JSON.stringify(req.body, null, 2));
    
    const data = createCompanySchema.parse(req.body);
    console.log('Dados validados:', JSON.stringify(data, null, 2));
    
    // Verificar se empresa já existe
    const existingCompany = await storage.getCompanyByEmail(data.email);
    if (existingCompany) {
      return res.status(400).json({ message: 'Já existe uma empresa com este email' });
    }
    
    // Criar empresa
    const company = await storage.createCompany({
      name: data.name,
      cnpj: data.cnpj,
      email: data.email,
      phone: data.phone,
      address: data.address,
      isActive: true
    });
    
    // Criar usuário representante
    const hashedPassword = await hashPassword(data.representativeData.password);
    const representative = await storage.createUser({
      username: data.representativeData.email.split('@')[0], // Usar a parte antes do @ como username
      fullName: data.representativeData.fullName,
      email: data.representativeData.email,
      password: hashedPassword,
      role: 'client_manager',
      company: company.name,
      isActive: true
    });
    
    res.status(201).json({
      company,
      representative
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Dados inválidos', errors: error.errors });
    } else {
      console.error('Erro ao criar empresa:', error);
      res.status(500).json({ message: 'Erro ao criar empresa' });
    }
  }
});

// Rota para atualizar empresa
router.put('/companies/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const companyId = parseInt(req.params.id);
    
    if (isNaN(companyId)) {
      return res.status(400).json({ message: 'ID da empresa inválido' });
    }

    // Schema para atualização (campos opcionais)
    const updateCompanySchema = z.object({
      name: z.string().min(1, 'Nome da empresa é obrigatório').optional(),
      cnpj: z.string().optional(),
      email: z.string().email('Email inválido').optional(),
      phone: z.string().optional(),
      address: z.string().optional()
    });

    const data = updateCompanySchema.parse(req.body);
    
    // Verificar se a empresa existe
    const existingCompany = await storage.getCompanyById(companyId);
    if (!existingCompany) {
      return res.status(404).json({ message: 'Empresa não encontrada' });
    }

    // Se o email está sendo alterado, verificar se não existe outra empresa com este email
    if (data.email && data.email !== existingCompany.email) {
      const companyWithEmail = await storage.getCompanyByEmail(data.email);
      if (companyWithEmail && companyWithEmail.id !== companyId) {
        return res.status(400).json({ message: 'Já existe uma empresa com este email' });
      }
    }

    // Atualizar empresa
    const updatedCompany = await storage.updateCompany(companyId, data);
    
    res.json(updatedCompany);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Dados inválidos', errors: error.errors });
    } else {
      console.error('Erro ao atualizar empresa:', error);
      res.status(500).json({ message: 'Erro ao atualizar empresa' });
    }
  }
});

router.patch('/companies/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const updates = req.body;
    
    const company = await storage.updateCompany(id, updates);
    
    if (!company) {
      return res.status(404).json({ message: 'Empresa não encontrada' });
    }
    
    res.json(company);
  } catch (error) {
    console.error('Erro ao atualizar empresa:', error);
    res.status(500).json({ message: 'Erro ao atualizar empresa' });
  }
});

// ===== USUÁRIOS =====
router.get('/users', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { search, role, company, status } = req.query;
    
    let users = await storage.getAllUsers();
    
    // Filtrar por busca
    if (search) {
      const searchTerm = search.toString().toLowerCase();
      users = users.filter((user: any) => 
        user.fullName.toLowerCase().includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm) ||
        (user.company && user.company.toLowerCase().includes(searchTerm))
      );
    }
    
    // Filtrar por role
    if (role) {
      users = users.filter((user: any) => user.role === role);
    }
    
    // Filtrar por empresa
    if (company) {
      users = users.filter((user: any) => user.company === company);
    }
    
    // Filtrar por status
    if (status === 'active') {
      users = users.filter((user: any) => user.isActive);
    } else if (status === 'inactive') {
      users = users.filter((user: any) => !user.isActive);
    }
    
    res.json(users);
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    res.status(500).json({ message: 'Erro ao buscar usuários' });
  }
});

router.post('/users', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {    
    const data = createUserSchema.parse(req.body);
    console.log('Dados validados para usuário:', JSON.stringify(data, null, 2));
    
    // Verificar se usuário já existe
    const existingUser = await storage.getUserByEmail(data.email);
    if (existingUser) {
      return res.status(400).json({ message: 'Já existe um usuário com este email' });
    }
    
    // Criar usuário
    const hashedPassword = await hashPassword(data.password);
    const userData = {
      ...data,
      username: data.email.split('@')[0], // Usar a parte antes do @ como username
      password: hashedPassword
    };
    const user = await storage.createUser(userData);
    
    // Se é agente de helpdesk e tem teamId, adicionar à equipe
    // if (data.role === 'helpdesk_agent' && data.teamId && typeof data.teamId === 'number') {
    //   await storage.addTeamMember(data.teamId, user.id);
    // }
    
    res.status(201).json(user);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Erros de validação Zod:', JSON.stringify(error.errors, null, 2));
      res.status(400).json({ message: 'Dados inválidos', errors: error.errors });
    } else {
      console.error('Erro ao criar usuário:', error);
      res.status(500).json({ message: 'Erro ao criar usuário' });
    }
  }
});

router.patch('/users/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const updates = req.body;
    
    const user = await storage.updateUser(id, updates);
    
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({ message: 'Erro ao atualizar usuário' });
  }
});

// ===== EQUIPES =====
router.get('/teams', requireAuth, async (req: Request, res: Response) => {
  try {
    const { search, status } = req.query;
    
    let teams = await storage.getAllTeams();
    
    // Filtrar por busca
    if (search) {
      const searchTerm = search.toString().toLowerCase();
      teams = teams.filter((team: any) => 
        team.name.toLowerCase().includes(searchTerm) ||
        (team.description && team.description.toLowerCase().includes(searchTerm))
      );
    }
    
    // Filtrar por status
    if (status === 'active') {
      teams = teams.filter((team: any) => team.isActive);
    } else if (status === 'inactive') {
      teams = teams.filter((team: any) => !team.isActive);
    }
    
    res.json(teams);
  } catch (error) {
    console.error('Erro ao buscar equipes:', error);
    res.status(500).json({ message: 'Erro ao buscar equipes' });
  }
});

router.post('/teams', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const data = createTeamSchema.parse(req.body);
    
    // Criar equipe
    const team = await storage.createTeam({
      name: data.name,
      description: data.description,
      isActive: data.isActive
    });
    
    // Adicionar membros se especificados
    if (data.memberIds && data.memberIds.length > 0) {
      for (const memberId of data.memberIds) {
        await storage.addTeamMember(team.id, memberId);
      }
    }
    
    res.status(201).json(team);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Dados inválidos', errors: error.errors });
    } else {
      console.error('Erro ao criar equipe:', error);
      res.status(500).json({ message: 'Erro ao criar equipe' });
    }
  }
});

router.patch('/teams/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const updates = req.body;
    
    const team = await storage.updateTeam(id, updates);
    
    if (!team) {
      return res.status(404).json({ message: 'Equipe não encontrada' });
    }
    
    res.json(team);
  } catch (error) {
    console.error('Erro ao atualizar equipe:', error);
    res.status(500).json({ message: 'Erro ao atualizar equipe' });
  }
});

// Membros da equipe
router.get('/teams/:id/members', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const teamId = Number(req.params.id);
    const members = await storage.getTeamMembers(teamId);
    res.json(members);
  } catch (error) {
    console.error('Erro ao buscar membros da equipe:', error);
    res.status(500).json({ message: 'Erro ao buscar membros da equipe' });
  }
});

router.post('/teams/:id/members', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const teamId = Number(req.params.id);
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ message: 'userId é obrigatório' });
    }
    
    await storage.addTeamMember(teamId, userId);
    res.status(201).json({ message: 'Membro adicionado à equipe' });
  } catch (error) {
    console.error('Erro ao adicionar membro à equipe:', error);
    res.status(500).json({ message: 'Erro ao adicionar membro à equipe' });
  }
});

router.delete('/teams/:id/members/:userId', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const teamId = Number(req.params.id);
    const userId = Number(req.params.userId);
    
    await storage.removeTeamMember(teamId, userId);
    res.status(204).end();
  } catch (error) {
    console.error('Erro ao remover membro da equipe:', error);
    res.status(500).json({ message: 'Erro ao remover membro da equipe' });
  }
});

// Buscar agentes disponíveis para adicionar em uma equipe específica
router.get('/teams/:id/available-agents', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const teamId = Number(req.params.id);
    
    // Buscar todos os agentes helpdesk e managers
    const allAgents = await db.select()
      .from(schema.users)
      .where(
        or(
          eq(schema.users.role, 'helpdesk_agent'),
          eq(schema.users.role, 'helpdesk_manager'),
          eq(schema.users.role, 'admin')
        )
      );
    
    // Buscar agentes que já estão nesta equipe
    const teamMembers = await db.select({ userId: userTeams.userId })
      .from(userTeams)
      .where(eq(userTeams.teamId, teamId));
    
    const teamMemberIds = new Set(teamMembers.map(m => m.userId));
    
    // Retornar agentes que NÃO estão nesta equipe
    const availableAgents = allAgents.filter(agent => !teamMemberIds.has(agent.id));
    
    res.json(availableAgents);
  } catch (error) {
    console.error('Erro ao buscar agentes disponíveis:', error);
    res.status(500).json({ message: 'Erro ao buscar agentes disponíveis' });
  }
});

// Buscar agentes disponíveis para adicionar em equipes (endpoint legado)
router.get('/available-agents', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const agents = await storage.getAvailableAgents();
    res.json(agents);
  } catch (error) {
    console.error('Erro ao buscar agentes disponíveis:', error);
    res.status(500).json({ message: 'Erro ao buscar agentes disponíveis' });
  }
});

router.delete('/teams/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    
    const deleted = await storage.deleteTeam(id);
    
    if (!deleted) {
      return res.status(404).json({ message: 'Equipe não encontrada' });
    }
    
    res.status(204).end();
  } catch (error) {
    console.error('Erro ao excluir equipe:', error);
    res.status(500).json({ message: 'Erro ao excluir equipe' });
  }
});

// Excluir empresa
router.delete('/companies/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    
    // Verificar se a empresa está inativa antes de excluir
    const company = await storage.getCompanyById(id);
    if (!company) {
      return res.status(404).json({ message: 'Empresa não encontrada' });
    }
    
    if (company.isActive) {
      return res.status(400).json({ 
        message: 'Empresa deve estar inativa antes de ser excluída' 
      });
    }
    
    const deleted = await storage.deleteCompany(id);
    
    if (!deleted) {
      return res.status(404).json({ message: 'Empresa não encontrada' });
    }
    
    res.status(204).end();
  } catch (error) {
    console.error('Erro ao excluir empresa:', error);
    res.status(500).json({ message: 'Erro ao excluir empresa' });
  }
});

// Excluir usuário
router.delete('/users/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    
    // Verificar se o usuário está inativo e não é admin antes de excluir
    const user = await storage.getUserById(id);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    if (user.isActive) {
      return res.status(400).json({ 
        message: 'Usuário deve estar inativo antes de ser excluído' 
      });
    }
    
    if (user.role === 'admin') {
      return res.status(400).json({ 
        message: 'Usuários administradores não podem ser excluídos' 
      });
    }
    
    const deleted = await storage.deleteUser(id);
    
    if (!deleted) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    res.status(204).end();
  } catch (error) {
    console.error('Erro ao excluir usuário:', error);
    res.status(500).json({ message: 'Erro ao excluir usuário' });
  }
});

export { router as accessRoutes };
