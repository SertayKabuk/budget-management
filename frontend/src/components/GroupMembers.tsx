import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { groupApi, userApi } from '../services/api';
import { useTranslation } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useGroupRole } from '../hooks/useGroupRole';

interface GroupMembersProps {
  groupId: string;
  members: Array<{
    id: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
    role: string;
  }>;
}

export default function GroupMembers({ groupId, members }: GroupMembersProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isGroupAdmin } = useGroupRole(groupId);
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState('member');
  const queryClient = useQueryClient();

  const { data: allUsers } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await userApi.getAll();
      return response.data;
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUserId) throw new Error('No user selected');
      return groupApi.addMember(groupId, selectedUserId, selectedRole);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group-members', groupId] });
      setShowAddMember(false);
      setSelectedUserId('');
      setSelectedRole('member');
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (memberId: string) => groupApi.removeMember(groupId, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group-members', groupId] });
    },
    onError: (error: any) => {
      // Extract detailed error message if available
      const errorMessage = error.response?.data?.error || error.message;
      console.error('Error removing member:', errorMessage, error.response?.data?.details);
    }
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: string }) =>
      groupApi.updateMemberRole(groupId, memberId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group-members', groupId] });
    },
  });

  // Filter out users who are already members
  const memberUserIds = new Set(members.map(m => m.user.id));
  const availableUsers = allUsers?.filter(user => !memberUserIds.has(user.id)) || [];

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    addMemberMutation.mutate();
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
        <h3 className="text-base sm:text-lg font-semibold">{t.members.title}</h3>
        {isGroupAdmin && (
          <button
            onClick={() => setShowAddMember(!showAddMember)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-3 sm:px-4 py-2 rounded text-xs sm:text-sm whitespace-nowrap w-full sm:w-auto"
          >
            {showAddMember ? t.members.cancel : t.members.addMember}
          </button>
        )}
      </div>

      {showAddMember && isGroupAdmin && (
        <form onSubmit={handleAddMember} className="mb-4 p-3 sm:p-4 bg-gray-50 rounded">
          <div className="mb-3">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              {t.members.selectUser}
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full p-2 border rounded text-sm"
              required
            >
              <option value="">{t.members.chooseUser}</option>
              {availableUsers.map((user: any) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.email})
                </option>
              ))}
            </select>
          </div>

          <div className="mb-3">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              {t.members.role}
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full p-2 border rounded text-sm"
            >
              <option value="member">{t.members.roleMember}</option>
              <option value="admin">{t.members.roleAdmin}</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={!selectedUserId || addMemberMutation.isPending}
            className="bg-green-500 hover:bg-green-600 text-white px-3 sm:px-4 py-2 rounded disabled:bg-gray-400 text-sm"
          >
            {addMemberMutation.isPending ? t.members.adding : t.members.add}
          </button>

          {addMemberMutation.isError && (
            <p className="text-red-500 text-xs sm:text-sm mt-2">
              {t.members.error}: {(addMemberMutation.error as Error).message}
            </p>
          )}
        </form>
      )}

      {members.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="mb-2 text-sm sm:text-base">{t.members.noMembers}</p>
          <p className="text-xs sm:text-sm">{t.members.noMembersHelp}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {members.map((member) => (
            <div
              key={member.user.id}
              className="flex items-center justify-between p-3 border rounded hover:bg-gray-50"
            >
              <div className="flex-1 min-w-0 mr-2">
                <h4 className="font-medium text-sm sm:text-base truncate">{member.user.name}</h4>
                <p className="text-xs sm:text-sm text-gray-600 truncate">{member.user.email}</p>
              </div>
              
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Role Badge/Dropdown */}
                {isGroupAdmin ? (
                  <select
                    value={member.role}
                    onChange={(e) => updateRoleMutation.mutate({
                      memberId: member.id,
                      role: e.target.value
                    })}
                    className="text-xs px-2 py-1 border rounded"
                    disabled={updateRoleMutation.isPending}
                  >
                    <option value="member">{t.members.roleMember}</option>
                    <option value="admin">{t.members.roleAdmin}</option>
                  </select>
                ) : (
                  <span className={`text-xs px-2 py-1 rounded whitespace-nowrap ${
                    member.role === 'admin' 
                      ? 'bg-purple-100 text-purple-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {member.role === 'admin' ? t.members.roleAdmin : t.members.roleMember}
                  </span>
                )}

                {/* Remove Button (only for group admins) */}
                {isGroupAdmin && member.user.id !== user?.id && (
                  <button
                    onClick={() => {
                      if (confirm(t.members.confirmRemove.replace('{name}', member.user.name))) {
                        removeMemberMutation.mutate(member.id);
                      }
                    }}
                    disabled={removeMemberMutation.isPending}
                    className="text-red-600 hover:text-red-800 text-xs sm:text-sm px-2 py-1 rounded hover:bg-red-50 disabled:opacity-50"
                  >
                    {t.members.remove}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {removeMemberMutation.isError && (
        <div className="text-red-500 text-xs sm:text-sm mt-2 p-3 bg-red-50 rounded">
          <p className="font-semibold">{t.members.errorRemovingMember}:</p>
          <p className="mt-1">
            {(removeMemberMutation.error as any)?.response?.data?.error || 
             (removeMemberMutation.error as Error).message}
          </p>
        </div>
      )}

      {updateRoleMutation.isError && (
        <p className="text-red-500 text-xs sm:text-sm mt-2">
          {t.members.errorUpdatingRole}: {(updateRoleMutation.error as Error).message}
        </p>
      )}
    </div>
  );
}
