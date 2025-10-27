import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { groupApi } from '../services/api';

interface GroupMember {
  id: string;
  userId: string;
  role: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export function useGroupRole(groupId: string | undefined) {
  const { user, isAdmin: isGlobalAdmin } = useAuth();

  const { data: members, isLoading } = useQuery({
    queryKey: ['group-members', groupId],
    queryFn: async () => {
      if (!groupId) return null;
      const response = await groupApi.getMembers(groupId);
      return response.data as GroupMember[];
    },
    enabled: !!groupId && !!user,
  });

  const currentUserMember = members?.find(m => m.userId === user?.id);
  const isGroupAdmin = isGlobalAdmin || currentUserMember?.role === 'admin';
  const role = currentUserMember?.role as 'admin' | 'member' | null;

  return {
    isGroupAdmin,
    isLoading,
    role,
    isGlobalAdmin,
  };
}
