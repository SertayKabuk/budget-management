import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, useMemo } from 'react';
import { expenseApi, groupApi, paymentApi } from '../services/api';
import { getSocket } from '../services/socket';
import { useTranslation } from '../contexts/LanguageContext';
import { formatCurrency } from '../utils/currency';
import type { Expense, Payment } from '../types';
import AuthenticatedImage from './AuthenticatedImage';
import { UserSpendingItem } from './OptimizedSpendingComponents';

interface GroupSpendingSummaryProps {
  groupId: string;
}

interface UserSpending {
  userId: string;
  userName: string;
  total: number;
  categories: Record<string, number>;
}

interface MonthlyData {
  monthKey: string;
  monthLabel: string;
  total: number;
  expenseCount: number;
  userSpendings: UserSpending[];
  expenses: Expense[];
}

interface DebtSettlement {
  from: string;
  to: string;
  amount: number;
}

type TimePeriod = 'currentMonth' | 'last2Months' | 'last3Months' | 'allTime';
type ViewMode = 'summary' | 'monthly' | 'settlement';

export default function GroupSpendingSummary({ groupId }: GroupSpendingSummaryProps) {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('currentMonth');
  const [viewMode, setViewMode] = useState<ViewMode>('summary');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const { data: allExpenses, isLoading } = useQuery({
    queryKey: ['expenses', groupId],
    queryFn: async () => {
      const response = await expenseApi.getAll(groupId);
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

  // Fetch payments to adjust debt calculations
  const { data: payments } = useQuery({
    queryKey: ['payments', groupId],
    queryFn: async () => {
      const response = await paymentApi.getAll(groupId);
      return response.data;
    },
    enabled: !!groupId,
  });

  // Filter expenses based on selected time period
  const expenses = useMemo(() => {
    if (!allExpenses) return [];
    
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
        return allExpenses;
      default:
        startDate = new Date(year, month, 1);
    }

    return allExpenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate >= startDate;
    });
  }, [allExpenses, timePeriod]);

  // Listen for real-time expense updates
  useEffect(() => {
    const socket = getSocket();

    const handleExpenseAdded = () => {
      // Invalidate and refetch expenses when a new expense is added
      queryClient.invalidateQueries({ queryKey: ['expenses', groupId] });
    };

    socket.on('expense-added', handleExpenseAdded);

    return () => {
      socket.off('expense-added', handleExpenseAdded);
    };
  }, [groupId, queryClient]);

  // Calculate monthly breakdown - MUST be before early returns
  const monthlyData = useMemo(() => {
    if (!expenses || expenses.length === 0) return [];

    const monthsMap = new Map<string, MonthlyData>();

    expenses.forEach((expense: Expense) => {
      const date = new Date(expense.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long' });

      if (!monthsMap.has(monthKey)) {
        monthsMap.set(monthKey, {
          monthKey,
          monthLabel,
          total: 0,
          expenseCount: 0,
          userSpendings: [],
          expenses: []
        });
      }

      const monthData = monthsMap.get(monthKey)!;
      monthData.total += expense.amount;
      monthData.expenseCount += 1;
      monthData.expenses.push(expense);
    });

    // Calculate user spendings per month
    monthsMap.forEach((monthData) => {
      const userMap = new Map<string, UserSpending>();
      
      monthData.expenses.forEach((expense: Expense) => {
        const userId = expense.user.id;
        const userName = expense.user.name;

        if (!userMap.has(userId)) {
          userMap.set(userId, {
            userId,
            userName,
            total: 0,
            categories: {}
          });
        }

        const userSpending = userMap.get(userId)!;
        userSpending.total += expense.amount;
      });

      monthData.userSpendings = Array.from(userMap.values()).sort((a, b) => b.total - a.total);
    });

    return Array.from(monthsMap.values()).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [expenses]);

  // Calculate debt settlements - MUST be before early returns
  const debtSettlements = useMemo(() => {
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
    const settlements: DebtSettlement[] = [];
    const creditorsCopy = creditors.map(c => ({ ...c }));
    const debtorsCopy = debtors.map(d => ({ ...d }));

    while (creditorsCopy.length > 0 && debtorsCopy.length > 0) {
      const creditor = creditorsCopy[0];
      const debtor = debtorsCopy[0];
      
      const amount = Math.min(creditor.balance, Math.abs(debtor.balance));
      
      if (amount > 0.01) {
        settlements.push({
          from: debtor.userName,
          to: creditor.userName,
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

    return settlements;
  }, [expenses, groupMembers, payments]);

  // Calculate user spending data - MUST be before early returns
  const { totalSpending, userSpendings, userExpensesMap } = useMemo(() => {
    if (!expenses || expenses.length === 0) {
      return {
        totalSpending: 0,
        userSpendings: [],
        userExpensesMap: new Map<string, Expense[]>()
      };
    }

    const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const userSpendingMap = new Map<string, UserSpending>();
    const expensesMap = new Map<string, Expense[]>();
    
    expenses.forEach((expense: Expense) => {
      const userId = expense.user.id;
      const userName = expense.user.name;
      const category = expense.category || t.spending.uncategorized;

      if (!userSpendingMap.has(userId)) {
        userSpendingMap.set(userId, {
          userId,
          userName,
          total: 0,
          categories: {},
        });
        expensesMap.set(userId, []);
      }

      const userSpending = userSpendingMap.get(userId)!;
      userSpending.total += expense.amount;
      userSpending.categories[category] = (userSpending.categories[category] || 0) + expense.amount;
      
      expensesMap.get(userId)!.push(expense);
    });

    return {
      totalSpending: total,
      userSpendings: Array.from(userSpendingMap.values()).sort((a, b) => b.total - a.total),
      userExpensesMap: expensesMap
    };
  }, [expenses, t.spending.uncategorized]);

  const toggleUserExpansion = (userId: string) => {
    setExpandedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const toggleMonthExpansion = (monthKey: string) => {
    setExpandedMonths(prev => {
      const newSet = new Set(prev);
      if (newSet.has(monthKey)) {
        newSet.delete(monthKey);
      } else {
        newSet.add(monthKey);
      }
      return newSet;
    });
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (!expenses || expenses.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <div className="mb-4">
          <h3 className="text-base sm:text-lg font-semibold mb-3">{t.spending.title}</h3>
          
          {/* Time Period Filter Buttons */}
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
        <p className="text-gray-500 text-center py-4 text-sm sm:text-base">
          {timePeriod === 'currentMonth' ? t.spending.noExpensesThisMonth : t.spending.noExpenses}
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Image Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-10 right-0 text-white text-2xl hover:text-gray-300"
            >
              ✕
            </button>
            <AuthenticatedImage
              imageUrl={selectedImage}
              alt="Receipt"
              className="max-w-full max-h-screen object-contain rounded"
            />
          </div>
        </div>
      )}

    <div className="bg-white rounded-lg shadow p-4 sm:p-6">
      <div className="mb-4">
        <h3 className="text-base sm:text-lg font-semibold mb-3">{t.spending.title}</h3>
        
        {/* View Mode Tabs */}
        <div className="flex gap-2 mb-3 border-b border-gray-200">
          <button
            onClick={() => setViewMode('summary')}
            className={`px-4 py-2 text-sm font-medium transition-all ${
              viewMode === 'summary'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t.spending.viewModes.summary}
          </button>
          <button
            onClick={() => setViewMode('monthly')}
            className={`px-4 py-2 text-sm font-medium transition-all ${
              viewMode === 'monthly'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t.spending.viewModes.monthly}
          </button>
          <button
            onClick={() => setViewMode('settlement')}
            className={`px-4 py-2 text-sm font-medium transition-all ${
              viewMode === 'settlement'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t.spending.viewModes.settlement}
          </button>
        </div>
        
        {/* Time Period Filter Buttons */}
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
      
      {/* Total Spending */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
        <div className="text-xs sm:text-sm text-blue-600 font-medium">{t.spending.totalGroupSpending}</div>
        <div className="text-2xl sm:text-3xl font-bold text-blue-900 mt-1">
          {formatCurrency(totalSpending)}
        </div>
        <div className="text-xs sm:text-sm text-blue-600 mt-1">
          {expenses.length} {expenses.length !== 1 ? t.spending.expenses : t.spending.expense}
        </div>
      </div>

      {/* Conditional Content Based on View Mode */}
      {viewMode === 'summary' && (
        <div className="space-y-3 sm:space-y-4">
          <h4 className="text-sm sm:text-md font-semibold text-gray-700">{t.spending.spendingByMember}</h4>
          {userSpendings.map((userSpending) => {
            const isExpanded = expandedUsers.has(userSpending.userId);
            const userExpenses = userExpensesMap.get(userSpending.userId) || [];
            
            return (
              <UserSpendingItem
                key={userSpending.userId}
                userSpending={userSpending}
                totalSpending={totalSpending}
                isExpanded={isExpanded}
                onToggle={toggleUserExpansion}
                userExpenses={userExpenses}
                onImageClick={setSelectedImage}
                t={t}
              />
            );
          })}
        </div>
      )}

      {/* Monthly View */}
      {viewMode === 'monthly' && (
        <div className="space-y-3 sm:space-y-4">
          <h4 className="text-sm sm:text-md font-semibold text-gray-700">{t.spending.monthly.title}</h4>
          {monthlyData.map((month) => {
            const isExpanded = expandedMonths.has(month.monthKey);
            const avgExpense = month.total / month.expenseCount;
            
            return (
              <div key={month.monthKey} className="border rounded-lg overflow-hidden">
                {/* Month Header */}
                <div 
                  className="p-3 sm:p-4 cursor-pointer hover:bg-gray-50 transition-colors bg-gradient-to-r from-purple-50 to-purple-100"
                  onClick={() => toggleMonthExpansion(month.monthKey)}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-gray-500 text-xs sm:text-sm">
                        {isExpanded ? '▼' : '▶'}
                      </span>
                      <div>
                        <div className="font-semibold text-gray-900 text-sm sm:text-base">{month.monthLabel}</div>
                        <div className="text-xs text-gray-600 mt-0.5">
                          {month.expenseCount} {t.spending.expenses} • {t.spending.monthly.average}: {formatCurrency(avgExpense)}
                        </div>
                      </div>
                    </div>
                    <div className="text-lg sm:text-xl font-bold text-purple-900">
                      {formatCurrency(month.total)}
                    </div>
                  </div>
                </div>

                {/* Month Details */}
                {isExpanded && (
                  <div className="p-3 sm:p-4 bg-gray-50">
                    <div className="space-y-2">
                      {month.userSpendings.map((userSpending) => {
                        const percentage = (userSpending.total / month.total) * 100;
                        return (
                          <div key={userSpending.userId} className="bg-white rounded-lg p-3 border border-gray-200">
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-medium text-gray-900 text-sm">{userSpending.userName}</span>
                              <span className="font-semibold text-gray-900 text-sm">{formatCurrency(userSpending.total)}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {percentage.toFixed(1)}% {t.spending.monthly.percentageOfMonth}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {monthlyData.length === 0 && (
            <p className="text-gray-500 text-center py-4 text-sm">{t.spending.monthly.noData}</p>
          )}
        </div>
      )}

      {/* Settlement View */}
      {viewMode === 'settlement' && (
        <div className="space-y-3 sm:space-y-4">
          <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4">
            <h4 className="text-sm sm:text-md font-semibold text-green-900 mb-2">{t.spending.settlement.title}</h4>
            <p className="text-xs text-green-700">
              {t.spending.settlement.subtitle}
            </p>
          </div>

          {debtSettlements.length > 0 ? (
            <div className="space-y-2">
              {debtSettlements.map((settlement, index) => (
                <div key={index} className="bg-white border-l-4 border-green-500 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="bg-red-100 text-red-700 rounded-full px-3 py-1 text-sm font-medium">
                        {settlement.from}
                      </div>
                      <span className="text-gray-400 text-xl">→</span>
                      <div className="bg-green-100 text-green-700 rounded-full px-3 py-1 text-sm font-medium">
                        {settlement.to}
                      </div>
                    </div>
                    <div className="text-xl font-bold text-green-600">
                      {formatCurrency(settlement.amount)}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    {t.spending.settlement.paymentInstruction
                      .replace('{from}', settlement.from)
                      .replace('{to}', settlement.to)
                      .replace('{amount}', formatCurrency(settlement.amount))}
                  </div>
                </div>
              ))}
              
              <div className="bg-blue-50 rounded-lg p-4 mt-4">
                <div className="flex items-start gap-2">
                  <span className="text-blue-600 text-lg">ℹ️</span>
                  <div className="text-xs text-blue-700">
                    <p className="font-medium mb-1">{t.spending.settlement.howItWorks.title}</p>
                    <p>{t.spending.settlement.howItWorks.description}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg p-8 text-center">
              <div className="text-4xl mb-2">✅</div>
              <p className="text-gray-700 font-medium">{t.spending.settlement.balanced}</p>
              <p className="text-sm text-gray-500 mt-1">{t.spending.settlement.balancedDesc}</p>
            </div>
          )}
        </div>
      )}
    </div>
    </>
  );
}
