import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { groupApi, userApi } from '../services/api';
import { useTranslation } from '../contexts/LanguageContext';

interface GroupMembersProps {
  groupId: string;
  members: Array<{
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
      setShowAddMember(false);
      setSelectedUserId('');
      setSelectedRole('member');
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
        <button
          onClick={() => setShowAddMember(!showAddMember)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-3 sm:px-4 py-2 rounded text-xs sm:text-sm whitespace-nowrap w-full sm:w-auto"
        >
          {showAddMember ? t.members.cancel : t.members.addMember}
        </button>
      </div>

      {showAddMember && (
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
              {availableUsers.map((user) => (
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
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm sm:text-base truncate">{member.user.name}</h4>
                <p className="text-xs sm:text-sm text-gray-600 truncate">{member.user.email}</p>
              </div>
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded ml-2 whitespace-nowrap">
                {member.role}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
