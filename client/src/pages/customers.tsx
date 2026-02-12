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
import { Loader2, Search, Plus, Pencil, Trash2, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { getInitials } from '@/lib/utils';
import { Company, InsertCompany } from '@shared/schema';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { TicketsPagination } from '@/components/tickets/tickets-pagination';

// Extended schema for form validation
const companyFormSchema = z.object({
  name: z.string().min(3, { message: "Nome deve ter pelo menos 3 caracteres" }),
  email: z.string().email({ message: "Email inválido" }),
  cnpj: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  isActive: z.boolean().default(true),
  hasActiveContract: z.boolean().default(false)
});

type CustomerFormValues = z.infer<typeof companyFormSchema>;

export default function Customers() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Company | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Query for fetching customers
  const { data: customers, isLoading, error } = useQuery<Company[]>({
    queryKey: ['/api/companies'],
  });

  // Form for adding new customer
  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: {
      name: '',
      email: '',
      cnpj: '',
      phone: '',
      address: '',
      isActive: true,
      hasActiveContract: false
    }
  });

  // Form for editing customer
  const editForm = useForm<CustomerFormValues>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: {
      name: selectedCustomer?.name || '',
      email: selectedCustomer?.email || '',
      cnpj: selectedCustomer?.cnpj || '',
      phone: selectedCustomer?.phone || '',
      address: selectedCustomer?.address || '',
      isActive: selectedCustomer?.isActive ?? true,
      hasActiveContract: selectedCustomer?.hasActiveContract ?? false
    }
  });

  // Reset form when opening dialog
  const openAddDialog = () => {
    form.reset();
    setIsAddDialogOpen(true);
  };

  // Set up form when opening edit dialog
  const openEditDialog = (customer: Company) => {
    setSelectedCustomer(customer);
    editForm.reset({
      name: customer.name,
      email: customer.email,
      cnpj: customer.cnpj || '',
      phone: customer.phone || '',
      address: customer.address || '',
      isActive: customer.isActive ?? true,
      hasActiveContract: customer.hasActiveContract ?? false
    });
    setIsEditDialogOpen(true);
  };

  // Mutation for adding a new customer
  const addCustomerMutation = useMutation({
    mutationFn: async (data: InsertCompany) => {
      const response = await fetch('/api/companies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Erro ao adicionar cliente');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Cliente adicionado",
        description: "O cliente foi adicionado com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/companies'] });
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

  // Mutation for editing a customer
  const editCustomerMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: CustomerFormValues }) => {
      const response = await fetch(`/api/companies/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Erro ao atualizar cliente');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Cliente atualizado",
        description: "O cliente foi atualizado com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/companies'] });
      setIsEditDialogOpen(false);
      setSelectedCustomer(null);
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Mutation for deleting a customer
  const deleteCustomerMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/companies/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Erro ao excluir cliente');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Cliente excluído",
        description: "O cliente foi excluído com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/companies'] });
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
  const onSubmit = (data: CustomerFormValues) => {
    addCustomerMutation.mutate(data);
  };

  // Function to handle edit form submission
  const onEditSubmit = (data: CustomerFormValues) => {
    if (selectedCustomer) {
      editCustomerMutation.mutate({ id: selectedCustomer.id!, data });
    }
  };

  // Function to handle delete
  const handleDelete = (customer: Company) => {
    if (confirm(`Tem certeza que deseja excluir o cliente ${customer.name}?`)) {
      deleteCustomerMutation.mutate(customer.id!);
    }
  };

  // Filter customers based on search query
  const filteredCustomers = customers?.filter(customer => 
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (customer.cnpj && customer.cnpj.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (customer.phone && customer.phone.toLowerCase().includes(searchQuery.toLowerCase()))
  ) || [];

  // Calculate pagination
  const totalPages = Math.ceil((filteredCustomers?.length || 0) / itemsPerPage);
  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (error) {
    return (
      <AppLayout title="Clientes">
        <div className="flex items-center justify-center h-[80vh]">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-gray-900">Erro ao carregar clientes</h2>
            <p className="mt-1 text-sm text-gray-500">
              Ocorreu um erro ao carregar a lista de clientes. Tente novamente mais tarde.
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Clientes">
      <div className="p-6">
        <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
          <div className="relative w-full md:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Buscar clientes..."
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
                  Adicionar Cliente
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Novo Cliente</DialogTitle>
                  <DialogDescription>
                    Preencha os detalhes do cliente abaixo.
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome da Empresa</FormLabel>
                          <FormControl>
                            <Input placeholder="Digite o nome da empresa" {...field} />
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
                      name="cnpj"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CNPJ (opcional)</FormLabel>
                          <FormControl>
                            <Input placeholder="00.000.000/0000-00" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefone (opcional)</FormLabel>
                          <FormControl>
                            <Input placeholder="(00) 0000-0000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Endereço (opcional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Endereço completo" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button 
                        type="submit" 
                        disabled={addCustomerMutation.isPending}
                      >
                        {addCustomerMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Salvar Cliente
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
            <CardTitle>Clientes</CardTitle>
            <CardDescription>
              Gerencie os clientes cadastrados no sistema.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : paginatedCustomers.length === 0 ? (
              <div className="text-center py-8">
                <h3 className="text-lg font-medium">Nenhum cliente encontrado</h3>
                <p className="text-sm text-gray-500 mt-2">
                  {searchQuery 
                    ? "Nenhum cliente corresponde à sua busca. Tente com outros termos."
                    : "Comece adicionando seu primeiro cliente."}
                </p>
              </div>
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Empresa</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>CNPJ</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>Data de Cadastro</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedCustomers.map((customer) => (
                        
                        <TableRow key={customer.id} onClick={() => window.location.href = `/customers/${customer.id}`} className='cursor-pointer'>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarFallback className="bg-primary/10">
                                  {getInitials(customer.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{customer.name}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{customer.email}</TableCell>
                          <TableCell>
                            {customer.cnpj ? (
                              <span>{customer.cnpj}</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {customer.phone ? (
                              <span>{customer.phone}</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {format(new Date(customer.createdAt!), 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => window.location.href = `/customers/${customer.id}`}
                                title="Ver perfil"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => openEditDialog(customer)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                onClick={() => handleDelete(customer)}
                                disabled={deleteCustomerMutation.isPending}
                              >
                                {deleteCustomerMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-4">
                    <TicketsPagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      totalItems={filteredCustomers.length}
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
              <DialogTitle>Editar Cliente</DialogTitle>
              <DialogDescription>
                Atualize os detalhes do cliente abaixo.
              </DialogDescription>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome da Empresa</FormLabel>
                      <FormControl>
                        <Input placeholder="Digite o nome da empresa" {...field} />
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
                  name="cnpj"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CNPJ (opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="00.000.000/0000-00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone (opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="(00) 0000-0000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endereço (opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Endereço completo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button 
                    type="submit"
                    disabled={editCustomerMutation.isPending}
                  >
                    {editCustomerMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Atualizar Cliente
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