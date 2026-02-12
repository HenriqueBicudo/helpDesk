import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit2, Trash2, Users as UsersIcon, ChevronRight, ChevronDown } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TeamCategory {
  id: number;
  teamId: number;
  name: string;
  description?: string;
  parentCategoryId?: number | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  children?: TeamCategory[];
}

interface TeamCategoryManagerProps {
  teamId: number;
  teamName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TeamCategoryManager({ teamId, teamName, open, onOpenChange }: TeamCategoryManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isManageUsersDialogOpen, setIsManageUsersDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<TeamCategory | null>(null);
  const [selectedParentId, setSelectedParentId] = useState<number | null>(null);
  const [createForm, setCreateForm] = useState({ name: "", description: "" });
  const [editForm, setEditForm] = useState({ name: "", description: "" });

  // Query para buscar árvore de categorias
  const { data: categoryTree = [], isLoading } = useQuery({
    queryKey: ['team-categories-tree', teamId],
    queryFn: async () => {
      const response = await fetch(`/api/team-categories/team/${teamId}/tree`);
      if (!response.ok) throw new Error('Erro ao carregar categorias');
      return response.json();
    },
    enabled: open && !!teamId,
  });

  // Query para buscar usuários disponíveis
  const { data: availableUsers = [] } = useQuery({
    queryKey: ['available-agents'],
    queryFn: async () => {
      const response = await fetch('/api/access/available-agents');
      if (!response.ok) throw new Error('Erro ao carregar usuários');
      return response.json();
    },
    enabled: isManageUsersDialogOpen,
  });

  // Query para buscar usuários da categoria
  const { data: categoryUsers = [] } = useQuery({
    queryKey: ['category-users', selectedCategory?.id],
    queryFn: async () => {
      const response = await fetch(`/api/team-categories/${selectedCategory!.id}/users`);
      if (!response.ok) throw new Error('Erro ao carregar usuários da categoria');
      return response.json();
    },
    enabled: !!selectedCategory && isManageUsersDialogOpen,
  });

  // Mutation para criar categoria
  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string; parentCategoryId?: number | null }) => {
      const response = await fetch('/api/team-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, teamId }),
      });
      if (!response.ok) throw new Error('Erro ao criar categoria');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-categories-tree', teamId] });
      setIsCreateDialogOpen(false);
      setCreateForm({ name: "", description: "" });
      setSelectedParentId(null);
      toast({ title: "Categoria criada com sucesso!" });
    },
  });

  // Mutation para atualizar categoria
  const updateMutation = useMutation({
    mutationFn: async (data: { id: number; name: string; description?: string }) => {
      const response = await fetch(`/api/team-categories/${data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: data.name, description: data.description }),
      });
      if (!response.ok) throw new Error('Erro ao atualizar categoria');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-categories-tree', teamId] });
      setIsEditDialogOpen(false);
      setSelectedCategory(null);
      toast({ title: "Categoria atualizada com sucesso!" });
    },
  });

  // Mutation para deletar categoria
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/team-categories/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Erro ao deletar categoria');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-categories-tree', teamId] });
      toast({ title: "Categoria deletada com sucesso!" });
    },
  });

  // Mutation para adicionar usuário à categoria
  const addUserMutation = useMutation({
    mutationFn: async (data: { categoryId: number; userId: number; priority: number }) => {
      const response = await fetch(`/api/team-categories/${data.categoryId}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: data.userId, priority: data.priority, autoAssign: true }),
      });
      if (!response.ok) throw new Error('Erro ao adicionar usuário');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category-users', selectedCategory?.id] });
      toast({ title: "Usuário adicionado com sucesso!" });
    },
  });

  // Mutation para remover usuário da categoria
  const removeUserMutation = useMutation({
    mutationFn: async (data: { categoryId: number; userId: number }) => {
      const response = await fetch(`/api/team-categories/${data.categoryId}/users/${data.userId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Erro ao remover usuário');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category-users', selectedCategory?.id] });
      toast({ title: "Usuário removido com sucesso!" });
    },
  });

  const toggleExpand = (categoryId: number) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const renderCategory = (category: TeamCategory, level: number = 0) => {
    const hasChildren = category.children && category.children.length > 0;
    const isExpanded = expandedCategories.has(category.id);

    return (
      <div key={category.id} className="mb-2">
        <div 
          className={`flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors`}
          style={{ marginLeft: `${level * 24}px` }}
        >
          <div className="flex items-center gap-2 flex-1">
            {hasChildren && (
              <button 
                onClick={() => toggleExpand(category.id)}
                className="p-1 hover:bg-muted rounded"
              >
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            )}
            {!hasChildren && <div className="w-6" />}
            
            <div className="flex-1">
              <div className="font-medium">{category.name}</div>
              {category.description && (
                <div className="text-sm text-muted-foreground">{category.description}</div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedParentId(category.id);
                setIsCreateDialogOpen(true);
              }}
            >
              <Plus className="h-3 w-3 mr-1" />
              Sub
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedCategory(category);
                setIsManageUsersDialogOpen(true);
              }}
            >
              <UsersIcon className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedCategory(category);
                setEditForm({ name: category.name, description: category.description || "" });
                setIsEditDialogOpen(true);
              }}
            >
              <Edit2 className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                if (confirm(`Deletar "${category.name}" e todas as subcategorias?`)) {
                  deleteMutation.mutate(category.id);
                }
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="mt-2">
            {category.children!.map(child => renderCategory(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gerenciar Categorias - {teamName}</DialogTitle>
            <DialogDescription>
              Organize sua equipe em categorias e subcategorias hierárquicas
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Button onClick={() => { setSelectedParentId(null); setIsCreateDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Categoria Raiz
            </Button>

            {isLoading ? (
              <div className="text-center py-8">Carregando...</div>
            ) : categoryTree.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma categoria criada ainda
              </div>
            ) : (
              <div className="space-y-2">
                {categoryTree.map(category => renderCategory(category))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para criar categoria */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedParentId ? "Nova Subcategoria" : "Nova Categoria"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="Ex: RH, Financeiro, Folha de Pagamento..."
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                placeholder="Descrição opcional..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => createMutation.mutate({ ...createForm, parentCategoryId: selectedParentId })}
                disabled={!createForm.name || createMutation.isPending}
              >
                Criar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para editar categoria */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Categoria</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => selectedCategory && updateMutation.mutate({ id: selectedCategory.id, ...editForm })}
                disabled={!editForm.name || updateMutation.isPending}
              >
                Atualizar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para gerenciar usuários da categoria */}
      <Dialog open={isManageUsersDialogOpen} onOpenChange={setIsManageUsersDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Usuários - {selectedCategory?.name}</DialogTitle>
            <DialogDescription>
              Gerencie os usuários responsáveis por esta categoria
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Usuários atuais */}
            <div>
              <h4 className="font-medium mb-2">Usuários Atribuídos</h4>
              {categoryUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum usuário atribuído</p>
              ) : (
                <div className="space-y-2">
                  {categoryUsers.map((assignment: any) => (
                    <div key={assignment.id} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <div className="font-medium">Usuário #{assignment.userId}</div>
                        <Badge variant="outline" className="text-xs">
                          Prioridade {assignment.priority}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => removeUserMutation.mutate({ 
                          categoryId: selectedCategory!.id, 
                          userId: assignment.userId 
                        })}
                      >
                        Remover
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Adicionar novos usuários */}
            <div>
              <h4 className="font-medium mb-2">Adicionar Usuário</h4>
              <Select onValueChange={(userId) => {
                if (selectedCategory) {
                  addUserMutation.mutate({
                    categoryId: selectedCategory.id,
                    userId: parseInt(userId),
                    priority: categoryUsers.length + 1
                  });
                }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um usuário" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map((user: any) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.fullName || user.name} - {user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default TeamCategoryManager;
