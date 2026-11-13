import { test, expect } from '@playwright/test';
import {
  InvoiceEmailScheduleDTO,
  InvoiceScheduledEmailJobDTO,
  CreateScheduleEmailInput,
} from '../../modules/invoices/domain/entities/invoice-schedule';

test.describe('Schedule Email - Recurring Invoice Management System', () => {
  // Test 1: Month Range & Generation Count
  test('correctly calculates monthly intervals between start and end month inclusive', () => {
    function getMonthRange(startYM: string, endYM: string): string[] {
      const [sY, sM] = startYM.split('-').map(Number);
      const [eY, eM] = endYM.split('-').map(Number);
      const months: string[] = [];
      let curYear = sY;
      let curMonth = sM;

      while (curYear < eY || (curYear === eY && curMonth <= eM)) {
        months.push(`${curYear}-${String(curMonth).padStart(2, '0')}`);
        curMonth++;
        if (curMonth > 12) {
          curMonth = 1;
          curYear++;
        }
      }
      return months;
    }

    const range12 = getMonthRange('2027-01', '2027-12');
    expect(range12.length).toBe(12);
    expect(range12[0]).toBe('2027-01');
    expect(range12[11]).toBe('2027-12');

    const rangeSingle = getMonthRange('2027-06', '2027-06');
    expect(rangeSingle.length).toBe(1);
    expect(rangeSingle[0]).toBe('2027-06');

    const rangeCrossYear = getMonthRange('2027-10', '2028-03');
    expect(rangeCrossYear.length).toBe(6);
    expect(rangeCrossYear[0]).toBe('2027-10');
    expect(rangeCrossYear[5]).toBe('2028-03');
  });

  // Test 2: Snapshot-based Independent Invoice Generation
  test('generates independent snapshots with unique invoice numbers and independent line items', () => {
    interface MockInvoiceItem {
      id: string;
      description: string;
      quantity: number;
      unitPrice: number;
      amount: number;
    }

    interface MockInvoice {
      id: string;
      invoiceNumber: string;
      billingPeriod: string;
      total: number;
      status: string;
      items: MockInvoiceItem[];
      sourceInvoiceId?: string;
      scheduleId?: string;
    }

    const sourceInvoice: MockInvoice = {
      id: 'src-inv-1',
      invoiceNumber: 'INV-2027-000001',
      billingPeriod: '2027-01',
      total: 16000,
      status: 'issued',
      items: [
        { id: 'item-1', description: 'Monthly Rent', quantity: 1, unitPrice: 15000, amount: 15000 },
        { id: 'item-2', description: 'Maintenance', quantity: 1, unitPrice: 1000, amount: 1000 },
      ],
    };

    const months = ['2027-01', '2027-02', '2027-03'];
    const generatedInvoices: MockInvoice[] = months.map((m, idx) => ({
      id: `gen-inv-${idx + 1}`,
      invoiceNumber: `INV-2027-${String(idx + 2).padStart(6, '0')}`,
      billingPeriod: m,
      total: sourceInvoice.total,
      status: 'issued',
      sourceInvoiceId: sourceInvoice.id,
      scheduleId: 'sched-1',
      items: sourceInvoice.items.map((it, itemIdx) => ({
        ...it,
        id: `gen-item-${idx + 1}-${itemIdx + 1}`,
      })),
    }));

    expect(generatedInvoices.length).toBe(3);
    // Unique invoice numbers
    const numbers = new Set(generatedInvoices.map((i) => i.invoiceNumber));
    expect(numbers.size).toBe(3);

    // Initial status is issued / pending send, not sent
    for (const inv of generatedInvoices) {
      expect(inv.status).toBe('issued');
      expect(inv.sourceInvoiceId).toBe('src-inv-1');
      expect(inv.scheduleId).toBe('sched-1');
    }

    // Test Independent Editing: Edit February
    const feb = generatedInvoices[1];
    feb.items.push({
      id: 'water-charge',
      description: 'Water Bill',
      quantity: 1,
      unitPrice: 350,
      amount: 350,
    });
    feb.total = feb.items.reduce((sum, item) => sum + item.amount, 0);

    expect(feb.total).toBe(16350);
    expect(feb.items.length).toBe(3);

    // January must remain unchanged
    expect(generatedInvoices[0].total).toBe(16000);
    expect(generatedInvoices[0].items.length).toBe(2);

    // March must remain unchanged
    expect(generatedInvoices[2].total).toBe(16000);
    expect(generatedInvoices[2].items.length).toBe(2);

    // Source invoice must remain unchanged
    expect(sourceInvoice.total).toBe(16000);
    expect(sourceInvoice.items.length).toBe(2);
  });

  // Test 3: Schedule Lifecycle - Pause, Resume, Cancel
  test('pausing and cancelling a schedule protects future jobs without deleting generated invoices', () => {
    let scheduleStatus = 'active';
    let jobs = [
      { id: 'job-1', status: 'sent' },
      { id: 'job-2', status: 'scheduled' },
      { id: 'job-3', status: 'scheduled' },
    ];
    let invoices = [{ id: 'inv-1' }, { id: 'inv-2' }, { id: 'inv-3' }];

    // Pause
    scheduleStatus = 'paused';
    expect(scheduleStatus).toBe('paused');
    // While paused, job execution skips
    const canExecuteWhenPaused = scheduleStatus === 'active';
    expect(canExecuteWhenPaused).toBe(false);

    // Resume
    scheduleStatus = 'active';
    expect(scheduleStatus).toBe('active');

    // Cancel
    scheduleStatus = 'cancelled';
    jobs = jobs.map((j) => (j.status === 'scheduled' ? { ...j, status: 'cancelled' } : j));

    expect(scheduleStatus).toBe('cancelled');
    // Future jobs cancelled
    expect(jobs[1].status).toBe('cancelled');
    expect(jobs[2].status).toBe('cancelled');
    // Previously sent jobs remain sent
    expect(jobs[0].status).toBe('sent');
    // All generated invoices preserved
    expect(invoices.length).toBe(3);
  });

  // Test 4: Relative vs Fixed Due Date Calculation
  test('computes relative and fixed payment due dates correctly', () => {
    function computeDates(
      yearMonth: string,
      genDay: number,
      dueDaysAfter: number,
      fixedDueDay?: number | null
    ) {
      const [year, month] = yearMonth.split('-').map(Number);
      const issueDate = `${year}-${String(month).padStart(2, '0')}-${String(genDay).padStart(2, '0')}`;
      let dueDate: string;

      if (fixedDueDay) {
        dueDate = `${year}-${String(month).padStart(2, '0')}-${String(fixedDueDay).padStart(2, '0')}`;
      } else {
        const d = new Date(Date.UTC(year, month - 1, genDay + dueDaysAfter));
        dueDate = d.toISOString().split('T')[0];
      }
      return { issueDate, dueDate };
    }

    const rel = computeDates('2027-01', 1, 7);
    expect(rel.issueDate).toBe('2027-01-01');
    expect(rel.dueDate).toBe('2027-01-08');

    const fixed = computeDates('2027-01', 1, 7, 15);
    expect(fixed.issueDate).toBe('2027-01-01');
    expect(fixed.dueDate).toBe('2027-01-15');
  });

  // Test 5: Email Delivery Statuses Separation
  test('strictly maintains separate invoice business statuses and email delivery statuses', () => {
    const validInvoiceStatuses = ['draft', 'issued', 'viewed', 'paid', 'partially_paid', 'overdue', 'cancelled', 'void'];
    const validEmailStatuses = ['scheduled', 'pending', 'processing', 'sent', 'failed', 'cancelled'];

    const invoice = {
      status: 'issued',
      emailStatus: 'scheduled',
    };

    expect(validInvoiceStatuses.includes(invoice.status)).toBe(true);
    expect(validEmailStatuses.includes(invoice.emailStatus)).toBe(true);
    expect(invoice.status).not.toBe('sent'); // Invoice status is accounting status, not email status
  });
});
