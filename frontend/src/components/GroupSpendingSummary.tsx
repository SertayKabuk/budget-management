import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, useMemo } from 'react';
import { expenseApi } from '../services/api';
import { getSocket } from '../services/socket';
import { useTranslation } from '../contexts/LanguageContext';
import { formatCurrency } from '../utils/currency';
import type { Expense } from '../types';
import { config } from '../config/runtime';

interface GroupSpendingSummaryProps {
  groupId: string;
}

interface UserSpending {
  userId: string;
  userName: string;
  total: number;
  categories: Record<string, number>;
}

export default function GroupSpendingSummary({ groupId }: GroupSpendingSummaryProps) {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  const { data: allExpenses, isLoading } = useQuery({
    queryKey: ['expenses', groupId],
    queryFn: async () => {
      const response = await expenseApi.getAll(groupId);
      return response.data;
    },
    enabled: !!groupId,
  });

  // Filter expenses to current month
  const expenses = useMemo(() => {
    if (!allExpenses) return [];
    
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);

    return allExpenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate >= startOfMonth && expenseDate <= endOfMonth;
    });
  }, [allExpenses]);

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

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
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
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{t.spending.title}</h3>
          <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            📅 {t.expenses.filters.currentMonth}
          </span>
        </div>
        <p className="text-gray-500 text-center py-4">{t.spending.noExpensesThisMonth}</p>
      </div>
    );
  }

  // Calculate total spending
  const totalSpending = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  // Group expenses by user
  const userSpendingMap = new Map<string, UserSpending>();
  const userExpensesMap = new Map<string, Expense[]>();
  
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
      userExpensesMap.set(userId, []);
    }

    const userSpending = userSpendingMap.get(userId)!;
    userSpending.total += expense.amount;
    userSpending.categories[category] = (userSpending.categories[category] || 0) + expense.amount;
    
    // Store the expense for this user
    userExpensesMap.get(userId)!.push(expense);
  });

  const userSpendings = Array.from(userSpendingMap.values()).sort((a, b) => b.total - a.total);

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

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">{t.spending.title}</h3>
        <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
          📅 {t.expenses.filters.currentMonth}
        </span>
      </div>
      
      {/* Total Spending */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4 mb-6">
        <div className="text-sm text-blue-600 font-medium">{t.spending.totalGroupSpending}</div>
        <div className="text-3xl font-bold text-blue-900 mt-1">
          {formatCurrency(totalSpending)}
        </div>
        <div className="text-sm text-blue-600 mt-1">
          {expenses.length} {expenses.length !== 1 ? t.spending.expenses : t.spending.expense}
        </div>
      </div>

      {/* User Spending Breakdown */}
      <div className="space-y-4">
        <h4 className="text-md font-semibold text-gray-700">{t.spending.spendingByMember}</h4>
        {userSpendings.map((userSpending) => {
          const percentage = (userSpending.total / totalSpending) * 100;
          const isExpanded = expandedUsers.has(userSpending.userId);
          
          return (
            <div key={userSpending.userId} className="border rounded-lg overflow-hidden">
              {/* Header - Always visible */}
              <div 
                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleUserExpansion(userSpending.userId)}
              >
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{userSpending.userName}</span>
                    <span className="text-gray-500 text-sm">
                      {isExpanded ? '▼' : '▶'}
                    </span>
                  </div>
                  <div className="text-lg font-semibold text-gray-900">
                    {formatCurrency(userSpending.total)}
                  </div>
                </div>
                
                {/* Percentage bar */}
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>

              {/* Collapsible Expense Details */}
              {isExpanded && (
                <div className="px-4 pb-4 bg-gray-50">
                  {/* Category Summary */}
                  <div className="mb-4">
                    <div className="text-xs font-semibold text-gray-500 uppercase mb-2">
                      {t.spending.categoryBreakdown}
                    </div>
                    <div className="space-y-1">
                      {Object.entries(userSpending.categories)
                        .sort(([, a], [, b]) => b - a)
                        .map(([category, amount]) => {
                          const categoryPercentage = (amount / userSpending.total) * 100;
                          return (
                            <div
                              key={category}
                              className="flex justify-between items-center text-sm py-2 border-b border-gray-200 last:border-b-0"
                            >
                              <div className="flex items-center gap-2 flex-1">
                                <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                                <span className="text-gray-700">{category}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="w-24 bg-gray-200 rounded-full h-1.5">
                                  <div
                                    className="bg-blue-400 h-1.5 rounded-full transition-all duration-300"
                                    style={{ width: `${categoryPercentage}%` }}
                                  ></div>
                                </div>
                                <span className="font-medium text-gray-900 w-20 text-right">
                                  {formatCurrency(amount)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  {/* Individual Expenses */}
                  <div className="mt-4">
                    <div className="text-xs font-semibold text-gray-500 uppercase mb-2">
                      {t.spending.expenseDetails}
                    </div>
                    <div className="space-y-2">
                      {userExpensesMap.get(userSpending.userId)
                        ?.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map((expense) => (
                          <div
                            key={expense.id}
                            className="bg-white rounded-lg p-3 border border-gray-200 hover:shadow-md transition-shadow"
                          >
                            <div className="flex gap-3">
                              {/* Image if available */}
                              {expense.imageUrl && (
                                <div className="flex-shrink-0">
                                  <img
                                    src={`${config.apiUrl}${expense.imageUrl}`}
                                    alt="Receipt"
                                    className="w-16 h-16 object-cover rounded cursor-pointer hover:opacity-75 transition-opacity"
                                    onClick={() => window.open(`${config.apiUrl}${expense.imageUrl}`, '_blank')}
                                  />
                                </div>
                              )}
                              
                              {/* Expense Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-gray-900 truncate">
                                      {expense.description}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-0.5">
                                      {new Date(expense.date).toLocaleDateString('tr-TR', {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </div>
                                    {expense.category && (
                                      <div className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                                        {expense.category}
                                      </div>
                                    )}
                                  </div>
                                  <div className="text-right flex-shrink-0">
                                    <div className="font-semibold text-gray-900">
                                      {formatCurrency(expense.amount)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
