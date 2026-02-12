import { useState } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTheme as useDarkTheme } from 'next-themes';
import { ThemeColorEditor } from '@/components/theme/theme-color-editor';
import { Palette, Monitor, Sun, Moon, Ticket, Clock, Calendar, AlertTriangle, Plus, Edit3, Trash2, GripVertical, Settings2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTicketStatusConfig } from '@/hooks/use-ticket-status-config';
import type { TicketStatus } from '@shared/schema/ticket-status';
import TagsPage from './tags';
import ResponseTemplatesPage from './response-templates';
import { AutomationTriggersPage } from './automation-triggers';
import { ServicesManagementPage } from './services-management';
import { useAuth } from '@/hooks/use-auth';

type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

interface BusinessHours {
  enabled: boolean;
  start: string;
  end: string;
}

export default function SettingsNew() {
  const { theme, setTheme: setDarkTheme, actualTheme } = useDarkTheme();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Check if user is admin
  const isAdmin = user?.role === 'admin';
  
  // State for active tab - prevents reset when components re-render
  const [activeTab, setActiveTab] = useState(isAdmin ? "appearance" : "services");
  
  // Use hook for ticket status management
  const { 
    statuses: ticketStatuses, 
    saveStatus, 
    deleteStatus,
    isLoading: statusesLoading 
  } = useTicketStatusConfig();

  const [editingStatus, setEditingStatus] = useState<TicketStatus | null>(null);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [statusToDelete, setStatusToDelete] = useState<string | null>(null);
  
  // SLA Settings State
  const [slaSettings, setSlaSettings] = useState({
    businessHoursOnly: true,
    timezone: 'America/Sao_Paulo',
    businessHours: {
      monday: { enabled: true, start: '08:00', end: '18:00' },
      tuesday: { enabled: true, start: '08:00', end: '18:00' },
      wednesday: { enabled: true, start: '08:00', end: '18:00' },
      thursday: { enabled: true, start: '08:00', end: '18:00' },
      friday: { enabled: true, start: '08:00', end: '18:00' },
      saturday: { enabled: false, start: '09:00', end: '13:00' },
      sunday: { enabled: false, start: '09:00', end: '13:00' }
    } as Record<DayOfWeek, BusinessHours>,
    escalationEnabled: true,
    autoAssignment: false,
    pauseOnPending: true,
    pauseOnClientResponse: false
  });

  const dayLabels: Record<DayOfWeek, string> = {
    monday: 'Segunda-feira',
    tuesday: 'Terça-feira',
    wednesday: 'Quarta-feira',
    thursday: 'Quinta-feira',
    friday: 'Sexta-feira',
    saturday: 'Sábado',
    sunday: 'Domingo'
  };

  const handleBusinessHourToggle = (day: DayOfWeek, enabled: boolean) => {
    setSlaSettings(prev => ({
      ...prev,
      businessHours: {
        ...prev.businessHours,
        [day]: {
          ...prev.businessHours[day],
          enabled
        }
      }
    }));
  };

  const handleBusinessHourTime = (day: DayOfWeek, field: 'start' | 'end', value: string) => {
    setSlaSettings(prev => ({
      ...prev,
      businessHours: {
        ...prev.businessHours,
        [day]: {
          ...prev.businessHours[day],
          [field]: value
        }
      }
    }));
  };

  const handleSaveSettings = () => {
    // TODO: Implement API call to save settings
    toast({
      title: "Configurações salvas",
      description: "As configurações de SLA foram atualizadas com sucesso.",
    });
  };

  // Ticket Status Handlers
  const handleAddStatus = () => {
    setEditingStatus({
      id: `status_${Date.now()}`,
      name: '',
      color: '#3b82f6',
      order: ticketStatuses.length + 1,
      isClosedStatus: false,
      pauseSla: false,
      autoCloseAfterDays: null,
      requiresResponse: true,
      notifyCustomer: true
    });
    setShowStatusDialog(true);
  };

  const handleEditStatus = (status: TicketStatus) => {
    setEditingStatus({ ...status });
    setShowStatusDialog(true);
  };

  const handleDeleteStatus = (statusId: string) => {
    setStatusToDelete(statusId);
    setShowDeleteDialog(true);
  };

  const confirmDeleteStatus = () => {
    if (statusToDelete) {
      try {
        deleteStatus(statusToDelete);
        toast({
          title: "Status removido",
          description: "O status foi removido com sucesso.",
        });
      } catch (error) {
        toast({
          title: "Erro",
          description: "Não foi possível remover o status.",
          variant: "destructive"
        });
      }
    }
    setShowDeleteDialog(false);
    setStatusToDelete(null);
  };

  const handleSaveStatus = () => {
    if (!editingStatus) return;

    if (!editingStatus.name.trim()) {
      toast({
        title: "Erro",
        description: "O nome do status é obrigatório.",
        variant: "destructive"
      });
      return;
    }

    try {
      const isNew = !ticketStatuses.find(s => s.id === editingStatus.id);
      saveStatus(editingStatus);
      
      toast({
        title: isNew ? "Status criado" : "Status atualizado",
        description: `O status "${editingStatus.name}" foi ${isNew ? 'criado' : 'atualizado'} com sucesso.`,
      });

      setShowStatusDialog(false);
      setEditingStatus(null);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível salvar o status.",
        variant: "destructive"
      });
    }
  };

  return (
    <AppLayout title="Configurações">
      <div className="p-6 space-y-6">
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center mb-4">
            <TabsList className={`grid w-full max-w-3xl ${isAdmin ? 'grid-cols-5' : 'grid-cols-3'}`}>
              {isAdmin && (
                <TabsTrigger value="appearance">
                  <Palette className="h-4 w-4 mr-2" />
                  Aparência
                </TabsTrigger>
              )}
              <TabsTrigger value="services">
                <Settings2 className="h-4 w-4 mr-2" />
                Serviços
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger value="sla">
                  <Clock className="h-4 w-4 mr-2" />
                  SLA
                </TabsTrigger>
              )}
              <TabsTrigger value="tickets">
                <Ticket className="h-4 w-4 mr-2" />
                Tickets
              </TabsTrigger>
              <TabsTrigger value="triggers">
                <Zap className="h-4 w-4 mr-2" />
                Gatilhos
              </TabsTrigger>
            </TabsList>
          </div>
          
          {/* Services Tab */}
          <TabsContent value="services">
            <ServicesManagementPage />
          </TabsContent>

          {/* Appearance Tab - Admin Only */}
          {isAdmin && (
            <TabsContent value="appearance">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Personalização de Aparência
                  </CardTitle>
                  <CardDescription>
                    Personalize o tema e cores do sistema.
                  </CardDescription>
                </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Tema da Interface</h3>
                  
                  <div className="space-y-3">
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
                </div>
                
                <Separator />
                
                {/* Theme Color Editor */}
                <ThemeColorEditor />
                
              </CardContent>
            </Card>
          </TabsContent>
          )}

          {/* SLA Configuration Tab - Admin Only */}
          {isAdmin && (
            <TabsContent value="sla">
              <div className="space-y-6">
              {/* General SLA Settings */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Configurações Gerais de SLA
                  </CardTitle>
                  <CardDescription>
                    Configure o comportamento global do sistema de SLA.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="businessHoursOnly">Contar Apenas Horário Comercial</Label>
                        <p className="text-sm text-muted-foreground">
                          SLA é pausado fora do horário comercial
                        </p>
                      </div>
                      <Switch 
                        id="businessHoursOnly"
                        checked={slaSettings.businessHoursOnly}
                        onCheckedChange={(checked) => setSlaSettings(prev => ({ ...prev, businessHoursOnly: checked }))}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="escalationEnabled">Escalonamento Automático</Label>
                        <p className="text-sm text-muted-foreground">
                          Escalonar tickets automaticamente quando SLA estiver próximo
                        </p>
                      </div>
                      <Switch 
                        id="escalationEnabled"
                        checked={slaSettings.escalationEnabled}
                        onCheckedChange={(checked) => setSlaSettings(prev => ({ ...prev, escalationEnabled: checked }))}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="pauseOnPending">Pausar em Status "Pendente"</Label>
                        <p className="text-sm text-muted-foreground">
                          SLA é pausado quando ticket está aguardando resposta
                        </p>
                      </div>
                      <Switch 
                        id="pauseOnPending"
                        checked={slaSettings.pauseOnPending}
                        onCheckedChange={(checked) => setSlaSettings(prev => ({ ...prev, pauseOnPending: checked }))}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="pauseOnClientResponse">Pausar ao Aguardar Cliente</Label>
                        <p className="text-sm text-muted-foreground">
                          SLA é pausado quando aguardando resposta do cliente
                        </p>
                      </div>
                      <Switch 
                        id="pauseOnClientResponse"
                        checked={slaSettings.pauseOnClientResponse}
                        onCheckedChange={(checked) => setSlaSettings(prev => ({ ...prev, pauseOnClientResponse: checked }))}
                      />
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label htmlFor="timezone">Fuso Horário</Label>
                      <Select 
                        value={slaSettings.timezone}
                        onValueChange={(value) => setSlaSettings(prev => ({ ...prev, timezone: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="America/Sao_Paulo">Brasília (GMT-3)</SelectItem>
                          <SelectItem value="America/Fortaleza">Fortaleza (GMT-3)</SelectItem>
                          <SelectItem value="America/Manaus">Manaus (GMT-4)</SelectItem>
                          <SelectItem value="America/Noronha">Fernando de Noronha (GMT-2)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleSaveSettings}>
                      Salvar Configurações
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Business Hours Configuration */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Horário Comercial
                  </CardTitle>
                  <CardDescription>
                    Defina os dias e horários de funcionamento para cálculo de SLA.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(Object.keys(slaSettings.businessHours) as DayOfWeek[]).map((day) => {
                    const hours = slaSettings.businessHours[day];
                    return (
                      <div key={day} className="flex items-center gap-4 p-3 rounded-lg border bg-muted/30">
                        <div className="flex items-center gap-3 flex-1">
                          <Switch
                            checked={hours.enabled}
                            onCheckedChange={(checked) => handleBusinessHourToggle(day, checked)}
                          />
                          <Label className="min-w-[120px] cursor-pointer">
                            {dayLabels[day]}
                          </Label>
                        </div>
                        
                        {hours.enabled && (
                          <div className="flex items-center gap-2">
                            <Input
                              type="time"
                              value={hours.start}
                              onChange={(e) => handleBusinessHourTime(day, 'start', e.target.value)}
                              className="w-32"
                            />
                            <span className="text-muted-foreground">até</span>
                            <Input
                              type="time"
                              value={hours.end}
                              onChange={(e) => handleBusinessHourTime(day, 'end', e.target.value)}
                              className="w-32"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <div className="flex justify-end pt-4">
                    <Button onClick={handleSaveSettings}>
                      Salvar Horários
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* SLA Warning */}
              <Card className="bg-card border-border border-l-4 border-l-yellow-500">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        Configurações de Templates SLA
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Para configurar tempos de resposta e resolução por prioridade, acesse a{' '}
                        <a href="/sla/admin" className="text-primary hover:underline font-medium">
                          página de administração de SLA
                        </a>.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          )}

          {/* Tickets Tab: reúne Tags e Respostas Prontas (empilhados por linha) */}
          <TabsContent value="tickets">
            <div className="flex flex-col gap-6">
              {/* Ticket Status Configuration */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Settings2 className="h-5 w-5" />
                        Status do Kanban
                      </CardTitle>
                      <CardDescription>
                        Configure os status disponíveis no quadro Kanban e suas regras automáticas.
                      </CardDescription>
                    </div>
                    <Button onClick={handleAddStatus}>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Status
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {ticketStatuses.sort((a, b) => a.order - b.order).map((status) => (
                    <div 
                      key={status.id}
                      className="flex items-center gap-3 p-4 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
                      
                      <div 
                        className="w-4 h-4 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: status.color }}
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{status.name}</p>
                          {status.isClosedStatus && (
                            <Badge variant="secondary" className="text-xs">Final</Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {status.pauseSla && (
                            <Badge variant="outline" className="text-xs">
                              Pausa SLA
                            </Badge>
                          )}
                          {status.autoCloseAfterDays && (
                            <Badge variant="outline" className="text-xs">
                              Fecha em {status.autoCloseAfterDays} dias
                            </Badge>
                          )}
                          {status.requiresResponse && (
                            <Badge variant="outline" className="text-xs">
                              Requer resposta
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditStatus(status)}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        {!['open', 'closed'].includes(status.id) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteStatus(status.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {ticketStatuses.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>Nenhum status configurado.</p>
                      <p className="text-sm mt-1">Clique em "Adicionar Status" para criar um novo.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardContent className="p-6">
                  <TagsPage />
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardContent className="p-6">
                  <ResponseTemplatesPage />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Triggers Tab */}
          <TabsContent value="triggers">
            <AutomationTriggersPage />
          </TabsContent>
        </Tabs>
      </div>

      {/* Status Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingStatus && ticketStatuses.find(s => s.id === editingStatus.id) 
                ? 'Editar Status' 
                : 'Adicionar Status'}
            </DialogTitle>
            <DialogDescription>
              Configure o nome, aparência e comportamento automático deste status.
            </DialogDescription>
          </DialogHeader>
          
          {editingStatus && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="status-name">Nome do Status *</Label>
                    <Input
                      id="status-name"
                      value={editingStatus.name}
                      onChange={(e) => setEditingStatus({ ...editingStatus, name: e.target.value })}
                      placeholder="Ex: Em Atendimento"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="status-color">Cor</Label>
                    <div className="flex gap-2">
                      <Input
                        id="status-color"
                        type="color"
                        value={editingStatus.color}
                        onChange={(e) => setEditingStatus({ ...editingStatus, color: e.target.value })}
                        className="w-20 h-10 cursor-pointer"
                      />
                      <Input
                        value={editingStatus.color}
                        onChange={(e) => setEditingStatus({ ...editingStatus, color: e.target.value })}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Behavior Settings */}
              <div className="space-y-4">
                <h3 className="font-medium">Comportamento e Regras</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="space-y-0.5">
                      <Label htmlFor="pause-sla">Pausar Contagem de SLA</Label>
                      <p className="text-sm text-muted-foreground">
                        O tempo de SLA para quando o ticket está neste status
                      </p>
                    </div>
                    <Switch
                      id="pause-sla"
                      checked={editingStatus.pauseSla}
                      onCheckedChange={(checked) => setEditingStatus({ ...editingStatus, pauseSla: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="space-y-0.5">
                      <Label htmlFor="requires-response">Requer Resposta do Suporte</Label>
                      <p className="text-sm text-muted-foreground">
                        O suporte precisa responder quando o ticket entra neste status
                      </p>
                    </div>
                    <Switch
                      id="requires-response"
                      checked={editingStatus.requiresResponse}
                      onCheckedChange={(checked) => setEditingStatus({ ...editingStatus, requiresResponse: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="space-y-0.5">
                      <Label htmlFor="notify-customer">Notificar Cliente</Label>
                      <p className="text-sm text-muted-foreground">
                        Enviar notificação por email quando o status mudar
                      </p>
                    </div>
                    <Switch
                      id="notify-customer"
                      checked={editingStatus.notifyCustomer}
                      onCheckedChange={(checked) => setEditingStatus({ ...editingStatus, notifyCustomer: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="space-y-0.5">
                      <Label htmlFor="is-closed">Status Final (Fechado)</Label>
                      <p className="text-sm text-muted-foreground">
                        Este é um status final onde o ticket é considerado encerrado
                      </p>
                    </div>
                    <Switch
                      id="is-closed"
                      checked={editingStatus.isClosedStatus}
                      onCheckedChange={(checked) => setEditingStatus({ ...editingStatus, isClosedStatus: checked })}
                    />
                  </div>

                  <div className="p-3 rounded-lg border space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="auto-close-enabled">Fechamento Automático</Label>
                        <p className="text-sm text-muted-foreground">
                          Fechar automaticamente após período sem resposta
                        </p>
                      </div>
                      <Switch
                        id="auto-close-enabled"
                        checked={editingStatus.autoCloseAfterDays !== null}
                        onCheckedChange={(checked) => 
                          setEditingStatus({ 
                            ...editingStatus, 
                            autoCloseAfterDays: checked ? 7 : null 
                          })
                        }
                      />
                    </div>
                    
                    {editingStatus.autoCloseAfterDays !== null && (
                      <div className="space-y-2">
                        <Label htmlFor="auto-close-days">Fechar após quantos dias?</Label>
                        <Input
                          id="auto-close-days"
                          type="number"
                          min="1"
                          max="365"
                          value={editingStatus.autoCloseAfterDays}
                          onChange={(e) => 
                            setEditingStatus({ 
                              ...editingStatus, 
                              autoCloseAfterDays: parseInt(e.target.value) || 1 
                            })
                          }
                        />
                        <p className="text-xs text-muted-foreground">
                          O ticket será fechado automaticamente se não houver resposta após este período
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveStatus}>
              Salvar Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este status? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDeleteStatus}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
