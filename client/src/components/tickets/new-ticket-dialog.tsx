import { useEffect, useState, useRef } from 'react';
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
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Building2, AlertCircle, Users, ChevronRight, ChevronDown, Search } from 'lucide-react';
import { useTeams, getTeamName } from '@/hooks/use-teams';
import { useAuth } from '@/hooks/use-auth';
import { useClientRestrictions } from '@/hooks/use-client-restrictions';
import { SimpleRichEditor } from '@/components/tickets/simple-rich-editor';

const formSchema = z.object({
  subject: z.string().min(3),
  description: z.string().min(10),
  status: z.enum(['open', 'in_progress', 'pending', 'resolved', 'closed']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  category: z.string().min(1), // Nome da categoria (mantido para compatibilidade)
  teamId: z.number().or(z.literal(0)).optional().transform(val => val === 0 ? undefined : val), // ID da equipe (opcional)
  serviceId: z.number({ required_error: "Serviço é obrigatório" }), // ID do serviço (obrigatório)
  assigneeId: z.number().or(z.literal(0)).optional().transform(val => val === 0 ? undefined : val),
  requesterEmail: z.string().min(1, 'Campo obrigatório'),
  companyId: z.number().or(z.literal(0)).optional().transform(val => val === 0 ? undefined : val),
  contractId: z.string().optional().transform(val => val === '' ? undefined : val),
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
  
  // Estados para equipe e serviços
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<number | undefined>(undefined);
  const [expandedServices, setExpandedServices] = useState<Set<number>>(new Set());
  const [serviceSearchTerm, setServiceSearchTerm] = useState("");
  const [isServiceDropdownOpen, setIsServiceDropdownOpen] = useState(false);
  
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  // Buscar teams para mostrar informações dos usuários
  const { data: teams = [] } = useTeams();

  // Buscar serviços hierárquicos (independente de equipe)
  const { data: serviceTree = [] } = useQuery<any[]>({
    queryKey: ['/api/services/tree'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/services/tree');
      return res.json();
    },
  });

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
    mode: 'onChange',
    defaultValues: {
      subject: '',
      description: '',
      status: 'open',
      priority: 'medium',
      category: 'Suporte Técnico', // Valor padrão é um dos teams (mantido para compatibilidade)
      teamId: 0,
      requesterEmail: '',
      assigneeId: 0,
      companyId: 0,
      contractId: '',
    },
  });

  const { user } = useAuth();
  const { isClient, isClientUser } = useClientRestrictions();
  const hasFilledRef = useRef(false);

  // Prefill requester/company for client users and validate
  useEffect(() => {
    if (!isClient || !user?.email || companies.length === 0 || hasFilledRef.current) return;

    hasFilledRef.current = true;
    form.setValue('requesterEmail', user.email, { shouldValidate: true });

    if (user.company) {
      // Campo 'company' armazena ID como string, converter para número
      const userCompanyId = parseInt(user.company, 10);
      const userCompany = companies.find((c) => c.id === userCompanyId);

      if (userCompany && form.getValues('companyId') !== userCompany.id) {
        form.setValue('companyId', userCompany.id, { shouldValidate: true });
        setDetectedCompany(userCompany);
      }
    }

    // Ensure validation state is computed after programmatic setValue
    form.trigger();
  }, [isClient, user?.email, user?.company, companies.length]);

  const [contractSearch, setContractSearch] = useState('');

  // Buscar contratos (filtraremos no cliente pelo companyId selecionado)
  const { data: contracts = [] } = useQuery<any[]>({
    queryKey: ['/api/contracts'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/contracts');
      const json = await res.json();
      // Normalizar formatos diferentes de resposta do backend
      if (Array.isArray(json)) return json;
      if (Array.isArray(json?.data)) return json.data;
      if (Array.isArray(json?.contracts)) return json.contracts;
      return [];
    }
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
          form.setValue('companyId', company.id, { shouldValidate: true });
          setShowManualCompanySelect(false);
        } else {
          form.setValue('companyId', undefined, { shouldValidate: true });
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

  const availableCategories = getAvailableCategories();

  // Função para alternar expansão de serviços
  const toggleServiceExpand = (serviceId: number) => {
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
  // Função para filtrar serviços por busca
  const filterServicesBySearch = (services: any[]): any[] => {
    if (!serviceSearchTerm) return services;
    
    const term = serviceSearchTerm.toLowerCase();
    
    const filtered = services.filter(service => {
      const matches = service.name.toLowerCase().includes(term) || 
                     service.description?.toLowerCase().includes(term);
      
      if (service.children && service.children.length > 0) {
        const filteredChildren = filterServicesBySearch(service.children);
        if (matches || filteredChildren.length > 0) {
          return true;
        }
      }
      
      return matches;
    }).map(service => ({
      ...service,
      children: service.children ? filterServicesBySearch(service.children) : []
    }));
    
    return filtered;
  };

  const filteredServices = filterServicesBySearch(serviceTree);
  // Função para construir o caminho completo do serviço
  const buildServicePath = (service: any, tree: any[]): string => {
    const findParent = (id: number, services: any[]): any => {
      for (const s of services) {
        if (s.id === id) return s;
        if (s.children) {
          const found = findParent(id, s.children);
          if (found) return found;
        }
      }
      return null;
    };

    const path: string[] = [service.name];
    let current = service;
    
    while (current.parentId) {
      const parent = findParent(current.parentId, tree);
      if (parent) {
        path.unshift(parent.name);
        current = parent;
      } else {
        break;
      }
    }
    
    return path.join(' > ');
  };

  // Função para renderizar a árvore de serviços
  const renderServiceTree = (service: any, level: number = 0) => {
    const hasChildren = service.children && service.children.length > 0;
    const isExpanded = expandedServices.has(service.id);
    const isSelected = selectedServiceId === service.id;

    return (
      <div key={service.id}>
        <div 
          className={`flex items-center gap-2 p-2 rounded-sm hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors ${
            isSelected ? 'bg-accent text-accent-foreground' : ''
          }`}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedServiceId(service.id);
            form.setValue('serviceId', service.id);
            
            // Se o serviço tem equipe padrão associada, pré-selecionar a equipe
            if (service.teamId) {
              setSelectedTeamId(service.teamId);
              form.setValue('teamId', service.teamId);
            }
            
            setIsServiceDropdownOpen(false);
            setServiceSearchTerm('');
          }}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleServiceExpand(service.id);
              }}
              className="p-0.5 hover:bg-muted rounded"
            >
              {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </button>
          )}
          {!hasChildren && <div className="w-4" />}
          
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{service.name}</div>
            {service.description && (
              <div className="text-xs text-muted-foreground truncate">{service.description}</div>
            )}
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div>
            {service.children.map((child: any) => renderServiceTree(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const createTicketMutation = useMutation({
    mutationFn: async (data: NewTicketFormValues) => {
      console.log('🟡 [mutationFn START]');
      // Find or create requester
      let requesterId;
      
      // Se encontramos um cliente pela busca, usar os dados dele
      if (foundRequester) {
        console.log('🟡 [mutationFn] Usando foundRequester:', foundRequester.id);
        requesterId = foundRequester.id;
      } else {
        // Verificar se é um email válido
        const isEmail = data.requesterEmail.includes('@') && data.requesterEmail.includes('.');
        
        if (isEmail) {
          console.log('🟡 [mutationFn] Procurando requester por email:', data.requesterEmail);
          // Buscar por email
          const existingRequester = requesters.find((r: Requester) => r.email === data.requesterEmail);
          
          if (existingRequester) {
            console.log('🟡 [mutationFn] Requester encontrado:', existingRequester.id);
            requesterId = existingRequester.id;
          } else {
            console.log('🟡 [mutationFn] Criando novo requester...');
            // Create new requester com email
            const [firstName, ...restName] = data.requesterEmail.split('@')[0].split('.');
            const fullName = [
              firstName.charAt(0).toUpperCase() + firstName.slice(1),
              ...restName
            ].join(' ');
            
            const companyName = detectedCompany?.name || '';
            
            console.log('🟡 [mutationFn] POST /api/requesters com:', { fullName, email: data.requesterEmail, company: companyName });
            const newRequester = await apiRequest('POST', '/api/requesters', {
              fullName,
              email: data.requesterEmail,
              company: companyName
            });
            
            const requesterData = await newRequester.json();
            console.log('🟡 [mutationFn] Novo requester criado:', requesterData.id);
            requesterId = requesterData.id;
          }
        } else {
          // Busca por nome não encontrou resultado, erro
          throw new Error('Cliente não encontrado. Digite um email válido ou nome de cliente existente.');
        }
      }
      
      // Remove the requesterEmail as it's not part of the ticket schema
      const { requesterEmail: _, ...ticketData } = data;

      // Build payload and include optional contractId (preserve string IDs)
      const payload: any = { ...ticketData, requesterId };
      // Contracts in the backend use string keys like "CONTRACT_...". Do not convert to number.
      if ((ticketData as any).contractId) payload.contractId = (ticketData as any).contractId;

      console.log('🟡 [mutationFn] POST /api/tickets com payload:', payload);
      // Create ticket
      const res = await apiRequest('POST', '/api/tickets', payload);
      const result = await res.json();
      console.log('🟡 [mutationFn] Ticket criado com sucesso:', result);
      return result;
    },
    onSuccess: () => {
      console.log('🟢 [onSuccess] Ticket criado com sucesso!');
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
      console.log('🔴 [onError] Erro ao criar ticket:', error.message);
      toast({
        title: 'Erro ao criar chamado',
        description: error.message || 'Ocorreu um erro ao registrar o chamado',
        variant: 'destructive',
      });
    }
  });
  
  function onSubmit(data: NewTicketFormValues) {
    console.log('🔴 [onSubmit START] Dados recebidos do form:', data);
    console.log('🔴 [onSubmit] isClient:', isClient, 'detectedCompany:', detectedCompany);
    
    // Validar se o serviço foi selecionado
    if (!data.serviceId) {
      toast({
        title: 'Serviço não selecionado',
        description: 'Por favor, selecione um serviço antes de criar o chamado.',
        variant: 'destructive',
      });
      return;
    }
    
    const enforcedData = { ...data };

    if (isClient) {
      // Cliente sempre é o solicitante e usa a própria empresa
      if (user?.email) enforcedData.requesterEmail = user.email;

      if (detectedCompany?.id) {
        enforcedData.companyId = detectedCompany.id;
      } else if (form.getValues('companyId')) {
        enforcedData.companyId = form.getValues('companyId');
      } else {
        console.log('🔴 [onSubmit] ERRO: Empresa não encontrada');
        toast({
          title: 'Empresa não encontrada',
          description: 'Sua conta precisa estar vinculada a uma empresa para abrir chamado. Contate o suporte.',
          variant: 'destructive',
        });
        return;
      }

      enforcedData.assigneeId = undefined;
      enforcedData.contractId = undefined;
    }

    console.log('🔴 [onSubmit] Dados finais a enviar:', enforcedData);
    console.log('🔴 [onSubmit] Chamando mutate...');
    createTicketMutation.mutate(enforcedData);
    console.log('🔴 [onSubmit] mutate chamado, aguardando resposta...');
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto w-[95vw]">
        <DialogHeader>
          <DialogTitle>Novo Chamado</DialogTitle>
          <DialogDescription>
            Crie um novo chamado de suporte preenchendo as informações abaixo.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {!isClient ? (
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
            ) : (
              <Alert>
                <Users className="h-4 w-4" />
                <AlertDescription>
                  <strong>Solicitante:</strong> {user?.fullName ?? 'Você'} ({user?.email ?? 'sem-email'})
                  <div className="text-xs text-muted-foreground">O solicitante será automaticamente definido como o seu usuário.</div>
                </AlertDescription>
              </Alert>
            )}
            {/* Se houver contratos ativos para a empresa selecionada, permitir escolher um contrato (apenas agentes) */}
            {!isClient && (() => {
              const companyId = form.watch('companyId') || detectedCompany?.id;
              // Mostrar todos os contratos da empresa (inclui inativos) para evitar esconder opções
              // anteriormente filtrávamos apenas status === 'active', o que podia ocultar contratos
              // mesmo quando existiam. Mantemos a informação do status visível no rótulo.
              const filteredContracts = (companyId && companyId !== 0) ? (contracts || []).filter(c => c.companyId === companyId) : [];
              const searchedContracts = contractSearch.trim() === '' ? filteredContracts : filteredContracts.filter(c => {
                const q = contractSearch.toLowerCase();
                return (c.contractNumber || '').toString().toLowerCase().includes(q)
                  || (c.type || '').toLowerCase().includes(q)
                  || (c.description || '').toLowerCase().includes(q);
              });
              if (!filteredContracts || filteredContracts.length === 0) return null;

              return (
                <FormField
                  control={form.control}
                  name="contractId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contrato</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value && field.value !== '' ? field.value.toString() : ''}>
                        <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecionar contrato (opcional)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <div className="p-2">
                              <Input
                                placeholder="Buscar contrato por número, tipo ou descrição..."
                                value={contractSearch}
                                onChange={(e) => setContractSearch(e.target.value)}
                                className="text-sm"
                              />
                            </div>
                            {searchedContracts.map((contract) => (
                              <SelectItem key={contract.id} value={contract.id?.toString?.() ?? String(contract.id)}>
                                {contract.contractNumber} - {contract.type} ({contract.usedHours}h/{contract.includedHours}h)
                                {contract.status && contract.status !== 'active' ? ` — ${contract.status}` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              );
            })()}

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
                          form.setValue('requesterEmail', suggestion.email, { shouldValidate: true });
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
                  {!isClientUser && (
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="ml-2 p-0 h-auto"
                      onClick={() => setShowManualCompanySelect(true)}
                    >
                      Alterar empresa
                    </Button>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {(showManualCompanySelect || (!detectedCompany && watchedSearch?.includes('@'))) && !isClient && (
              <FormField
                control={form.control}
                name="companyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Empresa Solicitante</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(value === "none" ? 0 : parseInt(value))} 
                      defaultValue={field.value && field.value !== 0 ? field.value.toString() : "none"}
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

            {!detectedCompany && watchedSearch?.includes('@') && !showManualCompanySelect && !isClient && (
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
            {!!form.watch('assigneeId') && !!helpdeskUsers.find(u => u.id === form.watch('assigneeId'))?.teamId && (
              <Alert>
                <Users className="h-4 w-4" />
                <AlertDescription>
                  <strong>Categoria automática:</strong> A categoria será automaticamente definida baseada na equipe do usuário atribuído.
                </AlertDescription>
              </Alert>
            )}
            
            {/* Card de Equipe e Serviço */}
            <div className="space-y-4 border rounded-lg p-4">                          
              {/* Seleção de Serviço */}
              {serviceTree.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none">
                    Serviço <span className="text-red-500">*</span>
                  </label>
                  
                  <div className="relative">
                    <button
                      type="button"
                      className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() => setIsServiceDropdownOpen(!isServiceDropdownOpen)}
                    >
                      <span className={selectedServiceId ? '' : 'text-muted-foreground'}>
                        {selectedServiceId ? (() => {
                          const findService = (id: number, services: any[]): any => {
                            for (const s of services) {
                              if (s.id === id) return s;
                              if (s.children) {
                                const found = findService(id, s.children);
                                if (found) return found;
                              }
                            }
                            return null;
                          };
                          const selected = findService(selectedServiceId, serviceTree);
                          return selected ? buildServicePath(selected, serviceTree) : 'Selecione um serviço';
                        })() : 'Selecione um serviço'}
                      </span>
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </button>
                    
                    {isServiceDropdownOpen && (
                      <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md">
                        <div className="p-2 border-b">
                          <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Buscar serviços..."
                              value={serviceSearchTerm}
                              onChange={(e) => setServiceSearchTerm(e.target.value)}
                              className="pl-8 h-9"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        </div>
                        
                        <div className="max-h-[300px] overflow-y-auto p-1">
                          {filteredServices.length === 0 ? (
                            <div className="text-center py-4 text-sm text-muted-foreground">
                              Nenhum serviço encontrado
                            </div>
                          ) : (
                            filteredServices.map((service) => renderServiceTree(service, 0))
                          )}
                        </div>
                        
                        {selectedServiceId && (
                          <div className="border-t p-2">
                            <button
                              type="button"
                              className="text-xs text-muted-foreground hover:text-foreground w-full text-left"
                              onClick={() => {
                                setSelectedServiceId(undefined);
                                form.setValue('serviceId', undefined);
                                setIsServiceDropdownOpen(false);
                              }}
                            >
                              ✕ Limpar seleção
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {!selectedServiceId && form.formState.isSubmitted && (
                    <p className="text-sm text-red-500 mt-1">Serviço é obrigatório</p>
                  )}
                </div>
              )}
              <FormField
                control={form.control}
                name="teamId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Equipe (Opcional)</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        const teamId = parseInt(value);
                        field.onChange(teamId);
                        setSelectedTeamId(teamId);
                        // Atualizar o campo category (legacy) com o nome da equipe
                        const team = teams.find(t => t.id === teamId);
                        if (team) {
                          form.setValue('category', team.name);
                        }
                      }} 
                      value={field.value && field.value !== 0 ? field.value.toString() : undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma equipe" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {teams.map((team) => (
                          <SelectItem key={team.id} value={team.id.toString()}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Campo category (legacy) - oculto mas mantido para compatibilidade */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem className="hidden">
                  <FormControl>
                    <Input {...field} type="hidden" />
                  </FormControl>
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
                    <SimpleRichEditor
                      content={field.value}
                      onChange={field.onChange}
                      placeholder="Descreva os detalhes do chamado..."
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
              
              {!isClient && (
                <FormField
                  control={form.control}
                  name="assigneeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Atribuir para</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(value === "unassigned" ? 0 : parseInt(value))}
                        defaultValue={field.value && field.value !== 0 ? field.value.toString() : "unassigned"}
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
              )}
            </div>
            
            <DialogFooter className="mt-6">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createTicketMutation.isPending}>
                {createTicketMutation.isPending ? "Criando..." : "Criar chamado"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
