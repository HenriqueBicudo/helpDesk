import { useState } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useClientRestrictions } from '@/hooks/use-client-restrictions';
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
import { 
  ArrowLeft, 
  AlertTriangle,
  Clock,
  Calendar,
  Tag,
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
  
  const [showInternalNotes, setShowInternalNotes] = useState(false);
  
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
      toast({ title: 'Chamado reaberto', description: 'O chamado foi reaberto com sucesso.' });
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Não foi possível reabrir o chamado.', variant: 'destructive' });
    }
  });

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
    <AppLayout title={`Ticket #${ticket.id?.toString().padStart(6, '0')} - ${ticket.subject}`}>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setLocation('/tickets')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm text-muted-foreground">
                #{ticket.id?.toString().padStart(6, '0')}
              </span>
              <TicketStatusBadge status={ticket.status} />
              <TicketPriorityBadge priority={ticket.priority} />
            </div>
            <h1 className="text-2xl font-bold">{ticket.subject}</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Conteúdo Principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Detalhes do Ticket */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {getInitials(ticket.requester?.fullName || 'Unknown')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{ticket.requester?.fullName}</div>
                      <div className="text-sm text-muted-foreground">{ticket.requester?.email}</div>
                    </div>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    {ticket?.createdAt ? formatDate(ticket.createdAt) : 'N/A'}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div 
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: ticket.description }}
                />
              </CardContent>
            </Card>

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
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Interações bloqueadas</CardTitle>
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
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
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

            {/* Informações do Cliente */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Informações do Cliente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {getInitials(ticket.requester?.fullName || 'Unknown')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{ticket.requester?.fullName}</div>
                    <div className="text-xs text-muted-foreground">{ticket.requester?.email}</div>
                    {ticket.requester?.company && (
                      <div className="text-xs text-muted-foreground">{ticket.requester?.company}</div>
                    )}
                  </div>
                </div>

                {/* Informações de contrato - Apenas para helpdesk */}
                {!clientRestrictions.isClient && (
                  <div className="space-y-3 pt-3 border-t">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold flex items-center gap-1.5 mb-1">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Contrato
                      </label>
                      
                      <Select
                        value={ticket.contract?.id || 'none'}
                        onValueChange={(value) => updateContractMutation.mutate(value === 'none' ? null : value)}
                        disabled={updateContractMutation.isPending}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Selecionar contrato..." />
                        </SelectTrigger>
                        <SelectContent className="max-w-[320px]">
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
                      
                      <div className="rounded-lg border bg-card p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{ticket.contract?.contractNumber}</span>
                            <Badge variant="default" className="text-xs">
                              {ticket.contract?.status === 'active' ? 'Ativo' : ticket.contract?.status}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground capitalize mb-3">
                          {ticket.contract?.type === 'support' ? 'Suporte' : 
                           ticket.contract?.type === 'maintenance' ? 'Manutenção' :
                           ticket.contract?.type === 'development' ? 'Desenvolvimento' : 
                           ticket.contract?.type}
                        </div>
                        
                        {/* Informações de uso do contrato */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5" />
                              Horas do Contrato
                            </span>
                            <Badge 
                              variant={
                                customerHours.remaining < 2 ? "destructive" : 
                                customerHours.remaining < 5 ? "secondary" : 
                                "default"
                              }
                              className="text-xs font-semibold"
                            >
                              {customerHours.remaining.toFixed(1)}h restantes
                            </Badge>
                          </div>
                          
                          <div className="space-y-1.5">
                            <Progress 
                              value={(customerHours.used / customerHours.monthly) * 100} 
                              className="h-2"
                            />
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>
                                {customerHours.used.toFixed(1)}h utilizadas
                              </span>
                              <span>
                                {customerHours.monthly}h totais
                              </span>
                            </div>
                            {customerHours.monthly > 0 && (
                              <div className="text-center pt-0.5">
                                <span className={`text-xs font-semibold ${
                                  (customerHours.used / customerHours.monthly) * 100 > 80 
                                    ? 'text-destructive' 
                                    : 'text-primary'
                                }`}>
                                  {((customerHours.used / customerHours.monthly) * 100).toFixed(0)}% consumido
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                    
                {/* Mostrar sempre opção de vincular contratos se disponível */}
                {!clientRestrictions.isClient && !ticket.contract && availableContracts.length > 0 && (
                      <div className="space-y-3 pt-3 border-t">
                        {availableContracts.length > 0 ? (
                      <div className="space-y-2">
                        <label className="text-sm font-semibold flex items-center gap-1.5 mb-1">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Vincular Contrato
                        </label>
                        <Select
                          value=""
                          onValueChange={(value) => updateContractMutation.mutate(value)}
                          disabled={updateContractMutation.isPending}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Selecionar contrato..." />
                          </SelectTrigger>
                          <SelectContent className="max-w-[320px]">
                            <div className="p-2 border-b bg-muted/50">
                              <Input
                                placeholder="Buscar por número, tipo..."
                                value={contractSearch}
                                onChange={(e) => setContractSearch(e.target.value)}
                                className="h-8 text-sm border-0 bg-background"
                              />
                            </div>
                            <div className="max-h-[300px] overflow-y-auto">
                              {(contractSearch.trim() === '' ? availableContracts : availableContracts.filter((c: any) => {
                                const q = contractSearch.toLowerCase();
                                return (c.contractNumber || '').toString().toLowerCase().includes(q)
                                  || (c.type || '').toLowerCase().includes(q)
                                  || (c.description || '').toLowerCase().includes(q);
                              })).map((contract: any) => {
                                const usagePercent = (parseFloat(contract.usedHours || 0) / contract.includedHours) * 100;
                                const isLowHours = usagePercent > 80;
                                
                                return (
                                  <SelectItem 
                                    key={contract.id} 
                                    value={contract.id}
                                    className="cursor-pointer hover:bg-accent/50 transition-colors py-3"
                                  >
                                    <div className="flex flex-col gap-1.5 w-full">
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="font-semibold text-sm">{contract.contractNumber}</span>
                                        <Badge 
                                          variant={contract.status === 'active' ? 'default' : 'secondary'}
                                          className="text-xs"
                                        >
                                          {contract.status === 'active' ? 'Ativo' : contract.status}
                                        </Badge>
                                      </div>
                                      <div className="text-xs text-muted-foreground capitalize">
                                        {contract.type === 'support' ? 'Suporte' : 
                                         contract.type === 'maintenance' ? 'Manutenção' :
                                         contract.type === 'development' ? 'Desenvolvimento' : 
                                         contract.type}
                                      </div>
                                      <div className="flex items-center gap-2 mt-1">
                                        <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                                          <div 
                                            className={`h-full transition-all ${
                                              isLowHours ? 'bg-destructive' : 'bg-primary'
                                            }`}
                                            style={{ width: `${Math.min(usagePercent, 100)}%` }}
                                          />
                                        </div>
                                        <span className={`text-xs font-medium ${isLowHours ? 'text-destructive' : 'text-muted-foreground'}`}>
                                          {contract.usedHours}h/{contract.includedHours}h
                                        </span>
                                      </div>
                                    </div>
                                  </SelectItem>
                                );
                              })}
                            </div>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground italic">
                          Selecione um contrato para vincular a este ticket
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-lg border-2 border-dashed bg-muted/20 p-4 text-center">
                        <svg className="h-10 w-10 mx-auto mb-2 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-sm font-medium text-muted-foreground">Sem contrato vinculado</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Nenhum contrato disponível para esta empresa
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Ações do Ticket - Apenas para helpdesk */}
            {!clientRestrictions.isClient && (
              <TicketActions 
                ticket={{
                  id: ticket.id!,
                  subject: ticket.subject,
                  status: ticket.status,
                  priority: ticket.priority,
                  category: ticket.category,
                  assigneeId: ticket.assigneeId || undefined,
                  assignee: ticket.assignee ? {
                    id: ticket.assignee.id!,
                    name: ticket.assignee.fullName,
                    email: ticket.assignee.email
                  } : undefined
                }}
                agents={helpdeskUsers.map(user => ({
                  id: user.id!,
                  name: user.fullName,
                  email: user.email
                }))}
                disabled={isClosed}
              />
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
            {/* Informações Adicionais */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Detalhes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Prioridade:</span>
                  <TicketPriorityBadge priority={ticket.priority} />
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Categoria:</span>
                  <span>{translateCategory(ticket.category)}</span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Criado em:</span>
                  <span>{ticket?.createdAt ? formatDate(ticket.createdAt) : 'N/A'}</span>
                </div>

                {ticket.updatedAt && ticket.updatedAt !== ticket.createdAt && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Atualizado em:</span>
                    <span>{formatDate(ticket.updatedAt)}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
