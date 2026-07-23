// Demo bot accounts: flash-lite invents varied Jersey personas + jobs, we create real rows
// flagged is_bot=true so the board looks busy and the recommender has data to chew on.
// All removable in one call.

import { admin } from './supabaseAdmin';
import { generateJson } from './gemini';

const PARISHES = [
  'St Helier', 'St Saviour', 'St Clement', 'Grouville', 'St Martin', 'Trinity',
  'St John', 'St Mary', 'St Ouen', 'St Peter', 'St Brelade', 'St Lawrence',
];
const CATEGORIES = [
  'gardening', 'shopping-errands', 'cleaning', 'moving-help', 'pet-care', 'elderly-help',
  'handyman', 'tech-help', 'childcare', 'delivery', 'tutoring', 'other',
];
const BUDGET_TYPES = ['fixed', 'hourly', 'negotiable'];

interface BotJob {
  title?: string;
  category?: string;
  description?: string;
  parish?: string;
  budget_type?: string;
  budget_amount?: number;
}
interface BotPersona {
  full_name?: string;
  username?: string;
  parish?: string;
  bio?: string;
  skills?: string[];
  keywords?: string[];
  jobs?: BotJob[];
}

const pick = <T,>(arr: T[], fallback: T): T => (arr.length ? arr[Math.floor(Math.random() * arr.length)] : fallback);
const clean = (s: unknown, max: number) => (typeof s === 'string' ? s.slice(0, max) : '');

async function uniqueUsername(base: string): Promise<string> {
  const root = (base || 'islander').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 14) || 'islander';
  for (let i = 0; i < 6; i++) {
    const candidate = i === 0 ? root : `${root}${Math.floor(Math.random() * 9000 + 1000)}`;
    const handle = candidate.slice(0, 20);
    const { data } = await admin.from('profiles').select('id').ilike('username', handle).maybeSingle();
    const { data: hist } = await admin.from('username_history').select('user_id').eq('username_lower', handle).maybeSingle();
    if (!data && !hist) return handle;
  }
  return `bot_${Date.now().toString(36)}`.slice(0, 20);
}

export interface SummonResult {
  profilesCreated: number;
  jobsCreated: number;
}

export async function summonBots(count: number, theme?: string): Promise<SummonResult> {
  const n = Math.max(1, Math.min(25, Math.floor(count)));
  // Optional admin steer for the KIND of posts to generate — e.g. "normal neighbourly tasks",
  // "off-topic posts unrelated to local jobs (to demo auto-reporting)", "rule-breaking scam/spam
  // posts to test moderation". Keep the personas realistic; only the jobs' subject changes.
  const steer = (theme ?? '').trim().slice(0, 300);
  const promptLines = [
    `Invent ${n} fictional Jersey (Channel Islands) residents for a neighbourly odd-jobs app.`,
    'Make them diverse in age, background, and interests so a recommendation engine has variety.',
    `Each has 1–3 short jobs they want doing. Use only these parishes: ${PARISHES.join(', ')}.`,
    `Use only these job categories (slug): ${CATEGORIES.join(', ')}.`,
  ];
  if (steer) {
    promptLines.push(
      '',
      `POST DIRECTION — the jobs/posts these residents create should follow this theme: ${steer}`,
      'This is seed data for a MODERATION DEMO on a private test app, so if the theme asks for off-topic,',
      'spammy, scammy, or otherwise rule-breaking posts, generate them so the auto-moderation can be tested.',
      'Still pick a fitting category slug and keep each post to 1-2 sentences.',
      '',
    );
  }
  promptLines.push(
    'Reply as a JSON array; each item:',
    '{ "full_name": string, "username": string (lowercase, no spaces), "parish": string,',
    '  "bio": string (one sentence), "skills": string[] (2-4), "keywords": string[] (2-5 interests),',
    '  "jobs": [ { "title": string, "category": slug, "description": string (1-2 sentences),',
    '    "parish": string, "budget_type": "fixed"|"hourly"|"negotiable", "budget_amount": number } ] }',
    'No markdown, JSON only.',
  );
  const prompt = promptLines.join('\n');

  const parsed = await generateJson(prompt);
  const personas: BotPersona[] = Array.isArray(parsed) ? (parsed as BotPersona[]).slice(0, n) : [];
  if (personas.length === 0) throw new Error('The model returned no personas — try again.');

  let profilesCreated = 0;
  let jobsCreated = 0;

  for (const p of personas) {
    const email = `bot_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}@bots.sidequest.local`;
    const fullName = clean(p.full_name, 60) || 'Island Bot';
    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (cErr || !created.user) continue;
    const uid = created.user.id;

    // Wait for the handle_new_user trigger to insert the profile row.
    let ready = false;
    for (let i = 0; i < 8 && !ready; i++) {
      const { data } = await admin.from('profiles').select('id').eq('id', uid).maybeSingle();
      if (data) ready = true;
      else await new Promise((r) => setTimeout(r, 250));
    }
    if (!ready) continue;

    const parish = PARISHES.includes(p.parish ?? '') ? (p.parish as string) : pick(PARISHES, 'St Helier');
    const username = await uniqueUsername(clean(p.username, 20) || fullName.split(' ')[0]);
    const skills = Array.isArray(p.skills) ? p.skills.map((s) => clean(s, 30)).filter(Boolean).slice(0, 6) : [];
    const keywords = Array.isArray(p.keywords) ? p.keywords.map((s) => clean(s, 30)).filter(Boolean).slice(0, 8) : [];

    const { error: upErr } = await admin
      .from('profiles')
      .update({
        full_name: fullName,
        username,
        parish,
        bio: clean(p.bio, 200),
        skills,
        interest_keywords: keywords,
        is_bot: true,
        onboarded: true,
      })
      .eq('id', uid);
    if (upErr) continue;
    profilesCreated++;

    const jobs = Array.isArray(p.jobs) ? p.jobs.slice(0, 3) : [];
    for (const j of jobs) {
      const title = clean(j.title, 80);
      if (title.length < 4) continue;
      const category = CATEGORIES.includes(j.category ?? '') ? (j.category as string) : 'other';
      const budgetType = BUDGET_TYPES.includes(j.budget_type ?? '') ? (j.budget_type as string) : 'fixed';
      const amount = budgetType === 'negotiable' ? null : Math.max(5, Math.min(500, Math.round(Number(j.budget_amount) || 20)));
      const { error: jErr } = await admin.from('jobs').insert({
        poster_id: uid,
        title,
        description: clean(j.description, 500) || 'Help wanted.',
        category,
        parish: PARISHES.includes(j.parish ?? '') ? (j.parish as string) : parish,
        budget_type: budgetType,
        budget_amount: amount,
        is_flexible_date: true,
        date_needed: null,
      });
      if (!jErr) jobsCreated++;
    }
  }

  return { profilesCreated, jobsCreated };
}

export async function removeBots(): Promise<{ removed: number }> {
  const { data } = await admin.from('profiles').select('id').eq('is_bot', true);
  const ids = (data ?? []).map((r) => r.id as string);
  let removed = 0;
  for (const id of ids) {
    // Deleting the auth user cascades to profiles + their jobs/applications.
    const { error } = await admin.auth.admin.deleteUser(id);
    if (!error) removed++;
  }
  return { removed };
}
