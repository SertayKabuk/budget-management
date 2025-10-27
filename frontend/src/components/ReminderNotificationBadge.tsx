import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reminderApi } from '../services/api';
import { useTranslation } from '../contexts/LanguageContext';
import { formatCurrency } from '../utils/currency';
import type { RecurringReminder } from '../types';

interface ReminderNotificationBadgeProps {
  groupId: string | null;
}

export default function ReminderNotificationBadge({ groupId }: ReminderNotificationBadgeProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch reminders
  const { data: reminders = [] } = useQuery({
    queryKey: ['reminders', groupId],
    queryFn: async () => {
      if (!groupId) return [];
      const response = await reminderApi.getAll(groupId);
      return response.data;
    },
    enabled: !!groupId,
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const getDaysUntilDue = (dueDate: string): number => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const diffTime = due.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getDueDateLabel = (dueDate: string): string => {
    const days = getDaysUntilDue(dueDate);
    if (days === 0) return t.reminders.daysRemaining.today;
    if (days === 1) return t.reminders.daysRemaining.tomorrow;
    if (days < 0) return t.reminders.daysRemaining.overdue.replace('{count}', Math.abs(days).toString());
    return t.reminders.daysRemaining.days.replace('{count}', days.toString());
  };

  // Filter active reminders and categorize
  const activeReminders = reminders.filter((r: RecurringReminder) => r.isActive);
  const upcomingReminders = activeReminders.filter((r: RecurringReminder) => {
    const days = getDaysUntilDue(r.nextDueDate);
    return days >= 0 && days <= 7; // Due within 7 days
  });
  const overdueReminders = activeReminders.filter((r: RecurringReminder) => {
    const days = getDaysUntilDue(r.nextDueDate);
    return days < 0; // Overdue
  });

  const totalNotifications = upcomingReminders.length + overdueReminders.length;

  if (!groupId || totalNotifications === 0) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Reminder notifications"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {totalNotifications > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1 text-xs font-bold text-white bg-red-600 rounded-full">
            {totalNotifications > 99 ? '99+' : totalNotifications}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[80vh] overflow-y-auto">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              🔔 {t.reminders.upcomingReminders}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {totalNotifications} {totalNotifications === 1 ? t.calendar.reminder : t.reminders.title}
            </p>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {/* Overdue Reminders */}
            {overdueReminders.length > 0 && (
              <div className="p-4 border-b border-gray-200 bg-red-50">
                <h4 className="text-sm font-semibold text-red-900 mb-2">
                  ⚠️ {t.reminders.overdue}
                </h4>
                <div className="space-y-2">
                  {overdueReminders.map((reminder) => (
                    <div key={reminder.id} className="bg-white rounded-lg p-3 border-2 border-red-300">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 text-sm">{reminder.title}</p>
                          <p className="text-xs text-red-700 font-semibold mt-1">
                            {getDueDateLabel(reminder.nextDueDate)}
                          </p>
                        </div>
                        <p className="text-sm font-bold text-gray-900 ml-2">
                          {formatCurrency(reminder.amount)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Reminders */}
            {upcomingReminders.length > 0 && (
              <div className="p-4">
                {overdueReminders.length > 0 && (
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">
                    📅 {t.calendar.upcomingReminders}
                  </h4>
                )}
                <div className="space-y-2">
                  {upcomingReminders.map((reminder) => {
                    const days = getDaysUntilDue(reminder.nextDueDate);
                    const isUrgent = days <= 3;

                    return (
                      <div 
                        key={reminder.id} 
                        className={`rounded-lg p-3 border-2 ${
                          isUrgent 
                            ? 'bg-yellow-50 border-yellow-300' 
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 text-sm">{reminder.title}</p>
                            <p className={`text-xs mt-1 ${
                              isUrgent ? 'text-yellow-800 font-semibold' : 'text-gray-600'
                            }`}>
                              {getDueDateLabel(reminder.nextDueDate)}
                            </p>
                          </div>
                          <p className="text-sm font-bold text-gray-900 ml-2">
                            {formatCurrency(reminder.amount)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {totalNotifications === 0 && (
            <div className="p-8 text-center">
              <p className="text-gray-500">✅ {t.reminders.noActiveReminders}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
