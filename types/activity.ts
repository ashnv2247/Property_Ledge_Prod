export type ActivityLifecycleStatus = 'draft' | 'active' | 'archived';

export type OccurrenceStatus = 'open' | 'in_progress' | 'delayed' | 'completed' | 'cancelled';

export type RecurrenceFrequency =
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'quarterly'
  | 'semiannual'
  | 'annual'
  | 'custom';

export type JournalEventType =
  | 'activity_created'
  | 'activity_updated'
  | 'activity_made_live'
  | 'activity_archived'
  | 'occurrence_created'
  | 'assignee_changed'
  | 'due_date_changed'
  | 'status_changed'
  | 'comment_added'
  | 'activity_completed'
  | 'next_occurrence_created';

export interface ActivityType {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  description?: string | null;
  isSystem: boolean;
  workspaceId?: string | null;
}

export const DEFAULT_ACTIVITY_TYPES: ActivityType[] = [
  {
    id: 'inspection',
    name: 'Property Inspection',
    slug: 'inspection',
    icon: 'Home',
    color: 'sky',
    description: 'Routine, move-in, or move-out property condition inspection',
    isSystem: true,
  },
  {
    id: 'rent_review',
    name: 'Rent Review',
    slug: 'rent_review',
    icon: 'DollarSign',
    color: 'emerald',
    description: 'Periodic market rent review and lease adjustment',
    isSystem: true,
  },
  {
    id: 'lease_expiry',
    name: 'Lease Expiry',
    slug: 'lease_expiry',
    icon: 'Calendar',
    color: 'amber',
    description: 'Upcoming lease end date and tenant transition tracking',
    isSystem: true,
  },
  {
    id: 'insurance_renewal',
    name: 'Insurance Renewal',
    slug: 'insurance_renewal',
    icon: 'Shield',
    color: 'violet',
    description: 'Landlord and building insurance policy renewal',
    isSystem: true,
  },
  {
    id: 'lease_renewal',
    name: 'Lease Renewal',
    slug: 'lease_renewal',
    icon: 'FileText',
    color: 'indigo',
    description: 'Tenant lease renewal agreement negotiation & signing',
    isSystem: true,
  },
  {
    id: 'repair',
    name: 'Repair',
    slug: 'repair',
    icon: 'Wrench',
    color: 'rose',
    description: 'Specific appliance or structural repair request',
    isSystem: true,
  },
  {
    id: 'maintenance',
    name: 'Maintenance Issue',
    slug: 'maintenance',
    icon: 'Hammer',
    color: 'orange',
    description: 'Scheduled maintenance, garden care, gutters, smoke alarms',
    isSystem: true,
  },
  {
    id: 'tenant_issue',
    name: 'Tenant Issue',
    slug: 'tenant_issue',
    icon: 'User',
    color: 'purple',
    description: 'Tenant inquiry, complaint, noise or access issue',
    isSystem: true,
  },
  {
    id: 'other',
    name: 'General Activity',
    slug: 'other',
    icon: 'CheckSquare',
    color: 'slate',
    description: 'General landlord or property activity',
    isSystem: true,
  },
];

export interface Activity {
  id: string;
  workspaceId: string;
  propertyId: string;
  leaseId?: string | null;
  tenantId?: string | null;
  activityTypeId: string;
  title: string;
  description?: string | null;
  lifecycleStatus: ActivityLifecycleStatus;
  createdBy?: string | null;
  ownerId?: string | null;
  isRecurring: boolean;
  recurrenceEnabled: boolean;
  recurrenceFrequency?: RecurrenceFrequency | null;
  recurrenceInterval: number;
  recurrenceStartDate?: string | null;
  recurrenceEndDate?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityOccurrence {
  id: string;
  activityId: string;
  workspaceId: string;
  propertyId: string;
  dueDate: string;
  assignedTo?: string | null;
  status: OccurrenceStatus;
  completedAt?: string | null;
  completedBy?: string | null;
  completionNotes?: string | null;
  sequenceNumber: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityComment {
  id: string;
  workspaceId: string;
  activityId: string;
  occurrenceId?: string | null;
  userId: string;
  userName?: string;
  userAvatarUrl?: string | null;
  comment: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityJournalEntry {
  id: string;
  workspaceId: string;
  activityId: string;
  occurrenceId?: string | null;
  eventType: JournalEventType;
  actorId?: string | null;
  actorName?: string | null;
  actorAvatarUrl?: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

/**
 * High-performance composite item used across the Activity Board, List, and Calendar.
 */
export interface ActivityBoardItem {
  id: string; // Occurrence ID
  activityId: string;
  title: string;
  description?: string | null;
  activityTypeId: string;
  activityTypeName: string;
  activityTypeIcon: string;
  activityTypeColor: string;
  propertyId: string;
  propertyName: string;
  propertyAddress?: string | null;
  leaseId?: string | null;
  tenantId?: string | null;
  tenantName?: string | null;
  dueDate: string;
  status: OccurrenceStatus;
  isOverdue: boolean;
  daysOverdue: number;
  completedAt?: string | null;
  completedBy?: string | null;
  completedByName?: string | null;
  completionNotes?: string | null;
  daysLate: number;
  assignedTo?: string | null;
  assignedToName?: string | null;
  assignedToAvatarUrl?: string | null;
  isRecurring: boolean;
  recurrenceFrequency?: RecurrenceFrequency | null;
  recurrenceInterval?: number;
  isAutoCreated?: boolean;
  autoSource?: string | null;
  sequenceNumber: number;
  commentCount: number;
  lifecycleStatus: ActivityLifecycleStatus;
  createdAt: string;
}

export interface ActivityDetailData {
  activity: Activity;
  currentOccurrence: ActivityOccurrence;
  activityType: ActivityType;
  property: {
    id: string;
    name: string;
    addressLine1: string;
    city?: string;
    state?: string;
    postcode?: string;
  };
  lease?: {
    id: string;
    tenantName?: string;
    startDate?: string;
    endDate?: string;
  } | null;
  tenant?: {
    id: string;
    name: string;
    email?: string;
  } | null;
  assignedUser?: {
    id: string;
    name: string;
    avatarUrl?: string | null;
    email?: string;
  } | null;
  completedByUser?: {
    id: string;
    name: string;
  } | null;
  occurrences: ActivityOccurrence[];
  comments: ActivityComment[];
  journal: ActivityJournalEntry[];
  daysOverdue: number;
  daysLate: number;
}

export interface ActivityStats {
  total: number;
  dueTodayCount: number;
  dueSoonCount: number;
  overdueCount: number;
  inProgressCount: number;
  upcomingCount: number;
  completedCount: number;
  draftCount: number;
}

export interface ActivityFilters {
  propertyId?: string | 'all';
  assignedTo?: string | 'all';
  activityTypeId?: string | 'all';
  status?: string | 'all';
  searchQuery?: string;
  viewMode?: 'board' | 'list' | 'calendar' | 'my' | 'review';
  sortBy?: 'due_date_asc' | 'due_date_desc' | 'created_desc' | 'title_asc';
}

export interface CreateActivityInput {
  title: string;
  description?: string;
  activityTypeId: string;
  propertyId: string;
  leaseId?: string;
  tenantId?: string;
  dueDate: string;
  assignedTo?: string;
  isRecurring?: boolean;
  recurrenceFrequency?: RecurrenceFrequency;
  recurrenceInterval?: number;
  lifecycleStatus?: ActivityLifecycleStatus;
}

export interface UpdateActivityInput {
  title?: string;
  description?: string;
  activityTypeId?: string;
  propertyId?: string;
  leaseId?: string | null;
  tenantId?: string | null;
  isRecurring?: boolean;
  recurrenceFrequency?: RecurrenceFrequency | null;
  recurrenceInterval?: number;
  lifecycleStatus?: ActivityLifecycleStatus;
}

export interface CompleteOccurrenceInput {
  occurrenceId: string;
  completionDate?: string;
  completionNotes?: string;
}
