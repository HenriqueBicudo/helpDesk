import React, { useState } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { AppLayout } from '@/components/layout/app-layout';
import { TicketStatusBadge } from '@/components/tickets/ticket-status-badge';
import { TicketPriorityBadge } from '@/components/tickets/ticket-priority-badge';
import { RichTextEditor } from '@/components/tickets/rich-text-editor';
import { TicketTimeline } from '@/components/tickets/ticket-timeline';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft, 
  MessageCircle, 
  Paperclip, 
  AlertTriangle,
  Clock,
  Calendar,
  Tag,
  User,
  UserCheck,
  Eye,
  EyeOff
} from 'lucide-react';
import { translateCategory, translateStatus, translatePriority, formatDate, getInitials } from '@/lib/utils';

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
  
  // States for status and assignee changes
  const [newStatus, setNewStatus] = useState<string>('');
  const [newAssignee, setNewAssignee] = useState<number | undefined>(undefined);
  const [showInternalNotes, setShowInternalNotes] = useState(false);
  
  // Fetch ticket details
  const { data: ticket, isLoading, error } = useQuery({
    queryKey: [`/api/tickets/${ticketId}`],
    enabled: ticketId > 0,
  });
  
  // Fetch ticket interactions
  const { data: interactions = [] } = useQuery({
    queryKey: [`/api/tickets/${ticketId}/interactions`],
    enabled: ticketId > 0,
  });

  // Fetch response templates
  const { data: templates = [] } = useQuery({
    queryKey: ['/api/response-templates'],
  });
  
  // Fetch users (for assignee dropdown)
  const { data: users = [] } = useQuery({
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

  // Mutation to update ticket status
  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const res = await apiRequest('POST', `/api/tickets/${ticketId}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tickets/${ticketId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/tickets'] });
      toast({
        title: "Sucesso",
        description: "Status do ticket atualizado",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar status",
        variant: "destructive",
      });
    },
  });

  // Mutation to assign ticket
  const assignTicketMutation = useMutation({
    mutationFn: async (assigneeId: number) => {
      const res = await apiRequest('POST', `/api/tickets/${ticketId}/assign`, { assigneeId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tickets/${ticketId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/tickets'] });
      toast({
        title: "Sucesso",
        description: "Ticket atribuído com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atribuir ticket",
        variant: "destructive",
      });
    },
  });

  const handleStatusChange = (status: string) => {
    setNewStatus(status);
    updateStatusMutation.mutate(status);
  };

  const handleAssigneeChange = (value: string) => {
    if (value === "no_assignee") {
      setNewAssignee(undefined);
      // TODO: Implement unassign mutation
    } else {
      const id = parseInt(value);
      setNewAssignee(id);
      assignTicketMutation.mutate(id);
    }
  };

  const handleCreateInteraction = (data: InteractionData) => {
    createInteractionMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando ticket...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !ticket) {
    return (
      <AppLayout>
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
    <AppLayout>
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
                    {formatDate(ticket.createdAt)}
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
              interactions={interactions}
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
              templates={templates}
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
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Status */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select
                    value={newStatus || ticket.status}
                    onValueChange={handleStatusChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={translateStatus(ticket.status)} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Aberto</SelectItem>
                      <SelectItem value="in_progress">Em Andamento</SelectItem>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="resolved">Resolvido</SelectItem>
                      <SelectItem value="closed">Fechado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Responsável */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Responsável</label>
                  <Select
                    value={newAssignee?.toString() || ticket.assigneeId?.toString() || "no_assignee"}
                    onValueChange={handleAssigneeChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        ticket.assignee ? ticket.assignee.fullName : "Não atribuído"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no_assignee">Não atribuído</SelectItem>
                      {users.map((user: any) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          {user.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

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
                  <span>{formatDate(ticket.createdAt)}</span>
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
