import React, { useState, useEffect } from 'react';
import { FileText, Download, Clock, BarChart3, Filter, ArrowLeft } from 'lucide-react';
import { Button, Input, Card, CardHeader, CardContent, Select } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase, Plant, Cluster, SSReport } from '../lib/supabase';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// Interfaces para relatórios
interface DiaryWithRelations {
  id: string;
  date: string;
  equipment: string;
  activity: string;
  ss_number?: string;
  start_time: string;
  end_time: string;
  plant?: {
    name: string;
    cluster?: {
      name: string;
    };
  };
  team?: {
    name: string;
  };
}

interface ActivityData {
  date: string;
  equipment: string;
  activity: string;
  ss_number?: string;
  team_name: string;
}

interface GroupedData {
  [clusterName: string]: {
    [plantName: string]: ActivityData[];
  };
}

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
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'ss' | 'hours'>('ss');
  const [filters, setFilters] = useState({
    startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    clusterId: '',
    plantId: ''
  })

  
  const [ssReports, setSsReports] = useState<SSReport[]>([]);
  const [hoursReports, setHoursReports] = useState<HoursReportExtended[]>([]);
  const [clusters, setClusters] = useState<Cluster[]>([])
  const [plants, setPlants] = useState<Plant[]>([])

  // Carregar clusters e usinas
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Buscar clusters
        const { data: clustersData } = await supabase
          .from('clusters')
          .select('*')
          .order('name');
        
        if (clustersData) setClusters(clustersData);

        // Buscar usinas
        let plantsQuery = supabase
          .from('plants')
          .select('*, cluster:clusters(name)')
          .order('name');
        
        if (user?.role !== 'admin' && user?.cluster_id) {
          plantsQuery = plantsQuery.eq('cluster_id', user.cluster_id);
        }
        
        const { data: plantsData } = await plantsQuery;
        if (plantsData) setPlants(plantsData);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      }
    };

    fetchData();
  }, [user]);

  // Gerar relatório de SS
  const generateSSReport = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('diaries')
        .select(`
          *,
          plant:plants(name, cluster:clusters(name))
        `)
        .not('ss_number', 'is', null)
        .gte('date', filters.startDate)
        .lte('date', filters.endDate);

      if (user?.role !== 'admin' && user?.cluster_id) {
        query = query.eq('cluster_id', user.cluster_id);
      }
      
      if (filters.clusterId) {
        query = query.eq('cluster_id', filters.clusterId);
      }
      
      if (filters.plantId) {
        query = query.eq('plant_id', filters.plantId);
      }

      const { data: diaries } = await query;
      
      if (diaries) {
        // Agrupar por cluster e usina
        const grouped = diaries.reduce((acc: GroupedData, diary: DiaryWithRelations) => {
          const clusterName = diary.plant?.cluster?.name || 'Sem cluster';
          const plantName = diary.plant?.name || 'Sem usina';
          
          if (!acc[clusterName]) acc[clusterName] = {};
          if (!acc[clusterName][plantName]) acc[clusterName][plantName] = [];
          
          acc[clusterName][plantName].push({
            date: format(parseISO(diary.date), 'dd/MM/yyyy'),
            equipment: diary.equipment,
            activity: diary.activity,
            ss_number: diary.ss_number,
            team_name: 'Sem equipe'
          });
          
          return acc;
        }, {});

        const reports: SSReport[] = [];
        Object.entries(grouped).forEach(([clusterName, plants]) => {
          Object.entries(plants).forEach(([plantName, activities]) => {
            reports.push({
              cluster_name: clusterName,
              plant_name: plantName,
              ss_count: activities.length,
              ss_list: activities.map((a: ActivityData) => a.ss_number).filter(Boolean) as string[]
            });
          });
        });
        
        setSsReports(reports);
      }
    } catch (error) {
      console.error('Erro ao gerar relatório de SS:', error);
    } finally {
      setLoading(false);
    }
  };

  // Gerar relatório de horas
  const generateHoursReport = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('diaries')
        .select(`
          *,
          plant:plants(name, cluster:clusters(name))
        `)
        .gte('date', filters.startDate)
        .lte('date', filters.endDate);

      if (user?.role !== 'admin' && user?.cluster_id) {
        query = query.eq('cluster_id', user.cluster_id);
      }
      
      if (filters.clusterId) {
        query = query.eq('cluster_id', filters.clusterId);
      }

      const { data: diaries } = await query;
      
      if (diaries) {
        // Agrupar por data
        const grouped = (diaries as DiaryWithRelations[]).reduce((acc: Record<string, DiaryWithRelations[]>, diary: DiaryWithRelations) => {
          const date = diary.date;
          if (!acc[date]) acc[date] = [];
          acc[date].push(diary);
          return acc;
        }, {} as Record<string, DiaryWithRelations[]>);

        const reports: HoursReportExtended[] = [];
        Object.entries(grouped).forEach(([date, dayDiaries]) => {
          // Calcular horas totais do dia
          const totalHours = dayDiaries.reduce((sum: number, diary: DiaryWithRelations) => {
            const start = new Date(`2000-01-01T${diary.start_time}`);
            const end = new Date(`2000-01-01T${diary.end_time}`);
            const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
            return sum + hours;
          }, 0);

          // Agrupar por cluster
          const clusterGroups = dayDiaries.reduce((acc: Record<string, DiaryWithRelations[]>, diary: DiaryWithRelations) => {
            const clusterName = diary.plant?.cluster?.name || 'Sem cluster';
            if (!acc[clusterName]) acc[clusterName] = [];
            acc[clusterName].push(diary);
            return acc;
          }, {} as Record<string, DiaryWithRelations[]>);

          const clusters: ClusterHoursData[] = Object.entries(clusterGroups).map(([clusterName, clusterDiaries]) => {
            const clusterHours = clusterDiaries.reduce((sum: number, diary: DiaryWithRelations) => {
              const start = new Date(`2000-01-01T${diary.start_time}`);
              const end = new Date(`2000-01-01T${diary.end_time}`);
              const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
              return sum + hours;
            }, 0);

            return {
              cluster_name: clusterName,
              hours: Math.round(clusterHours * 100) / 100,
              activities_count: clusterDiaries.length
            };
          });

          reports.push({
            date: format(parseISO(date), 'dd/MM/yyyy'),
            total_hours: Math.round(totalHours * 100) / 100,
            clusters
          });
        });
        
        setHoursReports(reports.sort((a, b) => a.date.localeCompare(b.date)));
      }
    } catch (error) {
      console.error('Erro ao gerar relatório de horas:', error);
    } finally {
      setLoading(false);
    }
  };

  // Exportar para PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    const title = activeTab === 'ss' ? 'Relatório de Solicitações de Serviço (SS)' : 'Relatório de Horas Agendadas';
    
    doc.setFontSize(16);
    doc.text(title, 20, 20);
    doc.setFontSize(12);
    doc.text(`Período: ${format(parseISO(filters.startDate), 'dd/MM/yyyy')} a ${format(parseISO(filters.endDate), 'dd/MM/yyyy')}`, 20, 30);
    
    let yPosition = 50;
    
    if (activeTab === 'ss') {
      ssReports.forEach((report) => {
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }
        
        doc.setFontSize(14);
        doc.text(`${report.cluster_name} - ${report.plant_name}`, 20, yPosition);
        doc.setFontSize(10);
        doc.text(`Total de SS: ${report.ss_count}`, 20, yPosition + 10);
        
        yPosition += 25;
        
        report.ss_list.forEach((ssNumber: string) => {
          if (yPosition > 270) {
            doc.addPage();
            yPosition = 20;
          }
          
          doc.text(`SS: ${ssNumber}`, 25, yPosition);
          yPosition += 10;
        });
        
        yPosition += 10;
      });
    } else {
      hoursReports.forEach((report) => {
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }
        
        doc.setFontSize(14);
        doc.text(`${report.date}`, 20, yPosition);
        doc.setFontSize(10);
        doc.text(`Total de horas: ${report.total_hours}h`, 20, yPosition + 10);
        
        yPosition += 25;
        
        report.clusters.forEach((cluster: ClusterHoursData) => {
          if (yPosition > 270) {
            doc.addPage();
            yPosition = 20;
          }
          
          doc.text(`${cluster.cluster_name}: ${cluster.hours}h (${cluster.activities_count} atividades)`, 25, yPosition);
          yPosition += 10;
        });
        
        yPosition += 10;
      });
    }
    
    doc.save(`${title.toLowerCase().replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  // Exportar para Excel
  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    
    if (activeTab === 'ss') {
      const data = ssReports.flatMap(report => 
        report.ss_list.map((ssNumber: string) => ({
          'Cluster': report.cluster_name,
          'Usina': report.plant_name,
          'SS': ssNumber
        }))
      );
      
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Relatório SS');
    } else {
      const data = hoursReports.flatMap(report => 
        report.clusters.map((cluster: ClusterHoursData) => ({
          'Data': report.date,
          'Cluster': cluster.cluster_name,
          'Horas': cluster.hours,
          'Atividades': cluster.activities_count,
          'Total do Dia': report.total_hours
        }))
      );
      
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Relatório Horas');
    }
    
    const fileName = `relatorio-${activeTab}-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // Exportar para TXT
  const exportToTXT = () => {
    let content = '';
    const title = activeTab === 'ss' ? 'RELATÓRIO DE SOLICITAÇÕES DE SERVIÇO (SS)' : 'RELATÓRIO DE HORAS AGENDADAS';
    
    content += `${title}\n`;
    content += `Período: ${format(parseISO(filters.startDate), 'dd/MM/yyyy')} a ${format(parseISO(filters.endDate), 'dd/MM/yyyy')}\n`;
    content += `Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}\n\n`;
    content += '='.repeat(80) + '\n\n';
    
    if (activeTab === 'ss') {
      ssReports.forEach((report) => {
        content += `${report.cluster_name} - ${report.plant_name}\n`;
        content += `Total de SS: ${report.ss_count}\n`;
        content += '-'.repeat(50) + '\n';
        
        report.ss_list.forEach((ssNumber: string) => {
          content += `SS: ${ssNumber}\n`;
        });
        
        content += '\n';
      });
    } else {
      hoursReports.forEach((report) => {
        content += `Data: ${report.date}\n`;
        content += `Total de horas: ${report.total_hours}h\n`;
        content += '-'.repeat(30) + '\n';
        
        report.clusters.forEach((cluster: ClusterHoursData) => {
          content += `${cluster.cluster_name}: ${cluster.hours}h (${cluster.activities_count} atividades)\n`;
        });
        
        content += '\n';
      });
    }
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const fileName = `relatorio-${activeTab}-${format(new Date(), 'yyyy-MM-dd')}.txt`;
    saveAs(blob, fileName);
  };

  // Abrir SS no Sismetro
  const openSismetro = (ssNumber: string) => {
    const sismetroUrl = `https://sismetro.bei.eng.br/ss/${ssNumber}`;
    window.open(sismetroUrl, '_blank');
  };

  const clusterOptions = clusters.map(cluster => ({
    value: cluster.id,
    label: cluster.name
  }));

  const plantOptions = plants
    .filter(plant => !filters.clusterId || plant.cluster_id === filters.clusterId)
    .map(plant => ({
      value: plant.id,
      label: plant.name
    }));

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
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
              <h1 className="text-3xl font-bold text-gray-900">Relatórios</h1>
              <p className="text-gray-600">Visualize e exporte relatórios detalhados do sistema</p>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <Card className="mb-6">
          <CardHeader title="Filtros" />
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <Input
                label="Data Início"
                type="date"
                value={filters.startDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              />
              <Input
                label="Data Fim"
                type="date"
                value={filters.endDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              />
              {(user?.role === 'admin' || user?.role === 'cluster_manager') && (
                <Select
                  label="Cluster"
                  placeholder="Todos os clusters"
                  options={clusterOptions}
                  value={filters.clusterId}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                    setFilters(prev => ({ ...prev, clusterId: e.target.value, plantId: '' }));
                  }}
                />
              )}
              <Select
                label="Usina"
                placeholder="Todas as usinas"
                options={plantOptions}
                value={filters.plantId}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilters(prev => ({ ...prev, plantId: e.target.value }))}
              />
              <div className="flex items-end">
                <Button
                  onClick={activeTab === 'ss' ? generateSSReport : generateHoursReport}
                  loading={loading}
                  icon={Filter}
                  fullWidth
                >
                  Filtrar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('ss')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'ss'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FileText className="h-4 w-4 inline mr-2" />
                Relatório de SS
              </button>
              <button
                onClick={() => setActiveTab('hours')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'hours'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Clock className="h-4 w-4 inline mr-2" />
                Relatório de Horas
              </button>
            </nav>
          </div>
        </div>

        {/* Ações de Exportação */}
        {((activeTab === 'ss' && ssReports.length > 0) || (activeTab === 'hours' && hoursReports.length > 0)) && (
          <Card className="mb-6">
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button onClick={exportToPDF} icon={Download} variant="outline">
                  Exportar PDF
                </Button>
                <Button onClick={exportToExcel} icon={Download} variant="outline">
                  Exportar Excel
                </Button>
                <Button onClick={exportToTXT} icon={Download} variant="outline">
                  Exportar TXT
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Conteúdo dos Relatórios */}
        {activeTab === 'ss' && (
          <div className="space-y-6">
            {ssReports.length === 0 ? (
              <Card>
                <CardContent>
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum relatório gerado</h3>
                    <p className="text-gray-500">Configure os filtros e clique em "Filtrar" para gerar o relatório</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              ssReports.map((report, index) => (
                <Card key={index}>
                  <CardHeader 
                    title={`${report.cluster_name} - ${report.plant_name}`}
                    subtitle={`${report.ss_count} SS encontradas`}
                  />
                  <CardContent>
                    <div className="space-y-4">
                      {report.ss_list.map((ssNumber: string, actIndex: number) => (
                        <div key={actIndex} className="border-l-4 border-blue-500 pl-4 py-2">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-4">
                              <span className="font-medium text-gray-900">SS: {ssNumber}</span>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openSismetro(ssNumber)}
                            >
                              Abrir SS
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {activeTab === 'hours' && (
          <div className="space-y-6">
            {hoursReports.length === 0 ? (
              <Card>
                <CardContent>
                  <div className="text-center py-12">
                    <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum relatório gerado</h3>
                    <p className="text-gray-500">Configure os filtros e clique em "Filtrar" para gerar o relatório</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              hoursReports.map((report, index) => (
                <Card key={index}>
                  <CardHeader 
                    title={report.date}
                    subtitle={`Total: ${report.total_hours}h`}
                  />
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {report.clusters.map((cluster: ClusterHoursData, clusterIndex: number) => (
                        <div key={clusterIndex} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-gray-900">{cluster.cluster_name}</h4>
                            <BarChart3 className="h-4 w-4 text-gray-400" />
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Horas:</span>
                              <span className="font-medium">{cluster.hours}h</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Atividades:</span>
                              <span className="font-medium">{cluster.activities_count}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};