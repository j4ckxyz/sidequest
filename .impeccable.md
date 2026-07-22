## Design Context

### Users
Jersey (Channel Islands) locals, both posting short jobs (lawn mowing, shopping for the elderly, moving help) and doing them for pay. Every account can act as both Poster and Quester — no separate signup paths. Usage is evenly split between mobile (quick post from the driveway, browse on the bus) and desktop (sit-down browsing, filling longer job forms) — build genuinely responsive, no primary target to shrink from.

### Brand Personality
Friendly, local, trustworthy. Feels like asking a neighbour for help, not booking a gig-economy courier. Warmth and community trust matter more than slickness — ratings, reviews, and profile completeness are load-bearing for trust, not decoration.

### Aesthetic Direction
Stack is Tailwind CSS v4 (CSS-first `@theme`, no `tailwind.config.js`) + Lucide icons (decided in TODO.md, not Bootstrap). Theme: both light and dark, following OS `prefers-color-scheme` by default plus a visible manual toggle, persisted in `localStorage` under `sidequest-theme`. Dark mode is a real Tailwind variant — `@custom-variant dark (&:where([data-theme='dark'], [data-theme='dark'] *));` in `src/index.css` — driven by a `data-theme` attribute on `<html>`, not Tailwind's default `class`/media strategy. Typography: **Petrona** (display/headings) + **Karla** (body/UI) — chosen to avoid the reflex font list (Inter, Fraunces, Space Grotesk, etc.), warm community-bulletin character rather than corporate SaaS. Should feel warm and civic — small-island, grassroots, built-by-locals — rather than corporate marketplace.

### Color Palette — Jersey Marketplace brand system
Sourced from a brand identity doc (`Jersey Marketplace Brand Identity Design - Google Gemini.pdf`, ParishPal/Jèrri Folk brand system) and implemented as OKLCH tokens in `src/index.css` `@theme` block (exact hex→OKLCH conversions, not approximations). **Do not reintroduce generic blues/cyans/purples** — this palette replaces an earlier terracotta+sea-blue placeholder scheme; the earlier `--color-sea` token was renamed to `--color-sage` to match this system.

| Token | Hex (brand doc) | Role |
|---|---|---|
| `--color-primary` (Jersey Granite) | `#C85A32` | Primary buttons, key branding, active states — **same hex in both light and dark mode**, not brightened for dark (a past attempt to brighten it for dark-mode contrast was explicitly rejected in favour of the true brand hex — see Feedback memory) |
| `--color-sage` (Parish Sage) | `#4A7C59` | Secondary actions, verified badges, trust cues, and reused for the `success`/"Open" status tone |
| `--color-canvas` (Island Sand) | `#FAF7F2` | Light mode page background |
| dark canvas (Coastal Slate) | `#1E242B` | Dark mode background + light-mode primary text |
| `--color-warning` (Warm Ochre) | `#E09F3E` | Star ratings, "in progress" status, highlight tokens |

Job status → tone mapping (5 states need to stay visually distinct — a past bug collapsed "open" and "assigned" to the same sage green when the sea→sage rename happened; don't reintroduce that): `open` = success/sage, `assigned` = primary/granite, `in_progress` = warning/ochre, `completed` = neutral, `cancelled` = danger. Danger has no brand-doc color — kept as an independent warm red (`oklch(53% 0.17 27)` light / `oklch(70% 0.15 27)` dark), not derived from the doc.

"Soft" tint tokens (`*-soft`, used as badge backgrounds) are our own derivation (~93% lightness, ~0.035–0.055 chroma), not the brand doc's literal pale "100" shades — those were tuned for opacity overlays (`bg-granite/10`) and read as washed-out/near-white when used as solid badge fills.

### Design Principles
1. Warmth over slickness — favour approachable, human details (real parish names, plain language, friendly empty states) over polished-corporate gig-app tropes.
2. Trust is structural, not cosmetic — ratings, reviews, and verification cues get real visual weight since the whole app depends on local trust.
3. Equal citizens on mobile and desktop — no feature hidden or degraded on either; adapt layout, don't amputate.
4. Local specificity — lean into Jersey parish names/geography as real content, not generic city placeholders.
5. Light/dark both fully realised, OS-driven by default with a persisted manual override — neither theme is an afterthought.
6. Palette fidelity over "improvement" — when a brand doc gives an exact hex, use it as given (both themes) rather than substituting a brightened/adjusted variant for accessibility reasons without checking with the user first; ship the literal brand color and address contrast edge cases (e.g. text-on-dark-bg use of a brand color) with a separate token instead of silently diverging from the source value.
