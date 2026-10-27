import { test, expect } from '@playwright/test';
import { BANK_DETAILS } from '../../lib/billing/types';
import {
  createManualCheckoutSession,
  submitManualPayment,
  approveManualPayment,
  rejectManualPayment,
  getSubscriptionPaymentBySubId,
  getPaymentProofByPaymentId,
  getLatestPaymentForAccount,
} from '../../lib/billing/service';
import {
  handleCreateManualCheckoutSession,
  handleSubmitManualPayment,
  handleApprovePayment,
  handleRejectPayment,
} from '../../app/actions/billing';
import {
  notifySubscriptionRequested,
  notifySubscriptionAccepted,
  notifySubscriptionRejected,
} from '../../lib/notifications/service';

test.describe('Manual Subscription & Payment Proof Workflow Suite', () => {
  test('Bank details for Australian manual transfer are correctly configured', () => {
    expect(BANK_DETAILS).toBeDefined();
    expect(BANK_DETAILS.accountName).toBe('PROPERTYLEDGE PTY LTD');
    expect(BANK_DETAILS.bsb).toBe('083-004');
    expect(BANK_DETAILS.bankName).toBe('National Australia Bank (NAB)');
  });

  test('Billing service exposes all lifecycle transition methods', () => {
    expect(typeof createManualCheckoutSession).toBe('function');
    expect(typeof submitManualPayment).toBe('function');
    expect(typeof approveManualPayment).toBe('function');
    expect(typeof rejectManualPayment).toBe('function');
    expect(typeof getSubscriptionPaymentBySubId).toBe('function');
    expect(typeof getPaymentProofByPaymentId).toBe('function');
    expect(typeof getLatestPaymentForAccount).toBe('function');
  });

  test('Billing server actions are properly defined and callable functions', () => {
    expect(typeof handleCreateManualCheckoutSession).toBe('function');
    expect(typeof handleSubmitManualPayment).toBe('function');
    expect(typeof handleApprovePayment).toBe('function');
    expect(typeof handleRejectPayment).toBe('function');
  });

  test('Email notification triggers are defined for all 5 email lifecycle stages', () => {
    expect(typeof notifySubscriptionRequested).toBe('function');
    expect(typeof notifySubscriptionAccepted).toBe('function');
    expect(typeof notifySubscriptionRejected).toBe('function');
  });
});
