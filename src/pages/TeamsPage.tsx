import React, { useState } from 'react';
import { Users, Plus, Edit, Trash2, Search, UserCheck, Settings } from 'lucide-react';
import { Button, Card, CardHeader, CardContent, Input, ConfirmModal } from '../components/ui';
import { TeamManagement } from '../components/TeamManagement';
import { useTeams, TeamWithMembers } from '../hooks/useTeams';


interface NewTeam {
  name: string;
}

export const TeamsPage: React.FC = () => {

  const { 
    teams, 
    loading, 
    error, 
    createTeam, 
    updateTeam, 
    deleteTeam,
    clearError 
  } = useTeams();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<TeamWithMembers | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTeam, setEditingTeam] = useState<TeamWithMembers | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [newTeam, setNewTeam] = useState<NewTeam>({
    name: ''
  });
  
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

  const handleCreateTeam = async () => {
    try {
      await createTeam(newTeam);
      setSuccess('Equipe criada com sucesso!');
      setNewTeam({ name: '' });
      setShowCreateForm(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      // Erro já é tratado pelo hook
    }
  };

  const handleUpdateTeam = async () => {
    if (!editingTeam) return;
    
    try {
      await updateTeam(editingTeam.id, {
        name: editingTeam.name,
  
      });
      setSuccess('Equipe atualizada com sucesso!');
      setEditingTeam(null);
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      // Erro já é tratado pelo hook
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    try {
      await deleteTeam(teamId);
      setSuccess('Equipe excluída com sucesso!');
      setSelectedTeam(null);
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      // Erro já é tratado pelo hook
    }
  };

  const confirmDeleteTeam = (team: TeamWithMembers) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Equipe',
      message: `Tem certeza que deseja excluir a equipe "${team.name}"? Todos os membros serão removidos e esta ação não pode ser desfeita.`,
      onConfirm: () => handleDeleteTeam(team.id),
      variant: 'danger'
    });
  };

  const cancelForms = () => {
    setShowCreateForm(false);
    setEditingTeam(null);
    setNewTeam({ name: '' });
    clearError();
  };

  const filteredTeams = teams.filter(team => 
    team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    false
  );

  // Se uma equipe está selecionada, mostrar o componente de gerenciamento
  if (selectedTeam) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => setSelectedTeam(null)}
              className="mb-4"
            >
              ← Voltar para Equipes
            </Button>
          </div>
          <TeamManagement 
            team={selectedTeam} 
            onTeamUpdate={() => {
              // Atualizar dados da equipe selecionada
              const updatedTeam = teams.find(t => t.id === selectedTeam.id);
              if (updatedTeam) {
                setSelectedTeam(updatedTeam);
              }
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Mensagens de erro e sucesso */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
        
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            {success}
          </div>
        )}

        {/* Cabeçalho */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gerenciamento de Equipes</h1>
            <p className="text-gray-600 mt-2">Gerencie as equipes e seus membros</p>
          </div>
          <Button
            variant="primary"
            onClick={() => setShowCreateForm(true)}
            icon={Plus}
          >
            Nova Equipe
          </Button>
        </div>

        {/* Formulário para criar equipe */}
        {showCreateForm && (
          <Card className="mb-8">
            <CardHeader title="Criar Nova Equipe" />
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Nome da Equipe"
                  value={newTeam.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                    setNewTeam({ ...newTeam, name: e.target.value })
                  }
                  required
                />

              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <Button variant="ghost" onClick={cancelForms}>
                  Cancelar
                </Button>
                <Button 
                  variant="primary" 
                  onClick={handleCreateTeam}
                  disabled={loading || !newTeam.name.trim()}
                >
                  Criar Equipe
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Formulário para editar equipe */}
        {editingTeam && (
          <Card className="mb-8">
            <CardHeader title="Editar Equipe" />
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Nome da Equipe"
                  value={editingTeam.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                    setEditingTeam({ ...editingTeam, name: e.target.value })
                  }
                  required
                />

              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <Button variant="ghost" onClick={cancelForms}>
                  Cancelar
                </Button>
                <Button 
                  variant="primary" 
                  onClick={handleUpdateTeam}
                  disabled={loading || !editingTeam.name.trim()}
                >
                  Salvar Alterações
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Barra de busca */}
        <Card className="mb-8">
          <CardContent>
            <div className="flex items-center space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar equipes..."
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="text-sm text-gray-500">
                {filteredTeams.length} de {teams.length} equipes
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de equipes */}
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Carregando equipes...</p>
          </div>
        ) : filteredTeams.length === 0 ? (
          <Card>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                {teams.length === 0 ? (
                  <>
                    <h3 className="text-lg font-medium mb-2">Nenhuma equipe encontrada</h3>
                    <p>Crie sua primeira equipe para começar a gerenciar membros.</p>
                  </>
                ) : (
                  <>
                    <h3 className="text-lg font-medium mb-2">Nenhuma equipe encontrada</h3>
                    <p>Tente ajustar os termos de busca.</p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTeams.map((team) => (
              <Card key={team.id} className="hover:shadow-lg transition-shadow">
                <CardContent>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {team.name}
                      </h3>

                    </div>
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingTeam(team)}
                        icon={Edit}
                        className="text-gray-500 hover:text-gray-700"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => confirmDeleteTeam(team)}
                        icon={Trash2}
                        className="text-red-500 hover:text-red-700"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <UserCheck className="h-4 w-4" />
                      <span>{team.memberCount} membros</span>
                    </div>
                    <div className="text-xs text-gray-400">
                      Criada em {new Date(team.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  </div>

                  {/* Mostrar alguns membros */}
                  {team.members.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-medium text-gray-700 mb-2">Membros:</p>
                      <div className="space-y-1">
                        {team.members.slice(0, 3).map((member) => (
                          <div key={member.id} className="flex items-center justify-between text-xs">
                            <span className="text-gray-600">{member.user?.name}</span>
                            <span className={`px-2 py-1 rounded-full ${
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {'Membro'}
                            </span>
                          </div>
                        ))}
                        {team.members.length > 3 && (
                          <p className="text-xs text-gray-500">
                            +{team.members.length - 3} outros membros
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex space-x-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setSelectedTeam(team)}
                      icon={Settings}
                      className="flex-1"
                    >
                      Gerenciar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
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
    </div>
  );
};

export default TeamsPage;