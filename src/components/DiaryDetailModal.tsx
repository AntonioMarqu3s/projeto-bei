import React from 'react';
import { X, Copy, Clock, Building2, User, Users, FileText, Calendar } from 'lucide-react';
import { Button, Card, CardContent } from './ui';
import type { Diary } from '../lib/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DiaryDetailModalProps {
  diary: Diary;
  isOpen: boolean;
  onClose: () => void;
}

export const DiaryDetailModal: React.FC<DiaryDetailModalProps> = ({
  diary,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  // Função para formatar o diário no formato .txt seguindo o modelo
  const formatDiaryToText = () => {
    const formattedDate = format(new Date(diary.date), 'dd/MM/yyyy', { locale: ptBR });
    const clusterName = diary.plant?.cluster?.name || 'Cluster não especificado';
    
    let text = `📅 Informe Diário – Programação de Equipe - ${clusterName}\n`;
    text += `📆 Data: ${formattedDate}\n\n`;
    
    // Seção de equipes em campo
    text += `👥 Equipes em Campo:\n\n`;
    
    // Adicionar participantes do cluster individualmente
    if (diary.participants && diary.participants.length > 0) {
      diary.participants.forEach((participant) => {
        const role = participant.user.role === 'technician' ? 'Técnico Eletrotécnico' : 
                    participant.user.role === 'maintainer' ? 'Mantenedor' : 
                    participant.user.role === 'cluster_manager' ? 'Gerente de Cluster' : 'Administrador';
        
        text += `${participant.user.name} – ${clusterName} – ${role} – ${participant.user.name}\n`;
      });
    } else {
      // Se não há participantes, usar o responsável do diário
      const userRole = diary.user?.role === 'technician' ? 'Técnico Eletrotécnico' : 
                      diary.user?.role === 'maintainer' ? 'Mantenedor' : 
                      diary.user?.role === 'cluster_manager' ? 'Gerente de Cluster' : 'Administrador';
      text += `${diary.user?.name || 'N/A'} – ${clusterName} – ${userRole} – ${diary.user?.name || 'N/A'}\n`;
    }
    
    // Adicionar pessoas externas individualmente
    if (diary.external_people && diary.external_people.length > 0) {
      diary.external_people.forEach((external) => {
        const role = external.external_person.role || 'Externo';
        const company = external.external_person.company ? ` (${external.external_person.company})` : '';
        text += `${external.external_person.name} – ${clusterName} – ${role}${company} – ${external.external_person.name}\n`;
      });
    }
    
    text += `\n\n🔧 Manutenções Programadas:\n\n`;
    
    // Adicionar atividades seguindo o formato do modelo
    if (diary.activities && diary.activities.length > 0) {
      diary.activities.forEach(activity => {
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
    text += `📲 Contato do Coordenador: Edmilson Silva`;
    
    return text;
  };

  // Função para copiar o texto formatado
  const copyToClipboard = async () => {
    try {
      const formattedText = formatDiaryToText();
      await navigator.clipboard.writeText(formattedText);
      alert('Diário copiado para a área de transferência!');
    } catch (error) {
      console.error('Erro ao copiar:', error);
      alert('Erro ao copiar o diário. Tente novamente.');
    }
  };

  // Função para baixar como arquivo .txt
  const downloadAsText = () => {
    const formattedText = formatDiaryToText();
    const blob = new Blob([formattedText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `diario_${diary.date}_${diary.plant?.name || 'diario'}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Detalhes do Diário
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {format(new Date(diary.date), 'dd/MM/yyyy', { locale: ptBR })}
            </p>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={copyToClipboard}
              icon={Copy}
            >
              Copiar Texto
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadAsText}
              icon={FileText}
            >
              Baixar .txt
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              icon={X}
            >
              Fechar
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Informações Básicas */}
          <Card>
            <CardContent className="p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Informações Básicas
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Building2 className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Usina:</span>
                  <span className="text-sm font-medium">{diary.plant?.name || 'N/A'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Criado por:</span>
                  <span className="text-sm font-medium">{diary.user?.name || 'N/A'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Status:</span>
                  <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                    diary.status === 'completed' ? 'bg-green-100 text-green-800' :
                    diary.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                    diary.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {diary.status === 'completed' ? 'Concluído' :
                     diary.status === 'in_progress' ? 'Em Progresso' :
                     diary.status === 'cancelled' ? 'Cancelado' : 'Pendente'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Participantes */}
          {(diary.participants && diary.participants.length > 0) || (diary.external_people && diary.external_people.length > 0) ? (
            <Card>
              <CardContent className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Equipe em Campo
                </h3>
                <div className="space-y-3">
                  {/* Participantes do cluster */}
                  {diary.participants?.map((participant) => {
                    const role = participant.user.role === 'technician' ? 'Técnico' :
                                participant.user.role === 'maintainer' ? 'Mantenedor' :
                                participant.user.role === 'cluster_manager' ? 'Gerente de Cluster' : 'Administrador';
                    const clusterName = diary.plant?.cluster?.name || 'PORANGATU';
                    
                    return (
                      <div key={participant.user.id} className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                        <User className="h-4 w-4 text-blue-600" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                             {clusterName} – {role} – {participant.user.name}
                           </p>
                          {participant.role === 'creator' && (
                            <p className="text-xs text-blue-600">(Criador)</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Pessoas externas */}
                  {diary.external_people?.map((external) => {
                    const clusterName = diary.plant?.cluster?.name || 'PORANGATU';
                    const role = external.external_person.role || 'Externo';
                    
                    return (
                      <div key={external.external_person.id} className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                        <User className="h-4 w-4 text-green-600" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                              {clusterName} – {role} – {external.external_person.name}
                              {external.external_person.company && ` (${external.external_person.company})`}
                            </p>
                           {external.external_person.contact && (
                             <p className="text-xs text-gray-600">Contato: {external.external_person.contact}</p>
                           )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Atividades */}
          {diary.activities && diary.activities.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Manutenções Programadas
                </h3>
                <div className="space-y-4">
                  {diary.activities.map((activity) => (
                    <div key={activity.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-gray-900">{activity.activity}</h4>
                        {activity.ss_number && (
                          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded">
                            SS: {activity.ss_number}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                        <div>
                          <strong>Equipamento:</strong> {activity.equipment}
                        </div>
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          <strong>Horário:</strong> {activity.start_time} às {activity.end_time}
                        </div>
                      </div>
                      {activity.observations && (
                        <div className="mt-2 text-sm text-gray-600">
                          <strong>Observações:</strong> {activity.observations}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Observações Gerais */}
          {diary.general_observations && (
            <Card>
              <CardContent className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  📌 Observações Importantes
                </h3>
                <p className="text-gray-700 whitespace-pre-wrap">{diary.general_observations}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default DiaryDetailModal;