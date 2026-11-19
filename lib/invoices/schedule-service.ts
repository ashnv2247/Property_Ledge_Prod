import { createAdminClient } from '@/lib/supabase/server';
import { serverCache } from '@/lib/cache/server-cache';
import { requestCache } from '@/lib/cache/request-cache';
import {
  InvoiceEmailScheduleDTO,
  InvoiceScheduledEmailJobDTO,
  ScheduleEmailStatsDTO,
  CreateScheduleEmailInput,
  ScheduleEmailFilters,
} from '@/modules/invoices/domain/entities/invoice-schedule';
import { container } from '@/composition/container';
import { PdfInvoiceAdapter } from '@/modules/invoices/infrastructure/documents/pdf/pdf-invoice-adapter';
import { invoiceEmailAdapter } from '@/modules/invoices/infrastructure/email/invoice-email-adapter';

/**
 * Parses YYYY-MM into year and month (1-indexed).
 */
function parseYearMonth(ym: string): { year: number; month: number } {
  const [yStr, mStr] = ym.split('-');
  return { year: parseInt(yStr, 10), month: parseInt(mStr, 10) };
}

/**
 * Returns an array of YYYY-MM strings between start and end inclusive.
 */
function getMonthRange(startYM: string, endYM: string): string[] {
  const start = parseYearMonth(startYM);
  const end = parseYearMonth(endYM);

  const months: string[] = [];
  let curYear = start.year;
  let curMonth = start.month;

  while (curYear < end.year || (curYear === end.year && curMonth <= end.month)) {
    const ymStr = `${curYear}-${String(curMonth).padStart(2, '0')}`;
    months.push(ymStr);

    curMonth++;
    if (curMonth > 12) {
      curMonth = 1;
      curYear++;
    }
  }

  return months;
}

/**
 * Computes last day of a given month.
 */
function getLastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Generates an issue date, due date, and billing period range for a given month.
 */
function computeInvoiceDates(
  yearMonth: string,
  generationDayOfMonth: number = 1,
  dueDaysAfter: number = 7,
  dueDateFixed?: number | null
): {
  issueDate: string;
  dueDate: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
} {
  const { year, month } = parseYearMonth(yearMonth);
  const lastDay = getLastDayOfMonth(year, month);

  const genDay = Math.min(Math.max(1, generationDayOfMonth), lastDay);
  const issueDateObj = new Date(Date.UTC(year, month - 1, genDay));
  const issueDate = issueDateObj.toISOString().split('T')[0];

  let dueDate: string;
  if (dueDateFixed && dueDateFixed >= 1 && dueDateFixed <= 31) {
    const fixDay = Math.min(dueDateFixed, lastDay);
    const fixedDueObj = new Date(Date.UTC(year, month - 1, fixDay));
    // If fixed due date is before issue date, push to next month
    if (fixedDueObj < issueDateObj) {
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;
      const nextLastDay = getLastDayOfMonth(nextYear, nextMonth);
      const nextFixDay = Math.min(dueDateFixed, nextLastDay);
      dueDate = new Date(Date.UTC(nextYear, nextMonth - 1, nextFixDay)).toISOString().split('T')[0];
    } else {
      dueDate = fixedDueObj.toISOString().split('T')[0];
    }
  } else {
    const dueObj = new Date(issueDateObj.getTime() + dueDaysAfter * 24 * 60 * 60 * 1000);
    dueDate = dueObj.toISOString().split('T')[0];
  }

  const billingPeriodStart = `${year}-${String(month).padStart(2, '0')}-01`;
  const billingPeriodEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  return { issueDate, dueDate, billingPeriodStart, billingPeriodEnd };
}

export class InvoiceScheduleService {
  /**
   * Creates a recurring invoice schedule and bulk-generates all independent monthly invoices.
   */
  async createSchedule(
    input: CreateScheduleEmailInput,
    userId: string,
    workspaceId: string
  ): Promise<{ schedule: InvoiceEmailScheduleDTO; generatedCount: number }> {
    const supabase: any = await createAdminClient();

    // 1 & 2. Fetch Source Invoice and Source Invoice Items in parallel
    const [{ data: sourceInvoice, error: invErr }, { data: sourceItems, error: itemsErr }] = await Promise.all([
      supabase
        .from('invoices')
        .select('*')
        .eq('id', input.sourceInvoiceId)
        .eq('workspace_id', workspaceId)
        .single(),
      supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', input.sourceInvoiceId)
        .order('sort_order', { ascending: true }),
    ]);

    if (invErr || !sourceInvoice) {
      throw new Error(`Source invoice not found: ${invErr?.message || 'Invalid ID'}`);
    }

    if (itemsErr) {
      throw new Error(`Failed to fetch source invoice line items: ${itemsErr.message}`);
    }

    // Determine Recipient
    let recipientName = sourceInvoice.customer_name || 'Customer';
    let recipientEmail = sourceInvoice.customer_email || '';

    if (sourceInvoice.tenant_id && (!recipientEmail || !recipientName)) {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('first_name, last_name, email')
        .eq('id', sourceInvoice.tenant_id)
        .maybeSingle();
      if (tenant) {
        if (!recipientName) recipientName = `${tenant.first_name || ''} ${tenant.last_name || ''}`.trim() || 'Tenant';
        if (!recipientEmail && tenant.email) recipientEmail = tenant.email;
      }
    }

    if (!recipientEmail) {
      throw new Error('Source invoice does not have a customer or tenant email address for delivery.');
    }

    // 3. Compute Month Range
    const months = getMonthRange(input.startMonth, input.endMonth);
    if (months.length === 0) {
      throw new Error('Invalid billing period range: start month must be before or equal to end month.');
    }

    const generationDay = input.generationDayOfMonth || 1;
    const dueDays = input.dueDaysAfter !== undefined ? input.dueDaysAfter : 7;
    const timezone = input.timezone || 'Australia/Sydney';
    const emailMode = input.emailMode || 'automatic';

    // 4. Create Schedule Record
    const schedulePayload = {
      workspace_id: workspaceId,
      source_invoice_id: sourceInvoice.id,
      property_id: sourceInvoice.property_id || null,
      tenant_id: sourceInvoice.tenant_id || null,
      lease_id: sourceInvoice.lease_id || null,
      recipient_name: recipientName,
      recipient_email: recipientEmail,
      billing_start_month: input.startMonth,
      billing_end_month: input.endMonth,
      frequency: 'monthly',
      generation_day_of_month: generationDay,
      due_days_after: dueDays,
      due_date_fixed: input.dueDateFixed || null,
      timezone,
      email_mode: emailMode,
      status: 'active',
      invoices_generated_count: months.length,
      emails_sent_count: 0,
      emails_pending_count: emailMode === 'automatic' ? months.length : 0,
      emails_failed_count: 0,
      subject_template: input.subjectTemplate || null,
      custom_message: input.customMessage || null,
      drive_folder_url: input.driveFolderUrl || null,
      notes: input.notes || null,
      created_by: userId,
    };

    const { data: scheduleRecord, error: schedErr } = await supabase
      .from('invoice_email_schedules')
      .insert(schedulePayload)
      .select()
      .single();

    if (schedErr || !scheduleRecord) {
      throw new Error(`Failed to create invoice email schedule: ${schedErr?.message || 'Database error'}`);
    }

    // 5. Generate Next Sequential Invoice Numbers
    // Find current highest sequence number for workspace
    const currentYear = new Date().getFullYear();
    const { data: maxRows } = await supabase
      .from('invoices')
      .select('invoice_number')
      .ilike('invoice_number', `INV-%`)
      .order('invoice_number', { ascending: false })
      .limit(100);

    let maxNum = 0;
    if (maxRows && maxRows.length > 0) {
      for (const row of maxRows) {
        const parts = (row.invoice_number || '').split('-');
        const n = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(n) && n > maxNum) maxNum = n;
      }
    }

    const emailJobsToInsert: any[] = [];
    const nowIso = new Date().toISOString();

    // 6. Bulk-generate individual invoices for each month in a single batch insert
    const invoicePayloads: Array<Record<string, any>> = [];
    const monthMetaList: Array<{ ym: string; issueDate: string }> = [];

    for (let i = 0; i < months.length; i++) {
      const ym = months[i];
      const dates = computeInvoiceDates(ym, generationDay, dueDays, input.dueDateFixed);

      maxNum++;
      const invoiceNumber = `INV-${currentYear}-${String(maxNum).padStart(6, '0')}`;

      monthMetaList.push({ ym, issueDate: dates.issueDate });
      invoicePayloads.push({
        workspace_id: workspaceId,
        invoice_number: invoiceNumber,
        currency: sourceInvoice.currency || 'AUD',
        property_id: sourceInvoice.property_id || null,
        unit_id: sourceInvoice.unit_id || null,
        lease_id: sourceInvoice.lease_id || null,
        tenant_id: sourceInvoice.tenant_id || null,
        customer_name: recipientName,
        customer_email: recipientEmail,
        customer_address: sourceInvoice.customer_address || null,
        subtotal: sourceInvoice.subtotal,
        tax_amount: sourceInvoice.tax_amount,
        total_amount: sourceInvoice.total_amount,
        balance_due: sourceInvoice.total_amount,
        paid_amount: 0,
        issue_date: dates.issueDate,
        due_date: dates.dueDate,
        billing_period_start: dates.billingPeriodStart,
        billing_period_end: dates.billingPeriodEnd,
        notes: sourceInvoice.notes || null,
        payment_instructions: sourceInvoice.payment_instructions || null,
        template_id: sourceInvoice.template_id || null,
        status: 'issued', // Issued and ready for send/payment
        email_status: emailMode === 'automatic' ? 'scheduled' : 'pending',
        schedule_id: scheduleRecord.id,
        source_invoice_id: sourceInvoice.id,
        snapshot: sourceInvoice.snapshot || null,
        created_by: userId,
      });
    }

    const { data: createdInvoices, error: createInvErr } = await supabase
      .from('invoices')
      .insert(invoicePayloads)
      .select('id, invoice_number, issue_date');

    if (createInvErr || !createdInvoices) {
      console.error('[InvoiceScheduleService] Failed to batch insert invoices:', createInvErr);
      throw new Error(`Failed to generate scheduled invoices: ${createInvErr?.message || 'Database error'}`);
    }

    const allItemInserts: Array<Record<string, any>> = [];
    for (let i = 0; i < createdInvoices.length; i++) {
      const createdInv = createdInvoices[i];
      const meta = monthMetaList[i] || { ym: months[i], issueDate: createdInv.issue_date };

      if (sourceItems && sourceItems.length > 0) {
        for (let idx = 0; idx < sourceItems.length; idx++) {
          const item = sourceItems[idx];
          allItemInserts.push({
            invoice_id: createdInv.id,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            amount: item.amount,
            tax_rate: item.tax_rate,
            tax_amount: item.tax_amount,
            line_total: item.line_total,
            sort_order: idx,
          });
        }
      }

      if (emailMode === 'automatic') {
        const scheduledTime = new Date(`${meta.issueDate}T08:00:00.000Z`);
        const finalScheduledSendDate = scheduledTime.getTime() <= Date.now() ? nowIso : scheduledTime.toISOString();

        emailJobsToInsert.push({
          workspace_id: workspaceId,
          schedule_id: scheduleRecord.id,
          invoice_id: createdInv.id,
          recipient_email: recipientEmail,
          recipient_name: recipientName,
          billing_month: meta.ym,
          scheduled_send_date: finalScheduledSendDate,
          status: 'scheduled',
          attempts: 0,
          max_attempts: 3,
          subject: input.subjectTemplate || null,
          custom_message: input.customMessage || null,
        });
      }
    }

    // Batch insert line items and email jobs concurrently
    await Promise.all([
      allItemInserts.length > 0
        ? supabase.from('invoice_items').insert(allItemInserts).then(({ error }: any) => {
            if (error) console.error('[InvoiceScheduleService] Failed to batch insert line items:', error);
          })
        : Promise.resolve(),
      emailJobsToInsert.length > 0
        ? supabase.from('invoice_scheduled_email_jobs').insert(emailJobsToInsert).then(({ error }: any) => {
            if (error) console.error('[InvoiceScheduleService] Failed to insert email delivery jobs:', error);
          })
        : Promise.resolve(),
    ]);

    serverCache.invalidateWorkspace(workspaceId);

    return {
      schedule: scheduleRecord as InvoiceEmailScheduleDTO,
      generatedCount: months.length,
    };
  }

  /**
   * Fetches schedules with filtering and pagination.
   */
  async getSchedules(workspaceId: string, filters: ScheduleEmailFilters = {}) {
    const isCacheable = !filters.search && (filters.page || 1) === 1;
    const cacheKey = isCacheable
      ? `workspace:${workspaceId}:invoice_schedules:${filters.status || 'all'}:${filters.emailMode || 'all'}:${filters.propertyId || 'all'}:${filters.tenantId || 'all'}:${filters.sortBy || 'created_at'}:${filters.sortOrder || 'desc'}:${filters.limit || 50}`
      : null;

    if (cacheKey) {
      const cached = requestCache.get<{
        items: InvoiceEmailScheduleDTO[];
        total: number;
        page: number;
        limit: number;
      }>(cacheKey);
      if (cached) return cached;
    }

    const supabase: any = await createAdminClient();

    let query = supabase
      .from('invoice_email_schedules')
      .select(`
        *,
        source_invoice:invoices!source_invoice_id(invoice_number),
        property:properties!property_id(name),
        tenant:tenants!tenant_id(first_name, last_name)
      `, { count: 'exact' })
      .eq('workspace_id', workspaceId);

    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    if (filters.emailMode && filters.emailMode !== 'all') {
      query = query.eq('email_mode', filters.emailMode);
    }

    if (filters.propertyId) {
      query = query.eq('property_id', filters.propertyId);
    }

    if (filters.tenantId) {
      query = query.eq('tenant_id', filters.tenantId);
    }

    if (filters.search) {
      const term = `%${filters.search.trim()}%`;
      query = query.or(`recipient_name.ilike.${term},recipient_email.ilike.${term}`);
    }

    const sortCol = filters.sortBy || 'created_at';
    const isAsc = filters.sortOrder === 'asc';
    query = query.order(sortCol, { ascending: isAsc });

    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) {
      throw new Error(`Failed to fetch schedules: ${error.message}`);
    }

    const enrichedSchedules: InvoiceEmailScheduleDTO[] = (data || []).map((row: any) => ({
      id: row.id,
      workspaceId: row.workspace_id,
      sourceInvoiceId: row.source_invoice_id,
      propertyId: row.property_id,
      tenantId: row.tenant_id,
      leaseId: row.lease_id,
      recipientName: row.recipient_name,
      recipientEmail: row.recipient_email,
      billingStartMonth: row.billing_start_month,
      billingEndMonth: row.billing_end_month,
      frequency: row.frequency,
      generationDayOfMonth: row.generation_day_of_month,
      dueDaysAfter: row.due_days_after,
      dueDateFixed: row.due_date_fixed,
      timezone: row.timezone,
      emailMode: row.email_mode,
      status: row.status,
      invoicesGeneratedCount: row.invoices_generated_count,
      emailsSentCount: row.emails_sent_count,
      emailsPendingCount: row.emails_pending_count,
      emailsFailedCount: row.emails_failed_count,
      subjectTemplate: row.subject_template,
      customMessage: row.custom_message,
      driveFolderUrl: row.drive_folder_url,
      notes: row.notes,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      sourceInvoiceNumber: row.source_invoice?.invoice_number || undefined,
      propertyName: row.property?.name || undefined,
      tenantName: row.tenant ? `${row.tenant.first_name || ''} ${row.tenant.last_name || ''}`.trim() : undefined,
    }));

    const result = {
      items: enrichedSchedules,
      total: count || 0,
      page,
      limit,
    };
    if (cacheKey) {
      requestCache.set(cacheKey, result, 30_000);
    }
    return result;
  }

  /**
   * Fetches dynamic summary statistics for Schedule Email page.
   */
  async getScheduleStats(workspaceId: string): Promise<ScheduleEmailStatsDTO> {
    const cacheKey = `workspace:${workspaceId}:invoice_schedule_stats`;
    const cached = requestCache.get<ScheduleEmailStatsDTO>(cacheKey);
    if (cached) return cached;

    const supabase: any = await createAdminClient();

    const { data: schedules, error } = await supabase
      .from('invoice_email_schedules')
      .select('invoices_generated_count, emails_sent_count, emails_pending_count, emails_failed_count')
      .eq('workspace_id', workspaceId);

    if (error) {
      console.error('[InvoiceScheduleService] getScheduleStats error:', error);
      return {
        totalSchedules: 0,
        totalInvoicesGenerated: 0,
        emailsSent: 0,
        emailsPending: 0,
        emailsFailed: 0,
      };
    }

    let totalInvoicesGenerated = 0;
    let emailsSent = 0;
    let emailsPending = 0;
    let emailsFailed = 0;

    for (const s of schedules || []) {
      totalInvoicesGenerated += s.invoices_generated_count || 0;
      emailsSent += s.emails_sent_count || 0;
      emailsPending += s.emails_pending_count || 0;
      emailsFailed += s.emails_failed_count || 0;
    }

    const result: ScheduleEmailStatsDTO = {
      totalSchedules: (schedules || []).length,
      totalInvoicesGenerated,
      emailsSent,
      emailsPending,
      emailsFailed,
    };
    requestCache.set(cacheKey, result, 30_000);
    return result;
  }

  /**
   * Fetches full schedule details including generated invoices list and email delivery activities.
   */
  async getScheduleDetails(scheduleId: string, workspaceId: string) {
    const supabase: any = await createAdminClient();

    const [
      { data: schedule, error: schedErr },
      { data: generatedInvoices },
      { data: emailJobs },
    ] = await Promise.all([
      supabase
        .from('invoice_email_schedules')
        .select(`
          *,
          source_invoice:invoices!source_invoice_id(id, invoice_number, total_amount, currency),
          property:properties!property_id(name),
          tenant:tenants!tenant_id(first_name, last_name)
        `)
        .eq('id', scheduleId)
        .eq('workspace_id', workspaceId)
        .single(),
      supabase
        .from('invoices')
        .select('id, invoice_number, issue_date, due_date, total_amount, balance_due, status, email_status, billing_period_start, billing_period_end, currency')
        .eq('schedule_id', scheduleId)
        .order('issue_date', { ascending: true }),
      supabase
        .from('invoice_scheduled_email_jobs')
        .select(`
          *,
          invoice:invoices!invoice_id(invoice_number, total_amount, status, due_date)
        `)
        .eq('schedule_id', scheduleId)
        .order('scheduled_send_date', { ascending: true }),
    ]);

    if (schedErr || !schedule) {
      throw new Error(`Schedule not found: ${schedErr?.message || 'Invalid ID'}`);
    }

    const formattedJobs: InvoiceScheduledEmailJobDTO[] = (emailJobs || []).map((job: any) => ({
      id: job.id,
      workspaceId: job.workspace_id,
      scheduleId: job.schedule_id,
      invoiceId: job.invoice_id,
      recipientEmail: job.recipient_email,
      recipientName: job.recipient_name,
      billingMonth: job.billing_month,
      scheduledSendDate: job.scheduled_send_date,
      attemptedAt: job.attempted_at,
      deliveredAt: job.delivered_at,
      status: job.status,
      attempts: job.attempts,
      maxAttempts: job.max_attempts,
      failureReason: job.failure_reason,
      providerMessageId: job.provider_message_id,
      subject: job.subject,
      customMessage: job.custom_message,
      createdAt: job.created_at,
      updatedAt: job.updated_at,
      invoiceNumber: job.invoice?.invoice_number,
      invoiceTotal: job.invoice?.total_amount,
      invoiceStatus: job.invoice?.status,
      invoiceDueDate: job.invoice?.due_date,
    }));

    return {
      schedule: {
        ...schedule,
        sourceInvoiceNumber: schedule.source_invoice?.invoice_number,
        propertyName: schedule.property?.name,
        tenantName: schedule.tenant ? `${schedule.tenant.first_name || ''} ${schedule.tenant.last_name || ''}`.trim() : undefined,
      } as InvoiceEmailScheduleDTO,
      invoices: generatedInvoices || [],
      emailJobs: formattedJobs,
    };
  }

  /**
   * Pauses an active schedule.
   */
  async pauseSchedule(scheduleId: string, workspaceId: string) {
    const supabase: any = await createAdminClient();
    const { data, error } = await supabase
      .from('invoice_email_schedules')
      .update({ status: 'paused', updated_at: new Date().toISOString() })
      .eq('id', scheduleId)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (error) throw new Error(`Failed to pause schedule: ${error.message}`);
    serverCache.invalidateWorkspace(workspaceId);
    return data;
  }

  /**
   * Resumes a paused schedule.
   */
  async resumeSchedule(scheduleId: string, workspaceId: string) {
    const supabase: any = await createAdminClient();
    const { data, error } = await supabase
      .from('invoice_email_schedules')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', scheduleId)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (error) throw new Error(`Failed to resume schedule: ${error.message}`);
    serverCache.invalidateWorkspace(workspaceId);
    return data;
  }

  /**
   * Cancels a schedule and cancels future scheduled jobs. Generated invoices remain intact.
   */
  async cancelSchedule(scheduleId: string, workspaceId: string) {
    const supabase: any = await createAdminClient();

    // 1. Mark schedule cancelled
    const { data, error } = await supabase
      .from('invoice_email_schedules')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', scheduleId)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (error) throw new Error(`Failed to cancel schedule: ${error.message}`);

    // 2. Cancel future pending email jobs
    await supabase
      .from('invoice_scheduled_email_jobs')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('schedule_id', scheduleId)
      .in('status', ['scheduled', 'pending']);

    serverCache.invalidateWorkspace(workspaceId);
    return data;
  }

  /**
   * Retries a failed email delivery job.
   */
  async retryEmailJob(jobId: string, workspaceId: string) {
    const supabase: any = await createAdminClient();

    const { data: job, error: jobErr } = await supabase
      .from('invoice_scheduled_email_jobs')
      .select('*')
      .eq('id', jobId)
      .eq('workspace_id', workspaceId)
      .single();

    if (jobErr || !job) {
      throw new Error(`Email job not found: ${jobErr?.message || 'Invalid ID'}`);
    }

    // Set job back to pending and immediately trigger execution
    await supabase
      .from('invoice_scheduled_email_jobs')
      .update({
        status: 'pending',
        failure_reason: null,
        scheduled_send_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    // Process this single job
    return this.executeEmailJob(job.id);
  }

  /**
   * Executes a single email delivery job by fetching latest saved invoice snapshot,
   * generating current PDF, and sending via email service.
   */
  async executeEmailJob(jobId: string): Promise<{ success: boolean; error?: string }> {
    const supabase: any = await createAdminClient();

    // Claim job atomically
    const { data: job, error: claimErr } = await supabase
      .from('invoice_scheduled_email_jobs')
      .update({
        status: 'processing',
        attempted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId)
      .in('status', ['scheduled', 'pending', 'failed'])
      .select('*, schedule:invoice_email_schedules!schedule_id(status)')
      .single();

    if (claimErr || !job) {
      return { success: false, error: 'Job already processed or not found' };
    }

    // Verify parent schedule status
    if (job.schedule?.status !== 'active') {
      await supabase
        .from('invoice_scheduled_email_jobs')
        .update({ status: 'cancelled', failure_reason: 'Schedule is paused or cancelled' })
        .eq('id', jobId);
      return { success: false, error: 'Parent schedule is not active' };
    }

    try {
      const invoiceService = await container.resolve('invoiceService');
      const invoiceDocService = await container.resolve('invoiceDocumentService');

      // Fetch LATEST saved invoice state (reflects any independent edits made by user!)
      const renderDto = await invoiceService.getInvoiceRenderData(job.invoice_id);
      if (!renderDto) {
        throw new Error(`Invoice data not found for ID ${job.invoice_id}`);
      }

      // Generate current PDF document from latest invoice data
      const docResult = await invoiceDocService.generateDocument({
        invoiceId: job.invoice_id,
        format: 'pdf',
        forceRegenerate: true,
      });

      // Send email to recipient
      const emailRes = await invoiceEmailAdapter.sendInvoice({
        to: job.recipient_email,
        recipientName: job.recipient_name || renderDto.billTo?.name || 'Customer',
        invoice: renderDto,
        downloadUrl: docResult.documentUrl,
        pdfBuffer: docResult.buffer,
        customMessage: job.custom_message || undefined,
        subject: job.subject || undefined,
      });

      if (!emailRes.success) {
        throw new Error(emailRes.error?.message || 'Email delivery failed');
      }

      // Mark Job Success
      await supabase
        .from('invoice_scheduled_email_jobs')
        .update({
          status: 'sent',
          delivered_at: new Date().toISOString(),
          provider_message_id: emailRes.messageId || null,
          attempts: (job.attempts || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      // Update Invoice email status
      await supabase
        .from('invoices')
        .update({
          email_status: 'sent',
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.invoice_id);

      // Update Schedule counters
      const { data: sched } = await supabase
        .from('invoice_email_schedules')
        .select('emails_sent_count, emails_pending_count')
        .eq('id', job.schedule_id)
        .single();

      if (sched) {
        await supabase
          .from('invoice_email_schedules')
          .update({
            emails_sent_count: (sched.emails_sent_count || 0) + 1,
            emails_pending_count: Math.max(0, (sched.emails_pending_count || 0) - 1),
            updated_at: new Date().toISOString(),
          })
          .eq('id', job.schedule_id);
      }

      return { success: true };
    } catch (err: any) {
      const attempts = (job.attempts || 0) + 1;
      const isFinalFail = attempts >= (job.max_attempts || 3);
      const nextStatus = isFinalFail ? 'failed' : 'pending';

      console.error(`[InvoiceScheduleService] executeEmailJob error for job ${jobId}:`, err);

      await supabase
        .from('invoice_scheduled_email_jobs')
        .update({
          status: nextStatus,
          attempts,
          failure_reason: err.message || 'Unknown delivery failure',
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      await supabase
        .from('invoices')
        .update({
          email_status: isFinalFail ? 'failed' : 'pending',
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.invoice_id);

      if (isFinalFail) {
        const { data: sched } = await supabase
          .from('invoice_email_schedules')
          .select('emails_failed_count, emails_pending_count')
          .eq('id', job.schedule_id)
          .single();

        if (sched) {
          await supabase
            .from('invoice_email_schedules')
            .update({
              emails_failed_count: (sched.emails_failed_count || 0) + 1,
              emails_pending_count: Math.max(0, (sched.emails_pending_count || 0) - 1),
              updated_at: new Date().toISOString(),
            })
            .eq('id', job.schedule_id);
        }
      }

      return { success: false, error: err.message };
    }
  }

  /**
   * Process all due scheduled email jobs (Background Worker engine).
   */
  async processDueScheduledJobs(batchSize: number = 20): Promise<{ processed: number; succeeded: number; failed: number }> {
    const supabase: any = await createAdminClient();
    const nowIso = new Date().toISOString();

    const { data: dueJobs, error } = await supabase
      .from('invoice_scheduled_email_jobs')
      .select('id')
      .in('status', ['scheduled', 'pending'])
      .lte('scheduled_send_date', nowIso)
      .order('scheduled_send_date', { ascending: true })
      .limit(batchSize);

    if (error || !dueJobs || dueJobs.length === 0) {
      return { processed: 0, succeeded: 0, failed: 0 };
    }

    let succeeded = 0;
    let failed = 0;

    for (const job of dueJobs) {
      const res = await this.executeEmailJob(job.id);
      if (res.success) succeeded++;
      else failed++;
    }

    return {
      processed: dueJobs.length,
      succeeded,
      failed,
    };
  }
}

export const invoiceScheduleService = new InvoiceScheduleService();
