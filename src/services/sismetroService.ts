// Serviço para integração com o sistema Sismetro

// Interface para dados de SS (Solicitação de Serviço)
interface SSData {
  equipamento: string;
  usina: string;
  cluster: string;
  atividade: string;
  prioridade?: 'baixa' | 'media' | 'alta' | 'critica';
  descricao?: string;
  responsavel?: string;
  dataVencimento?: string;
}

// Configurações do Sismetro
const SISMETRO_CONFIG = {
  baseUrl: import.meta.env.VITE_SISMETRO_BASE_URL || 'https://sismetro.bei.eng.br'
};

class SismetroService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = SISMETRO_CONFIG.baseUrl;
  }

  // Gerar link direto para abertura de SS
  generateSSLink(ssData: SSData): string {
    const params = new URLSearchParams({
      equipamento: ssData.equipamento,
      usina: ssData.usina,
      cluster: ssData.cluster,
      atividade: ssData.atividade,
      ...(ssData.prioridade && { prioridade: ssData.prioridade }),
      ...(ssData.descricao && { descricao: ssData.descricao }),
      ...(ssData.responsavel && { responsavel: ssData.responsavel }),
      ...(ssData.dataVencimento && { dataVencimento: ssData.dataVencimento })
    });

    return `${this.baseUrl}/nova-ss?${params.toString()}`;
  }

  // Abrir SS diretamente no Sismetro
  async openSS(ssData: SSData): Promise<void> {
    const link = this.generateSSLink(ssData);
    
    // Tentar abrir em nova aba
    const newWindow = window.open(link, '_blank');
    
    if (!newWindow) {
      // Se popup foi bloqueado, mostrar link para o usuário
      throw new Error('Popup bloqueado. Por favor, permita popups para este site.');
    }
  }

  // Validar configuração do Sismetro
  isConfigured(): boolean {
    return !!(this.baseUrl && this.baseUrl !== 'https://sismetro.bei.eng.br');
  }


}

// Instância singleton do serviço
export const sismetroService = new SismetroService();

// Funções utilitárias
export const formatSSData = (maintenance: { equipment?: string; activity?: string; priority?: string; description?: string; responsible?: string; scheduled_date?: string }, plant: { name?: string }, cluster: { name?: string }): SSData => {
  // Validar e converter prioridade
  const validPriorities: ('baixa' | 'media' | 'alta' | 'critica')[] = ['baixa', 'media', 'alta', 'critica'];
  const priority = validPriorities.includes(maintenance.priority as 'baixa' | 'media' | 'alta' | 'critica') 
    ? (maintenance.priority as 'baixa' | 'media' | 'alta' | 'critica') 
    : 'media';

  return {
    equipamento: maintenance.equipment || 'N/A',
    usina: plant?.name || 'N/A',
    cluster: cluster?.name || 'N/A',
    atividade: maintenance.activity || 'N/A',
    prioridade: priority,
    descricao: maintenance.description || '',
    responsavel: maintenance.responsible || '',
    dataVencimento: maintenance.scheduled_date || ''
  };
};

// Hook para usar o serviço Sismetro
export const useSismetro = () => {
  const openSS = async (ssData: SSData) => {
    try {
      await sismetroService.openSS(ssData);
    } catch (error) {
      console.error('Erro ao abrir SS:', error);
      // Fallback: copiar link para clipboard
      const link = sismetroService.generateSSLink(ssData);
      await navigator.clipboard.writeText(link);
      alert('Link copiado para a área de transferência!');
    }
  };

  const generateLink = (ssData: SSData): string => {
    return sismetroService.generateSSLink(ssData);
  };

  return {
    openSS,
    generateLink,
    isConfigured: sismetroService.isConfigured()
  };
};