import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Search, Save, X, UserPlus } from 'lucide-react';
import { Button, Card, CardHeader, CardContent, Input, Select, ConfirmModal } from './ui';
import { supabase, User, Team, TeamMember } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

interface NewTeamMember {
  user_id: string;
  role: 'leader' | 'member';
}

interface NewUser {
  name: string;
  email: string;
  password: string;
  role: 'technician' | 'maintainer';
  available: boolean;
}

interface TeamManagementProps {
  team: Team;
  onTeamUpdate: () => void;
}

export const TeamManagement: React.FC<TeamManagementProps> = ({ team, onTeamUpdate }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Estados para membros da equipe
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [showAddMemberForm, setShowAddMemberForm] = useState(false);
  const [showCreateUserForm, setShowCreateUserForm] = useState(false);
  
  // Estados para formulários
  const [newMember, setNewMember] = useState<NewTeamMember>({
    user_id: '',
    role: 'member'
  });
  
  const [newUser, setNewUser] = useState<NewUser>({
    name: '',
    email: '',
    password: '',
    role: 'technician',
    available: true
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estados para modal de confirmação
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

  const fetchTeamMembers = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          *,
          user:users(
            id,
            name,
            email,
            role,
            available
          )
        `)
        .eq('team_id', team.id)
        .order('created_at');

      if (error) throw error;
      setTeamMembers(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar membros da equipe');
    } finally {
      setLoading(false);
    }
  }, [team.id]);

  const fetchAvailableUsers = useCallback(async () => {
    if (!user?.cluster_id) return;
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('cluster_id', user.cluster_id)
        .in('role', ['technician', 'maintainer'])
        .order('name');

      if (error) throw error;
      
      // Filtrar usuários que já são membros da equipe
      const currentMemberIds = teamMembers.map(member => member.user_id);
      const available = (data || []).filter(u => !currentMemberIds.includes(u.id));
      
      setAvailableUsers(available);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar usuários disponíveis');
    }
  }, [user?.cluster_id, teamMembers]);

  useEffect(() => {
    fetchTeamMembers();
    fetchAvailableUsers();
  }, [fetchTeamMembers, fetchAvailableUsers]);

  const handleAddMember = async () => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('team_members')
        .insert([{
          team_id: team.id,
          user_id: newMember.user_id,
          role: newMember.role
        }]);

      if (error) throw error;

      setSuccess('Membro adicionado à equipe com sucesso!');
      setNewMember({ user_id: '', role: 'member' });
      setShowAddMemberForm(false);
      fetchTeamMembers();
      fetchAvailableUsers();
      onTeamUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao adicionar membro à equipe');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    try {
      setLoading(true);
      setError(null);

      // Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: {
          data: {
            name: newUser.name,
            role: newUser.role
          }
        }
      });

      if (authError) throw authError;

      // Inserir dados adicionais na tabela users
      const { error } = await supabase
        .from('users')
        .insert([{
          id: authData.user?.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          cluster_id: user?.cluster_id,
          available: newUser.available
        }]);

      if (error) throw error;

      setSuccess('Usuário criado com sucesso!');
      setNewUser({ name: '', email: '', password: '', role: 'technician', available: true });
      setShowCreateUserForm(false);
      fetchAvailableUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar usuário');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      setSuccess('Membro removido da equipe com sucesso!');
      fetchTeamMembers();
      fetchAvailableUsers();
      onTeamUpdate();
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover membro da equipe');
    } finally {
      setLoading(false);
    }
  };

  const confirmRemoveMember = (memberId: string, memberName: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Remover Membro',
      message: `Tem certeza que deseja remover "${memberName}" da equipe? Esta ação não pode ser desfeita.`,
      onConfirm: () => handleRemoveMember(memberId),
      variant: 'danger'
    });
  };

  const cancelForms = () => {
    setShowAddMemberForm(false);
    setShowCreateUserForm(false);
    setNewMember({ user_id: '', role: 'member' });
    setNewUser({ name: '', email: '', password: '', role: 'technician', available: true });
    setError(null);
  };

  const filteredMembers = teamMembers.filter(member => 
    member.user?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.user?.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Mensagens de erro e sucesso */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {/* Cabeçalho */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gerenciar Equipe: {team.name}</h2>
          <p className="text-gray-600">Adicione novos membros ou crie novos usuários para a equipe</p>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={() => setShowAddMemberForm(true)}
            icon={UserPlus}
            disabled={availableUsers.length === 0}
          >
            Adicionar Membro
          </Button>
          <Button
            variant="primary"
            onClick={() => setShowCreateUserForm(true)}
            icon={Plus}
          >
            Criar Novo Usuário
          </Button>
        </div>
      </div>

      {/* Formulário para adicionar membro existente */}
      {showAddMemberForm && (
        <Card>
          <CardHeader title="Adicionar Membro Existente" />
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Usuário"
                value={newMember.user_id}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
                  setNewMember({ ...newMember, user_id: e.target.value })
                }
                options={[
                  { value: '', label: 'Selecione um usuário' },
                  ...availableUsers.map(user => ({
                    value: user.id,
                    label: `${user.name} (${user.email}) - ${user.role === 'technician' ? 'Técnico' : 'Mantenedor'}`
                  }))
                ]}
                required
              />
              <Select
                label="Função na Equipe"
                value={newMember.role}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
                  setNewMember({ ...newMember, role: e.target.value as 'leader' | 'member' })
                }
                options={[
                  { value: 'member', label: 'Membro' },
                  { value: 'leader', label: 'Líder' }
                ]}
                required
              />
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <Button variant="ghost" onClick={cancelForms} icon={X}>
                Cancelar
              </Button>
              <Button 
                variant="primary" 
                onClick={handleAddMember}
                disabled={loading || !newMember.user_id}
                icon={Save}
              >
                Adicionar Membro
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Formulário para criar novo usuário */}
      {showCreateUserForm && (
        <Card>
          <CardHeader title="Criar Novo Usuário" />
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nome Completo"
                value={newUser.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  setNewUser({ ...newUser, name: e.target.value })
                }
                required
              />
              <Input
                label="Email"
                type="email"
                value={newUser.email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  setNewUser({ ...newUser, email: e.target.value })
                }
                required
              />
              <Input
                label="Senha"
                type="password"
                value={newUser.password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  setNewUser({ ...newUser, password: e.target.value })
                }
                required
              />
              <Select
                label="Função"
                value={newUser.role}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
                  setNewUser({ ...newUser, role: e.target.value as 'technician' | 'maintainer' })
                }
                options={[
                  { value: 'technician', label: 'Técnico' },
                  { value: 'maintainer', label: 'Mantenedor' }
                ]}
                required
              />
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="available"
                  checked={newUser.available}
                  onChange={(e) => setNewUser({ ...newUser, available: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="available" className="text-sm font-medium text-gray-700">
                  Usuário disponível
                </label>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <Button variant="ghost" onClick={cancelForms} icon={X}>
                Cancelar
              </Button>
              <Button 
                variant="primary" 
                onClick={handleCreateUser}
                disabled={loading || !newUser.name || !newUser.email || !newUser.password}
                icon={Save}
              >
                Criar Usuário
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de membros da equipe */}
      <Card>
        <CardHeader title={`Membros da Equipe (${teamMembers.length})`}>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar membros..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredMembers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {teamMembers.length === 0 ? 'Nenhum membro na equipe' : 'Nenhum membro encontrado'}
            </div>
          ) : (
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
                      Função na Equipe
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
                  {filteredMembers.map((member) => (
                    <tr key={member.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {member.user?.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {member.user?.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          member.user?.role === 'maintainer' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {member.user?.role === 'maintainer' ? 'Mantenedor' : 'Técnico'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          'bg-green-100 text-green-800'
                        }`}>
                          {'Membro'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          member.user?.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {member.user?.available ? 'Disponível' : 'Indisponível'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => confirmRemoveMember(member.id, member.user?.name || '')}
                          icon={Trash2}
                          className="text-red-600 hover:text-red-700"
                        >
                          Remover
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