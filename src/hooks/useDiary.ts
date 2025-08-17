import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Diary, Plant, User } from '../lib/supabase';
import { useAuth } from './useAuth';

export interface ActivityFormData {
  equipment: string;
  activity: string;
  start_time: string;
  end_time: string;
  ss_number?: string;
  observations?: string;
}

export interface DiaryFormData {
  plant_id: string;
  user_ids: string[];
  date: string;
  activities: ActivityFormData[];
  general_observations?: string;
}

export const useDiary = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [clusterUsers, setClusterUsers] = useState<User[]>([]);
  // Removido maintenances - não é mais utilizado
  const [diaries, setDiaries] = useState<Diary[]>([]);

  // Buscar usinas do cluster do usuário
  const fetchPlants = useCallback(async () => {
    if (!user?.cluster_id) {
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('plants')
        .select('*')
        .eq('cluster_id', user.cluster_id)
        .order('name');

      if (error) {
        console.error('fetchPlants: Erro na consulta:', error);
        throw error;
      }
      
      setPlants(data || []);
    } catch (err) {
      console.error('fetchPlants: Erro geral:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar usinas');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Função para buscar usuários do cluster
  const fetchClusterUsers = useCallback(async () => {
    if (!user?.cluster_id) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, role, available, created_at, updated_at')
        .eq('cluster_id', user.cluster_id)
        .eq('available', true);

      if (error) throw error;
      setClusterUsers(data || []);
    } catch (error) {
      console.error('Erro ao buscar usuários do cluster:', error);
      setError('Erro ao carregar usuários do cluster');
    } finally {
      setLoading(false);
    }
  }, [user?.cluster_id]);

  // Função removida - fetchMaintenances não é mais necessária

  // Buscar diários
  const fetchDiaries = useCallback(async (date?: string) => {
    if (!user?.cluster_id) return;

    try {
      setLoading(true);
      let query = supabase
        .from('diaries')
        .select(`
          *,
          plant:plants(name),
          team:teams(name),
          user:users(name),
          activities:diary_activities(*)
        `)
        .eq('cluster_id', user.cluster_id)
        .order('created_at', { ascending: false });

      if (date) {
        query = query.eq('date', date);
      }

      const { data, error } = await query;

      if (error) throw error;
      setDiaries(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar diários');
    } finally {
      setLoading(false);
    }
  }, [user?.cluster_id]);

  // Criar novo diário
  const createDiary = async (formData: DiaryFormData): Promise<boolean> => {
    console.log('createDiary: Iniciando criação do diário', formData);
    console.log('createDiary: user:', user);
    
    if (!user?.id || !user?.cluster_id) {
      console.error('createDiary: Usuário não autenticado', { userId: user?.id, clusterId: user?.cluster_id });
      setError('Usuário não autenticado');
      return false;
    }

    try {
      setLoading(true);
      setError(null);

      // Criar o diário principal
      const diaryData = {
        user_id: user.id,
        cluster_id: user.cluster_id,
        plant_id: formData.plant_id,
        date: formData.date,
        status: 'pending' as const,
        general_observations: formData.general_observations,
      };

      console.log('createDiary: Dados do diário a serem inseridos:', diaryData);

      const { data: diary, error: diaryError } = await supabase
        .from('diaries')
        .insert([diaryData])
        .select()
        .single();

      if (diaryError) {
        console.error('createDiary: Erro ao inserir diário:', diaryError);
        throw diaryError;
      }

      console.log('createDiary: Diário criado com sucesso:', diary);

      // Criar as atividades associadas
      if (formData.activities && formData.activities.length > 0) {
        const activitiesData = formData.activities.map(activity => ({
          diary_id: diary.id,
          equipment: activity.equipment,
          activity: activity.activity,
          start_time: activity.start_time,
          end_time: activity.end_time,
          ss_number: activity.ss_number,
          observations: activity.observations,
        }));

        console.log('createDiary: Dados das atividades a serem inseridas:', activitiesData);

        const { error: activitiesError } = await supabase
          .from('diary_activities')
          .insert(activitiesData);

        if (activitiesError) {
          console.error('createDiary: Erro ao inserir atividades:', activitiesError);
          throw activitiesError;
        }

        console.log('createDiary: Atividades criadas com sucesso');
      }

      // Recarregar diários após criação
      await fetchDiaries();
      console.log('createDiary: Processo concluído com sucesso');
      return true;
    } catch (err) {
      console.error('createDiary: Erro geral:', err);
      setError(err instanceof Error ? err.message : 'Erro ao criar diário');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Atualizar diário
  const updateDiary = async (id: string, formData: Partial<DiaryFormData>): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('diaries')
        .update(formData)
        .eq('id', id);

      if (error) throw error;

      // Recarregar diários após atualização
      await fetchDiaries();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar diário');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Deletar diário
  const deleteDiary = async (id: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('diaries')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Recarregar diários após exclusão
      await fetchDiaries();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao deletar diário');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Carregar dados iniciais
  useEffect(() => {
    if (user?.cluster_id) {
      fetchPlants();
      fetchClusterUsers();
      fetchDiaries();
    }
  }, [user?.cluster_id, user?.id, fetchPlants, fetchClusterUsers, fetchDiaries]);

  return {
    // Estados
    loading,
    error,
    plants,
    clusterUsers,
    diaries,
    
    // Funções
    fetchPlants,
    fetchClusterUsers,
    fetchDiaries,
    createDiary,
    updateDiary,
    deleteDiary,
    
    // Utilitários
    clearError: () => setError(null),
  };
};