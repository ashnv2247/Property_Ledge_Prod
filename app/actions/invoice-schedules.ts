'use server';

import { revalidatePath } from 'next/cache';
import { resolveWorkspaceContext } from '@/lib/workspace/context';
import { getCurrentUser } from '@/lib/auth/queries';
import { invoiceScheduleService } from '@/lib/invoices/schedule-service';
import {
  CreateScheduleEmailInput,
  CreateIndividualInvoiceEmailInput,
  ScheduleEmailFilters,
  InvoiceEmailScheduleDTO,
  ScheduleEmailStatsDTO,
} from '@/modules/invoices/domain/entities/invoice-schedule';

async function getAuthContext() {
  const [user, context] = await Promise.all([
    getCurrentUser(),
    resolveWorkspaceContext(),
  ]);

  if (!user || !context) {
    throw new Error('Unauthorized or no active workspace');
  }

  return { user, context };
}

/**
 * Creates a recurring invoice email schedule and bulk-generates all independent monthly invoices.
 */
export async function createInvoiceScheduleAction(
  input: CreateScheduleEmailInput
): Promise<{ success: boolean; schedule?: InvoiceEmailScheduleDTO; count?: number; error?: string }> {
  try {
    const { user, context } = await getAuthContext();

    const res = await invoiceScheduleService.createSchedule(
      input,
      user.id,
      context.workspaceId
    );

    revalidatePath('/dashboard/invoices');
    revalidatePath('/dashboard/invoices/schedule-email');

    return {
      success: true,
      schedule: res.schedule,
      count: res.generatedCount,
    };
  } catch (err: any) {
    console.error('[createInvoiceScheduleAction] Error:', err);
    return {
      success: false,
      error: err.message || 'Failed to create invoice email schedule',
    };
  }
}

/** Schedules one-time delivery of one or more existing invoices. */
export async function createIndividualInvoiceEmailAction(input: CreateIndividualInvoiceEmailInput) {
  try {
    const { context } = await getAuthContext();
    const result = await invoiceScheduleService.createIndividualEmailJobs(input, context.workspaceId);
    revalidatePath('/dashboard/invoices');
    return { success: true, ...result };
  } catch (err: any) {
    console.error('[createIndividualInvoiceEmailAction] Error:', err);
    return { success: false, scheduled: [], skipped: [], error: err.message || 'Failed to schedule invoice email' };
  }
}

export async function fetchIndividualInvoiceEmailJobsAction(limit: number = 100) {
  try {
    const { context } = await getAuthContext();
    return { success: true, items: await invoiceScheduleService.getIndividualEmailJobs(context.workspaceId, limit) };
  } catch (err: any) {
    console.error('[fetchIndividualInvoiceEmailJobsAction] Error:', err);
    return { success: false, items: [], error: err.message || 'Failed to load scheduled invoice emails' };
  }
}

export async function cancelIndividualInvoiceEmailAction(jobId: string) {
  try {
    const { context } = await getAuthContext();
    const job = await invoiceScheduleService.cancelIndividualEmailJob(jobId, context.workspaceId);
    revalidatePath('/dashboard/invoices');
    return { success: true, job };
  } catch (err: any) {
    console.error('[cancelIndividualInvoiceEmailAction] Error:', err);
    return { success: false, error: err.message || 'Failed to cancel scheduled invoice email' };
  }
}

export async function rescheduleInvoiceEmailJobAction(jobId: string, sendDate: string) {
  try {
    const { context } = await getAuthContext();
    const job = await invoiceScheduleService.rescheduleEmailJob(jobId, sendDate, context.workspaceId);
    revalidatePath('/dashboard/invoices');
    revalidatePath('/dashboard/invoices/schedule-email');
    return { success: true, job };
  } catch (err: any) {
    console.error('[rescheduleInvoiceEmailJobAction] Error:', err);
    return { success: false, error: err.message || 'Failed to change scheduled email date' };
  }
}

/**
 * Fetches recurring email schedules for the active workspace.
 */
export async function fetchInvoiceSchedulesAction(
  filters?: ScheduleEmailFilters
): Promise<{ items: InvoiceEmailScheduleDTO[]; total: number }> {
  try {
    const { context } = await getAuthContext();
    return await invoiceScheduleService.getSchedules(context.workspaceId, filters);
  } catch (err: any) {
    console.error('[fetchInvoiceSchedulesAction] Error:', err);
    return { items: [], total: 0 };
  }
}

/**
 * Fetches dynamic summary statistics for the Schedule Email logs page.
 */
export async function fetchInvoiceScheduleStatsAction(): Promise<ScheduleEmailStatsDTO> {
  try {
    const { context } = await getAuthContext();
    return await invoiceScheduleService.getScheduleStats(context.workspaceId);
  } catch (err: any) {
    console.error('[fetchInvoiceScheduleStatsAction] Error:', err);
    return {
      totalSchedules: 0,
      totalInvoicesGenerated: 0,
      emailsSent: 0,
      emailsPending: 0,
      emailsFailed: 0,
    };
  }
}

/**
 * Fetches full schedule details including generated invoices and delivery activity logs.
 */
export async function fetchInvoiceScheduleDetailsAction(scheduleId: string) {
  try {
    const { context } = await getAuthContext();
    const data = await invoiceScheduleService.getScheduleDetails(scheduleId, context.workspaceId);
    return { success: true, data };
  } catch (err: any) {
    console.error('[fetchInvoiceScheduleDetailsAction] Error:', err);
    return { success: false, error: err.message || 'Failed to fetch schedule details' };
  }
}

/**
 * Pauses an active schedule.
 */
export async function pauseInvoiceScheduleAction(scheduleId: string) {
  try {
    const { context } = await getAuthContext();
    const schedule = await invoiceScheduleService.pauseSchedule(scheduleId, context.workspaceId);
    revalidatePath('/dashboard/invoices/schedule-email');
    return { success: true, schedule };
  } catch (err: any) {
    console.error('[pauseInvoiceScheduleAction] Error:', err);
    return { success: false, error: err.message || 'Failed to pause schedule' };
  }
}

/**
 * Resumes a paused schedule.
 */
export async function resumeInvoiceScheduleAction(scheduleId: string) {
  try {
    const { context } = await getAuthContext();
    const schedule = await invoiceScheduleService.resumeSchedule(scheduleId, context.workspaceId);
    revalidatePath('/dashboard/invoices/schedule-email');
    return { success: true, schedule };
  } catch (err: any) {
    console.error('[resumeInvoiceScheduleAction] Error:', err);
    return { success: false, error: err.message || 'Failed to resume schedule' };
  }
}

/**
 * Cancels a schedule and cancels future jobs.
 */
export async function cancelInvoiceScheduleAction(scheduleId: string) {
  try {
    const { context } = await getAuthContext();
    const schedule = await invoiceScheduleService.cancelSchedule(scheduleId, context.workspaceId);
    revalidatePath('/dashboard/invoices/schedule-email');
    return { success: true, schedule };
  } catch (err: any) {
    console.error('[cancelInvoiceScheduleAction] Error:', err);
    return { success: false, error: err.message || 'Failed to cancel schedule' };
  }
}

/**
 * Retries a failed email delivery job.
 */
export async function retryScheduledEmailJobAction(jobId: string) {
  try {
    const { context } = await getAuthContext();
    const res = await invoiceScheduleService.retryEmailJob(jobId, context.workspaceId);
    revalidatePath('/dashboard/invoices');
    revalidatePath('/dashboard/invoices/schedule-email');
    return res;
  } catch (err: any) {
    console.error('[retryScheduledEmailJobAction] Error:', err);
    return { success: false, error: err.message || 'Failed to retry email delivery' };
  }
}

/**
 * Triggers processing of due scheduled email jobs (can be invoked by cron or test buttons).
 */
export async function triggerProcessDueSchedulesAction(): Promise<{
  success: boolean;
  processed?: number;
  succeeded?: number;
  failed?: number;
  error?: string;
}> {
  try {
    await getAuthContext();
    const res = await invoiceScheduleService.processDueScheduledJobs(25);
    revalidatePath('/dashboard/invoices');
    revalidatePath('/dashboard/invoices/schedule-email');
    return { success: true, ...res };
  } catch (err: any) {
    console.error('[triggerProcessDueSchedulesAction] Error:', err);
    return { success: false, error: err.message || 'Failed to process due schedules' };
  }
}

