import { Router } from 'express';
import { db } from '../../db-postgres';
import { tags } from '@shared/drizzle-schema';
import { eq } from 'drizzle-orm';

export const tagsRoutes = Router();

// GET /api/tags - lista todas as tags
tagsRoutes.get('/', async (req, res) => {
  try {
    const allTags = await db
      .select()
      .from(tags)
      .orderBy(tags.name);
    
    res.json(allTags);
  } catch (error) {
    console.error('Erro ao listar tags:', error);
    res.status(500).json({ message: 'Erro interno ao listar tags' });
  }
});

// POST /api/tags - cria uma nova tag
tagsRoutes.post('/', async (req, res) => {
  try {
    const { name, color } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Nome da tag é obrigatório' });
    }

    const newTag = await db
      .insert(tags)
      .values({
        name: name.trim(),
        color: color || '#6B7280',
      })
      .returning();

    res.status(201).json(newTag[0]);
  } catch (error) {
    console.error('Erro ao criar tag:', error);
    res.status(500).json({ message: 'Erro interno ao criar tag' });
  }
});

// PUT /api/tags/:id - atualiza uma tag
tagsRoutes.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, color } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Nome da tag é obrigatório' });
    }

    const updated = await db
      .update(tags)
      .set({
        name: name.trim(),
        color: color || '#6B7280',
      })
      .where(eq(tags.id, id))
      .returning();

    if (updated.length === 0) {
      return res.status(404).json({ message: 'Tag não encontrada' });
    }

    res.json(updated[0]);
  } catch (error) {
    console.error('Erro ao atualizar tag:', error);
    res.status(500).json({ message: 'Erro interno ao atualizar tag' });
  }
});

// DELETE /api/tags/:id - remove uma tag
tagsRoutes.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);

    const deleted = await db
      .delete(tags)
      .where(eq(tags.id, id))
      .returning();

    if (deleted.length === 0) {
      return res.status(404).json({ message: 'Tag não encontrada' });
    }

    res.status(204).end();
  } catch (error) {
    console.error('Erro ao deletar tag:', error);
    res.status(500).json({ message: 'Erro interno ao deletar tag' });
  }
});
