import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Edit, Check, X } from 'lucide-react';

interface Tag {
  id: number;
  name: string;
  color: string;
}

export default function TagsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tags = [], isLoading } = useQuery<Tag[]>({
    queryKey: ['tags'],
    queryFn: async () => {
      const res = await fetch('/api/tags');
      if (!res.ok) throw new Error('Falha ao carregar tags');
      return res.json();
    }
  });

  const createMutation = useMutation({
    mutationFn: async (payload: { name: string; color: string }) => {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || 'Erro ao criar tag');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      toast({ title: '✅ Tag criada', description: 'Tag criada com sucesso' });
      setName('');
      setColor('#6B7280');
    },
    onError: (err: any) => {
      toast({ title: 'Erro', description: err?.message || 'Não foi possível criar a tag', variant: 'destructive' });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, name, color }: { id: number; name: string; color: string }) => {
      const res = await fetch(`/api/tags/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || 'Erro ao atualizar tag');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      toast({ title: '✅ Tag atualizada', description: 'Tag atualizada com sucesso' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro', description: err?.message || 'Não foi possível atualizar a tag', variant: 'destructive' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/tags/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || 'Erro ao deletar tag');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      toast({ title: '🗑️ Tag removida', description: 'Tag removida com sucesso' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro', description: err?.message || 'Não foi possível remover a tag', variant: 'destructive' });
    }
  });

  const [name, setName] = useState('');
  const [color, setColor] = useState('#6B7280');

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingColor, setEditingColor] = useState('#6B7280');

  const handleCreate = () => {
    if (!name.trim()) {
      toast({ title: 'Nome obrigatório', description: 'Digite um nome para a tag', variant: 'destructive' });
      return;
    }
    createMutation.mutate({ name: name.trim(), color });
  };

  const startEdit = (t: Tag) => {
    setEditingId(t.id);
    setEditingName(t.name);
    setEditingColor(t.color || '#6B7280');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName('');
    setEditingColor('#6B7280');
  };

  const saveEdit = () => {
    if (!editingId) return;
    if (!editingName.trim()) {
      toast({ title: 'Nome obrigatório', description: 'Digite um nome para a tag', variant: 'destructive' });
      return;
    }
    updateMutation.mutate({ id: editingId, name: editingName.trim(), color: editingColor });
  };

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-4">Tags</h2>

      <div className="flex items-center gap-3 max-w-xl mb-6">
        <Input placeholder="Nome da tag" value={name} onChange={(e) => setName(e.target.value)} />
        <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-12 p-0" />
        <Button onClick={handleCreate} disabled={createMutation.isPending}>
          <Plus className="w-4 h-4 mr-2" />{createMutation.isPending ? 'Criando...' : 'Criar'}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div>Carregando...</div>
        ) : (
          tags.map(t => (
            <div key={t.id} className="p-3 border rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div style={{ width: 14, height: 14, backgroundColor: t.color, borderRadius: 4 }} />
                {editingId === t.id ? (
                  <div className="flex items-center gap-2">
                    <Input value={editingName} onChange={(e) => setEditingName(e.target.value)} />
                    <Input type="color" value={editingColor} onChange={(e) => setEditingColor(e.target.value)} className="w-12 p-0" />
                  </div>
                ) : (
                  <div>
                    <div className="font-medium">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.color}</div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {editingId === t.id ? (
                  <>
                    <Button size="sm" onClick={saveEdit}><Check className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={cancelEdit}><X className="w-4 h-4" /></Button>
                  </>
                ) : (
                  <>
                    <Button size="sm" variant="ghost" onClick={() => startEdit(t)}><Edit className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(t.id)}><Trash2 className="w-4 h-4" /></Button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
