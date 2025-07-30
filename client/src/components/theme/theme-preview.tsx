import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Users, Ticket, Clock } from 'lucide-react';

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

interface ThemePreviewProps {
  lightColors: ThemeColors;
  darkColors: ThemeColors;
  isDark?: boolean;
}

export const ThemePreview: React.FC<ThemePreviewProps> = ({ 
  lightColors, 
  darkColors, 
  isDark = false 
}) => {
  const colors = isDark ? darkColors : lightColors;
  
  const previewStyle: React.CSSProperties = {
    backgroundColor: colors.background,
    color: colors.foreground,
    borderColor: colors.border,
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: colors.card,
    borderColor: colors.border,
  };

  const primaryStyle: React.CSSProperties = {
    backgroundColor: colors.primary,
    color: colors.background, // Usar background como contraste
  };

  const mutedStyle: React.CSSProperties = {
    backgroundColor: colors.muted,
    color: colors.foreground,
  };

  return (
    <div 
      className="p-4 rounded-lg border-2 space-y-4 text-sm"
      style={previewStyle}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Prévia do Dashboard</h3>
        <Badge style={primaryStyle} className="text-xs">
          Tema {isDark ? 'Escuro' : 'Claro'}
        </Badge>
      </div>
      
      {/* Métricas simuladas */}
      <div className="grid grid-cols-2 gap-3">
        <div 
          className="p-3 rounded border"
          style={cardStyle}
        >
          <div className="flex items-center justify-between">
            <div>
              <p style={{ color: colors.muted.replace('#', '').length === 6 ? 
                `#${colors.muted.slice(1).split('').map(c => 
                  Math.floor(parseInt(c, 16) * 0.7).toString(16)
                ).join('')}` : colors.muted
              }}>
                Total Tickets
              </p>
              <p className="text-xl font-bold">156</p>
            </div>
            <div 
              className="p-2 rounded"
              style={{ backgroundColor: colors.primary + '20' }}
            >
              <Ticket 
                className="h-4 w-4"
                style={{ color: colors.primary }}
              />
            </div>
          </div>
        </div>

        <div 
          className="p-3 rounded border"
          style={cardStyle}
        >
          <div className="flex items-center justify-between">
            <div>
              <p style={{ color: colors.muted.replace('#', '').length === 6 ? 
                `#${colors.muted.slice(1).split('').map(c => 
                  Math.floor(parseInt(c, 16) * 0.7).toString(16)
                ).join('')}` : colors.muted
              }}>
                Usuários
              </p>
              <p className="text-xl font-bold">24</p>
            </div>
            <div 
              className="p-2 rounded"
              style={{ backgroundColor: '#10b981' + '20' }}
            >
              <Users 
                className="h-4 w-4"
                style={{ color: '#10b981' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico simulado */}
      <div 
        className="p-3 rounded border"
        style={cardStyle}
      >
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="h-4 w-4" style={{ color: colors.primary }} />
          <span className="font-medium">Relatórios</span>
        </div>
        <div className="space-y-2">
          {[60, 40, 80, 30].map((width, i) => (
            <div key={i} className="flex items-center gap-2">
              <div 
                className="h-2 rounded"
                style={{ 
                  backgroundColor: colors.primary,
                  width: `${width}%`,
                  opacity: 0.8
                }}
              />
              <span 
                className="text-xs"
                style={{ color: colors.muted.replace('#', '').length === 6 ? 
                  `#${colors.muted.slice(1).split('').map(c => 
                    Math.floor(parseInt(c, 16) * 0.7).toString(16)
                  ).join('')}` : colors.muted
                }}
              >
                Item {i + 1}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Botões de ação */}
      <div className="flex gap-2 pt-2">
        <button
          className="px-3 py-1.5 rounded text-xs font-medium"
          style={primaryStyle}
        >
          Botão Primário
        </button>
        <button
          className="px-3 py-1.5 rounded text-xs border"
          style={{
            backgroundColor: colors.card,
            color: colors.foreground,
            borderColor: colors.border
          }}
        >
          Botão Secundário
        </button>
        <button
          className="px-3 py-1.5 rounded text-xs"
          style={mutedStyle}
        >
          Botão Muted
        </button>
      </div>
    </div>
  );
};
