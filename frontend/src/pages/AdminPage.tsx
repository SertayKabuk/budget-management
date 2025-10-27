import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { groupApi, userApi } from '../services/api';
import { useTranslation } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import type { Group, User } from '../types';

export default function AdminPage() {
  const { t } = useTranslation();
  const { user, isAdmin: isGlobalAdmin } = useAuth();
  const [showNewGroup, setShowNewGroup] = useState(false);

  const { data: allGroups, refetch: refetchGroups } = useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const response = await groupApi.getAll();
      return response.data;
    },
  });

  // Filter groups based on admin level
  const groups = allGroups?.filter((group: Group & { members?: Array<{ userId: string; role: string }> }) => {
    if (isGlobalAdmin) return true; // Global admins see all groups
    
    // Group admins only see groups where they are admin
    return group.members?.some(m => m.userId === user?.id && m.role === 'admin');
  });

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await userApi.getAll();
      return response.data;
    },
    enabled: isGlobalAdmin, // Only global admins can see all users
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
    <div className="px-3 sm:px-4 py-4 sm:py-6">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t.admin.title}</h1>
        {!isGlobalAdmin && (
          <p className="text-sm text-gray-600 mt-2">
            You are viewing groups where you are an admin. Only global admins can manage all groups and users.
          </p>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
        <div className="bg-white rounded-lg shadow p-3 sm:p-6">
          <p className="text-gray-600 text-xs sm:text-sm">{t.admin.stats.totalGroups}</p>
          <p className="text-2xl sm:text-3xl font-bold text-blue-600">{groups?.length || 0}</p>
        </div>
        {isGlobalAdmin && (
          <div className="bg-white rounded-lg shadow p-3 sm:p-6">
            <p className="text-gray-600 text-xs sm:text-sm">{t.admin.stats.totalUsers}</p>
            <p className="text-2xl sm:text-3xl font-bold text-green-600">{users?.length || 0}</p>
          </div>
        )}
        <div className="bg-white rounded-lg shadow p-3 sm:p-6">
          <p className="text-gray-600 text-xs sm:text-sm">{t.admin.stats.activeMembers}</p>
          <p className="text-2xl sm:text-3xl font-bold text-purple-600">
            {groups?.reduce((acc, g: Group & { members?: unknown[] }) => acc + (g.members?.length || 0), 0) || 0}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-3 sm:p-6">
          <p className="text-gray-600 text-xs sm:text-sm">{t.admin.stats.totalExpenses}</p>
          <p className="text-2xl sm:text-3xl font-bold text-orange-600">
            {groups?.reduce((acc, g: Group & { _count?: { expenses?: number } }) => acc + (g._count?.expenses || 0), 0) || 0}
          </p>
        </div>
      </div>

      <div className={`grid grid-cols-1 ${isGlobalAdmin ? 'lg:grid-cols-2' : ''} gap-4 sm:gap-6`}>
        {/* Groups Section */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
            <h2 className="text-lg sm:text-xl font-semibold">{t.admin.groups.title}</h2>
            <button
              onClick={() => setShowNewGroup(!showNewGroup)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-3 sm:px-4 py-2 rounded text-sm sm:text-base whitespace-nowrap"
            >
              {showNewGroup ? t.admin.groups.cancel : t.admin.groups.newGroup}
            </button>
          </div>

          {showNewGroup && (
            <form onSubmit={handleCreateGroup} className="mb-4 p-3 sm:p-4 bg-gray-50 rounded">
              <input
                name="name"
                type="text"
                placeholder={t.admin.groups.namePlaceholder}
                required
                className="w-full p-2 border rounded mb-2 text-sm sm:text-base"
              />
              <input
                name="description"
                type="text"
                placeholder={t.admin.groups.descriptionPlaceholder}
                className="w-full p-2 border rounded mb-2 text-sm sm:text-base"
              />
              <div className="flex gap-2">
                <button type="submit" className="bg-green-500 hover:bg-green-600 text-white px-3 sm:px-4 py-2 rounded text-sm sm:text-base">
                  {t.admin.groups.create}
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewGroup(false)}
                  className="bg-gray-300 hover:bg-gray-400 px-3 sm:px-4 py-2 rounded text-sm sm:text-base"
                >
                  {t.admin.groups.cancel}
                </button>
              </div>
            </form>
          )}

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {groups?.map((group: Group & { members?: unknown[]; _count?: { expenses?: number } }) => (
              <div key={group.id} className="relative p-3 sm:p-4 border rounded hover:bg-gray-50">
                <h3 className="font-medium text-sm sm:text-base pr-16">{group.name}</h3>
                {group.description && (
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">{group.description}</p>
                )}
                <div className="flex gap-2 mt-2 text-xs text-gray-500">
                  <span>{group.members?.length || 0} {t.admin.groups.members}</span>
                  <span>•</span>
                  <span>{group._count?.expenses || 0} {t.admin.groups.expenses}</span>
                </div>
                <Link
                  to={`/group/${group.id}`}
                  className="absolute top-2 right-2 bg-blue-500 hover:bg-blue-600 text-white text-xs px-2 sm:px-3 py-1 rounded"
                  title={t.admin.groups.details}
                >
                  {t.admin.groups.details}
                </Link>
              </div>
            ))}
            {(!groups || groups.length === 0) && (
              <p className="text-center text-gray-500 py-8 text-sm sm:text-base">{t.admin.groups.noGroups}</p>
            )}
          </div>
        </div>

        {/* Users Section - Only for Global Admins */}
        {isGlobalAdmin && (
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
              <h2 className="text-lg sm:text-xl font-semibold">{t.admin.users.title}</h2>
              <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center w-full sm:w-auto">
                <Link
                  to="/admin/users"
                  className="bg-purple-600 hover:bg-purple-700 text-white px-3 sm:px-4 py-2 rounded text-xs sm:text-sm whitespace-nowrap text-center w-full sm:w-auto"
                >
                  {t.admin.users.manageRoles}
                </Link>
                <span className="text-xs sm:text-sm text-gray-500 italic">
                  {t.admin.users.googleOAuthOnly}
                </span>
              </div>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {users?.map((user: User & { _count?: { expenses?: number } }) => (
                <div key={user.id} className="p-3 sm:p-4 border rounded hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm sm:text-base truncate">{user.name}</h3>
                      <p className="text-xs sm:text-sm text-gray-600 truncate">{user.email}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {user._count?.expenses || 0} {t.admin.users.expenses}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${
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
                <p className="text-center text-gray-500 py-8 text-sm sm:text-base">{t.admin.users.noUsers}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
