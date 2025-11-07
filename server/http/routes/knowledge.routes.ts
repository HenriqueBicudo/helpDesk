import { Router } from 'express';

export const knowledgeRoutes = Router();

// In-memory store para artigos - substitua por storage/DB em produção
let articlesStore: any[] = [
  // Inicialmente vazio para forçar uso via API
];

let nextId = 1;

// GET /api/knowledge - lista todos os artigos
knowledgeRoutes.get('/', async (req, res) => {
  try {
    res.json({ success: true, data: articlesStore });
  } catch (error) {
    console.error('Erro ao listar artigos:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

// POST /api/knowledge - cria um novo artigo
knowledgeRoutes.post('/', async (req, res) => {
  try {
    const payload = req.body;

    const newArticle = {
      id: nextId++,
      title: payload.title || 'Sem título',
      content: payload.content || '',
      category: payload.category || 'Geral',
      tags: Array.isArray(payload.tags) ? payload.tags : (payload.tags ? String(payload.tags).split(',').map((t: string) => t.trim()) : []),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: payload.author || 'Sistema',
      views: payload.views || 0,
    };

    articlesStore.push(newArticle);

    res.status(201).json({ success: true, data: newArticle });
  } catch (error) {
    console.error('Erro ao criar artigo:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

// PUT /api/knowledge/:id - atualiza um artigo
knowledgeRoutes.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const idx = articlesStore.findIndex(a => a.id === id);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Artigo não encontrado' });

    const payload = req.body;
    const updated = {
      ...articlesStore[idx],
      title: payload.title ?? articlesStore[idx].title,
      content: payload.content ?? articlesStore[idx].content,
      category: payload.category ?? articlesStore[idx].category,
      tags: Array.isArray(payload.tags) ? payload.tags : (payload.tags ? String(payload.tags).split(',').map((t: string) => t.trim()) : articlesStore[idx].tags),
      updatedAt: new Date().toISOString(),
    };

    articlesStore[idx] = updated;
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Erro ao atualizar artigo:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

// DELETE /api/knowledge/:id - remove um artigo
knowledgeRoutes.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const idx = articlesStore.findIndex(a => a.id === id);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Artigo não encontrado' });

    articlesStore.splice(idx, 1);
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
    const idx = articlesStore.findIndex(a => a.id === id);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Artigo não encontrado' });

    articlesStore[idx].views = (articlesStore[idx].views || 0) + 1;
    articlesStore[idx].updatedAt = new Date().toISOString();

    res.json({ success: true, data: articlesStore[idx] });
  } catch (error) {
    console.error('Erro ao incrementar views:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

export default knowledgeRoutes;
