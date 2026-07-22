import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BellRing, CheckCheck, CheckCircle2, MessageSquare, UserPlus, XCircle, type LucideIcon } from 'lucide-react';
import { useAuth } from '../context/AuthProvider';
import { useNotifications, useMarkAllNotificationsRead, useMarkNotificationRead } from '../hooks/useNotifications';
import { useToast } from '../context/ToastProvider';
import { formatRelativeTime, cx } from '../lib/utils';
import { disablePush, enablePush, isPushEnabled, isPushSupported, pushPermission } from '../lib/push';
import { EmptyState } from '../components/ui/EmptyState';
import { PageSpinner } from '../components/ui/Spinner';
import type { Notification, NotificationType } from '../types/models';

const TYPE_META: Record<NotificationType, { icon: LucideIcon; tone: string }> = {
  new_application: { icon: UserPlus, tone: 'bg-primary-soft text-primary' },
  new_message: { icon: MessageSquare, tone: 'bg-primary-soft text-primary' },
  application_accepted: { icon: CheckCircle2, tone: 'bg-sage-soft text-sage' },
  application_rejected: { icon: XCircle, tone: 'bg-surface-2 text-text-muted' },
};

export function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: notifications, isLoading } = useNotifications(user?.id);
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const items = notifications ?? [];
  const hasUnread = items.some((n) => !n.read_at);

  function open(n: Notification) {
    if (!n.read_at) markRead.mutate(n.id);
    navigate(n.link);
  }

  return (
    <div className="mx-auto max-w-2xl px-6 pt-10 pb-16">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text">Notifications</h1>
          <p className="mt-1 text-sm text-text-muted">Applications, messages, and job updates.</p>
        </div>
        {hasUnread && user && (
          <button
            onClick={() => markAll.mutate(user.id)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-text hover:bg-surface-2"
          >
            <CheckCheck size={15} /> Mark all read
          </button>
        )}
      </div>

      <div className="mt-5">
        <PushToggle userId={user?.id} />
      </div>

      {isLoading ? (
        <PageSpinner />
      ) : items.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={<Bell size={28} />}
            title="No notifications yet"
            description="When someone applies to your job, messages you, or responds to an application, it'll show up here."
          />
        </div>
      ) : (
        <div className="mt-6 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {items.map((n) => {
            const meta = TYPE_META[n.type];
            const Icon = meta.icon;
            return (
              <button
                key={n.id}
                onClick={() => open(n)}
                className={cx('flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-2', !n.read_at && 'bg-primary-soft/25')}
              >
                <span className={cx('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', meta.tone)}>
                  <Icon size={17} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text">{n.title}</span>
                    {!n.read_at && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
                  </span>
                  <span className="mt-0.5 block truncate text-sm text-text-muted">{n.body}</span>
                  <span className="mt-1 block text-xs text-text-muted">{formatRelativeTime(n.created_at)}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PushToggle({ userId }: { userId: string | undefined }) {
  const { showToast } = useToast();
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const supported = isPushSupported();
  const permission = pushPermission();

  useEffect(() => {
    isPushEnabled().then(setEnabled);
  }, []);

  if (!supported) {
    return (
      <p className="flex items-center gap-2 rounded-xl border border-dashed border-border px-4 py-3 text-sm text-text-muted">
        <Bell size={16} /> Push notifications aren't available in this browser.
      </p>
    );
  }

  async function toggle() {
    if (!userId) return;
    setBusy(true);
    try {
      if (enabled) {
        await disablePush();
        setEnabled(false);
        showToast('Push notifications turned off.');
      } else {
        const result = await enablePush(userId);
        if (result === 'subscribed') {
          setEnabled(true);
          showToast('Push notifications on — we’ll ping you even when the tab is closed.');
        } else if (result === 'denied') {
          showToast('Notifications are blocked in your browser settings.', 'error');
        } else {
          showToast('Push notifications aren’t available here.', 'error');
        }
      }
    } catch {
      showToast('Could not update push notifications.', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3">
      <div className="flex items-center gap-3">
        <span className={cx('flex h-9 w-9 items-center justify-center rounded-lg', enabled ? 'bg-primary-soft text-primary' : 'bg-surface-2 text-text-muted')}>
          {enabled ? <BellRing size={17} /> : <Bell size={17} />}
        </span>
        <div>
          <p className="text-sm font-medium text-text">Push notifications</p>
          <p className="text-xs text-text-muted">
            {permission === 'denied' ? 'Blocked in browser settings' : enabled ? 'On for this device' : 'Get pinged even when SideQuest is closed'}
          </p>
        </div>
      </div>
      <button
        onClick={toggle}
        disabled={busy || permission === 'denied'}
        className={cx(
          'shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50',
          enabled ? 'border border-border bg-surface text-text hover:bg-surface-2' : 'bg-primary text-on-primary hover:bg-primary-hover',
        )}
      >
        {busy ? '…' : enabled ? 'Turn off' : 'Enable'}
      </button>
    </div>
  );
}
