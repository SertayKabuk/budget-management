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
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

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

  const handleCreateGroup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsCreating(true);
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;

    try {
      const response = await groupApi.create({ name, description });
      setShowCreateGroup(false);
      setSelectedGroupId(response.data.id);
      localStorage.setItem('selectedGroupId', response.data.id);
      window.dispatchEvent(new Event('groupSelectionChanged'));
      e.currentTarget.reset();
      // Refetch groups to update the list
      window.location.reload(); // Simple way to refresh groups query
    } catch (error) {
      console.error('Error creating group:', error);
      alert('Failed to create group. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

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
          <div className="text-center py-8">
            {!showCreateGroup ? (
              <>
                <div className="text-gray-500 mb-4">
                  <p className="mb-2 text-base sm:text-lg font-medium">{t.home.noGroups}</p>
                  <p className="text-sm">{t.home.noGroupsContact}</p>
                </div>
                <button
                  onClick={() => setShowCreateGroup(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  {t.home.createFirstGroup}
                </button>
              </>
            ) : (
              <form onSubmit={handleCreateGroup} className="max-w-md mx-auto text-left">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">{t.home.createNewGroupTitle}</h3>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t.home.groupNameRequired}
                  </label>
                  <input
                    name="name"
                    type="text"
                    placeholder={t.home.groupNamePlaceholder}
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t.home.descriptionLabel}
                  </label>
                  <textarea
                    name="description"
                    placeholder={t.home.descriptionPlaceholder}
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    {isCreating ? t.home.creatingButton : t.home.createButton}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateGroup(false)}
                    disabled={isCreating}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {t.home.cancelButton}
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          <>
            <select
              value={selectedGroupId}
              onChange={(e) => handleGroupChange(e.target.value)}
              className="w-full p-3 border rounded-lg text-base sm:text-lg mb-3"
            >
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowCreateGroup(true)}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              {t.home.createAnotherGroup}
            </button>
            {showCreateGroup && (
              <form onSubmit={handleCreateGroup} className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-base font-semibold mb-3 text-gray-900">{t.home.createNewGroupTitle}</h3>
                <div className="mb-3">
                  <input
                    name="name"
                    type="text"
                    placeholder={t.home.groupNamePlaceholder}
                    required
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div className="mb-3">
                  <textarea
                    name="description"
                    placeholder={t.home.descriptionPlaceholder}
                    rows={2}
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-medium"
                  >
                    {isCreating ? t.home.creatingButton : t.home.createButton}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateGroup(false)}
                    disabled={isCreating}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                  >
                    {t.home.cancelButton}
                  </button>
                </div>
              </form>
            )}
          </>
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
