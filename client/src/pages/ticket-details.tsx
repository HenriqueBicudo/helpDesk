import { useState } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/app-layout';
import { TicketStatusBadge } from '@/components/tickets/ticket-status-badge';
import { TicketPriorityBadge } from '@/components/tickets/ticket-priority-badge';
import { RichTextEditor } from '@/components/tickets/rich-text-editor';
import { TicketTimeline } from '@/components/tickets/ticket-timeline';
import { TicketTags } from '@/components/tickets/ticket-tags';
import { TicketLinks } from '@/components/tickets/ticket-links';
import { TicketActions } from '@/components/tickets/ticket-actions';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
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
}

export default function TicketDetails() {
  const [, params] = useRoute('/tickets/:id');
  const ticketId = params?.id ? parseInt(params.id) : 0;
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  
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

  // Fetch response templates
  const { data: templates = [] } = useQuery({
    queryKey: ['/api/response-templates'],
  });
  
  // Fetch users (for assignee dropdown)
  const { data: users = [] } = useQuery<UserType[]>({
    queryKey: ['/api/users'],
  });

  // Mutation to create ticket interaction
  const createInteractionMutation = useMutation({
    mutationFn: async (data: InteractionData) => {
      const formData = new FormData();
      formData.append('type', data.isInternal ? 'internal_note' : 'comment');
      formData.append('content', data.content);
      formData.append('isInternal', data.isInternal.toString());
      if (data.timeSpent) {
        formData.append('timeSpent', data.timeSpent.toString());
      }
      
      // Adicionar anexos
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

  const handleCreateInteraction = (data: InteractionData) => {
    createInteractionMutation.mutate(data);
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

  // Calcular horas do cliente
  const customerHours = ticket.requester ? {
    monthly: ticket.requester.monthlyHours || 10,
    used: parseFloat(ticket.requester.usedHours || '0'),
    remaining: (ticket.requester.monthlyHours || 10) - parseFloat(ticket.requester.usedHours || '0')
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

            {/* Editor de Nova Interação */}
            <RichTextEditor
              onSubmit={handleCreateInteraction}
              showTemplates={true}
              showTimeTracking={true}
              customerHours={customerHours}
              templates={templates as any}
              placeholder="Escreva sua resposta para o cliente..."
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
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

                {customerHours && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Plano: {ticket.requester?.planType || 'basic'}</span>
                      <Badge variant={customerHours.remaining < 2 ? "destructive" : "default"}>
                        {customerHours.remaining.toFixed(1)}h restantes
                      </Badge>
                    </div>
                    <Progress 
                      value={(customerHours.used / customerHours.monthly) * 100} 
                      className="h-2"
                    />
                    <div className="text-xs text-muted-foreground">
                      {customerHours.used.toFixed(1)}h / {customerHours.monthly}h utilizadas este mês
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Ações do Ticket */}
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
              agents={users.map(user => ({
                id: user.id!,
                name: user.fullName,
                email: user.email
              }))}
            />            {/* Tags do Ticket */}
            <TicketTags 
              ticketId={ticket.id!}
              tags={ticket.tags || []}
            />            {/* Tickets Vinculados */}
            <TicketLinks 
              ticketId={ticket.id!}
              linkedTickets={(ticket.linkedTickets || []).map(link => ({
                id: link.id,
                ticketId: link.sourceTicketId,
                linkedTicketId: link.targetTicketId,
                linkType: link.linkType,
                description: link.description,
                linkedTicket: {
                  id: link.targetTicket.id,
                  subject: link.targetTicket.subject,
                  status: link.targetTicket.status,
                  priority: link.targetTicket.priority
                }
              }))}
            />            {/* Informações Adicionais */}
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
