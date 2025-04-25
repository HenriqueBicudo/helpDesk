import { useState } from 'react';
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
import { Loader2, Save } from 'lucide-react';

export default function Settings() {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  
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

  // Email Templates State
  const [emailTemplates, setEmailTemplates] = useState({
    newTicketTemplate: 'Olá {cliente},\n\nSeu chamado "{assunto}" foi aberto com sucesso.\nNúmero do Chamado: {id}\n\nNós entraremos em contato em breve.\n\nAtenciosamente,\nEquipe de Suporte',
    ticketUpdateTemplate: 'Olá {cliente},\n\nSeu chamado "{assunto}" foi atualizado.\nStatus atual: {status}\n\nPara mais detalhes, acesse seu painel.\n\nAtenciosamente,\nEquipe de Suporte',
    ticketResolutionTemplate: 'Olá {cliente},\n\nSeu chamado "{assunto}" foi resolvido.\n\nAgradecemos seu contato.\n\nAtenciosamente,\nEquipe de Suporte'
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
              <CardHeader>
                <CardTitle>Templates de Email</CardTitle>
                <CardDescription>
                  Personalize os templates de email enviados pelo sistema.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
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
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <Label htmlFor="ticketUpdateTemplate">
                      Template para Atualização de Chamado
                    </Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      Variáveis disponíveis: {'{cliente}'}, {'{assunto}'}, {'{id}'}, {'{status}'}, {'{comentário}'}
                    </p>
                    <Textarea 
                      id="ticketUpdateTemplate"
                      value={emailTemplates.ticketUpdateTemplate}
                      onChange={(e) => handleEmailTemplateChange('ticketUpdateTemplate', e.target.value)}
                      rows={6}
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <Label htmlFor="ticketResolutionTemplate">
                      Template para Resolução de Chamado
                    </Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      Variáveis disponíveis: {'{cliente}'}, {'{assunto}'}, {'{id}'}, {'{solução}'}
                    </p>
                    <Textarea 
                      id="ticketResolutionTemplate"
                      value={emailTemplates.ticketResolutionTemplate}
                      onChange={(e) => handleEmailTemplateChange('ticketResolutionTemplate', e.target.value)}
                      rows={6}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}