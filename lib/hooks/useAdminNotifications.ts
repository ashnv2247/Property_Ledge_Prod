'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  fetchAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  type AdminNotification,
} from '@/app/actions/admin-notifications';

export function useAdminNotifications(options?: {
  limit?: number;
  onNewNotification?: (notification: AdminNotification) => void;
}) {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const onNewRef = useRef(options?.onNewNotification);
  onNewRef.current = options?.onNewNotification;

  const loadNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetchAdminNotifications({
        limit: options?.limit || 20,
        status: 'all',
      });
      setNotifications(res.notifications);
      setUnreadCount(res.unreadCount);
    } catch (err) {
      console.error('[useAdminNotifications] Load failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [options?.limit]);

  // 1. Initial fetch & current user identification
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUserId(user.id);
      }
    });

    loadNotifications();
  }, [loadNotifications]);

  // 2. Realtime subscription on public.notifications filtered by user_id
  useEffect(() => {
    if (!currentUserId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`admin-notifications-${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUserId}`,
        },
        (payload) => {
          const newRow = payload.new as any;
          const newNotification: AdminNotification = {
            ...newRow,
            isUnread: !newRow.read_at,
          };

          setNotifications((prev) => {
            // Avoid duplicates
            if (prev.some((n) => n.id === newNotification.id)) return prev;
            return [newNotification, ...prev];
          });
          setUnreadCount((c) => c + 1);

          if (onNewRef.current) {
            onNewRef.current(newNotification);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUserId}`,
        },
        (payload) => {
          const updatedRow = payload.new as any;
          setNotifications((prev) =>
            prev.map((n) =>
              n.id === updatedRow.id
                ? { ...updatedRow, isUnread: !updatedRow.read_at }
                : n
            )
          );
          // Recalculate unread
          setNotifications((latest) => {
            setUnreadCount(latest.filter((n) => n.isUnread).length);
            return latest;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  const markRead = useCallback(async (id: string) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString(), isUnread: false } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));

    await markAdminNotificationRead(id);
  }, []);

  const markAllRead = useCallback(async () => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString(), isUnread: false }))
    );
    setUnreadCount(0);

    await markAllAdminNotificationsRead();
  }, []);

  return {
    notifications,
    unreadCount,
    isLoading,
    refresh: loadNotifications,
    markRead,
    markAllRead,
  };
}

