import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Settings, FileText, CheckSquare, Save, RefreshCw } from 'lucide-react';
import { TicketFormConfigurator } from './ticket-form-configurator';
import { useToast } from '@/hooks/use-toast';

interface TicketCustomizationManagerProps {
  className?: string;
}

export function TicketCustomizationManager({ className }: TicketCustomizationManagerProps) {
  const [hasChanges, setHasChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSaveChanges = async () => {
    setIsLoading(true);
    try {
      // Simular salvamento
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "✅ Configurações Salvas",
        description: "Todas as personalizações foram aplicadas com sucesso!",
        variant: "default"
      });
      
      setHasChanges(false);
    } catch (error) {
      toast({
        title: "❌ Erro ao Salvar",
        description: "Não foi possível salvar as configurações. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetChanges = () => {
    setHasChanges(false);
    toast({
      title: "🔄 Configurações Revertidas",
      description: "Todas as alterações foram descartadas.",
      variant: "default"
    });
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">🎨 Personalização de Formulários</h1>
          <p className="text-muted-foreground mt-2">
            Configure campos, opções e layout dos formulários de tickets
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {hasChanges && (
            <Badge variant="secondary" className="animate-pulse">
              Alterações não salvas
            </Badge>
          )}
          
          <Button
            variant="outline"
            onClick={handleResetChanges}
            disabled={!hasChanges || isLoading}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Reverter
          </Button>
          
          <Button
            onClick={handleSaveChanges}
            disabled={!hasChanges || isLoading}
            className="min-w-[120px]"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salvar Tudo
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Campos do Formulário</p>
                <p className="text-2xl font-bold">8</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <Settings className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Campos Visíveis</p>
                <p className="text-2xl font-bold">6</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <CheckSquare className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Obrigatórios</p>
                <p className="text-2xl font-bold">3</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>Configuração de Formulários</CardTitle>
          <CardDescription>
            Personalize os campos que aparecem nos formulários de tickets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TicketFormConfigurator onChanges={() => setHasChanges(true)} />
        </CardContent>
      </Card>
    </div>
  );
}
