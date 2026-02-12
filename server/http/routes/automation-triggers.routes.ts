import { Router } from 'express';
import { db } from '../../db-postgres';
import { automationTriggers, users } from '../../../shared/drizzle-schema';
import { eq } from 'drizzle-orm';
import { requireAuthAndPermission } from '../../middleware/auth';

const router = Router();

/**
 * GET /api/automation-triggers
 * Lista todos os gatilhos de automação
 */
router.get('/', requireAuthAndPermission('settings:manage'), async (req, res) => {
  try {
    const triggers = await db
      .select({
        id: automationTriggers.id,
        name: automationTriggers.name,
        description: automationTriggers.description,
        triggerType: automationTriggers.triggerType,
        conditions: automationTriggers.conditions,
        actions: automationTriggers.actions,
        isActive: automationTriggers.isActive,
        createdBy: automationTriggers.createdBy,
        createdAt: automationTriggers.createdAt,
        updatedAt: automationTriggers.updatedAt,
        creator: {
          id: users.id,
          fullName: users.fullName,
          email: users.email,
        },
      })
      .from(automationTriggers)
      .leftJoin(users, eq(automationTriggers.createdBy, users.id))
      .orderBy(automationTriggers.name);

    res.json(triggers);
  } catch (error) {
    console.error('Erro ao buscar gatilhos:', error);
    res.status(500).json({ error: 'Erro ao buscar gatilhos' });
  }
});

/**
 * GET /api/automation-triggers/:id
 * Busca um gatilho específico
 */
router.get('/:id', requireAuthAndPermission('settings:manage'), async (req, res) => {
  try {
    const triggerId = parseInt(req.params.id);
    
    const [trigger] = await db
      .select()
      .from(automationTriggers)
      .where(eq(automationTriggers.id, triggerId))
      .limit(1);

    if (!trigger) {
      return res.status(404).json({ error: 'Gatilho não encontrado' });
    }

    res.json(trigger);
  } catch (error) {
    console.error('Erro ao buscar gatilho:', error);
    res.status(500).json({ error: 'Erro ao buscar gatilho' });
  }
});

/**
 * POST /api/automation-triggers
 * Cria um novo gatilho
 */
router.post('/', requireAuthAndPermission('settings:manage'), async (req, res) => {
  try {
    const { name, description, triggerType, conditions, actions, isActive } = req.body;
    const userId = (req as any).user?.id;

    // Validação
    if (!name || !triggerType) {
      return res.status(400).json({ error: 'Nome e tipo de gatilho são obrigatórios' });
    }

    const [newTrigger] = await db
      .insert(automationTriggers)
      .values({
        name,
        description: description || null,
        triggerType,
        conditions: conditions || {},
        actions: actions || [],
        isActive: isActive !== undefined ? isActive : true,
        createdBy: userId,
      })
      .returning();

    res.status(201).json(newTrigger);
  } catch (error) {
    console.error('Erro ao criar gatilho:', error);
    res.status(500).json({ error: 'Erro ao criar gatilho' });
  }
});

/**
 * PUT /api/automation-triggers/:id
 * Atualiza um gatilho
 */
router.put('/:id', requireAuthAndPermission('settings:manage'), async (req, res) => {
  try {
    const triggerId = parseInt(req.params.id);
    const { name, description, triggerType, conditions, actions, isActive } = req.body;

    // Verificar se existe
    const [existing] = await db
      .select()
      .from(automationTriggers)
      .where(eq(automationTriggers.id, triggerId))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: 'Gatilho não encontrado' });
    }

    // Atualizar
    const [updated] = await db
      .update(automationTriggers)
      .set({
        name: name || existing.name,
        description: description !== undefined ? description : existing.description,
        triggerType: triggerType || existing.triggerType,
        conditions: conditions || existing.conditions,
        actions: actions || existing.actions,
        isActive: isActive !== undefined ? isActive : existing.isActive,
      })
      .where(eq(automationTriggers.id, triggerId))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error('Erro ao atualizar gatilho:', error);
    res.status(500).json({ error: 'Erro ao atualizar gatilho' });
  }
});

/**
 * PATCH /api/automation-triggers/:id/toggle
 * Ativa/desativa um gatilho
 */
router.patch('/:id/toggle', requireAuthAndPermission('settings:manage'), async (req, res) => {
  try {
    const triggerId = parseInt(req.params.id);

    const [existing] = await db
      .select()
      .from(automationTriggers)
      .where(eq(automationTriggers.id, triggerId))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: 'Gatilho não encontrado' });
    }

    const [updated] = await db
      .update(automationTriggers)
      .set({ isActive: !existing.isActive })
      .where(eq(automationTriggers.id, triggerId))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error('Erro ao alternar gatilho:', error);
    res.status(500).json({ error: 'Erro ao alternar gatilho' });
  }
});

/**
 * DELETE /api/automation-triggers/:id
 * Exclui um gatilho
 */
router.delete('/:id', requireAuthAndPermission('settings:manage'), async (req, res) => {
  try {
    const triggerId = parseInt(req.params.id);

    const [existing] = await db
      .select()
      .from(automationTriggers)
      .where(eq(automationTriggers.id, triggerId))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: 'Gatilho não encontrado' });
    }

    await db
      .delete(automationTriggers)
      .where(eq(automationTriggers.id, triggerId));

    res.status(204).send();
  } catch (error) {
    console.error('Erro ao excluir gatilho:', error);
    res.status(500).json({ error: 'Erro ao excluir gatilho' });
  }
});

export default router;
