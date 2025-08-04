import { useState } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useTheme as useDarkTheme } from 'next-themes';
import { ThemeColorEditor } from '@/components/theme/theme-color-editor';
import { Loader2, Save, Shield, Zap, Palette, Globe, Settings, Monitor, Sun, Moon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function SettingsNew() {
  const { toast } = useToast();
  const { theme, setTheme: setDarkTheme, actualTheme } = useDarkTheme();
  const [isSaving, setIsSaving] = useState(false);
  
  // General Settings State
  const [generalSettings, setGeneralSettings] = useState({
    companyName: 'HelpDesk',
    companyLogo: '',
    primaryColor: '#2c3e50',
    secondaryColor: '#34495e',
    accentColor: '#3498db',
    emailSender: 'helpdesk@example.com',
    supportEmail: 'support@example.com',
    supportPhone: '',
    website: '',
    defaultLanguage: 'pt-BR',
    timezone: 'America/Sao_Paulo',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    currency: 'BRL',
    autoCloseTickets: false,
    autoCloseAfterDays: 7,
    allowCustomerReopenDays: 3,
    maxFileUploadSize: 10,
    allowedFileTypes: ['pdf', 'doc', 'docx', 'txt', 'png', 'jpg', 'jpeg'],
    businessHoursEnabled: true,
    businessStartTime: '09:00',
    businessEndTime: '18:00',
    businessDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    welcomeMessage: 'Bem-vindo ao nosso sistema de suporte!',
    signatureTemplate: 'Atenciosamente,\nEquipe de Suporte',
    ticketNumberPrefix: 'HD'
  });
  
  // Notification Settings State
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    newTicketNotifications: true,
    ticketUpdateNotifications: true,
    ticketAssignmentNotifications: true,
    ticketEscalationNotifications: true,
    customerReplyNotifications: true,
    internalNoteNotifications: false,
    dailyDigest: false,
    weeklyReport: true,
    monthlyReport: false,
    notificationSound: true,
    desktopNotifications: true,
    emailDigestTime: '09:00',
    escalationAfterHours: 24,
    reminderBeforeDeadline: 2,
    customerSatisfactionSurvey: true,
    surveyDelayAfterResolution: 1
  });

  // Security Settings State
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorRequired: false,
    sessionTimeout: 60,
    passwordMinLength: 8,
    passwordRequireUppercase: true,
    passwordRequireLowercase: true,
    passwordRequireNumbers: true,
    passwordRequireSpecialChars: true,
    loginAttemptLimit: 5,
    lockoutDuration: 30,
    allowedIpRanges: '',
    auditLogEnabled: true,
    dataRetentionDays: 365,
    anonymizeDataAfterDays: 1095,
    encryptAttachments: true,
    requireEmailVerification: true
  });

  // Automation Settings State
  const [automationSettings, setAutomationSettings] = useState({
    autoAssignTickets: false,
    autoAssignStrategy: 'round_robin',
    autoEscalateTickets: true,
    autoTagTickets: true,
    spamFiltering: true,
    duplicateDetection: true,
    duplicateThreshold: 0.8,
    autoResponseEnabled: true,
    autoResponseMessage: 'Obrigado por entrar em contato. Recebemos sua solicitação e responderemos em breve.',
    workflowAutomation: false,
    slaTracking: true,
    slaTargets: {
      high: { responseTime: 1, resolutionTime: 4 },
      medium: { responseTime: 4, resolutionTime: 24 },
      low: { responseTime: 8, resolutionTime: 72 }
    }
  });

  // Customization Settings State
  const [customizationSettings, setCustomizationSettings] = useState({
    customFields: [],
    ticketStatuses: ['open', 'in_progress', 'pending', 'resolved', 'closed'],
    ticketPriorities: ['low', 'medium', 'high', 'urgent'],
    ticketCategories: ['technical', 'billing', 'general', 'feature_request'],
    customCss: '',
    logoPosition: 'left',
    sidebarCollapsed: false,
    showTicketNumbers: true,
    customerPortalEnabled: true,
    customerPortalUrl: '',
    knowledgeBaseEnabled: true,
    chatBotEnabled: false,
    chatBotWelcomeMessage: 'Olá! Como posso ajudar você hoje?'
  });

  // Integration Settings State  
  const [integrationSettings, setIntegrationSettings] = useState({
    slackIntegration: false,
    slackWebhookUrl: '',
    slackChannel: '#helpdesk',
    discordIntegration: false,
    discordWebhookUrl: '',
    teamsIntegration: false,
    teamsWebhookUrl: '',
    zapierIntegration: false,
    zapierApiKey: '',
    googleWorkspaceIntegration: false,
    microsoftOfficeIntegration: false,
    jiraIntegration: false,
    jiraUrl: '',
    jiraApiKey: '',
    githubIntegration: false,
    githubToken: '',
    webhookEndpoints: [],
    apiRateLimit: 1000,
    apiKeyRotationDays: 90
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

  // Handle security settings changes
  const handleSecuritySettingChange = (field: string, value: any) => {
    setSecuritySettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle automation settings changes
  const handleAutomationSettingChange = (field: string, value: any) => {
    setAutomationSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle customization settings changes
  const handleCustomizationSettingChange = (field: string, value: any) => {
    setCustomizationSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle integration settings changes
  const handleIntegrationSettingChange = (field: string, value: any) => {
    setIntegrationSettings(prev => ({
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
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="general">Geral</TabsTrigger>
              <TabsTrigger value="notifications">Notificações</TabsTrigger>
              <TabsTrigger value="security">Segurança</TabsTrigger>
              <TabsTrigger value="automation">Automação</TabsTrigger>
              <TabsTrigger value="customization">Personalização</TabsTrigger>
              <TabsTrigger value="integrations">Integrações</TabsTrigger>
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
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Configurações Gerais
                </CardTitle>
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
                    <Label htmlFor="website">Website</Label>
                    <Input 
                      id="website" 
                      name="website"
                      value={generalSettings.website}
                      onChange={handleGeneralSettingChange}
                      placeholder="https://example.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="supportPhone">Telefone de Suporte</Label>
                    <Input 
                      id="supportPhone" 
                      name="supportPhone"
                      value={generalSettings.supportPhone}
                      onChange={handleGeneralSettingChange}
                      placeholder="+55 11 99999-9999"
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
                        type="color"
                        className="w-20"
                      />
                      <Input 
                        value={generalSettings.primaryColor}
                        onChange={handleGeneralSettingChange}
                        className="flex-1"
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

                  <div className="space-y-2">
                    <Label htmlFor="defaultLanguage">Idioma Padrão</Label>
                    <Select 
                      value={generalSettings.defaultLanguage}
                      onValueChange={(value) => setGeneralSettings(prev => ({ ...prev, defaultLanguage: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
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
                      <SelectTrigger>
                        <SelectValue />
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

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Configurações de Tickets</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="autoCloseTickets">Fechamento Automático</Label>
                        <p className="text-sm text-muted-foreground">
                          Fechar automaticamente tickets resolvidos
                        </p>
                      </div>
                      <Switch 
                        id="autoCloseTickets"
                        checked={generalSettings.autoCloseTickets}
                        onCheckedChange={(checked) => setGeneralSettings(prev => ({ ...prev, autoCloseTickets: checked }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="ticketNumberPrefix">Prefixo dos Tickets</Label>
                      <Input 
                        id="ticketNumberPrefix" 
                        name="ticketNumberPrefix"
                        value={generalSettings.ticketNumberPrefix}
                        onChange={handleGeneralSettingChange}
                        placeholder="HD"
                        maxLength={5}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card className="bg-card border-border">
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
                      <Label htmlFor="emailNotifications">Notificações por Email</Label>
                      <p className="text-sm text-muted-foreground">
                        Enviar notificações por email
                      </p>
                    </div>
                    <Switch 
                      id="emailNotifications"
                      checked={notificationSettings.emailNotifications}
                      onCheckedChange={(checked) => handleNotificationToggle('emailNotifications', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="pushNotifications">Notificações Push</Label>
                      <p className="text-sm text-muted-foreground">
                        Notificações no navegador
                      </p>
                    </div>
                    <Switch 
                      id="pushNotifications"
                      checked={notificationSettings.pushNotifications}
                      onCheckedChange={(checked) => handleNotificationToggle('pushNotifications', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="dailyDigest">Resumo Diário</Label>
                      <p className="text-sm text-muted-foreground">
                        Enviar resumo diário dos tickets
                      </p>
                    </div>
                    <Switch 
                      id="dailyDigest"
                      checked={notificationSettings.dailyDigest}
                      onCheckedChange={(checked) => handleNotificationToggle('dailyDigest', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="customerSatisfactionSurvey">Pesquisa de Satisfação</Label>
                      <p className="text-sm text-muted-foreground">
                        Enviar pesquisa após resolução
                      </p>
                    </div>
                    <Switch 
                      id="customerSatisfactionSurvey"
                      checked={notificationSettings.customerSatisfactionSurvey}
                      onCheckedChange={(checked) => handleNotificationToggle('customerSatisfactionSurvey', checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Configurações de Segurança
                </CardTitle>
                <CardDescription>
                  Configure as políticas de segurança e autenticação.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="twoFactorRequired">Autenticação de Dois Fatores</Label>
                      <p className="text-sm text-muted-foreground">
                        Exigir 2FA para todos os usuários
                      </p>
                    </div>
                    <Switch 
                      id="twoFactorRequired"
                      checked={securitySettings.twoFactorRequired}
                      onCheckedChange={(checked) => handleSecuritySettingChange('twoFactorRequired', checked)}
                    />
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="sessionTimeout">Timeout de Sessão (min)</Label>
                      <Input 
                        id="sessionTimeout" 
                        type="number"
                        value={securitySettings.sessionTimeout}
                        onChange={(e) => handleSecuritySettingChange('sessionTimeout', parseInt(e.target.value))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="passwordMinLength">Tamanho Mínimo da Senha</Label>
                      <Input 
                        id="passwordMinLength" 
                        type="number"
                        value={securitySettings.passwordMinLength}
                        onChange={(e) => handleSecuritySettingChange('passwordMinLength', parseInt(e.target.value))}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="auditLogEnabled">Log de Auditoria</Label>
                      <p className="text-sm text-muted-foreground">
                        Registrar todas as ações dos usuários
                      </p>
                    </div>
                    <Switch 
                      id="auditLogEnabled"
                      checked={securitySettings.auditLogEnabled}
                      onCheckedChange={(checked) => handleSecuritySettingChange('auditLogEnabled', checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Automation Tab */}
          <TabsContent value="automation">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Configurações de Automação
                </CardTitle>
                <CardDescription>
                  Configure regras de automação e fluxos de trabalho.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="autoAssignTickets">Atribuição Automática</Label>
                      <p className="text-sm text-muted-foreground">
                        Atribuir novos tickets automaticamente
                      </p>
                    </div>
                    <Switch 
                      id="autoAssignTickets"
                      checked={automationSettings.autoAssignTickets}
                      onCheckedChange={(checked) => handleAutomationSettingChange('autoAssignTickets', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="autoResponseEnabled">Resposta Automática</Label>
                      <p className="text-sm text-muted-foreground">
                        Enviar confirmação automática
                      </p>
                    </div>
                    <Switch 
                      id="autoResponseEnabled"
                      checked={automationSettings.autoResponseEnabled}
                      onCheckedChange={(checked) => handleAutomationSettingChange('autoResponseEnabled', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="slaTracking">Rastreamento de SLA</Label>
                      <p className="text-sm text-muted-foreground">
                        Monitorar tempos de resposta
                      </p>
                    </div>
                    <Switch 
                      id="slaTracking"
                      checked={automationSettings.slaTracking}
                      onCheckedChange={(checked) => handleAutomationSettingChange('slaTracking', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="spamFiltering">Filtro de Spam</Label>
                      <p className="text-sm text-muted-foreground">
                        Detectar e filtrar mensagens de spam
                      </p>
                    </div>
                    <Switch 
                      id="spamFiltering"
                      checked={automationSettings.spamFiltering}
                      onCheckedChange={(checked) => handleAutomationSettingChange('spamFiltering', checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Customization Tab */}
          <TabsContent value="customization">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Personalização
                </CardTitle>
                <CardDescription>
                  Personalize a aparência e funcionalidades do sistema.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Aparência</h3>
                  
                  <div className="space-y-3">
                    <Label>Tema da Interface</Label>
                    <div className="grid grid-cols-3 gap-3">
                      <Button
                        type="button"
                        variant={theme === 'light' ? 'default' : 'outline'}
                        size="sm"
                        className="flex flex-col h-auto p-4 space-y-2"
                        onClick={() => setDarkTheme('light')}
                      >
                        <Sun className="h-6 w-6" />
                        <span className="text-xs">Claro</span>
                      </Button>
                      
                      <Button
                        type="button"
                        variant={theme === 'dark' ? 'default' : 'outline'}
                        size="sm"
                        className="flex flex-col h-auto p-4 space-y-2"
                        onClick={() => setDarkTheme('dark')}
                      >
                        <Moon className="h-6 w-6" />
                        <span className="text-xs">Escuro</span>
                      </Button>
                      
                      <Button
                        type="button"
                        variant={theme === 'system' ? 'default' : 'outline'}
                        size="sm"
                        className="flex flex-col h-auto p-4 space-y-2"
                        onClick={() => setDarkTheme('system')}
                      >
                        <Monitor className="h-6 w-6" />
                        <span className="text-xs">Sistema</span>
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Tema atual: {actualTheme === 'dark' ? 'Escuro' : 'Claro'}
                      {theme === 'system' && ' (automático)'}
                    </p>
                  </div>

                  <Separator />

                  <h3 className="text-lg font-medium">Funcionalidades</h3>
                  
                  <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="customerPortalEnabled">Portal do Cliente</Label>
                      <p className="text-sm text-muted-foreground">
                        Permitir acesso online aos tickets
                      </p>
                    </div>
                    <Switch 
                      id="customerPortalEnabled"
                      checked={customizationSettings.customerPortalEnabled}
                      onCheckedChange={(checked) => handleCustomizationSettingChange('customerPortalEnabled', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="knowledgeBaseEnabled">Base de Conhecimento</Label>
                      <p className="text-sm text-muted-foreground">
                        Artigos de autoatendimento
                      </p>
                    </div>
                    <Switch 
                      id="knowledgeBaseEnabled"
                      checked={customizationSettings.knowledgeBaseEnabled}
                      onCheckedChange={(checked) => handleCustomizationSettingChange('knowledgeBaseEnabled', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="chatBotEnabled">ChatBot</Label>
                      <p className="text-sm text-muted-foreground">
                        Assistente virtual para atendimento
                      </p>
                    </div>
                    <Switch 
                      id="chatBotEnabled"
                      checked={customizationSettings.chatBotEnabled}
                      onCheckedChange={(checked) => handleCustomizationSettingChange('chatBotEnabled', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="showTicketNumbers">Mostrar Números dos Tickets</Label>
                      <p className="text-sm text-muted-foreground">
                        Exibir numeração dos tickets
                      </p>
                    </div>
                    <Switch 
                      id="showTicketNumbers"
                      checked={customizationSettings.showTicketNumbers}
                      onCheckedChange={(checked) => handleCustomizationSettingChange('showTicketNumbers', checked)}
                    />
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="logoPosition">Posição do Logo</Label>
                    <Select 
                      value={customizationSettings.logoPosition}
                      onValueChange={(value) => handleCustomizationSettingChange('logoPosition', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="left">Esquerda</SelectItem>
                        <SelectItem value="center">Centro</SelectItem>
                        <SelectItem value="right">Direita</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  </div>
                </div>
                
                <Separator />
                
                {/* Theme Color Editor */}
                <ThemeColorEditor />
                
              </CardContent>
            </Card>
          </TabsContent>

          {/* Integrations Tab */}
          <TabsContent value="integrations">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Integrações
                </CardTitle>
                <CardDescription>
                  Configure integrações com serviços externos.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Notificações em Equipe</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="slackIntegration">Slack</Label>
                        <p className="text-sm text-muted-foreground">
                          Notificações via Slack
                        </p>
                      </div>
                      <Switch 
                        id="slackIntegration"
                        checked={integrationSettings.slackIntegration}
                        onCheckedChange={(checked) => handleIntegrationSettingChange('slackIntegration', checked)}
                      />
                    </div>

                    {integrationSettings.slackIntegration && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="slackWebhookUrl">Webhook URL</Label>
                          <Input 
                            id="slackWebhookUrl"
                            placeholder="https://hooks.slack.com/..."
                            value={integrationSettings.slackWebhookUrl}
                            onChange={(e) => handleIntegrationSettingChange('slackWebhookUrl', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="slackChannel">Canal</Label>
                          <Input 
                            id="slackChannel"
                            placeholder="#helpdesk"
                            value={integrationSettings.slackChannel}
                            onChange={(e) => handleIntegrationSettingChange('slackChannel', e.target.value)}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="discordIntegration">Discord</Label>
                        <p className="text-sm text-muted-foreground">
                          Notificações via Discord
                        </p>
                      </div>
                      <Switch 
                        id="discordIntegration"
                        checked={integrationSettings.discordIntegration}
                        onCheckedChange={(checked) => handleIntegrationSettingChange('discordIntegration', checked)}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Ferramentas de Desenvolvimento</h3>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="jiraIntegration">Jira</Label>
                        <p className="text-sm text-muted-foreground">
                          Sincronização com Jira
                        </p>
                      </div>
                      <Switch 
                        id="jiraIntegration"
                        checked={integrationSettings.jiraIntegration}
                        onCheckedChange={(checked) => handleIntegrationSettingChange('jiraIntegration', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="githubIntegration">GitHub</Label>
                        <p className="text-sm text-muted-foreground">
                          Integração com repositórios
                        </p>
                      </div>
                      <Switch 
                        id="githubIntegration"
                        checked={integrationSettings.githubIntegration}
                        onCheckedChange={(checked) => handleIntegrationSettingChange('githubIntegration', checked)}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">API e Webhooks</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="apiRateLimit">Limite de Taxa da API (req/h)</Label>
                        <Input 
                          id="apiRateLimit" 
                          type="number"
                          value={integrationSettings.apiRateLimit}
                          onChange={(e) => handleIntegrationSettingChange('apiRateLimit', parseInt(e.target.value))}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="apiKeyRotationDays">Rotação de API Keys (dias)</Label>
                        <Input 
                          id="apiKeyRotationDays" 
                          type="number"
                          value={integrationSettings.apiKeyRotationDays}
                          onChange={(e) => handleIntegrationSettingChange('apiKeyRotationDays', parseInt(e.target.value))}
                        />
                      </div>
                    </div>
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
