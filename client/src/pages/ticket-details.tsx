import { useState, useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/app-layout';
import { TicketStatusBadge } from '@/components/tickets/ticket-status-badge';
import { TicketPriorityBadge } from '@/components/tickets/ticket-priority-badge';
import { RichTextEditor } from '@/components/tickets/rich-text-editor';
import { ClientRichTextEditor } from '@/components/tickets/client-rich-text-editor';
import { TicketTimeline } from '@/components/tickets/ticket-timeline';
import { ClientTicketTimeline } from '@/components/tickets/client-ticket-timeline';
import { TicketTags } from '@/components/tickets/ticket-tags';
import { TicketLinks } from '@/components/tickets/ticket-links';
import { TicketActions } from '@/components/tickets/ticket-actions';
import { SlaIndicators } from '@/components/tickets/sla-indicators';
import { TicketParticipants } from '@/components/tickets/ticket-participants';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useClientRestrictions } from '@/hooks/use-client-restrictions';
import { useTeams } from '@/hooks/use-teams';
import { apiRequest } from '@/lib/queryClient';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  AlertTriangle,
  Clock,
  Calendar,
  Tag,
  Video,
  ChevronDown,
  ChevronRight,
  Search,
} from 'lucide-react';
import { translateCategory, formatDate, getInitials } from '@/lib/utils';
import type { TicketWithRelations, User as UserType } from '@shared/schema';

interface Interaction {
  id: number;
  type: string;
  content: string;
  isInternal: boolean;
  timeSpent?: number;
  createdAt: Date;
  user?: UserType;
}

interface Tag {
  id: number;
  name: string;
  color: string;
}

interface TicketLink {
  id: number;
  sourceTicketId: number;
  targetTicketId: number;
  linkType: string;
  description?: string;
  targetTicket: {
    id: number;
    subject: string;
    status: string;
    priority: string;
  };
}

interface ExtendedTicket extends TicketWithRelations {
  id: number;
  createdAt: Date;
  tags?: Tag[];
  linkedTickets?: TicketLink[];
}

interface InteractionData {
  content: string;
  isInternal: boolean;
  timeSpent?: number;
  attachments: File[];
  contractId?: string;
  status?: string;
}

export default function TicketDetails() {
  const [, params] = useRoute('/tickets/:id');
  const ticketId = params?.id ? parseInt(params.id) : 0;
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const clientRestrictions = useClientRestrictions();

  const [showInternalNotes, setShowInternalNotes] = useState(true);
  const [isCreatingMeet, setIsCreatingMeet] = useState(false);
  const [showMeetDialog, setShowMeetDialog] = useState(false);
  const [meetDate, setMeetDate] = useState('');
  const [meetTime, setMeetTime] = useState('');
  const [meetDuration, setMeetDuration] = useState('60');
  
  // States para serviços hierárquicos
  const [expandedServices, setExpandedServices] = useState<Set<number>>(new Set());
  const [selectedServiceId, setSelectedServiceId] = useState<number | undefined>(undefined);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [serviceSearchTerm, setServiceSearchTerm] = useState("");
  const [isServiceDropdownOpen, setIsServiceDropdownOpen] = useState(false);

  // Fetch ticket details
  const { data: ticket, isLoading, error } = useQuery<ExtendedTicket>({
    queryKey: [`/api/tickets/${ticketId}`],
    enabled: ticketId > 0,
  });

  // Fetch ticket interactions
  const { data: interactions = [] } = useQuery<Interaction[]>({
    queryKey: [`/api/tickets/${ticketId}/interactions`],
    enabled: ticketId > 0,
  });

  // Fetch linked tickets for this ticket
  const { data: linkedTickets = [] } = useQuery<TicketLink[]>({
    queryKey: [`/api/tickets/${ticketId}/links`],
    queryFn: async () => {
      if (!ticketId) return [];
      const res = await fetch(`/api/tickets/${ticketId}/links`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: ticketId > 0,
  });

  // map server shape -> component expected shape (linkedTicket)
  const mappedLinkedTickets = (linkedTickets || []).map((ln) => ({
    id: ln.id,
    ticketId: ln.sourceTicketId,
    linkedTicketId: ln.targetTicketId,
    linkType: ln.linkType,
    description: ln.description,
    linkedTicket: ln.targetTicket ? {
      id: ln.targetTicket.id,
      subject: ln.targetTicket.subject,
      status: ln.targetTicket.status,
      priority: ln.targetTicket.priority,
    } : { id: ln.targetTicketId, subject: '', status: 'open', priority: 'low' }
  }));

  // Fetch response templates
  const { data: templates = [] } = useQuery({
    queryKey: ['/api/response-templates'],
  });

  // Fetch users (for assignee dropdown)
  const { data: users = [] } = useQuery<UserType[]>({
    queryKey: ['/api/users'],
  });

  // Fetch teams (for team dropdown)
  const { data: teams = [] } = useTeams();
  
  // Buscar serviços hierárquicos (independente de equipe)
  const { data: serviceTree = [] } = useQuery<any[]>({
    queryKey: ['/api/services/tree'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/services/tree');
      return res.json();
    },
  });

  // Fetch available contracts for this ticket
  const { data: allContracts = [] } = useQuery<any[]>({
    queryKey: ['/api/contracts'],
    queryFn: async () => {
      const res = await fetch('/api/contracts');
      if (!res.ok) return [];
      const json = await res.json();
      // Normalizar diferentes formatos de resposta
      if (Array.isArray(json)) return json;
      if (Array.isArray(json?.data)) return json.data;
      if (Array.isArray(json?.contracts)) return json.contracts;
      return [];
    },
    enabled: ticketId > 0,
  });

  // Filtrar contratos no frontend pela companyId do ticket (permitindo inativos)
  const availableContracts = (allContracts || []).filter((c: any) => {
    if (!ticket || !ticket.companyId) return false;
    return c.companyId === ticket.companyId;
  });

  // Filtrar apenas usuários internos do helpdesk para atribuição
  const helpdeskUsers = users.filter((user: UserType) =>
    user.role === 'admin' ||
    user.role === 'helpdesk_manager' ||
    user.role === 'helpdesk_agent'
  );

  const [contractSearch, setContractSearch] = useState('');

  const CLOSED_STATUSES = ['resolved', 'closed'];
  const isClosed = ticket?.status ? CLOSED_STATUSES.includes(ticket.status) : false;

  // Inicializar selectedServiceId e selectedTeamId quando o ticket for carregado
  useEffect(() => {
    if (ticket) {
      if (ticket.serviceId && ticket.serviceId !== selectedServiceId) {
        setSelectedServiceId(ticket.serviceId);
      }
      if (ticket.teamId && ticket.teamId !== selectedTeamId) {
        setSelectedTeamId(ticket.teamId);
      }
    }
  }, [ticket?.serviceId, ticket?.teamId]);

  // Mutation to create ticket interaction
  const createInteractionMutation = useMutation({
    mutationFn: async (data: InteractionData) => {
      // 1) Detectar imagens em data URLs dentro do HTML e enviá-las primeiro para /api/uploads
      let content = data.content;

      const dataUrlRegex = /<img[^>]+src\s*=\s*"(data:[^"]+)"[^>]*>/g;
      const dataUrls: string[] = [];
      let match: RegExpExecArray | null;
      while ((match = dataUrlRegex.exec(content)) !== null) {
        dataUrls.push(match[1]);
      }

      if (dataUrls.length > 0) {
        // Converter cada dataURL para File
        const filesToUpload: File[] = dataUrls.map((d, i) => {
          const arr = d.split(',');
          const mimeMatch = arr[0].match(/data:([^;]+);/);
          const mime = mimeMatch ? mimeMatch[1] : 'image/png';
          const bstr = atob(arr[1]);
          let n = bstr.length;
          const u8arr = new Uint8Array(n);
          while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
          }
          const ext = mime.split('/')[1] || 'png';
          const filename = `inline-${Date.now()}-${i}.${ext}`;
          return new File([u8arr], filename, { type: mime });
        });

        // Enviar para /api/uploads
        const fd = new FormData();
        filesToUpload.forEach(f => fd.append('files', f));
        const upRes = await fetch('/api/uploads', { method: 'POST', body: fd });
        if (!upRes.ok) throw new Error('Erro ao enviar imagens embutidas');
        const uploaded = await upRes.json(); // array na mesma ordem

        // Substituir cada data URL no conteúdo pelo URL retornado
        for (let i = 0; i < dataUrls.length; i++) {
          const original = dataUrls[i];
          const replacement = uploaded[i]?.url || uploaded[i]?.fileName || '';
          content = content.split(original).join(replacement);
        }
      }

      // 2) Agora criar FormData incluindo conteúdo atualizado e anexos (files normais)
      const formData = new FormData();
      formData.append('type', data.isInternal ? 'internal_note' : 'comment');
      formData.append('content', content);
      formData.append('isInternal', data.isInternal.toString());
      if (data.timeSpent) {
        formData.append('timeSpent', data.timeSpent.toString());
      }
      if (data.contractId) {
        formData.append('contractId', data.contractId);
      }
      if ((data as any).status) {
        formData.append('status', (data as any).status);
      }

      // Adicionar anexos enviados pelo usuário (não incluir as imagens que já foram enviadas)
      data.attachments.forEach((file: File) => {
        formData.append(`attachments`, file);
      });

      const res = await fetch(`/api/tickets/${ticketId}/interactions`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error('Erro ao criar interação');
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tickets/${ticketId}/interactions`] });
      queryClient.invalidateQueries({ queryKey: [`/api/tickets/${ticketId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/tickets'] }); // ✅ Lista de tickets
      toast({
        title: "Sucesso",
        description: "Interação adicionada com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao adicionar interação",
        variant: "destructive",
      });
    },
  });

  // Mutation to update ticket contract
  const updateContractMutation = useMutation({
    mutationFn: async (contractId: string | null) => {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contractId }),
      });

      if (!res.ok) {
        throw new Error('Erro ao atualizar contrato');
      }

      return res.json();
    },
    onSuccess: (_data, contractId) => {
      queryClient.invalidateQueries({ queryKey: [`/api/tickets/${ticketId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/tickets'] }); // ✅ Lista de tickets
      toast({
        title: "Sucesso",
        description: contractId ? "Contrato vinculado com sucesso" : "Contrato removido com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar contrato",
        variant: "destructive",
      });
    },
  });

  // Mutation to change ticket status (reopen)
  const reopenMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error('Erro ao alterar status do ticket');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tickets/${ticketId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/tickets/${ticketId}/interactions`] });
      queryClient.invalidateQueries({ queryKey: ['/api/tickets'] }); // ✅ Lista de tickets
      toast({ title: 'Chamado reaberto', description: 'O chamado foi reaberto com sucesso.' });
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Não foi possível reabrir o chamado.', variant: 'destructive' });
    }
  });

  // Função para abrir o dialog de agendamento do Google Meet
  const handleOpenMeetDialog = () => {
    if (!ticket) return;
    
    // Definir data e hora padrão (hoje + 1 hora)
    const now = new Date();
    now.setHours(now.getHours() + 1);
    now.setMinutes(0);
    
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().slice(0, 5);
    
    setMeetDate(dateStr);
    setMeetTime(timeStr);
    setShowMeetDialog(true);
  };

  // Função para criar Google Meet agendado
  const handleCreateGoogleMeet = async () => {
    if (!ticket || !meetDate || !meetTime) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha data e horário",
        variant: "destructive",
      });
      return;
    }
    
    setIsCreatingMeet(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/create-meet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          date: meetDate,
          time: meetTime,
          duration: parseInt(meetDuration),
          summary: `Reunião - Ticket #${ticket.id} - ${ticket.subject}`,
        }),
      });

      if (!res.ok) {
        throw new Error('Erro ao criar Google Meet');
      }

      const data = await res.json();
      
      setShowMeetDialog(false);
      
      toast({
        title: "Google Meet criado!",
        description: `Reunião agendada para ${new Date(meetDate + 'T' + meetTime).toLocaleString('pt-BR')}. Convites enviados para todos os participantes.`,
      });

      // Adicionar interação ao ticket informando sobre a reunião
      await fetch(`/api/tickets/${ticketId}/interactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          type: 'note',
          content: `<p>📅 <strong>Reunião agendada via Google Meet</strong></p><p>Data/Hora: ${new Date(meetDate + 'T' + meetTime).toLocaleString('pt-BR')}</p><p>Duração: ${meetDuration} minutos</p><p>Link: <a href="${data.meetLink}" target="_blank">${data.meetLink}</a></p>`,
          isInternal: false,
        }),
      });
      
      // Atualizar timeline
      queryClient.invalidateQueries({ queryKey: [`/api/tickets/${ticketId}/interactions`] });
      
    } catch (error) {
      console.error('Erro ao criar meet:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar o Google Meet. Verifique as configurações da API do Google.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingMeet(false);
    }
  };

  // Mutation to assign ticket to user
  const assignTicketMutation = useMutation({
    mutationFn: async (data: { assigneeId: number | null }) => {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Erro ao atribuir ticket');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tickets/${ticketId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/tickets'] });
      toast({ 
        title: 'Sucesso', 
        description: 'Ticket atribuído com sucesso.' 
      });
    },
    onError: () => {
      toast({ 
        title: 'Erro', 
        description: 'Não foi possível atribuir o ticket.', 
        variant: 'destructive' 
      });
    }
  });

  // Mutation to update ticket category/team
  const updateCategoryMutation = useMutation({
    mutationFn: async (data: { category?: string; teamId?: number }) => {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Erro ao atualizar categoria do ticket');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tickets/${ticketId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/tickets'] });
      toast({ 
        title: 'Sucesso', 
        description: 'Equipe responsável atualizada com sucesso.' 
      });
    },
    onError: () => {
      toast({ 
        title: 'Erro', 
        description: 'Não foi possível atualizar a equipe responsável.', 
        variant: 'destructive' 
      });
    }
  });

  // Mutation to update ticket service
  const updateServiceMutation = useMutation({
    mutationFn: async (data: { serviceId?: number }) => {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Erro ao atualizar serviço do ticket');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tickets/${ticketId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/tickets'] });
      toast({ 
        title: 'Sucesso', 
        description: 'Serviço atualizado com sucesso.' 
      });
    },
    onError: () => {
      toast({ 
        title: 'Erro', 
        description: 'Não foi possível atualizar o serviço.', 
        variant: 'destructive' 
      });
    }
  });

  // Função para expandir/recolher serviços
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
            updateServiceMutation.mutate({ serviceId: service.id });
            
            // Se o serviço tem equipe padrão associada, pré-selecionar a equipe
            if (service.teamId) {
              setSelectedTeamId(service.teamId);
              updateTeamMutation.mutate({ teamId: service.teamId });
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

  const handleCreateInteraction = (data: InteractionData) => {
    // Se o ticket tem um contrato vinculado e não foi especificado contractId,
    // usar o contrato do ticket automaticamente
    const interactionData = {
      ...data,
      contractId: data.contractId || ticket?.contract?.id || undefined
    };
    createInteractionMutation.mutate(interactionData);
  };

  if (isLoading) {
    return (
      <AppLayout title="Carregando...">
        <div className="flex justify-center items-center min-h-screen">
          <div className="text-center">
            <div className="spinner-border" role="status">
              <span className="sr-only">Carregando...</span>
            </div>
            <p className="mt-2">Carregando detalhes do ticket...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !ticket) {
    return (
      <AppLayout title="Erro">
        <div className="container mx-auto py-6">
          <Card className="text-center">
            <CardContent className="p-6">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Ticket não encontrado</h2>
              <p className="text-muted-foreground mb-4">
                O ticket solicitado não existe ou você não tem permissão para visualizá-lo.
              </p>
              <Button onClick={() => setLocation('/tickets')}>
                Voltar para Tickets
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  // Calcular horas do cliente baseado no contrato específico do ticket
  const customerHours = ticket.contract ? {
    monthly: ticket.contract.includedHours,
    used: parseFloat(ticket.contract.usedHours || '0'),
    remaining: ticket.contract.includedHours - parseFloat(ticket.contract.usedHours || '0')
  } : undefined;

  return (
    <AppLayout title={`Ticket #${ticket.id?.toString().padStart(6, '0')} - ${ticket.subject}`} fullWidth={true}>
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-lg border-2 border-blue-200 dark:border-blue-800 shadow-md">
          <div className="flex items-center gap-3 px-4 py-2.5">
            <Button variant="ghost" size="sm" onClick={() => setLocation('/tickets')} className="h-8">
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
              Voltar
            </Button>
            
            {/* Botão Google Meet - DESABILITADO
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleOpenMeetDialog}
              disabled={isCreatingMeet}
              className="h-8"
            >
              <Video className="h-3.5 w-3.5 mr-1.5" />
              {isCreatingMeet ? 'Criando...' : 'Google Meet'}
            </Button>
            */}
            
            <div className="flex-1">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-xs text-muted-foreground">
                  #{ticket.id?.toString().padStart(6, '0')}
                </span>
                <TicketStatusBadge status={ticket.status} />
                <TicketPriorityBadge priority={ticket.priority} />
              </div>
              <h1 className="text-xl font-bold mb-1.5">{ticket.subject}</h1>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {getInitials(ticket.requester?.fullName || 'Unknown')}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{ticket.requester?.fullName}</span>
                  {ticket.requester?.email && (
                    <span className="text-muted-foreground">({ticket.requester.email})</span>
                  )}
                </div>
                {ticket.requester?.company && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span className="font-medium">{ticket.requester.company}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Contrato e Barra de Horas - Apenas para helpdesk */}
          {!clientRestrictions.isClient && (
            <div className="px-4 pb-2.5 border-t pt-2.5">
              <div className="flex items-center gap-4">
                {/* Seleção de Contrato */}
                <div className="flex items-center gap-2">
                  <label className="text-sm font-semibold flex items-center gap-1.5">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Contrato
                  </label>
                  <Select
                    value={ticket.contract?.id || 'none'}
                    onValueChange={(value) => updateContractMutation.mutate(value === 'none' ? null : value)}
                    disabled={updateContractMutation.isPending}
                  >
                    <SelectTrigger className="h-7 text-xs w-[240px]">
                      <SelectValue placeholder="Selecionar..." />
                    </SelectTrigger>
                    <SelectContent className="max-w-[300px]">
                      <SelectItem value="none">
                        <span className="text-muted-foreground">Nenhum contrato</span>
                      </SelectItem>
                      {availableContracts.map((contract: any) => (
                        <SelectItem key={contract.id} value={contract.id}>
                          <div className="flex items-center justify-between gap-2 w-full">
                            <span className="font-medium">{contract.contractNumber}</span>
                            <span className="text-xs text-muted-foreground capitalize">
                              {contract.type === 'support' ? 'Suporte' :
                                contract.type === 'maintenance' ? 'Manutenção' :
                                  contract.type === 'development' ? 'Desenvolvimento' :
                                    contract.type}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Barra de Horas */}
                {ticket.contract && (
                  <div className="flex-1 space-y-0.5">
                    <Progress 
                      value={((parseFloat(ticket.contract.usedHours || '0') / ticket.contract.includedHours) * 100)} 
                      className="h-1.5"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>Usado: {ticket.contract.usedHours || '0'}h / {ticket.contract.includedHours}h</span>
                      <span className="font-semibold text-primary">
                        {(ticket.contract.includedHours - parseFloat(ticket.contract.usedHours || '0')).toFixed(2)}h restantes
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-4 items-start">
          {/* Sidebar Esquerda - Informações do Ticket */}
          <div className="w-[380px] flex-shrink-0 space-y-4 pr-4 border-r-2 border-border bg-gradient-to-b from-gray-100/80 to-gray-50/80 dark:from-gray-900/40 dark:to-gray-900/20 rounded-l-lg p-4">
            {/* Informações Adicionais */}
            <Card className="shadow-md hover:shadow-lg transition-all border-2 border-l-4 border-l-indigo-500 dark:border-l-indigo-400 bg-white dark:bg-gray-800">
              <CardHeader className="py-3">
                <CardTitle className="text-base font-semibold">Detalhes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 pb-4">
                <div className="flex items-center gap-2.5 text-sm">
                  <Tag className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground">Prioridade:</span>
                  <TicketPriorityBadge priority={ticket.priority} />
                </div>

                <div className="flex items-center gap-2.5 text-sm">
                  <Tag className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground">Categoria:</span>
                  <span className="font-medium">{translateCategory(ticket.category)}</span>
                </div>

                <div className="flex items-center gap-2.5 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground">Criado em:</span>
                  <span className="font-medium">{ticket?.createdAt ? formatDate(ticket.createdAt) : 'N/A'}</span>
                </div>

                {ticket.updatedAt && ticket.updatedAt !== ticket.createdAt && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground">Atualizado em:</span>
                    <span className="font-medium">{formatDate(ticket.updatedAt)}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Indicadores de SLA - Apenas para helpdesk */}
            {!clientRestrictions.isClient && (
              <SlaIndicators
                ticket={{
                  id: ticket.id!,
                  status: ticket.status,
                  priority: ticket.priority,
                  createdAt: ticket.createdAt,
                  responseDueAt: ticket.responseDueAt || undefined,
                  solutionDueAt: ticket.solutionDueAt || undefined,
                  updatedAt: ticket.updatedAt
                }}
                hasFirstResponse={interactions.some(i => !i.isInternal && i.type === 'comment')}
              />
            )}

            {/* Atribuído a - Apenas para helpdesk */}
            {!clientRestrictions.isClient && (
              <Card className="shadow-md hover:shadow-lg transition-all border-2 border-l-4 border-l-blue-500 dark:border-l-blue-400 bg-white dark:bg-gray-800">
                <CardHeader className="py-3">
                  <CardTitle className="text-base font-semibold">Atribuído a</CardTitle>
                </CardHeader>
                <CardContent className="pb-4">
                  <Select
                    value={ticket.assigneeId?.toString() || 'unassigned'}
                    onValueChange={(value) => {
                      assignTicketMutation.mutate({
                        assigneeId: value === 'unassigned' ? null : parseInt(value)
                      });
                    }}
                    disabled={isClosed}
                  >
                    <SelectTrigger className="h-10 text-sm">
                      <SelectValue placeholder="Não atribuído" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">
                        <span className="text-muted-foreground">Não atribuído</span>
                      </SelectItem>
                      {helpdeskUsers.map((user: any) => (
                        <SelectItem key={user.id} value={user.id!.toString()}>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                              <AvatarFallback className="text-xs">
                                {getInitials(user.fullName)}
                              </AvatarFallback>
                            </Avatar>
                            <span>{user.fullName}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            )}

            {/* Equipe Responsável - Apenas para helpdesk */}
            {!clientRestrictions.isClient && (
              <Card className="shadow-md hover:shadow-lg transition-all border-2 border-l-4 border-l-emerald-500 dark:border-l-emerald-400 bg-white dark:bg-gray-800">
                <CardHeader className="py-3">
                  <CardTitle className="text-base font-semibold">Equipe Responsável</CardTitle>
                </CardHeader>
                <CardContent className="pb-4 space-y-3">
                  {/* Primeiro dropdown: Seleciona a equipe */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Equipe</label>
                    <Select
                      value={ticket.teamId?.toString() || ''}
                      onValueChange={(value) => {
                        const teamId = parseInt(value);
                        setSelectedTeamId(teamId);
                        // Limpar seleção de serviço ao trocar equipe
                        setExpandedServices(new Set());
                        setSelectedServiceId(undefined);
                        // Atualizar a equipe
                        const team = teams.find((t: any) => t.id === teamId);
                        if (team) {
                          updateCategoryMutation.mutate({ 
                            category: team.name.toLowerCase().replace(/ /g, '_'),
                            teamId: teamId 
                          });
                        }
                      }}
                      disabled={isClosed}
                    >
                      <SelectTrigger className="h-10 text-sm">
                        <SelectValue placeholder="Selecione uma equipe" />
                      </SelectTrigger>
                      <SelectContent>
                        {teams.map((team: any) => (
                          <SelectItem key={team.id} value={team.id.toString()}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Seleção de Serviço */}
                  {serviceTree.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Serviço (Opcional)
                      </label>
                      
                      <div className="relative">
                        <button
                          type="button"
                          className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          onClick={() => setIsServiceDropdownOpen(!isServiceDropdownOpen)}
                          disabled={isClosed}
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
                                filteredServices.map((service: any) => renderServiceTree(service, 0))
                              )}
                            </div>
                            
                            {selectedServiceId && (
                              <div className="border-t p-2">
                                <button
                                  type="button"
                                  className="text-xs text-muted-foreground hover:text-foreground w-full text-left"
                                  onClick={() => {
                                    setSelectedServiceId(undefined);
                                    updateServiceMutation.mutate({ serviceId: undefined });
                                    setIsServiceDropdownOpen(false);
                                  }}
                                  disabled={isClosed}
                                >
                                  ✕ Limpar seleção
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Solicitantes e Pessoas em Cópia - Apenas para helpdesk */}
            {!clientRestrictions.isClient && (
              <TicketParticipants ticketId={ticket.id!} />
            )}

            {/* Tags do Ticket - Apenas para helpdesk */}
            {!clientRestrictions.isClient && (
              <TicketTags
                ticketId={ticket.id!}
                tags={ticket.tags || []}
              />
            )}

            {/* Tickets Vinculados - Apenas para helpdesk */}
            {!clientRestrictions.isClient && (
              <TicketLinks
                ticketId={ticket.id!}
                linkedTickets={mappedLinkedTickets}
              />
            )}
          </div>

          {/* Conteúdo Principal - Interações */}
          <div className="flex-1 space-y-4 pl-4 bg-gradient-to-b from-white/70 to-gray-50/70 dark:from-gray-950/30 dark:to-gray-900/30 rounded-r-lg p-4">
            {/* Detalhes do Ticket */}
            <Card className="shadow-xl hover:shadow-2xl transition-all border-4 border-l-8 border-l-indigo-600 dark:border-l-indigo-400 bg-gradient-to-br from-white via-indigo-50/30 to-white dark:from-gray-800 dark:via-indigo-950/20 dark:to-gray-800">
              <CardHeader className="py-4 bg-gradient-to-r from-indigo-50/80 to-transparent dark:from-indigo-950/30 dark:to-transparent border-b-2 border-indigo-100 dark:border-indigo-900">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 ring-4 ring-indigo-200 dark:ring-indigo-800 shadow-lg">
                      <AvatarFallback className="text-sm font-bold bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200">
                        {getInitials(ticket.requester?.fullName || 'Unknown')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-bold text-lg text-gray-900 dark:text-gray-100">{ticket.requester?.fullName}</div>
                      <div className="text-sm font-medium text-indigo-600 dark:text-indigo-400">{ticket.requester?.email}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="text-xs font-semibold border-2">
                      {ticket?.createdAt ? formatDate(ticket.createdAt) : 'N/A'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-5 pt-4 px-5">
                <div
                  className="prose prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: ticket.description }}
                />
              </CardContent>
            </Card>

            {/* Editor de Nova Interação */}
            {!isClosed ? (
              clientRestrictions.isClient ? (
                <ClientRichTextEditor
                  onSubmit={(data) => {
                    // Converter para o formato esperado pelo handleCreateInteraction
                    const interactionData: InteractionData = {
                      content: data.content,
                      isInternal: data.isInternal,
                      attachments: data.attachments,
                      // Clientes não podem definir tempo ou contrato
                      timeSpent: undefined,
                      contractId: undefined
                    };
                    handleCreateInteraction(interactionData);
                  }}
                  placeholder="Escreva seu comentário..."
                />
              ) : (
                <RichTextEditor
                  onSubmit={handleCreateInteraction}
                  showTemplates={true}
                  showTimeTracking={true}
                  ticketId={ticket.id}
                  customerHours={customerHours}
                  templates={templates as any}
                  placeholder="Escreva sua resposta para o cliente..."
                />
              )
            ) : (
              <Card className="shadow-xl border-4 border-amber-500 dark:border-amber-600 bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/20 dark:to-gray-800">
                <CardHeader className="bg-gradient-to-r from-amber-100 to-transparent dark:from-amber-950/50 dark:to-transparent border-b-2 border-amber-200 dark:border-amber-900">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-600" />
                      Interações bloqueadas
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">Este chamado está marcado como concluído/fechado e não aceita novas interações ou edições.</p>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => reopenMutation.mutate('open')}
                      disabled={reopenMutation.isPending}
                    >
                      Reabrir chamado
                    </Button>
                    <Button variant="outline" onClick={() => setLocation('/tickets')}>Voltar para lista</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Timeline de Interações */}
            {clientRestrictions.isClient ? (
              <ClientTicketTimeline
                interactions={interactions.map(interaction => ({
                  id: interaction.id,
                  type: interaction.type as 'comment' | 'internal_note' | 'status_change' | 'assignment' | 'time_log',
                  content: interaction.content,
                  isInternal: interaction.isInternal,
                  createdAt: typeof interaction.createdAt === 'string' ? interaction.createdAt : interaction.createdAt.toISOString(),
                  user: interaction.user ? {
                    id: interaction.user.id!,
                    fullName: interaction.user.fullName,
                    role: interaction.user.role,
                    avatarInitials: interaction.user.avatarInitials || undefined
                  } : undefined
                }))}
              />
            ) : (
              <TicketTimeline
                interactions={interactions.map(interaction => ({
                  id: interaction.id,
                  type: interaction.type as 'comment' | 'internal_note' | 'status_change' | 'assignment' | 'time_log',
                  content: interaction.content,
                  isInternal: interaction.isInternal,
                  timeSpent: interaction.timeSpent,
                  createdAt: typeof interaction.createdAt === 'string' ? interaction.createdAt : interaction.createdAt.toISOString(),
                  user: interaction.user ? {
                    id: interaction.user.id!,
                    fullName: interaction.user.fullName,
                    role: interaction.user.role,
                    avatarInitials: interaction.user.avatarInitials || undefined
                  } : undefined
                }))}
                showInternalNotes={showInternalNotes}
                onToggleInternalNotes={() => setShowInternalNotes(!showInternalNotes)}
                currentUserRole={user?.role}
              />
            )}
          </div>
        </div>
      </div>

      {/* Dialog para agendar Google Meet - DESABILITADO
      <Dialog open={showMeetDialog} onOpenChange={setShowMeetDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Agendar Reunião no Google Meet</DialogTitle>
            <DialogDescription>
              Crie uma reunião agendada e envie convites automaticamente para todos os participantes do ticket.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="meet-date">Data da Reunião</Label>
              <Input
                id="meet-date"
                type="date"
                value={meetDate}
                onChange={(e) => setMeetDate(e.target.value)}
                className="w-full"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="meet-time">Horário</Label>
              <Input
                id="meet-time"
                type="time"
                value={meetTime}
                onChange={(e) => setMeetTime(e.target.value)}
                className="w-full"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="meet-duration">Duração (minutos)</Label>
              <Select value={meetDuration} onValueChange={setMeetDuration}>
                <SelectTrigger id="meet-duration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutos</SelectItem>
                  <SelectItem value="30">30 minutos</SelectItem>
                  <SelectItem value="45">45 minutos</SelectItem>
                  <SelectItem value="60">1 hora</SelectItem>
                  <SelectItem value="90">1h 30min</SelectItem>
                  <SelectItem value="120">2 horas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {ticket && (
              <div className="rounded-lg bg-muted p-3 text-sm">
                <p className="font-medium mb-2">Participantes que receberão convite:</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• {ticket.requester?.fullName} ({ticket.requester?.email})</li>
                  {ticket.assignee && (
                    <li>• {ticket.assignee.fullName} ({ticket.assignee.email})</li>
                  )}
                  {ticket.requesters && ticket.requesters.filter((r: any) => !r.isPrimary).map((r: any) => (
                    <li key={r.id}>• {r.requester?.fullName} ({r.requester?.email})</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowMeetDialog(false)}
              disabled={isCreatingMeet}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateGoogleMeet}
              disabled={isCreatingMeet || !meetDate || !meetTime}
            >
              {isCreatingMeet ? 'Criando...' : 'Criar Reunião'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      */}
    </AppLayout>
  );
}
