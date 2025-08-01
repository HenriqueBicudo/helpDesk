import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Palette, Check } from 'lucide-react';

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  label?: string;
  presets?: string[];
}

const defaultPresets = [
  '#3b82f6', // Blue
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#84cc16', // Lime
  '#eab308', // Yellow
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#ec4899', // Pink
  '#a855f7', // Purple
  '#8b5cf6', // Violet
  '#6366f1', // Indigo
  '#64748b', // Slate
];

export const ColorPicker: React.FC<ColorPickerProps> = ({
  color,
  onChange,
  label,
  presets = defaultPresets,
}) => {
  const [inputValue, setInputValue] = useState(color);
  const [isOpen, setIsOpen] = useState(false);

  // Sincronizar inputValue com color prop apenas quando color muda externamente
  useEffect(() => {
    setInputValue(color);
  }, [color]);

  const handleInputChange = useCallback((value: string) => {
    setInputValue(value);
    if (/^#[0-9A-F]{6}$/i.test(value)) {
      onChange(value);
    }
  }, [onChange]);

  const handlePresetClick = useCallback((presetColor: string) => {
    setInputValue(presetColor);
    onChange(presetColor);
    setIsOpen(false);
  }, [onChange]);

  const togglePopover = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  return (
    <div className="space-y-2">
      {label && <Label className="text-foreground">{label}</Label>}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-start bg-card text-foreground border-border hover:bg-muted"
            onClick={togglePopover}
          >
            <div
              className="w-4 h-4 rounded mr-2 border border-border"
              style={{ backgroundColor: color }}
            />
            <span className="text-foreground">{color}</span>
            <Palette className="ml-auto h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 bg-card border-border">
          <div className="space-y-4">
            <div>
              <Label htmlFor="color-input" className="text-foreground">Cor Personalizada</Label>
              <Input
                id="color-input"
                type="text"
                placeholder="#3b82f6"
                value={inputValue}
                onChange={(e) => handleInputChange(e.target.value)}
                className="mt-1 bg-card text-foreground border-border"
              />
            </div>
            
            <div>
              <Label className="text-foreground">Cores Predefinidas</Label>
              <div className="grid grid-cols-6 gap-2 mt-2">
                {presets.map((preset) => (
                  <button
                    key={preset}
                    className="w-8 h-8 rounded border border-border hover:scale-110 transition-transform relative"
                    style={{ backgroundColor: preset }}
                    onClick={() => handlePresetClick(preset)}
                  >
                    {color === preset && (
                      <Check className="w-4 h-4 text-white absolute inset-0 m-auto drop-shadow-lg" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
