import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { useDiary } from '../hooks/useDiary';

export const UserDebug: React.FC = () => {
  const { user, loading: authLoading, error: authError } = useAuth();
  const { plants, loading: diaryLoading, error: diaryError } = useDiary();

  return (
    <div className="bg-yellow-100 border border-yellow-400 p-4 rounded mb-4">
      <h3 className="font-bold text-yellow-800 mb-2">Debug Info</h3>
      
      <div className="text-sm space-y-1">
        <p><strong>Auth Loading:</strong> {authLoading ? 'true' : 'false'}</p>
        <p><strong>Auth Error:</strong> {authError || 'none'}</p>
        <p><strong>User:</strong> {user ? user.email : 'null'}</p>
        <p><strong>User ID:</strong> {user?.id || 'null'}</p>
        <p><strong>Cluster ID:</strong> {user?.cluster_id || 'null'}</p>
        <p><strong>User Role:</strong> {user?.role || 'null'}</p>
        
        <hr className="my-2" />
        
        <p><strong>Diary Loading:</strong> {diaryLoading ? 'true' : 'false'}</p>
        <p><strong>Diary Error:</strong> {diaryError || 'none'}</p>
        <p><strong>Plants Count:</strong> {plants.length}</p>
        <p><strong>Plants:</strong> {plants.map(p => p.name).join(', ') || 'none'}</p>
      </div>
    </div>
  );
};