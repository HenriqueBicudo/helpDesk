import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ColorPicker } from '@/components/ui/color-picker';
import { Palette, RotateCcw, Download, Upload } from 'lucide-react';

interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  foreground: string;
  muted: string;
  border: string;
}

const defaultLightTheme: ThemeColors = {
  primary: '#3b82f6',
  secondary: '#f1f5f9',
  accent: '#f1f5f9',
  background: '#ffffff',
  foreground: '#0f172a',
  muted: '#f1f5f9',
  border: '#e2e8f0',
};

const defaultDarkTheme: ThemeColors = {
  primary: '#3b82f6',
  secondary: '#1e293b',
  accent: '#1e293b',
  background: '#0f172a',
  foreground: '#f1f5f9',
  muted: '#1e293b',
  border: '#334155',
};

export const AdvancedThemeCustomizer: React.FC = () => {
  const [colors, setColors] = useState<ThemeColors>(defaultLightTheme);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const isDark = root.classList.contains('dark');
    setIsDarkMode(isDark);
    setColors(isDark ? defaultDarkTheme : defaultLightTheme);
  }, []);

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

  const handleColorChange = (colorKey: keyof ThemeColors, value: string) => {
    const newColors = { ...colors, [colorKey]: value };
    setColors(newColors);
    updateCSSVariable(colorKey, value);
    
    // Salvar no localStorage
    localStorage.setItem(`theme-${isDarkMode ? 'dark' : 'light'}`, JSON.stringify(newColors));
  };

  const resetToDefault = () => {
    const defaultColors = isDarkMode ? defaultDarkTheme : defaultLightTheme;
    setColors(defaultColors);
    
    Object.entries(defaultColors).forEach(([key, value]) => {
      updateCSSVariable(key, value);
    });
    
    localStorage.removeItem(`theme-${isDarkMode ? 'dark' : 'light'}`);
  };

  const exportTheme = () => {
    const themeData = {
      name: `Custom Theme ${isDarkMode ? 'Dark' : 'Light'}`,
      mode: isDarkMode ? 'dark' : 'light',
      colors,
      timestamp: new Date().toISOString(),
    };
    
    const dataStr = JSON.stringify(themeData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `helpdesk-theme-${isDarkMode ? 'dark' : 'light'}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const importTheme = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const themeData = JSON.parse(e.target?.result as string);
          if (themeData.colors) {
            setColors(themeData.colors);
            Object.entries(themeData.colors).forEach(([key, value]) => {
              updateCSSVariable(key, value as string);
            });
          }
        } catch (error) {
          console.error('Erro ao importar tema:', error);
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Personalização Avançada de Cores
        </CardTitle>
        <CardDescription>
          Customize todas as cores do tema {isDarkMode ? 'escuro' : 'claro'} conforme sua preferência.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ColorPicker
            label="Cor Principal"
            color={colors.primary}
            onChange={(value) => handleColorChange('primary', value)}
          />
          
          <ColorPicker
            label="Cor Secundária"
            color={colors.secondary}
            onChange={(value) => handleColorChange('secondary', value)}
          />
          
          <ColorPicker
            label="Cor de Destaque"
            color={colors.accent}
            onChange={(value) => handleColorChange('accent', value)}
          />
          
          <ColorPicker
            label="Fundo Principal"
            color={colors.background}
            onChange={(value) => handleColorChange('background', value)}
          />
          
          <ColorPicker
            label="Texto Principal"
            color={colors.foreground}
            onChange={(value) => handleColorChange('foreground', value)}
          />
          
          <ColorPicker
            label="Elementos Suaves"
            color={colors.muted}
            onChange={(value) => handleColorChange('muted', value)}
          />
        </div>

        <Separator />

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={resetToDefault}
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Restaurar Padrão
          </Button>
          
          <Button
            variant="outline"
            onClick={exportTheme}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Exportar Tema
          </Button>
          
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => document.getElementById('theme-import')?.click()}
          >
            <Upload className="h-4 w-4" />
            Importar Tema
          </Button>
          
          <input
            id="theme-import"
            type="file"
            accept=".json"
            onChange={importTheme}
            className="hidden"
          />
        </div>

        <div className="p-4 bg-muted rounded-lg">
          <h4 className="font-medium mb-2">Prévia do Tema</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: colors.primary }} />
              <span className="text-sm">Botões e links principais</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: colors.secondary }} />
              <span className="text-sm">Áreas secundárias</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: colors.background }} />
              <span className="text-sm">Fundo da aplicação</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
