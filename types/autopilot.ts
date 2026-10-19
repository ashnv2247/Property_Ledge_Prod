export type AutopilotLifecycleStatus = 'not_initialized' | 'draft' | 'active' | 'paused' | 'stopped';

export type AutopilotActivityType =
  | 'inspection'
  | 'rent_review'
  | 'lease_expiry'
  | 'insurance_renewal'
  | 'lease_renewal'
  | 'repair'
  | 'maintenance'
  | 'tenant_issue'
  | 'other';

export const SUPPORTED_AUTOPILOT_ACTIVITY_TYPES = [
  'inspection',
  'rent_review',
  'lease_expiry',
  'insurance_renewal',
  'lease_renewal',
  'maintenance',
  'repair',
  'tenant_issue',
] as const;

export interface AutopilotActivityConfig {
  id: string;
  autopilotId: string;
  workspaceId: string;
  propertyId: string;
  activityTypeId: AutopilotActivityType | string;
  title: string;
  description: string;
  isEnabled: boolean;
  frequency: 'once' | 'monthly' | 'quarterly' | 'semiannual' | 'annual' | 'custom';
  interval: number;
  nextDueDate: string; // YYYY-MM-DD
  reminderDaysBefore: number;
  followupFrequencyDays?: number;
  maxFollowups?: number;
  responsiblePersonId?: string | null;
  responsiblePersonName?: string;
  status?: 'draft' | 'active';
  activityId?: string | null;
  requiresConfiguration?: boolean;
  missingFieldLabel?: string;
  metadata?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface AutopilotExecutionRecord {
  id: string;
  autopilotId: string;
  activityConfigId?: string | null;
  workspaceId: string;
  propertyId: string;
  propertyName?: string;
  activityTypeId?: string | null;
  executionType: 'initialization' | 'scheduled_run' | 'manual_trigger' | 'recurrence_generation' | 'lifecycle_change' | 'draft_generation';
  status: 'success' | 'failed' | 'skipped' | 'requires_attention';
  startedAt: string;
  completedAt?: string | null;
  summary: string;
  errorMessage?: string | null;
  taskId?: string | null;
  idempotencyKey?: string | null;
  metadata?: Record<string, any>;
  createdAt: string;
}

// Production Database Model Aliases (aligned with property_autopilots, autopilot_rules, and autopilot_run_logs)
export type PropertyAutopilot = AutopilotConfig;
export type AutopilotRule = AutopilotActivityConfig;
export type AutopilotRunLog = AutopilotExecutionRecord;

export interface AutopilotConfig {
  id: string;
  workspaceId: string;
  propertyId: string;
  propertyName: string;
  propertyAddress?: string;
  tenantName?: string;
  leaseStartDate?: string;
  leaseEndDate?: string;
  leaseType?: string;
  status: AutopilotLifecycleStatus;
  name: string;
  activatedAt?: string | null;
  pausedAt?: string | null;
  resumedAt?: string | null;
  stoppedAt?: string | null;
  lastRunAt?: string | null;
  nextRunAt?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  activitiesCount: number;
  activeActivitiesCount: number;
  draftActivitiesCount?: number;
  nextScheduledActivityName?: string | null;
  nextScheduledDueDate?: string | null;
  outstandingIssuesCount: number;
  activityConfigs: AutopilotActivityConfig[];
}

export interface AssigneePerformanceItem {
  assigneeId: string;
  assigneeName: string;
  completedCount: number;
  onTimeRate: number; // 0 to 100 percentage
  overdueCount: number;
}

export interface AutopilotDashboardStats {
  // Legacy backward-compatible fields
  activeAutopilotsCount: number;
  propertiesCoveredCount: number;
  tasksCompletedCount: number;
  tasksCompletedPeriodLabel: string;
  upcomingTasksCount: number;
  upcomingWindowDays: number;
  needsAttentionCount: number;

  // Real-time Activity-Driven Architecture KPI fields
  totalOutstanding?: number;
  completedCount?: number;
  completedOnTimeCount?: number;
  completedLateCount?: number;
  avgDaysLate?: number;
  overdueCount?: number;
  draftPendingReviewCount?: number;
  performanceByAssignee?: AssigneePerformanceItem[];
}

export interface AutopilotUpcomingActivityItem {
  id: string;
  activityConfigId?: string;
  activityId: string;
  title: string;
  activityTypeId: string;
  activityTypeName: string;
  activityTypeColor: string;
  propertyId: string;
  propertyName: string;
  propertyAddress?: string;
  dueDate: string;
  daysUntilDue: number;
  isOverdue: boolean;
  frequency: string;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  lifecycleStatus?: 'draft' | 'active' | 'archived';
  assignedToName?: string;
  assignedToId?: string;
}

export interface AutopilotNeedsAttentionItem {
  id: string;
  type: 'overdue_task' | 'failed_execution' | 'unlinked_lease' | 'configuration_error' | 'draft_pending_review';
  title: string;
  description: string;
  propertyId: string;
  propertyName: string;
  activityId?: string;
  executionId?: string;
  dueDate?: string;
  severity: 'high' | 'medium' | 'low';
  suggestedAction: string;
  actionUrl?: string;
}

export interface ActivityJournalFeedItem {
  id: string;
  activityId: string;
  propertyId: string;
  propertyName: string;
  activityTitle: string;
  activityTypeId?: string;
  eventType: string;
  actorId?: string | null;
  actorName: string;
  summary: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface AutopilotDashboardData {
  stats: AutopilotDashboardStats;
  autopilotSummaries: AutopilotConfig[];
  upcomingActivities: AutopilotUpcomingActivityItem[];
  recentActivity: AutopilotExecutionRecord[];
  journalFeed?: ActivityJournalFeedItem[];
  needsAttentionItems: AutopilotNeedsAttentionItem[];
  propertiesList: Array<{ id: string; name: string }>;
}

export interface InitializeAutopilotInput {
  propertyId: string;
  activities: Array<{
    activityTypeId: string;
    title: string;
    description?: string;
    isEnabled: boolean;
    frequency: 'once' | 'monthly' | 'quarterly' | 'semiannual' | 'annual' | 'custom';
    interval?: number;
    nextDueDate: string;
    reminderDaysBefore?: number;
    followupFrequencyDays?: number;
    maxFollowups?: number;
    assignedTo?: string;
    notes?: string;
  }>;
  activateImmediately?: boolean;
}

export interface UpdateAutopilotConfigInput {
  autopilotId: string;
  name?: string;
  activities: Array<{
    id?: string;
    activityTypeId: string;
    title: string;
    description?: string;
    isEnabled: boolean;
    frequency: 'once' | 'monthly' | 'quarterly' | 'semiannual' | 'annual' | 'custom';
    interval?: number;
    nextDueDate: string;
    reminderDaysBefore?: number;
    followupFrequencyDays?: number;
    maxFollowups?: number;
    assignedTo?: string;
    notes?: string;
  }>;
}

export interface PropertyActivityDraftItem {
  id: string;
  activityId?: string;
  typeId: AutopilotActivityType;
  title: string;
  description: string;
  isSelected: boolean;
  frequency: 'once' | 'monthly' | 'quarterly' | 'semiannual' | 'annual' | 'custom';
  frequencyLabel: string;
  nextDueDate: string;
  reminderDaysBefore: number;
  followupFrequencyDays: number;
  maxFollowups: number;
  responsiblePersonId: string | null;
  responsiblePersonName: string;
  status: 'draft' | 'active';
  requiresConfiguration: boolean;
  missingFieldLabel?: string;
  notes?: string;
  isExpanded?: boolean;
}
