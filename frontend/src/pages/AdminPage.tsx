import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { groupApi, userApi } from '../services/api';
import { useTranslation } from '../contexts/LanguageContext';

export default function AdminPage() {
  const { t } = useTranslation();
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

  const handleCreateGroup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;

    try {
      await groupApi.create({ name, description });
      setShowNewGroup(false);
      refetchGroups();
      e.currentTarget.reset();
    } catch (error) {
      console.error('Error creating group:', error);
    }
  };

  return (
    <div className="px-4 py-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">{t.admin.title}</h1>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600 text-sm">{t.admin.stats.totalGroups}</p>
          <p className="text-3xl font-bold text-blue-600">{groups?.length || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600 text-sm">{t.admin.stats.totalUsers}</p>
          <p className="text-3xl font-bold text-green-600">{users?.length || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600 text-sm">{t.admin.stats.activeMembers}</p>
          <p className="text-3xl font-bold text-purple-600">
            {groups?.reduce((acc, g: any) => acc + (g.members?.length || 0), 0) || 0}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600 text-sm">{t.admin.stats.totalExpenses}</p>
          <p className="text-3xl font-bold text-orange-600">
            {groups?.reduce((acc, g: any) => acc + (g._count?.expenses || 0), 0) || 0}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Groups Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">{t.admin.groups.title}</h2>
            <button
              onClick={() => setShowNewGroup(!showNewGroup)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            >
              {showNewGroup ? t.admin.groups.cancel : t.admin.groups.newGroup}
            </button>
          </div>

          {showNewGroup && (
            <form onSubmit={handleCreateGroup} className="mb-4 p-4 bg-gray-50 rounded">
              <input
                name="name"
                type="text"
                placeholder={t.admin.groups.namePlaceholder}
                required
                className="w-full p-2 border rounded mb-2"
              />
              <input
                name="description"
                type="text"
                placeholder={t.admin.groups.descriptionPlaceholder}
                className="w-full p-2 border rounded mb-2"
              />
              <div className="flex gap-2">
                <button type="submit" className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded">
                  {t.admin.groups.create}
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewGroup(false)}
                  className="bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded"
                >
                  {t.admin.groups.cancel}
                </button>
              </div>
            </form>
          )}

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {groups?.map((group: any) => (
              <div key={group.id} className="relative p-4 border rounded hover:bg-gray-50">
                <h3 className="font-medium">{group.name}</h3>
                {group.description && (
                  <p className="text-sm text-gray-600">{group.description}</p>
                )}
                <div className="flex gap-2 mt-2 text-xs text-gray-500">
                  <span>{group.members?.length || 0} {t.admin.groups.members}</span>
                  <span>•</span>
                  <span>{group._count?.expenses || 0} {t.admin.groups.expenses}</span>
                </div>
                <Link
                  to={`/group/${group.id}`}
                  className="absolute top-2 right-2 bg-blue-500 hover:bg-blue-600 text-white text-xs px-3 py-1 rounded"
                  title="View details"
                >
                  {t.admin.groups.details}
                </Link>
              </div>
            ))}
            {(!groups || groups.length === 0) && (
              <p className="text-center text-gray-500 py-8">{t.admin.groups.noGroups}</p>
            )}
          </div>
        </div>

        {/* Users Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">{t.admin.users.title}</h2>
            <div className="flex gap-2 items-center">
              <Link
                to="/admin/users"
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm"
              >
                {t.admin.users.manageRoles}
              </Link>
              <span className="text-sm text-gray-500 italic">
                {t.admin.users.googleOAuthOnly}
              </span>
            </div>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {users?.map((user: any) => (
              <div key={user.id} className="p-4 border rounded hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{user.name}</h3>
                    <p className="text-sm text-gray-600">{user.email}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {user._count?.expenses || 0} {t.admin.users.expenses}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      user.role === 'admin'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {user.role || 'user'}
                  </span>
                </div>
              </div>
            ))}
            {(!users || users.length === 0) && (
              <p className="text-center text-gray-500 py-8">{t.admin.users.noUsers}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
