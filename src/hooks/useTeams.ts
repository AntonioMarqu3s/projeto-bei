import { useState, useEffect, useCallback } from 'react';
import { supabase, Team, TeamMember, User } from '../lib/supabase';
import { useAuth } from './useAuth';

export interface TeamWithMembers extends Team {
  members: (TeamMember & { user: User })[];
  memberCount: number;
}

export const useTeams = () => {
  const { user } = useAuth();
  const [teams, setTeams] = useState<TeamWithMembers[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTeams = useCallback(async () => {
    if (!user?.cluster_id) return;
    
    try {
      setLoading(true);
      setError(null);

      // Buscar equipes do cluster do usuário
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select(`
          *,
          members:team_members(
            *,
            user:users(
              id,
              name,
              email,
              role,
              available
            )
          )
        `)
        .eq('cluster_id', user.cluster_id)
        .order('name');

      if (teamsError) throw teamsError;

      // Processar dados para incluir contagem de membros
      const processedTeams: TeamWithMembers[] = (teamsData || []).map(team => ({
        ...team,
        members: team.members || [],
        memberCount: team.members?.length || 0
      }));

      setTeams(processedTeams);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar equipes');
    } finally {
      setLoading(false);
    }
  }, [user?.cluster_id]);

  const createTeam = async (teamData: { name: string; description?: string }) => {
    if (!user?.cluster_id) throw new Error('Usuário não possui cluster associado');
    
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('teams')
        .insert([{
          name: teamData.name,
          description: teamData.description,
          cluster_id: user.cluster_id,
          created_by: user.id
        }])
        .select()
        .single();

      if (error) throw error;

      // Atualizar lista de equipes
      await fetchTeams();
      
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar equipe';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const updateTeam = async (teamId: string, teamData: { name: string; description?: string }) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('teams')
        .update({
          name: teamData.name,
          description: teamData.description,
          updated_at: new Date().toISOString()
        })
        .eq('id', teamId)
        .select()
        .single();

      if (error) throw error;

      // Atualizar lista de equipes
      await fetchTeams();
      
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar equipe';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const deleteTeam = async (teamId: string) => {
    try {
      setLoading(true);
      setError(null);

      // Primeiro, remover todos os membros da equipe
      const { error: membersError } = await supabase
        .from('team_members')
        .delete()
        .eq('team_id', teamId);

      if (membersError) throw membersError;

      // Depois, remover a equipe
      const { error: teamError } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId);

      if (teamError) throw teamError;

      // Atualizar lista de equipes
      await fetchTeams();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao excluir equipe';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const addTeamMember = async (teamId: string, userId: string, role: 'leader' | 'member' = 'member') => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('team_members')
        .insert([{
          team_id: teamId,
          user_id: userId,
          role: role
        }])
        .select()
        .single();

      if (error) throw error;

      // Atualizar lista de equipes
      await fetchTeams();
      
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao adicionar membro à equipe';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const removeTeamMember = async (memberId: string) => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      // Atualizar lista de equipes
      await fetchTeams();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao remover membro da equipe';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const updateTeamMemberRole = async (memberId: string, role: 'leader' | 'member') => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('team_members')
        .update({ role })
        .eq('id', memberId)
        .select()
        .single();

      if (error) throw error;

      // Atualizar lista de equipes
      await fetchTeams();
      
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar função do membro';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getAvailableUsers = async (): Promise<User[]> => {
    if (!user?.cluster_id) return [];
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('cluster_id', user.cluster_id)
        .in('role', ['technician', 'maintainer'])
        .eq('available', true)
        .order('name');

      if (error) throw error;
      
      return data || [];
    } catch (err) {
      console.error('Erro ao buscar usuários disponíveis:', err);
      return [];
    }
  };

  const getTeamById = (teamId: string): TeamWithMembers | undefined => {
    return teams.find(team => team.id === teamId);
  };

  const getUserTeams = (userId: string): TeamWithMembers[] => {
    return teams.filter(team => 
      team.members.some(member => member.user_id === userId)
    );
  };

  const isUserInTeam = (teamId: string, userId: string): boolean => {
    const team = getTeamById(teamId);
    return team ? team.members.some(member => member.user_id === userId) : false;
  };

  // Função removida pois não há mais distinção de roles

  // Carregar equipes quando o usuário estiver disponível
  useEffect(() => {
    if (user?.cluster_id) {
      fetchTeams();
    }
  }, [user?.cluster_id, fetchTeams]);

  return {
    teams,
    loading,
    error,
    fetchTeams,
    createTeam,
    updateTeam,
    deleteTeam,
    addTeamMember,
    removeTeamMember,
    updateTeamMemberRole,
    getAvailableUsers,
    getTeamById,
    getUserTeams,
    isUserInTeam,
    clearError: () => setError(null)
  };
};

export default useTeams;