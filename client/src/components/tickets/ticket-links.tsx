import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Link2, Plus, X, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface LinkedTicket {
  id: number;
  ticketId: number;
  linkedTicketId: number;
  linkType: string;
  description?: string;
  linkedTicket: {
    id: number;
    subject: string;
    status: string;
    priority: string;
  };
}

interface TicketLinksProps {
  ticketId: number;
  linkedTickets: LinkedTicket[];
}

export function TicketLinks({ ticketId, linkedTickets }: TicketLinksProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [targetTicketId, setTargetTicketId] = useState('');
  const [linkType, setLinkType] = useState('related_to');
  const [description, setDescription] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const linkTypes = [
    { value: 'related_to', label: 'Relacionado a' },
    { value: 'duplicate_of', label: 'Duplicata de' },
    { value: 'caused_by', label: 'Causado por' },
    { value: 'blocks', label: 'Bloqueia' },
    { value: 'blocked_by', label: 'Bloqueado por' }
  ];

  const addLinkMutation = useMutation({
    mutationFn: async ({ targetTicketId, linkType, description }: { targetTicketId: number; linkType: string; description: string }) => {
      const response = await fetch(`/api/tickets/${ticketId}/links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetTicketId, linkType, description })
      });
      if (!response.ok) throw new Error('Erro ao vincular ticket');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      setIsAdding(false);
      setTargetTicketId('');
      setLinkType('related_to');
      setDescription('');
      toast({
        title: "🔗 Tickets Vinculados",
        description: "Vinculação criada com sucesso."
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Erro",
        description: error.message || "Não foi possível vincular os tickets.",
        variant: "destructive"
      });
    }
  });

  const removeLinkMutation = useMutation({
    mutationFn: async (linkedTicketId: number) => {
      const response = await fetch(`/api/tickets/${ticketId}/links/${linkedTicketId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Erro ao desvincular ticket');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      toast({
        title: "🔗 Vinculação Removida",
        description: "Tickets foram desvinculados."
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Erro",
        description: error.message || "Não foi possível desvincular os tickets.",
        variant: "destructive"
      });
    }
  });

  const handleAddLink = () => {
    const ticketNumber = parseInt(targetTicketId);
    
    if (!ticketNumber || ticketNumber <= 0) {
      toast({
        title: "❌ Ticket Inválido",
        description: "Digite um número de ticket válido.",
        variant: "destructive"
      });
      return;
    }

    if (ticketNumber === ticketId) {
      toast({
        title: "❌ Ticket Inválido",
        description: "Um ticket não pode ser vinculado a si mesmo.",
        variant: "destructive"
      });
      return;
    }

    addLinkMutation.mutate({ targetTicketId: ticketNumber, linkType, description });
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'open': 'bg-blue-100 text-blue-800',
      'in_progress': 'bg-yellow-100 text-yellow-800',
      'pending': 'bg-orange-100 text-orange-800',
      'resolved': 'bg-green-100 text-green-800',
      'closed': 'bg-gray-100 text-gray-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      'low': 'bg-green-100 text-green-800',
      'medium': 'bg-yellow-100 text-yellow-800',
      'high': 'bg-orange-100 text-orange-800',
      'critical': 'bg-red-100 text-red-800'
    };
    return colors[priority as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Link2 className="w-4 h-4" />
          Tickets Vinculados ({linkedTickets.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Tickets vinculados existentes */}
          {linkedTickets.length > 0 ? (
            <div className="space-y-2">
              {linkedTickets.map((link) => (
                <div key={link.id} className="p-3 border rounded-lg bg-gray-50 dark:bg-gray-900">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-xs">
                          {linkTypes.find(t => t.value === link.linkType)?.label || link.linkType}
                        </Badge>
                        <a
                          href={`/tickets/${link.linkedTicket.id}`}
                          className="font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          #{link.linkedTicket.id}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                        {link.linkedTicket.subject}
                      </p>
                      
                      <div className="flex gap-2">
                        <Badge className={getStatusColor(link.linkedTicket.status)}>
                          {link.linkedTicket.status}
                        </Badge>
                        <Badge className={getPriorityColor(link.linkedTicket.priority)}>
                          {link.linkedTicket.priority}
                        </Badge>
                      </div>
                      
                      {link.description && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {link.description}
                        </p>
                      )}
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => removeLinkMutation.mutate(link.id)}
                      disabled={removeLinkMutation.isPending}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum ticket vinculado
            </p>
          )}

          {/* Adicionar nova vinculação */}
          {isAdding ? (
            <div className="space-y-3 p-3 border rounded-lg bg-gray-50 dark:bg-gray-900">
              <div>
                <label className="text-xs text-muted-foreground">Número do Ticket:</label>
                <Input
                  type="number"
                  placeholder="Ex: 123"
                  value={targetTicketId}
                  onChange={(e) => setTargetTicketId(e.target.value)}
                />
              </div>
              
              <div>
                <label className="text-xs text-muted-foreground">Tipo de Vinculação:</label>
                <Select value={linkType} onValueChange={setLinkType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {linkTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Descrição (opcional):</label>
                <Textarea
                  placeholder="Descreva o motivo da vinculação..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={handleAddLink}
                  disabled={addLinkMutation.isPending || !targetTicketId}
                  className="flex-1"
                >
                  {addLinkMutation.isPending ? 'Vinculando...' : 'Vincular'}
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => {
                    setIsAdding(false);
                    setTargetTicketId('');
                    setLinkType('related_to');
                    setDescription('');
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAdding(true)}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Vincular Ticket
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
