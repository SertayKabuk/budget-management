import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createColumnHelper } from '@tanstack/react-table';
import { groupApi, userApi } from '../services/api';
import { useTranslation } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import DataTable from '../components/DataTable';
import UserProfileModal from '../components/UserProfileModal';
import type { Group, User } from '../types';

type GroupWithDetails = Group & { 
  members?: Array<{ userId: string; role: string }>;
  _count?: { expenses?: number };
};

type UserWithDetails = User & {
  _count?: { expenses?: number };
};

export default function AdminPage() {
  const { t } = useTranslation();
  const { user, isAdmin: isGlobalAdmin } = useAuth();
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const { data: allGroups, refetch: refetchGroups } = useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const response = await groupApi.getAll();
      return response.data;
    },
  });

  // Filter groups based on admin level
  const groups = useMemo(() => 
    allGroups?.filter((group: GroupWithDetails) => {
      if (isGlobalAdmin) return true; // Global admins see all groups
      
      // Group admins only see groups where they are admin
      return group.members?.some(m => m.userId === user?.id && m.role === 'admin');
    }) || []
  , [allGroups, isGlobalAdmin, user?.id]);

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

  // Define columns for Groups table
  const groupColumnHelper = createColumnHelper<GroupWithDetails>();
  const groupColumns = useMemo(() => [
    groupColumnHelper.accessor('name', {
      header: t.admin.groups.title,
      cell: (info) => (
        <div>
          <h3 className="font-medium text-gray-900">{info.getValue()}</h3>
          {info.row.original.description && (
            <p className="text-xs text-gray-600 mt-1">{info.row.original.description}</p>
          )}
        </div>
      ),
    }),
    groupColumnHelper.accessor('members', {
      header: t.admin.groups.members,
      cell: (info) => (
        <span className="text-gray-700">
          {info.getValue()?.length || 0} {t.admin.groups.members}
        </span>
      ),
      enableSorting: true,
      sortingFn: (rowA, rowB) => {
        const a = rowA.original.members?.length || 0;
        const b = rowB.original.members?.length || 0;
        return a - b;
      },
    }),
    groupColumnHelper.accessor('_count.expenses', {
      header: t.admin.groups.expenses,
      cell: (info) => (
        <span className="text-gray-700">
          {info.getValue() || 0} {t.admin.groups.expenses}
        </span>
      ),
    }),
    groupColumnHelper.display({
      id: 'actions',
      header: t.admin.groups.details,
      cell: (info) => (
        <Link
          to={`/group/${info.row.original.id}`}
          className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-3 py-1 rounded inline-block"
        >
          {t.admin.groups.details}
        </Link>
      ),
    }),
  ], [groupColumnHelper, t]);

  // Define columns for Users table
  const userColumnHelper = createColumnHelper<UserWithDetails>();
  const userColumns = useMemo(() => [
    userColumnHelper.accessor('name', {
      header: t.admin.users.title,
      cell: (info) => (
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10">
            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
              <span className="text-indigo-600 font-semibold text-sm">
                {info.getValue().charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
          <div className="ml-4">
            <button
              onClick={() => setSelectedUserId(info.row.original.id)}
              className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline text-left"
            >
              {info.getValue()}
            </button>
            <div className="text-xs text-gray-600">{info.row.original.email}</div>
          </div>
        </div>
      ),
    }),
    userColumnHelper.accessor('_count.expenses', {
      header: t.admin.users.expenses,
      cell: (info) => (
        <span className="text-gray-700">
          {info.getValue() || 0} {t.admin.users.expenses}
        </span>
      ),
    }),
    userColumnHelper.accessor('role', {
      header: 'Rol',
      cell: (info) => (
        <span
          className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${
            info.getValue() === 'admin'
              ? 'bg-purple-100 text-purple-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {info.getValue() || 'user'}
        </span>
      ),
    }),
  ], [userColumnHelper, t]);

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
        <div>
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

          <DataTable
            data={groups}
            columns={groupColumns}
            searchPlaceholder="Grup ara..."
            emptyMessage={t.admin.groups.noGroups}
            pageSize={8}
          />
        </div>

        {/* Users Section - Only for Global Admins */}
        {isGlobalAdmin && (
          <div>
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

            <DataTable
              data={users || []}
              columns={userColumns}
              searchPlaceholder="Kullanıcı ara..."
              emptyMessage={t.admin.users.noUsers}
              pageSize={8}
            />
          </div>
        )}
      </div>

      {/* User Profile Modal */}
      {selectedUserId && (
        <UserProfileModal
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      )}
    </div>
  );
}
