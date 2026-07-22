## Design Context

### Users
Jersey (Channel Islands) locals, both posting short jobs (lawn mowing, shopping for the elderly, moving help) and doing them for pay. Every account can act as both Poster and Quester — no separate signup paths. Usage is evenly split between mobile (quick post from the driveway, browse on the bus) and desktop (sit-down browsing, filling longer job forms) — build genuinely responsive, no primary target to shrink from.

### Brand Personality
Friendly, local, trustworthy. Feels like asking a neighbour for help, not booking a gig-economy courier. Warmth and community trust matter more than slickness — ratings, reviews, and profile completeness are load-bearing for trust, not decoration.

### Aesthetic Direction
No fixed references supplied — use judgement, avoid generic SaaS/gig-app tropes (no cyan-on-dark AI palette, no gradient hero metrics, no card-in-card dashboards). Stack is Tailwind CSS + Lucide icons (decided in TODO.md, not Bootstrap). Theme: both light and dark, following OS `prefers-color-scheme` by default plus a visible manual toggle (Tailwind `class` dark-mode strategy, `data-theme` attribute on `<html>`), persisted in localStorage. Should feel warm and civic — small-island, grassroots, built-by-locals — rather than corporate marketplace.

### Design Principles
1. Warmth over slickness — favour approachable, human details (real parish names, plain language, friendly empty states) over polished-corporate gig-app tropes.
2. Trust is structural, not cosmetic — ratings, reviews, and verification cues get real visual weight since the whole app depends on local trust.
3. Equal citizens on mobile and desktop — no feature hidden or degraded on either; adapt layout, don't amputate.
4. Local specificity — lean into Jersey parish names/geography as real content, not generic city placeholders.
5. Light/dark both fully realised, OS-driven by default with a persisted manual override — neither theme is an afterthought.
