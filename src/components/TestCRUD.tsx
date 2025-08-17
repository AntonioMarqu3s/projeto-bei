import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

interface TestUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export const TestCRUD: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [users, setUsers] = useState<TestUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Buscando usuários...');
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, role')
        .limit(5);

      if (error) {
        console.error('Erro ao buscar usuários:', error);
        throw error;
      }

      console.log('Usuários encontrados:', data);
      setUsers(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('Erro na busca:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const testCreate = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      console.log('Testando criação de usuário...');
      const { data, error } = await supabase
        .from('users')
        .insert({
          name: 'Teste Frontend',
          email: 'teste.frontend@test.com',
          role: 'technician',
          available: true
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar usuário:', error);
        throw error;
      }

      console.log('Usuário criado:', data);
      setSuccess('Usuário criado com sucesso!');
      fetchUsers();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('Erro na criação:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const testUpdate = async (userId: string) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      console.log('Testando atualização de usuário:', userId);
      const { data, error } = await supabase
        .from('users')
        .update({ name: 'Teste Frontend Atualizado' })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar usuário:', error);
        throw error;
      }

      console.log('Usuário atualizado:', data);
      setSuccess('Usuário atualizado com sucesso!');
      fetchUsers();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('Erro na atualização:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const testDelete = async (userId: string) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      console.log('Testando exclusão de usuário:', userId);
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) {
        console.error('Erro ao excluir usuário:', error);
        throw error;
      }

      console.log('Usuário excluído com sucesso');
      setSuccess('Usuário excluído com sucesso!');
      fetchUsers();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('Erro na exclusão:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchUsers();
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="p-4">
        <h2 className="text-xl font-bold mb-4">Teste CRUD</h2>
        <p>Você precisa estar autenticado para usar este teste.</p>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Teste CRUD - Usuários</h2>
      
      <div className="mb-4">
        <p><strong>Usuário logado:</strong> {user?.name} ({user?.email})</p>
        <p><strong>Role:</strong> {user?.role}</p>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={fetchUsers}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Carregando...' : 'Buscar Usuários'}
        </button>
        
        <button
          onClick={testCreate}
          disabled={loading}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          Criar Usuário Teste
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          <strong>Erro:</strong> {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          {success}
        </div>
      )}

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium mb-4">Usuários ({users.length})</h3>
          
          {users.length === 0 ? (
            <p className="text-gray-500">Nenhum usuário encontrado.</p>
          ) : (
            <div className="space-y-2">
              {users.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-gray-600">{user.email} - {user.role}</p>
                    <p className="text-xs text-gray-400">{user.id}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => testUpdate(user.id)}
                      disabled={loading}
                      className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50"
                    >
                      Atualizar
                    </button>
                    <button
                      onClick={() => testDelete(user.id)}
                      disabled={loading}
                      className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};