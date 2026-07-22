import { admin } from './supabaseAdmin';
import { moderationDecision } from './gemini';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const inFlightReports = new Set<string>();

async function addModEvent(reportId: string, kind: string, message: string) {
  try {
    await admin.from('moderation_events').insert({
      report_id: reportId,
      kind,
      message,
    });
  } catch (err) {
    console.error('[moderation] Failed to log moderation_event:', err);
  }
}

/**
 * Process a single report using the autonomous Gemini moderation agent.
 * Stream status updates to `moderation_events` table (Realtime to admin dashboard)
 * and enforce decisions via service-role Supabase client.
 */
export async function processReport(reportId: string): Promise<void> {
  if (inFlightReports.has(reportId)) return;
  inFlightReports.add(reportId);

  try {
    const { data: report, error } = await admin
      .from('reports')
      .select('*')
      .eq('id', reportId)
      .maybeSingle();

    if (error || !report || report.status !== 'pending') {
      return;
    }
    return;
  }

  const targetUserId: string = report.target_user_id;

  // 1. Mark status as reviewing
  await admin.from('reports').update({ status: 'reviewing' }).eq('id', report.id);
  await addModEvent(
    report.id,
    'received',
    `Report received on a ${report.target_type} — “${report.reason || 'no reason given'}”. Starting review.`,
  );
  await wait(600);

  // 2. Fetch context (target profile + prior enforcement history)
  const [{ data: targetProfile }, { data: priorActionsData }] = await Promise.all([
    admin.from('profiles').select('*').eq('id', targetUserId).maybeSingle(),
    admin.from('moderation_actions').select('*').eq('target_user_id', targetUserId).neq('action', 'dismiss'),
  ]);

  const priorActions = priorActionsData ?? [];
  const historyLines = priorActions.map(
    (a) => `[${new Date(a.created_at).toLocaleDateString('en-GB')}] Action: ${a.action} — Reason: ${a.reason || 'N/A'}`,
  );

  await addModEvent(
    report.id,
    'context',
    `Pulled ${targetProfile?.full_name ?? 'the user'}'s record: ${priorActions.length} prior enforcement action${priorActions.length === 1 ? '' : 's'}, joined ${targetProfile?.created_at ? new Date(targetProfile.created_at).toLocaleDateString('en-GB') : '—'}.`,
  );
  await wait(800);

  // 3. Fetch content to review
  let content = '';
  if (report.target_type === 'job') {
    const { data: job } = await admin.from('jobs').select('title, description').eq('id', report.target_id).maybeSingle();
    if (job) {
      content = `${job.title}\n${job.description}`;
    }
  } else {
    if (targetProfile) {
      content = `${targetProfile.full_name}\n${targetProfile.bio ?? ''}`;
    }
  }

  await addModEvent(
    report.id,
    'analyzing',
    'Checking content with Gemini agent against rules: scams, off-platform payment, spam links, harassment…',
  );
  await wait(950);

  // 4. Ask Gemini agent for moderation decision
  const verdict = await moderationDecision({
    targetType: report.target_type as 'job' | 'user',
    reason: report.reason,
    content: content || '(empty content)',
    priorActions: priorActions.length,
    historyLines,
  });

  await addModEvent(
    report.id,
    'decision',
    `Gemini decision: ${verdict.decision.replace('_', ' ')}${verdict.ban_days ? ` (${verdict.ban_days} days)` : ''}. Rationale: ${verdict.rationale || verdict.reason}`,
  );
  await wait(700);

  // 5. Apply decision
  try {
    if (verdict.decision === 'remove_post' && report.target_type === 'job') {
      await admin.from('jobs').update({ status: 'cancelled' }).eq('id', report.target_id);
      await admin.from('moderation_actions').insert({
        report_id: report.id,
        decided_by: 'gemini',
        action: 'remove_post',
        target_user_id: targetUserId,
        job_id: report.target_id,
        reason: verdict.reason,
      });
    } else if (verdict.decision === 'ban_user') {
      const days = verdict.ban_days ?? 7;
      const banUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      await admin.from('profiles').update({ banned_until: banUntil, ban_reason: verdict.reason }).eq('id', targetUserId);
      await admin.from('moderation_actions').insert({
        report_id: report.id,
        decided_by: 'gemini',
        action: 'ban_user',
        target_user_id: targetUserId,
        ban_until: banUntil,
        reason: verdict.reason,
      });
    } else if (verdict.decision === 'suspend_user') {
      await admin.from('profiles').update({ suspended: true, ban_reason: verdict.reason }).eq('id', targetUserId);
      await admin.from('moderation_actions').insert({
        report_id: report.id,
        decided_by: 'gemini',
        action: 'suspend_user',
        target_user_id: targetUserId,
        reason: verdict.reason,
      });
    } else {
      await admin.from('moderation_actions').insert({
        report_id: report.id,
        decided_by: 'gemini',
        action: 'dismiss',
        target_user_id: targetUserId,
        reason: verdict.reason,
      });
    }

    await addModEvent(report.id, 'applied', verdict.reason);
    await wait(550);
  } catch (err) {
    console.error('[moderation] Error applying enforcement action:', err);
  }

  // 6. Mark report resolved
  await admin.from('reports').update({ status: 'resolved' }).eq('id', report.id);
  await addModEvent(report.id, 'done', 'Review complete.');
  } finally {
    inFlightReports.delete(reportId);
  }
}

/** Check database for any pending reports and process them sequentially. */
export async function processPendingReports(): Promise<number> {
  const { data: pending, error } = await admin
    .from('reports')
    .select('id')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(10);

  if (error || !pending || pending.length === 0) return 0;

  for (const report of pending) {
    await processReport(report.id);
  }
  return pending.length;
}
