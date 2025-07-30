import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ThemePreview } from '@/components/theme/theme-preview';
import { Palette, Check, Eye, EyeOff } from 'lucide-react';

interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  foreground: string;
  muted: string;
  border: string;
  card: string;
  input: string;
  destructive: string;
}

interface PredefinedTheme {
  id: string;
  name: string;
  description: string;
  category: 'default' | 'blue' | 'green' | 'purple' | 'orange' | 'dark';
  light: ThemeColors;
  dark: ThemeColors;
}

const predefinedThemes: PredefinedTheme[] = [
  {
    id: 'default',
    name: 'HelpDesk Padrão',
    description: 'Tema padrão azul profissional',
    category: 'default',
    light: {
      primary: '#3b82f6',
      secondary: '#f1f5f9',
      accent: '#f1f5f9',
      background: '#ffffff',
      foreground: '#0f172a',
      muted: '#f1f5f9',
      border: '#e2e8f0',
      card: '#ffffff',
      input: '#e2e8f0',
      destructive: '#ef4444',
    },
    dark: {
      primary: '#3b82f6',
      secondary: '#1e293b',
      accent: '#1e293b',
      background: '#0a0e1a',
      foreground: '#f1f5f9',
      muted: '#1e293b',
      border: '#334155',
      card: '#1e293b',
      input: '#334155',
      destructive: '#ef4444',
    }
  },
  {
    id: 'ocean',
    name: 'Oceano',
    description: 'Tons de azul inspirados no oceano',
    category: 'blue',
    light: {
      primary: '#0ea5e9',
      secondary: '#f0f9ff',
      accent: '#e0f2fe',
      background: '#ffffff',
      foreground: '#0c4a6e',
      muted: '#f0f9ff',
      border: '#bae6fd',
      card: '#ffffff',
      input: '#bae6fd',
      destructive: '#dc2626',
    },
    dark: {
      primary: '#0ea5e9',
      secondary: '#164e63',
      accent: '#0c4a6e',
      background: '#0f172a',
      foreground: '#f0f9ff',
      muted: '#164e63',
      border: '#0c4a6e',
      card: '#164e63',
      input: '#0c4a6e',
      destructive: '#dc2626',
    }
  },
  {
    id: 'forest',
    name: 'Floresta',
    description: 'Verde natural e sustentável',
    category: 'green',
    light: {
      primary: '#059669',
      secondary: '#f0fdf4',
      accent: '#dcfce7',
      background: '#ffffff',
      foreground: '#064e3b',
      muted: '#f0fdf4',
      border: '#bbf7d0',
      card: '#ffffff',
      input: '#bbf7d0',
      destructive: '#dc2626',
    },
    dark: {
      primary: '#10b981',
      secondary: '#14532d',
      accent: '#166534',
      background: '#0f172a',
      foreground: '#f0fdf4',
      muted: '#14532d',
      border: '#166534',
      card: '#14532d',
      input: '#166534',
      destructive: '#dc2626',
    }
  },
  {
    id: 'royal',
    name: 'Real',
    description: 'Roxo elegante e sofisticado',
    category: 'purple',
    light: {
      primary: '#7c3aed',
      secondary: '#faf5ff',
      accent: '#f3e8ff',
      background: '#ffffff',
      foreground: '#581c87',
      muted: '#faf5ff',
      border: '#c4b5fd',
      card: '#ffffff',
      input: '#c4b5fd',
      destructive: '#dc2626',
    },
    dark: {
      primary: '#8b5cf6',
      secondary: '#4c1d95',
      accent: '#581c87',
      background: '#0f172a',
      foreground: '#faf5ff',
      muted: '#4c1d95',
      border: '#581c87',
      card: '#4c1d95',
      input: '#581c87',
      destructive: '#dc2626',
    }
  },
  {
    id: 'sunset',
    name: 'Pôr do Sol',
    description: 'Laranja vibrante e energético',
    category: 'orange',
    light: {
      primary: '#ea580c',
      secondary: '#fff7ed',
      accent: '#fed7aa',
      background: '#ffffff',
      foreground: '#9a3412',
      muted: '#fff7ed',
      border: '#fed7aa',
      card: '#ffffff',
      input: '#fed7aa',
      destructive: '#dc2626',
    },
    dark: {
      primary: '#f97316',
      secondary: '#9a3412',
      accent: '#c2410c',
      background: '#0f172a',
      foreground: '#fff7ed',
      muted: '#9a3412',
      border: '#c2410c',
      card: '#9a3412',
      input: '#c2410c',
      destructive: '#dc2626',
    }
  },
  {
    id: 'midnight',
    name: 'Meia-Noite',
    description: 'Escuro profundo e moderno',
    category: 'dark',
    light: {
      primary: '#6366f1',
      secondary: '#f8fafc',
      accent: '#e2e8f0',
      background: '#ffffff',
      foreground: '#1e293b',
      muted: '#f8fafc',
      border: '#e2e8f0',
      card: '#ffffff',
      input: '#e2e8f0',
      destructive: '#ef4444',
    },
    dark: {
      primary: '#6366f1',
      secondary: '#0f172a',
      accent: '#1e293b',
      background: '#020617',
      foreground: '#f1f5f9',
      muted: '#0f172a',
      border: '#1e293b',
      card: '#0f172a',
      input: '#1e293b',
      destructive: '#ef4444',
    }
  }
];

interface PredefinedThemesProps {
  onApplyTheme: (lightColors: ThemeColors, darkColors: ThemeColors, themeId?: string) => void;
  currentTheme?: string;
}

export const PredefinedThemes: React.FC<PredefinedThemesProps> = ({ 
  onApplyTheme, 
  currentTheme 
}) => {
  const [previewTheme, setPreviewTheme] = useState<PredefinedTheme | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const handleApplyTheme = (theme: PredefinedTheme) => {
    onApplyTheme(theme.light, theme.dark, theme.id);
  };

  const handlePreview = (theme: PredefinedTheme) => {
    setPreviewTheme(theme);
    setShowPreview(true);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'default': return 'bg-blue-500';
      case 'blue': return 'bg-cyan-500';
      case 'green': return 'bg-emerald-500';
      case 'purple': return 'bg-violet-500';
      case 'orange': return 'bg-orange-500';
      case 'dark': return 'bg-slate-700';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Palette className="h-5 w-5" />
          Temas Pré-definidos
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Escolha um dos temas prontos para usar ou como ponto de partida para personalização.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {showPreview && (
          <div className="mb-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-foreground">
                Prévia: {previewTheme?.name}
              </h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <EyeOff className="h-4 w-4 mr-1" />
                Fechar Prévia
              </Button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ThemePreview
                lightColors={previewTheme!.light}
                darkColors={previewTheme!.dark}
                isDark={false}
              />
              <ThemePreview
                lightColors={previewTheme!.light}
                darkColors={previewTheme!.dark}
                isDark={true}
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={() => handleApplyTheme(previewTheme!)}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Aplicar {previewTheme?.name}
              </Button>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {predefinedThemes.map((theme) => (
            <Card 
              key={theme.id} 
              className="bg-card border-border hover:bg-muted/30 transition-all duration-200 cursor-pointer group"
              onClick={() => handleApplyTheme(theme)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-foreground">
                    {theme.name}
                  </CardTitle>
                  {currentTheme === theme.id && (
                    <Badge variant="default" className="bg-primary text-primary-foreground">
                      <Check className="h-3 w-3 mr-1" />
                      Ativo
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-xs text-muted-foreground">
                  {theme.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                {/* Preview das cores */}
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Tema Claro</p>
                    <div className="grid grid-cols-4 gap-1">
                      <div 
                        className="w-6 h-6 rounded border border-border"
                        style={{ backgroundColor: theme.light.primary }}
                        title="Primary"
                      />
                      <div 
                        className="w-6 h-6 rounded border border-border"
                        style={{ backgroundColor: theme.light.background }}
                        title="Background"
                      />
                      <div 
                        className="w-6 h-6 rounded border border-border"
                        style={{ backgroundColor: theme.light.card }}
                        title="Card"
                      />
                      <div 
                        className="w-6 h-6 rounded border border-border"
                        style={{ backgroundColor: theme.light.secondary }}
                        title="Secondary"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Tema Escuro</p>
                    <div className="grid grid-cols-4 gap-1">
                      <div 
                        className="w-6 h-6 rounded border border-border"
                        style={{ backgroundColor: theme.dark.primary }}
                        title="Primary"
                      />
                      <div 
                        className="w-6 h-6 rounded border border-border"
                        style={{ backgroundColor: theme.dark.background }}
                        title="Background"
                      />
                      <div 
                        className="w-6 h-6 rounded border border-border"
                        style={{ backgroundColor: theme.dark.card }}
                        title="Card"
                      />
                      <div 
                        className="w-6 h-6 rounded border border-border"
                        style={{ backgroundColor: theme.dark.secondary }}
                        title="Secondary"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2 mt-3">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleApplyTheme(theme);
                    }}
                  >
                    Aplicar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePreview(theme);
                    }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="mt-6 p-4 bg-muted/30 border border-border rounded-lg">
          <h4 className="font-medium mb-2 text-foreground">💡 Dicas de Uso</h4>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>• Use o botão 👁️ para visualizar o tema antes de aplicar</p>
            <p>• Após aplicar um tema, você pode personalizá-lo nas abas "Tema Claro" e "Tema Escuro"</p>
            <p>• Seus temas personalizados são salvos automaticamente no navegador</p>
            <p>• Use as opções de exportar/importar para compartilhar temas entre dispositivos</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
