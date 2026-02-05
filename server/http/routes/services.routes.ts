import { Router, Request, Response } from 'express';
import { db } from '../../db-postgres';
import { services } from '../../../shared/schema/services';
import { eq, and, isNull } from 'drizzle-orm';
import { requireAuth } from '../../middleware/auth';

const router = Router();

// Middleware para verificar permissões de admin/manager
const requireAdminOrManager = (req: Request, res: Response, next: any) => {
  const user = req.user as any;
  if (!['admin', 'helpdesk_manager'].includes(user?.role)) {
    return res.status(403).json({ message: 'Acesso restrito para administradores e gerentes' });
  }
  next();
};

// GET /api/services - Buscar todos os serviços
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const allServices = await db.select().from(services).where(eq(services.isActive, true));
    res.json(allServices);
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ message: 'Erro ao buscar serviços' });
  }
});

// GET /api/services/tree - Buscar árvore hierárquica de serviços
router.get('/tree', requireAuth, async (req: Request, res: Response) => {
  try {
    // Buscar todos os serviços ativos
    const allServices = await db
      .select()
      .from(services)
      .where(eq(services.isActive, true));
    
    // Construir árvore hierárquica
    const buildTree = (parentId: number | null = null): any[] => {
      return allServices
        .filter((s: any) => s.parentId === parentId)
        .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
        .map((service: any) => ({
          ...service,
          children: buildTree(service.id)
        }));
    };
    
    const tree = buildTree(null);
    res.json(tree);
  } catch (error) {
    console.error('Error fetching service tree:', error);
    res.status(500).json({ message: 'Erro ao buscar árvore de serviços' });
  }
});

// POST /api/services - Criar novo serviço
router.post('/', requireAuth, requireAdminOrManager, async (req: Request, res: Response) => {
  try {
    const { name, description, parentId, teamId, order } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Nome é obrigatório' });
    }
    
    const [newService] = await db.insert(services).values({
      name,
      description,
      parentId: parentId || null,
      teamId: teamId || null,
      order: order || 0,
      isActive: true
    }).returning();
    
    res.status(201).json(newService);
  } catch (error) {
    console.error('Error creating service:', error);
    res.status(500).json({ message: 'Erro ao criar serviço' });
  }
});

// PUT /api/services/:id - Atualizar serviço
router.put('/:id', requireAuth, requireAdminOrManager, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { name, description, parentId, teamId, order, isActive } = req.body;
    
    // Construir objeto de atualização apenas com campos que foram enviados
    const updateData: any = {
      updatedAt: new Date()
    };
    
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (teamId !== undefined) updateData.teamId = teamId === null || teamId === 'none' ? null : teamId;
    if (order !== undefined) updateData.order = order;
    if (isActive !== undefined) updateData.isActive = isActive;
    // Apenas atualizar parentId se foi explicitamente enviado no body
    if ('parentId' in req.body) {
      updateData.parentId = parentId === null ? null : parentId;
    }
    
    const [updated] = await db
      .update(services)
      .set(updateData)
      .where(eq(services.id, id))
      .returning();
    
    if (!updated) {
      return res.status(404).json({ message: 'Serviço não encontrado' });
    }
    
    res.json(updated);
  } catch (error) {
    console.error('Error updating service:', error);
    res.status(500).json({ message: 'Erro ao atualizar serviço' });
  }
});

// DELETE /api/services/:id - Deletar serviço (com cascata para subserviços)
router.delete('/:id', requireAuth, requireAdminOrManager, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    // A exclusão é feita em cascata devido ao ON DELETE CASCADE no banco de dados
    // Todos os subserviços serão automaticamente deletados
    await db.delete(services).where(eq(services.id, id));
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting service:', error);
    res.status(500).json({ message: 'Erro ao deletar serviço' });
  }
});

export default router;
