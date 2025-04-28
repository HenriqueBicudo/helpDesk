import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { insertTicketSchema } from '@shared/schema';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { useToast } from '@/hooks/use-toast';

const formSchema = insertTicketSchema.extend({
  requesterEmail: z.string().email('Email inválido'),
});

type NewTicketFormValues = z.infer<typeof formSchema>;

type NewTicketDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function NewTicketDialog({ open, onOpenChange }: NewTicketDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: users } = useQuery({
    queryKey: ['/api/users'],
  });
  
  const { data: requesters } = useQuery({
    queryKey: ['/api/requesters'],
  });
  
  const form = useForm<NewTicketFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      subject: '',
      description: '',
      status: 'open',
      priority: 'medium',
      category: 'technical_support', // Valor válido para categoria
      requesterEmail: '',
      assigneeId: undefined,
    },
  });
  
  const createTicketMutation = useMutation({
    mutationFn: async (data: NewTicketFormValues) => {
      // Find or create requester
      let requesterId;
      const existingRequester = requesters?.find(r => r.email === data.requesterEmail);
      
      if (existingRequester) {
        requesterId = existingRequester.id;
      } else {
        // Create new requester
        const [firstName, ...restName] = data.requesterEmail.split('@')[0].split('.');
        const fullName = [
          firstName.charAt(0).toUpperCase() + firstName.slice(1),
          ...restName
        ].join(' ');
        
        const newRequester = await apiRequest('POST', '/api/requesters', {
          fullName,
          email: data.requesterEmail,
          company: ''
        });
        
        const requesterData = await newRequester.json();
        requesterId = requesterData.id;
      }
      
      // Remove the requesterEmail as it's not part of the ticket schema
      const { requesterEmail, ...ticketData } = data;
      
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
    },
    onError: (error) => {
      toast({
        title: 'Erro ao criar chamado',
        description: 'Ocorreu um erro ao registrar o chamado',
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
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="requesterEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email do Solicitante</FormLabel>
                  <FormControl>
                    <Input placeholder="email@exemplo.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
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
                      <SelectItem value="technical_support">Suporte técnico</SelectItem>
                      <SelectItem value="financial">Financeiro</SelectItem>
                      <SelectItem value="commercial">Comercial</SelectItem>
                      <SelectItem value="other">Outros</SelectItem>
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
                        {users?.map((user) => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            {user.fullName}
                          </SelectItem>
                        ))}
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
