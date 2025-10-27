import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ColorPicker } from '@/components/ui/color-picker';
import { PredefinedThemes } from '@/components/theme/predefined-themes';
import { Palette, RotateCcw, Download, Upload, Sun, Moon, Sparkles } from 'lucide-react';

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

const defaultLightTheme: ThemeColors = {
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
};

const defaultDarkTheme: ThemeColors = {
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
};

export const ThemeColorEditor: React.FC = () => {
  const [lightColors, setLightColors] = useState<ThemeColors>(defaultLightTheme);
  const [darkColors, setDarkColors] = useState<ThemeColors>(defaultDarkTheme);
  const [activeTab, setActiveTab] = useState('predefined');
  const [currentTheme, setCurrentTheme] = useState<string>('default');

  // Efeito para carregar cores salvas (só executa uma vez)
  useEffect(() => {
    const savedLight = localStorage.getItem('theme-colors-light');
    const savedDark = localStorage.getItem('theme-colors-dark');
    const savedCurrentTheme = localStorage.getItem('current-theme-id');
    
    if (savedLight) {
      setLightColors(JSON.parse(savedLight));
    }
    if (savedDark) {
      setDarkColors(JSON.parse(savedDark));
    }
    if (savedCurrentTheme) {
      setCurrentTheme(savedCurrentTheme);
    }
  }, []); // Executa apenas uma vez

  // Efeito separado para observar mudanças no tema
  useEffect(() => {
    let observer: MutationObserver;
    
    // Função para aplicar cores baseada no tema atual
    const applyCurrentThemeColors = () => {
      const isDark = document.documentElement.classList.contains('dark');
      const colorsToApply = isDark ? darkColors : lightColors;
      
      Object.entries(colorsToApply).forEach(([key, value]) => {
        updateCSSVariable(key, value);
      });
    };

    // Aplicar cores inicialmente
    applyCurrentThemeColors();

    // Observar mudanças no tema claro/escuro
    observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          applyCurrentThemeColors();
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => {
      if (observer) {
        observer.disconnect();
      }
    };
  }, [lightColors, darkColors]); // Agora pode depender das cores sem problemas

  const hexToHsl = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h! /= 6;
    }

    return `${Math.round(h! * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  };

  const updateCSSVariable = (name: string, value: string) => {
    const hslValue = hexToHsl(value);
    document.documentElement.style.setProperty(`--${name}`, hslValue);
  };

  // Função para salvar tema no servidor
  const saveThemeToServer = async (lightTheme: ThemeColors, darkTheme: ThemeColors, themeId: string) => {
    try {
      const themeData = {
        general: {
          themeId,
          lightTheme: JSON.stringify(lightTheme),
          darkTheme: JSON.stringify(darkTheme),
          primaryColor: lightTheme.primary,
          secondaryColor: lightTheme.secondary,
          accentColor: lightTheme.accent,
        }
      };

      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(themeData),
      });

      if (!response.ok) {
        console.warn('Failed to save theme to server:', response.statusText);
      }
    } catch (error) {
      console.warn('Error saving theme to server:', error);
    }
  };

  const handleColorChange = (theme: 'light' | 'dark', colorKey: keyof ThemeColors, value: string) => {
    const currentColors = theme === 'light' ? lightColors : darkColors;
    const newColors = { ...currentColors, [colorKey]: value };
    
    // Atualizar estado
    if (theme === 'light') {
      setLightColors(newColors);
    } else {
      setDarkColors(newColors);
    }

    // Aplicar apenas se estivermos no tema correspondente
    const isCurrentlyDark = document.documentElement.classList.contains('dark');
    if ((theme === 'dark' && isCurrentlyDark) || (theme === 'light' && !isCurrentlyDark)) {
      updateCSSVariable(colorKey, value);
    }

    // Salvar no localStorage de forma assíncrona
    requestAnimationFrame(() => {
      localStorage.setItem(`theme-colors-${theme}`, JSON.stringify(newColors));
      
      // Marcar como tema personalizado
      setCurrentTheme('custom');
      localStorage.setItem('current-theme-id', 'custom');
      
      // Salvar no servidor também (usar as cores atualizadas)
      const finalLightColors = theme === 'light' ? newColors : lightColors;
      const finalDarkColors = theme === 'dark' ? newColors : darkColors;
      saveThemeToServer(finalLightColors, finalDarkColors, 'custom');
    });
  };

  const applyPredefinedTheme = (lightTheme: ThemeColors, darkTheme: ThemeColors, themeId?: string) => {
    setLightColors(lightTheme);
    setDarkColors(darkTheme);
    
    // Aplicar cores do tema atual
    const isCurrentlyDark = document.documentElement.classList.contains('dark');
    const colorsToApply = isCurrentlyDark ? darkTheme : lightTheme;
    
    Object.entries(colorsToApply).forEach(([key, value]) => {
      updateCSSVariable(key, value);
    });
    
    // Salvar no localStorage
    localStorage.setItem('theme-colors-light', JSON.stringify(lightTheme));
    localStorage.setItem('theme-colors-dark', JSON.stringify(darkTheme));
    
    // Definir tema atual
    if (themeId) {
      setCurrentTheme(themeId);
      localStorage.setItem('current-theme-id', themeId);
      
      // Salvar no servidor
      saveThemeToServer(lightTheme, darkTheme, themeId);
    }
  };

  const resetToDefault = (theme: 'light' | 'dark') => {
    const defaultColors = theme === 'light' ? defaultLightTheme : defaultDarkTheme;
    
    if (theme === 'light') {
      setLightColors(defaultColors);
    } else {
      setDarkColors(defaultColors);
    }

    // Aplicar apenas se estivermos no tema correspondente
    const isCurrentlyDark = document.documentElement.classList.contains('dark');
    if ((theme === 'dark' && isCurrentlyDark) || (theme === 'light' && !isCurrentlyDark)) {
      Object.entries(defaultColors).forEach(([key, value]) => {
        updateCSSVariable(key, value);
      });
    }

    localStorage.removeItem(`theme-colors-${theme}`);
    
    // Resetar para tema padrão
    setCurrentTheme('default');
    localStorage.setItem('current-theme-id', 'default');
    
    // Salvar tema padrão no servidor
    const finalLightColors = theme === 'light' ? defaultColors : lightColors;
    const finalDarkColors = theme === 'dark' ? defaultColors : darkColors;
    saveThemeToServer(finalLightColors, finalDarkColors, 'default');
  };

  const exportTheme = (theme: 'light' | 'dark') => {
    const colors = theme === 'light' ? lightColors : darkColors;
    const themeData = {
      name: `HelpDesk Theme ${theme === 'light' ? 'Light' : 'Dark'}`,
      mode: theme,
      colors,
      timestamp: new Date().toISOString(),
    };
    
    const dataStr = JSON.stringify(themeData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `helpdesk-theme-${theme}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const importTheme = (theme: 'light' | 'dark', event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const themeData = JSON.parse(e.target?.result as string);
          if (themeData.colors) {
            if (theme === 'light') {
              setLightColors(themeData.colors);
            } else {
              setDarkColors(themeData.colors);
            }
            
            // Aplicar apenas se estivermos no tema correspondente
            const isCurrentlyDark = document.documentElement.classList.contains('dark');
            if ((theme === 'dark' && isCurrentlyDark) || (theme === 'light' && !isCurrentlyDark)) {
              Object.entries(themeData.colors).forEach(([key, value]) => {
                updateCSSVariable(key, value as string);
              });
            }
            
            localStorage.setItem(`theme-colors-${theme}`, JSON.stringify(themeData.colors));
          }
        } catch (error) {
          console.error('Erro ao importar tema:', error);
        }
      };
      reader.readAsText(file);
    }
    // Reset input
    event.target.value = '';
  };

  const renderColorEditor = (theme: 'light' | 'dark', colors: ThemeColors) => (
    <div className="space-y-6">
      {currentTheme === 'custom' && (
        <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
          <p className="text-sm text-primary font-medium">
            🎨 Tema Personalizado Ativo
          </p>
          <p className="text-xs text-primary/80 mt-1">
            Você está usando um tema personalizado. Use "Restaurar Padrão" para voltar ao tema original.
          </p>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ColorPicker
          label="Cor Principal"
          color={colors.primary}
          onChange={(value) => handleColorChange(theme, 'primary', value)}
          presets={['#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']}
        />
        
        <ColorPicker
          label="Fundo Principal"
          color={colors.background}
          onChange={(value) => handleColorChange(theme, 'background', value)}
          presets={theme === 'light' ? ['#ffffff', '#f8fafc', '#f1f5f9'] : ['#0a0e1a', '#1e293b', '#334155']}
        />
        
        <ColorPicker
          label="Texto Principal"
          color={colors.foreground}
          onChange={(value) => handleColorChange(theme, 'foreground', value)}
          presets={theme === 'light' ? ['#0f172a', '#1e293b', '#334155'] : ['#f1f5f9', '#e2e8f0', '#cbd5e1']}
        />
        
        <ColorPicker
          label="Cor Secundária"
          color={colors.secondary}
          onChange={(value) => handleColorChange(theme, 'secondary', value)}
        />
        
        <ColorPicker
          label="Cartões e Painéis"
          color={colors.card}
          onChange={(value) => handleColorChange(theme, 'card', value)}
        />
        
        <ColorPicker
          label="Bordas"
          color={colors.border}
          onChange={(value) => handleColorChange(theme, 'border', value)}
        />
        
        <ColorPicker
          label="Campos de Input"
          color={colors.input}
          onChange={(value) => handleColorChange(theme, 'input', value)}
        />
        
        <ColorPicker
          label="Áreas Suaves"
          color={colors.muted}
          onChange={(value) => handleColorChange(theme, 'muted', value)}
        />
      </div>

      <Separator className="bg-border" />

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          onClick={() => resetToDefault(theme)}
          className="flex items-center gap-2 bg-card text-foreground border-border hover:bg-muted"
        >
          <RotateCcw className="h-4 w-4" />
          Restaurar Padrão
        </Button>
        
        <Button
          variant="outline"
          onClick={() => exportTheme(theme)}
          className="flex items-center gap-2 bg-card text-foreground border-border hover:bg-muted"
        >
          <Download className="h-4 w-4" />
          Exportar
        </Button>
        
        <Button
          variant="outline"
          className="flex items-center gap-2 bg-card text-foreground border-border hover:bg-muted"
          onClick={() => document.getElementById(`theme-import-${theme}`)?.click()}
        >
          <Upload className="h-4 w-4" />
          Importar
        </Button>
        
        <input
          id={`theme-import-${theme}`}
          type="file"
          accept=".json"
          onChange={(e) => importTheme(theme, e)}
          className="hidden"
        />
      </div>

      <div className="p-4 bg-muted/30 border border-border rounded-lg">
        <h4 className="font-medium mb-3 text-foreground">Prévia do Tema {theme === 'light' ? 'Claro' : 'Escuro'}</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border border-border" style={{ backgroundColor: colors.primary }} />
            <span className="text-sm text-foreground">Botões primários</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border border-border" style={{ backgroundColor: colors.background }} />
            <span className="text-sm text-foreground">Fundo</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border border-border" style={{ backgroundColor: colors.card }} />
            <span className="text-sm text-foreground">Cartões</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border border-border" style={{ backgroundColor: colors.secondary }} />
            <span className="text-sm text-foreground">Secundário</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Card className="bg-card border-border text-foreground">
      <CardHeader className="bg-card text-foreground">
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Palette className="h-5 w-5" />
          Editor de Cores por Tema
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Escolha entre temas pré-definidos ou personalize as cores para cada tema (claro e escuro) separadamente.
        </CardDescription>
      </CardHeader>
      <CardContent className="bg-card text-foreground">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-muted">
            <TabsTrigger value="predefined" className="flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground">
              <Sparkles className="h-4 w-4" />
              Temas Prontos
            </TabsTrigger>
            <TabsTrigger value="light" className="flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground">
              <Sun className="h-4 w-4" />
              Tema Claro
            </TabsTrigger>
            <TabsTrigger value="dark" className="flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground">
              <Moon className="h-4 w-4" />
              Tema Escuro
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="predefined" className="mt-6 bg-card text-foreground">
            <PredefinedThemes 
              onApplyTheme={(light, dark, themeId) => applyPredefinedTheme(light, dark, themeId)}
              currentTheme={currentTheme}
            />
          </TabsContent>
          
          <TabsContent value="light" className="mt-6 bg-card text-foreground">
            {renderColorEditor('light', lightColors)}
          </TabsContent>
          
          <TabsContent value="dark" className="mt-6 bg-card text-foreground">
            {renderColorEditor('dark', darkColors)}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
