import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { paymentApi, expenseApi } from '../services/api';
import { getSocket } from '../services/socket';
import { useTranslation } from '../contexts/LanguageContext';
import { formatCurrency } from '../utils/currency';
import { PaymentStatusBadge } from './PaymentStatusBadge';
import type { Payment, Expense } from '../types';

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

export default function DebtSettlementManager({ groupId }: DebtSettlementManagerProps) {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [showHistory, setShowHistory] = useState(false);

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

  // Calculate debt settlements from expenses
  const settlements = useMemo((): DebtSettlement[] => {
    if (!expenses || expenses.length === 0) return [];

    // Get unique users who made expenses
    const usersMap = new Map<string, { name: string; spent: number }>();
    
    expenses.forEach((expense: Expense) => {
      const userId = expense.user.id;
      const userName = expense.user.name;
      
      if (!usersMap.has(userId)) {
        usersMap.set(userId, { name: userName, spent: 0 });
      }
      
      usersMap.get(userId)!.spent += expense.amount;
    });

    const users = Array.from(usersMap.entries()).map(([id, data]) => ({
      userId: id,
      userName: data.name,
      spent: data.spent
    }));

    if (users.length === 0) return [];

    // Calculate fair share
    const totalSpent = users.reduce((sum, u) => sum + u.spent, 0);
    const fairShare = totalSpent / users.length;

    // Calculate balances (positive = should receive, negative = should pay)
    const balances = users.map(u => ({
      userId: u.userId,
      userName: u.userName,
      balance: u.spent - fairShare
    }));

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
  }, [expenses]);

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

  const pendingPayments = payments?.filter(p => p.status === 'PENDING') || [];
  const completedPayments = payments?.filter(p => p.status === 'COMPLETED') || [];
  const cancelledPayments = payments?.filter(p => p.status === 'CANCELLED') || [];

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
                  <div className="flex gap-2">
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
