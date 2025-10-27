import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { expenseApi, paymentApi, reminderApi } from '../services/api';
import { useTranslation } from '../contexts/LanguageContext';
import { formatCurrency } from '../utils/currency';
import type { Expense, Payment, RecurringReminder } from '../types';

interface ExpenseCalendarProps {
  groupId: string;
}

interface CalendarEvent {
  id: string;
  type: 'expense' | 'payment' | 'reminder';
  date: Date;
  title: string;
  amount: number;
  description?: string;
  status?: string;
  user?: string;
  fromUser?: string;
  toUser?: string;
}

export default function ExpenseCalendar({ groupId }: ExpenseCalendarProps) {
  const { t } = useTranslation();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Fetch expenses
  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses', groupId],
    queryFn: async () => {
      const response = await expenseApi.getAll(groupId);
      return response.data;
    },
    enabled: !!groupId,
  });

  // Fetch payments
  const { data: payments = [] } = useQuery({
    queryKey: ['payments', groupId],
    queryFn: async () => {
      const response = await paymentApi.getAll(groupId);
      return response.data;
    },
    enabled: !!groupId,
  });

  // Fetch reminders
  const { data: reminders = [] } = useQuery({
    queryKey: ['reminders', groupId],
    queryFn: async () => {
      const response = await reminderApi.getAll(groupId);
      return response.data;
    },
    enabled: !!groupId,
  });

  // Helper function to calculate next occurrence of a recurring reminder
  const getNextOccurrence = (startDate: Date, frequency: string): Date => {
    const next = new Date(startDate);
    switch (frequency) {
      case 'WEEKLY':
        next.setDate(next.getDate() + 7);
        break;
      case 'MONTHLY':
        next.setMonth(next.getMonth() + 1);
        break;
      case 'EVERY_6_MONTHS':
        next.setMonth(next.getMonth() + 6);
        break;
      case 'YEARLY':
        next.setFullYear(next.getFullYear() + 1);
        break;
    }
    return next;
  };

  // Convert all data to calendar events
  const events = useMemo(() => {
    const allEvents: CalendarEvent[] = [];

    // Add expenses
    expenses.forEach((expense: Expense) => {
      allEvents.push({
        id: expense.id,
        type: 'expense',
        date: new Date(expense.date),
        title: expense.description,
        amount: expense.amount,
        description: expense.category,
        user: expense.user?.name,
      });
    });

    // Add payments
    payments.forEach((payment: Payment) => {
      allEvents.push({
        id: payment.id,
        type: 'payment',
        date: new Date(payment.createdAt),
        title: payment.description || t.calendar.payment,
        amount: payment.amount,
        status: payment.status,
        fromUser: payment.fromUser?.name,
        toUser: payment.toUser?.name,
      });
    });

    // Add active reminders with multiple future occurrences
    reminders
      .filter((r: RecurringReminder) => r.isActive)
      .forEach((reminder: RecurringReminder) => {
        // Calculate occurrences for the next 12 months
        const today = new Date();
        const maxDate = new Date();
        maxDate.setMonth(maxDate.getMonth() + 12);
        
        let currentDate = new Date(reminder.nextDueDate);
        let occurrenceCount = 0;
        const maxOccurrences = 50; // Safety limit
        
        while (currentDate <= maxDate && occurrenceCount < maxOccurrences) {
          // Only add if it's today or in the future
          if (currentDate >= today || 
              (currentDate.toDateString() === today.toDateString())) {
            allEvents.push({
              id: `${reminder.id}-${occurrenceCount}`,
              type: 'reminder',
              date: new Date(currentDate),
              title: reminder.title,
              amount: reminder.amount,
              description: reminder.description,
            });
          }
          
          // Calculate next occurrence
          currentDate = getNextOccurrence(currentDate, reminder.frequency);
          occurrenceCount++;
        }
      });

    return allEvents;
  }, [expenses, payments, reminders, t]);

  // Get calendar days for the current month
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);

    // Start from the previous Sunday (or Monday based on locale)
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());

    // End at the next Saturday
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

    const days: Date[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return days;
  }, [currentDate]);

  // Get events for a specific date
  const getEventsForDate = (date: Date): CalendarEvent[] => {
    return events.filter((event) => {
      const eventDate = new Date(event.date);
      return (
        eventDate.getFullYear() === date.getFullYear() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getDate() === date.getDate()
      );
    });
  };

  // Navigation functions
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
  };

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  const getEventColor = (type: string) => {
    switch (type) {
      case 'expense':
        return 'bg-red-500';
      case 'payment':
        return 'bg-green-500';
      case 'reminder':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getEventBadgeColor = (type: string) => {
    switch (type) {
      case 'expense':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'payment':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'reminder':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
          📅 {t.calendar.title}
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={goToPreviousMonth}
            className="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            ←
          </button>
          <button
            onClick={goToToday}
            className="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            {t.calendar.today}
          </button>
          <button
            onClick={goToNextMonth}
            className="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            →
          </button>
        </div>
      </div>

      {/* Current Month Display */}
      <div className="text-center mb-4">
        <h4 className="text-xl sm:text-2xl font-bold text-gray-900">
          {currentDate.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
        </h4>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4 text-xs sm:text-sm">
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-red-500"></span>
          <span className="text-gray-700">{t.calendar.expense}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-green-500"></span>
          <span className="text-gray-700">{t.calendar.payment}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
          <span className="text-gray-700">{t.calendar.reminder}</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="border rounded-lg overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 bg-gray-100 border-b">
          {[t.calendar.days.sun, t.calendar.days.mon, t.calendar.days.tue, t.calendar.days.wed, t.calendar.days.thu, t.calendar.days.fri, t.calendar.days.sat].map((day) => (
            <div
              key={day}
              className="text-center text-xs sm:text-sm font-semibold text-gray-700 py-2 border-r last:border-r-0"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7">
          {calendarDays.map((date, index) => {
            const dayEvents = getEventsForDate(date);
            const isTodayDate = isToday(date);
            const isCurrentMonthDate = isCurrentMonth(date);
            const isSelected = selectedDate && 
              date.getFullYear() === selectedDate.getFullYear() &&
              date.getMonth() === selectedDate.getMonth() &&
              date.getDate() === selectedDate.getDate();

            return (
              <div
                key={index}
                onClick={() => handleDateClick(date)}
                className={`
                  min-h-[80px] sm:min-h-[100px] p-1 sm:p-2 border-r border-b cursor-pointer
                  hover:bg-gray-50 transition-colors
                  ${!isCurrentMonthDate ? 'bg-gray-50 text-gray-400' : 'bg-white'}
                  ${isTodayDate ? 'bg-blue-50 border-2 border-blue-500' : ''}
                  ${isSelected ? 'ring-2 ring-indigo-500' : ''}
                `}
              >
                <div className={`text-sm sm:text-base font-medium mb-1 ${isTodayDate ? 'text-blue-700 font-bold' : ''}`}>
                  {date.getDate()}
                </div>
                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map((event) => (
                    <div
                      key={event.id}
                      className={`text-xs px-1 py-0.5 rounded truncate ${getEventColor(event.type)} text-white`}
                      title={`${event.title} - ${formatCurrency(event.amount)}`}
                    >
                      {formatCurrency(event.amount)}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-gray-500 font-medium">
                      +{dayEvents.length - 3} {t.calendar.more}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Date Details */}
      {selectedDate && selectedDateEvents.length > 0 && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-900">
              {selectedDate.toLocaleDateString('tr-TR', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </h4>
            <button
              onClick={() => setSelectedDate(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          <div className="space-y-3">
            {selectedDateEvents.map((event) => (
              <div
                key={event.id}
                className={`p-3 rounded-lg border-2 ${getEventBadgeColor(event.type)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold uppercase">
                        {t.calendar[event.type]}
                      </span>
                      {event.status && (
                        <span className="text-xs px-2 py-0.5 rounded bg-white">
                          {t.payments.status[event.status as keyof typeof t.payments.status]}
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-gray-900">{event.title}</p>
                    {event.description && (
                      <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                    )}
                    {event.user && (
                      <p className="text-xs text-gray-600 mt-1">
                        {t.calendar.by}: {event.user}
                      </p>
                    )}
                    {event.fromUser && event.toUser && (
                      <p className="text-xs text-gray-600 mt-1">
                        {event.fromUser} → {event.toUser}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">
                      {formatCurrency(event.amount)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-gray-300">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">{t.calendar.totalForDay}:</span>
              <span className="text-lg font-bold text-gray-900">
                {formatCurrency(
                  selectedDateEvents.reduce((sum, event) => sum + event.amount, 0)
                )}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Summary Statistics */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
          <p className="text-sm text-red-800 font-medium mb-1">{t.calendar.totalExpenses}</p>
          <p className="text-xl font-bold text-red-900">
            {formatCurrency(
              events
                .filter(e => e.type === 'expense' && 
                  e.date.getMonth() === currentDate.getMonth() &&
                  e.date.getFullYear() === currentDate.getFullYear())
                .reduce((sum, e) => sum + e.amount, 0)
            )}
          </p>
          <p className="text-xs text-red-700 mt-1">
            {events.filter(e => e.type === 'expense' && 
              e.date.getMonth() === currentDate.getMonth() &&
              e.date.getFullYear() === currentDate.getFullYear()).length} {t.calendar.items}
          </p>
        </div>

        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
          <p className="text-sm text-green-800 font-medium mb-1">{t.calendar.totalPayments}</p>
          <p className="text-xl font-bold text-green-900">
            {formatCurrency(
              events
                .filter(e => e.type === 'payment' && 
                  e.date.getMonth() === currentDate.getMonth() &&
                  e.date.getFullYear() === currentDate.getFullYear())
                .reduce((sum, e) => sum + e.amount, 0)
            )}
          </p>
          <p className="text-xs text-green-700 mt-1">
            {events.filter(e => e.type === 'payment' && 
              e.date.getMonth() === currentDate.getMonth() &&
              e.date.getFullYear() === currentDate.getFullYear()).length} {t.calendar.items}
          </p>
        </div>

        <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <p className="text-sm text-yellow-800 font-medium mb-1">{t.calendar.upcomingReminders}</p>
          <p className="text-xl font-bold text-yellow-900">
            {formatCurrency(
              events
                .filter(e => e.type === 'reminder' && 
                  e.date.getMonth() === currentDate.getMonth() &&
                  e.date.getFullYear() === currentDate.getFullYear())
                .reduce((sum, e) => sum + e.amount, 0)
            )}
          </p>
          <p className="text-xs text-yellow-700 mt-1">
            {events.filter(e => e.type === 'reminder' && 
              e.date.getMonth() === currentDate.getMonth() &&
              e.date.getFullYear() === currentDate.getFullYear()).length} {t.calendar.items}
          </p>
        </div>
      </div>
    </div>
  );
}
