import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Plus, Edit, Trash2, Send } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { EmailTemplate, EmailTemplateType } from '@shared/schema';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export default function Settings() {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();
  
  // General Settings State
  const [generalSettings, setGeneralSettings] = useState({
    companyName: 'HelpDesk',
    companyLogo: '',
    primaryColor: '#2c3e50',
    emailSender: 'helpdesk@example.com',
    defaultLanguage: 'pt-BR',
    timezone: 'America/Sao_Paulo'
  });
  
  // Notification Settings State
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    newTicketNotifications: true,
    ticketUpdateNotifications: true,
    ticketAssignmentNotifications: true,
    dailyDigest: false
  });

  // Basic Email Templates State (legacy)
  const [emailTemplates, setEmailTemplates] = useState({
    newTicketTemplate: 'Olá {cliente},\n\nSeu chamado "{assunto}" foi aberto com sucesso.\nNúmero do Chamado: {id}\n\nNós entraremos em contato em breve.\n\nAtenciosamente,\nEquipe de Suporte',
    ticketUpdateTemplate: 'Olá {cliente},\n\nSeu chamado "{assunto}" foi atualizado.\nStatus atual: {status}\n\nPara mais detalhes, acesse seu painel.\n\nAtenciosamente,\nEquipe de Suporte',
    ticketResolutionTemplate: 'Olá {cliente},\n\nSeu chamado "{assunto}" foi resolvido.\n\nAgradecemos seu contato.\n\nAtenciosamente,\nEquipe de Suporte'
  });
  
  // Template Editor State
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState<EmailTemplate | null>(null);
  const [templateFormData, setTemplateFormData] = useState<{
    name: string;
    type: EmailTemplateType;
    subject: string;
    body: string;
    isDefault: boolean;
    isActive: boolean;
  }>({
    name: '',
    type: 'new_ticket',
    subject: '',
    body: '',
    isDefault: false,
    isActive: true
  });
  
  // Test Email Dialog State
  const [isTestEmailDialogOpen, setIsTestEmailDialogOpen] = useState(false);
  const [testEmailData, setTestEmailData] = useState({
    to: '',
    templateType: 'new_ticket' as EmailTemplateType,
    templateData: '{}'
  });
  
  // Get Email Templates
  const { data: serverTemplates, isLoading: isLoadingTemplates } = useQuery({
    queryKey: ['/api/email-templates'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/email-templates');
      const data = await response.json() as EmailTemplate[];
      return data;
    }
  });
  
  // Create Email Template
  const createTemplateMutation = useMutation({
    mutationFn: async (template: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'>) => {
      const response = await apiRequest('POST', '/api/email-templates', template);
      const data = await response.json();
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Template criado",
        description: "O template de email foi criado com sucesso."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/email-templates'] });
      setIsTemplateDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Erro ao criar template: ${error}`,
        variant: "destructive"
      });
    }
  });
  
  // Update Email Template
  const updateTemplateMutation = useMutation({
    mutationFn: async (template: Partial<EmailTemplate> & { id: number }) => {
      const { id, ...rest } = template;
      const response = await apiRequest('PATCH', `/api/email-templates/${id}`, rest);
      const data = await response.json();
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Template atualizado",
        description: "O template de email foi atualizado com sucesso."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/email-templates'] });
      setIsTemplateDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Erro ao atualizar template: ${error}`,
        variant: "destructive"
      });
    }
  });
  
  // Delete Email Template
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/email-templates/${id}`);
      return id;
    },
    onSuccess: () => {
      toast({
        title: "Template excluído",
        description: "O template de email foi excluído com sucesso."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/email-templates'] });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Erro ao excluir template: ${error}`,
        variant: "destructive"
      });
    }
  });
  
  // Send Test Email
  const sendTestEmailMutation = useMutation({
    mutationFn: async (data: { to: string, templateType: EmailTemplateType, templateData: any }) => {
      const response = await apiRequest('POST', '/api/test-email', data);
      const result = await response.json();
      return result;
    },
    onSuccess: () => {
      toast({
        title: "Email de teste enviado",
        description: "O email de teste foi enviado com sucesso (simulado)."
      });
      setIsTestEmailDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Erro ao enviar email de teste: ${error}`,
        variant: "destructive"
      });
    }
  });

  // Handle input changes for general settings
  const handleGeneralSettingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setGeneralSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle switch changes for notification settings
  const handleNotificationToggle = (field: string, checked: boolean) => {
    setNotificationSettings(prev => ({
      ...prev,
      [field]: checked
    }));
  };

  // Handle textarea changes for email templates
  const handleEmailTemplateChange = (field: string, value: string) => {
    setEmailTemplates(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsSaving(false);
      toast({
        title: "Configurações salvas",
        description: "Suas configurações foram atualizadas com sucesso",
      });
    }, 1000);
  };
  
  // Template Editor Handlers
  const handleOpenCreateTemplate = () => {
    setCurrentTemplate(null);
    setTemplateFormData({
      name: '',
      type: 'new_ticket',
      subject: '',
      body: '',
      isDefault: false,
      isActive: true
    });
    setIsTemplateDialogOpen(true);
  };
  
  const handleOpenEditTemplate = (template: EmailTemplate) => {
    setCurrentTemplate(template);
    setTemplateFormData({
      name: template.name,
      type: template.type,
      subject: template.subject,
      body: template.body,
      isDefault: template.isDefault,
      isActive: template.isActive
    });
    setIsTemplateDialogOpen(true);
  };
  
  const handleDeleteTemplate = (id: number) => {
    if (confirm('Tem certeza que deseja excluir este template?')) {
      deleteTemplateMutation.mutate(id);
    }
  };
  
  const handleTemplateFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (currentTemplate) {
      // Update existing template
      updateTemplateMutation.mutate({
        id: currentTemplate.id,
        ...templateFormData
      });
    } else {
      // Create new template
      createTemplateMutation.mutate(templateFormData);
    }
  };
  
  // Template Form Input Handlers
  const handleTemplateInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setTemplateFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleTemplateSelectChange = (field: string, value: string) => {
    setTemplateFormData(prev => ({
      ...prev,
      [field]: field === 'type' ? value as EmailTemplateType : value
    }));
  };
  
  const handleTemplateSwitchChange = (field: string, checked: boolean) => {
    setTemplateFormData(prev => ({
      ...prev,
      [field]: checked
    }));
  };
  
  // Test Email Handlers
  const handleOpenTestEmail = (templateType: EmailTemplateType) => {
    setTestEmailData({
      to: '',
      templateType,
      templateData: '{}'
    });
    setIsTestEmailDialogOpen(true);
  };
  
  const handleTestEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validate and parse the template data
      const templateData = JSON.parse(testEmailData.templateData);
      sendTestEmailMutation.mutate({
        to: testEmailData.to,
        templateType: testEmailData.templateType,
        templateData
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "O formato dos dados do template é inválido. Certifique-se de que seja um JSON válido.",
        variant: "destructive"
      });
    }
  };
  
  const handleTestEmailChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setTestEmailData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <AppLayout title="Configurações">
      <div className="p-6 space-y-6">
        <Tabs defaultValue="general">
          <div className="flex justify-between items-center mb-4">
            <TabsList>
              <TabsTrigger value="general">Geral</TabsTrigger>
              <TabsTrigger value="notifications">Notificações</TabsTrigger>
              <TabsTrigger value="email-templates">Templates de Email</TabsTrigger>
            </TabsList>
            
            <Button 
              onClick={handleSubmit} 
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Salvar Configurações
            </Button>
          </div>
          
          {/* General Settings Tab */}
          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>Configurações Gerais</CardTitle>
                <CardDescription>
                  Configure as informações básicas do seu sistema de helpdesk.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Nome da Empresa</Label>
                    <Input 
                      id="companyName" 
                      name="companyName"
                      value={generalSettings.companyName}
                      onChange={handleGeneralSettingChange}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="companyLogo">Logo da Empresa (URL)</Label>
                    <Input 
                      id="companyLogo" 
                      name="companyLogo"
                      value={generalSettings.companyLogo}
                      onChange={handleGeneralSettingChange}
                      placeholder="https://example.com/logo.png"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="primaryColor">Cor Principal</Label>
                    <div className="flex gap-3">
                      <Input 
                        id="primaryColor" 
                        name="primaryColor"
                        value={generalSettings.primaryColor}
                        onChange={handleGeneralSettingChange}
                      />
                      <div 
                        className="w-10 h-10 rounded-md border"
                        style={{ backgroundColor: generalSettings.primaryColor }}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="emailSender">Email Remetente</Label>
                    <Input 
                      id="emailSender" 
                      name="emailSender"
                      value={generalSettings.emailSender}
                      onChange={handleGeneralSettingChange}
                      type="email"
                    />
                  </div>
                </div>
                
                <Separator />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="defaultLanguage">Idioma Padrão</Label>
                    <Select 
                      value={generalSettings.defaultLanguage}
                      onValueChange={(value) => setGeneralSettings(prev => ({ ...prev, defaultLanguage: value }))}
                    >
                      <SelectTrigger id="defaultLanguage">
                        <SelectValue placeholder="Selecione o idioma" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                        <SelectItem value="en-US">English (US)</SelectItem>
                        <SelectItem value="es">Español</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Fuso Horário</Label>
                    <Select 
                      value={generalSettings.timezone}
                      onValueChange={(value) => setGeneralSettings(prev => ({ ...prev, timezone: value }))}
                    >
                      <SelectTrigger id="timezone">
                        <SelectValue placeholder="Selecione o fuso horário" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="America/Sao_Paulo">Brasília (GMT-3)</SelectItem>
                        <SelectItem value="America/New_York">New York (GMT-4)</SelectItem>
                        <SelectItem value="Europe/London">London (GMT+1)</SelectItem>
                        <SelectItem value="Asia/Tokyo">Tokyo (GMT+9)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Configurações de Notificações</CardTitle>
                <CardDescription>
                  Configure como e quando as notificações serão enviadas.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="emailNotifications">Ativar Notificações por Email</Label>
                      <p className="text-sm text-muted-foreground">
                        Enviar notificações por email para usuários e clientes
                      </p>
                    </div>
                    <Switch 
                      id="emailNotifications"
                      checked={notificationSettings.emailNotifications}
                      onCheckedChange={(checked) => handleNotificationToggle('emailNotifications', checked)}
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="newTicketNotifications">Novos Chamados</Label>
                      <p className="text-sm text-muted-foreground">
                        Notificar quando um novo chamado for criado
                      </p>
                    </div>
                    <Switch 
                      id="newTicketNotifications"
                      checked={notificationSettings.newTicketNotifications}
                      onCheckedChange={(checked) => handleNotificationToggle('newTicketNotifications', checked)}
                      disabled={!notificationSettings.emailNotifications}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="ticketUpdateNotifications">Atualizações de Chamados</Label>
                      <p className="text-sm text-muted-foreground">
                        Notificar quando um chamado for atualizado
                      </p>
                    </div>
                    <Switch 
                      id="ticketUpdateNotifications"
                      checked={notificationSettings.ticketUpdateNotifications}
                      onCheckedChange={(checked) => handleNotificationToggle('ticketUpdateNotifications', checked)}
                      disabled={!notificationSettings.emailNotifications}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="ticketAssignmentNotifications">Atribuição de Chamados</Label>
                      <p className="text-sm text-muted-foreground">
                        Notificar agentes quando um chamado for atribuído a eles
                      </p>
                    </div>
                    <Switch 
                      id="ticketAssignmentNotifications"
                      checked={notificationSettings.ticketAssignmentNotifications}
                      onCheckedChange={(checked) => handleNotificationToggle('ticketAssignmentNotifications', checked)}
                      disabled={!notificationSettings.emailNotifications}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="dailyDigest">Resumo Diário</Label>
                      <p className="text-sm text-muted-foreground">
                        Enviar um resumo diário com status dos chamados abertos
                      </p>
                    </div>
                    <Switch 
                      id="dailyDigest"
                      checked={notificationSettings.dailyDigest}
                      onCheckedChange={(checked) => handleNotificationToggle('dailyDigest', checked)}
                      disabled={!notificationSettings.emailNotifications}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Email Templates Tab */}
          <TabsContent value="email-templates">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle>Templates de Email</CardTitle>
                  <CardDescription>
                    Gerencie os templates de email enviados pelo sistema.
                  </CardDescription>
                </div>
                <Button onClick={handleOpenCreateTemplate}>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Template
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                {isLoadingTemplates ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : !serverTemplates || serverTemplates.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Nenhum template de email encontrado.</p>
                    <p className="text-sm mt-2">Clique em "Novo Template" para criar um.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-center">Padrão</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {serverTemplates.map((template) => (
                            <TableRow key={template.id}>
                              <TableCell className="font-medium">{template.name}</TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {template.type === 'new_ticket' && 'Novo Chamado'}
                                  {template.type === 'ticket_update' && 'Atualização'}
                                  {template.type === 'ticket_resolution' && 'Resolução'}
                                  {template.type === 'ticket_assignment' && 'Atribuição'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {template.isActive ? (
                                  <Badge className="bg-green-500">Ativo</Badge>
                                ) : (
                                  <Badge variant="outline">Inativo</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {template.isDefault ? '✓' : '-'}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end space-x-2">
                                  <Button 
                                    variant="outline" 
                                    size="icon"
                                    onClick={() => handleOpenTestEmail(template.type)}
                                    title="Enviar teste"
                                  >
                                    <Send className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="icon"
                                    onClick={() => handleOpenEditTemplate(template)}
                                    title="Editar template"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="icon"
                                    onClick={() => handleDeleteTemplate(template.id)}
                                    title="Excluir template"
                                    disabled={template.isDefault}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    
                    {/* Templates Simples (Legacy) */}
                    <Separator />
                    <div className="pt-4">
                      <h3 className="text-lg font-medium mb-4">Templates Básicos (Legado)</h3>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="newTicketTemplate">
                            Template para Novo Chamado
                          </Label>
                          <p className="text-sm text-muted-foreground mb-2">
                            Variáveis disponíveis: {'{cliente}'}, {'{assunto}'}, {'{id}'}, {'{descrição}'}
                          </p>
                          <Textarea 
                            id="newTicketTemplate"
                            value={emailTemplates.newTicketTemplate}
                            onChange={(e) => handleEmailTemplateChange('newTicketTemplate', e.target.value)}
                            rows={6}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Template Editor Dialog */}
          <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>
                  {currentTemplate ? 'Editar Template de Email' : 'Novo Template de Email'}
                </DialogTitle>
                <DialogDescription>
                  Personalize o template conforme necessário. Utilize variáveis entre chaves {'{variavel}'}.
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleTemplateFormSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome do Template</Label>
                    <Input
                      id="name"
                      name="name"
                      value={templateFormData.name}
                      onChange={handleTemplateInputChange}
                      placeholder="Ex: Notificação de Novo Chamado"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="type">Tipo de Template</Label>
                    <Select
                      value={templateFormData.type}
                      onValueChange={(value) => handleTemplateSelectChange('type', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new_ticket">Novo Chamado</SelectItem>
                        <SelectItem value="ticket_update">Atualização de Chamado</SelectItem>
                        <SelectItem value="ticket_resolution">Resolução de Chamado</SelectItem>
                        <SelectItem value="ticket_assignment">Atribuição de Chamado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="subject">Assunto do Email</Label>
                  <Input
                    id="subject"
                    name="subject"
                    value={templateFormData.subject}
                    onChange={handleTemplateInputChange}
                    placeholder="Ex: Seu chamado {{ticketId}} foi criado"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="body">Corpo do Email</Label>
                  <Textarea
                    id="body"
                    name="body"
                    value={templateFormData.body}
                    onChange={handleTemplateInputChange}
                    placeholder="Olá {{requesterName}},

Seu chamado '{{ticketSubject}}' (#{{ticketId}}) foi criado com sucesso.

Entraremos em contato o mais breve possível.

Atenciosamente,
Equipe de Suporte"
                    rows={8}
                    required
                  />
                </div>
                
                <div className="flex justify-between">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isDefault"
                      checked={templateFormData.isDefault}
                      onCheckedChange={(checked) => handleTemplateSwitchChange('isDefault', checked)}
                    />
                    <Label htmlFor="isDefault" className="text-sm">Definir como template padrão</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isActive"
                      checked={templateFormData.isActive}
                      onCheckedChange={(checked) => handleTemplateSwitchChange('isActive', checked)}
                    />
                    <Label htmlFor="isActive" className="text-sm">Template ativo</Label>
                  </div>
                </div>
                
                <div className="pt-2">
                  <details className="text-sm text-muted-foreground">
                    <summary className="cursor-pointer font-medium">Variáveis disponíveis</summary>
                    <div className="mt-2 pl-4 space-y-1">
                      <p><strong>Todas as notificações:</strong> requesterName, ticketId, ticketSubject</p>
                      <p><strong>Novo chamado:</strong> ticketPriority, ticketCategory</p>
                      <p><strong>Atualização:</strong> ticketStatus, assigneeName, updateDetails</p>
                      <p><strong>Resolução:</strong> resolutionDetails</p>
                      <p><strong>Atribuição:</strong> assigneeName, ticketPriority</p>
                    </div>
                  </details>
                </div>
                
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsTemplateDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}>
                    {(createTemplateMutation.isPending || updateTemplateMutation.isPending) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {currentTemplate ? 'Atualizar' : 'Criar'} Template
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          
          {/* Test Email Dialog */}
          <Dialog open={isTestEmailDialogOpen} onOpenChange={setIsTestEmailDialogOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Enviar Email de Teste</DialogTitle>
                <DialogDescription>
                  Envie um email de teste para verificar o template.
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleTestEmailSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="to">Destinatário</Label>
                  <Input
                    id="to"
                    name="to"
                    type="email"
                    value={testEmailData.to}
                    onChange={handleTestEmailChange}
                    placeholder="email@exemplo.com"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="templateType">Tipo de Template</Label>
                  <Select
                    value={testEmailData.templateType}
                    onValueChange={(value) => setTestEmailData(prev => ({ ...prev, templateType: value as EmailTemplateType }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new_ticket">Novo Chamado</SelectItem>
                      <SelectItem value="ticket_update">Atualização de Chamado</SelectItem>
                      <SelectItem value="ticket_resolution">Resolução de Chamado</SelectItem>
                      <SelectItem value="ticket_assignment">Atribuição de Chamado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="templateData">Dados de Teste (JSON)</Label>
                  <Textarea
                    id="templateData"
                    name="templateData"
                    value={testEmailData.templateData}
                    onChange={handleTestEmailChange}
                    placeholder={`{
  "requesterName": "Cliente de Teste",
  "ticketId": 123,
  "ticketSubject": "Problema de teste",
  "ticketPriority": "Alta"
}`}
                    rows={5}
                    required
                  />
                </div>
                
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsTestEmailDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={sendTestEmailMutation.isPending}>
                    {sendTestEmailMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Enviar Email de Teste
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </Tabs>
      </div>
    </AppLayout>
  );
}