import type { ReminderFrequency } from '../types';
import { useTranslation } from '../contexts/LanguageContext';

interface ReminderFrequencyBadgeProps {
  frequency: ReminderFrequency;
}

export function ReminderFrequencyBadge({ frequency }: ReminderFrequencyBadgeProps) {
  const { t } = useTranslation();

  const frequencyConfig = {
    WEEKLY: {
      icon: '📅',
      color: 'bg-blue-100 text-blue-800 border-blue-300',
      label: t.reminders.frequency.WEEKLY,
    },
    MONTHLY: {
      icon: '📆',
      color: 'bg-purple-100 text-purple-800 border-purple-300',
      label: t.reminders.frequency.MONTHLY,
    },
    YEARLY: {
      icon: '🗓️',
      color: 'bg-green-100 text-green-800 border-green-300',
      label: t.reminders.frequency.YEARLY,
    },
    EVERY_6_MONTHS: {
      icon: '📋',
      color: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      label: t.reminders.frequency.EVERY_6_MONTHS,
    },
  };

  const config = frequencyConfig[frequency];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${config.color}`}
    >
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
}
