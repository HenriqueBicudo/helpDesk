import { Router } from 'express';
import { teamCategoryService } from '../../services/team-category.service';
import { requireAuth, requirePermission } from '../../middleware/auth';
import { z } from 'zod';

const router = Router();

// Schema de validação para criar categoria
const createCategorySchema = z.object({
  teamId: z.number().int().positive(),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  parentCategoryId: z.number().int().positive().optional().nullable(),
  sortOrder: z.number().int().optional(),
});

// Schema de validação para atualizar categoria
const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  parentCategoryId: z.number().int().positive().optional().nullable(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

// Schema de validação para atribuir usuário
const assignUserSchema = z.object({
  userId: z.number().int().positive(),
  priority: z.number().int().positive().optional(),
  autoAssign: z.boolean().optional(),
});

/**
 * POST /api/team-categories
 * Criar nova categoria ou subcategoria
 */
router.post('/', requireAuth, requirePermission('manage_teams'), async (req, res) => {
  try {
    const data = createCategorySchema.parse(req.body);
    const category = await teamCategoryService.createCategory(data);
    res.json(category);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Dados inválidos', errors: error.errors });
    }
    console.error('Erro ao criar categoria:', error);
    res.status(500).json({ message: 'Erro ao criar categoria' });
  }
});

/**
 * PUT /api/team-categories/:id
 * Atualizar categoria existente
 */
router.put('/:id', requireAuth, requirePermission('manage_teams'), async (req, res) => {
  try {
    const categoryId = parseInt(req.params.id);
    const data = updateCategorySchema.parse(req.body);
    const category = await teamCategoryService.updateCategory(categoryId, data);
    res.json(category);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Dados inválidos', errors: error.errors });
    }
    console.error('Erro ao atualizar categoria:', error);
    res.status(500).json({ message: 'Erro ao atualizar categoria' });
  }
});

/**
 * DELETE /api/team-categories/:id
 * Deletar categoria (e subcategorias em cascata)
 */
router.delete('/:id', requireAuth, requirePermission('manage_teams'), async (req, res) => {
  try {
    const categoryId = parseInt(req.params.id);
    await teamCategoryService.deleteCategory(categoryId);
    res.json({ message: 'Categoria deletada com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar categoria:', error);
    res.status(500).json({ message: 'Erro ao deletar categoria' });
  }
});

/**
 * GET /api/team-categories/team/:teamId
 * Buscar todas as categorias de uma equipe
 */
router.get('/team/:teamId', requireAuth, async (req, res) => {
  try {
    const teamId = parseInt(req.params.teamId);
    const categories = await teamCategoryService.getCategoriesByTeam(teamId);
    res.json(categories);
  } catch (error) {
    console.error('Erro ao buscar categorias:', error);
    res.status(500).json({ message: 'Erro ao buscar categorias' });
  }
});

/**
 * GET /api/team-categories/team/:teamId/tree
 * Buscar estrutura hierárquica completa de uma equipe
 */
router.get('/team/:teamId/tree', requireAuth, async (req, res) => {
  try {
    const teamId = parseInt(req.params.teamId);
    const tree = await teamCategoryService.getCategoryTree(teamId);
    res.json(tree);
  } catch (error) {
    console.error('Erro ao buscar árvore de categorias:', error);
    res.status(500).json({ message: 'Erro ao buscar árvore de categorias' });
  }
});

/**
 * GET /api/team-categories/:id/subcategories
 * Buscar subcategorias de uma categoria
 */
router.get('/:id/subcategories', requireAuth, async (req, res) => {
  try {
    const categoryId = parseInt(req.params.id);
    const subcategories = await teamCategoryService.getSubcategories(categoryId);
    res.json(subcategories);
  } catch (error) {
    console.error('Erro ao buscar subcategorias:', error);
    res.status(500).json({ message: 'Erro ao buscar subcategorias' });
  }
});

/**
 * POST /api/team-categories/:id/users
 * Atribuir usuário a uma categoria
 */
router.post('/:id/users', requireAuth, requirePermission('manage_teams'), async (req, res) => {
  try {
    const categoryId = parseInt(req.params.id);
    const data = assignUserSchema.parse(req.body);
    const assignment = await teamCategoryService.assignUserToCategory({
      categoryId,
      ...data,
    });
    res.json(assignment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Dados inválidos', errors: error.errors });
    }
    console.error('Erro ao atribuir usuário:', error);
    res.status(500).json({ message: 'Erro ao atribuir usuário' });
  }
});

/**
 * DELETE /api/team-categories/:id/users/:userId
 * Remover usuário de uma categoria
 */
router.delete('/:id/users/:userId', requireAuth, requirePermission('manage_teams'), async (req, res) => {
  try {
    const categoryId = parseInt(req.params.id);
    const userId = parseInt(req.params.userId);
    await teamCategoryService.removeUserFromCategory(categoryId, userId);
    res.json({ message: 'Usuário removido da categoria' });
  } catch (error) {
    console.error('Erro ao remover usuário:', error);
    res.status(500).json({ message: 'Erro ao remover usuário' });
  }
});

/**
 * GET /api/team-categories/:id/users
 * Buscar usuários de uma categoria
 */
router.get('/:id/users', requireAuth, async (req, res) => {
  try {
    const categoryId = parseInt(req.params.id);
    const users = await teamCategoryService.getCategoryUsers(categoryId);
    res.json(users);
  } catch (error) {
    console.error('Erro ao buscar usuários da categoria:', error);
    res.status(500).json({ message: 'Erro ao buscar usuários da categoria' });
  }
});

/**
 * PUT /api/team-categories/:id/reorder
 * Reordenar categoria
 */
router.put('/:id/reorder', requireAuth, requirePermission('manage_teams'), async (req, res) => {
  try {
    const categoryId = parseInt(req.params.id);
    const { sortOrder } = req.body;
    const category = await teamCategoryService.reorderCategory(categoryId, sortOrder);
    res.json(category);
  } catch (error) {
    console.error('Erro ao reordenar categoria:', error);
    res.status(500).json({ message: 'Erro ao reordenar categoria' });
  }
});

export default router;
