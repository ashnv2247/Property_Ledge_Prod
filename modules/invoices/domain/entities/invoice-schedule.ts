/**
 * Domain Entities and Value Objects for Recurring Invoice Email Schedules
 * and Delivery Tracking.
 */

export type ScheduleEmailMode = 'automatic' | 'manual';

export type ScheduleStatus = 'active' | 'completed' | 'paused' | 'cancelled' | 'failed';

export type EmailDeliveryStatus = 'scheduled' | 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled';

export type InvoiceEmailJobType = 'recurring' | 'individual';

export interface InvoiceEmailScheduleDTO {
  id: string;
  workspaceId: string;
  sourceInvoiceId?: string | null;
  propertyId?: string | null;
  tenantId?: string | null;
  leaseId?: string | null;
  
  recipientName: string;
  recipientEmail: string;
  
  billingStartMonth: string; // YYYY-MM
  billingEndMonth: string;   // YYYY-MM
  frequency: string;         // 'monthly'
  generationDayOfMonth: number;
  dueDaysAfter: number;
  dueDateFixed?: number | null;
  timezone: string;
  
  emailMode: ScheduleEmailMode;
  status: ScheduleStatus;
  
  invoicesGeneratedCount: number;
  emailsSentCount: number;
  emailsPendingCount: number;
  emailsFailedCount: number;
  
  subjectTemplate?: string | null;
  customMessage?: string | null;
  driveFolderUrl?: string | null;
  notes?: string | null;
  
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  
  // Enriched presentation fields
  sourceInvoiceNumber?: string;
  propertyName?: string;
  tenantName?: string;
}

export interface InvoiceScheduledEmailJobDTO {
  id: string;
  workspaceId: string;
  scheduleId?: string | null;
  invoiceId: string;
  jobType: InvoiceEmailJobType;
  
  recipientEmail: string;
  recipientName?: string | null;
  
  billingMonth: string; // YYYY-MM
  scheduledSendDate: string;
  attemptedAt?: string | null;
  deliveredAt?: string | null;
  
  status: EmailDeliveryStatus;
  attempts: number;
  maxAttempts: number;
  failureReason?: string | null;
  providerMessageId?: string | null;
  
  subject?: string | null;
  customMessage?: string | null;
  
  createdAt: string;
  updatedAt: string;
  
  // Enriched presentation fields
  invoiceNumber?: string;
  invoiceTotal?: number;
  invoiceStatus?: string;
  invoiceDueDate?: string;
}

export interface CreateIndividualInvoiceEmailInput {
  invoiceIds: string[];
  sendDate: string; // YYYY-MM-DD in Australia/Sydney
  subject?: string;
  customMessage?: string;
}

export interface IndividualInvoiceEmailResult {
  scheduled: InvoiceScheduledEmailJobDTO[];
  skipped: Array<{ invoiceId: string; invoiceNumber?: string; reason: string }>;
}

export interface ScheduleEmailStatsDTO {
  totalSchedules: number;
  totalInvoicesGenerated: number;
  emailsSent: number;
  emailsPending: number;
  emailsFailed: number;
}

export interface CreateScheduleEmailInput {
  sourceInvoiceId: string;
  startMonth: string; // YYYY-MM, e.g. '2027-01'
  endMonth: string;   // YYYY-MM, e.g. '2027-12'
  frequency?: 'monthly';
  generationDayOfMonth?: number;
  dueDaysAfter?: number;
  dueDateFixed?: number | null;
  timezone?: string;
  emailMode: ScheduleEmailMode;
  subjectTemplate?: string;
  customMessage?: string;
  driveFolderUrl?: string;
  notes?: string;
}

export interface ScheduleEmailFilters {
  search?: string;
  status?: string;
  emailMode?: string;
  propertyId?: string;
  tenantId?: string;
  page?: number;
  limit?: number;
  sortBy?: 'created_at' | 'billing_start_month' | 'invoices_generated_count';
  sortOrder?: 'asc' | 'desc';
}

