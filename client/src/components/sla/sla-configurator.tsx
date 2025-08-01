import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Clock, 
  Plus, 
  Trash2, 
  Settings, 
  AlertTriangle,
  Calendar,
  Target,
  Save,
  RotateCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Schema de validação para configurações SLA
const slaConfigSchema = z.object({
  general: z.object({
    defaultResponseTime: z.number().min(1, 'Tempo mínimo é 1 hora'),
    defaultResolutionTime: z.number().min(1, 'Tempo mínimo é 1 hora'),
    businessHoursOnly: z.boolean(),
    escalationEnabled: z.boolean(),
    autoAssignment: z.boolean()
  }),
  businessHours: z.object({
    monday: z.object({
      enabled: z.boolean(),
      start: z.string(),
      end: z.string()
    }),
    tuesday: z.object({
      enabled: z.boolean(),
      start: z.string(),
      end: z.string()
    }),
    wednesday: z.object({
      enabled: z.boolean(),
      start: z.string(),
      end: z.string()
    }),
    thursday: z.object({
      enabled: z.boolean(),
      start: z.string(),
      end: z.string()
    }),
    friday: z.object({
      enabled: z.boolean(),
      start: z.string(),
      end: z.string()
    }),
    saturday: z.object({
      enabled: z.boolean(),
      start: z.string(),
      end: z.string()
    }),
    sunday: z.object({
      enabled: z.boolean(),
      start: z.string(),
      end: z.string()
    })
  }),
  priorities: z.array(z.object({
    id: z.string(),
    name: z.string().min(1, 'Nome é obrigatório'),
    level: z.enum(['low', 'medium', 'high', 'critical']),
    responseTime: z.number().min(1, 'Tempo mínimo é 1 hora'),
    resolutionTime: z.number().min(1, 'Tempo mínimo é 1 hora'),
    escalationLevels: z.array(z.object({
      level: z.number(),
      timeAfter: z.number(),
      action: z.enum(['email', 'sms', 'assign_manager', 'create_incident'])
    }))
  })),
  holidays: z.array(z.object({
    id: z.string(),
    name: z.string().min(1, 'Nome é obrigatório'),
    date: z.string().min(1, 'Data é obrigatória'),
    recurring: z.boolean()
  }))
});

type SlaConfigFormData = z.infer<typeof slaConfigSchema>;

export interface SlaConfiguratorProps {
  initialConfig?: Partial<SlaConfigFormData>;
  onSave?: (config: SlaConfigFormData) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  className?: string;
}

const defaultConfig: SlaConfigFormData = {
  general: {
    defaultResponseTime: 4,
    defaultResolutionTime: 24,
    businessHoursOnly: true,
    escalationEnabled: true,
    autoAssignment: false
  },
  businessHours: {
    monday: { enabled: true, start: '08:00', end: '18:00' },
    tuesday: { enabled: true, start: '08:00', end: '18:00' },
    wednesday: { enabled: true, start: '08:00', end: '18:00' },
    thursday: { enabled: true, start: '08:00', end: '18:00' },
    friday: { enabled: true, start: '08:00', end: '18:00' },
    saturday: { enabled: false, start: '09:00', end: '13:00' },
    sunday: { enabled: false, start: '09:00', end: '13:00' }
  },
  priorities: [
    {
      id: 'critical',
      name: 'Crítica',
      level: 'critical',
      responseTime: 1,
      resolutionTime: 4,
      escalationLevels: [
        { level: 1, timeAfter: 30, action: 'email' },
        { level: 2, timeAfter: 60, action: 'assign_manager' }
      ]
    },
    {
      id: 'high',
      name: 'Alta',
      level: 'high',
      responseTime: 2,
      resolutionTime: 8,
      escalationLevels: [
        { level: 1, timeAfter: 60, action: 'email' }
      ]
    },
    {
      id: 'medium',
      name: 'Média',
      level: 'medium',
      responseTime: 4,
      resolutionTime: 24,
      escalationLevels: []
    },
    {
      id: 'low',
      name: 'Baixa',
      level: 'low',
      responseTime: 8,
      resolutionTime: 72,
      escalationLevels: []
    }
  ],
  holidays: []
};

export const SlaConfigurator: React.FC<SlaConfiguratorProps> = ({
  initialConfig,
  onSave,
  onCancel,
  isLoading = false,
  className
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'business' | 'priorities' | 'holidays'>('general');

  const form = useForm<SlaConfigFormData>({
    resolver: zodResolver(slaConfigSchema),
    defaultValues: { ...defaultConfig, ...initialConfig }
  });

  const { fields: priorityFields, append: appendPriority, remove: removePriority } = useFieldArray({
    control: form.control,
    name: 'priorities'
  });

  const { fields: holidayFields, append: appendHoliday, remove: removeHoliday } = useFieldArray({
    control: form.control,
    name: 'holidays'
  });

  const handleSubmit = (data: SlaConfigFormData) => {
    onSave?.(data);
  };

  const addPriority = () => {
    appendPriority({
      id: `priority_${Date.now()}`,
      name: '',
      level: 'medium',
      responseTime: 4,
      resolutionTime: 24,
      escalationLevels: []
    });
  };

  const addHoliday = () => {
    appendHoliday({
      id: `holiday_${Date.now()}`,
      name: '',
      date: '',
      recurring: false
    });
  };

  const tabs = [
    { id: 'general', name: 'Geral', icon: Settings },
    { id: 'business', name: 'Horário Comercial', icon: Calendar },
    { id: 'priorities', name: 'Prioridades', icon: Target },
    { id: 'holidays', name: 'Feriados', icon: Clock }
  ];

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="defaultResponseTime">Tempo Padrão de Resposta (horas)</Label>
          <Input
            id="defaultResponseTime"
            type="number"
            {...form.register('general.defaultResponseTime', { valueAsNumber: true })}
          />
          {form.formState.errors.general?.defaultResponseTime && (
            <p className="text-sm text-red-600">
              {form.formState.errors.general.defaultResponseTime.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="defaultResolutionTime">Tempo Padrão de Resolução (horas)</Label>
          <Input
            id="defaultResolutionTime"
            type="number"
            {...form.register('general.defaultResolutionTime', { valueAsNumber: true })}
          />
          {form.formState.errors.general?.defaultResolutionTime && (
            <p className="text-sm text-red-600">
              {form.formState.errors.general.defaultResolutionTime.message}
            </p>
          )}
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Considerar apenas horário comercial</Label>
            <p className="text-sm text-gray-500">
              SLA será calculado apenas durante o horário comercial
            </p>
          </div>
          <Switch
            checked={form.watch('general.businessHoursOnly')}
            onCheckedChange={(checked) => form.setValue('general.businessHoursOnly', checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Escalação automática</Label>
            <p className="text-sm text-gray-500">
              Ativar escalação automática quando SLA estiver próximo do vencimento
            </p>
          </div>
          <Switch
            checked={form.watch('general.escalationEnabled')}
            onCheckedChange={(checked) => form.setValue('general.escalationEnabled', checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Atribuição automática</Label>
            <p className="text-sm text-gray-500">
              Atribuir automaticamente tickets com base na disponibilidade dos agentes
            </p>
          </div>
          <Switch
            checked={form.watch('general.autoAssignment')}
            onCheckedChange={(checked) => form.setValue('general.autoAssignment', checked)}
          />
        </div>
      </div>
    </div>
  );

  const renderBusinessHours = () => {
    const days = [
      { key: 'monday', name: 'Segunda-feira' },
      { key: 'tuesday', name: 'Terça-feira' },
      { key: 'wednesday', name: 'Quarta-feira' },
      { key: 'thursday', name: 'Quinta-feira' },
      { key: 'friday', name: 'Sexta-feira' },
      { key: 'saturday', name: 'Sábado' },
      { key: 'sunday', name: 'Domingo' }
    ];

    return (
      <div className="space-y-4">
        {days.map((day) => (
          <div key={day.key} className="flex items-center gap-4 p-4 border rounded-lg">
            <div className="w-32">
              <Label>{day.name}</Label>
            </div>
            <Switch
              checked={form.watch(`businessHours.${day.key as keyof typeof defaultConfig.businessHours}.enabled`)}
              onCheckedChange={(checked) => 
                form.setValue(`businessHours.${day.key as keyof typeof defaultConfig.businessHours}.enabled`, checked)
              }
            />
            <div className="flex items-center gap-2">
              <Input
                type="time"
                className="w-32"
                disabled={!form.watch(`businessHours.${day.key as keyof typeof defaultConfig.businessHours}.enabled`)}
                {...form.register(`businessHours.${day.key as keyof typeof defaultConfig.businessHours}.start`)}
              />
              <span>às</span>
              <Input
                type="time"
                className="w-32"
                disabled={!form.watch(`businessHours.${day.key as keyof typeof defaultConfig.businessHours}.enabled`)}
                {...form.register(`businessHours.${day.key as keyof typeof defaultConfig.businessHours}.end`)}
              />
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderPriorities = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Configuração de Prioridades</h3>
        <Button onClick={addPriority} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Adicionar Prioridade
        </Button>
      </div>

      {priorityFields.map((field, index) => (
        <Card key={field.id}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Prioridade #{index + 1}
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => removePriority(index)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  {...form.register(`priorities.${index}.name`)}
                  placeholder="Ex: Crítica, Alta, etc."
                />
              </div>
              <div className="space-y-2">
                <Label>Nível</Label>
                <Select
                  value={form.watch(`priorities.${index}.level`)}
                  onValueChange={(value) => 
                    form.setValue(`priorities.${index}.level`, value as any)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="critical">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tempo de Resposta (horas)</Label>
                <Input
                  type="number"
                  {...form.register(`priorities.${index}.responseTime`, { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-2">
                <Label>Tempo de Resolução (horas)</Label>
                <Input
                  type="number"
                  {...form.register(`priorities.${index}.resolutionTime`, { valueAsNumber: true })}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderHolidays = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Configuração de Feriados</h3>
        <Button onClick={addHoliday} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Adicionar Feriado
        </Button>
      </div>

      {holidayFields.map((field, index) => (
        <div key={field.id} className="flex items-center gap-4 p-4 border rounded-lg">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                {...form.register(`holidays.${index}.name`)}
                placeholder="Ex: Natal, Ano Novo"
              />
            </div>
            <div className="space-y-2">
              <Label>Data</Label>
              <Input
                type="date"
                {...form.register(`holidays.${index}.date`)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.watch(`holidays.${index}.recurring`)}
                onCheckedChange={(checked) => 
                  form.setValue(`holidays.${index}.recurring`, checked)
                }
              />
              <Label>Recorrente anualmente</Label>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => removeHoliday(index)}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}

      {holidayFields.length === 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Nenhum feriado configurado. Durante feriados, o cálculo de SLA será pausado.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );

  return (
    <Card className={cn('w-full max-w-6xl mx-auto', className)}>
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          <Settings className="h-6 w-6" />
          Configurações SLA
        </CardTitle>
        <CardDescription>
          Configure os acordos de nível de serviço para otimizar o atendimento ao cliente
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Navigation */}
          <div className="lg:w-64 space-y-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? 'default' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => setActiveTab(tab.id as any)}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.name}
                </Button>
              );
            })}
          </div>

          {/* Content */}
          <div className="flex-1">
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {activeTab === 'general' && renderGeneralSettings()}
              {activeTab === 'business' && renderBusinessHours()}
              {activeTab === 'priorities' && renderPriorities()}
              {activeTab === 'holidays' && renderHolidays()}

              {/* Actions */}
              <div className="flex items-center justify-between pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => form.reset()}
                  disabled={isLoading}
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Resetar
                </Button>

                <div className="flex gap-2">
                  {onCancel && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onCancel}
                      disabled={isLoading}
                    >
                      Cancelar
                    </Button>
                  )}
                  <Button type="submit" disabled={isLoading}>
                    <Save className="h-4 w-4 mr-1" />
                    {isLoading ? 'Salvando...' : 'Salvar Configurações'}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SlaConfigurator;
