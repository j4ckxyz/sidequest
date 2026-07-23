import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, Trash2, Sparkles, Bot, Crown, Ban, Search, Gavel, ShieldOff, ShieldPlus } from 'lucide-react';
import { useAuth } from '../context/AuthProvider';
import { useAllJobsAdmin, useAllProfiles, useAdminDeleteJob, useSetAdmin } from '../hooks/useAdmin';
import { useRefreshRecommendations } from '../hooks/useRecommendations';
import { useAdminBan, useAdminSuspend, useAdminUnban, useModerationActions } from '../hooks/useModeration';
import { useProfiles } from '../hooks/useProfile';
import { ModerationPanel } from '../components/moderation/ModerationPanel';
import { userBlock } from '../components/layout/BannedScreen';
import { db } from '../lib/db';
import { Input } from '../components/ui/Input';
import { JOB_CATEGORIES, JOB_STATUS_LABEL } from '../lib/constants';
import { Badge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { PageSpinner } from '../components/ui/Spinner';
import { useToast } from '../context/ToastProvider';
import { formatDate, formatRelativeTime, cx } from '../lib/utils';
import type { Profile } from '../types/models';

const STATUS_TONE = { open: 'success', assigned: 'primary', in_progress: 'warning', completed: 'neutral', cancelled: 'danger' } as const;

interface ModerationAction {
  id: string;
  action: 'dismiss' | 'remove_post' | 'ban_user' | 'suspend_user' | 'unban';
  target_user_id: string;
  reason: string;
  ban_until: string | null;
  decided_by: string;
  created_at: string;
}

export function Admin() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'users' | 'jobs'>('users');

  if (!user) return null;
  if (!user.is_admin) return <Navigate to="/" replace />;

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex items-center gap-2">
        <ShieldCheck size={20} className="text-sage" />
        <h1 className="text-2xl text-text">Admin</h1>
      </div>
      <p className="mt-1 text-sm text-text-muted">
        Manage people and posts{user.is_owner ? ', and who else has admin access' : ''}.
      </p>

      <ModerationPanel callerId={user.id} />
      <ModerationActionsPanel callerId={user.id} />

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <RecommendationsPanel />
        <BotsPanel />
      </div>

      <div className="mt-8 flex gap-1 border-b border-border">
        {(['users', 'jobs'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cx(
              '-mb-px border-b-2 px-4 py-2.5 text-sm font-medium capitalize',
              tab === t ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text',
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-6">{tab === 'jobs' ? <JobsTab callerId={user.id} /> : <UsersTab callerId={user.id} />}</div>
    </div>
  );
}

// Chronological log of every enforcement decision, naming the affected user so
// it's clear who was banned / suspended / had a post removed.
function ModerationActionsPanel({ callerId }: { callerId: string }) {
  const { data } = useModerationActions(callerId);
  const actions = (data ?? []) as ModerationAction[];
  const { data: profiles } = useProfiles(actions.map((a) => a.target_user_id));
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  const meta: Record<ModerationAction['action'], { label: string; tone: 'danger' | 'sage' | 'neutral' }> = {
    remove_post: { label: 'Post removed', tone: 'danger' },
    ban_user: { label: 'Banned', tone: 'danger' },
    suspend_user: { label: 'Suspended', tone: 'danger' },
    unban: { label: 'Restriction lifted', tone: 'sage' },
    dismiss: { label: 'Dismissed', tone: 'neutral' },
  };

  if (actions.length === 0) return null;

  return (
    <section className="mt-5 rounded-lg border border-border bg-surface">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Gavel size={16} className="text-primary" />
        <h2 className="text-sm font-semibold text-text">Recent enforcement</h2>
      </div>
      <ul className="max-h-72 divide-y divide-border overflow-y-auto">
        {actions.slice(0, 40).map((action) => {
          const m = meta[action.action];
          const name = nameById.get(action.target_user_id) ?? 'Unknown user';
          return (
            <li key={action.id} className="flex items-start gap-3 px-4 py-3 text-sm">
              <Badge tone={m.tone}>{m.label}</Badge>
              <div className="min-w-0 flex-1">
                <p className="text-text">
                  <span className="font-medium">{name}</span>
                  {action.action === 'ban_user' && action.ban_until && (
                    <span className="text-text-muted"> · until {formatDate(action.ban_until, { day: 'numeric', month: 'short' })}</span>
                  )}
                  <span className="text-text-muted"> · {action.decided_by === 'gemini' ? 'AI agent' : 'admin'}</span>
                </p>
                {action.reason && <p className="mt-0.5 text-xs leading-5 text-text-muted">{action.reason}</p>}
              </div>
              <span className="shrink-0 text-xs text-text-muted">{formatRelativeTime(action.created_at)}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function RecommendationsPanel() {
  const refresh = useRefreshRecommendations();
  const { showToast } = useToast();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex items-start gap-2.5">
        <Sparkles size={18} className="mt-0.5 shrink-0 text-primary" />
        <div>
          <p className="text-sm font-medium text-text">Recommendations</p>
          <p className="text-xs text-text-muted">Re-embed jobs + rebuild search and “Picked for you”. Runs hourly.</p>
        </div>
      </div>
      <Button
        size="md"
        variant="secondary"
        isLoading={refresh.isPending}
        onClick={() =>
          refresh.mutate(undefined, {
            onSuccess: () => showToast('Recommendations refreshed.'),
            onError: (err) => showToast(err instanceof Error ? err.message : 'Refresh failed.', 'error'),
          })
        }
      >
        <Sparkles size={14} /> Refresh now
      </Button>
    </div>
  );
}

function BotsPanel() {
  const { showToast } = useToast();
  const qc = useQueryClient();
  const [count, setCount] = useState(8);
  const summon = useMutation({
    mutationFn: (n: number) => db.bots.summon(n),
    onSuccess: (r) => {
      qc.invalidateQueries();
      showToast(`Summoned ${r.profilesCreated} bots and ${r.jobsCreated} jobs.`);
    },
    onError: (e) => showToast(e instanceof Error ? e.message : 'Could not summon bots.', 'error'),
  });
  const remove = useMutation({
    mutationFn: () => db.bots.remove(),
    onSuccess: (r) => {
      qc.invalidateQueries();
      showToast(`Removed ${r.removed} bot${r.removed === 1 ? '' : 's'}.`);
    },
    onError: (e) => showToast(e instanceof Error ? e.message : 'Could not remove bots.', 'error'),
  });

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex items-start gap-2.5">
        <Bot size={18} className="mt-0.5 shrink-0 text-primary" />
        <div>
          <p className="text-sm font-medium text-text">Demo bots</p>
          <p className="text-xs text-text-muted">AI-generated residents + jobs for demos. Remove anytime.</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={1}
          max={25}
          value={count}
          onChange={(e) => setCount(Math.max(1, Math.min(25, Number(e.target.value) || 1)))}
          className="w-20"
          aria-label="How many bots"
        />
        <Button size="md" variant="secondary" isLoading={summon.isPending} onClick={() => summon.mutate(count)}>
          <Bot size={14} /> Summon
        </Button>
        <Button
          size="md"
          variant="secondary"
          isLoading={remove.isPending}
          onClick={() => {
            if (confirm('Remove all bot accounts and their jobs?')) remove.mutate();
          }}
        >
          <Trash2 size={14} /> Remove all
        </Button>
      </div>
    </div>
  );
}

function JobsTab({ callerId }: { callerId: string }) {
  const { data: jobs, isLoading } = useAllJobsAdmin(callerId);
  const deleteJob = useAdminDeleteJob();
  const { showToast } = useToast();
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term || !jobs) return jobs ?? [];
    return jobs.filter((j) => j.title.toLowerCase().includes(term) || j.parish.toLowerCase().includes(term) || j.category.includes(term));
  }, [jobs, q]);

  if (isLoading) return <PageSpinner />;

  return (
    <div className="space-y-3">
      <SearchBar value={q} onChange={setQ} placeholder="Search jobs by title, parish, category…" />
      <div className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
        {filtered.length === 0 && <p className="p-5 text-sm text-text-muted">No jobs match.</p>}
        {filtered.map((job) => {
          const category = JOB_CATEGORIES.find((c) => c.slug === job.category);
          return (
            <div key={job.id} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate text-sm text-text">{job.title}</p>
                <p className="text-xs text-text-muted">
                  {category?.label} · {job.parish} · posted {formatDate(job.created_at, { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge tone={STATUS_TONE[job.status]}>{JOB_STATUS_LABEL[job.status]}</Badge>
                <Button
                  size="md"
                  variant="secondary"
                  onClick={() => {
                    if (!confirm(`Take down "${job.title}"? This removes it from SideQuest for good.`)) return;
                    deleteJob.mutate({ callerId, jobId: job.id }, { onSuccess: () => showToast('Post taken down.') });
                  }}
                  disabled={deleteJob.isPending}
                >
                  <Trash2 size={14} /> Take down
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function UsersTab({ callerId }: { callerId: string }) {
  const { data: profiles, isLoading } = useAllProfiles(callerId);
  const { data: actions } = useModerationActions(callerId);
  const [q, setQ] = useState('');

  const humanProfiles = useMemo(() => (profiles ?? []).filter((p) => !p.is_bot), [profiles]);
  const caller = profiles?.find((p) => p.id === callerId);
  const canManageAdmins = caller?.is_owner === true;

  // Prior enforcement count per user (excludes dismiss/unban) for at-a-glance risk.
  const strikeCount = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of (actions ?? []) as ModerationAction[]) {
      if (a.action === 'dismiss' || a.action === 'unban') continue;
      map.set(a.target_user_id, (map.get(a.target_user_id) ?? 0) + 1);
    }
    return map;
  }, [actions]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return humanProfiles;
    return humanProfiles.filter(
      (p) =>
        p.full_name.toLowerCase().includes(term) ||
        (p.username ?? '').toLowerCase().includes(term) ||
        (p.parish ?? '').toLowerCase().includes(term),
    );
  }, [humanProfiles, q]);

  if (isLoading) return <PageSpinner />;

  return (
    <div className="space-y-3">
      <SearchBar value={q} onChange={setQ} placeholder="Search people by name, @handle, parish…" />
      <div className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
        {filtered.length === 0 && <p className="p-5 text-sm text-text-muted">No people match.</p>}
        {filtered.map((profile) => (
          <UserRow
            key={profile.id}
            profile={profile}
            callerId={callerId}
            canManageAdmins={canManageAdmins}
            strikes={strikeCount.get(profile.id) ?? 0}
          />
        ))}
      </div>
    </div>
  );
}

function UserRow({ profile, callerId, canManageAdmins, strikes }: { profile: Profile; callerId: string; canManageAdmins: boolean; strikes: number }) {
  const ban = useAdminBan();
  const suspend = useAdminSuspend();
  const unban = useAdminUnban();
  const setAdmin = useSetAdmin();
  const { showToast } = useToast();
  const block = userBlock(profile);
  const isSelf = profile.id === callerId;

  return (
    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar name={profile.full_name} src={profile.avatar_url} size="md" />
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm text-text">
            <span className="truncate font-medium">{profile.full_name}</span>
            {profile.is_owner ? (
              <Badge tone="primary" icon={<Crown size={11} />}>Owner</Badge>
            ) : profile.is_admin ? (
              <Badge tone="sage">Admin</Badge>
            ) : null}
          </p>
          <p className="truncate text-xs text-text-muted">
            {profile.username ? `@${profile.username} · ` : ''}
            {profile.parish ?? '—'} · joined {formatDate(profile.created_at, { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {block.blocked ? (
              <Badge tone="danger">
                {block.suspended ? 'Suspended' : `Banned until ${block.until ? formatDate(block.until, { day: 'numeric', month: 'short' }) : ''}`}
              </Badge>
            ) : (
              <Badge tone="neutral">Active</Badge>
            )}
            {strikes > 0 && <span className="text-xs text-text-muted">{strikes} prior action{strikes === 1 ? '' : 's'}</span>}
          </div>
          {block.blocked && block.reason && <p className="mt-1 max-w-md text-xs leading-5 text-text-muted">“{block.reason}”</p>}
        </div>
      </div>

      {!profile.is_owner && !isSelf && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {block.blocked ? (
            <Button
              size="sm"
              variant="secondary"
              disabled={unban.isPending}
              onClick={() => unban.mutate({ callerId, targetId: profile.id }, { onSuccess: () => showToast('Restriction lifted.') })}
            >
              <ShieldPlus size={14} /> Unban
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                variant="secondary"
                disabled={ban.isPending}
                onClick={() =>
                  ban.mutate(
                    { callerId, targetId: profile.id, days: 7, reason: 'Banned by an admin for breaking the community rules.' },
                    { onSuccess: () => showToast(`${profile.full_name} banned for 7 days.`) },
                  )
                }
              >
                <Ban size={14} /> Ban 7d
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={ban.isPending}
                onClick={() =>
                  ban.mutate(
                    { callerId, targetId: profile.id, days: 30, reason: 'Banned by an admin for breaking the community rules.' },
                    { onSuccess: () => showToast(`${profile.full_name} banned for 30 days.`) },
                  )
                }
              >
                30d
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={suspend.isPending}
                onClick={() => {
                  if (!confirm(`Suspend ${profile.full_name} indefinitely?`)) return;
                  suspend.mutate(
                    { callerId, targetId: profile.id, reason: 'Suspended by an admin.' },
                    { onSuccess: () => showToast(`${profile.full_name} suspended.`) },
                  );
                }}
              >
                <ShieldOff size={14} /> Suspend
              </Button>
            </>
          )}
          {canManageAdmins && (
            <Button
              size="sm"
              variant="secondary"
              disabled={setAdmin.isPending}
              onClick={() =>
                setAdmin.mutate(
                  { callerId, targetId: profile.id, isAdmin: !profile.is_admin },
                  {
                    onSuccess: () => showToast(profile.is_admin ? 'Admin access removed.' : 'Admin access granted.'),
                    onError: (error) => showToast(error instanceof Error ? error.message : 'Could not change admin access.', 'error'),
                  },
                )
              }
            >
              {profile.is_admin ? 'Remove admin' : 'Make admin'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3">
      <Search size={16} className="shrink-0 text-text-muted" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full bg-transparent text-sm text-text placeholder:text-text-muted focus:outline-none"
      />
    </div>
  );
}
