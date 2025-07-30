import { useEffect } from 'react';

// Função para converter HEX para HSL
function hexToHsl(hex: string): string {
  // Remove o # se estiver presente
  hex = hex.replace('#', '');
  
  // Se for uma cor de 3 dígitos, expande para 6
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }
  
  // Converte para RGB
  const r = parseInt(hex.substr(0, 2), 16) / 255;
  const g = parseInt(hex.substr(2, 2), 16) / 255;
  const b = parseInt(hex.substr(4, 2), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
      default: h = 0;
    }
    h /= 6;
  }

  // Converte para valores HSL
  h = Math.round(h * 360);
  s = Math.round(s * 100);
  l = Math.round(l * 100);

  return `${h} ${s}% ${l}%`;
}

// Função para gerar variações de cor
function generateColorVariations(baseColor: string) {
  const hsl = hexToHsl(baseColor);
  const [h, s, l] = hsl.split(' ').map(v => parseInt(v));
  
  return {
    primary: `${h} ${s}% ${l}%`,
    primaryForeground: `${h} ${s}% ${l > 50 ? 10 : 90}%`,
    secondary: `${h} ${Math.max(10, s - 20)}% ${Math.min(95, l + 35)}%`,
    secondaryForeground: `${h} ${s}% ${l > 50 ? 15 : 85}%`,
    accent: `${h} ${Math.max(10, s - 15)}% ${Math.min(95, l + 30)}%`,
    accentForeground: `${h} ${s}% ${l > 50 ? 15 : 85}%`,
  };
}

export interface ThemeColors {
  primaryColor: string;
  secondaryColor?: string;
  accentColor?: string;
}

export function useTheme() {
  // Função para aplicar as cores no CSS
  const applyTheme = (colors: ThemeColors) => {
    const root = document.documentElement;
    
    if (colors.primaryColor) {
      const variations = generateColorVariations(colors.primaryColor);
      
      // Aplica as variações de cor principal
      root.style.setProperty('--primary', variations.primary);
      root.style.setProperty('--primary-foreground', variations.primaryForeground);
      
      // Se não tiver cores secundárias definidas, gera automaticamente
      if (!colors.secondaryColor) {
        root.style.setProperty('--secondary', variations.secondary);
        root.style.setProperty('--secondary-foreground', variations.secondaryForeground);
      }
      
      if (!colors.accentColor) {
        root.style.setProperty('--accent', variations.accent);
        root.style.setProperty('--accent-foreground', variations.accentForeground);
      }
    }
    
    if (colors.secondaryColor) {
      const secondaryHsl = hexToHsl(colors.secondaryColor);
      const [h, s, l] = secondaryHsl.split(' ').map(v => parseInt(v));
      
      root.style.setProperty('--secondary', secondaryHsl);
      root.style.setProperty('--secondary-foreground', `${h} ${s}% ${l > 50 ? 15 : 85}%`);
    }
    
    if (colors.accentColor) {
      const accentHsl = hexToHsl(colors.accentColor);
      const [h, s, l] = accentHsl.split(' ').map(v => parseInt(v));
      
      root.style.setProperty('--accent', accentHsl);
      root.style.setProperty('--accent-foreground', `${h} ${s}% ${l > 50 ? 15 : 85}%`);
    }
  };

  // Função para carregar o tema salvo
  const loadSavedTheme = async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        if (data.general && data.general.primaryColor) {
          applyTheme({
            primaryColor: data.general.primaryColor,
            secondaryColor: data.general.secondaryColor,
            accentColor: data.general.accentColor,
          });
        }
      }
    } catch (error) {
      console.warn('Could not load saved theme:', error);
    }
  };

  // Função para salvar e aplicar tema
  const setTheme = (colors: ThemeColors) => {
    applyTheme(colors);
    
    // Salva no localStorage para persistência rápida
    localStorage.setItem('theme-colors', JSON.stringify(colors));
  };

  // Função para resetar para o tema padrão
  const resetTheme = () => {
    const root = document.documentElement;
    
    // Remove as propriedades customizadas (volta para o CSS padrão)
    root.style.removeProperty('--primary');
    root.style.removeProperty('--primary-foreground');
    root.style.removeProperty('--secondary');
    root.style.removeProperty('--secondary-foreground');
    root.style.removeProperty('--accent');
    root.style.removeProperty('--accent-foreground');
    
    localStorage.removeItem('theme-colors');
  };

  // Carrega o tema na inicialização
  useEffect(() => {
    // Primeiro tenta carregar do localStorage (mais rápido)
    const savedColors = localStorage.getItem('theme-colors');
    if (savedColors) {
      try {
        const colors = JSON.parse(savedColors);
        applyTheme(colors);
      } catch (error) {
        console.warn('Invalid theme colors in localStorage:', error);
      }
    }
    
    // Depois carrega do servidor (mais atualizado)
    loadSavedTheme();
  }, []);

  return {
    setTheme,
    resetTheme,
    loadSavedTheme,
    applyTheme,
  };
}
