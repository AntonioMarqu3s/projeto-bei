import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Calendar, Clock, Building2, FileText, Search, ArrowLeft } from 'lucide-react';
import { Button, Input, Card, CardContent } from '../components/ui';
import { SismetroSSButton } from '../components/SismetroIntegration';
import { useDiary } from '../hooks/useDiary';
import { useNavigate } from 'react-router-dom';
import type { Diary } from '../lib/supabase';

export const DiaryPage: React.FC = () => {

  const navigate = useNavigate();
  const {
    diaries,
    loading,
    error,
    fetchDiaries,
    deleteDiary,
  } = useDiary();

  // Removido showForm e editingDiary - agora usa navegação
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Carregar diários ao montar o componente
  useEffect(() => {
    fetchDiaries();
  }, [fetchDiaries]);

  // Filtrar diários baseado na busca e data
  const filteredDiaries = diaries.filter(diary => {
    const matchesSearch = !searchTerm || 
      diary.activities?.some(activity => 
        activity.activity?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.equipment?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.ss_number?.toLowerCase().includes(searchTerm.toLowerCase())
      ) ||
      diary.plant?.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDate = !selectedDate || diary.date === selectedDate;
    
    return matchesSearch && matchesDate;
  });

  const handleNewDiary = () => {
    navigate('/diaries/new');
  };

  const handleEditDiary = (diary: Diary) => {
    navigate('/diaries/new', { state: { diary } });
  };

  const handleDeleteDiary = async (diary: Diary) => {
    if (!confirm(`Tem certeza que deseja excluir este diário?`)) {
      return;
    }

    setIsDeleting(diary.id);
    const success = await deleteDiary(diary.id);
    setIsDeleting(null);

    if (success) {
      // Diário excluído com sucesso
    }
  };

  // Removido handleFormSuccess e handleFormCancel - não são mais necessários

  const formatTime = (time: string) => {
    return time.substring(0, 5); // Remove segundos se houver
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };



  // Formulário agora é uma página separada

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
              <FileText className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Diários de Atividades
                </h1>
                <p className="text-sm text-gray-500">
                  Gerencie os registros de atividades da equipe
                </p>
              </div>
            </div>
            <Button
              variant="primary"
              onClick={handleNewDiary}
              icon={Plus}
            >
              Novo Diário
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Filtros */}
          <Card className="mb-6">
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <Input
                    placeholder="Buscar por atividade, equipamento, usina, equipe ou SS..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    icon={Search}
                    iconPosition="left"
                    fullWidth
                  />
                </div>
                <Input
                  type="date"
                  label="Filtrar por data"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  fullWidth
                />
              </div>
            </CardContent>
          </Card>

          {/* Mensagem de erro */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Lista de Diários */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-sm text-gray-600">Carregando diários...</p>
            </div>
          ) : filteredDiaries.length === 0 ? (
            <Card>
              <CardContent>
                <div className="text-center py-12">
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    {searchTerm || selectedDate ? 'Nenhum diário encontrado' : 'Nenhum diário cadastrado'}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchTerm || selectedDate 
                      ? 'Tente ajustar os filtros de busca.'
                      : 'Comece criando seu primeiro diário de atividades.'}
                  </p>
                  {!searchTerm && !selectedDate && (
                    <div className="mt-6">
                      <Button
                        variant="primary"
                        onClick={handleNewDiary}
                        icon={Plus}
                      >
                        Criar Primeiro Diário
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredDiaries.map((diary) => (
                <Card key={diary.id} className="hover:shadow-md transition-shadow">
                  <CardContent>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-1">
                              {diary.activities && diary.activities.length > 0 
                                ? diary.activities.map(activity => activity.activity).filter(Boolean).join(', ') 
                                : 'Diário'
                              }
                            </h3>
                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                              <div className="flex items-center space-x-1">
                                <Calendar className="h-4 w-4" />
                                <span>{formatDate(diary.date)}</span>
                              </div>
                              {diary.activities && diary.activities.length > 0 && (
                                <div className="flex items-center space-x-1">
                                  <Clock className="h-4 w-4" />
                                  <span>
                                    {formatTime(diary.activities[0].start_time)} - {formatTime(diary.activities[diary.activities.length - 1].end_time)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditDiary(diary)}
                              icon={Edit}
                            >
                              Editar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteDiary(diary)}
                              loading={isDeleting === diary.id}
                              icon={Trash2}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              Excluir
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                          <div className="flex items-center space-x-2">
                            <Building2 className="h-4 w-4 text-gray-400" />
                            <div>
                              <span className="text-gray-500">Usina:</span>
                              <span className="ml-1 font-medium">{diary.plant?.name}</span>
                            </div>
                          </div>
                          
                          {diary.activities && diary.activities.length > 0 && (
                            <div className="flex items-center space-x-2">
                              <span className="text-gray-500">Equipamentos:</span>
                              <span className="font-medium">
                                {diary.activities.map(activity => activity.equipment).filter(Boolean).join(', ')}
                              </span>
                            </div>
                          )}
                          

                          
                          {diary.activities?.some(activity => activity.ss_number) && (
                            <div className="flex items-center space-x-2">
                              <span className="text-gray-500">SS:</span>
                              <div className="ml-1 flex items-center space-x-2">
                                {diary.activities
                                  .filter(activity => activity.ss_number)
                                  .map((activity, index) => (
                                    <div key={index} className="flex items-center space-x-2">
                                      <span className="font-medium text-blue-600">{activity.ss_number}</span>
                                      <SismetroSSButton 
                                        ssNumber={activity.ss_number}
                                        compact={true}
                                      />
                                    </div>
                                  ))
                                }
                              </div>
                            </div>
                          )}
                        </div>

                        {diary.observations && (
                          <div className="mt-4 p-3 bg-gray-50 rounded-md">
                            <p className="text-sm text-gray-700">
                              <span className="font-medium">Observações:</span> {diary.observations}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default DiaryPage;