import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui';
import { Calendar } from '../components/Calendar';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export const CalendarPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Cabeçalho da página */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
              icon={ArrowLeft}
            >
              Dashboard
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Calendário de Atividades
              </h1>
              <p className="mt-2 text-gray-600">
                Visualize e gerencie todas as atividades programadas do cluster {user?.cluster_id}
              </p>
            </div>
          </div>
        </div>

        {/* Componente do calendário */}
        <Calendar />
      </div>
    </div>
  );
};

export default CalendarPage;