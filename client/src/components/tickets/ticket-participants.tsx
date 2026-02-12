import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { X, Plus, Users, Mail } from 'lucide-react';
import { getInitials } from '@/lib/utils';

interface Requester {
  id: number;
  fullName: string;
  email: string;
  company?: string;
}

interface TicketRequester {
  id: number;
  requesterId: number;
  isPrimary: boolean;
  requester: Requester;
}

interface TicketCc {
  id: number;
  email: string;
  name?: string;
}

interface TicketParticipantsProps {
  ticketId: number;
}

export function TicketParticipants({ ticketId }: TicketParticipantsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRequesterId, setSelectedRequesterId] = useState<string>('');
  const [ccEmail, setCcEmail] = useState('');
  const [ccName, setCcName] = useState('');

  // Buscar solicitantes do ticket
  const { data: ticketRequesters = [] } = useQuery<TicketRequester[]>({
    queryKey: [`/api/tickets/${ticketId}/requesters`],
  });

  // Buscar pessoas em cópia
  const { data: ticketCc = [] } = useQuery<TicketCc[]>({
    queryKey: [`/api/tickets/${ticketId}/cc`],
  });

  // Buscar solicitantes disponíveis (mesma empresa)
  const { data: availableRequesters = [] } = useQuery<Requester[]>({
    queryKey: [`/api/tickets/${ticketId}/available-requesters`],
  });

  // Mutation para adicionar solicitante
  const addRequesterMutation = useMutation({
    mutationFn: async (requesterId: number) => {
      const res = await fetch(`/api/tickets/${ticketId}/requesters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterId }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Erro ao adicionar solicitante');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tickets/${ticketId}/requesters`] });
      setSelectedRequesterId('');
      toast({ title: 'Sucesso', description: 'Solicitante adicionado' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  // Mutation para remover solicitante
  const removeRequesterMutation = useMutation({
    mutationFn: async (requesterId: number) => {
      const res = await fetch(`/api/tickets/${ticketId}/requesters/${requesterId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Erro ao remover solicitante');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tickets/${ticketId}/requesters`] });
      toast({ title: 'Sucesso', description: 'Solicitante removido' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  // Mutation para adicionar CC
  const addCcMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/tickets/${ticketId}/cc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: ccEmail, name: ccName }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Erro ao adicionar pessoa em cópia');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tickets/${ticketId}/cc`] });
      setCcEmail('');
      setCcName('');
      toast({ title: 'Sucesso', description: 'Pessoa adicionada em cópia' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  // Mutation para remover CC
  const removeCcMutation = useMutation({
    mutationFn: async (ccId: number) => {
      const res = await fetch(`/api/tickets/${ticketId}/cc/${ccId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Erro ao remover pessoa da cópia');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tickets/${ticketId}/cc`] });
      toast({ title: 'Sucesso', description: 'Pessoa removida da cópia' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  // Filtrar solicitantes já adicionados
  const alreadyAddedRequesterIds = ticketRequesters.map(tr => tr.requesterId);
  const availableToAdd = availableRequesters.filter(
    r => !alreadyAddedRequesterIds.includes(r.id)
  );

  return (
    <div className="space-y-3">
      {/* Solicitantes */}
      <Card className="shadow-md hover:shadow-lg transition-all border-2 border-l-4 border-l-purple-500 dark:border-l-purple-400 bg-white dark:bg-gray-800">
        <CardHeader className="py-3 bg-purple-50/50 dark:bg-purple-950/20">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Users className="h-4 w-4" />
            Solicitantes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pb-4">
          {/* Lista de solicitantes */}
          <div className="space-y-2">
            {ticketRequesters.map((tr) => (
              <div key={tr.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                <div className="flex items-center gap-2">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-xs">
                      {getInitials(tr.requester.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-sm font-medium flex items-center gap-2">
                      {tr.requester.fullName}
                      {tr.isPrimary && (
                        <span className="text-xs text-primary">(Principal)</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{tr.requester.email}</div>
                  </div>
                </div>
                {!tr.isPrimary && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeRequesterMutation.mutate(tr.requesterId)}
                    disabled={removeRequesterMutation.isPending}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Adicionar solicitante */}
          <div className="space-y-2 pt-2 border-t">
            <Label className="text-xs">Adicionar Solicitante (mesma empresa)</Label>
            {availableToAdd.length > 0 ? (
              <div className="flex gap-2">
                <Select value={selectedRequesterId} onValueChange={setSelectedRequesterId}>
                  <SelectTrigger className="h-8 text-xs flex-1">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableToAdd.map((requester) => (
                      <SelectItem key={requester.id} value={requester.id.toString()}>
                        <div className="flex flex-col">
                          <span>{requester.fullName}</span>
                          <span className="text-xs text-muted-foreground">{requester.email}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  onClick={() => selectedRequesterId && addRequesterMutation.mutate(parseInt(selectedRequesterId))}
                  disabled={!selectedRequesterId || addRequesterMutation.isPending}
                  className="h-8 px-3"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Adicionar
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                Não há outros solicitantes cadastrados da mesma empresa
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pessoas em Cópia */}
      <Card className="shadow-md hover:shadow-lg transition-all border-2 border-l-4 border-l-cyan-500 dark:border-l-cyan-400 bg-white dark:bg-gray-800">
        <CardHeader className="py-3 bg-cyan-50/50 dark:bg-cyan-950/20">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Pessoas em Cópia
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pb-4">
          {/* Lista de CC */}
          {ticketCc.length > 0 && (
            <div className="space-y-2">
              {ticketCc.map((cc) => (
                <div key={cc.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <div>
                    <div className="text-sm font-medium">{cc.name || 'Sem nome'}</div>
                    <div className="text-xs text-muted-foreground">{cc.email}</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCcMutation.mutate(cc.id)}
                    disabled={removeCcMutation.isPending}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Adicionar CC */}
          <div className="space-y-2 pt-2 border-t">
            <Label className="text-xs">Adicionar em Cópia</Label>
            <div className="space-y-2">
              <Input
                placeholder="Email"
                value={ccEmail}
                onChange={(e) => setCcEmail(e.target.value)}
                className="h-8 text-xs"
                type="email"
              />
              <Input
                placeholder="Nome (opcional)"
                value={ccName}
                onChange={(e) => setCcName(e.target.value)}
                className="h-8 text-xs"
              />
              <Button
                size="sm"
                onClick={() => addCcMutation.mutate()}
                disabled={!ccEmail || addCcMutation.isPending}
                className="h-8 w-full"
              >
                <Plus className="h-3 w-3 mr-1" />
                Adicionar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
