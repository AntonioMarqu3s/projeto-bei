import React, { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui';
import { DiaryForm } from '../components/DiaryForm';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDiary } from '../hooks/useDiary';
import type { Diary } from '../lib/supabase';

export const NewDiaryPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { fetchDiaries } = useDiary();
  
  // Pegar o diário para edição se foi passado via state
  const editingDiary = location.state?.diary as Diary | undefined;

  // Recarregar diários quando a página for montada (para atualizar a lista quando voltar)
  useEffect(() => {
    return () => {
      // Quando sair da página, recarregar os diários
      fetchDiaries();
    };
  }, [fetchDiaries]);

  const handleFormSuccess = () => {
    navigate('/diaries');
  };

  const handleFormCancel = () => {
    navigate('/diaries');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/diaries')}
            icon={ArrowLeft}
            className="mb-4"
          >
            Voltar para Diários
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">
            {editingDiary ? 'Editar Diário' : 'Novo Diário de Atividade'}
          </h1>
        </div>

        {/* Formulário */}
        <DiaryForm
          diary={editingDiary}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      </div>
    </div>
  );
};

export default NewDiaryPage;