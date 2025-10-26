import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { groupApi, expenseApi } from '../services/api';
import ExpenseList from '../components/ExpenseList';
import GroupSummary from '../components/GroupSummary';
import GroupMembers from '../components/GroupMembers';
import { useEffect, useState, useMemo } from 'react';
import { getSocket } from '../services/socket';
import { useTranslation } from '../contexts/LanguageContext';

type TimePeriod = 'currentMonth' | 'last2Months' | 'last3Months' | 'allTime';

export default function GroupPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('currentMonth');

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

  // Filter expenses based on selected time period
  const filteredExpenses = useMemo(() => {
    if (!expenses) return [];
    
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    let startDate: Date;

    switch (timePeriod) {
      case 'currentMonth':
        startDate = new Date(year, month, 1);
        break;
      case 'last2Months':
        startDate = new Date(year, month - 1, 1);
        break;
      case 'last3Months':
        startDate = new Date(year, month - 2, 1);
        break;
      case 'allTime':
        return expenses;
      default:
        startDate = new Date(year, month, 1);
    }

    return expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate >= startDate;
    });
  }, [expenses, timePeriod]);

  // Calculate summary from filtered expenses
  const filteredSummary = useMemo(() => {
    if (!filteredExpenses) return null;

    const totalSpending = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    
    const spendingByUser = filteredExpenses.reduce((acc: Record<string, any>, exp: any) => {
      if (!acc[exp.user.id]) {
        acc[exp.user.id] = {
          user: exp.user,
          total: 0,
          count: 0
        };
      }
      acc[exp.user.id].total += exp.amount;
      acc[exp.user.id].count += 1;
      return acc;
    }, {} as Record<string, any>);

    return {
      totalSpending,
      expenseCount: filteredExpenses.length,
      spendingByUser: Object.values(spendingByUser)
    };
  }, [filteredExpenses]);

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
    });

    return () => {
      socket.off('connect', handleConnect);
      socket.off('expense-added');
    };
  }, [id, refetchExpenses]);

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

      {/* Time Period Filter Buttons */}
      <div className="mb-4 sm:mb-6 bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">{t.spending.title}</h3>
        <div className="flex flex-wrap gap-2">
          {(['currentMonth', 'last2Months', 'last3Months', 'allTime'] as TimePeriod[]).map((period) => (
            <button
              key={period}
              onClick={() => setTimePeriod(period)}
              className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all ${
                timePeriod === period
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t.spending.timePeriods[period]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
        <div className="lg:col-span-2">
          <GroupSummary summary={filteredSummary} />
        </div>

        <div>
          <GroupMembers groupId={id!} members={group.members || []} />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 sm:p-6 border-b">
          <h2 className="text-lg sm:text-xl font-semibold">{t.group.expenseHistory}</h2>
        </div>
        <ExpenseList expenses={filteredExpenses || []} groupId={id!} />
      </div>
    </div>
  );
}
