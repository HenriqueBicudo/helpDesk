// Mapeamento de team para categoria de ticket
// As categorias agora são os NOMES dos teams, não categorias fixas

export const TEAM_CATEGORY_MAPPING: Record<number, string> = {
  1: 'Suporte Técnico',     // Team ID 1 → "Suporte Técnico"
  2: 'Atendimento Geral',   // Team ID 2 → "Atendimento Geral"  
  3: 'Suporte Comercial',   // Team ID 3 → "Suporte Comercial"
};

// Função para obter a categoria (nome do team) baseada no team do usuário
export function getCategoryByTeamId(teamId: number | null | undefined): string | null {
  if (!teamId) return null;
  return TEAM_CATEGORY_MAPPING[teamId] || null;
}

// Função para obter o nome do team baseado no ID
export function getTeamNameById(teamId: number | null | undefined): string | null {
  return getCategoryByTeamId(teamId); // Agora são a mesma coisa
}

// Função para validar se uma categoria é válida (agora são nomes de teams)
export function isValidCategory(category: string): boolean {
  const validCategories = Object.values(TEAM_CATEGORY_MAPPING);
  return validCategories.includes(category);
}
