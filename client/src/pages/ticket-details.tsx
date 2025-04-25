import React, { useState } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { AppLayout } from '@/components/layout/app-layout';
import { TicketStatusBadge } from '@/components/tickets/ticket-status-badge';
import { TicketPriorityBadge } from '@/components/tickets/ticket-priority-badge';
import { useToast } from '@/hooks/use-toast';
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
import { 
  ArrowLeft, 
  MessageCircle, 
  Paperclip, 
  AlertTriangle,
  Clock,
  Calendar,
  Tag,
  User,
  UserCheck
} from 'lucide-react';
import { translateCategory, translateStatus, translatePriority, formatDate } from '@/lib/utils';

export default function TicketDetails() {
  const [, params] = useRoute('/tickets/:id');
  const ticketId = params?.id ? parseInt(params.id) : 0;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  
  // States for status and assignee changes
  const [newStatus, setNewStatus] = useState<string>('');
  const [newAssignee, setNewAssignee] = useState<number | undefined>(undefined);
  
  // Fetch ticket details
  const { data: ticket, isLoading, error } = useQuery({
    queryKey: [`/api/tickets/${ticketId}`],
    enabled: ticketId > 0,
  });
  
  // Fetch users (for assignee dropdown)
  const { data: users } = useQuery({
    queryKey: ['/api/users'],
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
        title: 'Status atualizado',
        description: 'O status do chamado foi atualizado com sucesso',
      });
    },
    onError: () => {
      toast({
        title: 'Erro ao atualizar status',
        description: 'Não foi possível atualizar o status do chamado',
        variant: 'destructive',
      });
    }
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
        title: 'Chamado atribuído',
        description: 'O chamado foi atribuído com sucesso',
      });
    },
    onError: () => {
      toast({
        title: 'Erro ao atribuir chamado',
        description: 'Não foi possível atribuir o chamado',
        variant: 'destructive',
      });
    }
  });
  
  // Handle status change
  const handleStatusChange = (status: string) => {
    setNewStatus(status);
    updateStatusMutation.mutate(status);
  };
  
  // Handle assignee change
  const handleAssigneeChange = (assigneeId: string) => {
    if (assigneeId === 'no_assignee') {
      setNewAssignee(undefined);
      // You could add here a mutation to unassign ticket if needed
      return;
    }
    
    const id = parseInt(assigneeId);
    setNewAssignee(id);
    assignTicketMutation.mutate(id);
  };
  
  if (isLoading) {
    return (
      <AppLayout title="Detalhes do Chamado">
        <div className="flex justify-center items-center h-64">
          <p>Carregando detalhes do chamado...</p>
        </div>
      </AppLayout>
    );
  }
  
  if (error || !ticket) {
    return (
      <AppLayout title="Detalhes do Chamado">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center flex-col h-64">
              <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Chamado não encontrado</h2>
              <p className="text-gray-500 mb-4">Não foi possível encontrar os detalhes deste chamado.</p>
              <Button variant="outline" onClick={() => setLocation('/tickets')}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
              </Button>
            </div>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }
  
  return (
    <AppLayout title="Detalhes do Chamado">
      <div className="mb-4">
        <Button variant="outline" onClick={() => setLocation('/tickets')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para lista
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main ticket information */}
        <div className="md:col-span-2">
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm text-gray-500">
                      #{ticket.id.toString().padStart(6, '0')}
                    </span>
                    <TicketStatusBadge status={ticket.status} />
                    <TicketPriorityBadge priority={ticket.priority} />
                  </div>
                  <CardTitle className="text-xl">{ticket.subject}</CardTitle>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="flex items-center mb-4">
                <Avatar className="h-10 w-10 mr-3">
                  <AvatarFallback className="bg-gray-300 text-gray-700 text-xs">
                    {ticket.requester.avatarInitials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-sm font-medium">{ticket.requester.fullName}</div>
                  <div className="text-xs text-gray-500">{ticket.requester.email}</div>
                </div>
                <div className="ml-auto text-sm text-gray-500">
                  {formatDate(ticket.createdAt)}
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <div className="prose max-w-none">
                <h3 className="text-base font-medium mb-2">Descrição</h3>
                <p className="text-gray-700 whitespace-pre-line">{ticket.description}</p>
              </div>
            </CardContent>
          </Card>
          
          {/* Comments section (placeholder for now) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Comentários e atividades</CardTitle>
            </CardHeader>
            
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <MessageCircle className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>Não há comentários ou atividades registradas.</p>
              </div>
            </CardContent>
            
            <CardFooter className="border-t">
              <div className="w-full pt-4">
                <div className="flex items-center">
                  <Button variant="outline" className="mr-2">
                    <Paperclip className="h-4 w-4 mr-2" />
                    Anexo
                  </Button>
                  <Button className="ml-auto">
                    Adicionar Comentário
                  </Button>
                </div>
              </div>
            </CardFooter>
          </Card>
        </div>
        
        {/* Ticket details sidebar */}
        <div>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Detalhes</CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm font-medium text-gray-500 flex items-center mb-1">
                  <Clock className="h-4 w-4 mr-2" /> Status
                </div>
                <Select
                  value={newStatus || ticket.status}
                  onValueChange={handleStatusChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={translateStatus(ticket.status)} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Aberto</SelectItem>
                    <SelectItem value="in_progress">Em andamento</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="resolved">Resolvido</SelectItem>
                    <SelectItem value="closed">Fechado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <div className="text-sm font-medium text-gray-500 flex items-center mb-1">
                  <AlertTriangle className="h-4 w-4 mr-2" /> Prioridade
                </div>
                <div className="text-sm font-medium">
                  <TicketPriorityBadge priority={ticket.priority} />
                </div>
              </div>
              
              <div>
                <div className="text-sm font-medium text-gray-500 flex items-center mb-1">
                  <Tag className="h-4 w-4 mr-2" /> Categoria
                </div>
                <div className="text-sm">
                  {translateCategory(ticket.category)}
                </div>
              </div>
              
              <div>
                <div className="text-sm font-medium text-gray-500 flex items-center mb-1">
                  <User className="h-4 w-4 mr-2" /> Solicitante
                </div>
                <div className="text-sm flex items-center">
                  <Avatar className="h-6 w-6 mr-2">
                    <AvatarFallback className="text-xs">
                      {ticket.requester.avatarInitials}
                    </AvatarFallback>
                  </Avatar>
                  {ticket.requester.fullName}
                </div>
              </div>
              
              <div>
                <div className="text-sm font-medium text-gray-500 flex items-center mb-1">
                  <UserCheck className="h-4 w-4 mr-2" /> Atribuído para
                </div>
                <Select
                  value={newAssignee?.toString() || ticket.assigneeId?.toString() || "no_assignee"}
                  onValueChange={handleAssigneeChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={
                      ticket.assignee ? ticket.assignee.fullName : "Não atribuído"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no_assignee">Não atribuído</SelectItem>
                    {users?.map(user => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <div className="text-sm font-medium text-gray-500 flex items-center mb-1">
                  <Calendar className="h-4 w-4 mr-2" /> Criado em
                </div>
                <div className="text-sm">
                  {formatDate(ticket.createdAt)}
                </div>
              </div>
              
              <div>
                <div className="text-sm font-medium text-gray-500 flex items-center mb-1">
                  <Calendar className="h-4 w-4 mr-2" /> Atualizado em
                </div>
                <div className="text-sm">
                  {formatDate(ticket.updatedAt)}
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ações</CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                <Paperclip className="mr-2 h-4 w-4" />
                Adicionar anexo
              </Button>
              <Button className="w-full justify-start">
                <MessageCircle className="mr-2 h-4 w-4" />
                Adicionar comentário
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
