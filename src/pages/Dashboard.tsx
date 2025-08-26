import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { LogOut, Plus, Calendar, Settings, Users, Building2, FileText, BarChart3 } from 'lucide-react';
import { Button, Card, CardHeader, CardContent } from '../components/ui';
import { useNavigate } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const { user, signOut, isAdmin, isClusterManager } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Building2 className="h-8 w-8 text-blue-600" />
              <h1 className="text-xl font-semibold text-gray-900">
                Sistema de Diário de Atividades
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Olá, {user?.name || 'Usuário'}
              </span>
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                {user?.role === 'admin' ? 'Administrador' : 
                 user?.role === 'cluster_manager' ? 'Gerente de Cluster' :
                 user?.role === 'maintainer' ? 'Mantenedor' : 'Técnico'}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                icon={LogOut}
              >
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Welcome Section */}
          <Card className="mb-6" variant="elevated">
            <CardHeader 
              title="Bem-vindo ao Dashboard"
              subtitle="Gerencie suas atividades diárias e acompanhe o progresso da sua equipe."
            />
          </Card>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            <Card className="hover:shadow-md transition-shadow">
              <CardContent>
                <div className="flex items-center mb-4">
                  <Plus className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">Novo Diário</h3>
                    <p className="text-sm text-gray-600">Criar nova entrada de atividade</p>
                  </div>
                </div>
                <Button variant="primary" fullWidth onClick={() => navigate('/diaries')}>
                  Criar Diário
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent>
                <div className="flex items-center mb-4">
                  <FileText className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">Ver Diários</h3>
                    <p className="text-sm text-gray-600">Visualizar diários existentes</p>
                  </div>
                </div>
                <Button variant="primary" fullWidth className="bg-green-600 hover:bg-green-700 focus:ring-green-500" onClick={() => navigate('/diaries')}>
                  Ver Diários
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent>
                <div className="flex items-center mb-4">
                  <Calendar className="h-8 w-8 text-orange-600" />
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">Calendário</h3>
                    <p className="text-sm text-gray-600">Visualizar atividades programadas</p>
                  </div>
                </div>
                <Button variant="primary" fullWidth className="bg-orange-600 hover:bg-orange-700 focus:ring-orange-500" onClick={() => navigate('/calendar')}>
                  Ver Calendário
                </Button>
              </CardContent>
            </Card>

            {(isAdmin || isClusterManager) && (
              <Card className="hover:shadow-md transition-shadow">
                <CardContent>
                  <div className="flex items-center mb-4">
                    <Settings className="h-8 w-8 text-purple-600" />
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900">Administração</h3>
                      <p className="text-sm text-gray-600">Gerenciar usuários e configurações</p>
                    </div>
                  </div>
                  <Button variant="primary" fullWidth className="bg-purple-600 hover:bg-purple-700 focus:ring-purple-500" onClick={() => navigate('/admin')}>
                    Administrar
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Additional Actions for Admins */}
          {(isAdmin || isClusterManager) && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">


              <Card className="hover:shadow-md transition-shadow">
                <CardContent>
                  <div className="flex items-center mb-4">
                    <Users className="h-8 w-8 text-teal-600" />
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900">Gerenciar Usuários</h3>
                      <p className="text-sm text-gray-600">Adicionar e gerenciar usuários do sistema</p>
                    </div>
                  </div>
                  <Button variant="outline" fullWidth onClick={() => navigate('/admin')}>
                    Gerenciar Usuários
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardContent>
                  <div className="flex items-center mb-4">
                    <BarChart3 className="h-8 w-8 text-orange-600" />
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900">Relatórios</h3>
                      <p className="text-sm text-gray-600">Visualizar e exportar relatórios</p>
                    </div>
                  </div>
                  <Button variant="outline" fullWidth onClick={() => navigate('/reports')}>
                    Ver Relatórios
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}


        </div>
      </main>
    </div>
  )
}

export default Dashboard;