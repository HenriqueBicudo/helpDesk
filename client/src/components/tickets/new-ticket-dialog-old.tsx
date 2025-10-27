import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { User, Requester, Company } from '@shared/schema';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Building2, AlertCircle, Users } from 'lucide-react';
import { useTeams, getTeamName } from '@/hooks/use-teams';
import { useAuth } from '@/hooks/use-auth';

const formSchema = z.object({
  subject: z.string().min(3),
  description: z.string().min(10),
  status: z.enum(['open', 'in_progress', 'pending', 'resolved', 'closed']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  category: z.string().min(1), // Agora aceita qualquer string (nomes dos teams)
  assigneeId: z.number().optional(),
  requesterEmail: z.string().min(1, 'Campo obrigatório'),
  companyId: z.number().optional(),
});

type NewTicketFormValues = z.infer<typeof formSchema>;

type NewTicketDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function NewTicketDialog({ open, onOpenChange }: NewTicketDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [detectedCompany, setDetectedCompany] = useState<Company | null>(null);
  const [foundRequester, setFoundRequester] = useState<Requester | null>(null);
  const [searchSuggestions, setSearchSuggestions] = useState<Requester[]>([]);
  const [showManualCompanySelect, setShowManualCompanySelect] = useState(false);
  
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  // Buscar teams para mostrar informações dos usuários
  const { data: teams = [] } = useTeams();

  // Filtrar apenas usuários internos do helpdesk para atribuição
  const helpdeskUsers = users.filter((user: User) => 
    user.role === 'admin' || 
    user.role === 'helpdesk_manager' || 
    user.role === 'helpdesk_agent'
  );
  
  const { data: requesters = [] } = useQuery<Requester[]>({
    queryKey: ['/api/requesters'],
  });

  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ['/api/access/companies'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/access/companies');
      return response.json();
    }
  });

  const form = useForm<NewTicketFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      subject: '',
      description: '',
      status: 'open',
      priority: 'medium',
      category: 'Suporte Técnico', // Valor padrão é um dos teams
      requesterEmail: '',
      assigneeId: undefined,
      companyId: undefined,
    },
  });

  // Função para detectar empresa pelo domínio do email ou encontrar cliente por nome
  const detectCompanyFromEmailOrName = async (searchTerm: string): Promise<{ company: Company | null, requester: Requester | null }> => {
    try {
      // Primeiro, tentar encontrar por email exato
      if (searchTerm.includes('@')) {
        const requester = requesters.find(r => r.email.toLowerCase() === searchTerm.toLowerCase());
        if (requester) {
          // Encontrou por email, tentar encontrar empresa
          const company = companies.find(c => 
            c.name.toLowerCase() === requester.company?.toLowerCase()
          );
          return { company: company || null, requester };
        }

        // Não encontrou por email, tentar detectar empresa pelo domínio
        const domain = searchTerm.split('@')[1];
        if (domain) {
          const company = companies.find(company => {
            if (!company.email) return false;
            const companyDomain = company.email.split('@')[1];
            return companyDomain === domain;
          });
          return { company: company || null, requester: null };
        }
      }
      
      // Tentar encontrar por nome (busca parcial case-insensitive)
      const requester = requesters.find(r => 
        r.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      if (requester) {
        const company = companies.find(c => 
          c.name.toLowerCase() === requester.company?.toLowerCase()
        );
        return { company: company || null, requester };
      }

      return { company: null, requester: null };
    } catch {
      return { company: null, requester: null };
    }
  };

  // Estado para o cliente encontrado
  // Estados já declarados acima

  // Efeito para detectar empresa e cliente quando o termo de busca muda
  const watchedSearch = form.watch('requesterEmail');
  useEffect(() => {
    const searchRequesterAndCompany = async () => {
      if (watchedSearch && watchedSearch.length >= 2) {
        const { company, requester } = await detectCompanyFromEmailOrName(watchedSearch);
        setDetectedCompany(company);
        setFoundRequester(requester);
        
        // Buscar sugestões se não encontrou resultado exato
        if (!requester && !watchedSearch.includes('@')) {
          const suggestions = requesters.filter(r => 
            r.fullName.toLowerCase().includes(watchedSearch.toLowerCase()) ||
            r.email.toLowerCase().includes(watchedSearch.toLowerCase())
          ).slice(0, 5); // Limitar a 5 sugestões
          setSearchSuggestions(suggestions);
        } else {
          setSearchSuggestions([]);
        }
        
        if (company) {
          form.setValue('companyId', company.id);
          setShowManualCompanySelect(false);
        } else {
          form.setValue('companyId', undefined);
          setShowManualCompanySelect(watchedSearch.includes('@'));
        }
      } else {
        setDetectedCompany(null);
        setFoundRequester(null);
        setSearchSuggestions([]);
        setShowManualCompanySelect(false);
      }
    };

    const timeoutId = setTimeout(searchRequesterAndCompany, 300);
    return () => clearTimeout(timeoutId);
  }, [watchedSearch, companies, requesters, form]);

  // Buscar categorias baseadas nos teams existentes
  const getAvailableCategories = () => {
    // Se há teams carregados, usar os nomes deles como categorias
    if (teams && teams.length > 0) {
      return teams.map(team => ({
        value: team.name,
        label: team.name
      }));
    }
    
    // Fallback para categorias padrão se não houver teams
    return [
      { value: 'Suporte Técnico', label: 'Suporte Técnico' },
      { value: 'Atendimento Geral', label: 'Atendimento Geral' },
      { value: 'Suporte Comercial', label: 'Suporte Comercial' }
    ];
  };

  const availableCategories = getAvailableCategories();  const createTicketMutation = useMutation({
    mutationFn: async (data: NewTicketFormValues) => {
      // Find or create requester
      let requesterId;
      
      // Se encontramos um cliente pela busca, usar os dados dele
      if (foundRequester) {
        requesterId = foundRequester.id;
      } else {
        // Verificar se é um email válido
        const isEmail = data.requesterEmail.includes('@') && data.requesterEmail.includes('.');
        
        if (isEmail) {
          // Buscar por email
          const existingRequester = requesters.find((r: Requester) => r.email === data.requesterEmail);
          
          if (existingRequester) {
            requesterId = existingRequester.id;
          } else {
            // Create new requester com email
            const [firstName, ...restName] = data.requesterEmail.split('@')[0].split('.');
            const fullName = [
              firstName.charAt(0).toUpperCase() + firstName.slice(1),
              ...restName
            ].join(' ');
            
            const companyName = detectedCompany?.name || '';
            
            const newRequester = await apiRequest('POST', '/api/requesters', {
              fullName,
              email: data.requesterEmail,
              company: companyName
            });
            
            const requesterData = await newRequester.json();
            requesterId = requesterData.id;
          }
        } else {
          // Busca por nome não encontrou resultado, erro
          throw new Error('Cliente não encontrado. Digite um email válido ou nome de cliente existente.');
        }
      }
      
      // Remove the requesterEmail as it's not part of the ticket schema
      const { requesterEmail: _, ...ticketData } = data;
      
      // Create ticket
      const res = await apiRequest('POST', '/api/tickets', {
        ...ticketData,
        requesterId
      });
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tickets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/statistics'] });
      toast({
        title: 'Chamado criado com sucesso',
        description: 'O chamado foi registrado no sistema',
      });
      onOpenChange(false);
      form.reset();
      setFoundRequester(null);
      setDetectedCompany(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao criar chamado',
        description: error.message || 'Ocorreu um erro ao registrar o chamado',
        variant: 'destructive',
      });
    }
  });
  
  function onSubmit(data: NewTicketFormValues) {
    createTicketMutation.mutate(data);
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo Chamado</DialogTitle>
          <DialogDescription>
            Crie um novo chamado de suporte preenchendo as informações abaixo.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="requesterEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente (Email ou Nome)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Digite email ou nome do cliente..." 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Sugestões de clientes */}
            {searchSuggestions.length > 0 && !foundRequester && (
              <Alert>
                <Users className="h-4 w-4" />
                <AlertDescription>
                  <strong>Clientes encontrados:</strong>
                  <div className="mt-2 space-y-1">
                    {searchSuggestions.map((suggestion) => (
                      <button
                        key={suggestion.id}
                        type="button"
                        className="block text-left p-2 hover:bg-muted rounded text-sm w-full"
                        onClick={() => {
                          form.setValue('requesterEmail', suggestion.email);
                          setSearchSuggestions([]);
                        }}
                      >
                        <div className="font-medium">{suggestion.fullName}</div>
                        <div className="text-muted-foreground">{suggestion.email}</div>
                        {suggestion.company && (
                          <div className="text-xs text-muted-foreground">{suggestion.company}</div>
                        )}
                      </button>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Cliente encontrado */}
            {foundRequester && (
              <Alert>
                <Users className="h-4 w-4" />
                <AlertDescription>
                  <strong>Cliente encontrado:</strong> {foundRequester.fullName} ({foundRequester.email})
                  {foundRequester.company && (
                    <span className="block text-sm text-muted-foreground">
                      Empresa: {foundRequester.company}
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Empresa detectada ou seletor manual */}
            {detectedCompany && (
              <Alert>
                <Building2 className="h-4 w-4" />
                <AlertDescription>
                  <strong>Empresa detectada:</strong> {detectedCompany.name}
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="ml-2 p-0 h-auto"
                    onClick={() => setShowManualCompanySelect(true)}
                  >
                    Alterar empresa
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {(showManualCompanySelect || (!detectedCompany && watchedSearch?.includes('@'))) && (
              <FormField
                control={form.control}
                name="companyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Empresa Solicitante</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(value === "none" ? undefined : parseInt(value))} 
                      defaultValue={field.value?.toString() || "none"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma empresa" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Nenhuma empresa</SelectItem>
                        {companies.filter(company => company.isActive).map((company) => (
                          <SelectItem key={company.id} value={company.id!.toString()}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {!detectedCompany && watchedSearch?.includes('@') && !showManualCompanySelect && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Nenhuma empresa encontrada para o domínio deste email. 
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="ml-1 p-0 h-auto"
                    onClick={() => setShowManualCompanySelect(true)}
                  >
                    Selecionar empresa manualmente
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            
            {/* Alerta sobre categoria automática */}
            {form.watch('assigneeId') && helpdeskUsers.find(u => u.id === form.watch('assigneeId'))?.teamId && (
              <Alert>
                <Users className="h-4 w-4" />
                <AlertDescription>
                  <strong>Categoria automática:</strong> A categoria será automaticamente definida baseada na equipe do usuário atribuído.
                </AlertDescription>
              </Alert>
            )}
            
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableCategories.map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assunto</FormLabel>
                  <FormControl>
                    <Input placeholder="Assunto do chamado" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Detalhes do chamado" 
                      className="min-h-[100px]" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioridade</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a prioridade" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Baixa</SelectItem>
                        <SelectItem value="medium">Média</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                        <SelectItem value="critical">Crítica</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="assigneeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Atribuir para</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(value === "unassigned" ? undefined : parseInt(value))} 
                      defaultValue={field.value?.toString() || "unassigned"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Não atribuído" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="unassigned">Não atribuído</SelectItem>
                        {helpdeskUsers.map((user: User) => {
                          const teamName = getTeamName(teams, user.teamId);
                          const roleDisplay = user.role === 'admin' ? 'Administrador' : 
                                            user.role === 'helpdesk_manager' ? 'Gerente' : 'Agente';
                          
                          return user.id ? (
                            <SelectItem key={user.id} value={user.id.toString()}>
                              <div className="flex flex-col">
                                <span>{user.fullName} ({roleDisplay})</span>
                                {teamName && (
                                  <span className="text-xs text-muted-foreground">
                                    {teamName} → Categoria: {teamName}
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          ) : null;
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <DialogFooter className="mt-6">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button 
                type="submit"
                disabled={createTicketMutation.isPending}
              >
                {createTicketMutation.isPending ? "Criando..." : "Criar chamado"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
