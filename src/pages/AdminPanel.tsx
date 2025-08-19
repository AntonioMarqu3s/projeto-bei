import React, { useState, useEffect } from 'react';
import { Users, Building2, Factory, Plus, Edit, Trash2, Search, Save, X, ArrowLeft, FileText, Eye } from 'lucide-react';
import { Button, Card, CardHeader, CardContent, Input, Select } from '../components/ui';
import { ConfirmModal } from '../components/ui';
import { DiaryDetailModal } from '../components/DiaryDetailModal';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase, supabaseAdmin, User, Cluster, Plant, Diary } from '../lib/supabase';
import { useDiary } from '../hooks/useDiary';
import { User as SupabaseAuthUser } from '@supabase/supabase-js';

interface NewUser {
  name: string;
  email: string;
  password?: string;
  role: 'technician' | 'maintainer' | 'cluster_manager' | 'admin';
  cluster_id?: string;
  availability: 'available' | 'unavailable' | 'on_leave';
}

interface NewCluster {
  name: string;
  description: string;
}

interface NewPlant {
  name: string;
  location: string;
  cluster_id: string;
}

export const AdminPanel: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const { diaries } = useDiary();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'users' | 'clusters' | 'plants' | 'diaries'>('users');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Estados para modal de diário
  const [selectedDiary, setSelectedDiary] = useState<Diary | null>(null);
  const [showDiaryModal, setShowDiaryModal] = useState(false);
  


  // Estados para usuários
  const [users, setUsers] = useState<User[]>([]);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState<NewUser>({
    name: '',
    email: '',
    role: 'technician',
    cluster_id: '',
    availability: 'available'
  });

  // Estados para clusters
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [showClusterForm, setShowClusterForm] = useState(false);
  const [editingCluster, setEditingCluster] = useState<Cluster | null>(null);
  const [newCluster, setNewCluster] = useState<NewCluster>({
    name: '',
    description: ''
  });

  // Estados para usinas
  const [plants, setPlants] = useState<Plant[]>([]);
  const [showPlantForm, setShowPlantForm] = useState(false);
  const [editingPlant, setEditingPlant] = useState<Plant | null>(null);
  const [newPlant, setNewPlant] = useState<NewPlant>({
    name: '',
    location: '',
    cluster_id: ''
  });

  const [searchTerm, setSearchTerm] = useState('');

  // Estados para modais de confirmação
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    variant: 'warning'
  });

  useEffect(() => {
    fetchClusters();
    fetchUsers();
    fetchPlants();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          cluster:clusters(name)
        `)
        .order('name');

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const fetchClusters = async () => {
    try {
      const { data, error } = await supabase
        .from('clusters')
        .select('*')
        .order('name');

      if (error) throw error;
      setClusters(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar clusters');
    }
  };

  const fetchPlants = async () => {
    try {
      const { data, error } = await supabase
        .from('plants')
        .select(`
          *,
          cluster:clusters(name)
        `)
        .order('name');

      if (error) throw error;
      setPlants(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar usinas');
    }
  };

  const handleCreateUser = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!newUser.password) {
        throw new Error('Senha é obrigatória para criar um usuário');
      }

      if (!supabaseAdmin) {
        throw new Error('Service role key não configurada. Não é possível criar usuários.');
      }

      // Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: newUser.email,
        password: newUser.password,
        email_confirm: true
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Falha ao criar usuário');

      // Inserir dados adicionais na tabela users
      const { error } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          cluster_id: newUser.cluster_id || null,
          available: newUser.availability === 'available'
        });

      if (error) throw error;

      setSuccess('Usuário criado com sucesso!');
      setNewUser({ name: '', email: '', password: '', role: 'technician', cluster_id: '', availability: 'available' });
      setShowUserForm(false);
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar usuário');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    try {
      setLoading(true);
      setError(null);

      // Se uma nova senha foi fornecida, atualizar no Supabase Auth
      if (newUser.password && newUser.password.trim() !== '') {
        if (!supabaseAdmin) {
          throw new Error('Service role key não configurada. Não é possível atualizar senhas.');
        }
        
        if (!editingUser?.email) {
          throw new Error('Selecione um usuário válido com email para atualizar a senha.');
        }
        
        // Buscar o usuário na tabela auth.users pelo email
        const { data: authUsers, error: searchError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        
        if (searchError) {
          throw new Error(`Erro ao buscar usuário: ${searchError.message}`);
        }
        
        const authUser = authUsers?.users?.find((u: SupabaseAuthUser) => u.email?.toLowerCase() === editingUser.email?.toLowerCase());
        
        if (!authUser) {
          throw new Error('Usuário não encontrado no sistema de autenticação. Apenas usuários criados através do sistema podem ter suas senhas alteradas.');
        }
        
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
          authUser.id,
          { password: newUser.password }
        );
        
        if (authError) {
          throw new Error(`Erro ao atualizar senha: ${authError.message}`);
        }
      }

      // Atualizar dados do usuário na tabela users
      const { error } = await supabase
        .from('users')
        .update({
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          cluster_id: newUser.cluster_id || null,
          available: newUser.availability === 'available'
        })
        .eq('id', editingUser.id);

      if (error) throw error;

      setSuccess('Usuário atualizado com sucesso!');
      setEditingUser(null);
      setNewUser({ name: '', email: '', password: '', role: 'technician', cluster_id: '', availability: 'available' });
      setShowUserForm(false);
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar usuário');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      setSuccess('Usuário excluído com sucesso!');
      fetchUsers();
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir usuário');
    } finally {
      setLoading(false);
    }
  };

  const confirmDeleteUser = (userId: string, userName: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Usuário',
      message: `Tem certeza que deseja excluir o usuário "${userName}"? Esta ação não pode ser desfeita.`,
      onConfirm: () => handleDeleteUser(userId),
      variant: 'danger'
    });
  };

  const handleCreateCluster = async () => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('clusters')
        .insert([newCluster]);

      if (error) throw error;

      setSuccess('Cluster criado com sucesso!');
      setNewCluster({ name: '', description: '' });
      setShowClusterForm(false);
      fetchClusters();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar cluster');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCluster = async () => {
    if (!editingCluster) return;

    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('clusters')
        .update(newCluster)
        .eq('id', editingCluster.id);

      if (error) throw error;

      setSuccess('Cluster atualizado com sucesso!');
      setEditingCluster(null);
      setNewCluster({ name: '', description: '' });
      setShowClusterForm(false);
      fetchClusters();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar cluster');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCluster = async (clusterId: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('clusters')
        .delete()
        .eq('id', clusterId);

      if (error) throw error;

      setSuccess('Cluster excluído com sucesso!');
      fetchClusters();
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir cluster');
    } finally {
      setLoading(false);
    }
  };

  const confirmDeleteCluster = (clusterId: string, clusterName: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Cluster',
      message: `Tem certeza que deseja excluir o cluster "${clusterName}"? Isso afetará todos os usuários e usinas associados. Esta ação não pode ser desfeita.`,
      onConfirm: () => handleDeleteCluster(clusterId),
      variant: 'danger'
    });
  };

  const handleCreatePlant = async () => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('plants')
        .insert([newPlant]);

      if (error) throw error;

      setSuccess('Usina criada com sucesso!');
      setNewPlant({ name: '', location: '', cluster_id: '' });
      setShowPlantForm(false);
      fetchPlants();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar usina');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePlant = async () => {
    if (!editingPlant) return;

    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('plants')
        .update(newPlant)
        .eq('id', editingPlant.id);

      if (error) throw error;

      setSuccess('Usina atualizada com sucesso!');
      setEditingPlant(null);
      setNewPlant({ name: '', location: '', cluster_id: '' });
      setShowPlantForm(false);
      fetchPlants();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar usina');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePlant = async (plantId: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('plants')
        .delete()
        .eq('id', plantId);

      if (error) throw error;

      setSuccess('Usina excluída com sucesso!');
      fetchPlants();
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir usina');
    } finally {
      setLoading(false);
    }
  };

  const confirmDeletePlant = (plantId: string, plantName: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Usina',
      message: `Tem certeza que deseja excluir a usina "${plantName}"? Esta ação não pode ser desfeita.`,
      onConfirm: () => handleDeletePlant(plantId),
      variant: 'danger'
    });
  };

  const startEditUser = (user: User) => {
    setEditingUser(user);
    setNewUser({
      name: user.name,
      email: user.email,
      role: user.role,
      cluster_id: user.cluster_id || '',
      availability: user.available ? 'available' : 'unavailable'
    });
    setShowUserForm(true);
  };

  const startEditCluster = (cluster: Cluster) => {
    setEditingCluster(cluster);
    setNewCluster({
      name: cluster.name,
      description: cluster.description || ''
    });
    setShowClusterForm(true);
  };

  const startEditPlant = (plant: Plant) => {
    setEditingPlant(plant);
    setNewPlant({
      name: plant.name,
      location: plant.location || '',
      cluster_id: plant.cluster_id
    });
    setShowPlantForm(true);
  };

  const cancelForm = () => {
    setShowUserForm(false);
    setShowClusterForm(false);
    setShowPlantForm(false);
    setEditingUser(null);
    setEditingCluster(null);
    setEditingPlant(null);
    setNewUser({ name: '', email: '', password: '', role: 'technician', cluster_id: '', availability: 'available' });
    setNewCluster({ name: '', description: '' });
    setNewPlant({ name: '', location: '', cluster_id: '' });
    setError(null);
  };



  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredClusters = clusters.filter(cluster => 
    cluster.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPlants = plants.filter(plant => 
    plant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (plant.location && plant.location.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card>
          <CardContent>
            <p className="text-red-600">Acesso negado. Apenas administradores podem acessar esta página.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
                icon={ArrowLeft}
                className="mr-2"
              >
                Dashboard
              </Button>
              <Building2 className="h-8 w-8 text-blue-600" />
              <h1 className="text-xl font-semibold text-gray-900">
                Painel Administrativo
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Olá, {user?.name}
              </span>
              <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                Administrador
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Messages */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}


          
          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-4">
              <p className="text-sm text-green-800">{success}</p>
              <button 
                onClick={() => setSuccess(null)}
                className="ml-2 text-green-600 hover:text-green-800"
              >
                ×
              </button>
            </div>
          )}

          {/* Tabs */}
          <div className="mb-6">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('users')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'users'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Users className="h-4 w-4 inline mr-2" />
                Usuários
              </button>
              <button
                onClick={() => setActiveTab('clusters')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'clusters'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Building2 className="h-4 w-4 inline mr-2" />
                Clusters
              </button>
              <button
                onClick={() => setActiveTab('plants')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'plants'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Factory className="h-4 w-4 inline mr-2" />
                Usinas
              </button>
              <button
                onClick={() => setActiveTab('diaries')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'diaries'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FileText className="h-4 w-4 inline mr-2" />
                Diários
              </button>

            </nav>
          </div>

          {/* Search and Add Button */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex-1 max-w-md">
              <Input
                type="text"
                placeholder={`Buscar ${activeTab === 'users' ? 'usuários' : activeTab === 'clusters' ? 'clusters' : activeTab === 'plants' ? 'usinas' : 'diários'}...`}
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                icon={Search}
              />
            </div>
            {activeTab !== 'diaries' && (
              <Button
                variant="primary"
                onClick={() => {
                  if (activeTab === 'users') {
                    setShowUserForm(true);
                    setEditingUser(null);
                    setNewUser({
                      name: '',
                      email: '',
                      role: 'technician',
                      cluster_id: '',
                      availability: 'available'
                    });
                  } else if (activeTab === 'clusters') {
                    setShowClusterForm(true);
                    setEditingCluster(null);
                    setNewCluster({ name: '', description: '' });
                  } else if (activeTab === 'plants') {
                    setShowPlantForm(true);
                    setEditingPlant(null);
                    setNewPlant({ name: '', location: '', cluster_id: '' });
                  }
                }}
                icon={Plus}
              >
                Adicionar {activeTab === 'users' ? 'Usuário' : activeTab === 'clusters' ? 'Cluster' : 'Usina'}
              </Button>
            )}
          </div>

          {/* Content based on active tab */}
          {activeTab === 'users' && (
            <div>
              {/* User Form */}
              {showUserForm && (
                <Card className="mb-6">
                  <CardHeader 
                    title={editingUser ? 'Editar Usuário' : 'Novo Usuário'}
                  />
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="Nome"
                        value={newUser.name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewUser({ ...newUser, name: e.target.value })}
                        required
                      />
                      <Input
                        label="Email"
                        type="email"
                        value={newUser.email}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewUser({ ...newUser, email: e.target.value })}
                        required
                      />
                      <Input
                        label={editingUser ? "Nova Senha (opcional)" : "Senha"}
                        type="password"
                        value={newUser.password || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewUser({ ...newUser, password: e.target.value })}
                        required={!editingUser}
                        placeholder={editingUser ? "Deixe em branco para manter a senha atual" : "Digite a senha do usuário"}
                      />
                      <Select
                        label="Função"
                        value={newUser.role}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewUser({ ...newUser, role: e.target.value as 'technician' | 'maintainer' | 'cluster_manager' | 'admin' })}
                        options={[
                          { value: 'technician', label: 'Técnico' },
                          { value: 'maintainer', label: 'Mantenedor' },
                          { value: 'cluster_manager', label: 'Gerente de Cluster' },
                          { value: 'admin', label: 'Administrador' }
                        ]}
                      />
                      <Select
                        label="Cluster"
                        value={newUser.cluster_id}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewUser({ ...newUser, cluster_id: e.target.value })}
                        options={[
                          { value: '', label: 'Selecione um cluster' },
                          ...clusters.map(cluster => ({ value: cluster.id, label: cluster.name }))
                        ]}
                      />
                      <Select
                        label="Disponibilidade"
                        value={newUser.availability}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewUser({ ...newUser, availability: e.target.value as 'available' | 'unavailable' | 'on_leave' })}
                        options={[
                          { value: 'available', label: 'Disponível' },
                          { value: 'unavailable', label: 'Indisponível' },
                          { value: 'on_leave', label: 'De Licença' }
                        ]}
                      />
                    </div>
                    <div className="flex justify-end space-x-3 mt-6">
                      <Button variant="ghost" onClick={cancelForm} icon={X}>
                        Cancelar
                      </Button>
                      <Button 
                        variant="primary" 
                        onClick={editingUser ? handleUpdateUser : handleCreateUser}
                        disabled={loading}
                        icon={Save}
                      >
                        {editingUser ? 'Atualizar' : 'Criar'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Users List */}
              <Card>
                <CardHeader title="Usuários" />
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Nome
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Email
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Função
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Cluster
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Ações
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredUsers.map((user) => (
                          <tr key={user.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {user.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {user.email}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                user.role === 'admin' ? 'bg-red-100 text-red-800' :
                                user.role === 'cluster_manager' ? 'bg-purple-100 text-purple-800' :
                                user.role === 'maintainer' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {user.role === 'admin' ? 'Admin' :
                                 user.role === 'cluster_manager' ? 'Gerente' :
                                 user.role === 'maintainer' ? 'Mantenedor' : 'Técnico'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {clusters.find(c => c.id === user.cluster_id)?.name || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                user.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {user.available ? 'Disponível' : 'Indisponível'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => startEditUser(user)}
                                  icon={Edit}
                                >
                                  Editar
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => confirmDeleteUser(user.id, user.name)}
                                  icon={Trash2}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  Excluir
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'clusters' && (
            <div>
              {/* Cluster Form */}
              {showClusterForm && (
                <Card className="mb-6">
                  <CardHeader 
                    title={editingCluster ? 'Editar Cluster' : 'Novo Cluster'}
                  />
                  <CardContent>
                    <div className="grid grid-cols-1 gap-4">
                      <Input
                        label="Nome"
                        value={newCluster.name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCluster({ ...newCluster, name: e.target.value })}
                        required
                      />
                      <Input
                        label="Descrição"
                        value={newCluster.description}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCluster({ ...newCluster, description: e.target.value })}
                      />
                    </div>
                    <div className="flex justify-end space-x-3 mt-6">
                      <Button variant="ghost" onClick={cancelForm} icon={X}>
                        Cancelar
                      </Button>
                      <Button 
                        variant="primary" 
                        onClick={editingCluster ? handleUpdateCluster : handleCreateCluster}
                        disabled={loading}
                        icon={Save}
                      >
                        {editingCluster ? 'Atualizar' : 'Criar'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Clusters List */}
              <Card>
                <CardHeader title="Clusters" />
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredClusters.map((cluster) => (
                      <Card key={cluster.id} className="hover:shadow-md transition-shadow">
                        <CardContent>
                          <h3 className="text-lg font-medium text-gray-900 mb-2">{cluster.name}</h3>
                          <p className="text-sm text-gray-600 mb-4">{cluster.description}</p>
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEditCluster(cluster)}
                              icon={Edit}
                            >
                              Editar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => confirmDeleteCluster(cluster.id, cluster.name)}
                              icon={Trash2}
                              className="text-red-600 hover:text-red-700"
                            >
                              Excluir
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'plants' && (
            <div>
              {/* Plant Form */}
              {showPlantForm && (
                <Card className="mb-6">
                  <CardHeader 
                    title={editingPlant ? 'Editar Usina' : 'Nova Usina'}
                  />
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="Nome"
                        value={newPlant.name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPlant({ ...newPlant, name: e.target.value })}
                        required
                      />
                      <Input
                        label="Localização"
                        value={newPlant.location}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPlant({ ...newPlant, location: e.target.value })}
                      />
                      <Select
                        label="Cluster"
                        value={newPlant.cluster_id}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewPlant({ ...newPlant, cluster_id: e.target.value })}
                        options={[
                          { value: '', label: 'Selecione um cluster' },
                          ...clusters.map(cluster => ({ value: cluster.id, label: cluster.name }))
                        ]}
                        required
                      />
                    </div>
                    <div className="flex justify-end space-x-3 mt-6">
                      <Button variant="ghost" onClick={cancelForm} icon={X}>
                        Cancelar
                      </Button>
                      <Button 
                        variant="primary" 
                        onClick={editingPlant ? handleUpdatePlant : handleCreatePlant}
                        disabled={loading}
                        icon={Save}
                      >
                        {editingPlant ? 'Atualizar' : 'Criar'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Plants List */}
              <Card>
                <CardHeader title="Usinas" />
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredPlants.map((plant) => (
                      <Card key={plant.id} className="hover:shadow-md transition-shadow">
                        <CardContent>
                          <h3 className="text-lg font-medium text-gray-900 mb-2">{plant.name}</h3>
                          <p className="text-sm text-gray-600 mb-2">
                            <strong>Localização:</strong> {plant.location || 'N/A'}
                          </p>
                          <p className="text-sm text-gray-600 mb-4">
                            <strong>Cluster:</strong> {clusters.find(c => c.id === plant.cluster_id)?.name}
                          </p>
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEditPlant(plant)}
                              icon={Edit}
                            >
                              Editar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => confirmDeletePlant(plant.id, plant.name)}
                              icon={Trash2}
                              className="text-red-600 hover:text-red-700"
                            >
                              Excluir
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Seção de Diários */}
          {activeTab === 'diaries' && (
            <div>
              <Card>
                <CardHeader 
                  title="Diários de Atividades"
                  subtitle={`${diaries.length} diário(s) encontrado(s)`}
                />
                <CardContent>
                  {diaries.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <h3 className="text-lg font-medium mb-2">Nenhum diário encontrado</h3>
                      <p>Não há diários cadastrados no sistema ainda.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Data
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Usuário
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Usina
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Atividades
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Ações
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {diaries.map((diary) => (
                            <tr key={diary.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {new Date(diary.date).toLocaleDateString('pt-BR')}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {diary.user?.name || 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {diary.plant?.name || 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {diary.activities?.length || 0} atividade(s)
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  diary.status === 'completed' ? 'bg-green-100 text-green-800' :
                                  diary.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                                  diary.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {diary.status === 'completed' ? 'Concluído' :
                                   diary.status === 'in_progress' ? 'Em Progresso' :
                                   diary.status === 'cancelled' ? 'Cancelado' : 'Pendente'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedDiary(diary);
                                    setShowDiaryModal(true);
                                  }}
                                  icon={Eye}
                                >
                                  Ver Detalhes
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
      
      {/* Modal de Detalhes do Diário */}
      {selectedDiary && (
        <DiaryDetailModal
          diary={selectedDiary}
          isOpen={showDiaryModal}
          onClose={() => {
            setSelectedDiary(null);
            setShowDiaryModal(false);
          }}
        />
      )}
      
      {/* Modal de Confirmação */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        variant={confirmModal.variant}
        loading={loading}
      />
    </div>
  );
};