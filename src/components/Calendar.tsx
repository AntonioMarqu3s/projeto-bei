import React, { useState, useCallback, useMemo } from 'react';
import { Calendar as BigCalendar, momentLocalizer, View, Views } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/pt-br';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useDiary } from '../hooks/useDiary';
import { useAuth } from '../hooks/useAuth';

import { Diary } from '../lib/supabase';
import { Card, CardHeader, CardContent } from './ui';
import { Button } from './ui';
import { Calendar as CalendarIcon, Plus, Edit, Trash2, X, Clock, Building2, User } from 'lucide-react';
import { DiaryForm } from './DiaryForm';

// Configurar moment para português brasileiro
moment.locale('pt-br');
const localizer = momentLocalizer(moment);

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: Diary;
}

interface CalendarProps {
  onSelectEvent?: (event: CalendarEvent) => void;
  onSelectSlot?: (slotInfo: { start: Date; end: Date }) => void;
}

export const Calendar: React.FC<CalendarProps> = ({ onSelectEvent, onSelectSlot }) => {

  const { diaries, loading, deleteDiary, fetchDiaries } = useDiary();
  const { user, isAdmin } = useAuth();
  const [view, setView] = useState<View>(Views.MONTH);
  const [date, setDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingDiary, setEditingDiary] = useState<Diary | null>(null);
  const [showDateModal, setShowDateModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [dateDiaries, setDateDiaries] = useState<Diary[]>([]);

  // Converter diários para eventos do calendário
  const events: CalendarEvent[] = useMemo(() => {
    return diaries.map(diary => {
      const startDateTime = diary.activities && diary.activities.length > 0 
        ? new Date(`${diary.date}T${diary.activities[0].start_time}`)
        : new Date(`${diary.date}T08:00`);
      const endDateTime = diary.activities && diary.activities.length > 0
        ? new Date(`${diary.date}T${diary.activities[diary.activities.length - 1].end_time}`)
        : new Date(`${diary.date}T17:00`);
      
      return {
        id: diary.id,
        title: diary.activities && diary.activities.length > 0
          ? `${diary.activities.map(a => a.equipment).filter(Boolean).join(', ')} - ${diary.activities.map(a => a.activity).filter(Boolean).join(', ')}`
          : 'Diário',
        start: startDateTime,
        end: endDateTime,
        resource: diary
      };
    });
  }, [diaries]);

  // Manipular seleção de evento
  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event);
    onSelectEvent?.(event);
  }, [onSelectEvent]);

  // Buscar diários por data
  const fetchDiariesByDate = useCallback(async (dateStr: string) => {
    try {
      const filteredDiaries = diaries.filter(diary => diary.date === dateStr);
      
      // Se for admin, mostrar todos os diários da data
      // Se for usuário normal, mostrar apenas seus próprios diários
      if (isAdmin) {
        setDateDiaries(filteredDiaries);
      } else {
        const userDiaries = filteredDiaries.filter(diary => diary.user_id === user?.id);
        setDateDiaries(userDiaries);
      }
    } catch (error) {
      console.error('Erro ao buscar diários por data:', error);
      setDateDiaries([]);
    }
  }, [diaries, isAdmin, user?.id]);

  // Manipular seleção de slot (mostrar modal com diários da data)
  const handleSelectSlot = useCallback((slotInfo: { start: Date; end: Date }) => {
    const dateStr = moment(slotInfo.start).format('YYYY-MM-DD');
    setSelectedDate(dateStr);
    fetchDiariesByDate(dateStr);
    setShowDateModal(true);
    onSelectSlot?.(slotInfo);
  }, [onSelectSlot, fetchDiariesByDate]);

  // Editar evento
  const handleEditEvent = () => {
    if (selectedEvent) {
      setEditingDiary(selectedEvent.resource);
      setShowForm(true);
      setSelectedEvent(null);
    }
  };

  // Deletar evento
  const handleDeleteEvent = async () => {
    if (selectedEvent && window.confirm('Tem certeza que deseja excluir este diário?')) {
      try {
        await deleteDiary(selectedEvent.id);
        setSelectedEvent(null);
      } catch (error) {
        console.error('Erro ao deletar diário:', error);
        alert('Erro ao deletar diário. Tente novamente.');
      }
    }
  };

  // Personalizar cores dos eventos
  const eventStyleGetter = (event: CalendarEvent) => {
    const diary = event.resource;
    let backgroundColor = '#3174ad';
    
    // Cores baseadas no status ou tipo
    if (diary.activities?.some(activity => activity.ss_number)) {
      backgroundColor = '#ef4444'; // Vermelho para SS
    } else {
      backgroundColor = '#10b981'; // Verde para atividades normais
    }
    
    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block'
      }
    };
  };

  // Mensagens personalizadas em português
  const messages = {
    allDay: 'Dia todo',
    previous: 'Anterior',
    next: 'Próximo',
    today: 'Hoje',
    month: 'Mês',
    week: 'Semana',
    day: 'Dia',
    agenda: 'Agenda',
    date: 'Data',
    time: 'Hora',
    event: 'Evento',
    noEventsInRange: 'Não há eventos neste período.',
    showMore: (total: number) => `+ Ver mais (${total})`
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <CalendarIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p className="text-gray-500">Carregando calendário...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Cabeçalho do calendário */}
      <Card>
        <CardHeader 
          title="Calendário de Atividades"
          subtitle={`${events.length} atividade(s) programada(s)`}
        />
        <CardContent>
          <div className="flex justify-between items-center mb-4">
            <div className="flex space-x-2">
              <Button
                variant="primary"
                size="sm"
                icon={Plus}
                iconPosition="left"
                onClick={() => {
                  setShowForm(true);
                  setEditingDiary(null);
                }}
              >
                Nova Atividade
              </Button>
            </div>
            
            {/* Legenda de cores */}
            <div className="flex space-x-4 text-sm">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span>Normal</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                <span>Manutenção</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <span>SS</span>
              </div>
            </div>
          </div>
          
          {/* Calendário */}
          <div className="h-96">
            <BigCalendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              view={view}
              onView={setView}
              date={date}
              onNavigate={setDate}
              onSelectEvent={handleSelectEvent}
              onSelectSlot={handleSelectSlot}
              selectable
              eventPropGetter={eventStyleGetter}
              messages={messages}
              className="h-full"
            />
          </div>
        </CardContent>
      </Card>

      {/* Modal de detalhes do evento */}
      {selectedEvent && (
        <Card>
          <CardHeader title="Detalhes da Atividade" />
          <CardContent>
            <div className="space-y-3">
              {selectedEvent.resource.activities && selectedEvent.resource.activities.length > 0 && (
                <>
                  <div>
                    <strong>Equipamentos:</strong> {selectedEvent.resource.activities.map(a => a.equipment).filter(Boolean).join(', ')}
                  </div>
                  <div>
                    <strong>Atividades:</strong> {selectedEvent.resource.activities.map(a => a.activity).filter(Boolean).join(', ')}
                  </div>
                </>
              )}
              {selectedEvent.resource.activities && selectedEvent.resource.activities.length > 0 && (
                <div>
                  <strong>Horário:</strong> {selectedEvent.resource.activities[0].start_time} - {selectedEvent.resource.activities[selectedEvent.resource.activities.length - 1].end_time}
                </div>
              )}
              <div>
                <strong>Usina:</strong> {selectedEvent.resource.plant?.name || 'N/A'}
              </div>

              {selectedEvent.resource.activities?.some(activity => activity.ss_number) && (
                <div>
                  <strong>SS:</strong> {selectedEvent.resource.activities
                    .filter(activity => activity.ss_number)
                    .map(activity => activity.ss_number)
                    .join(', ')}
                </div>
              )}
              {selectedEvent.resource.observations && (
                <div>
                  <strong>Observações:</strong> {selectedEvent.resource.observations}
                </div>
              )}
              
              <div className="flex space-x-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  icon={Edit}
                  iconPosition="left"
                  onClick={handleEditEvent}
                >
                  Editar
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  icon={Trash2}
                  iconPosition="left"
                  onClick={handleDeleteEvent}
                >
                  Excluir
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedEvent(null)}
                >
                  Fechar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal de diários por data */}
      {showDateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Diários de {moment(selectedDate).format('DD/MM/YYYY')}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {isAdmin 
                    ? `${dateDiaries.length} diário(s) de todos os usuários`
                    : `${dateDiaries.length} diário(s) seus`
                  }
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDateModal(false)}
                icon={X}
              >
                Fechar
              </Button>
            </div>

            {dateDiaries.length === 0 ? (
              <div className="text-center py-8">
                <CalendarIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nenhum diário encontrado
                </h3>
                <p className="text-gray-600">
                  {isAdmin 
                    ? 'Não há diários registrados por nenhum usuário nesta data.'
                    : 'Você não possui diários registrados nesta data.'}
                </p>
                <div className="mt-4">
                  <Button
                    variant="primary"
                    size="sm"
                    icon={Plus}
                    onClick={() => {
                      setShowDateModal(false);
                      setShowForm(true);
                      setEditingDiary(null);
                    }}
                  >
                    Criar Diário
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {dateDiaries.map((diary) => (
                  <Card key={diary.id} className="border border-gray-200">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            {isAdmin && (
                              <div className="flex items-center space-x-1 text-sm text-gray-600">
                                <User className="h-4 w-4" />
                                <span>{diary.user?.name || 'Usuário desconhecido'}</span>
                                <span className="text-gray-400">•</span>
                              </div>
                            )}
                            <div className="flex items-center space-x-1 text-sm text-gray-600">
                              <Building2 className="h-4 w-4" />
                              <span>{diary.plant?.name || 'Usina não especificada'}</span>
                            </div>
                          </div>
                          
                          {diary.activities && diary.activities.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="font-medium text-gray-900">
                                {diary.activities.map(a => a.activity).filter(Boolean).join(', ')}
                              </h4>
                              <div className="text-sm text-gray-600">
                                <div className="flex items-center space-x-1 mb-1">
                                  <Clock className="h-4 w-4" />
                                  <span>
                                    {diary.activities[0].start_time} - {diary.activities[diary.activities.length - 1].end_time}
                                  </span>
                                </div>
                                <div>
                                  <strong>Equipamentos:</strong> {diary.activities.map(a => a.equipment).filter(Boolean).join(', ')}
                                </div>
                                {diary.activities.some(a => a.ss_number) && (
                                  <div>
                                    <strong>SS:</strong> {diary.activities.filter(a => a.ss_number).map(a => a.ss_number).join(', ')}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {diary.observations && (
                            <div className="mt-2 text-sm text-gray-600">
                              <strong>Observações:</strong> {diary.observations}
                            </div>
                          )}
                        </div>
                        
                        {(!isAdmin || diary.user_id === user?.id) && (
                          <div className="flex space-x-2 ml-4">
                            <Button
                              variant="outline"
                              size="sm"
                              icon={Edit}
                              onClick={() => {
                                setEditingDiary(diary);
                                setShowDateModal(false);
                                setShowForm(true);
                              }}
                            >
                              Editar
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              icon={Trash2}
                              onClick={async () => {
                                if (window.confirm('Tem certeza que deseja excluir este diário?')) {
                                  try {
                                    await deleteDiary(diary.id);
                                    fetchDiariesByDate(selectedDate);
                                  } catch (error) {
                                    console.error('Erro ao deletar diário:', error);
                                    alert('Erro ao deletar diário. Tente novamente.');
                                  }
                                }
                              }}
                            >
                              Excluir
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal do formulário */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <DiaryForm
              diary={editingDiary}
              onSuccess={() => {
                setShowForm(false);
                setEditingDiary(null);
              }}
              onCancel={() => {
                setShowForm(false);
                setEditingDiary(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};