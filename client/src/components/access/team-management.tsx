import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  Plus, 
  Edit2, 
  Search,
  UserPlus,
  UserMinus,
  Calendar,
  Shield,
  Trash2
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Team {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  members?: Array<{
    id: number;
    name: string;
    email: string;
    role: string;
  }>;
  _count?: {
    members: number;
    assignedTickets: number;
  };
}

interface CreateTeamForm {
  name: string;
  description: string;
}

export function TeamManagement() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const [createForm, setCreateForm] = useState<CreateTeamForm>({
    name: "",
    description: ""
  });
  const [editForm, setEditForm] = useState({
    name: "",
    description: ""
  });

  const queryClient = useQueryClient();

  // Query para buscar equipes
  const { data: teams = [], isLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const response = await fetch('/api/access/teams');
      if (!response.ok) throw new Error('Erro ao carregar equipes');
      return response.json();
    }
  });

  // Query para buscar agentes disponíveis
  const { data: availableAgents = [] } = useQuery({
    queryKey: ['available-agents'],
    queryFn: async () => {
      const response = await fetch('/api/access/available-agents');
      if (!response.ok) throw new Error('Erro ao carregar agentes');
      return response.json();
    }
  });

  // Mutation para criar equipe
  const createTeamMutation = useMutation({
    mutationFn: async (data: CreateTeamForm) => {
      const response = await fetch('/api/access/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Erro ao criar equipe');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      setIsCreateDialogOpen(false);
      setCreateForm({ name: "", description: "" });
      toast({
        title: "Equipe criada com sucesso!",
        description: `A equipe ${data.name} foi criada e está pronta para uso.`,
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Erro ao criar equipe",
        description: "Ocorreu um erro ao tentar criar a equipe. Tente novamente.",
      });
    }
  });

  // Mutation para editar equipe
  const editTeamMutation = useMutation({
    mutationFn: async (data: { id: number; team: Partial<Team> }) => {
      const response = await fetch(`/api/access/teams/${data.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data.team)
      });
      if (!response.ok) throw new Error('Erro ao atualizar equipe');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      setIsEditDialogOpen(false);
      setEditingTeam(null);
      toast({
        title: "Equipe atualizada com sucesso!",
        description: `A equipe ${data.name} foi atualizada.`,
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar equipe",
        description: "Ocorreu um erro ao tentar atualizar a equipe. Tente novamente.",
      });
    }
  });

  // Mutation para ativar/desativar equipe
  const toggleTeamMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const response = await fetch(`/api/access/teams/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive })
      });
      if (!response.ok) throw new Error('Erro ao alterar status da equipe');
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast({
        title: variables.isActive ? "Equipe ativada" : "Equipe desativada",
        description: variables.isActive 
          ? "A equipe foi ativada com sucesso." 
          : "A equipe foi desativada com sucesso.",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Erro ao alterar status",
        description: "Ocorreu um erro ao tentar alterar o status da equipe.",
      });
    }
  });

  // Mutation para adicionar membro à equipe
  const addMemberMutation = useMutation({
    mutationFn: async ({ teamId, userId }: { teamId: number; userId: number }) => {
      const response = await fetch(`/api/access/teams/${teamId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      if (!response.ok) throw new Error('Erro ao adicionar membro');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['available-agents'] });
    }
  });

  // Mutation para excluir equipe
  const deleteTeamMutation = useMutation({
    mutationFn: async (teamId: number) => {
      const response = await fetch(`/api/access/teams/${teamId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Erro ao excluir equipe');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast({
        title: "Equipe excluída",
        description: "A equipe foi excluída permanentemente com sucesso.",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Erro ao excluir equipe",
        description: "Ocorreu um erro ao tentar excluir a equipe.",
      });
    }
  });

  // Mutation para remover membro da equipe
  const removeMemberMutation = useMutation({
    mutationFn: async ({ teamId, userId }: { teamId: number; userId: number }) => {
      const response = await fetch(`/api/access/teams/${teamId}/members/${userId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Erro ao remover membro');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['available-agents'] });
    }
  });

  const handleCreateTeam = (e: React.FormEvent) => {
    e.preventDefault();
    createTeamMutation.mutate(createForm);
  };

  const handleEditTeam = (team: Team) => {
    setEditingTeam(team);
    setEditForm({
      name: team.name,
      description: team.description || ""
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeam) return;
    
    editTeamMutation.mutate({
      id: editingTeam.id,
      team: editForm
    });
  };

  const filteredTeams = teams.filter((team: Team) =>
    team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header com ações */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Gestão de Equipes</h2>
          <p className="text-muted-foreground">
            Gerencie equipes de agentes helpdesk e suas atribuições
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nova Equipe
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Criar Nova Equipe</DialogTitle>
              <DialogDescription>
                Cadastre uma nova equipe para organizar e distribuir tickets entre agentes.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Equipe *</Label>
                <Input
                  id="name"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="Equipe Suporte Nível 1"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="Descrição das responsabilidades da equipe..."
                  rows={3}
                />
              </div>

              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Após criar a equipe, você poderá adicionar agentes helpdesk a ela.
                </AlertDescription>
              </Alert>

              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit"
                  disabled={createTeamMutation.isPending}
                >
                  {createTeamMutation.isPending ? "Criando..." : "Criar Equipe"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Diálogo de Edição */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Editar Equipe</DialogTitle>
              <DialogDescription>
                Atualize os dados da equipe {editingTeam?.name}.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleUpdateTeam} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nome da Equipe *</Label>
                <Input
                  id="edit-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="Nome da equipe"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Descrição</Label>
                <Textarea
                  id="edit-description"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="Descrição da equipe e suas responsabilidades"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit"
                  disabled={editTeamMutation.isPending}
                >
                  {editTeamMutation.isPending ? "Atualizando..." : "Atualizar Equipe"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Busca */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar equipes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Lista de Equipes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {isLoading ? (
          <div className="col-span-full text-center py-8">
            Carregando equipes...
          </div>
        ) : filteredTeams.length === 0 ? (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            {searchTerm ? "Nenhuma equipe encontrada" : "Nenhuma equipe cadastrada"}
          </div>
        ) : (
          filteredTeams.map((team: Team) => (
            <Card key={team.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    {team.name}
                  </CardTitle>
                  <Badge variant={team.isActive ? "default" : "secondary"}>
                    {team.isActive ? "Ativa" : "Inativa"}
                  </Badge>
                </div>
                {team.description && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {team.description}
                  </p>
                )}
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Estatísticas */}
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {team._count?.members || 0} membros
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {team._count?.assignedTickets || 0} tickets atribuídos
                  </span>
                </div>

                {/* Membros da Equipe */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Membros:</h4>
                  {(!team.members || team.members.length === 0) ? (
                    <p className="text-sm text-muted-foreground italic">
                      Nenhum membro na equipe
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {(team.members || []).map((member) => (
                        <div key={member.id} className="flex items-center justify-between bg-muted p-2 rounded text-sm">
                          <div>
                            <span className="font-medium">{member.name}</span>
                            <span className="text-muted-foreground ml-1">
                              ({member.email})
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeMemberMutation.mutate({ 
                              teamId: team.id, 
                              userId: member.id 
                            })}
                            disabled={removeMemberMutation.isPending}
                          >
                            <UserMinus className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Adicionar Agentes Disponíveis */}
                {availableAgents.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Adicionar Agentes:</h4>
                    <div className="space-y-1">
                      {availableAgents.slice(0, 3).map((agent: any) => (
                        <div key={agent.id} className="flex items-center justify-between bg-green-50 p-2 rounded text-sm">
                          <div>
                            <span className="font-medium">{agent.name}</span>
                            <span className="text-muted-foreground ml-1">
                              ({agent.email})
                            </span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addMemberMutation.mutate({ 
                              teamId: team.id, 
                              userId: agent.id 
                            })}
                            disabled={addMemberMutation.isPending}
                          >
                            <UserPlus className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      {availableAgents.length > 3 && (
                        <p className="text-xs text-muted-foreground">
                          +{availableAgents.length - 3} outros agentes disponíveis
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Ações */}
                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleEditTeam(team)}
                  >
                    <Edit2 className="h-3 w-3 mr-1" />
                    Editar
                  </Button>
                  <Button
                    variant={team.isActive ? "destructive" : "default"}
                    size="sm"
                    onClick={() => toggleTeamMutation.mutate({ 
                      id: team.id, 
                      isActive: !team.isActive 
                    })}
                    disabled={toggleTeamMutation.isPending}
                  >
                    {team.isActive ? "Desativar" : "Ativar"}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (confirm(`Tem certeza que deseja excluir a equipe "${team.name}"? Esta ação não pode ser desfeita.`)) {
                        deleteTeamMutation.mutate(team.id);
                      }
                    }}
                    disabled={deleteTeamMutation.isPending}
                    title="Excluir equipe"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground">
                  Criada em {new Date(team.createdAt).toLocaleDateString('pt-BR')}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
