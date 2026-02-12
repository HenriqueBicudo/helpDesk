import { Router, Request, Response } from 'express';
import { db } from '../../db-postgres';
import { ticketStatusConfig } from '@shared/drizzle-schema';
import { eq, asc } from 'drizzle-orm';
import { requireAuthAndPermission } from '../../middleware/auth';
import { z } from 'zod';
import { ticketStatusConfigSchema } from '@shared/schema/ticket-status';

const router = Router();

// Schema para validação
const updateStatusSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Cor deve ser hexadecimal'),
  order: z.number().int().positive(),
  isClosedStatus: z.boolean(),
  pauseSla: z.boolean(),
  autoCloseAfterDays: z.number().int().positive().nullable(),
  requiresResponse: z.boolean(),
  notifyCustomer: z.boolean(),
});

// GET /api/settings/ticket-statuses - Listar todos os status
router.get('/ticket-statuses', async (req: Request, res: Response) => {
  try {
    const statuses = await db
      .select()
      .from(ticketStatusConfig)
      .orderBy(asc(ticketStatusConfig.order));

    res.json(statuses);
  } catch (error) {
    console.error('Erro ao buscar status:', error);
    res.status(500).json({ message: 'Erro ao buscar status de tickets' });
  }
});

// GET /api/settings/ticket-statuses/active - Listar apenas status ativos (não fechados)
router.get('/ticket-statuses/active', async (req: Request, res: Response) => {
  try {
    const statuses = await db
      .select()
      .from(ticketStatusConfig)
      .where(eq(ticketStatusConfig.isClosedStatus, false))
      .orderBy(asc(ticketStatusConfig.order));

    res.json(statuses);
  } catch (error) {
    console.error('Erro ao buscar status ativos:', error);
    res.status(500).json({ message: 'Erro ao buscar status ativos' });
  }
});

// POST /api/settings/ticket-statuses - Criar novo status (apenas admin)
router.post(
  '/ticket-statuses',
  requireAuthAndPermission('settings:manage'),
  async (req: Request, res: Response) => {
    try {
      const validatedData = updateStatusSchema.parse(req.body);
      const id = req.body.id || `status_${Date.now()}`;

      // Verificar se ID já existe
      const existing = await db
        .select()
        .from(ticketStatusConfig)
        .where(eq(ticketStatusConfig.id, id))
        .limit(1);

      if (existing.length > 0) {
        return res.status(409).json({ message: 'Status com este ID já existe' });
      }

      const [newStatus] = await db
        .insert(ticketStatusConfig)
        .values({
          id,
          ...validatedData,
        })
        .returning();

      res.status(201).json(newStatus);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Dados inválidos', 
          errors: error.errors 
        });
      }
      console.error('Erro ao criar status:', error);
      res.status(500).json({ message: 'Erro ao criar status' });
    }
  }
);

// PUT /api/settings/ticket-statuses/:id - Atualizar status (apenas admin)
router.put(
  '/ticket-statuses/:id',
  requireAuthAndPermission('settings:manage'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const validatedData = updateStatusSchema.parse(req.body);

      // Verificar se é um status essencial (open, closed)
      if (['open', 'closed'].includes(id)) {
        // Permitir apenas atualizar nome e cor para status essenciais
        const [updated] = await db
          .update(ticketStatusConfig)
          .set({
            name: validatedData.name,
            color: validatedData.color,
            updatedAt: new Date(),
          })
          .where(eq(ticketStatusConfig.id, id))
          .returning();

        if (!updated) {
          return res.status(404).json({ message: 'Status não encontrado' });
        }

        return res.json(updated);
      }

      // Atualizar status completo
      const [updated] = await db
        .update(ticketStatusConfig)
        .set({
          ...validatedData,
          updatedAt: new Date(),
        })
        .where(eq(ticketStatusConfig.id, id))
        .returning();

      if (!updated) {
        return res.status(404).json({ message: 'Status não encontrado' });
      }

      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Dados inválidos', 
          errors: error.errors 
        });
      }
      console.error('Erro ao atualizar status:', error);
      res.status(500).json({ message: 'Erro ao atualizar status' });
    }
  }
);

// DELETE /api/settings/ticket-statuses/:id - Deletar status (apenas admin)
router.delete(
  '/ticket-statuses/:id',
  requireAuthAndPermission('settings:manage'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Não permitir deletar status essenciais
      if (['open', 'closed'].includes(id)) {
        return res.status(403).json({ 
          message: 'Não é possível deletar status essenciais (Aberto/Fechado)' 
        });
      }

      // TODO: Verificar se há tickets usando este status antes de deletar
      // Por enquanto, apenas deletamos

      const [deleted] = await db
        .delete(ticketStatusConfig)
        .where(eq(ticketStatusConfig.id, id))
        .returning();

      if (!deleted) {
        return res.status(404).json({ message: 'Status não encontrado' });
      }

      res.json({ message: 'Status deletado com sucesso', deleted });
    } catch (error) {
      console.error('Erro ao deletar status:', error);
      res.status(500).json({ message: 'Erro ao deletar status' });
    }
  }
);

export const settingsRoutes = router;
