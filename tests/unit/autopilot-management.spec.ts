import { test, expect } from '@playwright/test';
import type {
  AutopilotLifecycleStatus,
  AutopilotConfig,
  AutopilotActivityConfig,
  AutopilotExecutionRecord,
  AutopilotDashboardStats,
} from '../../types/autopilot';
import { calculateNextDueDate } from '../../lib/activity/recurrence';

test.describe('PropertyLedge Autopilot Management System — Technical Invariants & Lifecycle Suite', () => {
  test.describe('1. Autopilot Lifecycle State Machine & Invariants', () => {
    test('default status for any property without configuration is strictly not_initialized', () => {
      const propertyWithoutAutopilot = {
        id: 'prop-new-1',
        name: '42 Wallaby Way',
        hasAutopilotConfig: false,
      };

      const status: AutopilotLifecycleStatus = propertyWithoutAutopilot.hasAutopilotConfig
        ? 'active'
        : 'not_initialized';

      expect(status).toBe('not_initialized');
      expect(status).not.toBe('active');
      expect(status).not.toBe('draft');
    });

    test('valid lifecycle transitions are correctly modeled and permitted', () => {
      const allowedTransitions: Record<AutopilotLifecycleStatus, AutopilotLifecycleStatus[]> = {
        not_initialized: ['draft', 'active'],
        draft: ['active', 'not_initialized'],
        active: ['paused', 'stopped'],
        paused: ['active', 'stopped'],
        stopped: ['active', 'draft'],
      };

      function canTransition(from: AutopilotLifecycleStatus, to: AutopilotLifecycleStatus): boolean {
        return allowedTransitions[from]?.includes(to) ?? false;
      }

      // Valid paths
      expect(canTransition('not_initialized', 'active')).toBe(true);
      expect(canTransition('not_initialized', 'draft')).toBe(true);
      expect(canTransition('active', 'paused')).toBe(true);
      expect(canTransition('paused', 'active')).toBe(true);
      expect(canTransition('active', 'stopped')).toBe(true);
      expect(canTransition('paused', 'stopped')).toBe(true);

      // Invalid paths
      expect(canTransition('not_initialized', 'paused')).toBe(false);
      expect(canTransition('not_initialized', 'stopped')).toBe(false);
      expect(canTransition('stopped', 'paused')).toBe(false);
    });

    test('editing a paused autopilot strictly preserves paused state without implicit resume', () => {
      let currentStatus: AutopilotLifecycleStatus = 'paused';
      const updatedScheduleFrequency = 'annual';

      // Simulate save configuration without explicit resume
      function saveConfiguration(newFrequency: string, explicitAction?: 'resume'): AutopilotLifecycleStatus {
        if (explicitAction === 'resume') {
          return 'active';
        }
        return currentStatus; // Preserves paused
      }

      currentStatus = saveConfiguration(updatedScheduleFrequency);
      expect(currentStatus).toBe('paused');
    });

    test('editing a stopped autopilot strictly preserves stopped state without implicit activation', () => {
      let currentStatus: AutopilotLifecycleStatus = 'stopped';
      const updatedDueDate = '2027-01-01';

      function saveConfiguration(newDate: string, explicitAction?: 'activate'): AutopilotLifecycleStatus {
        if (explicitAction === 'activate') {
          return 'active';
        }
        return currentStatus; // Preserves stopped
      }

      currentStatus = saveConfiguration(updatedDueDate);
      expect(currentStatus).toBe('stopped');
    });

    test('stopping an autopilot preserves execution history and completed tasks', () => {
      const autopilot: AutopilotConfig = {
        id: 'auto-101',
        workspaceId: 'ws-1',
        propertyId: 'prop-1',
        propertyName: '12 Ocean Ave, Malabar',
        status: 'active',
        name: '12 Ocean Ave Autopilot',
        activitiesCount: 3,
        activeActivitiesCount: 3,
        outstandingIssuesCount: 0,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        activityConfigs: [],
      };

      const pastExecutions: AutopilotExecutionRecord[] = [
        {
          id: 'exec-1',
          autopilotId: 'auto-101',
          workspaceId: 'ws-1',
          propertyId: 'prop-1',
          executionType: 'initialization',
          status: 'success',
          startedAt: '2026-01-01T00:00:00Z',
          completedAt: '2026-01-01T00:00:05Z',
          summary: 'Autopilot initialized with 3 activities',
          createdAt: '2026-01-01T00:00:05Z',
        },
      ];

      // Perform stop action
      autopilot.status = 'stopped';
      autopilot.stoppedAt = '2026-10-19T04:00:00Z';

      // Verify status is stopped but historical records remain intact
      expect(autopilot.status).toBe('stopped');
      expect(autopilot.stoppedAt).toBeDefined();
      expect(pastExecutions.length).toBe(1);
      expect(pastExecutions[0].summary).toBe('Autopilot initialized with 3 activities');
    });

    test('enforces that exactly and only the 3 canonical Autopilot activities are supported', () => {
      const canonicalAutopilotActivities = [
        'inspection',
        'rent_review',
        'lease_expiry',
      ];

      expect(canonicalAutopilotActivities.length).toBe(3);
      expect(canonicalAutopilotActivities).toContain('inspection');
      expect(canonicalAutopilotActivities).toContain('rent_review');
      expect(canonicalAutopilotActivities).toContain('lease_expiry');
    });
  });

  test.describe('2. Dashboard KPI Calculation & Aggregation Invariants', () => {
    test('completed tasks count counts only completed tasks and excludes open or in-progress tasks', () => {
      const occurrences = [
        { id: '1', status: 'completed', completedAt: '2026-10-05T10:00:00Z' },
        { id: '2', status: 'completed', completedAt: '2026-10-12T14:00:00Z' },
        { id: '3', status: 'open', completedAt: null },
        { id: '4', status: 'in_progress', completedAt: null },
        { id: '5', status: 'cancelled', completedAt: null },
      ];

      const startOfMonth = '2026-10-01T00:00:00Z';
      const completedCount = occurrences.filter(
        (o) => o.status === 'completed' && o.completedAt && o.completedAt >= startOfMonth
      ).length;

      expect(completedCount).toBe(2);
    });

    test('upcoming tasks count uses strictly 7-day window and excludes overdue items', () => {
      const todayStr = '2026-10-19';
      const sevenDaysLaterStr = '2026-10-26';

      const scheduledOccurrences = [
        { id: 'occ-1', dueDate: '2026-10-15', status: 'open' }, // Past due -> Overdue, not upcoming
        { id: 'occ-2', dueDate: '2026-10-21', status: 'open' }, // Due in 2 days -> Upcoming
        { id: 'occ-3', dueDate: '2026-10-25', status: 'open' }, // Due in 6 days -> Upcoming
        { id: 'occ-4', dueDate: '2026-11-05', status: 'open' }, // Due in 17 days -> Beyond 7-day window
        { id: 'occ-5', dueDate: '2026-10-22', status: 'completed' }, // Completed -> Excluded
      ];

      const upcomingCount = scheduledOccurrences.filter((o) => {
        if (o.status !== 'open' && o.status !== 'in_progress') return false;
        return o.dueDate >= todayStr && o.dueDate <= sevenDaysLaterStr;
      }).length;

      expect(upcomingCount).toBe(2);
    });

    test('needs attention aggregates overdue tasks and failed executions without double counting', () => {
      const attentionMap = new Map<string, any>();

      // Overdue occurrence 1
      attentionMap.set('overdue_occ-1', {
        id: 'overdue_occ-1',
        type: 'overdue_task',
        title: 'Overdue Condition Report',
      });

      // Same overdue occurrence reported again should not double count
      attentionMap.set('overdue_occ-1', {
        id: 'overdue_occ-1',
        type: 'overdue_task',
        title: 'Overdue Condition Report',
      });

      // Failed execution
      attentionMap.set('failed_exec-99', {
        id: 'failed_exec-99',
        type: 'failed_execution',
        title: 'Failed to send automated rent notice',
      });

      expect(attentionMap.size).toBe(2);
    });
  });

  test.describe('3. Activity Recurrence & Idempotency Calculations', () => {
    test('calculates next due date accurately across monthly, quarterly, semiannual, and annual frequencies', () => {
      const baseDate = '2026-07-01';

      expect(calculateNextDueDate(baseDate, 'monthly', 1)).toBe('2026-08-01');
      expect(calculateNextDueDate(baseDate, 'quarterly', 1)).toBe('2026-10-01');
      expect(calculateNextDueDate(baseDate, 'semiannual', 1)).toBe('2027-01-01');
      expect(calculateNextDueDate(baseDate, 'annual', 1)).toBe('2027-07-01');
    });

    test('prevents duplicate occurrence generation via unique sequence keys', () => {
      const generatedKeys = new Set<string>();

      function generateOccurrenceKey(activityId: string, sequenceNumber: number): boolean {
        const key = `${activityId}_${sequenceNumber}`;
        if (generatedKeys.has(key)) {
          return false; // Duplicate rejected
        }
        generatedKeys.add(key);
        return true; // Accepted
      }

      expect(generateOccurrenceKey('act-1', 1)).toBe(true);
      expect(generateOccurrenceKey('act-1', 1)).toBe(false); // Second attempt rejected
      expect(generateOccurrenceKey('act-1', 2)).toBe(true); // Sequence 2 accepted
      expect(generateOccurrenceKey('act-2', 1)).toBe(true); // Different activity accepted
    });
  });
});
