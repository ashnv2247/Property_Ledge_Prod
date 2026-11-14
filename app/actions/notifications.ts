'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/queries';
import { serverCache } from '@/lib/cache/server-cache';
import type { Database } from '@/types/database';

export type NotificationRow = Database['public']['Tables']['notifications']['Row'];

export interface NotificationItem extends NotificationRow {
  isUnread: boolean;
}

export async function fetchNotifications(limit = 20): Promise<NotificationItem[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const cacheKey = `user:${user.id}:notifications:${limit}`;
  const cached = serverCache.get<NotificationItem[]>(cacheKey);
  if (cached) return cached;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }

  const result = (data || []).map((n) => {
    const row = n as NotificationRow;
    return {
      ...row,
      isUnread: !row.read_at,
    };
  });

  serverCache.set(cacheKey, result, 15_000);
  return result;
}

export async function markNotificationRead(notificationId: string): Promise<{ success: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { success: false };

  const supabase = await createClient();
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() } as never)
    .eq('id', notificationId)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error marking notification read:', error);
    return { success: false };
  }

  serverCache.invalidateUser(user.id);
  revalidatePath('/dashboard');
  return { success: true };
}

export async function markAllNotificationsRead(): Promise<{ success: boolean; count: number }> {
  const user = await getCurrentUser();
  if (!user) return { success: false, count: 0 };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() } as never)
    .eq('user_id', user.id)
    .is('read_at', null)
    .select('id');

  if (error) {
    console.error('Error marking all notifications read:', error);
    return { success: false, count: 0 };
  }

  serverCache.invalidateUser(user.id);
  revalidatePath('/dashboard');
  return { success: true, count: data?.length ?? 0 };
}
