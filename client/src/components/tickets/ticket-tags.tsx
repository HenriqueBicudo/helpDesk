import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Tag, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

interface Tag {
  id: number;
  name: string;
  color: string;
}

interface TicketTagsProps {
  ticketId: number;
  tags: Tag[];
}

export function TicketTags({ ticketId, tags }: TicketTagsProps) {
  const [selectedTagId, setSelectedTagId] = useState<number | ''>('');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: allTags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const res = await fetch('/api/tags');
      if (!res.ok) throw new Error('Falha ao carregar tags');
      return res.json();
    }
  });

  const addTagMutation = useMutation({
    mutationFn: async (tagId: number) => {
      const response = await fetch(`/api/tickets/${ticketId}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagId })
      });
      if (!response.ok) throw new Error('Erro ao adicionar tag');
      return response.json();
    },
    onSuccess: () => {
      // Invalidate the same query key used by ticket details
      queryClient.invalidateQueries({ queryKey: [`/api/tickets/${ticketId}`] });
      setSelectedTagId('');
      toast({
        title: "✅ Tag Adicionada",
        description: "Tag foi adicionada ao ticket com sucesso."
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Erro",
        description: error.message || "Não foi possível adicionar a tag.",
        variant: "destructive"
      });
    }
  });
  const removeTagMutation = useMutation({
    mutationFn: async (tagId: number) => {
      const response = await fetch(`/api/tickets/${ticketId}/tags/${tagId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Erro ao remover tag');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tickets/${ticketId}`] });
      toast({
        title: "🗑️ Tag Removida",
        description: "Tag foi removida do ticket."
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Erro",
        description: error.message || "Não foi possível remover a tag.",
        variant: "destructive"
      });
    }
  });

  const handleAddTag = () => {
    if (!selectedTagId) {
      toast({ title: 'Selecione uma tag', description: 'Escolha uma tag existente para adicionar', variant: 'destructive' });
      return;
    }
    addTagMutation.mutate(Number(selectedTagId));
  };

  const predefinedColors = [
    '#EF4444', '#F97316', '#F59E0B', '#84CC16',
    '#10B981', '#06B6D4', '#3B82F6', '#8B5CF6',
    '#EC4899', '#6B7280'
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Tag className="w-4 h-4" />
          Tags ({tags.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Tags existentes */}
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Badge
                key={tag.id}
                variant="secondary"
                className="flex items-center gap-1 pr-1"
                style={{ backgroundColor: tag.color + '20', color: tag.color, borderColor: tag.color }}
              >
                <span className="flex-1">{tag.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => removeTagMutation.mutate(tag.id)}
                  disabled={removeTagMutation.isPending}
                >
                  <X className="w-3 h-3" />
                </Button>
              </Badge>
            ))}
          </div>

          {/* Adicionar tag existente */}
          <div>
            <div className="flex items-center gap-2">
              <Select value={selectedTagId === '' ? '' : String(selectedTagId)} onValueChange={(v) => setSelectedTagId(v === '' ? '' : Number(v))}>
                <SelectTrigger className="h-8 text-sm w-56">
                  <SelectValue placeholder="Selecionar tag" />
                </SelectTrigger>
                <SelectContent>
                  {allTags
                    .filter((t: Tag) => !tags.some(att => att.id === t.id))
                    .map((t: Tag) => (
                      <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>

              <Button onClick={handleAddTag} disabled={addTagMutation.isPending || !selectedTagId}>
                <Plus className="w-4 h-4 mr-2" />Adicionar
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
