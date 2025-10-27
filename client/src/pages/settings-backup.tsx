import { useState, useEffect } from 'react';
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
import { useTheme } from '@/hooks/use-theme-provider';
import { useTheme as useDarkTheme } from 'next-themes';
import { Loader2, Save, Shield, Zap, Palette, Globe, Settings, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function SettingsNew() {
  const { toast } = useToast();
  const { setTheme, resetTheme, applyTheme } = useTheme();
  const { theme, setTheme: setDarkTheme, actualTheme } = useDarkTheme();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
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
    
    // Aplica as cores em tempo real
    if (name === 'primaryColor' || name === 'secondaryColor' || name === 'accentColor') {
      const updatedSettings = { ...generalSettings, [name]: value };
      applyTheme({
        primaryColor: updatedSettings.primaryColor,
        secondaryColor: updatedSettings.secondaryColor,
        accentColor: updatedSettings.accentColor,
      });
    }
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

  // Load settings from API
  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/settings');
      
      if (response.ok) {
        const data = await response.json();
        
        // Update state with loaded settings
        if (data.general) setGeneralSettings(prev => ({ ...prev, ...data.general }));
        if (data.notifications) setNotificationSettings(prev => ({ ...prev, ...data.notifications }));
        if (data.security) setSecuritySettings(prev => ({ ...prev, ...data.security }));
        if (data.automation) setAutomationSettings(prev => ({ ...prev, ...data.automation }));
        if (data.customization) setCustomizationSettings(prev => ({ ...prev, ...data.customization }));
        if (data.integrations) setIntegrationSettings(prev => ({ ...prev, ...data.integrations }));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: "Erro ao carregar configurações",
        description: "Não foi possível carregar as configurações do servidor",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Save settings to API
  const saveSettings = async () => {
    try {
      setIsSaving(true);
      
      const settingsData = {
        general: generalSettings,
        notifications: notificationSettings,
        security: securitySettings,
        automation: automationSettings,
        customization: customizationSettings,
        integrations: integrationSettings
      };
      
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settingsData)
      });
      
      if (response.ok) {
        // Aplica o tema salvo
        setTheme({
          primaryColor: generalSettings.primaryColor,
          secondaryColor: generalSettings.secondaryColor,
          accentColor: generalSettings.accentColor,
        });
        
        toast({
          title: "Configurações salvas",
          description: "Suas configurações foram atualizadas com sucesso",
        });
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Erro ao salvar configurações",
        description: "Não foi possível salvar as configurações",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Load settings on component mount
  useEffect(() => {
    loadSettings();
  }, []);

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveSettings();
  };

  return (
    <AppLayout title="Configurações">
      <div className="p-6 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Carregando configurações...</span>
            </div>
          </div>
        ) : (
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
            <Card>
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
                        name="primaryColor"
                        value={generalSettings.primaryColor}
                        onChange={handleGeneralSettingChange}
                        className="flex-1"
                        placeholder="#2c3e50"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="secondaryColor">Cor Secundária</Label>
                    <div className="flex gap-3">
                      <Input 
                        id="secondaryColor" 
                        name="secondaryColor"
                        value={generalSettings.secondaryColor}
                        onChange={handleGeneralSettingChange}
                        type="color"
                        className="w-20"
                      />
                      <Input 
                        name="secondaryColor"
                        value={generalSettings.secondaryColor}
                        onChange={handleGeneralSettingChange}
                        className="flex-1"
                        placeholder="#34495e"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="accentColor">Cor de Destaque</Label>
                    <div className="flex gap-3">
                      <Input 
                        id="accentColor" 
                        name="accentColor"
                        value={generalSettings.accentColor}
                        onChange={handleGeneralSettingChange}
                        type="color"
                        className="w-20"
                      />
                      <Input 
                        name="accentColor"
                        value={generalSettings.accentColor}
                        onChange={handleGeneralSettingChange}
                        className="flex-1"
                        placeholder="#3498db"
                      />
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const defaultColors = {
                            primaryColor: '#2c3e50',
                            secondaryColor: '#34495e',
                            accentColor: '#3498db'
                          };
                          setGeneralSettings(prev => ({ ...prev, ...defaultColors }));
                          applyTheme(defaultColors);
                        }}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Resetar Cores
                      </Button>
                    </div>
                    
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Temas Rápidos</Label>
                      <div className="grid grid-cols-4 gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-auto p-2 flex flex-col gap-1"
                          onClick={() => {
                            const colors = { primaryColor: '#3b82f6', secondaryColor: '#64748b', accentColor: '#06b6d4' };
                            setGeneralSettings(prev => ({ ...prev, ...colors }));
                            applyTheme(colors);
                          }}
                        >
                          <div className="flex gap-1">
                            <div className="w-3 h-3 bg-blue-500 rounded-full" />
                            <div className="w-3 h-3 bg-slate-500 rounded-full" />
                            <div className="w-3 h-3 bg-cyan-500 rounded-full" />
                          </div>
                          <span className="text-xs">Azul</span>
                        </Button>
                        
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-auto p-2 flex flex-col gap-1"
                          onClick={() => {
                            const colors = { primaryColor: '#059669', secondaryColor: '#374151', accentColor: '#10b981' };
                            setGeneralSettings(prev => ({ ...prev, ...colors }));
                            applyTheme(colors);
                          }}
                        >
                          <div className="flex gap-1">
                            <div className="w-3 h-3 bg-emerald-600 rounded-full" />
                            <div className="w-3 h-3 bg-gray-700 rounded-full" />
                            <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                          </div>
                          <span className="text-xs">Verde</span>
                        </Button>
                        
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-auto p-2 flex flex-col gap-1"
                          onClick={() => {
                            const colors = { primaryColor: '#7c3aed', secondaryColor: '#6b7280', accentColor: '#a855f7' };
                            setGeneralSettings(prev => ({ ...prev, ...colors }));
                            applyTheme(colors);
                          }}
                        >
                          <div className="flex gap-1">
                            <div className="w-3 h-3 bg-violet-600 rounded-full" />
                            <div className="w-3 h-3 bg-gray-500 rounded-full" />
                            <div className="w-3 h-3 bg-purple-500 rounded-full" />
                          </div>
                          <span className="text-xs">Roxo</span>
                        </Button>
                        
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-auto p-2 flex flex-col gap-1"
                          onClick={() => {
                            const colors = { primaryColor: '#dc2626', secondaryColor: '#374151', accentColor: '#f97316' };
                            setGeneralSettings(prev => ({ ...prev, ...colors }));
                            applyTheme(colors);
                          }}
                        >
                          <div className="flex gap-1">
                            <div className="w-3 h-3 bg-red-600 rounded-full" />
                            <div className="w-3 h-3 bg-gray-700 rounded-full" />
                            <div className="w-3 h-3 bg-orange-500 rounded-full" />
                          </div>
                          <span className="text-xs">Vermelho</span>
                        </Button>
                      </div>
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
                  <h3 className="text-lg font-medium">Preview das Cores</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg border">
                      <h4 className="font-medium mb-2">Cor Principal</h4>
                      <div className="space-y-2">
                        <Button className="w-full">Botão Principal</Button>
                        <div className="h-8 bg-primary rounded" />
                        <p className="text-sm text-muted-foreground">Usada em botões primários, links e destaques</p>
                      </div>
                    </div>
                    
                    <div className="p-4 rounded-lg border">
                      <h4 className="font-medium mb-2">Cor Secundária</h4>
                      <div className="space-y-2">
                        <Button variant="secondary" className="w-full">Botão Secundário</Button>
                        <div className="h-8 bg-secondary rounded" />
                        <p className="text-sm text-muted-foreground">Usada em botões secundários e áreas de destaque suave</p>
                      </div>
                    </div>
                    
                    <div className="p-4 rounded-lg border">
                      <h4 className="font-medium mb-2">Cor de Destaque</h4>
                      <div className="space-y-2">
                        <Button variant="outline" className="w-full border-accent text-accent">Botão de Destaque</Button>
                        <div className="h-8 bg-accent rounded" />
                        <p className="text-sm text-muted-foreground">Usada para elementos de apoio e decoração</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-muted">
                    <h4 className="font-medium mb-2">Exemplo de Card com as Cores</h4>
                    <div className="bg-card p-4 rounded-lg border">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="text-primary font-semibold">Ticket #12345</h5>
                        <Badge className="bg-accent/10 text-accent border-accent">Em Progresso</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        Este é um exemplo de como as cores personalizadas são aplicadas em componentes do sistema.
                      </p>
                      <div className="flex gap-2">
                        <Button size="sm">Ação Principal</Button>
                        <Button size="sm" variant="secondary">Ação Secundária</Button>
                      </div>
                    </div>
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
            <Card>
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
            <Card>
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
            <Card>
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
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label>Tema da Interface</Label>
                      <div className="grid grid-cols-3 gap-2">
                        <Button
                          type="button"
                          variant={theme === 'light' ? 'default' : 'outline'}
                          size="sm"
                          className="flex flex-col h-auto p-3"
                          onClick={() => setDarkTheme('light')}
                        >
                          <div className="w-8 h-6 bg-white border-2 border-gray-300 rounded-sm mb-1" />
                          <span className="text-xs">Claro</span>
                        </Button>
                        
                        <Button
                          type="button"
                          variant={theme === 'dark' ? 'default' : 'outline'}
                          size="sm"
                          className="flex flex-col h-auto p-3"
                          onClick={() => setDarkTheme('dark')}
                        >
                          <div className="w-8 h-6 bg-gray-900 border-2 border-gray-600 rounded-sm mb-1" />
                          <span className="text-xs">Escuro</span>
                        </Button>
                        
                        <Button
                          type="button"
                          variant={theme === 'system' ? 'default' : 'outline'}
                          size="sm"
                          className="flex flex-col h-auto p-3"
                          onClick={() => setDarkTheme('system')}
                        >
                          <div className="w-8 h-6 bg-gradient-to-r from-white to-gray-900 border-2 border-gray-400 rounded-sm mb-1" />
                          <span className="text-xs">Sistema</span>
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Tema atual: {actualTheme === 'dark' ? 'Escuro' : 'Claro'}
                        {theme === 'system' && ' (automático)'}
                      </p>
                    </div>
                    
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
              </CardContent>
            </Card>
          </TabsContent>

          {/* Integrations Tab */}
          <TabsContent value="integrations">
            <Card>
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
        )}
      </div>
    </AppLayout>
  );
}
