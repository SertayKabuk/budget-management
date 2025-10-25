import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { groupApi } from '../services/api';
import ChatInterface from '../components/ChatInterface';
import InvoiceUpload from '../components/InvoiceUpload';
import GroupSpendingSummary from '../components/GroupSpendingSummary';
import { getSocket } from '../services/socket';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../contexts/LanguageContext';

export default function HomePage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');

  const { data: groups } = useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const response = await groupApi.getAll();
      return response.data;
    },
  });

  const { data: group } = useQuery({
    queryKey: ['group', selectedGroupId],
    queryFn: async () => {
      const response = await groupApi.getById(selectedGroupId);
      return response.data;
    },
    enabled: !!selectedGroupId,
  });

  // Auto-select first group if available
  useEffect(() => {
    if (groups && groups.length > 0 && !selectedGroupId) {
      setSelectedGroupId(groups[0].id);
    }
  }, [groups, selectedGroupId]);

  // Join socket room when group is selected
  useEffect(() => {
    if (!selectedGroupId) return;

    const socket = getSocket();
    
    if (socket.connected) {
      socket.emit('join-group', selectedGroupId);
    }

    const handleConnect = () => {
      socket.emit('join-group', selectedGroupId);
    };

    socket.on('connect', handleConnect);

    return () => {
      socket.off('connect', handleConnect);
    };
  }, [selectedGroupId]);

  const handleRefresh = () => {
    // Refresh will be handled by react-query invalidation from socket events
  };

  return (
    <div className="px-4 py-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">{t.home.title}</h1>

      {/* Group Selection */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t.home.selectGroup}
        </label>
        {!groups || groups.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="mb-2">{t.home.noGroups}</p>
            <p className="text-sm">{t.home.noGroupsContact}</p>
          </div>
        ) : (
          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            className="w-full p-3 border rounded-lg text-lg"
          >
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {selectedGroupId && group && user && (
        <>
          {/* Group Spending Summary */}
          <div className="mb-6">
            <GroupSpendingSummary groupId={selectedGroupId} />
          </div>

          {/* Upload Invoice */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">{t.home.uploadInvoice}</h3>
            <InvoiceUpload 
              userId={user.id} 
              groupId={selectedGroupId} 
              onUploadSuccess={handleRefresh}
            />
          </div>

          {/* AI Chat Assistant */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">
              {t.home.chatWithAI}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {t.home.chatSubtitle}
            </p>
            <ChatInterface 
              groupId={selectedGroupId} 
              userId={user.id}
              userName={user.name}
            />
          </div>
        </>
      )}
    </div>
  );
}
