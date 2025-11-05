import { memo } from 'react';
import { formatCurrency } from '../utils/currency';
import type { Expense } from '../types';
import AuthenticatedImage from './AuthenticatedImage';

interface UserSpendingItemProps {
  userSpending: {
    userId: string;
    userName: string;
    total: number;
    categories: Record<string, number>;
  };
  totalSpending: number;
  isExpanded: boolean;
  onToggle: (userId: string) => void;
  userExpenses: Expense[];
  onImageClick: (imageUrl: string) => void;
  t: any;
}

// Memoized component to prevent unnecessary re-renders
const UserSpendingItem = memo(function UserSpendingItem({
  userSpending,
  totalSpending,
  isExpanded,
  onToggle,
  userExpenses,
  onImageClick,
  t
}: UserSpendingItemProps) {
  const percentage = (userSpending.total / totalSpending) * 100;

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header - Always visible */}
      <div 
        className="p-3 sm:p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => onToggle(userSpending.userId)}
      >
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 text-sm sm:text-base">{userSpending.userName}</span>
            <span className="text-gray-500 text-xs sm:text-sm">
              {isExpanded ? '▼' : '▶'}
            </span>
          </div>
          <div className="text-base sm:text-lg font-semibold text-gray-900">
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
        <div className="px-3 sm:px-4 pb-3 sm:pb-4 bg-gray-50">
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
                      className="flex justify-between items-center text-xs sm:text-sm py-2 border-b border-gray-200 last:border-b-0 gap-2"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0"></span>
                        <span className="text-gray-700 truncate">{category}</span>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                        <div className="w-16 sm:w-24 bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-blue-400 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${categoryPercentage}%` }}
                          ></div>
                        </div>
                        <span className="font-medium text-gray-900 w-16 sm:w-20 text-right">
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
              {userExpenses
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((expense) => (
                  <ExpenseItem 
                    key={expense.id}
                    expense={expense}
                    onImageClick={onImageClick}
                  />
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

// Separate memoized component for individual expenses
const ExpenseItem = memo(function ExpenseItem({
  expense,
  onImageClick
}: {
  expense: Expense;
  onImageClick: (imageUrl: string) => void;
}) {
  return (
    <div className="bg-white rounded-lg p-2 sm:p-3 border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex gap-2 sm:gap-3">
        {/* Image if available */}
        {expense.imageUrl && (
          <div className="flex-shrink-0">
            <AuthenticatedImage
              imageUrl={expense.imageUrl}
              alt="Receipt"
              className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded cursor-pointer hover:opacity-75 transition-opacity"
              onClick={() => onImageClick(expense.imageUrl || '')}
            />
          </div>
        )}
        
        {/* Expense Info */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-2">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 text-xs sm:text-sm truncate">
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
              <div className="font-semibold text-gray-900 text-xs sm:text-sm">
                {formatCurrency(expense.amount)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export { UserSpendingItem, ExpenseItem };
