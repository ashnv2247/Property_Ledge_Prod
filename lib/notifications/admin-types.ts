export interface AdminNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  target_url: string | null;
  metadata: Record<string, any>;
  read_at: string | null;
  created_at: string;
  idempotency_key: string | null;
  isUnread: boolean;
}

export interface AdminNotificationPreferences {
  admin_user_id: string;
  email_enabled: boolean;
  in_app_enabled: boolean;
  event_subscriptions: {
    user_registered: { in_app: boolean; email: boolean };
    subscription_initiated: { in_app: boolean; email: boolean };
    payment_success: { in_app: boolean; email: boolean };
    payment_failed: { in_app: boolean; email: boolean };
    subscription_cancelled: { in_app: boolean; email: boolean };
    subscription_expired: { in_app: boolean; email: boolean };
  };
}

export const DEFAULT_ADMIN_PREFERENCES: Omit<AdminNotificationPreferences, 'admin_user_id'> = {
  email_enabled: true,
  in_app_enabled: true,
  event_subscriptions: {
    user_registered: { in_app: true, email: true },
    subscription_initiated: { in_app: true, email: true },
    payment_success: { in_app: true, email: true },
    payment_failed: { in_app: true, email: true },
    subscription_cancelled: { in_app: true, email: true },
    subscription_expired: { in_app: true, email: true },
  },
};
