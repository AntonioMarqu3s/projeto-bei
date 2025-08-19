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

export interface ExternalPersonFormData {
  name: string;
  role?: string;
  contact?: string;
  company?: string;
}

export interface DiaryFormData {
  plant_id: string;
  user_ids: string[];
  external_people?: ExternalPersonFormData[];
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

  // Carregar diários automaticamente quando o usuário estiver disponível
  useEffect(() => {
    if (user?.id && (user?.cluster_id || user?.role === 'admin')) {
      fetchDiaries();
    }
  }, [user?.id, user?.cluster_id, user?.role]);

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
        .select('id, name, email, role, created_at, updated_at')
        .eq('cluster_id', user.cluster_id)
        .order('name');

      if (error) throw error;
      setClusterUsers((data || []).map(user => ({
        ...user,
        available: true // Adding the required 'available' property
      })));
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
    // Administradores podem buscar diários mesmo sem cluster_id
    if (!user?.cluster_id && user?.role !== 'admin') return;

    try {
      setLoading(true);
      let query = supabase
        .from('diaries')
        .select(`
          *,
          plant:plants!inner(name, cluster:clusters!inner(id, name)),
          user:users(id, name, email, role, cluster_id),
          activities:diary_activities(*),
          participants:diary_users(
            user:users(id, name, email, role, cluster_id),
            role
          ),
          external_people:diary_external_people(
            external_person:external_people(*)
          )
        `)
        .order('created_at', { ascending: false });
      
      // Administradores veem todos os diários, outros usuários apenas do seu cluster
      if (user.role !== 'admin') {
        query = query.eq('plant.cluster.id', user.cluster_id);
      }

      if (date) {
        query = query.eq('date', date);
      }

      const { data, error } = await query;

      if (error) {
        console.error('fetchDiaries: Erro na consulta:', error);
        throw error;
      }
      
      console.log('fetchDiaries: Diários carregados:', data?.length || 0, data);
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

      // Criar relacionamentos com usuários participantes
      if (formData.user_ids && formData.user_ids.length > 0) {
        const diaryUsersData = formData.user_ids.map(userId => ({
          diary_id: diary.id,
          user_id: userId,
          role: userId === user.id ? 'creator' : 'participant'
        }));

        console.log('createDiary: Dados dos usuários participantes:', diaryUsersData);

        const { error: usersError } = await supabase
          .from('diary_users')
          .insert(diaryUsersData);

        if (usersError) {
          console.error('createDiary: Erro ao inserir usuários participantes:', usersError);
          throw usersError;
        }

        console.log('createDiary: Usuários participantes adicionados com sucesso');
      }

      // Criar pessoas externas e relacionamentos
      if (formData.external_people && formData.external_people.length > 0) {
        for (const externalPerson of formData.external_people) {
          // Criar pessoa externa
          const { data: createdPerson, error: personError } = await supabase
            .from('external_people')
            .insert({
              name: externalPerson.name,
              role: externalPerson.role,
              contact: externalPerson.contact,
              company: externalPerson.company
            })
            .select()
            .single();

          if (personError) {
            console.error('createDiary: Erro ao criar pessoa externa:', personError);
            throw personError;
          }

          // Criar relacionamento com o diário
          const { error: relationError } = await supabase
            .from('diary_external_people')
            .insert({
              diary_id: diary.id,
              external_person_id: createdPerson.id
            });

          if (relationError) {
            console.error('createDiary: Erro ao relacionar pessoa externa:', relationError);
            throw relationError;
          }
        }

        console.log('createDiary: Pessoas externas adicionadas com sucesso');
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
  const updateDiary = async (id: string, formData: DiaryFormData): Promise<boolean> => {
    console.log('updateDiary: Iniciando atualização do diário', { id, formData });
    
    if (!user?.id || !user?.cluster_id) {
      console.error('updateDiary: Usuário não autenticado', { userId: user?.id, clusterId: user?.cluster_id });
      setError('Usuário não autenticado');
      return false;
    }

    try {
      setLoading(true);
      setError(null);

      // Atualizar o diário principal
      const diaryData = {
        plant_id: formData.plant_id,
        date: formData.date,
        general_observations: formData.general_observations,
      };

      console.log('updateDiary: Atualizando dados do diário:', diaryData);

      const { error: diaryError } = await supabase
        .from('diaries')
        .update(diaryData)
        .eq('id', id);

      if (diaryError) {
        console.error('updateDiary: Erro ao atualizar diário:', diaryError);
        throw diaryError;
      }

      console.log('updateDiary: Diário atualizado com sucesso');

      // Remover atividades existentes
      const { error: deleteActivitiesError } = await supabase
        .from('diary_activities')
        .delete()
        .eq('diary_id', id);

      if (deleteActivitiesError) {
        console.error('updateDiary: Erro ao remover atividades existentes:', deleteActivitiesError);
        throw deleteActivitiesError;
      }

      // Criar novas atividades
      if (formData.activities && formData.activities.length > 0) {
        const activitiesData = formData.activities.map(activity => ({
          diary_id: id,
          equipment: activity.equipment,
          activity: activity.activity,
          start_time: activity.start_time,
          end_time: activity.end_time,
          ss_number: activity.ss_number,
          observations: activity.observations,
        }));

        console.log('updateDiary: Inserindo novas atividades:', activitiesData);

        const { error: activitiesError } = await supabase
          .from('diary_activities')
          .insert(activitiesData);

        if (activitiesError) {
          console.error('updateDiary: Erro ao inserir atividades:', activitiesError);
          throw activitiesError;
        }

        console.log('updateDiary: Atividades atualizadas com sucesso');
      }

      // Remover usuários participantes existentes
      const { error: deleteUsersError } = await supabase
        .from('diary_users')
        .delete()
        .eq('diary_id', id);

      if (deleteUsersError) {
        console.error('updateDiary: Erro ao remover usuários existentes:', deleteUsersError);
        throw deleteUsersError;
      }

      // Criar novos relacionamentos com usuários participantes
      if (formData.user_ids && formData.user_ids.length > 0) {
        const diaryUsersData = formData.user_ids.map(userId => ({
          diary_id: id,
          user_id: userId,
          role: userId === user.id ? 'creator' : 'participant'
        }));

        console.log('updateDiary: Inserindo novos usuários participantes:', diaryUsersData);

        const { error: usersError } = await supabase
          .from('diary_users')
          .insert(diaryUsersData);

        if (usersError) {
          console.error('updateDiary: Erro ao inserir usuários participantes:', usersError);
          throw usersError;
        }

        console.log('updateDiary: Usuários participantes atualizados com sucesso');
      }

      // Remover pessoas externas existentes
      const { error: deleteExternalError } = await supabase
        .from('diary_external_people')
        .delete()
        .eq('diary_id', id);

      if (deleteExternalError) {
        console.error('updateDiary: Erro ao remover pessoas externas existentes:', deleteExternalError);
        throw deleteExternalError;
      }

      // Criar novas pessoas externas e relacionamentos
      if (formData.external_people && formData.external_people.length > 0) {
        for (const externalPerson of formData.external_people) {
          // Criar pessoa externa
          const { data: createdPerson, error: personError } = await supabase
            .from('external_people')
            .insert({
              name: externalPerson.name,
              role: externalPerson.role,
              contact: externalPerson.contact,
              company: externalPerson.company
            })
            .select()
            .single();

          if (personError) {
            console.error('updateDiary: Erro ao criar pessoa externa:', personError);
            throw personError;
          }

          // Criar relacionamento com o diário
          const { error: relationError } = await supabase
            .from('diary_external_people')
            .insert({
              diary_id: id,
              external_person_id: createdPerson.id
            });

          if (relationError) {
            console.error('updateDiary: Erro ao relacionar pessoa externa:', relationError);
            throw relationError;
          }
        }

        console.log('updateDiary: Pessoas externas atualizadas com sucesso');
      }

      // Recarregar diários após atualização
      await fetchDiaries();
      console.log('updateDiary: Processo de atualização concluído com sucesso');
      return true;
    } catch (err) {
      console.error('updateDiary: Erro geral:', err);
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

  // Função para buscar usuários disponíveis do cluster (para seleção no formulário)
  const getAvailableUsers = useCallback(async () => {
    if (!user?.cluster_id) return [];
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, role')
        .eq('cluster_id', user.cluster_id)
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Erro ao buscar usuários disponíveis:', err);
      return [];
    }
  }, [user?.cluster_id]);

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
    getAvailableUsers,
    createDiary,
    updateDiary,
    deleteDiary,
    
    // Utilitários
    clearError: () => setError(null),
  };
};