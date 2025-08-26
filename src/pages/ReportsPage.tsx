import React, { useState, useEffect } from 'react';
import { Download, Clock, BarChart3, Filter, ArrowLeft, FileText, Users, Calendar } from 'lucide-react';
import { Button, Input, Card, CardHeader, CardContent, Select } from '../components/ui';
import { DateInput } from '../components/ui/DateInput';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase, Plant, Cluster } from '../lib/supabase';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

interface ClusterHoursData {
  cluster_name: string;
  hours: number;
  activities_count: number;
}

interface HoursReportExtended {
  date: string;
  total_hours: number;
  clusters: ClusterHoursData[];
}

export const ReportsPage: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  
  // Estados principais
  const [reportStartDate, setReportStartDate] = useState<string>('');
  const [reportEndDate, setReportEndDate] = useState<string>('');
  const [useDefaultPeriod, setUseDefaultPeriod] = useState<boolean>(true);
  const [reportData, setReportData] = useState<any[]>([]);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [showAllDiaries, setShowAllDiaries] = useState(false);
  const [selectedCluster, setSelectedCluster] = useState<string>('');
  const [selectedClusters, setSelectedClusters] = useState<string[]>([]);
  
  // Estados para dados
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  
  // Carregar clusters e usinas
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Buscar clusters
        const { data: clustersData, error: clustersError } = await supabase
          .from('clusters')
          .select('*')
          .order('name');
        
        if (clustersError) throw clustersError;
        setClusters(clustersData || []);
        
        // Buscar usinas
        const { data: plantsData, error: plantsError } = await supabase
          .from('plants')
          .select('*')
          .order('name');
        
        if (plantsError) throw plantsError;
        setPlants(plantsData || []);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      }
    };
    
    fetchData();
  }, []);
  
  // Função auxiliar para calcular horas de atividade
  const calculateActivityHours = (startTime: string, endTime: string): string => {
    try {
      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);
      
      let totalMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
      
      // Handle overnight activities
      if (totalMinutes < 0) {
        totalMinutes += 24 * 60;
      }
      
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      
      return `${hours}:${minutes.toString().padStart(2, '0')}`;
    } catch (error) {
      return '0:00';
    }
  };

  // Função auxiliar para formatar diário em texto
  const formatDiaryToText = (diary: any): string => {
    console.log('Formatando diário:', diary);
    
    const formattedDate = new Date(diary.date).toLocaleDateString('pt-BR');
    const clusterName = diary.plant?.cluster?.name || 'Cluster não especificado';
    
    let text = `📅 Informe Diário – Programação de Equipe - ${clusterName}\n`;
    text += `📆 Data: ${formattedDate}\n\n`;
    
    text += `👥 Equipes em Campo:\n\n`;
    
    // Adicionar participantes
    if (diary.participants && diary.participants.length > 0) {
      diary.participants.forEach((participant: any) => {
        const role = participant.user?.role === 'technician' ? 'Técnico Eletrotécnico' : 
                    participant.user?.role === 'maintainer' ? 'Mantenedor' : 
                    participant.user?.role === 'cluster_manager' ? 'Gerente de Cluster' : 'Administrador';
        
        text += `${participant.user?.name || 'N/A'} – ${clusterName} – ${role} – ${participant.user?.name || 'N/A'}\n`;
      });
    } else {
      // Se não há participantes, usar o responsável do diário
      const userRole = diary.user?.role === 'technician' ? 'Técnico Eletrotécnico' : 
                      diary.user?.role === 'maintainer' ? 'Mantenedor' : 
                      diary.user?.role === 'cluster_manager' ? 'Gerente de Cluster' : 'Administrador';
      text += `${diary.user?.name || 'N/A'} – ${clusterName} – ${userRole} – ${diary.user?.name || 'N/A'}\n`;
    }
    
    // Adicionar pessoas externas
    if (diary.external_people && diary.external_people.length > 0) {
      diary.external_people.forEach((external: any) => {
        const role = external.external_person?.role || 'Externo';
        const company = external.external_person?.company ? ` (${external.external_person.company})` : '';
        text += `${external.external_person?.name || 'N/A'} – ${clusterName} – ${role}${company} – ${external.external_person?.name || 'N/A'}\n`;
      });
    }
    
    text += `\n\n🔧 Manutenções Programadas:\n\n`;
    
    if (diary.activities && diary.activities.length > 0) {
      diary.activities.forEach((activity: any) => {
        text += `Usina: ${diary.plant?.name || 'N/A'} – Equipamento: ${activity.equipment || 'N/A'} – Horário: [${activity.start_time} às ${activity.end_time}] – Atividade: [${activity.activity || activity.description || 'N/A'}]`;
        if (activity.ss_number) {
          text += ` - SS: [${activity.ss_number}]`;
        }
        text += `\n`;
      });
    } else {
      text += `Nenhuma atividade programada\n`;
    }
    
    text += `\n📌 Observações Importantes:\n\n`;
    if (diary.general_observations) {
      text += `[${diary.general_observations}]\n\n`;
    } else {
      text += `[Nenhuma observação especial]\n\n`;
    }
    
    text += `📲 Contato do Líder: Pedro Canosa\n`;
    text += `📲 Contato do Coordenador: Edmilson Silva\n`;
    
    return text;
  };
  
  // Função para gerar relatório completo com todos os diários
  const generateCompleteReport = async () => {
    setGeneratingReport(true);
    
    try {
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
        .order('date', { ascending: false });
      
      // Aplicar filtros de data apenas se especificados
      if (reportStartDate && reportEndDate) {
        query = query.gte('date', reportStartDate).lte('date', reportEndDate);
        setUseDefaultPeriod(false);
      } else {
        setUseDefaultPeriod(true);
      }
      
      // Aplicar filtro de cluster se não for admin
      if (user?.role !== 'admin' && user?.cluster_id) {
        query = query.eq('plant.cluster.id', user.cluster_id);
      }
        
      const { data, error } = await query;
      
      if (error) throw error;
      
      console.log('Relatório completo gerado:', data?.length || 0, 'diários');
      setReportData(data || []);
      setShowAllDiaries(true);
      
    } catch (err) {
      console.error('Erro ao gerar relatório completo:', err);
      alert('Erro ao gerar relatório. Tente novamente.');
    } finally {
      setGeneratingReport(false);
    }
  };
  
  // Função para gerar relatório por cluster selecionado
  const generateClusterReport = async (clusterId: string) => {
    setGeneratingReport(true);
    
    try {
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
        .eq('plant.cluster.id', clusterId)
        .order('date', { ascending: false });
      
      // Aplicar filtros de data apenas se especificados
      if (reportStartDate && reportEndDate) {
        query = query.gte('date', reportStartDate).lte('date', reportEndDate);
      }
        
      const { data, error } = await query;
      
      if (error) throw error;
      
      setReportData(data || []);
      setShowAllDiaries(false);
      
    } catch (err) {
      console.error('Erro ao gerar relatório por cluster:', err);
    } finally {
      setGeneratingReport(false);
    }
  };
  
  // Função para exportar relatório completo (todos os diários)
  const exportCompleteReport = async () => {
    try {
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
        .order('date', { ascending: true });
      
      // Aplicar filtros de data apenas se especificados
      if (reportStartDate && reportEndDate) {
        query = query.gte('date', reportStartDate).lte('date', reportEndDate);
      }
      
      // Aplicar filtro de cluster se não for admin
      if (user?.role !== 'admin' && user?.cluster_id) {
        query = query.eq('plant.cluster.id', user.cluster_id);
      }
        
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Gerar conteúdo TXT para todos os diários
      let allContent = 'RELATÓRIO COMPLETO - TODOS OS DIÁRIOS\n';
      
      if (reportStartDate && reportEndDate) {
        allContent += `Período: ${new Date(reportStartDate).toLocaleDateString('pt-BR')} a ${new Date(reportEndDate).toLocaleDateString('pt-BR')}\n`;
      } else {
        allContent += 'Período: Todos os registros disponíveis\n';
      }
      
      allContent += `Total de diários: ${data?.length || 0}\n\n`;
      allContent += '='.repeat(100) + '\n\n';
      
      (data || []).forEach(diary => {
        allContent += formatDiaryToText(diary);
        allContent += '\n';
      });
      
      // Download do arquivo
      const blob = new Blob([allContent], { type: 'text/plain;charset=utf-8' });
      const dateStr = reportStartDate && reportEndDate ? `${reportStartDate}_${reportEndDate}` : 'todos_registros';
      const fileName = `relatorio_completo_${dateStr}.txt`;
      saveAs(blob, fileName);
      
    } catch (err) {
      console.error('Erro ao exportar relatório completo:', err);
      alert('Erro ao exportar relatório. Tente novamente.');
    }
  };

  // Função para exportar diários de clusters selecionados
  const exportSelectedClusters = async () => {
    if (selectedClusters.length === 0) {
      alert('Selecione pelo menos um cluster para exportação');
      return;
    }
    
    try {
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
        .in('plant.cluster.id', selectedClusters)
        .order('date', { ascending: true });
      
      // Aplicar filtros de data apenas se especificados
      if (reportStartDate && reportEndDate) {
        query = query.gte('date', reportStartDate).lte('date', reportEndDate);
      }
        
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Agrupar por cluster
      const clusterGroups: { [key: string]: any[] } = {};
      
      (data || []).forEach(diary => {
        const clusterName = diary.plant?.cluster?.name || 'Cluster não especificado';
        if (!clusterGroups[clusterName]) {
          clusterGroups[clusterName] = [];
        }
        clusterGroups[clusterName].push(diary);
      });
      
      // Gerar conteúdo TXT para clusters selecionados
      let allContent = 'RELATÓRIO - CLUSTERS SELECIONADOS\n';
      
      if (reportStartDate && reportEndDate) {
        allContent += `Período: ${new Date(reportStartDate).toLocaleDateString('pt-BR')} a ${new Date(reportEndDate).toLocaleDateString('pt-BR')}\n`;
      } else {
        allContent += 'Período: Todos os registros disponíveis\n';
      }
      
      allContent += `Clusters: ${Object.keys(clusterGroups).join(', ')}\n`;
      allContent += `Total de diários: ${data?.length || 0}\n\n`;
      allContent += '='.repeat(100) + '\n\n';
      
      Object.entries(clusterGroups).forEach(([clusterName, diaries], index) => {
        if (index > 0) {
          allContent += '=======================================================\n\n';
        }
        
        diaries.forEach(diary => {
          allContent += formatDiaryToText(diary);
          allContent += '\n';
        });
      });
      
      // Download do arquivo
      const blob = new Blob([allContent], { type: 'text/plain;charset=utf-8' });
      const dateStr = reportStartDate && reportEndDate ? `${reportStartDate}_${reportEndDate}` : 'todos_registros';
      const fileName = `relatorio_clusters_selecionados_${dateStr}.txt`;
      saveAs(blob, fileName);
      
    } catch (err) {
      console.error('Erro ao exportar clusters selecionados:', err);
      alert('Erro ao exportar relatório. Tente novamente.');
    }
  };
  
  const clusterOptions = clusters.map(cluster => ({
    value: cluster.id,
    label: cluster.name
  }));
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Cabeçalho */}
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
                Relatórios de Diários
              </h1>
              <p className="mt-2 text-gray-600">
                Gere e exporte relatórios detalhados das atividades registradas
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Filtros de Período */}
          <Card>
            <CardHeader 
              title="Período do Relatório"
              subtitle="Defina o período para análise (opcional - deixe em branco para todos os registros)"
            />
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data Inicial (Opcional)
                  </label>
                  <DateInput
                    value={reportStartDate}
                    onChange={setReportStartDate}
                    fullWidth
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data Final (Opcional)
                  </label>
                  <DateInput
                    value={reportEndDate}
                    onChange={setReportEndDate}
                    fullWidth
                  />
                </div>
              </div>
              {reportStartDate || reportEndDate ? (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    📅 Período selecionado: {reportStartDate ? new Date(reportStartDate).toLocaleDateString('pt-BR') : 'Início'} até {reportEndDate ? new Date(reportEndDate).toLocaleDateString('pt-BR') : 'Fim'}
                  </p>
                </div>
              ) : (
                <div className="mt-4 p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-700">
                    📊 Modo padrão: Todos os registros disponíveis serão incluídos
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Relatórios Principais */}
          <Card>
            <CardHeader 
              title="Relatórios de Diários"
              subtitle="Visualize e exporte relatórios completos de diários"
            />
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  variant="primary"
                  icon={FileText}
                  onClick={generateCompleteReport}
                  disabled={generatingReport}
                  className="h-20 flex-col"
                >
                  <span className="font-semibold">{generatingReport ? 'Gerando...' : 'Visualizar Relatório'}</span>
                  <span className="text-sm opacity-80">Todos os diários do período</span>
                </Button>
                <Button
                  variant="outline"
                  icon={Download}
                  onClick={exportCompleteReport}
                  className="h-20 flex-col"
                >
                  <span className="font-semibold">Exportar Completo</span>
                  <span className="text-sm opacity-80">Arquivo TXT formatado</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Relatórios por Cluster */}
          <Card>
            <CardHeader 
              title="Relatórios por Cluster"
              subtitle="Gere relatórios específicos por cluster ou grupos de clusters"
            />
            <CardContent>
              <div className="space-y-6">
                {/* Cluster Individual */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                    <Users className="h-4 w-4 mr-2" />
                    Cluster Individual
                  </h4>
                  <div className="flex gap-3">
                    <Select
                      value={selectedCluster}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedCluster(e.target.value)}
                      options={clusterOptions}
                      placeholder="Selecione um cluster..."
                      fullWidth
                    />
                    <Button
                      onClick={() => selectedCluster && generateClusterReport(selectedCluster)}
                      disabled={!selectedCluster}
                      variant="outline"
                    >
                      Visualizar
                    </Button>
                  </div>
                </div>

                {/* Múltiplos Clusters */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Múltiplos Clusters
                  </h4>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 p-4 bg-gray-50 rounded-lg max-h-40 overflow-y-auto">
                      {clusters.map(cluster => (
                        <label key={cluster.id} className="flex items-center space-x-2 text-sm">
                          <input
                            type="checkbox"
                            checked={selectedClusters.includes(cluster.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedClusters(prev => [...prev, cluster.id]);
                              } else {
                                setSelectedClusters(prev => prev.filter(id => id !== cluster.id));
                              }
                            }}
                            className="rounded border-gray-300"
                          />
                          <span>{cluster.name}</span>
                        </label>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={() => setSelectedClusters(clusters.map(c => c.id))}
                        variant="outline"
                        size="sm"
                      >
                        Selecionar Todos
                      </Button>
                      <Button
                        onClick={() => setSelectedClusters([])}
                        variant="outline"
                        size="sm"
                      >
                        Limpar
                      </Button>
                      <Button
                        onClick={exportSelectedClusters}
                        disabled={selectedClusters.length === 0}
                        variant="primary"
                        size="sm"
                      >
                        Exportar Selecionados ({selectedClusters.length})
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Área de Resultados */}
          {reportData.length > 0 && (
            <Card>
              <CardHeader 
                title={`Resultados do Relatório (${reportData.length} registros)`}
                subtitle={useDefaultPeriod ? 'Todos os registros disponíveis' : `Período: ${reportStartDate ? new Date(reportStartDate).toLocaleDateString('pt-BR') : ''} - ${reportEndDate ? new Date(reportEndDate).toLocaleDateString('pt-BR') : ''}`}
              />
              <CardContent>
                <div className="space-y-4">
                  {reportData.map((diary: any) => (
                    <div key={diary.id} className="border rounded-lg p-4 bg-white">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-lg">{diary.title || 'Sem título'}</h4>
                        <span className="text-sm text-gray-600">
                          {new Date(diary.date).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                        <p><strong>Usuário:</strong> {diary.user?.name || 'N/A'}</p>
                        <p><strong>Usina:</strong> {diary.plant?.name || 'N/A'}</p>
                        <p><strong>Cluster:</strong> {diary.plant?.cluster?.name || 'N/A'}</p>
                      </div>
                      
                      {diary.general_observations && (
                        <p className="text-sm text-gray-700 mt-2">
                          <strong>Observações:</strong> {diary.general_observations}
                        </p>
                      )}
                      
                      {diary.activities && diary.activities.length > 0 && (
                        <div className="mt-3">
                          <h5 className="text-sm font-medium mb-2">Atividades:</h5>
                          <ul className="text-sm space-y-1">
                            {diary.activities.map((activity: any) => (
                              <li key={activity.id} className="border-l-2 border-blue-200 pl-2">
                                <strong>{activity.description || activity.activity}</strong><br/>
                                Equipamento: {activity.equipment || 'N/A'}<br/>
                                Horário: {activity.start_time} às {activity.end_time}
                                <span className="text-gray-500 ml-2">
                                  ({calculateActivityHours(activity.start_time, activity.end_time)}h)
                                </span>
                                {activity.ss_number && (
                                  <><br/>SS: {activity.ss_number}</>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};