import { test, expect } from '@playwright/test';
import {
  calculateNextDueDate,
  calculateOverdueAndLate,
  formatDueDateBadge,
} from '../../lib/activity/recurrence';

test.describe('Activity Recurrence & Due Date Engine', () => {
  test.describe('calculateNextDueDate', () => {
    test('calculates next weekly occurrence correctly', () => {
      const baseDate = '2026-10-15';
      const nextDate = calculateNextDueDate(baseDate, 'weekly', 1);
      expect(nextDate).toBe('2026-10-22');
    });

    test('calculates multi-week occurrence correctly', () => {
      const baseDate = '2026-10-15';
      const nextDate = calculateNextDueDate(baseDate, 'weekly', 2);
      expect(nextDate).toBe('2026-10-29');
    });

    test('calculates biweekly occurrence correctly', () => {
      const baseDate = '2026-10-01';
      const nextDate = calculateNextDueDate(baseDate, 'biweekly', 1);
      expect(nextDate).toBe('2026-10-15');
    });

    test('calculates monthly occurrence correctly', () => {
      const baseDate = '2026-10-15';
      const nextDate = calculateNextDueDate(baseDate, 'monthly', 1);
      expect(nextDate).toBe('2026-11-15');
    });

    test('calculates multi-month interval correctly', () => {
      const baseDate = '2026-01-10';
      const nextDate = calculateNextDueDate(baseDate, 'monthly', 3);
      expect(nextDate).toBe('2026-04-10');
    });

    test('calculates quarterly occurrence correctly', () => {
      const baseDate = '2026-01-15';
      const nextDate = calculateNextDueDate(baseDate, 'quarterly', 1);
      expect(nextDate).toBe('2026-04-15');
    });

    test('calculates semiannual occurrence correctly (Every 6 months)', () => {
      const baseDate = '2026-10-15';
      const nextDate = calculateNextDueDate(baseDate, 'semiannual', 1);
      expect(nextDate).toBe('2027-04-15');
    });

    test('calculates annual occurrence correctly (Every 1 year)', () => {
      const baseDate = '2026-10-15';
      const nextDate = calculateNextDueDate(baseDate, 'annual', 1);
      expect(nextDate).toBe('2027-10-15');
    });

    test('handles year-end rollover seamlessly', () => {
      const baseDate = '2026-11-20';
      const nextDate = calculateNextDueDate(baseDate, 'quarterly', 1);
      expect(nextDate).toBe('2027-02-20');
    });
  });

  test.describe('calculateOverdueAndLate', () => {
    test('identifies overdue when past due date and open', () => {
      const pastDueDate = '2026-10-01';
      // Assume today is later than Oct 1 2026
      const result = calculateOverdueAndLate(pastDueDate, 'open');
      expect(result.isOverdue).toBe(true);
      expect(result.daysOverdue).toBeGreaterThan(0);
      expect(result.daysLate).toBe(0);
    });

    test('is not overdue when status is completed', () => {
      const pastDueDate = '2026-10-01';
      const completedAt = '2026-10-04T12:00:00.000Z'; // 3 days late
      const result = calculateOverdueAndLate(pastDueDate, 'completed', completedAt);
      expect(result.isOverdue).toBe(false);
      expect(result.daysOverdue).toBe(0);
      expect(result.daysLate).toBe(3);
    });

    test('calculates 0 days late when completed on time or early', () => {
      const dueDate = '2026-10-15';
      const completedAt = '2026-10-14T09:00:00.000Z';
      const result = calculateOverdueAndLate(dueDate, 'completed', completedAt);
      expect(result.daysLate).toBe(0);
    });

    test('accurately computes exact days late for late completion', () => {
      const dueDate = '2026-10-15';
      const completedAt = '2026-10-18T10:00:00.000Z'; // 3 days late
      const result = calculateOverdueAndLate(dueDate, 'completed', completedAt);
      expect(result.daysLate).toBe(3);
    });
  });

  test.describe('formatDueDateBadge', () => {
    test('formats completed state badge', () => {
      const badge = formatDueDateBadge('2026-10-15', 'completed', 0, 0);
      expect(badge.label).toBe('Completed');
      expect(badge.variant).toBe('completed');
    });

    test('formats completed late state badge', () => {
      const badge = formatDueDateBadge('2026-10-15', 'completed', 0, 4);
      expect(badge.label).toBe('Completed 4d late');
      expect(badge.variant).toBe('completed');
    });

    test('formats overdue badge', () => {
      const badge = formatDueDateBadge('2026-10-10', 'open', 5, 0);
      expect(badge.label).toBe('5d overdue');
      expect(badge.variant).toBe('overdue');
    });
  });
});
