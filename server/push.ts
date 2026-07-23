// Web-push fan-out: watch new `notifications` rows over Supabase Realtime and
// deliver a push to each of the recipient's subscribed devices.
import webpush from 'web-push';
import { admin } from './supabaseAdmin';

const PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const SUBJECT = process.env.VAPID_SUBJECT ?? 'mailto:hello@sidequest.j4ck.xyz';

const configured = Boolean(PUBLIC_KEY && PRIVATE_KEY);
if (configured) {
  webpush.setVapidDetails(SUBJECT, PUBLIC_KEY!, PRIVATE_KEY!);
}

interface NotificationRow {
  id: string;
  recipient_id: string;
  type: string;
  title: string;
  body: string;
  link: string;
  created_at?: string;
}

// Dedupe deliveries across the realtime fast-path and the polling fallback, so a
// notification picked up by both is only pushed once. Bounded so it can't grow.
const delivered = new Set<string>();
function markDelivered(id: string): void {
  delivered.add(id);
  if (delivered.size > 4000) {
    const iterator = delivered.values();
    for (let i = 0; i < 1000; i++) {
      const next = iterator.next();
      if (next.done) break;
      delivered.delete(next.value);
    }
  }
}

async function deliver(n: NotificationRow | undefined): Promise<void> {
  if (!n?.id || !n.recipient_id || delivered.has(n.id)) return;
  markDelivered(n.id);
  await sendToUser(n.recipient_id, {
    title: n.title,
    body: n.body,
    link: n.link || '/notifications',
    tag: n.type,
  });
}

async function sendToUser(recipientId: string, payload: object): Promise<void> {
  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', recipientId);
  if (!subs || subs.length === 0) return;

  const body = JSON.stringify(payload);
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body);
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        // 404/410 → the subscription is dead; drop it so we stop trying.
        if (statusCode === 404 || statusCode === 410) {
          await admin.from('push_subscriptions').delete().eq('endpoint', s.endpoint);
        } else {
          console.error('[push] send failed', statusCode ?? err);
        }
      }
    }),
  );
}

const POLL_MS = Number(process.env.PUSH_POLL_MS ?? '5000');

/**
 * Deliver web push for new notifications. Two independent paths, deduped:
 *   • Realtime (fast) — pushes the instant a row is inserted.
 *   • Polling (robust) — a 5s sweep for rows created since the last check, so
 *     delivery still works if Supabase Realtime isn't streaming this table
 *     (e.g. the publication isn't set up). This was the silent failure mode:
 *     in-app notifications worked (direct table reads) but pushes never fired.
 * No-op if VAPID isn't configured.
 */
export function startNotificationPushWatcher(): void {
  if (!configured) {
    console.warn('[push] VAPID keys not set (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY) — web push disabled.');
    return;
  }

  admin
    .channel('notifications-push')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
      void deliver(payload.new as NotificationRow);
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') console.log('[push] realtime watch active');
    });

  // Only consider notifications created from now on — never blast the backlog.
  let sinceIso = new Date().toISOString();
  setInterval(async () => {
    try {
      const { data, error } = await admin
        .from('notifications')
        .select('id, recipient_id, type, title, body, link, created_at')
        .gte('created_at', sinceIso)
        .order('created_at', { ascending: true })
        .limit(200);
      if (error) throw new Error(error.message);
      for (const row of (data ?? []) as NotificationRow[]) {
        await deliver(row);
        if (row.created_at) sinceIso = row.created_at;
      }
    } catch (err) {
      console.error('[push] poll failed:', err instanceof Error ? err.message : err);
    }
  }, POLL_MS);

  console.log(`[push] polling fallback every ${Math.round(POLL_MS / 1000)}s`);
}
