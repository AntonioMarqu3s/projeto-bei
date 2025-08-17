import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

export const AuthDebug: React.FC = () => {
  const { user, loading, error, isAuthenticated } = useAuth();
  const [sessionInfo, setSessionInfo] = useState<{
    user_id: string;
    email: string | undefined;
    expires_at: number;
  } | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-9), `${timestamp}: ${message}`]);
  };

  const checkSession = useCallback(async () => {
    try {
      addLog('Verificando sessão...');
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        addLog(`Erro na sessão: ${error.message}`);
        return;
      }
      
      if (session) {
        addLog(`Sessão encontrada: ${session.user.email}`);
        setSessionInfo({
          user_id: session.user.id,
          email: session.user.email,
          expires_at: session.expires_at
        });
      } else {
        addLog('Nenhuma sessão ativa');
        setSessionInfo(null);
      }
    } catch (err) {
      addLog(`Exceção: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    }
  }, []);

  const testUserQuery = async () => {
    try {
      addLog('Testando consulta de usuário...');
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, role')
        .limit(1);
      
      if (error) {
        addLog(`Erro na consulta: ${error.message}`);
      } else {
        addLog(`Consulta OK: ${data?.length || 0} usuários`);
      }
    } catch (err) {
      addLog(`Exceção na consulta: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    }
  };

  const signOut = async () => {
    try {
      addLog('Fazendo logout...');
      const { error } = await supabase.auth.signOut();
      if (error) {
        addLog(`Erro no logout: ${error.message}`);
      } else {
        addLog('Logout realizado com sucesso');
      }
    } catch (err) {
      addLog(`Exceção no logout: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    }
  };

  useEffect(() => {
    addLog('Componente AuthDebug montado');
    checkSession();
  }, [checkSession]);

  useEffect(() => {
    addLog(`useAuth mudou: loading=${loading}, isAuthenticated=${isAuthenticated}, user=${user?.email || 'null'}`);
  }, [loading, isAuthenticated, user]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Debug de Autenticação</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status do useAuth */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-3">Status useAuth</h3>
          <div className="space-y-2 text-sm">
            <p><strong>Loading:</strong> {loading ? 'true' : 'false'}</p>
            <p><strong>Authenticated:</strong> {isAuthenticated ? 'true' : 'false'}</p>
            <p><strong>User:</strong> {user ? user.email : 'null'}</p>
            <p><strong>Role:</strong> {user?.role || 'N/A'}</p>
            <p><strong>Error:</strong> {error || 'Nenhum'}</p>
          </div>
        </div>

        {/* Informações da Sessão */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-3">Sessão Supabase</h3>
          {sessionInfo ? (
            <div className="space-y-2 text-sm">
              <p><strong>User ID:</strong> {sessionInfo.user_id}</p>
              <p><strong>Email:</strong> {sessionInfo.email}</p>
              <p><strong>Expires:</strong> {new Date(sessionInfo.expires_at * 1000).toLocaleString()}</p>
            </div>
          ) : (
            <p className="text-gray-500">Nenhuma sessão ativa</p>
          )}
        </div>
      </div>

      {/* Controles */}
      <div className="mt-6 flex gap-3">
        <button
          onClick={checkSession}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Verificar Sessão
        </button>
        
        <button
          onClick={testUserQuery}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Testar Consulta
        </button>
        
        <button
          onClick={signOut}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Logout
        </button>
      </div>

      {/* Logs */}
      <div className="mt-6 bg-gray-900 text-green-400 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">Logs (últimos 10)</h3>
        <div className="space-y-1 text-sm font-mono">
          {logs.length === 0 ? (
            <p>Nenhum log ainda...</p>
          ) : (
            logs.map((log, index) => (
              <p key={index}>{log}</p>
            ))
          )}
        </div>
      </div>
    </div>
  );
};