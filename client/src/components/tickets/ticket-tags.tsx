import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { X, Tag, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';

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
  const [isAdding, setIsAdding] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#6B7280');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const addTagMutation = useMutation({
    mutationFn: async ({ tagName, color }: { tagName: string; color: string }) => {
      const response = await fetch(`/api/tickets/${ticketId}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagName, color })
      });
      if (!response.ok) throw new Error('Erro ao adicionar tag');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      setIsAdding(false);
      setNewTagName('');
      setNewTagColor('#6B7280');
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
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
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
    if (!newTagName.trim()) {
      toast({
        title: "❌ Nome Obrigatório",
        description: "Digite um nome para a tag.",
        variant: "destructive"
      });
      return;
    }

    addTagMutation.mutate({ tagName: newTagName.trim(), color: newTagColor });
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

          {/* Adicionar nova tag */}
          {isAdding ? (
            <div className="space-y-3 p-3 border rounded-lg bg-gray-50 dark:bg-gray-900">
              <div>
                <Input
                  placeholder="Nome da tag"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddTag();
                    if (e.key === 'Escape') setIsAdding(false);
                  }}
                />
              </div>
              
              <div>
                <label className="text-xs text-muted-foreground">Cor:</label>
                <div className="flex gap-1 mt-1">
                  {predefinedColors.map((color) => (
                    <button
                      key={color}
                      className={`w-6 h-6 rounded border-2 ${newTagColor === color ? 'border-black dark:border-white' : 'border-gray-300'}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewTagColor(color)}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={handleAddTag}
                  disabled={addTagMutation.isPending || !newTagName.trim()}
                  className="flex-1"
                >
                  {addTagMutation.isPending ? 'Adicionando...' : 'Adicionar'}
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => {
                    setIsAdding(false);
                    setNewTagName('');
                    setNewTagColor('#6B7280');
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAdding(true)}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Tag
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
