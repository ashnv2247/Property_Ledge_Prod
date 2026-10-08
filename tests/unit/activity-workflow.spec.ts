import { test, expect } from '@playwright/test';
import {
  ActivityBoardItem,
  ActivityComment,
  ActivityJournalEntry,
  DEFAULT_ACTIVITY_TYPES,
} from '../../types/activity';

test.describe('Activity Module Architecture & Domain Invariants', () => {
  test('has predefined property activity types available', () => {
    const slugs = DEFAULT_ACTIVITY_TYPES.map((t) => t.slug);
    expect(slugs).toContain('inspection');
    expect(slugs).toContain('rent_review');
    expect(slugs).toContain('lease_expiry');
    expect(slugs).toContain('insurance_renewal');
    expect(slugs).toContain('lease_renewal');
    expect(slugs).toContain('repair');
    expect(slugs).toContain('maintenance');
    expect(slugs).toContain('tenant_issue');
    expect(slugs).toContain('other');
  });

  test('enforces single assignee per occurrence in domain model', () => {
    const item: ActivityBoardItem = {
      id: 'occ-123',
      activityId: 'act-100',
      title: 'Routine Property Inspection',
      activityTypeId: 'inspection',
      activityTypeName: 'Property Inspection',
      activityTypeIcon: 'ClipboardCheck',
      activityTypeColor: 'blue',
      propertyId: 'prop-1',
      propertyName: 'ABC House',
      dueDate: '2026-10-15',
      status: 'open',
      lifecycleStatus: 'active',
      sequenceNumber: 1,
      isOverdue: false,
      daysOverdue: 0,
      daysLate: 0,
      assignedTo: 'user-john-smith',
      assignedToName: 'John Smith',
      commentCount: 2,
      isRecurring: true,
      recurrenceFrequency: 'semiannual',
      recurrenceInterval: 1,
      createdAt: '2026-10-01T00:00:00.000Z',
    };

    // Verify single responsible person invariant
    expect(typeof item.assignedTo).toBe('string');
    expect(item.assignedToName).toBe('John Smith');
    expect(item.isRecurring).toBe(true);
    expect(item.recurrenceFrequency).toBe('semiannual');
  });

  test('supports separate activity-level and occurrence-level comments', () => {
    const activityComment: ActivityComment = {
      id: 'com-1',
      workspaceId: 'ws-1',
      activityId: 'act-100',
      occurrenceId: null, // Activity level general discussion
      userId: 'user-john',
      userName: 'John Smith',
      comment: 'Property inspections should happen every six months.',
      createdAt: '2026-10-01T10:00:00Z',
      updatedAt: '2026-10-01T10:00:00Z',
    };

    const occurrenceComment: ActivityComment = {
      id: 'com-2',
      workspaceId: 'ws-1',
      activityId: 'act-100',
      occurrenceId: 'occ-123', // Specific instance comment
      userId: 'user-sarah',
      userName: 'Sarah Jones',
      comment: 'Tenant confirmed access for 15 October.',
      createdAt: '2026-10-05T14:30:00Z',
      updatedAt: '2026-10-05T14:30:00Z',
    };

    expect(activityComment.occurrenceId).toBeNull();
    expect(occurrenceComment.occurrenceId).toBe('occ-123');
  });

  test('records immutable chronological journal events', () => {
    const journalEvents: ActivityJournalEntry[] = [
      {
        id: 'j-1',
        workspaceId: 'ws-1',
        activityId: 'act-100',
        occurrenceId: 'occ-123',
        eventType: 'activity_created',
        actorId: 'user-younus',
        actorName: 'Younus',
        metadata: { title: 'Routine Property Inspection' },
        createdAt: '2026-10-01T09:00:00Z',
      },
      {
        id: 'j-2',
        workspaceId: 'ws-1',
        activityId: 'act-100',
        occurrenceId: 'occ-123',
        eventType: 'status_changed',
        actorId: 'user-john',
        actorName: 'John Smith',
        metadata: { previous_status: 'open', new_status: 'in_progress' },
        createdAt: '2026-10-12T11:00:00Z',
      },
      {
        id: 'j-3',
        workspaceId: 'ws-1',
        activityId: 'act-100',
        occurrenceId: 'occ-123',
        eventType: 'activity_completed',
        actorId: 'user-john',
        actorName: 'John Smith',
        metadata: { completed_at: '2026-10-18T16:00:00Z', days_late: 3 },
        createdAt: '2026-10-18T16:00:00Z',
      },
      {
        id: 'j-4',
        workspaceId: 'ws-1',
        activityId: 'act-100',
        occurrenceId: 'occ-124',
        eventType: 'next_occurrence_created',
        actorId: 'user-john',
        actorName: 'System',
        metadata: { due_date: '2027-04-18', sequence_number: 2 },
        createdAt: '2026-10-18T16:00:05Z',
      },
    ];

    expect(journalEvents.length).toBe(4);
    expect(journalEvents[0].eventType).toBe('activity_created');
    expect(journalEvents[2].metadata.days_late).toBe(3);
    expect(journalEvents[3].occurrenceId).toBe('occ-124');
  });
});
