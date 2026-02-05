import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit2, Trash2, ChevronRight, ChevronDown } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Service {
  id: number;
  teamId: number;
  name: string;
  description?: string;
  parentId?: number | null;
  order: number;
  isActive: boolean;
  createdAt: string;
  children?: Service[];
}

interface ServiceManagerProps {
  teamId: number;
  teamName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ServiceManager({ teamId, teamName, open, onOpenChange }: ServiceManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedServices, setExpandedServices] = useState<Set<number>>(new Set());
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedParentId, setSelectedParentId] = useState<number | null>(null);
  const [createForm, setCreateForm] = useState({ name: "", description: "" });
  const [editForm, setEditForm] = useState({ name: "", description: "" });

  // Query para buscar árvore de serviços
  const { data: serviceTree = [], isLoading } = useQuery({
    queryKey: ['services-tree', teamId],
    queryFn: async () => {
      const response = await fetch(`/api/services/team/${teamId}/tree`);
      if (!response.ok) throw new Error('Erro ao carregar serviços');
      return response.json();
    },
    enabled: open && !!teamId,
  });

  // Mutation para criar serviço
  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string; parentId?: number | null }) => {
      const response = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, teamId }),
      });
      if (!response.ok) throw new Error('Erro ao criar serviço');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services-tree', teamId] });
      queryClient.invalidateQueries({ queryKey: ['services'] });
      setIsCreateDialogOpen(false);
      setCreateForm({ name: "", description: "" });
      setSelectedParentId(null);
      toast({ title: "Serviço criado com sucesso!" });
    },
  });

  // Mutation para atualizar serviço
  const updateMutation = useMutation({
    mutationFn: async (data: { id: number; name: string; description?: string }) => {
      const response = await fetch(`/api/services/${data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: data.name, description: data.description }),
      });
      if (!response.ok) throw new Error('Erro ao atualizar serviço');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services-tree', teamId] });
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
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services-tree', teamId] });
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
                setEditForm({ name: service.name, description: service.description || "" });
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
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gerenciar Serviços - {teamName}</DialogTitle>
            <DialogDescription>
              Organize os serviços da equipe em uma estrutura hierárquica
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Button onClick={() => { setSelectedParentId(null); setIsCreateDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Serviço Raiz
            </Button>

            {isLoading ? (
              <div className="text-center py-8">Carregando...</div>
            ) : serviceTree.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum serviço criado ainda
              </div>
            ) : (
              <div className="space-y-2">
                {serviceTree.map(service => renderService(service))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para criar serviço */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedParentId ? "Novo Subserviço" : "Novo Serviço"}
            </DialogTitle>
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
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => createMutation.mutate({ ...createForm, parentId: selectedParentId })}
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

export default ServiceManager;
