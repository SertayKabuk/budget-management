import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { groupApi } from '../services/api';
import MultimodalChatInterface from '../components/MultimodalChatInterface';
import GroupSpendingSummary from '../components/GroupSpendingSummary';
import ReminderAlertBanner from '../components/ReminderAlertBanner';
import CalendarModal from '../components/CalendarModal';
import { getSocket } from '../services/socket';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../contexts/LanguageContext';

export default function HomePage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

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
      const firstGroupId = groups[0].id;
      setSelectedGroupId(firstGroupId);
      localStorage.setItem('selectedGroupId', firstGroupId);
      window.dispatchEvent(new Event('groupSelectionChanged'));
    }
  }, [groups, selectedGroupId]);

  // Update localStorage when group changes
  const handleGroupChange = (groupId: string) => {
    setSelectedGroupId(groupId);
    localStorage.setItem('selectedGroupId', groupId);
    window.dispatchEvent(new Event('groupSelectionChanged'));
  };

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

  return (
    <div className="px-3 sm:px-4 py-4 sm:py-6 max-w-5xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-6">{t.home.title}</h1>

      {/* Group Selection */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-4 sm:mb-6">
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
            onChange={(e) => handleGroupChange(e.target.value)}
            className="w-full p-3 border rounded-lg text-base sm:text-lg"
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
          {/* Reminder Alert Banner */}
          <ReminderAlertBanner groupId={selectedGroupId} />

          {/* Group Spending Summary */}
          <div className="mb-4 sm:mb-6">
            <GroupSpendingSummary groupId={selectedGroupId} />
          </div>

          {/* Unified Multimodal Chat Interface */}
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <MultimodalChatInterface 
              groupId={selectedGroupId} 
              userId={user.id}
              userName={user.name}
            />
          </div>

          {/* Floating Calendar Button */}
          <button
            onClick={() => setIsCalendarOpen(true)}
            className="fixed bottom-24 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-all hover:scale-110 flex items-center justify-center z-40"
            aria-label="Open calendar"
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>

          {/* Calendar Modal */}
          <CalendarModal
            groupId={selectedGroupId}
            isOpen={isCalendarOpen}
            onClose={() => setIsCalendarOpen(false)}
          />
        </>
      )}
    </div>
  );
}
