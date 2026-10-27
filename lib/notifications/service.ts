import { emailService } from '@/lib/email/service';
import { getAppBaseUrl } from '@/lib/routing/env';

export interface SubscriptionRequestedNotificationParams {
  paymentId?: string;
  subscriptionId?: string;
  accountName: string;
  accountEmail: string;
  planName: string;
  billingCycle?: 'monthly' | 'yearly';
  amount: number;
  currency?: string;
  paymentMethod?: string;
  transactionReference?: string;
  reference: string;
  submittedAt?: string;
}

export interface SubscriptionAcceptedNotificationParams {
  paymentId?: string;
  subscriptionId?: string;
  accountName: string;
  accountEmail: string;
  planName: string;
  billingCycle?: 'monthly' | 'yearly';
  amount?: number;
  currency?: string;
  startDate?: string;
  effectiveDate: string;
  endDate?: string;
}

export interface SubscriptionRejectedNotificationParams {
  paymentId?: string;
  subscriptionId?: string;
  accountName: string;
  accountEmail: string;
  planName: string;
  reference?: string;
  decisionDate?: string;
  rejectionReason: string;
}

class NotificationService {
  /**
   * Generates SUBSCRIPTION_REQUESTED notifications:
   * 1. Email A to Administrator (ashdeveloper2247@gmail.com)
   * 2. Email B to Dedicated Subscription Inbox (subscription@propertyledge.au)
   * 3. Email C to Authenticated Customer
   */
  async notifySubscriptionRequested(params: SubscriptionRequestedNotificationParams) {
    const adminEmail =
      process.env.SUBSCRIPTION_ADMIN_EMAIL ||
      process.env.ADMIN_NOTIFY_EMAIL ||
      'ashdeveloper2247@gmail.com';
    const inboxEmail =
      process.env.SUBSCRIPTION_NOTIFICATION_EMAIL ||
      'subscription@propertyledge.au';
    const baseUrl = getAppBaseUrl();

    const reviewUrl = params.paymentId
      ? `${baseUrl}/admin/subscriptions?payment_id=${params.paymentId}`
      : `${baseUrl}/admin/subscriptions`;

    // 1. Email A: Send notification email to Administrator
    try {
      await emailService.sendEmail({
        to: adminEmail,
        subject: `[PropertyLedge] New Subscription Request — ${params.planName} — ${params.reference}`,
        templateType: 'subscription_request_admin',
        variables: {
          accountName: params.accountName,
          accountEmail: params.accountEmail,
          reference: params.reference,
          planName: params.planName,
          billingCycle: params.billingCycle || 'monthly',
          amount: params.amount,
          currency: params.currency || 'AUD',
          paymentMethod: params.paymentMethod || 'Bank Transfer',
          transactionReference: params.transactionReference,
          submittedAt: params.submittedAt || new Date().toISOString(),
          status: 'Pending Review',
          adminUrl: reviewUrl,
        },
      });
    } catch (err) {
      console.error('[NotificationService] Failed to send subscription requested email to admin:', err);
    }

    // 2. Email B: Send notification email to dedicated Subscription Inbox
    try {
      await emailService.sendEmail({
        to: inboxEmail,
        subject: `[PropertyLedge Inbox] New Subscription Request — ${params.planName} — ${params.reference}`,
        templateType: 'subscription_request_inbox',
        variables: {
          reference: params.reference,
          accountEmail: params.accountEmail,
          accountName: params.accountName,
          planName: params.planName,
          billingCycle: params.billingCycle || 'monthly',
          amount: params.amount,
          currency: params.currency || 'AUD',
          submittedAt: params.submittedAt || new Date().toISOString(),
          status: 'Pending',
          adminUrl: reviewUrl,
        },
      });
    } catch (err) {
      console.error('[NotificationService] Failed to send subscription requested email to subscription inbox:', err);
    }

    // 3. Email C: Send submission confirmation acknowledgment to Customer
    if (params.accountEmail && params.accountEmail !== adminEmail && params.accountEmail !== inboxEmail) {
      try {
        await emailService.sendEmail({
          to: params.accountEmail,
          subject: 'Your PropertyLedge Subscription Request Has Been Received',
          templateType: 'subscription_request_customer',
          variables: {
            userName: params.accountName,
            planName: params.planName,
            billingCycle: params.billingCycle || 'monthly',
            amount: params.amount,
            currency: params.currency || 'AUD',
            reference: params.reference,
            submittedAt: params.submittedAt || new Date().toISOString(),
            statusUrl: `${baseUrl}/subscription`,
          },
        });
      } catch (err) {
        console.error('[NotificationService] Failed to send subscription confirmation email to customer:', err);
      }
    }
  }

  /**
   * Generates SUBSCRIPTION_ACCEPTED notification (Email D):
   * Sends approval email to the authenticated customer
   */
  async notifySubscriptionAccepted(params: SubscriptionAcceptedNotificationParams) {
    const baseUrl = getAppBaseUrl();

    if (!params.accountEmail) return;

    try {
      await emailService.sendEmail({
        to: params.accountEmail,
        subject: 'Your PropertyLedge Subscription Has Been Approved',
        templateType: 'subscription_approved_customer',
        variables: {
          userName: params.accountName,
          planName: params.planName,
          billingCycle: params.billingCycle || 'monthly',
          amount: params.amount || 29,
          currency: params.currency || 'AUD',
          startDate: params.startDate || params.effectiveDate,
          endDate: params.endDate,
          dashboardUrl: `${baseUrl}/dashboard`,
        },
      });
    } catch (err) {
      console.error('[NotificationService] Failed to send subscription accepted email:', err);
    }
  }

  /**
   * Generates SUBSCRIPTION_REJECTED notification (Email E):
   * Sends rejection notice with customer-facing reason to the customer
   */
  async notifySubscriptionRejected(params: SubscriptionRejectedNotificationParams) {
    const baseUrl = getAppBaseUrl();

    if (!params.accountEmail) return;

    try {
      await emailService.sendEmail({
        to: params.accountEmail,
        subject: 'Update on Your PropertyLedge Subscription Request',
        templateType: 'subscription_rejected_customer',
        variables: {
          userName: params.accountName,
          planName: params.planName,
          reference: params.reference || 'N/A',
          decisionDate: params.decisionDate || new Date().toISOString(),
          rejectionReason: params.rejectionReason,
          retryUrl: `${baseUrl}/pricing`,
        },
      });
    } catch (err) {
      console.error('[NotificationService] Failed to send subscription rejected email:', err);
    }
  }
}

export const notificationService = new NotificationService();

export const notifySubscriptionRequested = (params: SubscriptionRequestedNotificationParams) =>
  notificationService.notifySubscriptionRequested(params);

export const notifySubscriptionAccepted = (params: SubscriptionAcceptedNotificationParams) =>
  notificationService.notifySubscriptionAccepted(params);

export const notifySubscriptionRejected = (params: SubscriptionRejectedNotificationParams) =>
  notificationService.notifySubscriptionRejected(params);
