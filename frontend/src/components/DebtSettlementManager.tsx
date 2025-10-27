import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { paymentApi, expenseApi, groupApi } from '../services/api';
import { getSocket } from '../services/socket';
import { useTranslation } from '../contexts/LanguageContext';
import { formatCurrency } from '../utils/currency';
import { PaymentStatusBadge } from './PaymentStatusBadge';
import type { Payment, Expense, GroupMember } from '../types';

interface DebtSettlementManagerProps {
  groupId: string;
}

interface DebtSettlement {
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  amount: number;
}

type PresetFilter = 'current-month' | 'last-month' | 'all';
type StatusFilter = 'all' | 'PENDING' | 'COMPLETED' | 'CANCELLED';

export default function DebtSettlementManager({ groupId }: DebtSettlementManagerProps) {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [showHistory, setShowHistory] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualPaymentData, setManualPaymentData] = useState({
    fromUserId: '',
    toUserId: '',
    amount: '',
    description: '',
  });
  
  // Edit payment states
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [editPaymentData, setEditPaymentData] = useState({
    fromUserId: '',
    toUserId: '',
    amount: '',
    description: '',
  });

  // Filter states
  const [presetFilter, setPresetFilter] = useState<PresetFilter>('current-month');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [fromUserFilter, setFromUserFilter] = useState<string>('');
  const [toUserFilter, setToUserFilter] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Fetch expenses to calculate settlements
  const { data: expenses } = useQuery({
    queryKey: ['expenses', groupId],
    queryFn: async () => {
      const response = await expenseApi.getAll(groupId);
      return response.data;
    },
    enabled: !!groupId,
  });

  // Fetch existing payments
  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ['payments', groupId],
    queryFn: async () => {
      const response = await paymentApi.getAll(groupId);
      return response.data;
    },
    enabled: !!groupId,
  });

  // Fetch group members for manual payment form
  const { data: group } = useQuery({
    queryKey: ['group', groupId],
    queryFn: async () => {
      const response = await groupApi.getById(groupId);
      return response.data;
    },
    enabled: !!groupId,
  });

  // Fetch all group members for fair share calculation
  const { data: groupMembers } = useQuery({
    queryKey: ['groupMembers', groupId],
    queryFn: async () => {
      const response = await groupApi.getMembers(groupId);
      return response.data;
    },
    enabled: !!groupId,
  });

  // Calculate date ranges for preset filters
  const getDateRange = (preset: PresetFilter): { start: Date; end: Date } | null => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    switch (preset) {
      case 'current-month':
        return {
          start: new Date(year, month, 1),
          end: new Date(year, month + 1, 0, 23, 59, 59)
        };
      case 'last-month':
        return {
          start: new Date(year, month - 1, 1),
          end: new Date(year, month, 0, 23, 59, 59)
        };
      case 'all':
        return null;
      default:
        return null;
    }
  };

  // Apply preset filter when changed
  const handlePresetFilterChange = (preset: PresetFilter) => {
    setPresetFilter(preset);
    const range = getDateRange(preset);
    if (range) {
      setStartDate(range.start.toISOString().split('T')[0]);
      setEndDate(range.end.toISOString().split('T')[0]);
    } else {
      setStartDate('');
      setEndDate('');
    }
  };

  // Get unique users for filters
  const uniqueUsers = useMemo(() => {
    if (!payments) return [];
    const usersMap = new Map<string, string>();
    payments.forEach(payment => {
      if (payment.fromUser) {
        usersMap.set(payment.fromUser.id, payment.fromUser.name);
      }
      if (payment.toUser) {
        usersMap.set(payment.toUser.id, payment.toUser.name);
      }
    });
    return Array.from(usersMap.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [payments]);

  // Filter payments based on all criteria
  const filteredPayments = useMemo(() => {
    if (!payments) return [];
    
    return payments.filter(payment => {
      // Status filter
      if (statusFilter !== 'all' && payment.status !== statusFilter) {
        return false;
      }

      // From user filter
      if (fromUserFilter && payment.fromUser?.id !== fromUserFilter) {
        return false;
      }

      // To user filter
      if (toUserFilter && payment.toUser?.id !== toUserFilter) {
        return false;
      }

      // Date filter
      const paymentDate = new Date(payment.createdAt);
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (paymentDate < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (paymentDate > end) return false;
      }

      return true;
    });
  }, [payments, statusFilter, fromUserFilter, toUserFilter, startDate, endDate]);

  // Clear all filters
  const clearFilters = () => {
    setPresetFilter('current-month');
    handlePresetFilterChange('current-month');
    setStatusFilter('all');
    setFromUserFilter('');
    setToUserFilter('');
  };

  // Initialize default filter on mount
  useEffect(() => {
    handlePresetFilterChange('current-month');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Calculate debt settlements from expenses
  const settlements = useMemo((): DebtSettlement[] => {
    if (!expenses || expenses.length === 0 || !groupMembers || groupMembers.length === 0) return [];

    // Get all group members and their spending
    const usersMap = new Map<string, { name: string; spent: number }>();
    
    // Initialize all group members with 0 spending
    groupMembers.forEach((member) => {
      if (member.user) {
        usersMap.set(member.user.id, { name: member.user.name, spent: 0 });
      }
    });

    // Add actual expenses to the map
    expenses.forEach((expense: Expense) => {
      const userId = expense.user.id;
      if (usersMap.has(userId)) {
        usersMap.get(userId)!.spent += expense.amount;
      }
    });

    const users = Array.from(usersMap.entries()).map(([id, data]) => ({
      userId: id,
      userName: data.name,
      spent: data.spent
    }));

    if (users.length === 0) return [];

    // Calculate fair share based on ALL group members
    const totalSpent = users.reduce((sum, u) => sum + u.spent, 0);
    const fairShare = totalSpent / users.length;

    // Calculate balances (positive = should receive, negative = should pay)
    const balances = users.map(u => ({
      userId: u.userId,
      userName: u.userName,
      balance: u.spent - fairShare
    }));

    // Adjust balances based on completed payments
    if (payments && payments.length > 0) {
      payments.forEach((payment: Payment) => {
        if (payment.status === 'COMPLETED') {
          // Payment sender has paid, so their debt decreases (balance increases)
          const fromUser = balances.find(b => b.userId === payment.fromUserId);
          if (fromUser) {
            fromUser.balance += payment.amount;
          }
          
          // Payment receiver has been paid, so what they're owed decreases (balance decreases)
          const toUser = balances.find(b => b.userId === payment.toUserId);
          if (toUser) {
            toUser.balance -= payment.amount;
          }
        }
      });
    }

    // Separate creditors and debtors
    const creditors = balances.filter(b => b.balance > 0.01).sort((a, b) => b.balance - a.balance);
    const debtors = balances.filter(b => b.balance < -0.01).sort((a, b) => a.balance - b.balance);

    // Calculate settlements using greedy algorithm
    const settlementsList: DebtSettlement[] = [];
    const creditorsCopy = creditors.map(c => ({ ...c }));
    const debtorsCopy = debtors.map(d => ({ ...d }));

    while (creditorsCopy.length > 0 && debtorsCopy.length > 0) {
      const creditor = creditorsCopy[0];
      const debtor = debtorsCopy[0];
      
      const amount = Math.min(creditor.balance, Math.abs(debtor.balance));
      
      if (amount > 0.01) {
        settlementsList.push({
          fromUserId: debtor.userId,
          fromUserName: debtor.userName,
          toUserId: creditor.userId,
          toUserName: creditor.userName,
          amount: amount
        });
      }

      creditor.balance -= amount;
      debtor.balance += amount;

      if (Math.abs(creditor.balance) < 0.01) {
        creditorsCopy.shift();
      }
      if (Math.abs(debtor.balance) < 0.01) {
        debtorsCopy.shift();
      }
    }

    return settlementsList;
  }, [expenses, groupMembers, payments]);

  // Create payment mutation
  const createPaymentMutation = useMutation({
    mutationFn: (data: { fromUserId: string; toUserId: string; amount: number; description: string }) =>
      paymentApi.create({ ...data, groupId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', groupId] });
    },
  });

  // Update payment status mutation
  const updatePaymentMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'COMPLETED' | 'CANCELLED' }) =>
      paymentApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', groupId] });
    },
  });

  // Edit payment mutation
  const editPaymentMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { fromUserId?: string; toUserId?: string; amount?: number; description?: string } }) =>
      paymentApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', groupId] });
      setEditingPaymentId(null);
    },
  });

  // Listen for real-time payment updates
  useEffect(() => {
    const socket = getSocket();

    const handlePaymentUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['payments', groupId] });
    };

    socket.on('payment-created', handlePaymentUpdate);
    socket.on('payment-updated', handlePaymentUpdate);

    return () => {
      socket.off('payment-created', handlePaymentUpdate);
      socket.off('payment-updated', handlePaymentUpdate);
    };
  }, [groupId, queryClient]);

  const handleCreatePayment = (settlement: DebtSettlement) => {
    if (confirm(t.payments.confirmComplete)) {
      createPaymentMutation.mutate({
        fromUserId: settlement.fromUserId,
        toUserId: settlement.toUserId,
        amount: settlement.amount,
        description: `${t.payments.settlements.paymentInstruction
          .replace('{from}', settlement.fromUserName)
          .replace('{to}', settlement.toUserName)
          .replace('{amount}', formatCurrency(settlement.amount))}`
      });
    }
  };

  const handleUpdateStatus = (payment: Payment, status: 'COMPLETED' | 'CANCELLED') => {
    const confirmMessage = status === 'COMPLETED' ? t.payments.confirmComplete : t.payments.confirmCancel;
    if (confirm(confirmMessage)) {
      updatePaymentMutation.mutate({ id: payment.id, status });
    }
  };

  const handleEditPayment = (payment: Payment) => {
    setEditingPaymentId(payment.id);
    setEditPaymentData({
      fromUserId: payment.fromUserId,
      toUserId: payment.toUserId,
      amount: payment.amount.toString(),
      description: payment.description || '',
    });
  };

  const handleCancelEdit = () => {
    setEditingPaymentId(null);
    setEditPaymentData({
      fromUserId: '',
      toUserId: '',
      amount: '',
      description: '',
    });
  };

  const handleSaveEdit = (paymentId: string) => {
    if (!editPaymentData.fromUserId || !editPaymentData.toUserId || !editPaymentData.amount) {
      alert(t.payments.validation.fillRequired);
      return;
    }
    if (parseFloat(editPaymentData.amount) <= 0) {
      alert(t.payments.validation.amountPositive);
      return;
    }
    if (editPaymentData.fromUserId === editPaymentData.toUserId) {
      alert(t.payments.validation.differentUsers);
      return;
    }

    editPaymentMutation.mutate({
      id: paymentId,
      data: {
        fromUserId: editPaymentData.fromUserId,
        toUserId: editPaymentData.toUserId,
        amount: parseFloat(editPaymentData.amount),
        description: editPaymentData.description,
      },
    });
  };

  const handleManualPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualPaymentData.fromUserId || !manualPaymentData.toUserId || !manualPaymentData.amount) {
      alert(t.payments.validation.fillRequired);
      return;
    }
    if (parseFloat(manualPaymentData.amount) <= 0) {
      alert(t.payments.validation.amountPositive);
      return;
    }
    if (manualPaymentData.fromUserId === manualPaymentData.toUserId) {
      alert(t.payments.validation.differentUsers);
      return;
    }

    createPaymentMutation.mutate({
      fromUserId: manualPaymentData.fromUserId,
      toUserId: manualPaymentData.toUserId,
      amount: parseFloat(manualPaymentData.amount),
      description: manualPaymentData.description || t.payments.manualPayment,
    }, {
      onSuccess: () => {
        setShowManualForm(false);
        setManualPaymentData({
          fromUserId: '',
          toUserId: '',
          amount: '',
          description: '',
        });
      },
    });
  };

  const resetManualForm = () => {
    setShowManualForm(false);
    setManualPaymentData({
      fromUserId: '',
      toUserId: '',
      amount: '',
      description: '',
    });
  };

  if (paymentsLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const pendingPayments = filteredPayments?.filter(p => p.status === 'PENDING') || [];
  const completedPayments = filteredPayments?.filter(p => p.status === 'COMPLETED') || [];
  const cancelledPayments = filteredPayments?.filter(p => p.status === 'CANCELLED') || [];

  return (
    <div className="space-y-4">
      {/* Debt Settlement Suggestions */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-sm p-4 sm:p-6">
        <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
          💰 {t.payments.settlements.title}
        </h3>
        <p className="text-xs sm:text-sm text-gray-600 mb-4">
          {t.payments.settlements.subtitle}
        </p>

        {settlements.length > 0 ? (
          <div className="space-y-3">
            {settlements.map((settlement, index) => (
              <div
                key={index}
                className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border border-indigo-100 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-sm sm:text-base font-medium text-gray-900">
                      {settlement.fromUserName} → {settlement.toUserName}
                    </p>
                    <p className="text-lg sm:text-xl font-bold text-indigo-600 mt-1">
                      {formatCurrency(settlement.amount)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleCreatePayment(settlement)}
                    disabled={createPaymentMutation.isPending}
                    className="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {createPaymentMutation.isPending ? t.common.loading : t.payments.settlements.createFromSuggestion}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-xl sm:text-2xl">✅</p>
            <p className="text-sm sm:text-base text-gray-600 mt-2">{t.spending.settlement.balanced}</p>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">{t.spending.settlement.balancedDesc}</p>
          </div>
        )}
      </div>

      {/* Manual Payment Creation */}
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
            ➕ {t.payments.createPayment}
          </h3>
          <button
            onClick={() => {
              if (showManualForm) {
                resetManualForm();
              } else {
                setShowManualForm(true);
              }
            }}
            className="px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            {showManualForm ? t.common.cancel : '+ ' + t.common.create}
          </button>
        </div>

        {showManualForm && (
          <form onSubmit={handleManualPaymentSubmit} className="space-y-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.payments.from} *
                </label>
                <select
                  value={manualPaymentData.fromUserId}
                  onChange={(e) => setManualPaymentData({ ...manualPaymentData, fromUserId: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">{t.payments.placeholders.selectUser}</option>
                  {group?.members?.map((member: GroupMember) => (
                    <option key={member.user?.id} value={member.user?.id}>
                      {member.user?.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.payments.to} *
                </label>
                <select
                  value={manualPaymentData.toUserId}
                  onChange={(e) => setManualPaymentData({ ...manualPaymentData, toUserId: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">{t.payments.placeholders.selectUser}</option>
                  {group?.members?.map((member: GroupMember) => (
                    <option key={member.user?.id} value={member.user?.id}>
                      {member.user?.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.payments.amount} *
              </label>
              <input
                type="number"
                step="0.01"
                value={manualPaymentData.amount}
                onChange={(e) => setManualPaymentData({ ...manualPaymentData, amount: e.target.value })}
                required
                placeholder={t.payments.placeholders.amount}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.payments.description}
              </label>
              <textarea
                value={manualPaymentData.description}
                onChange={(e) => setManualPaymentData({ ...manualPaymentData, description: e.target.value })}
                placeholder={t.payments.placeholders.description}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={createPaymentMutation.isPending}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {createPaymentMutation.isPending ? t.common.loading : t.common.create}
              </button>
              <button
                type="button"
                onClick={resetManualForm}
                className="px-4 py-2 bg-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-400 transition-colors"
              >
                {t.common.cancel}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Filter Section */}
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
        <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
          🔍 {t.payments.filters?.title || 'Filtreler'}
        </h3>
        
        <div className="bg-gray-50 p-3 sm:p-4 rounded-lg space-y-3 sm:space-y-4">
          {/* Preset Filters */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handlePresetFilterChange('current-month')}
              className={`px-3 sm:px-4 py-2 rounded text-sm ${
                presetFilter === 'current-month'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {t.expenses.filters.currentMonth}
            </button>
            <button
              onClick={() => handlePresetFilterChange('last-month')}
              className={`px-3 sm:px-4 py-2 rounded text-sm ${
                presetFilter === 'last-month'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {t.expenses.filters.lastMonth}
            </button>
            <button
              onClick={() => handlePresetFilterChange('all')}
              className={`px-3 sm:px-4 py-2 rounded text-sm ${
                presetFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {t.expenses.filters.all}
            </button>
          </div>

          {/* Custom Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                {t.payments.filters?.status || 'Durum'}
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="w-full p-2 border rounded text-sm"
              >
                <option value="all">{t.payments.filters?.allStatuses || 'Tüm Durumlar'}</option>
                <option value="PENDING">{t.payments.status.PENDING}</option>
                <option value="COMPLETED">{t.payments.status.COMPLETED}</option>
                <option value="CANCELLED">{t.payments.status.CANCELLED}</option>
              </select>
            </div>

            {/* From User Filter */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                {t.payments.filters?.fromUser || 'Gönderen'}
              </label>
              <select
                value={fromUserFilter}
                onChange={(e) => setFromUserFilter(e.target.value)}
                className="w-full p-2 border rounded text-sm"
              >
                <option value="">{t.payments.filters?.allUsers || 'Tüm Kullanıcılar'}</option>
                {uniqueUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>

            {/* To User Filter */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                {t.payments.filters?.toUser || 'Alan'}
              </label>
              <select
                value={toUserFilter}
                onChange={(e) => setToUserFilter(e.target.value)}
                className="w-full p-2 border rounded text-sm"
              >
                <option value="">{t.payments.filters?.allUsers || 'Tüm Kullanıcılar'}</option>
                {uniqueUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range - Combined Column */}
            <div className="sm:col-span-1">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                {t.expenses.filters.startDate}
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPresetFilter('all');
                }}
                className="w-full p-2 border rounded text-sm mb-2"
              />
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                {t.expenses.filters.endDate}
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPresetFilter('all');
                }}
                className="w-full p-2 border rounded text-sm"
              />
            </div>
          </div>

          {/* Filter Summary and Clear Button */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div className="text-xs sm:text-sm text-gray-600">
              {t.expenses.filters.showing} {filteredPayments?.length || 0} {t.expenses.filters.of} {payments?.length || 0} {t.payments.filters?.payments || 'ödeme'}
            </div>
            <button
              onClick={clearFilters}
              className="text-xs sm:text-sm text-blue-600 hover:text-blue-800"
            >
              {t.expenses.filters.clearFilters}
            </button>
          </div>
        </div>
      </div>

      {/* Pending Payments */}
      {pendingPayments.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
            ⏳ {t.payments.status.PENDING}
          </h3>
          <div className="space-y-3">
            {pendingPayments.map((payment) => (
              <div
                key={payment.id}
                className="border border-yellow-200 rounded-lg p-3 sm:p-4 bg-yellow-50"
              >
                {editingPaymentId === payment.id ? (
                  // Edit Form
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t.payments.from} *
                        </label>
                        <select
                          value={editPaymentData.fromUserId}
                          onChange={(e) => setEditPaymentData({ ...editPaymentData, fromUserId: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          <option value="">{t.payments.placeholders.selectUser}</option>
                          {group?.members?.map((member: GroupMember) => (
                            <option key={member.user?.id} value={member.user?.id}>
                              {member.user?.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t.payments.to} *
                        </label>
                        <select
                          value={editPaymentData.toUserId}
                          onChange={(e) => setEditPaymentData({ ...editPaymentData, toUserId: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          <option value="">{t.payments.placeholders.selectUser}</option>
                          {group?.members?.map((member: GroupMember) => (
                            <option key={member.user?.id} value={member.user?.id}>
                              {member.user?.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t.payments.amount} *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={editPaymentData.amount}
                        onChange={(e) => setEditPaymentData({ ...editPaymentData, amount: e.target.value })}
                        placeholder={t.payments.placeholders.amount}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t.payments.description}
                      </label>
                      <textarea
                        value={editPaymentData.description}
                        onChange={(e) => setEditPaymentData({ ...editPaymentData, description: e.target.value })}
                        placeholder={t.payments.placeholders.description}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveEdit(payment.id)}
                        disabled={editPaymentMutation.isPending}
                        className="flex-1 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                      >
                        {editPaymentMutation.isPending ? t.common.loading : `✓ ${t.common.save}`}
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        disabled={editPaymentMutation.isPending}
                        className="flex-1 px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
                      >
                        ✕ {t.common.cancel}
                      </button>
                    </div>
                  </div>
                ) : (
                  // Display Mode
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <PaymentStatusBadge status={payment.status} />
                      </div>
                      <p className="text-sm sm:text-base font-medium text-gray-900">
                        {payment.fromUser?.name} → {payment.toUser?.name}
                      </p>
                      <p className="text-lg sm:text-xl font-bold text-gray-900 mt-1">
                        {formatCurrency(payment.amount)}
                      </p>
                      {payment.description && (
                        <p className="text-xs sm:text-sm text-gray-600 mt-1">{payment.description}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(payment.createdAt).toLocaleDateString('tr-TR')}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleEditPayment(payment)}
                        disabled={updatePaymentMutation.isPending}
                        className="flex-1 sm:flex-none px-3 py-2 bg-blue-600 text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        ✏️ {t.common.edit}
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(payment, 'COMPLETED')}
                        disabled={updatePaymentMutation.isPending}
                        className="flex-1 sm:flex-none px-3 py-2 bg-green-600 text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                      >
                        ✓ {t.payments.markAsCompleted}
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(payment, 'CANCELLED')}
                        disabled={updatePaymentMutation.isPending}
                        className="flex-1 sm:flex-none px-3 py-2 bg-gray-600 text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
                      >
                        ✕ {t.payments.cancel}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment History Toggle */}
      {(completedPayments.length > 0 || cancelledPayments.length > 0) && (
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-between text-left"
          >
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
              📜 {t.payments.history.title}
            </h3>
            <span className="text-gray-500">{showHistory ? '▼' : '▶'}</span>
          </button>

          {showHistory && (
            <div className="mt-4 space-y-3">
              {[...completedPayments, ...cancelledPayments].map((payment) => (
                <div
                  key={payment.id}
                  className="border border-gray-200 rounded-lg p-3 sm:p-4 bg-gray-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <PaymentStatusBadge status={payment.status} />
                      </div>
                      <p className="text-sm sm:text-base font-medium text-gray-900">
                        {payment.fromUser?.name} → {payment.toUser?.name}
                      </p>
                      <p className="text-base sm:text-lg font-bold text-gray-900 mt-1">
                        {formatCurrency(payment.amount)}
                      </p>
                      {payment.description && (
                        <p className="text-xs sm:text-sm text-gray-600 mt-1">{payment.description}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {t.payments.createdAt}: {new Date(payment.createdAt).toLocaleDateString('tr-TR')}
                      </p>
                      {payment.completedAt && (
                        <p className="text-xs text-gray-500">
                          {t.payments.completedAt}: {new Date(payment.completedAt).toLocaleDateString('tr-TR')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* No Payments Message */}
      {!pendingPayments.length && !completedPayments.length && !cancelledPayments.length && (
        <div className="bg-white rounded-lg shadow-sm p-6 text-center">
          <p className="text-gray-500">{t.payments.noPayments}</p>
        </div>
      )}
    </div>
  );
}
