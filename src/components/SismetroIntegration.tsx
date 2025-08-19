import React, { useState } from 'react';
import { ExternalLink, AlertCircle, Copy } from 'lucide-react';
import { useSismetro, formatSSData } from '../services/sismetroService';
import type { Plant, Cluster } from '../lib/supabase';

// Definindo o tipo Maintenance localmente até ser adicionado ao supabase
interface Maintenance {
  id: string;
  title: string;
  description?: string;
  priority: 'baixa' | 'media' | 'alta' | 'critica';
  status: string;
  plant_id: string;
  cluster_id: string;
  created_at: string;
  updated_at: string;
}

interface SismetroIntegrationProps {
  maintenance: Maintenance;
  plant: Plant;
  cluster: Cluster;
  className?: string;
}

export const SismetroIntegration: React.FC<SismetroIntegrationProps> = ({
  maintenance,
  plant,
  cluster,
  className = ''
}) => {
  const { openSS, generateLink, isConfigured } = useSismetro();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const ssData = formatSSData(maintenance, plant, cluster);

  const handleOpenSS = async () => {
    setIsLoading(true);
    setMessage(null);
    
    try {
      await openSS(ssData);
      setMessage({ type: 'success', text: 'SS aberta no Sismetro!' });
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Erro ao abrir SS' 
      });
    } finally {
      setIsLoading(false);
    }
  };



  const handleCopyLink = async () => {
    try {
      const link = generateLink(ssData);
      await navigator.clipboard.writeText(link);
      setMessage({ type: 'success', text: 'Link copiado para a área de transferência!' });
    } catch {
      setMessage({ type: 'error', text: 'Erro ao copiar link' });
    }
  };

  if (!isConfigured) {
    return (
      <div className={`bg-yellow-50 border border-yellow-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 text-yellow-500" />
          <span className="text-sm text-yellow-700">
            Integração com Sismetro não configurada
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-medium text-gray-900">Link Sismetro</h3>
        <ExternalLink className="h-5 w-5 text-gray-400" />
      </div>

      {/* Informações da SS */}
      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div>
          <span className="font-medium text-gray-700">Equipamento:</span>
          <p className="text-gray-600">{ssData.equipamento}</p>
        </div>
        <div>
          <span className="font-medium text-gray-700">Usina:</span>
          <p className="text-gray-600">{ssData.usina}</p>
        </div>
        <div>
          <span className="font-medium text-gray-700">Cluster:</span>
          <p className="text-gray-600">{ssData.cluster}</p>
        </div>
        <div>
          <span className="font-medium text-gray-700">Atividade:</span>
          <p className="text-gray-600">{ssData.atividade}</p>
        </div>
      </div>

      {/* Botões de ação */}
      <div className="flex flex-wrap gap-2 mb-3">
        <button
          onClick={handleOpenSS}
          disabled={isLoading}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ExternalLink className="h-4 w-4" />
          <span>{isLoading ? 'Abrindo...' : 'Abrir SS'}</span>
        </button>

        <button
          onClick={handleCopyLink}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
        >
          <Copy className="h-4 w-4" />
          <span>Copiar Link</span>
        </button>
      </div>

      {/* Mensagem de feedback */}
      {message && (
        <div className={`flex items-center space-x-2 p-3 rounded-md ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{message.text}</span>
        </div>
      )}
    </div>
  );
};

// Componente compacto para usar em listas
export const SismetroQuickAction: React.FC<{
  maintenance: Maintenance;
  plant: Plant;
  cluster: Cluster;
}> = ({ maintenance, plant, cluster }) => {
  const { openSS } = useSismetro();
  const [isLoading, setIsLoading] = useState(false);

  const handleQuickOpen = async () => {
    setIsLoading(true);
    try {
      const ssData = formatSSData(maintenance, plant, cluster);
      await openSS(ssData);
    } catch (error) {
      console.error('Erro ao abrir SS:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleQuickOpen}
      disabled={isLoading}
      className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors disabled:opacity-50"
      title="Abrir SS no Sismetro"
    >
      <ExternalLink className="h-4 w-4" />
    </button>
  );
};

// Componente simples para usar com número de SS
export const SismetroSSButton: React.FC<{
  ssNumber: string;
  compact?: boolean;
}> = ({ ssNumber, compact = false }) => {
  const handleOpenSS = () => {
    const link = `https://br.sismetro.com/indexNEW.php?f=10&e=${ssNumber}`;
    window.open(link, '_blank');
  };

  if (compact) {
    return (
      <button
        onClick={handleOpenSS}
        className="text-blue-600 hover:text-blue-800 underline text-sm"
        title={`Abrir SS ${ssNumber} no Sismetro`}
      >
        SS: {ssNumber}
      </button>
    );
  }

  return (
    <button
      onClick={handleOpenSS}
      className="flex items-center space-x-1 px-2 py-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
      title={`Abrir SS ${ssNumber} no Sismetro`}
    >
      <ExternalLink className="h-3 w-3" />
      <span className="text-sm">SS: {ssNumber}</span>
    </button>
  );
};