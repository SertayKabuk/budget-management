import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { groupApi, expenseApi } from '../services/api';
import ExpenseList from '../components/ExpenseList';
import GroupSummary from '../components/GroupSummary';
import GroupMembers from '../components/GroupMembers';
import { useEffect } from 'react';
import { getSocket } from '../services/socket';
import { useTranslation } from '../contexts/LanguageContext';

export default function GroupPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();

  const { data: group } = useQuery({
    queryKey: ['group', id],
    queryFn: async () => {
      const response = await groupApi.getById(id!);
      return response.data;
    },
    enabled: !!id,
  });

  const { data: expenses, refetch: refetchExpenses } = useQuery({
    queryKey: ['expenses', id],
    queryFn: async () => {
      const response = await expenseApi.getAll(id);
      return response.data;
    },
    enabled: !!id,
  });

  const { data: summary, refetch: refetchSummary } = useQuery({
    queryKey: ['summary', id],
    queryFn: async () => {
      const response = await groupApi.getSummary(id!);
      return response.data;
    },
    enabled: !!id,
  });

  // Listen for real-time expense updates
  useEffect(() => {
    if (!id) return;

    const socket = getSocket();
    
    // Join the group room if already connected
    if (socket.connected) {
      socket.emit('join-group', id);
    }

    // Also join on reconnect
    const handleConnect = () => {
      socket.emit('join-group', id);
    };

    socket.on('connect', handleConnect);
    
    socket.on('expense-added', () => {
      refetchExpenses();
      refetchSummary();
    });

    return () => {
      socket.off('connect', handleConnect);
      socket.off('expense-added');
    };
  }, [id, refetchExpenses, refetchSummary]);

  if (!group) {
    return <div>{t.group.loading}</div>;
  }

  return (
    <div className="px-3 sm:px-4 py-4 sm:py-6">
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 break-words">{group.name}</h1>
          {group.description && (
            <p className="text-gray-600 mt-2 text-sm sm:text-base">{group.description}</p>
          )}
        </div>
        <Link
          to="/"
          className="bg-gray-500 hover:bg-gray-600 text-white px-3 sm:px-4 py-2 rounded text-sm sm:text-base whitespace-nowrap w-full sm:w-auto text-center"
        >
          {t.group.backToHome}
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
        <div className="lg:col-span-2">
          <GroupSummary summary={summary} />
        </div>

        <div>
          <GroupMembers groupId={id!} members={group.members || []} />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 sm:p-6 border-b">
          <h2 className="text-lg sm:text-xl font-semibold">{t.group.expenseHistory}</h2>
        </div>
        <ExpenseList expenses={expenses || []} groupId={id!} />
      </div>
    </div>
  );
}
