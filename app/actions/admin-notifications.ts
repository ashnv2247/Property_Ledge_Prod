'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin/authorization';
import { processPendingEmailEvents } from '@/lib/admin/email-outbox';
import {
  type AdminNotification,
  type AdminNotificationPreferences,
  DEFAULT_ADMIN_PREFERENCES,
} from '@/lib/notifications/admin-types';

export type { AdminNotification, AdminNotificationPreferences };

/**
 * Fetch paginated notifications for the current authenticated platform admin
 */
export async function fetchAdminNotifications(params?: {
  page?: number;
  limit?: number;
  eventType?: string;
  status?: 'all' | 'unread' | 'read';
  search?: string;
}): Promise<{
  notifications: AdminNotification[];
  totalCount: number;
  unreadCount: number;
  page: number;
  totalPages: number;
}> {
  const adminId = await requireAdmin();
  const supabase = await createClient();

  const page = Math.max(1, params?.page || 1);
  const limit = Math.min(100, Math.max(1, params?.limit || 20));
  const offset = (page - 1) * limit;

  // Unread count
  const { count: unreadCount } = await (supabase as any)
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', adminId)
    .is('read_at', null);

  // Filtered query
  let query = (supabase as any)
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('user_id', adminId);

  if (params?.eventType && params.eventType !== 'all') {
    query = query.eq('type', params.eventType);
  }

  if (params?.status === 'unread') {
    query = query.is('read_at', null);
  } else if (params?.status === 'read') {
    query = query.not('read_at', 'is', null);
  }

  if (params?.search && params.search.trim()) {
    const s = params.search.trim();
    query = query.or(`title.ilike.%${s}%,message.ilike.%${s}%`);
  }

  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('[fetchAdminNotifications] Error querying notifications:', error);
    return {
      notifications: [],
      totalCount: 0,
      unreadCount: unreadCount || 0,
      page,
      totalPages: 1,
    };
  }

  const total = count || 0;
  const notifications: AdminNotification[] = (data || []).map((row: any) => ({
    ...row,
    isUnread: !row.read_at,
  }));

  return {
    notifications,
    totalCount: total,
    unreadCount: unreadCount || 0,
    page,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

/**
 * Mark a single notification as read
 */
export async function markAdminNotificationRead(notificationId: string): Promise<{ success: boolean }> {
  const adminId = await requireAdmin();
  const supabase = await createClient();

  const { error } = await (supabase as any)
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('user_id', adminId);

  if (error) {
    console.error('[markAdminNotificationRead] Error:', error);
    return { success: false };
  }

  revalidatePath('/admin');
  revalidatePath('/admin/notifications');
  return { success: true };
}

/**
 * Mark all notifications as read for current admin
 */
export async function markAllAdminNotificationsRead(): Promise<{ success: boolean; count: number }> {
  const adminId = await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await (supabase as any)
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', adminId)
    .is('read_at', null)
    .select('id');

  if (error) {
    console.error('[markAllAdminNotificationsRead] Error:', error);
    return { success: false, count: 0 };
  }

  revalidatePath('/admin');
  revalidatePath('/admin/notifications');
  return { success: true, count: data?.length || 0 };
}

/**
 * Delete a notification
 */
export async function deleteAdminNotification(notificationId: string): Promise<{ success: boolean }> {
  const adminId = await requireAdmin();
  const supabase = await createAdminClient();

  const { error } = await (supabase as any)
    .from('notifications')
    .delete()
    .eq('id', notificationId)
    .eq('user_id', adminId);

  if (error) {
    console.error('[deleteAdminNotification] Error:', error);
    return { success: false };
  }

  revalidatePath('/admin');
  revalidatePath('/admin/notifications');
  return { success: true };
}

/**
 * Retrieve admin notification preferences
 */
export async function getAdminNotificationPreferences(): Promise<AdminNotificationPreferences> {
  const adminId = await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await (supabase as any)
    .from('admin_notification_preferences')
    .select('*')
    .eq('admin_user_id', adminId)
    .maybeSingle();

  if (error) {
    console.error('[getAdminNotificationPreferences] Error:', error);
  }

  if (data) {
    return {
      admin_user_id: data.admin_user_id,
      email_enabled: data.email_enabled,
      in_app_enabled: data.in_app_enabled,
      event_subscriptions: {
        ...DEFAULT_ADMIN_PREFERENCES.event_subscriptions,
        ...(data.event_subscriptions || {}),
      },
    };
  }

  return {
    admin_user_id: adminId,
    ...DEFAULT_ADMIN_PREFERENCES,
  };
}

/**
 * Update admin notification preferences
 */
export async function updateAdminNotificationPreferences(
  preferences: Partial<AdminNotificationPreferences>
): Promise<{ success: boolean }> {
  const adminId = await requireAdmin();
  const supabase = await createClient();

  const payload = {
    admin_user_id: adminId,
    email_enabled: preferences.email_enabled ?? true,
    in_app_enabled: preferences.in_app_enabled ?? true,
    event_subscriptions: preferences.event_subscriptions ?? DEFAULT_ADMIN_PREFERENCES.event_subscriptions,
    updated_at: new Date().toISOString(),
  };

  const { error } = await (supabase as any)
    .from('admin_notification_preferences')
    .upsert(payload, { onConflict: 'admin_user_id' });

  if (error) {
    console.error('[updateAdminNotificationPreferences] Error:', error);
    return { success: false };
  }

  revalidatePath('/admin/notifications');
  return { success: true };
}

/**
 * Trigger manual outbox flush by admin
 */
export async function triggerManualEmailDispatch(): Promise<{
  success: boolean;
  result?: any;
}> {
  await requireAdmin();
  const result = await processPendingEmailEvents();
  return { success: true, result };
}

export interface PlatformNotificationSettings {
  primary_admin_email: string;
  email_notifications_enabled: boolean;
  updated_at?: string;
}

/**
 * Retrieve the central primary platform notification email settings
 */
export async function getPlatformNotificationSettings(): Promise<PlatformNotificationSettings> {
  await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await (supabase as any)
    .from('platform_notification_settings')
    .select('primary_admin_email, email_notifications_enabled, updated_at')
    .eq('id', 1)
    .maybeSingle();

  if (error) {
    console.error('[getPlatformNotificationSettings] Error:', error);
  }

  return {
    primary_admin_email: data?.primary_admin_email || process.env.ADMIN_NOTIFY_EMAIL || 'ashdeveloper2247@gmail.com',
    email_notifications_enabled: data?.email_notifications_enabled ?? true,
    updated_at: data?.updated_at,
  };
}

/**
 * Update the central primary platform notification email settings
 */
export async function updatePlatformNotificationSettings(
  settings: Partial<PlatformNotificationSettings>
): Promise<{ success: boolean }> {
  const adminId = await requireAdmin();
  const supabase = await createClient();

  const email = (settings.primary_admin_email || '').trim().toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Invalid email address format.');
  }

  const { error } = await (supabase as any)
    .from('platform_notification_settings')
    .upsert({
      id: 1,
      primary_admin_email: email || 'ashdeveloper2247@gmail.com',
      email_notifications_enabled: settings.email_notifications_enabled ?? true,
      updated_at: new Date().toISOString(),
      updated_by: adminId,
    });

  if (error) {
    console.error('[updatePlatformNotificationSettings] Error:', error);
    return { success: false };
  }

  revalidatePath('/admin/notifications');
  return { success: true };
}
