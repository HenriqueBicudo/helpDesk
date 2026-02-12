import { useState, useEffect, useRef } from 'react';
import { Search, Ticket, Building2, User, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

type SearchResult = {
  type: 'ticket' | 'company' | 'requester';
  id: number;
  title: string;
  subtitle?: string;
  url: string;
};

export function GlobalSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [, navigate] = useLocation();
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Buscar dados apenas quando há termo de busca
  const { data: results = [], isLoading } = useQuery<SearchResult[]>({
    queryKey: ['/api/search', searchTerm],
    queryFn: async () => {
      if (searchTerm.length < 2) return [];
      
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchTerm)}`);
      if (!response.ok) throw new Error('Erro ao buscar');
      return response.json();
    },
    enabled: searchTerm.length >= 2,
  });

  // Fechar ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Atalho de teclado (Ctrl+K ou Cmd+K)
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      
      // ESC para fechar
      if (event.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelectResult = (result: SearchResult) => {
    navigate(result.url);
    setIsOpen(false);
    setSearchTerm('');
  };

  const getResultIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'ticket':
        return <Ticket className="h-4 w-4" />;
      case 'company':
        return <Building2 className="h-4 w-4" />;
      case 'requester':
        return <User className="h-4 w-4" />;
    }
  };

  const getResultTypeLabel = (type: SearchResult['type']) => {
    switch (type) {
      case 'ticket':
        return 'Chamado';
      case 'company':
        return 'Empresa';
      case 'requester':
        return 'Cliente';
    }
  };

  return (
    <div ref={searchRef} className="relative w-full md:w-80">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-muted-foreground" />
        </div>
        <Input
          ref={inputRef}
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="pl-10 pr-20 bg-background border-input focus:ring-2 focus:ring-primary focus:border-primary transition-all"
          placeholder="Buscar... (Ctrl+K)"
        />
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <kbd className="hidden sm:inline-flex items-center gap-1 rounded border border-border bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground">
            <span className="text-xs">⌘</span>K
          </kbd>
        </div>
      </div>

      {/* Resultados */}
      {isOpen && searchTerm.length >= 2 && (
        <div className="absolute top-full mt-2 w-full max-w-md bg-card border border-border rounded-lg shadow-lg z-50 max-h-96 overflow-auto">
          {isLoading && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Buscando...
            </div>
          )}

          {!isLoading && results.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Nenhum resultado encontrado
            </div>
          )}

          {!isLoading && results.length > 0 && (
            <div className="py-2">
              {results.map((result, index) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleSelectResult(result)}
                  className={cn(
                    "w-full px-4 py-3 text-left hover:bg-accent transition-colors",
                    "flex items-center gap-3 group cursor-pointer",
                    index !== results.length - 1 && "border-b border-border"
                  )}
                >
                  <div className="flex-shrink-0 p-2 rounded-md bg-primary/10 text-primary">
                    {getResultIcon(result.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground uppercase">
                        {getResultTypeLabel(result.type)}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-foreground truncate">
                      {result.title}
                    </p>
                    {result.subtitle && (
                      <p className="text-xs text-muted-foreground truncate">
                        {result.subtitle}
                      </p>
                    )}
                  </div>

                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
