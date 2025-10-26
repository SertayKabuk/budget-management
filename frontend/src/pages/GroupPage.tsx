import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  const queryClient = useQueryClient();
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('currentMonth');
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedDescription, setEditedDescription] = useState('');

  const { data: group } = useQuery({
    queryKey: ['group', id],
    queryFn: async () => {
      const response = await groupApi.getById(id!);
      return response.data;
    },
    enabled: !!id,
  });

  // Initialize edit form when group data loads
  useEffect(() => {
    if (group && !isEditing) {
      setEditedName(group.name);
      setEditedDescription(group.description || '');
    }
  }, [group, isEditing]);

  const updateGroupMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const response = await groupApi.update(id!, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', id] });
      setIsEditing(false);
    },
  });

  const handleSave = () => {
    if (!editedName.trim()) {
      alert(t.group.edit.nameRequired);
      return;
    }
    updateGroupMutation.mutate({
      name: editedName,
      description: editedDescription || undefined,
    });
  };

  const handleCancel = () => {
    setEditedName(group?.name || '');
    setEditedDescription(group?.description || '');
    setIsEditing(false);
  };

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
      {/* Group Header Section */}
      <div className="mb-4 sm:mb-6 bg-white rounded-lg shadow-md p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div className="flex-1 min-w-0 w-full">
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t.group.edit.nameLabel}
                  </label>
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="w-full px-4 py-2.5 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder={t.group.edit.namePlaceholder}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t.group.edit.descriptionLabel}
                  </label>
                  <textarea
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all"
                    rows={3}
                    placeholder={t.group.edit.descriptionPlaceholder}
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleSave}
                    disabled={updateGroupMutation.isPending}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                  >
                    {updateGroupMutation.isPending ? t.group.edit.saving : t.group.edit.save}
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={updateGroupMutation.isPending}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                  >
                    {t.group.edit.cancel}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-start gap-3 mb-3">
                  <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 break-words flex-1 leading-tight">
                    {group.name}
                  </h1>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-2 rounded-lg transition-all"
                    title={t.group.edit.editButton}
                    aria-label={t.group.edit.editButton}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                  </button>
                </div>
                {group.description && (
                  <p className="text-gray-600 text-base sm:text-lg leading-relaxed bg-gray-50 p-3 rounded-lg border-l-4 border-blue-400">
                    {group.description}
                  </p>
                )}
              </div>
            )}
          </div>
          <Link
            to="/"
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 sm:px-5 py-2.5 rounded-lg text-sm sm:text-base font-medium whitespace-nowrap w-full sm:w-auto text-center transition-colors shadow-sm"
          >
            {t.group.backToHome}
          </Link>
        </div>
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
