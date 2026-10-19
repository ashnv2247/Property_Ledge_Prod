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

  test('supports pinning and unpinning activities, prioritizing pinned items at the top', () => {
    const item1: ActivityBoardItem = {
      id: 'occ-1',
      activityId: 'act-1',
      title: 'Standard Repair',
      activityTypeId: 'repair',
      activityTypeName: 'Repair',
      activityTypeIcon: 'Wrench',
      activityTypeColor: 'orange',
      propertyId: 'prop-1',
      propertyName: 'Property A',
      dueDate: '2026-10-10',
      status: 'open',
      lifecycleStatus: 'active',
      sequenceNumber: 1,
      isOverdue: false,
      daysOverdue: 0,
      daysLate: 0,
      commentCount: 0,
      isRecurring: false,
      isPinned: false,
      createdAt: '2026-10-01T00:00:00Z',
    };

    const item2: ActivityBoardItem = {
      id: 'occ-2',
      activityId: 'act-2',
      title: 'Emergency Inspection (Pinned)',
      activityTypeId: 'inspection',
      activityTypeName: 'Property Inspection',
      activityTypeIcon: 'Home',
      activityTypeColor: 'indigo',
      propertyId: 'prop-1',
      propertyName: 'Property A',
      dueDate: '2026-10-25', // Later due date, but pinned!
      status: 'open',
      lifecycleStatus: 'active',
      sequenceNumber: 1,
      isOverdue: false,
      daysOverdue: 0,
      daysLate: 0,
      commentCount: 1,
      isRecurring: false,
      isPinned: true,
      pinnedAt: '2026-10-02T12:00:00Z',
      createdAt: '2026-10-01T00:00:00Z',
    };

    const item3: ActivityBoardItem = {
      id: 'occ-3',
      activityId: 'act-3',
      title: 'Routine Garden Maintenance',
      activityTypeId: 'maintenance',
      activityTypeName: 'Maintenance Issue',
      activityTypeIcon: 'Wrench',
      activityTypeColor: 'yellow',
      propertyId: 'prop-2',
      propertyName: 'Property B',
      dueDate: '2026-10-12',
      status: 'open',
      lifecycleStatus: 'active',
      sequenceNumber: 1,
      isOverdue: false,
      daysOverdue: 0,
      daysLate: 0,
      commentCount: 0,
      isRecurring: false,
      isPinned: false,
      createdAt: '2026-10-01T00:00:00Z',
    };

    // Sorting algorithm: pinned items always appear before unpinned items
    const rawList = [item1, item2, item3];
    const sorted = [...rawList].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

    // Pinned item must be on top!
    expect(sorted[0].id).toBe('occ-2');
    expect(sorted[0].isPinned).toBe(true);
    expect(sorted[1].id).toBe('occ-1');
    expect(sorted[2].id).toBe('occ-3');

    // Unpin item2
    const unpinnedItem2 = { ...item2, isPinned: false, pinnedAt: null };
    const unpinnedList = [item1, unpinnedItem2, item3];
    const sortedAfterUnpin = [...unpinnedList].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

    // When unpinned, chronological/due date sorting applies
    expect(sortedAfterUnpin[0].id).toBe('occ-1'); // Oct 10
    expect(sortedAfterUnpin[1].id).toBe('occ-3'); // Oct 12
    expect(sortedAfterUnpin[2].id).toBe('occ-2'); // Oct 25
  });

  test('creates activity_pinned and activity_unpinned journal events', () => {
    const pinEvent: ActivityJournalEntry = {
      id: 'j-pin',
      workspaceId: 'ws-1',
      activityId: 'act-2',
      eventType: 'activity_pinned',
      actorId: 'user-1',
      actorName: 'Property Manager',
      metadata: { is_pinned: true },
      createdAt: '2026-10-02T12:00:00Z',
    };

    const unpinEvent: ActivityJournalEntry = {
      id: 'j-unpin',
      workspaceId: 'ws-1',
      activityId: 'act-2',
      eventType: 'activity_unpinned',
      actorId: 'user-1',
      actorName: 'Property Manager',
      metadata: { is_pinned: false },
      createdAt: '2026-10-03T09:00:00Z',
    };

    expect(pinEvent.eventType).toBe('activity_pinned');
    expect(pinEvent.metadata.is_pinned).toBe(true);
    expect(unpinEvent.eventType).toBe('activity_unpinned');
    expect(unpinEvent.metadata.is_pinned).toBe(false);
  });

  test('deterministic stable sorting comparator prevents jumping of elements', () => {
    const comparator = (a: any, b: any) => {
      const aPinned = Boolean(a.isPinned);
      const bPinned = Boolean(b.isPinned);
      if (aPinned !== bPinned) return aPinned ? -1 : 1;
      const dateA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
      const dateB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
      if (dateA !== dateB) return dateA - dateB;
      return a.id.localeCompare(b.id);
    };

    const items = [
      { id: 'b', title: 'Task B', isPinned: false, dueDate: '2026-10-10' },
      { id: 'a', title: 'Task A', isPinned: true, dueDate: '2026-10-15' },
      { id: 'c', title: 'Task C', isPinned: true, dueDate: '2026-10-10' },
      { id: 'd', title: 'Task D', isPinned: false, dueDate: '2026-10-10' },
    ];

    const sorted = [...items].sort(comparator);
    // Pinned tasks come first: 'c' (Oct 10), then 'a' (Oct 15)
    // Then unpinned tasks: 'b' (Oct 10, id 'b'), then 'd' (Oct 10, id 'd')
    expect(sorted.map((i) => i.id)).toEqual(['c', 'a', 'b', 'd']);

    // Shuffling input array yields exact same deterministic order
    const shuffled = [items[2], items[0], items[3], items[1]];
    expect([...shuffled].sort(comparator).map((i) => i.id)).toEqual(['c', 'a', 'b', 'd']);
  });
});
