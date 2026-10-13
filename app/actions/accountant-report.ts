'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth/queries';
import { resolveWorkspaceContext } from '@/lib/workspace/context';
import { createClient } from '@/lib/supabase/server';
import {
  AccountantReportFilters,
  accountantReportFilterSchema,
} from '@/modules/finance/domain/accountant-report-types';
import {
  getAccountantExpenseReportData,
} from '@/lib/finance/accountant-report-service';
import { AccountantExpenseReportPdfGenerator } from '@/lib/pdf/accountant-expense-report-pdf';
import {
  parseAccountantReviewFromNotes,
  serializeAccountantReviewToNotes,
} from '@/lib/finance/accountant-review-service';
import { uploadReceiptToBlob } from '@/lib/finance/receipt-storage';

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
 * Fetch structured preview data for the Accountant Expense Report
 */
export async function fetchAccountantReportDataAction(filters: AccountantReportFilters = {}) {
  try {
    const { user, context } = await getAuthContext();
    const validatedFilters = accountantReportFilterSchema.parse(filters);

    const data = await getAccountantExpenseReportData(validatedFilters, {
      workspaceId: context.workspaceId,
      workspaceName: context.workspaceName,
      userName: user.email || 'PropertyLedge User',
      userId: user.id,
    });

    return {
      success: true,
      data,
    };
  } catch (err: any) {
    console.error('[ACCOUNTANT_REPORT_ACTION_ERROR]', err);
    return {
      success: false,
      error: err.message || 'Failed to generate accountant report data',
    };
  }
}

/**
 * Generates the complete, self-contained accountant-ready PDF
 */
export async function generateAccountantReportPdfAction(filters: AccountantReportFilters = {}) {
  try {
    const { user, context } = await getAuthContext();
    const validatedFilters = accountantReportFilterSchema.parse(filters);

    // 1. Get normalized report data
    const data = await getAccountantExpenseReportData(validatedFilters, {
      workspaceId: context.workspaceId,
      workspaceName: context.workspaceName,
      userName: user.email || 'PropertyLedge User',
      userId: user.id,
    });

    // 2. Generate self-contained PDF audit pack
    const pdfBytes = await AccountantExpenseReportPdfGenerator.generate(data);

    // 3. Build sanitized, professional filename
    const cleanPropName = (data.metadata.propertyName || 'Portfolio')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .substring(0, 30);
    const cleanPeriod = (filters.period || (filters.financialYear ? `FY${filters.financialYear}` : 'Period'))
      .replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `PropertyLedge_Accountant_Expense_Report_${cleanPropName}_${cleanPeriod}.pdf`;

    const base64Pdf = Buffer.from(pdfBytes).toString('base64');

    return {
      success: true,
      filename,
      base64Data: `data:application/pdf;base64,${base64Pdf}`,
      summary: data.summary,
      metadata: data.metadata,
    };
  } catch (err: any) {
    console.error('[ACCOUNTANT_REPORT_PDF_ACTION_ERROR]', err);
    return {
      success: false,
      error: err.message || 'Failed to generate accountant report PDF',
    };
  }
}

/**
 * Persists an accountant's review decision (Verified, Needs Review, Disputed) and notes
 * securely and transactionally for a specific expense.
 */
export async function saveAccountantTransactionReviewAction(input: {
  transactionId: string;
  reviewStatus: 'unreviewed' | 'verified' | 'needs_review' | 'disputed';
  accountantNotes: string;
}) {
  try {
    const { user, context } = await getAuthContext();
    const supabase = await createClient();

    if (!input.transactionId) {
      throw new Error('Transaction ID is required');
    }

    // 1. Fetch current transaction and verify workspace authorization
    const { data: tx, error: fetchErr } = await supabase
      .from('transactions')
      .select('id, notes, workspace_id')
      .eq('id', input.transactionId)
      .eq('workspace_id', context.workspaceId)
      .single();

    if (fetchErr || !tx) {
      throw new Error('Expense transaction not found or access denied');
    }

    // 2. Parse existing notes to preserve original user notes
    const { userNotes } = parseAccountantReviewFromNotes((tx as any)?.notes);

    // 3. Serialize new review record
    const updatedNotes = serializeAccountantReviewToNotes(
      {
        status: input.reviewStatus,
        notes: input.accountantNotes,
        reviewedBy: user.email || 'Accountant',
        reviewedAt: new Date().toISOString(),
      },
      userNotes
    );

    // 4. Update transaction
    const { error: updErr } = await supabase
      .from('transactions')
      .update({
        notes: updatedNotes,
        updated_at: new Date().toISOString(),
      } as never)
      .eq('id', input.transactionId)
      .eq('workspace_id', context.workspaceId);

    if (updErr) {
      console.error('[ACCOUNTANT_REVIEW_SAVE_ERROR]', updErr);
      throw new Error(`Failed to save review: ${updErr.message}`);
    }

    revalidatePath('/dashboard/accountant-reports');
    revalidatePath('/dashboard/reports');

    return {
      success: true,
      transactionId: input.transactionId,
      review: {
        status: input.reviewStatus,
        notes: input.accountantNotes,
        reviewedBy: user.email || 'Accountant',
        reviewedAt: new Date().toISOString(),
      },
    };
  } catch (err: any) {
    console.error('[SAVE_ACCOUNTANT_REVIEW_ACTION_ERROR]', err);
    return {
      success: false,
      error: err.message || 'Failed to save accountant review',
    };
  }
}

/**
 * Uploads and attaches a receipt or tax invoice directly to an expense transaction,
 * resolving the "Missing Evidence" status in real time.
 */
export async function uploadTransactionReceiptAction(formData: FormData) {
  try {
    const { user, context } = await getAuthContext();
    const supabase = await createClient();

    const transactionId = formData.get('transactionId') as string;
    const file = formData.get('file') as File;

    if (!transactionId || !file) {
      throw new Error('Transaction ID and valid document file are required');
    }

    // Validate transaction workspace ownership
    const { data: tx, error: txErr } = await supabase
      .from('transactions')
      .select('id, workspace_id, property_id')
      .eq('id', transactionId)
      .eq('workspace_id', context.workspaceId)
      .single();

    if (txErr || !tx) {
      throw new Error('Expense transaction not found or access denied');
    }

    // 1. Upload file to Vercel Blob
    const attachment = await uploadReceiptToBlob({
      workspaceId: context.workspaceId,
      transactionId,
      file,
      fileName: file.name,
      mimeType: file.type,
    });

    // 2. Update transaction record
    await supabase
      .from('transactions')
      .update({
        receipt_url: attachment.url,
        receipt_blob_path: attachment.blobPath,
        receipt_file_name: attachment.fileName,
        receipt_file_size: attachment.fileSize,
        receipt_mime_type: attachment.mimeType,
        receipt_uploaded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as never)
      .eq('id', transactionId)
      .eq('workspace_id', context.workspaceId);

    // 3. Insert transaction attachment record
    try {
      await supabase.from('transaction_attachments').insert({
        workspace_id: context.workspaceId,
        transaction_id: transactionId,
        blob_url: attachment.url,
        blob_path: attachment.blobPath,
        file_name: attachment.fileName,
        mime_type: attachment.mimeType,
        file_size: attachment.fileSize,
        source_path: attachment.fileName,
        uploaded_by: user.id,
      } as never);
    } catch (attErr) {
      console.warn('Could not insert secondary transaction attachment record:', attErr);
    }

    revalidatePath('/dashboard/accountant-reports');
    revalidatePath('/dashboard/reports');

    return {
      success: true,
      attachment: {
        id: `att-${Date.now()}`,
        fileName: attachment.fileName,
        fileSize: attachment.fileSize,
        mimeType: attachment.mimeType,
        url: attachment.url,
        isPdf: (attachment.mimeType || '').includes('pdf') || attachment.fileName.endsWith('.pdf'),
        isImage: (attachment.mimeType || '').startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/i.test(attachment.fileName),
      },
    };
  } catch (err: any) {
    console.error('[UPLOAD_TRANSACTION_RECEIPT_ERROR]', err);
    return {
      success: false,
      error: err.message || 'Failed to upload receipt document',
    };
  }
}
