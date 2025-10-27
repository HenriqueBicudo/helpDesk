import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Team } from '@shared/schema';

export function useTeams() {
  return useQuery<Team[]>({
    queryKey: ['/api/access/teams'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/access/teams');
      return response.json();
    },
  });
}

export function getTeamName(teams: Team[], teamId: number | null | undefined): string | null {
  if (!teamId || !teams) return null;
  const team = teams.find(t => t.id === teamId);
  return team?.name || null;
}

export function getTeamCategory(teamId: number | null | undefined): string | null {
  if (!teamId) return null;
  
  // Mapeamento local que deve ser consistente com o backend
  const TEAM_CATEGORY_MAPPING: Record<number, string> = {
    1: 'technical_support',  // Suporte Técnico → technical_support
    2: 'other',              // Atendimento Geral → other  
    3: 'commercial',         // Suporte Comercial → commercial
  };
  
  return TEAM_CATEGORY_MAPPING[teamId] || null;
}
