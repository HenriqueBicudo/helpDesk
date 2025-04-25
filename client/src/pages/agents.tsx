import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { AppLayout } from '@/components/layout/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Plus, Pencil, Trash2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { getInitials } from '@/lib/utils';
import { User, InsertUser } from '@shared/schema';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { TicketsPagination } from '@/components/tickets/tickets-pagination';

// Extended schema for form validation
const userFormSchema = z.object({
  username: z.string().min(3, { message: "Usuário deve ter pelo menos 3 caracteres" }),
  password: z.string().min(6, { message: "Senha deve ter pelo menos 6 caracteres" }),
  fullName: z.string().min(3, { message: "Nome deve ter pelo menos 3 caracteres" }),
  email: z.string().email({ message: "Email inválido" }),
  role: z.string().default("agent"),
});

type AgentFormValues = z.infer<typeof userFormSchema>;

export default function Agents() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Query for fetching agents
  const { data: agents, isLoading, error } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  // Form for adding new agent
  const form = useForm<AgentFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: '',
      password: '',
      fullName: '',
      email: '',
      role: 'agent',
    }
  });

  // Form for editing agent
  const editForm = useForm<Partial<AgentFormValues>>({
    resolver: zodResolver(userFormSchema.partial({ password: true })),
    defaultValues: {
      username: selectedAgent?.username || '',
      fullName: selectedAgent?.fullName || '',
      email: selectedAgent?.email || '',
      role: selectedAgent?.role || 'agent',
    }
  });

  // Reset form when opening dialog
  const openAddDialog = () => {
    form.reset();
    setIsAddDialogOpen(true);
  };

  // Set up form when opening edit dialog
  const openEditDialog = (agent: User) => {
    setSelectedAgent(agent);
    editForm.reset({
      username: agent.username,
      fullName: agent.fullName,
      email: agent.email,
      role: agent.role
    });
    setIsEditDialogOpen(true);
  };

  // Mutation for adding a new agent
  const addAgentMutation = useMutation({
    mutationFn: async (data: InsertUser) => {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Erro ao adicionar agente');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Agente adicionado",
        description: "O agente foi adicionado com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setIsAddDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Function to handle form submission
  const onSubmit = (data: AgentFormValues) => {
    addAgentMutation.mutate(data);
  };

  // Filter agents based on search query
  const filteredAgents = agents?.filter(agent => 
    agent.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.username.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Calculate pagination
  const totalPages = Math.ceil((filteredAgents?.length || 0) / itemsPerPage);
  const paginatedAgents = filteredAgents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Helper function to get role label
  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return { label: 'Administrador', variant: 'default', color: 'bg-purple-100 text-purple-800' };
      case 'supervisor':
        return { label: 'Supervisor', variant: 'outline', color: 'bg-blue-100 text-blue-800' };
      case 'agent':
      default:
        return { label: 'Agente', variant: 'secondary', color: 'bg-gray-100 text-gray-800' };
    }
  };

  if (error) {
    return (
      <AppLayout title="Agentes">
        <div className="flex items-center justify-center h-[80vh]">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-gray-900">Erro ao carregar agentes</h2>
            <p className="mt-1 text-sm text-gray-500">
              Ocorreu um erro ao carregar a lista de agentes. Tente novamente mais tarde.
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Agentes">
      <div className="p-6">
        <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
          <div className="relative w-full md:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Buscar agentes..."
              className="w-full pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="w-full md:w-auto">
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openAddDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Agente
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Novo Agente</DialogTitle>
                  <DialogDescription>
                    Preencha os detalhes do agente abaixo.
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome de Usuário</FormLabel>
                          <FormControl>
                            <Input placeholder="Digite o nome de usuário" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Senha</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Digite a senha" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome Completo</FormLabel>
                          <FormControl>
                            <Input placeholder="Digite o nome completo" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="email@exemplo.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Função</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione uma função" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="agent">Agente</SelectItem>
                              <SelectItem value="supervisor">Supervisor</SelectItem>
                              <SelectItem value="admin">Administrador</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button 
                        type="submit" 
                        disabled={addAgentMutation.isPending}
                      >
                        {addAgentMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Salvar Agente
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Agentes</CardTitle>
            <CardDescription>
              Gerencie os agentes e administradores do sistema.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : paginatedAgents.length === 0 ? (
              <div className="text-center py-8">
                <h3 className="text-lg font-medium">Nenhum agente encontrado</h3>
                <p className="text-sm text-gray-500 mt-2">
                  {searchQuery 
                    ? "Nenhum agente corresponde à sua busca. Tente com outros termos."
                    : "Comece adicionando seu primeiro agente."}
                </p>
              </div>
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Agente</TableHead>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Função</TableHead>
                        <TableHead>Data de Cadastro</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedAgents.map((agent) => {
                        const roleInfo = getRoleLabel(agent.role);
                        return (
                          <TableRow key={agent.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar>
                                  <AvatarFallback className="bg-primary/10">
                                    {agent.avatarInitials}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">{agent.fullName}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{agent.username}</TableCell>
                            <TableCell>{agent.email}</TableCell>
                            <TableCell>
                              <Badge className={roleInfo.color}>
                                {roleInfo.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {format(new Date(agent.createdAt), 'dd/MM/yyyy')}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => openEditDialog(agent)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-4">
                    <TicketsPagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      totalItems={filteredAgents.length}
                      itemsPerPage={itemsPerPage}
                      onPageChange={setCurrentPage}
                    />
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Agente</DialogTitle>
              <DialogDescription>
                Atualize os detalhes do agente abaixo. Deixe a senha em branco para não alterá-la.
              </DialogDescription>
            </DialogHeader>
            <Form {...editForm}>
              <form className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome de Usuário</FormLabel>
                      <FormControl>
                        <Input placeholder="Digite o nome de usuário" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo</FormLabel>
                      <FormControl>
                        <Input placeholder="Digite o nome completo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="email@exemplo.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Função</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma função" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="agent">Agente</SelectItem>
                          <SelectItem value="supervisor">Supervisor</SelectItem>
                          <SelectItem value="admin">Administrador</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit">
                    Atualizar Agente
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}