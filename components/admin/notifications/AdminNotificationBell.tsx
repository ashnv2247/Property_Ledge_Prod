'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCheck,
  Check,
  UserPlus,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ExternalLink,
  Settings,
  Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAdminNotifications } from '@/lib/hooks/useAdminNotifications';
import { cn } from '@/lib/utils';
import type { AdminNotification } from '@/app/actions/admin-notifications';

function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return 'Just now';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString('en-AU', { month: 'short', day: 'numeric' });
}

function getEventIcon(type: string) {
  switch (type) {
    case 'user_registered':
      return <UserPlus className="h-4 w-4 text-emerald-400" />;
    case 'subscription_initiated':
      return <CreditCard className="h-4 w-4 text-blue-400" />;
    case 'payment_success':
      return <CheckCircle2 className="h-4 w-4 text-teal-400" />;
    case 'payment_failed':
      return <AlertTriangle className="h-4 w-4 text-rose-400" />;
    case 'subscription_cancelled':
      return <XCircle className="h-4 w-4 text-amber-400" />;
    case 'subscription_expired':
      return <Clock className="h-4 w-4 text-slate-400" />;
    default:
      return <Bell className="h-4 w-4 text-cyan-400" />;
  }
}

export function AdminNotificationBell({ className }: { className?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const {
    notifications,
    unreadCount,
    isLoading,
    markRead,
    markAllRead,
    refresh,
  } = useAdminNotifications({
    limit: 10,
  });

  // Close when clicked outside or Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleNotificationClick = async (notif: AdminNotification) => {
    if (notif.isUnread) {
      await markRead(notif.id);
    }
    if (notif.target_url) {
      setIsOpen(false);
      router.push(notif.target_url);
    }
  };

  return (
    <div className={cn('relative', className)} ref={panelRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) refresh();
        }}
        className={cn(
          'relative flex h-9 w-9 items-center justify-center rounded-xl border border-admin-border transition-colors',
          isOpen
            ? 'bg-admin-surface text-admin-foreground border-admin-border-strong'
            : 'text-admin-muted hover:bg-admin-surface-subtle hover:text-admin-foreground'
        )}
        aria-label="Admin notifications"
        aria-expanded={isOpen}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-slate-950 shadow-sm animate-in fade-in zoom-in">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl border border-admin-border bg-[#121217] shadow-2xl backdrop-blur-xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-admin-border px-4 py-3 bg-[#16161d]">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-admin-foreground">Admin Notifications</span>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-400 border border-emerald-500/20">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() => markAllRead()}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-admin-muted transition-colors hover:bg-admin-surface hover:text-admin-foreground"
                    title="Mark all as read"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Mark all</span>
                  </button>
                )}
                <Link
                  href="/admin/notifications?tab=preferences"
                  onClick={() => setIsOpen(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-admin-muted transition-colors hover:bg-admin-surface hover:text-admin-foreground"
                  title="Notification settings"
                >
                  <Settings className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            {/* List */}
            <div className="max-h-[380px] overflow-y-auto divide-y divide-admin-border/50">
              {isLoading && notifications.length === 0 ? (
                <div className="flex items-center justify-center py-10 text-admin-muted">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  <span className="text-xs">Loading alerts...</span>
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-10 text-center">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-admin-surface text-admin-muted mb-2">
                    <Bell className="h-5 w-5 opacity-40" />
                  </div>
                  <p className="text-xs font-medium text-admin-foreground">No notifications yet</p>
                  <p className="text-[11px] text-admin-muted mt-0.5">Platform alerts will appear here in real time.</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={cn(
                      'group relative flex items-start gap-3 p-3.5 transition-colors cursor-pointer',
                      notif.isUnread ? 'bg-[#181822]/80 hover:bg-[#1f1f2e]' : 'hover:bg-admin-surface/40'
                    )}
                  >
                    {/* Unread indicator pip */}
                    {notif.isUnread && (
                      <span className="absolute left-1.5 top-5 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    )}

                    {/* Icon container */}
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-admin-surface border border-admin-border">
                      {getEventIcon(notif.type)}
                    </div>

                    {/* Body */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className={cn('text-xs truncate', notif.isUnread ? 'font-semibold text-admin-foreground' : 'font-medium text-admin-muted')}>
                          {notif.title}
                        </p>
                        <span className="shrink-0 text-[10px] text-admin-muted">
                          {formatRelativeTime(notif.created_at)}
                        </span>
                      </div>
                      <p className="text-[11px] text-admin-muted line-clamp-2 mt-0.5 leading-relaxed">
                        {notif.message}
                      </p>

                      {notif.target_url && (
                        <div className="mt-1.5 flex items-center gap-1 text-[10px] font-medium text-emerald-400 group-hover:underline">
                          <span>View details</span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </div>
                      )}
                    </div>

                    {/* Mark read button */}
                    {notif.isUnread && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          markRead(notif.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-admin-surface text-admin-muted hover:text-admin-foreground"
                        title="Mark as read"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-admin-border bg-[#16161d] p-2 text-center">
              <Link
                href="/admin/notifications"
                onClick={() => setIsOpen(false)}
                className="block w-full py-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                View all notifications &rarr;
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

