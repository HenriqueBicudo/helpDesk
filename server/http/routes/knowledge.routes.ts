import { Router } from 'express';
import { db } from '../../db-postgres';
import { knowledgeArticles, knowledgeComments } from '@shared/drizzle-schema';
import { eq, desc, sql } from 'drizzle-orm';

export const knowledgeRoutes = Router();

// GET /api/knowledge - lista todos os artigos
knowledgeRoutes.get('/', async (req, res) => {
  try {
    const articles = await db
      .select()
      .from(knowledgeArticles)
      .orderBy(desc(knowledgeArticles.createdAt));
    
    res.json({ success: true, data: articles });
  } catch (error) {
    console.error('Erro ao listar artigos:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

// POST /api/knowledge - cria um novo artigo
knowledgeRoutes.post('/', async (req, res) => {
  try {
    const payload = req.body;
    const user = (req as any).user;

    const newArticle = await db
      .insert(knowledgeArticles)
      .values({
        title: payload.title || 'Sem título',
        content: payload.content || '',
        category: payload.category || 'Geral',
        tags: Array.isArray(payload.tags) 
          ? payload.tags 
          : (payload.tags ? String(payload.tags).split(',').map((t: string) => t.trim()) : []),
        author: user?.fullName || payload.author || 'Sistema',
        authorId: user?.id,
        views: 0,
      })
      .returning();

    res.status(201).json({ success: true, data: newArticle[0] });
  } catch (error) {
    console.error('Erro ao criar artigo:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

// PUT /api/knowledge/:id - atualiza um artigo
knowledgeRoutes.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const payload = req.body;
    const user = (req as any).user;

    const updateData: any = {
      updatedAt: new Date(),
      lastEditedAt: new Date(),
      lastEditedById: user?.id,
      lastEditedBy: user?.fullName || user?.name || user?.email || 'Sistema',
    };

    if (payload.title !== undefined) updateData.title = payload.title;
    if (payload.content !== undefined) updateData.content = payload.content;
    if (payload.category !== undefined) updateData.category = payload.category;
    if (payload.tags !== undefined) {
      updateData.tags = Array.isArray(payload.tags) 
        ? payload.tags 
        : (payload.tags ? String(payload.tags).split(',').map((t: string) => t.trim()) : []);
    }

    const updated = await db
      .update(knowledgeArticles)
      .set(updateData)
      .where(eq(knowledgeArticles.id, id))
      .returning();

    if (updated.length === 0) {
      return res.status(404).json({ success: false, error: 'Artigo não encontrado' });
    }

    res.json({ success: true, data: updated[0] });
  } catch (error) {
    console.error('Erro ao atualizar artigo:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

// DELETE /api/knowledge/:id - remove um artigo
knowledgeRoutes.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);

    const deleted = await db
      .delete(knowledgeArticles)
      .where(eq(knowledgeArticles.id, id))
      .returning();

    if (deleted.length === 0) {
      return res.status(404).json({ success: false, error: 'Artigo não encontrado' });
    }

    res.status(204).end();
  } catch (error) {
    console.error('Erro ao deletar artigo:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

// PATCH /api/knowledge/:id/views - incrementa views
knowledgeRoutes.patch('/:id/views', async (req, res) => {
  try {
    const id = Number(req.params.id);

    const updated = await db
      .update(knowledgeArticles)
      .set({ 
        views: sql`${knowledgeArticles.views} + 1`,
        updatedAt: new Date()
      })
      .where(eq(knowledgeArticles.id, id))
      .returning();

    if (updated.length === 0) {
      return res.status(404).json({ success: false, error: 'Artigo não encontrado' });
    }

    res.json({ success: true, data: updated[0] });
  } catch (error) {
    console.error('Erro ao incrementar views:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

// GET /api/knowledge/:id/comments - lista comentários de um artigo
knowledgeRoutes.get('/:id/comments', async (req, res) => {
  try {
    const articleId = Number(req.params.id);

    const comments = await db
      .select()
      .from(knowledgeComments)
      .where(eq(knowledgeComments.articleId, articleId))
      .orderBy(desc(knowledgeComments.createdAt));

    res.json({ success: true, data: comments });
  } catch (error) {
    console.error('Erro ao listar comentários:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

// POST /api/knowledge/:id/comments - adiciona um comentário
knowledgeRoutes.post('/:id/comments', async (req, res) => {
  try {
    const articleId = Number(req.params.id);
    const user = (req as any).user;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, error: 'Conteúdo do comentário é obrigatório' });
    }

    if (!user) {
      return res.status(401).json({ success: false, error: 'Usuário não autenticado' });
    }

    const newComment = await db
      .insert(knowledgeComments)
      .values({
        articleId,
        authorId: user.id,
        author: user.fullName || user.username,
        content: content.trim(),
      })
      .returning();

    res.status(201).json({ success: true, data: newComment[0] });
  } catch (error) {
    console.error('Erro ao criar comentário:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

// DELETE /api/knowledge/:articleId/comments/:commentId - remove um comentário
knowledgeRoutes.delete('/:articleId/comments/:commentId', async (req, res) => {
  try {
    const commentId = Number(req.params.commentId);
    const user = (req as any).user;

    if (!user) {
      return res.status(401).json({ success: false, error: 'Usuário não autenticado' });
    }

    // Buscar o comentário para verificar se o usuário é o autor
    const [comment] = await db
      .select()
      .from(knowledgeComments)
      .where(eq(knowledgeComments.id, commentId))
      .limit(1);

    if (!comment) {
      return res.status(404).json({ success: false, error: 'Comentário não encontrado' });
    }

    // Apenas o autor ou admin pode deletar
    if (comment.authorId !== user.id && user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Sem permissão para deletar este comentário' });
    }

    await db
      .delete(knowledgeComments)
      .where(eq(knowledgeComments.id, commentId));

    res.status(204).end();
  } catch (error) {
    console.error('Erro ao deletar comentário:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

export default knowledgeRoutes;
