import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createColumnHelper } from '@tanstack/react-table';
import { userApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../contexts/LanguageContext';
import DataTable from '../components/DataTable';
import UserProfileModal from '../components/UserProfileModal';
import type { User } from '../types';

type UserWithDetails = User & {
  _count?: { expenses?: number };
};

export default function UserRoleManagementPage() {
  const { user: currentUser } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await userApi.getAll();
      return response.data;
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) => 
      userApi.updateRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setMessage({ type: 'success', text: t.userRoles.successMessage });
      setTimeout(() => setMessage(null), 3000);
    },
    onError: (error: Error & { response?: { data?: { error?: string } } }) => {
      const errorMsg = error.response?.data?.error || t.userRoles.errorMessage;
      setMessage({ type: 'error', text: errorMsg });
      setTimeout(() => setMessage(null), 5000);
    },
  });

  const handleRoleChange = async (userId: string, newRole: string) => {
    const roleText = newRole === 'admin' ? t.userRoles.roles.admin : t.userRoles.roles.user;
    const confirmMsg = t.userRoles.confirmChange.replace('{role}', roleText);
    if (window.confirm(confirmMsg)) {
      updateRoleMutation.mutate({ userId, role: newRole });
    }
  };

  // Define columns for Users table
  const columnHelper = createColumnHelper<UserWithDetails>();
  const columns = useMemo(() => [
    columnHelper.accessor('name', {
      header: t.userRoles.table.user,
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
            {info.row.original.id === currentUser?.id && (
              <div className="text-xs text-gray-500">{t.userRoles.table.you}</div>
            )}
          </div>
        </div>
      ),
    }),
    columnHelper.accessor('email', {
      header: t.userRoles.table.email,
      cell: (info) => (
        <div className="text-sm text-gray-900">{info.getValue()}</div>
      ),
    }),
    columnHelper.accessor('role', {
      header: t.userRoles.table.currentRole,
      cell: (info) => (
        <span
          className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
            info.getValue() === 'admin'
              ? 'bg-purple-100 text-purple-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {info.getValue() === 'admin' ? t.userRoles.roles.admin : t.userRoles.roles.user}
        </span>
      ),
    }),
    columnHelper.display({
      id: 'actions',
      header: t.userRoles.table.actions,
      cell: (info) => {
        const user = info.row.original;
        if (user.id === currentUser?.id) {
          return (
            <span className="text-gray-400 text-sm">{t.userRoles.table.cannotModify}</span>
          );
        }
        return (
          <div className="flex gap-2">
            {user.role !== 'admin' && (
              <button
                onClick={() => handleRoleChange(user.id, 'admin')}
                disabled={updateRoleMutation.isPending}
                className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t.userRoles.table.makeAdmin}
              </button>
            )}
            {user.role === 'admin' && (
              <button
                onClick={() => handleRoleChange(user.id, 'user')}
                disabled={updateRoleMutation.isPending}
                className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t.userRoles.table.removeAdmin}
              </button>
            )}
          </div>
        );
      },
    }),
  ], [columnHelper, t, currentUser, updateRoleMutation.isPending]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">{t.userRoles.loadingUsers}</div>
      </div>
    );
  }

  return (
    <div className="px-3 sm:px-4 py-4 sm:py-6">
      <div className="mb-4 sm:mb-6">
        <Link to="/admin" className="text-blue-600 hover:text-blue-800 mb-2 sm:mb-4 inline-block text-sm sm:text-base">
          {t.userRoles.backToAdmin}
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t.userRoles.title}</h1>
        <p className="text-gray-600 mt-2 text-sm sm:text-base">{t.userRoles.subtitle}</p>
      </div>

      {message && (
        <div
          className={`mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg text-sm sm:text-base ${
            message.type === 'success'
              ? 'bg-green-100 text-green-800 border border-green-200'
              : 'bg-red-100 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <DataTable
        data={users || []}
        columns={columns}
        searchPlaceholder="Kullanıcı ara (ad, email)..."
        emptyMessage="Kullanıcı bulunamadı"
        pageSize={10}
      />

      <div className="mt-4 sm:mt-6 bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
        <h3 className="font-semibold text-blue-900 mb-2 text-sm sm:text-base">{t.userRoles.about.title}</h3>
        <ul className="text-xs sm:text-sm text-blue-800 space-y-1">
          <li><strong>{t.userRoles.roles.user.charAt(0).toUpperCase() + t.userRoles.roles.user.slice(1)}:</strong> {t.userRoles.about.userDescription}</li>
          <li><strong>{t.userRoles.roles.admin.charAt(0).toUpperCase() + t.userRoles.roles.admin.slice(1)}:</strong> {t.userRoles.about.adminDescription}</li>
        </ul>
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
