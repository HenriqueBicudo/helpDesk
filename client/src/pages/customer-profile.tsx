import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { AppLayout } from '@/components/layout/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Mail, Building2, Calendar, AlertCircle, Ticket, Phone, MapPin, Edit, Star, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getInitials } from '@/lib/utils';
import { useRoute, Link } from 'wouter';

const PRIORITY_COLORS = {
  low: 'bg-blue-100 text-blue-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
};

const STATUS_COLORS = {
  open: 'bg-green-100 text-green-800',
  in_progress: 'bg-blue-100 text-blue-800',
  pending: 'bg-yellow-100 text-yellow-800',
  resolved: 'bg-purple-100 text-purple-800',
  closed: 'bg-gray-100 text-gray-800',
};

export default function CustomerProfile() {
  const [, params] = useRoute('/customers/:id');
  const customerId = parseInt(params?.id || '0');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Estados para anotações
  const [noteContent, setNoteContent] = useState('');
  const [isImportant, setIsImportant] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<any>(null);

  // Query para buscar dados do cliente
  const { data: customer, isLoading: loadingCustomer } = useQuery({
    queryKey: [`/api/companies/${customerId}`],
    queryFn: async () => {
      const response = await fetch(`/api/companies/${customerId}`);
      if (!response.ok) {
        if (response.status === 404) {
          return null; // Cliente não encontrado
        }
        throw new Error('Erro ao carregar cliente');
      }
      return response.json();
    },
    enabled: !!customerId,
    retry: false, // Não tentar novamente se falhar
  });

  // Query para buscar tickets do cliente
  const { data: tickets = [], isLoading: loadingTickets } = useQuery({
    queryKey: [`/api/tickets?companyId=${customerId}`],
    queryFn: async () => {
      const response = await fetch('/api/tickets');
      if (!response.ok) throw new Error('Erro ao carregar tickets');
      const allTickets = await response.json();
      return allTickets.filter((t: any) => t.companyId === customerId);
    },
    enabled: !!customerId,
  });

  // Query para buscar anotações do cliente
  const { data: notes = [], isLoading: loadingNotes } = useQuery({
    queryKey: [`/api/companies/${customerId}/notes`],
    queryFn: async () => {
      const response = await fetch(`/api/companies/${customerId}/notes`);
      if (!response.ok) throw new Error('Erro ao carregar anotações');
      return response.json();
    },
    enabled: !!customerId,
  });

  // Mutation para criar anotação
  const createNoteMutation = useMutation({
    mutationFn: async (data: { content: string; isImportant: boolean }) => {
      const response = await fetch(`/api/companies/${customerId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Erro ao criar anotação');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/companies/${customerId}/notes`] });
      setNoteContent('');
      setIsImportant(false);
      toast({ title: 'Anotação criada com sucesso' });
    },
    onError: () => {
      toast({ title: 'Erro ao criar anotação', variant: 'destructive' });
    },
  });

  // Mutation para atualizar anotação
  const updateNoteMutation = useMutation({
    mutationFn: async (data: { id: number; content: string; isImportant: boolean }) => {
      const response = await fetch(`/api/companies/${customerId}/notes/${data.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: data.content, isImportant: data.isImportant }),
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Erro ao atualizar anotação');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/companies/${customerId}/notes`] });
      setIsEditDialogOpen(false);
      setEditingNote(null);
      toast({ title: 'Anotação atualizada com sucesso' });
    },
    onError: () => {
      toast({ title: 'Erro ao atualizar anotação', variant: 'destructive' });
    },
  });

  // Mutation para deletar anotação
  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: number) => {
      const response = await fetch(`/api/companies/${customerId}/notes/${noteId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Erro ao deletar anotação');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/companies/${customerId}/notes`] });
      toast({ title: 'Anotação deletada com sucesso' });
    },
    onError: () => {
      toast({ title: 'Erro ao deletar anotação', variant: 'destructive' });
    },
  });

  // Handlers
  const handleCreateNote = () => {
    if (noteContent.trim()) {
      createNoteMutation.mutate({ content: noteContent, isImportant });
    }
  };

  const handleEditNote = (note: any) => {
    setEditingNote(note);
    setIsEditDialogOpen(true);
  };

  const handleUpdateNote = () => {
    if (editingNote && editingNote.content.trim()) {
      updateNoteMutation.mutate({
        id: editingNote.id,
        content: editingNote.content,
        isImportant: editingNote.isImportant,
      });
    }
  };

  const handleDeleteNote = (noteId: number) => {
    if (confirm('Tem certeza que deseja deletar esta anotação?')) {
      deleteNoteMutation.mutate(noteId);
    }
  };

  if (loadingCustomer) {
    return (
      <AppLayout title="Perfil do Cliente">
        <div className="flex items-center justify-center h-[80vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!customer) {
    return (
      <AppLayout title="Perfil do Cliente">
        <div className="flex items-center justify-center h-[80vh]">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900">Cliente não encontrado</h2>
            <p className="mt-1 text-sm text-gray-500">O cliente que você está procurando não existe.</p>
            <Link href="/customers">
              <Button className="mt-4">Voltar para Clientes</Button>
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={`Perfil: ${customer.name}`}>
      <div className="p-6 space-y-6">
        {/* Cabeçalho com informações do cliente */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                  {getInitials(customer.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <CardTitle className="text-2xl">{customer.name}</CardTitle>
                <div className="flex flex-col gap-2 mt-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    {customer.email}
                  </div>
                  {customer.cnpj && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                      CNPJ: {customer.cnpj}
                    </div>
                  )}
                  {customer.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      {customer.phone}
                    </div>
                  )}
                  {customer.address && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {customer.address}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Cliente desde {format(new Date(customer.createdAt!), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </div>
                </div>
              </div>
              <Link href="/customers">
                <Button variant="outline">Voltar</Button>
              </Link>
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 gap-6">
          {/* Tickets recentes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ticket className="h-5 w-5" />
                Tickets Recentes
              </CardTitle>
              <CardDescription>Últimos chamados abertos por este cliente</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingTickets ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : tickets.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">Nenhum ticket encontrado</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tickets.slice(0, 5).map((ticket: any) => (
                    <Link key={ticket.id} href={`/tickets/${ticket.id}`}>
                      <div className="p-3 border rounded-lg hover:bg-accent transition-colors cursor-pointer">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">#{ticket.id} - {ticket.subject}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(ticket.createdAt), "dd/MM/yyyy 'às' HH:mm")}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Badge className={STATUS_COLORS[ticket.status as keyof typeof STATUS_COLORS]}>
                              {ticket.status}
                            </Badge>
                            <Badge className={PRIORITY_COLORS[ticket.priority as keyof typeof PRIORITY_COLORS]}>
                              {ticket.priority}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5" />
                Anotações Internas
              </CardTitle>
              <CardDescription>Notas visíveis apenas para a equipe</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Formulário para nova anotação */}
              <div className="space-y-3">
                <Textarea
                  placeholder="Adicionar nova anotação..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  rows={3}
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="important"
                      checked={isImportant}
                      onCheckedChange={(checked) => setIsImportant(checked as boolean)}
                    />
                    <Label htmlFor="important" className="text-sm cursor-pointer flex items-center gap-1">
                      <Star className="h-4 w-4" />
                      Marcar como importante
                    </Label>
                  </div>
                  <Button
                    onClick={handleCreateNote}
                    disabled={!noteContent.trim() || createNoteMutation.isPending}
                    size="sm"
                  >
                    {createNoteMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-1" />
                        Adicionar
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Lista de anotações */}
              <div className="border-t pt-4">
                {loadingNotes ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : notes.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">Nenhuma anotação ainda</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {notes.map((note: any) => (
                      <div
                        key={note.id}
                        className={`p-3 border rounded-lg ${
                          note.isImportant ? 'border-yellow-400 bg-yellow-50' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            {note.isImportant && (
                              <Star className="h-4 w-4 text-yellow-500 inline mr-1" />
                            )}
                            <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                            <p className="text-xs text-muted-foreground mt-2">
                              Por {note.authorName} em {format(new Date(note.createdAt), "dd/MM/yyyy 'às' HH:mm")}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleEditNote(note)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:text-red-600"
                              onClick={() => handleDeleteNote(note.id)}
                              disabled={deleteNoteMutation.isPending}
                            >
                              {deleteNoteMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Dialog de edição */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Anotação</DialogTitle>
              <DialogDescription>Faça as alterações na anotação abaixo.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea
                value={editingNote?.content || ''}
                onChange={(e) =>
                  setEditingNote({ ...editingNote, content: e.target.value })
                }
                rows={5}
              />
              <div className="flex items-center gap-2">
                <Checkbox
                  id="edit-important"
                  checked={editingNote?.isImportant || false}
                  onCheckedChange={(checked) =>
                    setEditingNote({ ...editingNote, isImportant: checked })
                  }
                />
                <Label htmlFor="edit-important" className="cursor-pointer flex items-center gap-1">
                  <Star className="h-4 w-4" />
                  Marcar como importante
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleUpdateNote}
                disabled={updateNoteMutation.isPending}
              >
                {updateNoteMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Salvar'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
