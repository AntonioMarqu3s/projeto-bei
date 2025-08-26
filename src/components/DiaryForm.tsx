import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Clock, Save, X, Users, Building2, Wrench, FileText, Plus, Trash2, Copy, ArrowUpDown } from 'lucide-react';
import { Button, Input, Select, Card, CardHeader, CardContent } from './ui';
import { useDiary, type DiaryFormData } from '../hooks/useDiary';
import { useAuth } from '../hooks/useAuth';
import type { Diary } from '../lib/supabase';


// Schema de validação para atividade
const activitySchema = z.object({
  equipment: z.string().min(1, 'Equipamento é obrigatório'),
  activity: z.string().min(1, 'Atividade é obrigatória'),
  start_time: z.string().min(1, 'Horário de início é obrigatório'),
  end_time: z.string().min(1, 'Horário de fim é obrigatório'),
  ss_number: z.string().optional(),
  observations: z.string().optional(),
}).refine((data) => {
  if (data.start_time && data.end_time) {
    return data.start_time < data.end_time;
  }
  return true;
}, {
  message: 'Horário de fim deve ser posterior ao horário de início',
  path: ['end_time'],
});

// Função para verificar sobreposição de horários
interface ActivityData {
  equipment: string;
  activity: string;
  start_time: string;
  end_time: string;
  ss_number?: string;
  observations?: string;
}

const checkTimeOverlap = (activities: ActivityData[]) => {
  for (let i = 0; i < activities.length; i++) {
    for (let j = i + 1; j < activities.length; j++) {
      const activity1 = activities[i];
      const activity2 = activities[j];
      
      if (activity1.start_time && activity1.end_time && 
          activity2.start_time && activity2.end_time) {
        // Verifica se há sobreposição
        if ((activity1.start_time < activity2.end_time && 
             activity1.end_time > activity2.start_time)) {
          return {
            valid: false,
            message: `Conflito de horário entre atividade ${i + 1} e ${j + 1}`,
            path: [`activities.${j}.start_time`]
          };
        }
      }
    }
  }
  return { valid: true };
};

// Função para ordenar atividades por horário
const sortActivitiesByTime = (activities: ActivityData[]) => {
  return [...activities].sort((a, b) => {
    if (!a.start_time || !b.start_time) return 0;
    return a.start_time.localeCompare(b.start_time);
  });
};

// Schema de validação para o diário
const externalPersonSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  role: z.string().optional(),
  contact: z.string().optional(),
  company: z.string().optional(),
});

const diarySchema = z.object({
  plant_id: z.string().min(1, 'Selecione uma usina'),
  user_ids: z.array(z.string()).min(1, 'Selecione pelo menos um usuário'),
  external_people: z.array(externalPersonSchema).optional(),
  date: z.string().min(1, 'Data é obrigatória'),
  activities: z.array(activitySchema).min(1, 'Adicione pelo menos uma atividade'),
  general_observations: z.string().optional(),
}).refine((data) => {
   const overlapCheck = checkTimeOverlap(data.activities);
   return overlapCheck.valid;
 }, {
  message: 'Há conflito de horários entre as atividades',
  path: ['activities'],
});

interface DiaryFormProps {
  diary?: Diary;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const DiaryForm: React.FC<DiaryFormProps> = ({
  diary,
  onSuccess,
  onCancel,
}) => {
  const { user } = useAuth();
  const {
    plants,
    clusterUsers,
    loading,
    error,
    createDiary,
    updateDiary,
    fetchPlants,
    fetchClusterUsers,
    clearError,
  } = useDiary();

  const [availableUsers, setAvailableUsers] = useState<any[]>([]);

  const [selectedPlant, setSelectedPlant] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
    control,
  } = useForm<DiaryFormData>({
    resolver: zodResolver(diarySchema),
    defaultValues: diary ? {
      plant_id: diary.plant_id,
      user_ids: diary.participants?.map(p => p.user.id) || (user?.id ? [user.id] : []),
      external_people: diary.external_people?.map(ep => ({
        name: ep.external_person.name,
        role: ep.external_person.role || '',
        contact: ep.external_person.contact || ''
      })) || [],
      date: diary.date || new Date().toISOString().split('T')[0],
      activities: diary.activities || [{
        equipment: '',
        activity: '',
        start_time: '',
        end_time: '',
        ss_number: '',
        observations: '',
      }],
      general_observations: diary.general_observations || '',
    } : {
      plant_id: '',
      user_ids: user?.id ? [user.id] : [],
      external_people: [],
      date: new Date().toISOString().split('T')[0],
      activities: [{
        equipment: '',
        activity: '',
        start_time: '',
        end_time: '',
        ss_number: '',
        observations: '',
      }],
      general_observations: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'activities',
  });

  const { fields: externalFields, append: appendExternal, remove: removeExternal } = useFieldArray({
    control,
    name: 'external_people',
  });

  const watchedPlantId = watch('plant_id');

  // Atualizar planta selecionada
  useEffect(() => {
    if (watchedPlantId && watchedPlantId !== selectedPlant) {
      setSelectedPlant(watchedPlantId);
    }
  }, [watchedPlantId, selectedPlant]);

  // Limpar erro quando componente montar e garantir que dados sejam carregados
  useEffect(() => {
    clearError();
    // Garantir que as usinas sejam carregadas se ainda não foram
    if (plants.length === 0 && !loading) {
      fetchPlants();
    }
    // Garantir que os usuários do cluster sejam carregados se ainda não foram
    if (clusterUsers.length === 0 && !loading) {
      fetchClusterUsers();
    }
  }, [clearError, plants.length, clusterUsers.length, loading, fetchPlants, fetchClusterUsers]);

  const onSubmit = async (data: DiaryFormData) => {
    setIsSubmitting(true);
    
    try {
      let success = false;
      
      if (diary?.id) {
        success = await updateDiary(diary.id, data);
      } else {
        success = await createDiary(data);
      }
      
      if (success) {
        reset();
        onSuccess?.();
      }
    } catch (err) {
      console.error('onSubmit: Erro ao salvar diário:', err);
    } finally {
      setIsSubmitting(false);
    }
  };



  const handleCancel = () => {
    reset();
    clearError();
    onCancel?.();
  };

  // Opções para os selects
  
  const plantOptions = plants.map(plant => ({
    value: plant.id,
    label: plant.name,
  }));

  const userOptions = availableUsers.map(user => ({
    value: user.id,
    label: user.name,
  }));

  // Carregar usuários disponíveis
  useEffect(() => {
    setAvailableUsers(clusterUsers);
  }, [clusterUsers]);

  const addActivity = () => {
    append({
      equipment: '',
      activity: '',
      start_time: '',
      end_time: '',
      ss_number: '',
      observations: '',
    });
  };

  const addExternalPerson = () => {
    appendExternal({
      name: '',
      role: '',
      contact: '',
    });
  };

  const removeExternalPerson = (index: number) => {
    removeExternal(index);
  };

  const duplicateActivity = (index: number) => {
    const activityToDuplicate = fields[index];
    append({
      equipment: activityToDuplicate.equipment,
      activity: activityToDuplicate.activity,
      start_time: '',
      end_time: '',
      ss_number: '',
      observations: '',
    });
  };

  const removeActivity = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  const sortActivities = () => {
    const currentActivities = watch('activities');
    const sortedActivities = sortActivitiesByTime(currentActivities);
    
    // Remove todas as atividades atuais
    while (fields.length > 0) {
      remove(0);
    }
    
    // Adiciona as atividades ordenadas
    sortedActivities.forEach(activity => {
      append(activity);
    });
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
        <CardHeader
          title={diary ? 'Editar Diário de Atividade' : 'Novo Diário de Atividade'}
          subtitle="Registre as atividades realizadas pela equipe"
        />
      
      <CardContent>
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={(e) => {
          console.log('Form onSubmit: Evento de submit capturado');
          e.preventDefault();
          handleSubmit((data) => {
            console.log('handleSubmit: Formulário submetido com dados:', data);
            try {
              return onSubmit(data);
            } catch (error) {
              console.error('handleSubmit: Erro capturado:', error);
              return Promise.reject(error);
            }
          })(e);
        }} className="space-y-6">
          {/* Informações Básicas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                <Building2 className="h-4 w-4" />
                <span>Informações Básicas</span>
              </div>
              
              <Select
                label="Usina"
                placeholder="Selecione a usina"
                options={plantOptions}
                error={errors.plant_id?.message}
                {...register('plant_id')}
                fullWidth
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                <Users className="h-4 w-4" />
                <span>Usuários do Cluster</span>
              </div>
              
              <Controller
                name="user_ids"
                control={control}
                render={({ field }) => (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Selecione os usuários
                    </label>
                    <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-md p-2">
                      {userOptions.map((user) => (
                        <label key={user.value} className="flex items-center space-x-2 p-1 hover:bg-gray-50">
                          <input
                            type="checkbox"
                            value={user.value}
                            checked={field.value?.includes(user.value) || false}
                            onChange={(e) => {
                              const currentValues = field.value || [];
                              if (e.target.checked) {
                                field.onChange([...currentValues, user.value]);
                              } else {
                                field.onChange(currentValues.filter(id => id !== user.value));
                              }
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm">{user.label}</span>
                        </label>
                      ))}
                    </div>
                    {errors.user_ids && (
                      <p className="text-sm text-red-600">{errors.user_ids.message}</p>
                    )}
                  </div>
                )}
              />
            </div>

            {/* Pessoas Externas */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                  <Users className="h-4 w-4" />
                  <span>Pessoas Externas ({externalFields.length})</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addExternalPerson}
                  icon={Plus}
                >
                  Adicionar Pessoa Externa
                </Button>
              </div>
              
              {externalFields.length > 0 && (
                <div className="space-y-3">
                  {externalFields.map((field, index) => (
                    <Card key={field.id} className="border border-gray-200">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="text-sm font-medium text-gray-900">
                            Pessoa Externa {index + 1}
                          </h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeExternalPerson(index)}
                            icon={Trash2}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            Remover
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <Input
                            label="Nome *"
                            placeholder="Nome da pessoa"
                            error={errors.external_people?.[index]?.name?.message}
                            {...register(`external_people.${index}.name`)}
                            fullWidth
                          />
                          <Input
                            label="Função"
                            placeholder="Ex: Técnico, Supervisor"
                            error={errors.external_people?.[index]?.role?.message}
                            {...register(`external_people.${index}.role`)}
                            fullWidth
                          />
                          <Input
                            label="Empresa"
                            placeholder="Nome da empresa"
                            error={errors.external_people?.[index]?.company?.message}
                            {...register(`external_people.${index}.company`)}
                            fullWidth
                          />
                          <Input
                            label="Contato"
                            placeholder="Telefone ou email"
                            error={errors.external_people?.[index]?.contact?.message}
                            {...register(`external_people.${index}.contact`)}
                            fullWidth
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                <Clock className="h-4 w-4" />
                <span>Data</span>
              </div>
              
              <Input
                type="date"
                label="Data"
                error={errors.date?.message}
                {...register('date')}
                fullWidth
              />
            </div>
          </div>

          {/* Atividades */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                <Wrench className="h-4 w-4" />
                <span>Atividades ({fields.length})</span>
              </div>
              
              <div className="flex space-x-2">
                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={sortActivities}
                    title="Ordenar por horário"
                  >
                    <ArrowUpDown className="h-4 w-4 mr-2" />
                    Ordenar
                  </Button>
                )}
                
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addActivity}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
              </div>
            </div>
            
            {fields.map((field, index) => {
              const hasTimeConflict = errors.activities?.message?.includes('conflito') && 
                                    errors.activities?.message?.includes(`${index + 1}`);
              
              return (
              <Card key={field.id} className={`p-4 border ${
                hasTimeConflict ? 'border-red-300 bg-red-50' : 'border-gray-200'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-medium text-gray-700">
                    Atividade {index + 1}
                  </h4>
                  
                  <div className="flex space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => duplicateActivity(index)}
                      className="text-blue-600 hover:text-blue-700"
                      title="Duplicar atividade"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeActivity(index)}
                        className="text-red-600 hover:text-red-700"
                        title="Remover atividade"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Equipamento"
                    placeholder="Ex: Turbina 1, Gerador A, etc."
                    error={errors.activities?.[index]?.equipment?.message}
                    {...register(`activities.${index}.equipment`)}
                    fullWidth
                  />
                  
                  <Input
                    label="Atividade"
                    placeholder="Descreva a atividade realizada"
                    error={errors.activities?.[index]?.activity?.message}
                    {...register(`activities.${index}.activity`)}
                    fullWidth
                  />
                  
                  <Input
                    type="time"
                    label="Horário de Início"
                    error={errors.activities?.[index]?.start_time?.message}
                    {...register(`activities.${index}.start_time`)}
                    step="1"
                    pattern="[0-9]{2}:[0-9]{2}"
                    fullWidth
                  />
                  
                  <Input
                    type="time"
                    label="Horário de Fim"
                    error={errors.activities?.[index]?.end_time?.message}
                    {...register(`activities.${index}.end_time`)}
                    step="1"
                    pattern="[0-9]{2}:[0-9]{2}"
                    fullWidth
                  />
                  
                  <Input
                    label="Número da SS (Opcional)"
                    placeholder="Ex: SS-2024-001"
                    error={errors.activities?.[index]?.ss_number?.message}
                    {...register(`activities.${index}.ss_number`)}
                    fullWidth
                  />
                </div>
                
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FileText className="h-4 w-4 inline mr-1" />
                    Observações da Atividade
                  </label>
                  <textarea
                    {...register(`activities.${index}.observations`)}
                    placeholder="Descreva observações específicas desta atividade, problemas encontrados, soluções aplicadas, etc..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={3}
                  />
                  {errors.activities?.[index]?.observations && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.activities[index]?.observations?.message}
                    </p>
                  )}
                </div>
              </Card>
              );
            })}
            
            {/* Mensagem de erro para conflitos de horário */}
            {errors.activities?.message && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800 font-medium">
                  ⚠️ {errors.activities.message}
                </p>
                <p className="text-xs text-red-600 mt-1">
                  Verifique os horários das atividades para evitar sobreposições.
                </p>
              </div>
            )}
          </div>

          {/* Observações Gerais */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-sm font-medium text-gray-700">
              <FileText className="h-4 w-4" />
              <span>Observações Gerais do Dia</span>
            </div>
            
            <div className="space-y-2">
              <textarea
                {...register('general_observations')}
                placeholder="Observações gerais sobre o dia de trabalho: condições climáticas, intercorrências, pendências, próximas atividades planejadas, etc..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={4}
              />
              <p className="text-xs text-gray-500">
                💡 Dica: Inclua informações relevantes como condições do tempo, equipamentos indisponíveis, pendências para o próximo dia, etc.
              </p>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            
            <Button
              type="submit"
              disabled={isSubmitting || loading}
              onClick={() => console.log('Button clicked: Submit button foi clicado')}
            >
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Salvando...' : diary ? 'Atualizar Diário' : 'Salvar Diário'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};