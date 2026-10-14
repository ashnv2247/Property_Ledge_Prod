'use server';

import {
  getPropertyAccountantReportData,
  toggleExpenseVerificationAction,
} from '@/lib/properties/accountant-report-service';
import { PropertyAccountantReportPayload } from '@/modules/properties/domain/accountant-report-types';

export async function fetchPropertyAccountantReportAction(
  propertyId: string,
  financialYear?: string | number | null
): Promise<{ success: boolean; data?: PropertyAccountantReportPayload; error?: string }> {
  try {
    const data = await getPropertyAccountantReportData(propertyId, financialYear);
    if (!data) {
      return { success: false, error: 'Property not found or access denied' };
    }
    return { success: true, data };
  } catch (err: any) {
    console.error('Error in fetchPropertyAccountantReportAction:', err);
    return { success: false, error: err?.message || 'Failed to load accountant report' };
  }
}

export async function togglePropertyExpenseVerificationAction(
  expenseId: string,
  verified: boolean
): Promise<{ success: boolean; error?: string }> {
  return toggleExpenseVerificationAction(expenseId, verified);
}
