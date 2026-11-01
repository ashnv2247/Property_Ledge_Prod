'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Bell,
  CheckCheck,
  Check,
  Trash2,
  RefreshCw,
  Send,
  Sliders,
  Search,
  Filter,
  ExternalLink,
  UserPlus,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Mail,
  ChevronLeft,
  ChevronRight,
  Shield,
  Loader2,
} from 'lucide-react';
import {
  PageContainer,
  PageHeader,
  Card,
  CardHeader,
  CardContent,
  Button,
  Input,
  Select,
  Badge,
  Switch,
  useToast,
} from '@/components/admin/ui';
import {
  fetchAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  deleteAdminNotification,
  getAdminNotificationPreferences,
  updateAdminNotificationPreferences,
  getPlatformNotificationSettings,
  updatePlatformNotificationSettings,
  triggerManualEmailDispatch,
  DEFAULT_ADMIN_PREFERENCES,
  type AdminNotification,
  type AdminNotificationPreferences,
} from '@/app/actions/admin-notifications';
import { useAdminNotifications } from '@/lib/hooks/useAdminNotifications';
import { cn } from '@/lib/utils';

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
  return new Date(dateStr).toLocaleDateString('en-AU', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getEventBadge(type: string) {
  switch (type) {
    case 'user_registered':
      return {
        label: 'User Registered',
        icon: <UserPlus className="h-3 w-3 text-emerald-400" />,
        badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      };
    case 'subscription_initiated':
      return {
        label: 'Subscription Attempt',
        icon: <CreditCard className="h-3 w-3 text-blue-400" />,
        badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      };
    case 'payment_success':
      return {
        label: 'Payment Activated',
        icon: <CheckCircle2 className="h-3 w-3 text-teal-400" />,
        badgeClass: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
      };
    case 'payment_failed':
      return {
        label: 'Payment Failed',
        icon: <AlertTriangle className="h-3 w-3 text-rose-400" />,
        badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      };
    case 'subscription_cancelled':
      return {
        label: 'Subscription Cancelled',
        icon: <XCircle className="h-3 w-3 text-amber-400" />,
        badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      };
    case 'subscription_expired':
      return {
        label: 'Subscription Expired',
        icon: <Clock className="h-3 w-3 text-slate-400" />,
        badgeClass: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
      };
    default:
      return {
        label: 'System Alert',
        icon: <Bell className="h-3 w-3 text-cyan-400" />,
        badgeClass: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
      };
  }
}

export default function AdminNotificationsPage() {
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'feed' | 'preferences'>('feed');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);

  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFlushingOutbox, setIsFlushingOutbox] = useState<boolean>(false);

  // Preferences State
  const [preferences, setPreferences] = useState<AdminNotificationPreferences>({
    admin_user_id: '',
    ...DEFAULT_ADMIN_PREFERENCES,
  });
  const [primaryAdminEmail, setPrimaryAdminEmail] = useState<string>('shdeveloper2247@gmail.com');
  const [isSavingPrefs, setIsSavingPrefs] = useState<boolean>(false);
  const [isLoadingPrefs, setIsLoadingPrefs] = useState<boolean>(false);

  // Search debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load notifications feed
  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchAdminNotifications({
        page,
        limit: 15,
        status: statusFilter,
        eventType: eventTypeFilter,
        search: debouncedSearch,
      });
      setNotifications(res.notifications);
      setTotalCount(res.totalCount);
      setUnreadCount(res.unreadCount);
      setTotalPages(res.totalPages);
    } catch (err: any) {
      toast({
        title: 'Error loading notifications',
        message: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter, eventTypeFilter, debouncedSearch, toast]);

  useEffect(() => {
    if (activeTab === 'feed') {
      loadNotifications();
    }
  }, [activeTab, loadNotifications]);

  // Load preferences
  useEffect(() => {
    if (activeTab === 'preferences') {
      setIsLoadingPrefs(true);
      Promise.all([
        getAdminNotificationPreferences(),
        getPlatformNotificationSettings(),
      ])
        .then(([prefs, platformSettings]) => {
          setPreferences(prefs);
          if (platformSettings?.primary_admin_email) {
            setPrimaryAdminEmail(platformSettings.primary_admin_email);
          }
        })
        .catch((err) => {
          toast({
            title: 'Failed to load preferences',
            message: err.message,
            variant: 'destructive',
          });
        })
        .finally(() => setIsLoadingPrefs(false));
    }
  }, [activeTab, toast]);

  // Mark single read
  const handleMarkRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString(), isUnread: false } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    await markAdminNotificationRead(id);
  };

  // Mark all read
  const handleMarkAllRead = async () => {
    const res = await markAllAdminNotificationsRead();
    if (res.success) {
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString(), isUnread: false }))
      );
      setUnreadCount(0);
      toast({
        title: 'All notifications marked as read',
        message: `${res.count} items updated`,
        variant: 'success',
      });
    }
  };

  // Delete notification
  const handleDelete = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setTotalCount((c) => Math.max(0, c - 1));
    const res = await deleteAdminNotification(id);
    if (!res.success) {
      loadNotifications();
    }
  };

  // Flush Outbox
  const handleFlushOutbox = async () => {
    setIsFlushingOutbox(true);
    try {
      const res = await triggerManualEmailDispatch();
      const count = res.result?.processed || 0;
      const sent = res.result?.successful || 0;
      toast({
        title: 'Email Outbox Processed',
        message: `${sent} of ${count} pending notification emails dispatched via Resend.`,
        variant: 'success',
      });
    } catch (err: any) {
      toast({
        title: 'Outbox dispatch failed',
        message: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsFlushingOutbox(false);
    }
  };

  // Save Preferences
  const handleSavePreferences = async () => {
    setIsSavingPrefs(true);
    try {
      const [prefRes, setRes] = await Promise.all([
        updateAdminNotificationPreferences(preferences),
        updatePlatformNotificationSettings({ primary_admin_email: primaryAdminEmail }),
      ]);
      if (prefRes.success && setRes.success) {
        toast({
          title: 'Notification Preferences Saved',
          message: `Admin preferences and primary notification email (${primaryAdminEmail}) updated.`,
          variant: 'success',
        });
      } else {
        throw new Error('Failed to save preferences.');
      }
    } catch (err: any) {
      toast({
        title: 'Failed to update preferences',
        message: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsSavingPrefs(false);
    }
  };

  return (
    <PageContainer>
      {/* Header */}
      <PageHeader
        title="Admin Notifications"
        description="Centralized real-time notifications for user registrations, subscription requests, verified activations, and billing events."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleFlushOutbox}
              disabled={isFlushingOutbox}
            >
              {isFlushingOutbox ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <Send className="h-3.5 w-3.5 mr-1.5 text-blue-400" />
              )}
              Flush Email Outbox
            </Button>
            {activeTab === 'feed' && unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllRead}
              >
                <CheckCheck className="h-3.5 w-3.5 mr-1.5 text-emerald-400" />
                Mark all read ({unreadCount})
              </Button>
            )}
            <Button
              variant={activeTab === 'preferences' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setActiveTab(activeTab === 'feed' ? 'preferences' : 'feed')}
            >
              <Sliders className="h-3.5 w-3.5 mr-1.5" />
              {activeTab === 'feed' ? 'Preferences' : 'Back to Feed'}
            </Button>
          </div>
        }
      />

      {/* Main Container */}
      {activeTab === 'feed' ? (
        <div className="space-y-4">
          {/* Filter Bar */}
          <Card className="p-4 border-admin-border bg-[#141419]">
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-admin-muted" />
                <input
                  type="text"
                  placeholder="Search notification messages or titles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-admin-surface border border-admin-border text-xs text-admin-foreground focus:outline-none focus:border-admin-primary transition-colors"
                />
              </div>

              {/* Status Tabs & Event Filter */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Status Toggle */}
                <div className="flex rounded-xl bg-admin-surface border border-admin-border p-0.5">
                  {(['all', 'unread', 'read'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => {
                        setStatusFilter(st);
                        setPage(1);
                      }}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors',
                        statusFilter === st
                          ? 'bg-[#1e2029] text-admin-foreground shadow-sm'
                          : 'text-admin-muted hover:text-admin-foreground'
                      )}
                    >
                      {st}
                      {st === 'unread' && unreadCount > 0 && (
                        <span className="ml-1.5 rounded-full bg-emerald-500/20 px-1.5 py-0.2 text-[10px] text-emerald-400 font-bold">
                          {unreadCount}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Event Type Filter */}
                <select
                  value={eventTypeFilter}
                  onChange={(e) => {
                    setEventTypeFilter(e.target.value);
                    setPage(1);
                  }}
                  className="px-3 py-2 rounded-xl bg-admin-surface border border-admin-border text-xs text-admin-foreground focus:outline-none focus:border-admin-primary transition-colors"
                >
                  <option value="all">All Events</option>
                  <option value="user_registered">User Registered</option>
                  <option value="subscription_initiated">Subscription Attempt</option>
                  <option value="payment_success">Payment Activated</option>
                  <option value="payment_failed">Payment Failed</option>
                  <option value="subscription_cancelled">Subscription Cancelled</option>
                  <option value="subscription_expired">Subscription Expired</option>
                </select>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadNotifications()}
                  title="Refresh list"
                >
                  <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
                </Button>
              </div>
            </div>
          </Card>

          {/* Notifications Feed */}
          <div className="space-y-2.5">
            {isLoading && notifications.length === 0 ? (
              <Card className="p-12 text-center border-admin-border bg-[#141419]">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-admin-muted mb-2" />
                <p className="text-xs text-admin-muted">Loading notifications...</p>
              </Card>
            ) : notifications.length === 0 ? (
              <Card className="p-12 text-center border-admin-border bg-[#141419]">
                <Bell className="h-8 w-8 text-admin-muted opacity-30 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-admin-foreground">No notifications found</h3>
                <p className="text-xs text-admin-muted mt-1 max-w-sm mx-auto">
                  {debouncedSearch || eventTypeFilter !== 'all' || statusFilter !== 'all'
                    ? 'Try clearing your filters or search query.'
                    : 'When users register, start checkouts, or verify payments, alerts will appear here.'}
                </p>
              </Card>
            ) : (
              notifications.map((notif) => {
                const badge = getEventBadge(notif.type);
                return (
                  <Card
                    key={notif.id}
                    className={cn(
                      'p-4 border transition-all duration-150',
                      notif.isUnread
                        ? 'border-emerald-500/30 bg-[#161a22]'
                        : 'border-admin-border/70 bg-[#131318] opacity-80 hover:opacity-100'
                    )}
                  >
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                      {/* Left: Icon & Content */}
                      <div className="flex items-start gap-3.5 flex-1 min-w-0">
                        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-admin-surface border border-admin-border">
                          {badge.icon}
                        </div>

                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border', badge.badgeClass)}>
                              {badge.icon}
                              {badge.label}
                            </span>
                            {notif.isUnread && (
                              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                                Unread
                              </span>
                            )}
                            <span className="text-[11px] text-admin-muted">
                              {formatRelativeTime(notif.created_at)}
                            </span>
                          </div>

                          <h4 className="text-sm font-semibold text-admin-foreground">
                            {notif.title}
                          </h4>

                          <p className="text-xs text-slate-300 leading-relaxed">
                            {notif.message}
                          </p>

                          {/* Metadata Chip Row */}
                          {notif.metadata && Object.keys(notif.metadata).length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-1 text-[11px] text-admin-muted font-mono">
                              {notif.metadata.reference && (
                                <span className="bg-admin-surface px-2 py-0.5 rounded border border-admin-border">
                                  Ref: <span className="text-admin-foreground font-semibold">{notif.metadata.reference}</span>
                                </span>
                              )}
                              {notif.metadata.amount !== undefined && (
                                <span className="bg-admin-surface px-2 py-0.5 rounded border border-admin-border">
                                  Amount: <span className="text-admin-foreground font-semibold">${Number(notif.metadata.amount).toFixed(2)} {notif.metadata.currency || 'AUD'}</span>
                                </span>
                              )}
                              {notif.metadata.planName && (
                                <span className="bg-admin-surface px-2 py-0.5 rounded border border-admin-border">
                                  Plan: <span className="text-admin-foreground font-semibold">{notif.metadata.planName}</span>
                                </span>
                              )}
                              {notif.metadata.email && (
                                <span className="bg-admin-surface px-2 py-0.5 rounded border border-admin-border">
                                  Email: <span className="text-admin-foreground">{notif.metadata.email}</span>
                                </span>
                              )}
                              {notif.metadata.failureReason && (
                                <span className="bg-rose-500/10 text-rose-300 px-2 py-0.5 rounded border border-rose-500/20 font-sans">
                                  Reason: {notif.metadata.failureReason}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                        {notif.target_url && (
                          <Link href={notif.target_url}>
                            <Button variant="outline" size="sm" className="h-8 text-xs">
                              <span>Open Record</span>
                              <ExternalLink className="h-3 w-3 ml-1 text-emerald-400" />
                            </Button>
                          </Link>
                        )}
                        {notif.isUnread && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs text-admin-muted hover:text-admin-foreground"
                            onClick={() => handleMarkRead(notif.id)}
                            title="Mark as read"
                          >
                            <Check className="h-3.5 w-3.5 mr-1 text-emerald-400" />
                            Read
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs text-admin-muted hover:text-rose-400"
                          onClick={() => handleDelete(notif.id)}
                          title="Delete notification"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between py-2 text-xs text-admin-muted">
              <span>
                Showing Page {page} of {totalPages} ({totalCount} total)
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Preferences Configuration Tab */
        <div className="space-y-6 max-w-4xl">
          {/* Primary Platform Notification Email */}
          <Card className="border-admin-border bg-[#141419] p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="text-base font-semibold text-admin-foreground">Primary Platform Notification Email</h3>
                <p className="text-xs text-admin-muted mt-1">
                  All platform-level administrative event notifications are dispatched to this destination via Resend.
                </p>
              </div>
              <span className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Single Event Dispatch
              </span>
            </div>

            <div className="max-w-md space-y-2">
              <label className="text-xs font-medium text-admin-muted">Recipient Email Address</label>
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={primaryAdminEmail}
                  onChange={(e) => setPrimaryAdminEmail(e.target.value)}
                  placeholder="shdeveloper2247@gmail.com"
                  className="flex-1 px-3 py-2 rounded-xl bg-admin-surface border border-admin-border text-xs text-admin-foreground focus:outline-none focus:border-admin-primary transition-colors font-mono"
                />
              </div>
              <p className="text-[11px] text-admin-muted">
                Configured environment key: <code className="text-emerald-400">ADMIN_NOTIFY_EMAIL</code>. Exactly one email is queued per business event, regardless of the number of administrators.
              </p>
            </div>
          </Card>

          <Card className="border-admin-border bg-[#141419] p-6">
            <h3 className="text-base font-semibold text-admin-foreground">Notification Channels</h3>
            <p className="text-xs text-admin-muted mt-1 mb-6">
              Control which delivery channels are globally enabled for platform administrator alerts.
            </p>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-admin-surface border border-admin-border">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Bell className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-admin-foreground">In-App Dashboard Alerts</h4>
                    <p className="text-xs text-admin-muted">
                      Receive instant real-time badges, header counter updates, and notifications in the admin shell.
                    </p>
                  </div>
                </div>
                <Switch
                  checked={preferences.in_app_enabled}
                  onChange={(e) =>
                    setPreferences((prev) => ({ ...prev, in_app_enabled: e.target.checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-admin-surface border border-admin-border">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-admin-foreground">Email Notifications (Resend)</h4>
                    <p className="text-xs text-admin-muted">
                      Enqueue transactional outbox emails to administrator addresses with dark-mode branded templates.
                    </p>
                  </div>
                </div>
                <Switch
                  checked={preferences.email_enabled}
                  onChange={(e) =>
                    setPreferences((prev) => ({ ...prev, email_enabled: e.target.checked }))
                  }
                />
              </div>
            </div>
          </Card>

          <Card className="border-admin-border bg-[#141419] p-6">
            <h3 className="text-base font-semibold text-admin-foreground">Event Subscriptions Matrix</h3>
            <p className="text-xs text-admin-muted mt-1 mb-6">
              Granularly configure which platform events trigger in-app notifications and email dispatches.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-admin-border text-admin-muted uppercase text-[10px] tracking-wider">
                    <th className="pb-3 font-semibold">Event Type</th>
                    <th className="pb-3 font-semibold">Description</th>
                    <th className="pb-3 font-semibold text-center w-28">In-App</th>
                    <th className="pb-3 font-semibold text-center w-28">Email</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-admin-border/50">
                  {[
                    {
                      key: 'user_registered' as const,
                      title: 'User Registration',
                      desc: 'A new user successfully signs up for PropertyLedge.',
                    },
                    {
                      key: 'subscription_initiated' as const,
                      title: 'Subscription Attempt',
                      desc: 'A customer selects a subscription plan and initiates checkout.',
                    },
                    {
                      key: 'payment_success' as const,
                      title: 'Successful Payment',
                      desc: 'Payment evidence verified or billing webhook confirms activation.',
                    },
                    {
                      key: 'payment_failed' as const,
                      title: 'Payment Failure',
                      desc: 'Payment evidence rejected or billing transaction fails.',
                    },
                    {
                      key: 'subscription_cancelled' as const,
                      title: 'Subscription Cancellation',
                      desc: 'A customer or provider confirms subscription cancellation.',
                    },
                    {
                      key: 'subscription_expired' as const,
                      title: 'Subscription Expiration',
                      desc: 'Subscription billing period lapses without renewal.',
                    },
                  ].map((evt) => {
                    const currentEvt = preferences.event_subscriptions[evt.key] || { in_app: true, email: true };
                    return (
                      <tr key={evt.key} className="hover:bg-admin-surface/30">
                        <td className="py-3.5 font-medium text-admin-foreground pr-4">
                          {evt.title}
                        </td>
                        <td className="py-3.5 text-admin-muted pr-4">
                          {evt.desc}
                        </td>
                        <td className="py-3.5 text-center">
                          <input
                            type="checkbox"
                            checked={currentEvt.in_app}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setPreferences((prev) => ({
                                ...prev,
                                event_subscriptions: {
                                  ...prev.event_subscriptions,
                                  [evt.key]: {
                                    ...prev.event_subscriptions[evt.key],
                                    in_app: checked,
                                  },
                                },
                              }));
                            }}
                            className="rounded border-admin-border text-emerald-500 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="py-3.5 text-center">
                          <input
                            type="checkbox"
                            checked={currentEvt.email}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setPreferences((prev) => ({
                                ...prev,
                                event_subscriptions: {
                                  ...prev.event_subscriptions,
                                  [evt.key]: {
                                    ...prev.event_subscriptions[evt.key],
                                    email: checked,
                                  },
                                },
                              }));
                            }}
                            className="rounded border-admin-border text-emerald-500 focus:ring-emerald-500"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex justify-end">
              <Button
                variant="primary"
                onClick={handleSavePreferences}
                disabled={isSavingPrefs}
              >
                {isSavingPrefs ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Save Preferences
              </Button>
            </div>
          </Card>
        </div>
      )}
    </PageContainer>
  );
}
