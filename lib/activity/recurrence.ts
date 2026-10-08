import { addDays, addWeeks, addMonths, addYears, format, parseISO, isValid } from 'date-fns';
import type { RecurrenceFrequency } from '@/types/activity';

/**
 * Calculates the next occurrence due date based on frequency and interval.
 * Uses the previous scheduled due date as the baseline to preserve recurring cadence.
 */
export function calculateNextDueDate(
  baseDueDateStr: string,
  frequency: RecurrenceFrequency,
  interval: number = 1
): string {
  const baseDate = parseISO(baseDueDateStr);
  const safeInterval = Math.max(1, interval || 1);

  if (!isValid(baseDate)) {
    return format(addMonths(new Date(), safeInterval), 'yyyy-MM-dd');
  }

  let nextDate: Date;

  switch (frequency) {
    case 'weekly':
      nextDate = addWeeks(baseDate, safeInterval);
      break;
    case 'biweekly':
      nextDate = addWeeks(baseDate, safeInterval * 2);
      break;
    case 'monthly':
      nextDate = addMonths(baseDate, safeInterval);
      break;
    case 'quarterly':
      nextDate = addMonths(baseDate, safeInterval * 3);
      break;
    case 'semiannual':
      nextDate = addMonths(baseDate, safeInterval * 6);
      break;
    case 'annual':
      nextDate = addYears(baseDate, safeInterval);
      break;
    case 'custom':
    default:
      nextDate = addMonths(baseDate, safeInterval);
      break;
  }

  return format(nextDate, 'yyyy-MM-dd');
}

/**
 * Calculate overdue days and late days accurately.
 */
export function calculateOverdueAndLate(
  dueDateStr: string,
  status: string,
  completedAtStr?: string | null
): {
  isOverdue: boolean;
  daysOverdue: number;
  daysLate: number;
} {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDate = parseISO(dueDateStr);
  dueDate.setHours(0, 0, 0, 0);

  if (!isValid(dueDate)) {
    return { isOverdue: false, daysOverdue: 0, daysLate: 0 };
  }

  const diffDays = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

  if (status === 'completed' && completedAtStr) {
    const completedDate = parseISO(completedAtStr);
    completedDate.setHours(0, 0, 0, 0);

    const lateDays = Math.max(
      0,
      Math.floor((completedDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
    );

    return {
      isOverdue: false,
      daysOverdue: 0,
      daysLate: lateDays,
    };
  }

  const isOverdue = diffDays > 0 && status !== 'completed' && status !== 'cancelled';
  const daysOverdue = isOverdue ? diffDays : 0;

  return {
    isOverdue,
    daysOverdue,
    daysLate: 0,
  };
}

/**
 * Human-friendly recurrence description.
 */
export function formatRecurrenceLabel(
  frequency?: RecurrenceFrequency | null,
  interval: number = 1
): string {
  if (!frequency) return 'One-time activity';

  switch (frequency) {
    case 'weekly':
      return interval === 1 ? 'Every week' : `Every ${interval} weeks`;
    case 'biweekly':
      return 'Every 2 weeks';
    case 'monthly':
      return interval === 1 ? 'Every month' : `Every ${interval} months`;
    case 'quarterly':
      return 'Every 3 months (Quarterly)';
    case 'semiannual':
      return 'Every 6 months (Semi-annually)';
    case 'annual':
      return interval === 1 ? 'Every year' : `Every ${interval} years`;
    case 'custom':
      return `Custom (${interval} units)`;
    default:
      return 'Recurring';
  }
}

/**
 * Format badge presentation for due date & status.
 */
export function formatDueDateBadge(
  dueDateStr: string,
  status: string,
  daysOverdue: number = 0,
  daysLate: number = 0
): {
  label: string;
  variant: 'overdue' | 'dueToday' | 'dueSoon' | 'upcoming' | 'completed' | 'neutral';
} {
  if (status === 'completed') {
    if (daysLate > 0) {
      return { label: `Completed ${daysLate}d late`, variant: 'completed' };
    }
    return { label: 'Completed', variant: 'completed' };
  }

  if (daysOverdue > 0) {
    return { label: `${daysOverdue}d overdue`, variant: 'overdue' };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDate = parseISO(dueDateStr);
  dueDate.setHours(0, 0, 0, 0);

  if (!isValid(dueDate)) {
    return { label: 'No date', variant: 'neutral' };
  }

  const diffDays = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return { label: 'Due today', variant: 'dueToday' };
  } else if (diffDays === 1) {
    return { label: 'Due tomorrow', variant: 'dueSoon' };
  } else if (diffDays > 1 && diffDays <= 5) {
    return { label: `Due in ${diffDays}d`, variant: 'dueSoon' };
  }

  return { label: `Due ${format(dueDate, 'd MMM')}`, variant: 'upcoming' };
}

