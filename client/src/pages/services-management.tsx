import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit2, Trash2, ChevronRight, ChevronDown, Settings2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface Service {
  id: number;
  name: string;
  description?: string;
  parentId?: number | null;
  teamId?: number | null;
  order: number;
  isActive: boolean;
  createdAt: string;
  children?: Service[];
}

export function ServicesManagementPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedServices, setExpandedServices] = useState<Set<number>>(new Set());
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedParentId, setSelectedParentId] = useState<number | null>(null);
  const [createForm, setCreateForm] = useState({ name: "", description: "", teamId: null as number | null });
  const [editForm, setEditForm] = useState({ name: "", description: "", teamId: null as number | null });
  const [searchTerm, setSearchTerm] = useState("");

  // Query para buscar todas as equipes
  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const response = await fetch('/api/access/teams');
      if (!response.ok) throw new Error('Erro ao carregar equipes');
      return response.json();
    },
  });

  // Query para buscar árvore de serviços
  const { data: serviceTree = [], isLoading } = useQuery({
    queryKey: ['services', 'tree'],
    queryFn: async () => {
      const response = await fetch('/api/services/tree');
      if (!response.ok) throw new Error('Erro ao carregar serviços');
      return response.json();
    },
  });

  // Mutation para criar serviço
  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string; parentId?: number | null }) => {
      const response = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Erro ao criar serviço');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      setIsCreateDialogOpen(false);
      setCreateForm({ name: "", description: "", teamId: null });
      setSelectedParentId(null);
      toast({ title: "Serviço criado com sucesso!" });
    },
  });

  // Mutation para atualizar serviço
  const updateMutation = useMutation({
    mutationFn: async (data: { id: number; name: string; description?: string; teamId?: number | null }) => {
      const response = await fetch(`/api/services/${data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: data.name, description: data.description, teamId: data.teamId }),
      });
      if (!response.ok) throw new Error('Erro ao atualizar serviço');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      setIsEditDialogOpen(false);
      setSelectedService(null);
      toast({ title: "Serviço atualizado com sucesso!" });
    },
  });

  // Mutation para deletar serviço
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/services/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao deletar serviço');
      }
      // Status 204 não tem corpo, não tentar fazer parse
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast({ title: "Serviço deletado com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Erro ao deletar serviço", 
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const toggleExpand = (serviceId: number) => {
    setExpandedServices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(serviceId)) {
        newSet.delete(serviceId);
      } else {
        newSet.add(serviceId);
      }
      return newSet;
    });
  };

  // Coletar todos os IDs de serviços que devem estar expandidos
  const collectExpandedIds = (services: Service[]): Set<number> => {
    const ids = new Set<number>();
    
    const traverse = (service: Service) => {
      if (service.children && service.children.length > 0) {
        // Se tem filhos, adiciona o ID deste serviço para expandir
        ids.add(service.id);
        // Continua recursivamente nos filhos
        service.children.forEach(child => traverse(child));
      }
    };
    
    services.forEach(service => traverse(service));
    return ids;
  };

  // Filtrar serviços por termo de busca
  const filterServices = (services: Service[]): Service[] => {
    if (!searchTerm) return services;
    
    const term = searchTerm.toLowerCase();
    
    return services.filter(service => {
      // Verifica se o serviço atual corresponde
      const matches = service.name.toLowerCase().includes(term) || 
                     service.description?.toLowerCase().includes(term);
      
      // Se tem filhos, filtra recursivamente
      if (service.children && service.children.length > 0) {
        const filteredChildren = filterServices(service.children);
        // Mantém o pai se ele corresponde OU se algum filho corresponde
        if (matches || filteredChildren.length > 0) {
          return true;
        }
      }
      
      return matches;
    }).map(service => ({
      ...service,
      children: service.children ? filterServices(service.children) : []
    }));
  };

  const filteredServiceTree = filterServices(serviceTree);

  // Expandir automaticamente quando há busca
  useEffect(() => {
    if (searchTerm && filteredServiceTree.length > 0) {
      const expandIds = collectExpandedIds(filteredServiceTree);
      setExpandedServices(expandIds);
    } else if (!searchTerm) {
      // Quando limpa a busca, recolhe tudo
      setExpandedServices(new Set());
    }
  }, [searchTerm, JSON.stringify(filteredServiceTree)]);

  const renderService = (service: Service, level: number = 0) => {
    const hasChildren = service.children && service.children.length > 0;
    const isExpanded = expandedServices.has(service.id);

    return (
      <div key={service.id} className="mb-2">
        <div 
          className={`flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors`}
          style={{ marginLeft: `${level * 24}px` }}
        >
          <div className="flex items-center gap-2 flex-1">
            {hasChildren && (
              <button 
                onClick={() => toggleExpand(service.id)}
                className="p-1 hover:bg-muted rounded"
              >
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            )}
            {!hasChildren && <div className="w-6" />}
            
            <div className="flex-1">
              <div className="font-medium">{service.name}</div>
              {service.description && (
                <div className="text-sm text-muted-foreground">{service.description}</div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedParentId(service.id);
                setCreateForm({ name: "", description: "", teamId: null });
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
                setSelectedService(service);
                setEditForm({ name: service.name, description: service.description || "", teamId: service.teamId || null });
                setIsEditDialogOpen(true);
              }}
            >
              <Edit2 className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                if (confirm(`Deletar "${service.name}"${hasChildren ? ' e todos os subserviços' : ''}?`)) {
                  deleteMutation.mutate(service.id);
                }
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="mt-2">
            {service.children!.map(child => renderService(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                Gerenciamento de Serviços
              </CardTitle>
              <CardDescription>
                Gerencie os serviços oferecidos pelo sistema
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Input
                placeholder="Buscar serviços..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-[300px]"
              />
              <Button onClick={() => { 
                setSelectedParentId(null); 
                setCreateForm({ name: "", description: "", teamId: null });
                setIsCreateDialogOpen(true); 
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Serviço
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Carregando...</div>
          ) : filteredServiceTree.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? "Nenhum serviço encontrado" : "Nenhum serviço cadastrado"}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredServiceTree.map(service => renderService(service))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para criar serviço */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedParentId ? "Novo Subserviço" : "Novo Serviço"}
            </DialogTitle>
            <DialogDescription>
              {selectedParentId ? "Adicione um novo subserviço dentro deste serviço" : "Crie um novo serviço no sistema"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="Ex: Instalação de Software, Manutenção de Rede..."
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
            <div>
              <Label>Equipe Padrão (opcional)</Label>
              <Select
                value={createForm.teamId?.toString() || "none"}
                onValueChange={(value) => setCreateForm({ ...createForm, teamId: value === "none" ? null : parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma equipe..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {teams.map((team: any) => (
                    <SelectItem key={team.id} value={team.id.toString()}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Tickets criados com este serviço terão esta equipe pré-selecionada
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => createMutation.mutate({ 
                  ...createForm, 
                  parentId: selectedParentId 
                })}
                disabled={!createForm.name || createMutation.isPending}
              >
                Criar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para editar serviço */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Serviço</DialogTitle>
            <DialogDescription>
              Atualize as informações do serviço
            </DialogDescription>
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
            <div>
              <Label>Equipe Padrão (opcional)</Label>
              <Select
                value={editForm.teamId?.toString() || "none"}
                onValueChange={(value) => setEditForm({ ...editForm, teamId: value === "none" ? null : parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma equipe..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {teams.map((team: any) => (
                    <SelectItem key={team.id} value={team.id.toString()}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Tickets criados com este serviço terão esta equipe pré-selecionada
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => selectedService && updateMutation.mutate({ id: selectedService.id, ...editForm })}
                disabled={!editForm.name || updateMutation.isPending}
              >
                Atualizar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ServicesManagementPage;
