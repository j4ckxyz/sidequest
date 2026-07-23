import { Ban, CheckCircle2, FileSearch, Gavel, Inbox, Loader2, RadarIcon, ScanSearch, ShieldAlert, ShieldCheck, XCircle, type LucideIcon } from 'lucide-react';
import { useModerationActions, useModerationEvents, useReports, useRunAutomod } from '../../hooks/useModeration';
import { useProfiles } from '../../hooks/useProfile';
import { useToast } from '../../context/ToastProvider';
import { formatRelativeTime, cx } from '../../lib/utils';
import type { ModerationEvent } from '../../types/models';

// Enforcement rows record their actor in `decided_by`: 'gemini' (report agent),
// 'automod' (proactive sweep), or an admin user id.
function actorLabel(decidedBy: string): string {
  if (decidedBy === 'gemini') return 'Gemini';
  if (decidedBy === 'automod') return 'Auto-mod';
  return 'admin';
}

const KIND: Record<ModerationEvent['kind'], { icon: LucideIcon; tone: string; pulse?: boolean }> = {
  received: { icon: Inbox, tone: 'text-text-muted' },
  context: { icon: FileSearch, tone: 'text-sage' },
  analyzing: { icon: ScanSearch, tone: 'text-warning', pulse: true },
  decision: { icon: Gavel, tone: 'text-primary' },
  applied: { icon: ShieldAlert, tone: 'text-danger' },
  done: { icon: CheckCircle2, tone: 'text-sage' },
  error: { icon: XCircle, tone: 'text-danger' },
};

const ACTION_META: Record<string, { icon: LucideIcon; tone: string; label: string }> = {
  dismiss: { icon: ShieldCheck, tone: 'text-sage', label: 'Dismissed' },
  remove_post: { icon: XCircle, tone: 'text-danger', label: 'Post removed' },
  ban_user: { icon: Ban, tone: 'text-danger', label: 'User banned' },
  suspend_user: { icon: Ban, tone: 'text-danger', label: 'User suspended' },
  unban: { icon: ShieldCheck, tone: 'text-sage', label: 'Restriction lifted' },
};

export function ModerationPanel({ callerId }: { callerId: string }) {
  const { data: events } = useModerationEvents(callerId);
  const { data: actions } = useModerationActions(callerId);
  const { data: reports } = useReports(callerId);

  const actionList = actions ?? [];
  const { data: actionProfiles } = useProfiles(actionList.map((a) => a.target_user_id));
  const nameById = new Map((actionProfiles ?? []).map((p) => [p.id, p.full_name]));

  const items = events ?? [];
  const working = items.length > 0 && items[0].kind !== 'done' && items[0].kind !== 'error';
  const pendingReports = (reports ?? []).filter((r) => r.status !== 'resolved').length;

  const automod = useRunAutomod();
  const { showToast } = useToast();

  return (
    <div className="mt-5 overflow-hidden rounded-xl border border-border bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-[linear-gradient(135deg,var(--color-primary-soft),var(--color-surface)_60%)] px-5 py-4">
        <div className="flex items-center gap-2.5">
          <ShieldCheck size={18} className="text-primary" />
          <div>
            <p className="text-sm font-semibold text-text">AI moderation — live</p>
            <p className="text-xs text-text-muted">
              Gemini reviews every report and also sweeps all posts on its own every few minutes, acting autonomously. You can override below.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={automod.isPending}
            onClick={() =>
              automod.mutate(undefined, {
                onSuccess: (r) =>
                  showToast(
                    r.enforced > 0
                      ? `Automod scanned ${r.scanned} posts and took action on ${r.enforced}.`
                      : `Automod scanned ${r.scanned} posts — nothing to action.`,
                  ),
                onError: (e) => showToast(e instanceof Error ? e.message : 'Automod sweep failed.', 'error'),
              })
            }
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-text-muted hover:text-text disabled:opacity-50"
          >
            {automod.isPending ? <Loader2 size={12} className="animate-spin" /> : <RadarIcon size={12} />}
            Scan now
          </button>
          <span
            className={cx(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
              working ? 'bg-warning-soft text-warning' : 'bg-sage-soft text-sage',
            )}
          >
            {working ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
            {working ? 'Reviewing…' : 'Idle'}
            {pendingReports > 0 && <span className="ml-1 opacity-80">· {pendingReports} open</span>}
          </span>
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[1.4fr_1fr]">
        {/* Live agent feed */}
        <div className="max-h-80 overflow-y-auto border-border p-4 lg:border-r">
          {items.length === 0 ? (
            <p className="py-8 text-center text-sm text-text-muted">
              No activity yet. Report a job or user and watch the agent work in real time.
            </p>
          ) : (
            <ol className="space-y-3">
              {items.map((e) => {
                const meta = KIND[e.kind];
                const Icon = meta.icon;
                return (
                  <li key={e.id} className="flex items-start gap-2.5">
                    <Icon size={15} className={cx('mt-0.5 shrink-0', meta.tone, meta.pulse && 'animate-pulse')} />
                    <div className="min-w-0">
                      <p className="text-sm leading-snug text-text">{e.message}</p>
                      <p className="mt-0.5 text-xs text-text-muted">{formatRelativeTime(e.created_at)}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        {/* Enforcement log */}
        <div className="max-h-80 overflow-y-auto p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Recent actions</p>
          {actionList.length === 0 ? (
            <p className="py-6 text-center text-sm text-text-muted">No enforcement actions yet.</p>
          ) : (
            <ul className="space-y-2.5">
              {actionList.map((a) => {
                const meta = ACTION_META[a.action] ?? ACTION_META.dismiss;
                const Icon = meta.icon;
                const name = nameById.get(a.target_user_id);
                return (
                  <li key={a.id} className="flex items-start gap-2.5">
                    <Icon size={15} className={cx('mt-0.5 shrink-0', meta.tone)} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text">
                        {meta.label}
                        {name && <span className="text-text"> · {name}</span>}
                        <span className="font-normal text-text-muted"> · by {actorLabel(a.decided_by)}</span>
                      </p>
                      <p className="text-xs text-text-muted">{a.reason}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
