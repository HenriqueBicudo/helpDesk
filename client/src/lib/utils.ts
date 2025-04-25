import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string, formatStr: string = "dd/MM/yyyy HH:mm"): string {
  if (!date) return "";
  const dateObj = date instanceof Date ? date : new Date(date);
  return format(dateObj, formatStr, { locale: ptBR });
}

export function getInitials(name: string): string {
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

export function translateStatus(status: string): string {
  const statusMap: Record<string, string> = {
    open: "Aberto",
    in_progress: "Em andamento",
    pending: "Pendente",
    resolved: "Resolvido",
    closed: "Fechado"
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

export function statusToColor(status: string): string {
  const statusColorMap: Record<string, string> = {
    open: "blue",
    in_progress: "yellow", 
    pending: "red",
    resolved: "green",
    closed: "gray"
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
