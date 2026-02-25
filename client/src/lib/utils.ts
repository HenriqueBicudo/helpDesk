import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string, formatStr: string = "dd/MM/yyyy HH:mm"): string {
  if (!date) return "";
  const dateObj = date instanceof Date ? date : new Date(date);
  return format(dateObj, formatStr, { locale: ptBR });
}

export function formatRelativeTime(date: Date | string): string {
  if (!date) return "";
  const dateObj = date instanceof Date ? date : new Date(date);
  return formatDistanceToNow(dateObj, { addSuffix: true, locale: ptBR });
}

export function getInitials(name: string): string {
  if (!name || typeof name !== 'string') return '??';
  return name
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

export function translateStatus(status: string, customName?: string): string {
  // Se tiver nome customizado, usa ele
  if (customName) return customName;
  
  // Fallback para nomes padrão
  const statusMap: Record<string, string> = {
    open: "Aberto",
    in_progress: "Em andamento",
    pending: "Pendente",
    resolved: "Resolvido",
    closed: "Fechado",
    waiting_customer: "Aguardando Cliente"
  };
  return statusMap[status] || status;
}

export function translatePriority(priority: string): string {
  const priorityMap: Record<string, string> = {
    low: "Baixa",
    medium: "Média",
    high: "Alta",
    critical: "Crítica"
  };
  return priorityMap[priority] || priority;
}

export function translateCategory(category: string): string {
  const categoryMap: Record<string, string> = {
    technical_support: "Suporte técnico",
    financial: "Financeiro",
    commercial: "Comercial",
    other: "Outros"
  };
  return categoryMap[category] || category;
}

export function statusToColor(status: string, customColor?: string): string {
  // Se tiver cor customizada, usa ela  
  if (customColor) return customColor;
  
  // Fallback para cores padrão
  const statusColorMap: Record<string, string> = {
    open: "blue",
    in_progress: "yellow", 
    pending: "red",
    resolved: "green",
    closed: "gray",
    waiting_customer: "purple"
  };
  return statusColorMap[status] || "gray";
}

export function priorityToColor(priority: string): string {
  const priorityColorMap: Record<string, string> = {
    low: "gray",
    medium: "blue",
    high: "red",
    critical: "purple"
  };
  return priorityColorMap[priority] || "gray";
}

export function formatTimeRemaining(milliseconds: number): string {
  const absMs = Math.abs(milliseconds);
  const seconds = Math.floor(absMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    const remainingHours = hours % 24;
    return days === 1 
      ? `${days} dia${remainingHours > 0 ? ` e ${remainingHours}h` : ''}` 
      : `${days} dias${remainingHours > 0 ? ` e ${remainingHours}h` : ''}`;
  } else if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return hours === 1 
      ? `${hours} hora${remainingMinutes > 0 ? ` e ${remainingMinutes}min` : ''}`
      : `${hours} horas${remainingMinutes > 0 ? ` e ${remainingMinutes}min` : ''}`;
  } else if (minutes > 0) {
    return minutes === 1 ? `${minutes} minuto` : `${minutes} minutos`;
  } else {
    return seconds === 1 ? `${seconds} segundo` : `${seconds} segundos`;
  }
}
