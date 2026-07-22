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

/** Subscribe to notification inserts and push them out. No-op if VAPID isn't configured. */
export function startNotificationPushWatcher(): void {
  if (!configured) {
    console.warn('[push] VAPID keys not set (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY) — web push disabled.');
    return;
  }
  admin
    .channel('notifications-push')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
      const n = payload.new as NotificationRow;
      void sendToUser(n.recipient_id, {
        title: n.title,
        body: n.body,
        link: n.link || '/notifications',
        tag: n.type,
      });
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') console.log('[push] watching notifications for web-push fan-out');
    });
}
