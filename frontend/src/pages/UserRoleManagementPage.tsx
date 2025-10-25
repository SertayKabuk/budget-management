import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { userApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../contexts/LanguageContext';

export default function UserRoleManagementPage() {
  const { user: currentUser } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
    onError: (error: any) => {
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">{t.userRoles.loadingUsers}</div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <div className="mb-6">
        <Link to="/admin" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
          {t.userRoles.backToAdmin}
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">{t.userRoles.title}</h1>
        <p className="text-gray-600 mt-2">{t.userRoles.subtitle}</p>
      </div>

      {message && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-100 text-green-800 border border-green-200'
              : 'bg-red-100 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t.userRoles.table.user}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t.userRoles.table.email}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t.userRoles.table.currentRole}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t.userRoles.table.actions}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users?.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                        <span className="text-indigo-600 font-semibold text-sm">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{user.name}</div>
                      {user.id === currentUser?.id && (
                        <div className="text-xs text-gray-500">{t.userRoles.table.you}</div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{user.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.role === 'admin'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {user.role === 'admin' ? t.userRoles.roles.admin : t.userRoles.roles.user}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {user.id === currentUser?.id ? (
                    <span className="text-gray-400">{t.userRoles.table.cannotModify}</span>
                  ) : (
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
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">{t.userRoles.about.title}</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li><strong>{t.userRoles.roles.user.charAt(0).toUpperCase() + t.userRoles.roles.user.slice(1)}:</strong> {t.userRoles.about.userDescription}</li>
          <li><strong>{t.userRoles.roles.admin.charAt(0).toUpperCase() + t.userRoles.roles.admin.slice(1)}:</strong> {t.userRoles.about.adminDescription}</li>
        </ul>
      </div>
    </div>
  );
}
