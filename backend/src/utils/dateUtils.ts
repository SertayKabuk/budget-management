/**
 * Date utility functions for recurring reminder calculations
 */

export type ReminderFrequency = 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'EVERY_6_MONTHS';

/**
 * Calculate the next due date based on the current date and frequency
 * @param currentDate - The current due date
 * @param frequency - The frequency of the reminder
 * @returns The next due date
 */
export function calculateNextDueDate(currentDate: Date, frequency: ReminderFrequency): Date {
  const nextDate = new Date(currentDate);
  
  switch (frequency) {
    case 'WEEKLY':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
      
    case 'MONTHLY':
      // Add 1 month, handling month-end edge cases
      const currentMonth = nextDate.getMonth();
      const currentDay = nextDate.getDate();
      
      nextDate.setMonth(currentMonth + 1);
      
      // If the day changed (e.g., Jan 31 -> Feb 28), set to last day of month
      if (nextDate.getDate() < currentDay) {
        nextDate.setDate(0); // Go to last day of previous month
      }
      break;
      
    case 'EVERY_6_MONTHS':
      // Add 6 months, handling month-end edge cases
      const current6Month = nextDate.getMonth();
      const current6Day = nextDate.getDate();
      
      nextDate.setMonth(current6Month + 6);
      
      // If the day changed, set to last day of month
      if (nextDate.getDate() < current6Day) {
        nextDate.setDate(0);
      }
      break;
      
    case 'YEARLY':
      // Add 1 year, handling leap year edge case (Feb 29)
      const currentYear = nextDate.getFullYear();
      nextDate.setFullYear(currentYear + 1);
      
      // If we had Feb 29 and next year doesn't have it, adjust to Feb 28
      if (nextDate.getMonth() !== currentDate.getMonth()) {
        nextDate.setDate(0); // Go back to Feb 28
      }
      break;
      
    default:
      throw new Error(`Invalid frequency: ${frequency}`);
  }
  
  return nextDate;
}

/**
 * Calculate how many days until a due date
 * @param dueDate - The due date
 * @returns Number of days (negative if overdue)
 */
export function daysUntilDue(dueDate: Date): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  
  const diffTime = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

/**
 * Check if a reminder is overdue
 * @param dueDate - The due date
 * @returns True if overdue
 */
export function isOverdue(dueDate: Date): boolean {
  return daysUntilDue(dueDate) < 0;
}

/**
 * Check if a reminder is due today
 * @param dueDate - The due date
 * @returns True if due today
 */
export function isDueToday(dueDate: Date): boolean {
  return daysUntilDue(dueDate) === 0;
}

/**
 * Check if a reminder is due within the next N days
 * @param dueDate - The due date
 * @param days - Number of days to check
 * @returns True if due within the specified days
 */
export function isDueWithinDays(dueDate: Date, days: number): boolean {
  const daysUntil = daysUntilDue(dueDate);
  return daysUntil >= 0 && daysUntil <= days;
}
