import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  Plus, 
  Edit2, 
  Search,
  Building2,
  Shield,
  UserCheck,
  UserX,
  Calendar,
  Trash2,
  AlertTriangle
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface User {
  id: number;
  fullName: string;
  email: string;
  role: 'admin' | 'helpdesk_manager' | 'helpdesk_agent' | 'client_manager' | 'client_user';
  isActive: boolean;
  createdAt: string;
  company?: string;
  teamId?: number;
  team?: {
    id: number;
    name: string;
  };
}

interface CreateUserForm {
  fullName: string;
  email: string;
  password: string;
  role: string;
  company?: number;
  teamId?: number;
}

const roleLabels = {
  admin: 'Administrador',
  helpdesk_manager: 'Gestor Helpdesk',
  helpdesk_agent: 'Agente Helpdesk',
  client_manager: 'Gestor da Empresa',
  client_user: 'Funcionário da Empresa'
};

const roleColors = {
  admin: 'destructive',
  helpdesk_manager: 'default',
  helpdesk_agent: 'secondary',
  client_manager: 'outline',
  client_user: 'outline'
} as const;

export function UserManagement() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const { toast } = useToast();
  const [createForm, setCreateForm] = useState<CreateUserForm>({
    fullName: "",
    email: "",
    password: "",
    role: "",
    company: undefined,
    teamId: undefined
  });
  const [editForm, setEditForm] = useState({
    fullName: "",
    email: "",
    role: "" as 'admin' | 'helpdesk_manager' | 'helpdesk_agent' | 'client_manager' | 'client_user' | "",
    company: undefined as number | undefined,
    teamId: undefined as number | undefined
  });

  const queryClient = useQueryClient();

  // Query para buscar usuários
  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await fetch('/api/access/users');
      if (!response.ok) throw new Error('Erro ao carregar usuários');
      return response.json();
    }
  });

  // Query para buscar empresas
  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const response = await fetch('/api/access/companies');
      if (!response.ok) throw new Error('Erro ao carregar empresas');
      return response.json();
    }
  });

  // Query para buscar equipes
  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const response = await fetch('/api/access/teams');
      if (!response.ok) throw new Error('Erro ao carregar equipes');
      return response.json();
    }
  });

  // Mutation para criar usuário
  const createUserMutation = useMutation({
    mutationFn: async (data: CreateUserForm) => {
      const response = await apiRequest('POST', '/api/access/users', data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsCreateDialogOpen(false);
      setCreateForm({
        fullName: "",
        email: "",
        password: "",
        role: "",
        company: undefined,
        teamId: undefined
      });
      toast({
        title: "Usuário criado com sucesso!",
        description: `O usuário ${data.fullName} foi criado e pode acessar o sistema.`,
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Erro ao criar usuário",
        description: "Ocorreu um erro ao tentar criar o usuário. Tente novamente.",
      });
    }
  });

  // Mutation para editar usuário
  const editUserMutation = useMutation({
    mutationFn: async (data: { id: number; user: Partial<User> }) => {
      const response = await apiRequest('PATCH', `/api/access/users/${data.id}`, data.user);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsEditDialogOpen(false);
      setEditingUser(null);
      toast({
        title: "Usuário atualizado com sucesso!",
        description: `O usuário ${data.fullName} foi atualizado.`,
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar usuário",
        description: "Ocorreu um erro ao tentar atualizar o usuário. Tente novamente.",
      });
    }
  });

  // Mutation para ativar/desativar usuário
  const toggleUserMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const response = await fetch(`/api/access/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive })
      });
      if (!response.ok) throw new Error('Erro ao alterar status do usuário');
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: variables.isActive ? "Usuário ativado" : "Usuário desativado",
        description: variables.isActive 
          ? "O usuário foi ativado com sucesso." 
          : "O usuário foi desativado com sucesso.",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Erro ao alterar status",
        description: "Ocorreu um erro ao tentar alterar o status do usuário.",
      });
    }
  });

  // Mutation para excluir usuário
  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/access/users/${id}`);
      // Resposta 204 não tem corpo JSON
      if (response.status === 204 || response.status === 200) {
        return { success: true };
      }
      throw new Error('Erro ao excluir usuário');
    },
    onSuccess: () => {
      // Invalidar múltiplas queries relacionadas para forçar refresh
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.refetchQueries({ queryKey: ['users'] });
      toast({
        title: "Usuário excluído",
        description: "O usuário foi excluído permanentemente com sucesso.",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Erro ao excluir usuário",
        description: "Ocorreu um erro ao tentar excluir o usuário.",
      });
    }
  });

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    createUserMutation.mutate(createForm);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setEditForm({
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      company: user.company ? parseInt(user.company) : undefined,
      teamId: user.teamId
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    
    // Criar objeto apenas com campos válidos
    const updateData: Partial<User> = {
      fullName: editForm.fullName,
      email: editForm.email,
      company: editForm.company ? editForm.company.toString() : undefined,
      teamId: editForm.teamId
    };
    
    // Adicionar role apenas se não for string vazia
    if (editForm.role !== "") {
      updateData.role = editForm.role as 'admin' | 'helpdesk_manager' | 'helpdesk_agent' | 'client_manager' | 'client_user';
    }
    
    editUserMutation.mutate({
      id: editingUser.id,
      user: updateData
    });
  };

  const filteredUsers = users.filter((user: User) => {
    const matchesSearch = (user.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (user.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesCompany = companyFilter === "all" || 
                          (companyFilter === "no-company" && !user.company) ||
                          user.company === companyFilter;
    
    return matchesSearch && matchesRole && matchesCompany;
  });

  // Determinar quais papéis podem ser criados/editados
  const getAvailableRoles = (isEdit = false) => {
    const company = isEdit ? editForm.company : createForm.company;
    
    if (company) {
      return [
        { value: 'client_manager', label: 'Gestor da Empresa' },
        { value: 'client_user', label: 'Funcionário da Empresa' }
      ];
    } else {
      return [
        { value: 'helpdesk_manager', label: 'Gestor Helpdesk' },
        { value: 'helpdesk_agent', label: 'Agente Helpdesk' }
      ];
    }
  };

  return (
    <div className="space-y-6">
      {/* Header com ações */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Gestão de Usuários</h2>
          <p className="text-muted-foreground">
            Gerencie usuários do sistema, suas permissões e vínculos
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Criar Novo Usuário</DialogTitle>
              <DialogDescription>
                Cadastre um novo usuário no sistema definindo suas permissões e empresa.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo *</Label>
                <Input
                  id="name"
                  value={createForm.fullName}
                  onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                  placeholder="João Silva"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="joao@empresa.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha *</Label>
                <Input
                  id="password"
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company">Empresa</Label>
                <Select 
                  value={createForm.company ? createForm.company.toString() : "internal"} 
                  onValueChange={(value) => {
                    setCreateForm({ 
                      ...createForm, 
                      company: value === "internal" ? undefined : Number(value),
                      role: "" // Reset role when company changes
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma empresa (ou deixe vazio para usuário interno)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">Usuário Interno (Helpdesk)</SelectItem>
                    {companies.map((company: any) => (
                      <SelectItem key={company.id} value={company.id.toString()}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Tipo de Acesso *</Label>
                <Select 
                  value={createForm.role || ""} 
                  onValueChange={(value) => setCreateForm({ ...createForm, role: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo de acesso" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableRoles().map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {createForm.role === 'helpdesk_agent' && (
                <div className="space-y-2">
                  <Label htmlFor="team">Equipe</Label>
                  <Select 
                    value={createForm.teamId?.toString() || "none"} 
                    onValueChange={(value) => setCreateForm({ 
                      ...createForm, 
                      teamId: value !== "none" ? parseInt(value) : undefined 
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma equipe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem equipe</SelectItem>
                      {teams.map((team: any) => (
                        <SelectItem key={team.id} value={team.id.toString()}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  {createForm.company 
                    ? "Usuário será vinculado à empresa selecionada e terá acesso apenas aos dados da empresa."
                    : "Usuário será da equipe interna de helpdesk e terá acesso a tickets de todas as empresas."
                  }
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
                  disabled={createUserMutation.isPending}
                >
                  {createUserMutation.isPending ? "Criando..." : "Criar Usuário"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Diálogo de Edição */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Editar Usuário</DialogTitle>
              <DialogDescription>
                Atualize os dados do usuário {editingUser?.fullName}.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-fullName">Nome Completo *</Label>
                <Input
                  id="edit-fullName"
                  value={editForm.fullName}
                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                  placeholder="Nome completo"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-email">Email *</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  placeholder="usuario@empresa.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-company">Empresa</Label>
                <Select 
                  value={editForm.company ? editForm.company.toString() : "internal"} 
                  onValueChange={(value) => {
                    setEditForm({ 
                      ...editForm, 
                      company: value === "internal" ? undefined : Number(value),
                      role: "" // Reset role when company changes
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma empresa (ou deixe vazio para usuário interno)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">Usuário Interno (Helpdesk)</SelectItem>
                    {companies.map((company: any) => (
                      <SelectItem key={company.id} value={company.id.toString()}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-role">Tipo de Acesso *</Label>
                <Select 
                  value={editForm.role || ""} 
                  onValueChange={(value) => setEditForm({ ...editForm, role: value as typeof editForm.role })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo de acesso" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableRoles(true).map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {editForm.company && (
                <div className="space-y-2">
                  <Label htmlFor="edit-team">Equipe</Label>
                  <Select 
                    value={editForm.teamId ? editForm.teamId.toString() : "none"} 
                    onValueChange={(value) => {
                      setEditForm({ 
                        ...editForm, 
                        teamId: value === "none" ? undefined : Number(value)
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma equipe (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem equipe</SelectItem>
                      {teams.filter((team: any) => team.companyId === editForm.company).map((team: any) => (
                        <SelectItem key={team.id} value={team.id.toString()}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

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
                  disabled={editUserMutation.isPending}
                >
                  {editUserMutation.isPending ? "Atualizando..." : "Atualizar Usuário"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar usuários..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="admin">Administrador</SelectItem>
            <SelectItem value="helpdesk_manager">Gestor Helpdesk</SelectItem>
            <SelectItem value="helpdesk_agent">Agente Helpdesk</SelectItem>
            <SelectItem value="client_manager">Gestor da Empresa</SelectItem>
            <SelectItem value="client_user">Funcionário</SelectItem>
          </SelectContent>
        </Select>

        <Select value={companyFilter} onValueChange={setCompanyFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por empresa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as empresas</SelectItem>
            <SelectItem value="no-company">Usuários internos</SelectItem>
            {companies.map((company: any) => (
              <SelectItem key={company.id} value={company.id.toString()}>
                {company.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Lista de Usuários */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoadingUsers ? (
          <div className="col-span-full text-center py-8">
            Carregando usuários...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            {searchTerm || roleFilter !== "all" || companyFilter !== "all" 
              ? "Nenhum usuário encontrado com os filtros aplicados" 
              : "Nenhum usuário cadastrado"}
          </div>
        ) : (
          filteredUsers.map((user: User) => (
            <Card key={user.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    {user.fullName}
                  </CardTitle>
                  <Badge variant={user.isActive ? "default" : "secondary"}>
                    {user.isActive ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div>
                    <strong>Email:</strong> {user.email}
                  </div>
                  <div className="flex items-center gap-2">
                    <strong>Tipo:</strong>
                    <Badge variant={roleColors[user.role]}>
                      {roleLabels[user.role]}
                    </Badge>
                  </div>
                  {user.company && (
                    <div className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      <strong>Empresa:</strong> {user.company}
                    </div>
                  )}
                  {user.team && (
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <strong>Equipe:</strong> {user.team.name}
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    Criado em {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleEditUser(user)}
                  >
                    <Edit2 className="h-3 w-3 mr-1" />
                    Editar
                  </Button>
                  <Button
                    variant={user.isActive ? "destructive" : "default"}
                    size="sm"
                    onClick={() => toggleUserMutation.mutate({ 
                      id: user.id, 
                      isActive: !user.isActive 
                    })}
                    disabled={toggleUserMutation.isPending}
                  >
                    {user.isActive ? (
                      <UserX className="h-3 w-3 mr-1" />
                    ) : (
                      <UserCheck className="h-3 w-3 mr-1" />
                    )}
                    {user.isActive ? "Desativar" : "Ativar"}
                  </Button>
                  
                  {/* Botão de exclusão - só aparece se usuário estiver inativo e não for admin */}
                  {!user.isActive && user.role !== 'admin' && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="h-3 w-3 mr-1" />
                          Excluir
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                            Confirmar Exclusão
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir o usuário "{user.fullName}"?
                            <br /><br />
                            <strong>Esta ação não pode ser desfeita</strong> e irá:
                            <ul className="list-disc list-inside mt-2 space-y-1">
                              <li>Remover o usuário permanentemente</li>
                              <li>Manter histórico de tickets para auditoria</li>
                              <li>Revogar todos os acessos</li>
                            </ul>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteUserMutation.mutate(user.id)}
                            className="bg-red-600 hover:bg-red-700"
                            disabled={deleteUserMutation.isPending}
                          >
                            {deleteUserMutation.isPending ? "Excluindo..." : "Sim, Excluir"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
