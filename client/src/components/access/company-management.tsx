import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { 
  Building2, 
  Plus, 
  Edit2, 
  Users, 
  FileText, 
  Calendar,
  CheckCircle,
  XCircle,
  Search,
  Trash2,
  AlertTriangle
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface Company {
  id: number;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  isActive: boolean;
  createdAt: string;
  representativeId?: number;
  representative?: {
    id: number;
    name: string;
    email: string;
  };
  _count?: {
    users: number;
    tickets: number;
  };
}

interface CreateCompanyForm {
  name: string;
  cnpj: string;
  email: string;
  phone: string;
  address: string;
  representativeData: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
  };
}

export function CompanyManagement() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const [createForm, setCreateForm] = useState<CreateCompanyForm>({
    name: "",
    cnpj: "",
    email: "",
    phone: "",
    address: "",
    representativeData: {
      fullName: "",
      email: "",
      phone: "",
      password: ""
    }
  });
  const [editForm, setEditForm] = useState({
    name: "",
    cnpj: "",
    email: "",
    phone: "",
    address: ""
  });

  const queryClient = useQueryClient();

  // Query para buscar empresas
  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const response = await fetch('/api/access/companies');
      if (!response.ok) throw new Error('Erro ao carregar empresas');
      return response.json();
    }
  });

  // Mutation para criar empresa
  const createCompanyMutation = useMutation({
    mutationFn: async (data: CreateCompanyForm) => {
      const response = await apiRequest('POST', '/api/access/companies', data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      setIsCreateDialogOpen(false);
      setCreateForm({
        name: "",
        cnpj: "",
        email: "",
        phone: "",
        address: "",
        representativeData: {
          fullName: "",
          email: "",
          phone: "",
          password: ""
        }
      });
      toast({
        title: "Empresa criada com sucesso!",
        description: `A empresa ${data.name} foi criada e o usuário representante foi cadastrado.`,
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro ao criar empresa",
        description: "Ocorreu um erro ao tentar criar a empresa. Tente novamente.",
      });
    }
  });

  // Mutation para editar empresa
  const editCompanyMutation = useMutation({
    mutationFn: async (data: { id: number; company: Partial<Company> }) => {
      const response = await apiRequest('PUT', `/api/access/companies/${data.id}`, data.company);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      setIsEditDialogOpen(false);
      setEditingCompany(null);
      toast({
        title: "Empresa atualizada com sucesso!",
        description: `A empresa ${data.name} foi atualizada.`,
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar empresa",
        description: "Ocorreu um erro ao tentar atualizar a empresa. Tente novamente.",
      });
    }
  });

  // Mutation para ativar/desativar empresa
  const toggleCompanyMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const response = await fetch(`/api/access/companies/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive })
      });
      if (!response.ok) throw new Error('Erro ao alterar status da empresa');
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast({
        title: variables.isActive ? "Empresa ativada" : "Empresa desativada",
        description: variables.isActive 
          ? "A empresa foi ativada com sucesso." 
          : "A empresa foi desativada com sucesso.",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Erro ao alterar status",
        description: "Ocorreu um erro ao tentar alterar o status da empresa.",
      });
    }
  });

  // Mutation para excluir empresa
  const deleteCompanyMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/access/companies/${id}`);
      // Resposta 204 não tem corpo JSON
      if (response.status === 204 || response.status === 200) {
        return { success: true };
      }
      throw new Error('Erro ao excluir empresa');
    },
    onSuccess: () => {
      // Invalidar múltiplas queries relacionadas para forçar refresh
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.refetchQueries({ queryKey: ['companies'] });
      toast({
        title: "Empresa excluída",
        description: "A empresa foi excluída permanentemente com sucesso.",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Erro ao excluir empresa",
        description: "Ocorreu um erro ao tentar excluir a empresa.",
      });
    }
  });

  const handleCreateCompany = (e: React.FormEvent) => {
    e.preventDefault();
    createCompanyMutation.mutate(createForm);
  };

  const handleEditCompany = (company: Company) => {
    setEditingCompany(company);
    setEditForm({
      name: company.name,
      cnpj: "", // CNPJ não está no retorno da API, então deixamos vazio
      email: company.email,
      phone: company.phone || "",
      address: company.address || ""
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany) return;
    
    editCompanyMutation.mutate({
      id: editingCompany.id,
      company: editForm
    });
  };

  const filteredCompanies = companies.filter((company: Company) =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header com ações */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Gestão de Empresas</h2>
          <p className="text-muted-foreground">
            Gerencie empresas cliente e seus representantes
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nova Empresa
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Criar Nova Empresa</DialogTitle>
              <DialogDescription>
                Cadastre uma nova empresa e um usuário representante para o sistema.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleCreateCompany} className="space-y-6">
              {/* Dados da Empresa */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Dados da Empresa</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome da Empresa *</Label>
                    <Input
                      id="name"
                      value={createForm.name}
                      onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                      placeholder="Acme Corporation"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="cnpj">CNPJ</Label>
                    <Input
                      id="cnpj"
                      value={createForm.cnpj}
                      onChange={(e) => setCreateForm({ ...createForm, cnpj: e.target.value })}
                      placeholder="00.000.000/0000-00"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email da Empresa *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={createForm.email}
                      onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                      placeholder="contato@empresa.com"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      value={createForm.phone}
                      onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                      placeholder="(11) 9999-9999"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="address">Endereço</Label>
                  <Textarea
                    id="address"
                    value={createForm.address}
                    onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
                    placeholder="Rua, número, bairro, cidade, CEP"
                    rows={2}
                  />
                </div>
              </div>

              {/* Dados do Representante */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Representante da Empresa</h3>
                <Alert>
                  <Users className="h-4 w-4" />
                  <AlertDescription>
                    O representante será criado como "Gestor da Empresa" e poderá gerenciar usuários e tickets da empresa.
                  </AlertDescription>
                </Alert>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="representativeName">Nome Completo *</Label>
                    <Input
                      id="representativeName"
                      value={createForm.representativeData.fullName}
                      onChange={(e) => setCreateForm({ 
                        ...createForm, 
                        representativeData: { 
                          ...createForm.representativeData, 
                          fullName: e.target.value 
                        } 
                      })}
                      placeholder="João Silva"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="representativeEmail">Email *</Label>
                    <Input
                      id="representativeEmail"
                      type="email"
                      value={createForm.representativeData.email}
                      onChange={(e) => setCreateForm({ 
                        ...createForm, 
                        representativeData: { 
                          ...createForm.representativeData, 
                          email: e.target.value 
                        } 
                      })}
                      placeholder="joao@empresa.com"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="representativePhone">Telefone</Label>
                    <Input
                      id="representativePhone"
                      value={createForm.representativeData.phone}
                      onChange={(e) => setCreateForm({ 
                        ...createForm, 
                        representativeData: { 
                          ...createForm.representativeData, 
                          phone: e.target.value 
                        } 
                      })}
                      placeholder="(11) 9999-9999"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="representativePassword">Senha *</Label>
                    <Input
                      id="representativePassword"
                      type="password"
                      value={createForm.representativeData.password}
                      onChange={(e) => setCreateForm({ 
                        ...createForm, 
                        representativeData: { 
                          ...createForm.representativeData, 
                          password: e.target.value 
                        } 
                      })}
                      placeholder="Mínimo 6 caracteres"
                      required
                      minLength={6}
                    />
                  </div>
                </div>
              </div>

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
                  disabled={createCompanyMutation.isPending}
                >
                  {createCompanyMutation.isPending ? "Criando..." : "Criar Empresa"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Diálogo de Edição */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Empresa</DialogTitle>
              <DialogDescription>
                Atualize os dados da empresa {editingCompany?.name}.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleUpdateCompany} className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Dados da Empresa</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Nome da Empresa *</Label>
                    <Input
                      id="edit-name"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      placeholder="Acme Corporation"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-cnpj">CNPJ</Label>
                    <Input
                      id="edit-cnpj"
                      value={editForm.cnpj}
                      onChange={(e) => setEditForm({ ...editForm, cnpj: e.target.value })}
                      placeholder="00.000.000/0000-00"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-email">Email da Empresa *</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      placeholder="contato@empresa.com"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-phone">Telefone</Label>
                    <Input
                      id="edit-phone"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      placeholder="(11) 9999-9999"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-address">Endereço</Label>
                  <Textarea
                    id="edit-address"
                    value={editForm.address}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    placeholder="Rua, número, bairro, cidade, CEP"
                    rows={2}
                  />
                </div>
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
                  disabled={editCompanyMutation.isPending}
                >
                  {editCompanyMutation.isPending ? "Atualizando..." : "Atualizar Empresa"}
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
            placeholder="Buscar empresas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Lista de Empresas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full text-center py-8">
            Carregando empresas...
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            {searchTerm ? "Nenhuma empresa encontrada" : "Nenhuma empresa cadastrada"}
          </div>
        ) : (
          filteredCompanies.map((company: Company) => (
            <Card key={company.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    {company.name}
                  </CardTitle>
                  <Badge variant={company.isActive ? "default" : "secondary"}>
                    {company.isActive ? "Ativa" : "Inativa"}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div>
                    <strong>Email:</strong> {company.email}
                  </div>
                  {company.representative && (
                    <div>
                      <strong>Representante:</strong> {company.representative.name}
                    </div>
                  )}
                  <div className="flex items-center gap-4 text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {company._count?.users || 0} usuários
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {company._count?.tickets || 0} tickets
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    Criada em {new Date(company.createdAt).toLocaleDateString('pt-BR')}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleEditCompany(company)}
                  >
                    <Edit2 className="h-3 w-3 mr-1" />
                    Editar
                  </Button>
                  <Button
                    variant={company.isActive ? "destructive" : "default"}
                    size="sm"
                    onClick={() => toggleCompanyMutation.mutate({ 
                      id: company.id, 
                      isActive: !company.isActive 
                    })}
                    disabled={toggleCompanyMutation.isPending}
                  >
                    {company.isActive ? (
                      <XCircle className="h-3 w-3 mr-1" />
                    ) : (
                      <CheckCircle className="h-3 w-3 mr-1" />
                    )}
                    {company.isActive ? "Desativar" : "Ativar"}
                  </Button>
                  
                  {/* Botão de exclusão - só aparece se empresa estiver inativa */}
                  {!company.isActive && (
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
                            Tem certeza que deseja excluir a empresa "{company.name}"?
                            <br /><br />
                            <strong>Esta ação não pode ser desfeita</strong> e irá:
                            <ul className="list-disc list-inside mt-2 space-y-1">
                              <li>Remover todos os usuários da empresa</li>
                              <li>Manter histórico de tickets para auditoria</li>
                              <li>Excluir todos os dados relacionados</li>
                            </ul>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel disabled={deleteCompanyMutation.isPending}>
                            Cancelar
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={(e) => {
                              e.preventDefault();
                              deleteCompanyMutation.mutate(company.id);
                            }}
                            className="bg-red-600 hover:bg-red-700"
                            disabled={deleteCompanyMutation.isPending}
                          >
                            {deleteCompanyMutation.isPending ? "Excluindo..." : "Sim, Excluir"}
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
