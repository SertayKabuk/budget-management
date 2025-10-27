import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { reminderApi } from '../services/api';
import { getSocket } from '../services/socket';
import { useTranslation } from '../contexts/LanguageContext';
import { formatCurrency } from '../utils/currency';
import { ReminderFrequencyBadge } from './ReminderFrequencyBadge';
import type { RecurringReminder, ReminderFrequency } from '../types';

interface RecurringReminderManagerProps {
  groupId: string;
}

export default function RecurringReminderManager({ groupId }: RecurringReminderManagerProps) {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingReminder, setEditingReminder] = useState<RecurringReminder | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: '',
    frequency: 'MONTHLY' as ReminderFrequency,
    nextDueDate: '',
  });

  // Fetch reminders
  const { data: reminders, isLoading } = useQuery({
    queryKey: ['reminders', groupId],
    queryFn: async () => {
      const response = await reminderApi.getAll(groupId);
      return response.data;
    },
    enabled: !!groupId,
  });

  // Create reminder mutation
  const createMutation = useMutation({
    mutationFn: (data: typeof formData) =>
      reminderApi.create({
        ...data,
        amount: parseFloat(data.amount),
        groupId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders', groupId] });
      resetForm();
    },
  });

  // Update reminder mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<typeof formData> }) =>
      reminderApi.update(id, {
        ...data,
        amount: data.amount ? parseFloat(data.amount) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders', groupId] });
      setEditingReminder(null);
      resetForm();
    },
  });

  // Toggle active mutation
  const toggleMutation = useMutation({
    mutationFn: (id: string) => reminderApi.toggleActive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders', groupId] });
    },
  });

  // Delete reminder mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => reminderApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders', groupId] });
    },
  });

  // Listen for real-time reminder updates
  useEffect(() => {
    const socket = getSocket();

    const handleReminderUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['reminders', groupId] });
    };

    socket.on('reminder-created', handleReminderUpdate);
    socket.on('reminder-updated', handleReminderUpdate);
    socket.on('reminder-deleted', handleReminderUpdate);

    return () => {
      socket.off('reminder-created', handleReminderUpdate);
      socket.off('reminder-updated', handleReminderUpdate);
      socket.off('reminder-deleted', handleReminderUpdate);
    };
  }, [groupId, queryClient]);

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      amount: '',
      frequency: 'MONTHLY',
      nextDueDate: '',
    });
    setShowCreateForm(false);
    setEditingReminder(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingReminder) {
      updateMutation.mutate({ id: editingReminder.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (reminder: RecurringReminder) => {
    setEditingReminder(reminder);
    setFormData({
      title: reminder.title,
      description: reminder.description || '',
      amount: reminder.amount.toString(),
      frequency: reminder.frequency,
      nextDueDate: reminder.nextDueDate.split('T')[0],
    });
    setShowCreateForm(true);
  };

  const handleDelete = (reminder: RecurringReminder) => {
    if (confirm(t.reminders.confirmDelete)) {
      deleteMutation.mutate(reminder.id);
    }
  };

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

  const getDueDateColor = (dueDate: string): string => {
    const days = getDaysUntilDue(dueDate);
    if (days < 0) return 'text-red-600 font-bold';
    if (days === 0) return 'text-orange-600 font-semibold';
    if (days <= 3) return 'text-yellow-600 font-medium';
    return 'text-gray-600';
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const activeReminders = reminders?.filter(r => r.isActive) || [];
  const inactiveReminders = reminders?.filter(r => !r.isActive) || [];
  const upcomingReminders = activeReminders.filter(r => getDaysUntilDue(r.nextDueDate) <= 7);

  return (
    <div className="space-y-4">
      {/* Upcoming Reminders Alert */}
      {upcomingReminders.length > 0 && (
        <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-lg shadow-sm p-4 border-l-4 border-orange-500">
          <h3 className="text-base sm:text-lg font-semibold text-orange-900 mb-2">
            ⚠️ {t.reminders.upcomingReminders}
          </h3>
          <div className="space-y-2">
            {upcomingReminders.map((reminder) => (
              <div key={reminder.id} className="text-sm text-orange-800">
                <span className="font-medium">{reminder.title}</span> - {formatCurrency(reminder.amount)} - <span className={getDueDateColor(reminder.nextDueDate)}>
                  {getDueDateLabel(reminder.nextDueDate)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create/Edit Form */}
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
            🔔 {t.reminders.title}
          </h3>
          <button
            onClick={() => {
              if (showCreateForm) {
                resetForm();
              } else {
                setShowCreateForm(true);
              }
            }}
            className="px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            {showCreateForm ? t.common.cancel : `+ ${t.reminders.createReminder}`}
          </button>
        </div>

        {showCreateForm && (
          <form onSubmit={handleSubmit} className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.reminders.fields.title}
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder={t.reminders.fields.titlePlaceholder}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.reminders.fields.description}
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t.reminders.fields.descriptionPlaceholder}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.reminders.fields.amount}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder={t.reminders.fields.amountPlaceholder}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.reminders.fields.frequency}
                </label>
                <select
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value as ReminderFrequency })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="WEEKLY">{t.reminders.frequency.WEEKLY}</option>
                  <option value="MONTHLY">{t.reminders.frequency.MONTHLY}</option>
                  <option value="EVERY_6_MONTHS">{t.reminders.frequency.EVERY_6_MONTHS}</option>
                  <option value="YEARLY">{t.reminders.frequency.YEARLY}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.reminders.fields.nextDue}
              </label>
              <input
                type="date"
                value={formData.nextDueDate}
                onChange={(e) => setFormData({ ...formData, nextDueDate: e.target.value })}
                required
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {editingReminder ? t.common.save : t.common.create}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-400 transition-colors"
              >
                {t.common.cancel}
              </button>
            </div>
          </form>
        )}

        {/* Active Reminders */}
        {activeReminders.length > 0 ? (
          <div className="space-y-3">
            {activeReminders
              .sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime())
              .map((reminder) => {
                const daysUntil = getDaysUntilDue(reminder.nextDueDate);
                const isOverdue = daysUntil < 0;
                const isDueToday = daysUntil === 0;
                
                return (
                  <div
                    key={reminder.id}
                    className={`rounded-lg p-4 border-2 ${
                      isOverdue
                        ? 'bg-red-50 border-red-300'
                        : isDueToday
                        ? 'bg-orange-50 border-orange-300'
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="text-base sm:text-lg font-semibold text-gray-900">
                            {reminder.title}
                          </h4>
                          <ReminderFrequencyBadge frequency={reminder.frequency} />
                        </div>
                        
                        {reminder.description && (
                          <p className="text-sm text-gray-600 mb-2">{reminder.description}</p>
                        )}
                        
                        <p className="text-lg sm:text-xl font-bold text-indigo-600 mb-2">
                          {formatCurrency(reminder.amount)}
                        </p>
                        
                        <p className={`text-sm ${getDueDateColor(reminder.nextDueDate)}`}>
                          {isOverdue && '⚠️ '}{t.reminders.dueIn}: {getDueDateLabel(reminder.nextDueDate)}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => toggleMutation.mutate(reminder.id)}
                          disabled={toggleMutation.isPending}
                          className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 transition-colors"
                        >
                          ⏸️ {t.reminders.toggleActive}
                        </button>
                        <button
                          onClick={() => handleEdit(reminder)}
                          className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                        >
                          ✏️ {t.common.edit}
                        </button>
                        <button
                          onClick={() => handleDelete(reminder)}
                          disabled={deleteMutation.isPending}
                          className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50 transition-colors"
                        >
                          🗑️ {t.common.delete}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">{t.reminders.noActiveReminders}</p>
          </div>
        )}

        {/* Inactive Reminders */}
        {inactiveReminders.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="text-sm font-semibold text-gray-500 mb-3">{t.reminders.inactive}</h4>
            <div className="space-y-2">
              {inactiveReminders.map((reminder) => (
                <div key={reminder.id} className="rounded-lg p-3 bg-gray-50 border border-gray-200 opacity-60">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-700">{reminder.title}</p>
                      <p className="text-sm text-gray-500">{formatCurrency(reminder.amount)}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleMutation.mutate(reminder.id)}
                        disabled={toggleMutation.isPending}
                        className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50"
                      >
                        ▶️ {t.reminders.toggleActive}
                      </button>
                      <button
                        onClick={() => handleDelete(reminder)}
                        disabled={deleteMutation.isPending}
                        className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
