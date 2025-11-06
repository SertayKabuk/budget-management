import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { reminderApi } from '../services/api';
import { useTranslation } from '../contexts/LanguageContext';
import { formatCurrency } from '../utils/currency';
import type { RecurringReminder } from '../types';

export default function ReminderAlertBanner() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Fetch ALL reminders across all user's groups
  const { data: reminders = [] } = useQuery({
    queryKey: ['reminders', 'all'],
    queryFn: async () => {
      try {
        const response = await reminderApi.getAll(); // No groupId = all groups
        return response.data;
      } catch (error: unknown) {
        // Silently handle 403 errors (user not yet recognized as member)
        if ((error as { response?: { status?: number } })?.response?.status === 403) {
          return [];
        }
        throw error;
      }
    },
    retry: (failureCount, error: unknown) => {
      // Don't retry on 403 errors
      if ((error as { response?: { status?: number } })?.response?.status === 403) {
        return false;
      }
      return failureCount < 2;
    },
  });

  const getDaysUntilDue = (dueDate: string): number => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const diffTime = due.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Filter for urgent reminders (overdue or due within 3 days)
  const urgentReminders = reminders.filter((r: RecurringReminder) => {
    if (!r.isActive) return false;
    const days = getDaysUntilDue(r.nextDueDate);
    return days <= 3; // Include overdue (negative) and next 3 days
  });

  if (urgentReminders.length === 0) {
    return null;
  }

  const overdueCount = urgentReminders.filter(r => getDaysUntilDue(r.nextDueDate) < 0).length;
  const totalAmount = urgentReminders.reduce((sum, r) => sum + r.amount, 0);

  // Find the most urgent reminder's group to navigate to
  const mostUrgentReminder = urgentReminders.reduce((prev, curr) => {
    const prevDays = getDaysUntilDue(prev.nextDueDate);
    const currDays = getDaysUntilDue(curr.nextDueDate);
    return currDays < prevDays ? curr : prev;
  });

  // Get unique groups with urgent reminders
  const affectedGroups = new Set(urgentReminders.map(r => r.group?.name).filter(Boolean));

  const handleClick = () => {
    navigate(`/group/${mostUrgentReminder.groupId}`);
  };

  return (
    <button
      onClick={handleClick}
      className="w-full mb-4 sm:mb-6 bg-gradient-to-r from-orange-50 to-red-50 border-l-4 border-orange-500 rounded-lg p-4 hover:shadow-md transition-shadow text-left"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">⚠️</span>
            <h3 className="text-base sm:text-lg font-semibold text-orange-900">
              {overdueCount > 0 ? t.reminders.overdue : t.reminders.upcomingReminders}
            </h3>
          </div>
          <p className="text-sm text-orange-800">
            <span className="font-medium">{urgentReminders.length}</span> {t.calendar.reminder}
            {urgentReminders.length > 1 ? 's' : ''} • <span className="font-bold">{formatCurrency(totalAmount)}</span>
          </p>
          {affectedGroups.size > 1 && (
            <p className="text-xs text-orange-700 mt-1">
              📍 {affectedGroups.size} groups affected
            </p>
          )}
          {affectedGroups.size === 1 && mostUrgentReminder.group && (
            <p className="text-xs text-orange-700 mt-1">
              📍 {mostUrgentReminder.group.name}
            </p>
          )}
          <p className="text-xs text-orange-700 mt-2">
            👉 {t.home.viewRemindersPrompt}
          </p>
        </div>
        <svg className="w-5 h-5 text-orange-600 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
}
