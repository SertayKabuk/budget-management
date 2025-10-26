import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { groupApi, userApi } from '../services/api';
import MultimodalChatInterface from '../components/MultimodalChatInterface';

export default function Dashboard() {
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [showNewGroup, setShowNewGroup] = useState(false);

  const { data: groups, refetch: refetchGroups } = useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const response = await groupApi.getAll();
      return response.data;
    },
  });

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await userApi.getAll();
      return response.data;
    },
  });

  useEffect(() => {
    if (groups && groups.length > 0 && !selectedGroupId) {
      setSelectedGroupId(groups[0].id);
    }
    if (users && users.length > 0 && !selectedUserId) {
      setSelectedUserId(users[0].id);
    }
  }, [groups, users, selectedGroupId, selectedUserId]);

  const handleCreateGroup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;

    try {
      await groupApi.create({ name, description });
      setShowNewGroup(false);
      refetchGroups();
    } catch (error) {
      console.error('Error creating group:', error);
    }
  };

  return (
    <div className="px-4 py-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Groups Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Your Groups</h2>
            <button
              onClick={() => setShowNewGroup(true)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            >
              + New
            </button>
          </div>

          {showNewGroup && (
            <form onSubmit={handleCreateGroup} className="mb-4 p-4 bg-gray-50 rounded">
              <input
                name="name"
                type="text"
                placeholder="Group name"
                required
                className="w-full p-2 border rounded mb-2"
              />
              <input
                name="description"
                type="text"
                placeholder="Description (optional)"
                className="w-full p-2 border rounded mb-2"
              />
              <div className="flex gap-2">
                <button type="submit" className="bg-green-500 text-white px-4 py-2 rounded">
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewGroup(false)}
                  className="bg-gray-300 px-4 py-2 rounded"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="space-y-2">
            {groups?.map((group) => (
              <div key={group.id} className="relative">
                <div
                  className={`p-3 rounded border cursor-pointer ${
                    group.id === selectedGroupId 
                      ? 'bg-blue-100 border-blue-500' 
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedGroupId(group.id)}
                >
                  <h3 className="font-medium">{group.name}</h3>
                  {group.description && (
                    <p className="text-sm text-gray-600">{group.description}</p>
                  )}
                </div>
                <Link
                  to={`/group/${group.id}`}
                  className="absolute top-2 right-2 bg-gray-500 hover:bg-gray-600 text-white text-xs px-2 py-1 rounded"
                  title="View details"
                >
                  Details →
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Users Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Users</h2>
            <div className="text-sm text-gray-500">
              Users are created automatically via Google OAuth
            </div>
          </div>

          <div className="space-y-2">{users?.map((user) => (
              <div
                key={user.id}
                className={`p-3 border rounded cursor-pointer ${
                  user.id === selectedUserId
                    ? 'bg-blue-100 border-blue-500'
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => setSelectedUserId(user.id)}
              >
                <h3 className="font-medium">{user.name}</h3>
                <p className="text-sm text-gray-600">{user.email}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Quick Stats</h2>
          <div className="space-y-4">
            <div>
              <p className="text-gray-600">Total Groups</p>
              <p className="text-2xl font-bold">{groups?.length || 0}</p>
            </div>
            <div>
              <p className="text-gray-600">Total Users</p>
              <p className="text-2xl font-bold">{users?.length || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Interface */}
      {selectedGroupId && selectedUserId && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">💬 AI Assistant</h2>
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">Group:</span>{' '}
              {groups?.find(g => g.id === selectedGroupId)?.name}
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-semibold">User:</span>{' '}
              {users?.find(u => u.id === selectedUserId)?.name}
            </p>
          </div>
          <MultimodalChatInterface 
            groupId={selectedGroupId} 
            userId={selectedUserId}
            userName={users?.find(u => u.id === selectedUserId)?.name || 'User'}
          />
        </div>
      )}
    </div>
  );
}
