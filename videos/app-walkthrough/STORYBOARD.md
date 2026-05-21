# Storyboard: unifdata App Walkthrough

**Format:** 1920×1080
**Duration:** ~45 seconds
**Audio:** ElevenLabs TTS voiceover + warm electronic underscore + subtle UI SFX
**VO direction:** Clear, measured, slightly warm. Think a confident product designer walking someone through their own tool. Not a sales pitch — a calm, matter-of-fact tour.
**Style basis:** DESIGN.md — warm off-white canvas, Geist variable font, single indigo accent `#4A3FA8`.

## Music Direction

Minimal electronic underscore. Warm piano or soft pad — something in the register of Nils Frahm or Floating Points instrumentals. Starts quiet and steady. Gentle swell during Beat 3 (the feature sweep). Holds even under the integration beat. Resolves on a soft piano note with the brand close.

## Asset Audit

Since the app is behind auth, all visuals are built from the design system rather than captured screenshots. The compositions reconstruct app UI using the real CSS variables, Geist font, and component patterns from DESIGN.md.

| Asset | Type | Beat | Role |
|-------|------|------|------|
| Geist font (variable) | Font | All | All text — primary typeface |
| App color system | CSS vars | All | Warm palette fidelity |
| Dashboard layout (reconstructed) | Built UI | Beat 2 | Morning brief scene |
| Stat cards (reconstructed) | Built UI | Beat 2, 3 | Key metric visualization |
| Customer/Job list row (reconstructed) | Built UI | Beat 3 | List view demonstration |
| Quick-add form (reconstructed) | Built UI | Beat 4 | Form interaction scene |
| Integration logos (SVG — Stripe, HubSpot) | SVG icons | Beat 5 | Provider connection visual |
| Data review table (reconstructed) | Built UI | Beat 6 | Import review scene |
| unifdata wordmark | Custom type | Beat 1, 7 | Brand hook and close |

---

## BEAT 1 — THE PROBLEM (0:00–0:04)

**VO:** "Your business runs across sticky notes, spreadsheets, and three different apps."

**Concept:** Open cold. No logo intro — we're already inside the problem. Four scattered pseudo-objects drift across the warm off-white field — a sticky note, a spreadsheet grid, two blurry app windows — each one wobbling slightly, slightly out of sync with each other. The chaos is gentle but legible. These are the fragments your customer lives in. The text arrives and names the problem.

**Mood:** Warm but slightly anxious. Scattered paper on a desk. Clean anxiety, not chaos.

**Techniques:**
- **CSS 3D transforms**: Each fragment is a div with perspective rotation applied — the sticky note tilts 8° left, the spreadsheet panel tilts 5° right, app mockups rotate ±3–10°. They breathe with a slow `rotationX` oscillation (2–3° range, 3–4s period) using `yoyo: true` on individual GSAP tweens.
- **Per-word kinetic typography**: Headline enters word-by-word from bottom-right, slide decay 60→10px over the sentence. Typography settles as the last word lands.
- **Canvas 2D grain overlay**: A lightweight Canvas element draws low-opacity film grain (opacity: 0.04) over the full frame — warms the off-white, prevents "blank slide" feel.

**Visual (8 elements):**
1. BG: `#f4f3f0` fill, full frame.
2. Canvas grain overlay at 4% opacity.
3. Oversized ghost text "scattered" in Geist 700, 240px, `rgba(74,63,168,0.06)` — bottom-left, partially clipped.
4. Sticky note rect (160×160, `#fef3c7`, 3px solid `rgba(0,0,0,0.1)`, soft shadow, -8° rotation) — top-left quadrant. Drifts in from y:-80 with power2.out.
5. Spreadsheet grid mockup (320×200, white surface with 1px grid lines at `rgba(0,0,0,0.08)`) — center-right. Slides in from x:60.
6. Two blurry app window silhouettes (blurred: `filter: blur(6px)`, desaturated, 40% opacity) — lower-left and upper-right. Float in slowly.
7. Narration text: `56px`, Geist 500, `#171614` — lower-left anchor, per-word entrance.
8. Thin horizontal rule at y=900, `rgba(74,63,168,0.2)`, scaleX: 0→1 from left.

**Camera:** Static — no drift. The chaos is in the objects, not the camera.

**Transition OUT:** Zoom through — all fragments scale 0.9 and blur:20px, 0.25s power3.in. Beat 2 enters from scale:1.08→1, blur:20px→0, 0.4s expo.out.

**SFX:** No SFX on open. Underscore breathes quietly. Each fragment entry has a faint, soft paper rustle (staggered).

---

## BEAT 2 — THE DASHBOARD (0:04–0:11)

**VO:** "Start your morning with a live brief — follow-ups due, jobs active, revenue outstanding."

**Concept:** The app materializes. We're looking at the dashboard from a slight overhead perspective tilt — like peering at a sleek desk-mounted monitor. The morning greeting appears first, followed by the stat row counting up in real time, then the priority queue populating beneath. This is a live operating view, not a dashboard demo.

**Mood:** Calm authority. A cockpit that tells you exactly where you stand.

**Techniques:**
- **CSS 3D perspective card**: The entire dashboard UI panel renders at `perspective: 1800px` with `rotateX(12deg)` — subtle 3D tilt showing it as a screen being viewed from a slight angle. A slow ease brings it to `rotateX(0)` by the end of the beat — the view settles flat as the VO describes it.
- **Counter animation**: The 5 stat cards count up from zero simultaneously but at different speeds (fastest: the integer counts — follow-ups, jobs; slowest: the currency values). GSAP proxy with `tl.call()` updating innerHTML on each tick. Numbers use Geist Mono, `tabular-nums`.
- **Per-word typography**: The greeting "Good morning." appears first, per-word, 72px, Geist 600.

**Visual (10 elements):**
1. BG: `#f4f3f0` fill.
2. Canvas grain at 3%.
3. Sidebar strip (200px wide, `#eceae4`, left edge) — slides in from x:-60, opacity 0→1.
4. Sidebar nav items (4 ghost rows with indigo active item) — stagger fade in 0.1s apart.
5. Page eyebrow: date string, 11px uppercase, `#6b6760`, letter-spacing 0.16em.
6. Greeting: "Good morning." — 72px, Geist 600, `#171614` — per-word entrance.
7. Stat row: 5 cards, white surface, 12px radius, subtle shadow. Each card shows label (muted) + large value (counting up) + helper line.
8. Follow-ups stat card tinted `s-danger` variant (red tint on card, `#a83232` value color) — draws the eye.
9. Priority queue panel: 3 queue items fade in one-by-one. Each has a colored dot (danger/warning/neutral) + action text + due-date chip on right.
10. Indigo accent: "1 overdue" badge in danger red on follow-ups card. Revenue MTD card with green success tint.

**Camera:** Starts at `rotateX(12deg)` perspective tilt, eases to flat over 4s (`rotateX: 0, duration: 4, ease: power1.out`).

**Transition OUT:** Whip pan left — `x: -400, blur:24px, 0.3s power3.in`. Beat 3 enters from x:400→0 with matching blur recovery.

**SFX:** Soft "startup chime" as stat cards appear. Each counter completing its count emits a faint click.

---

## BEAT 3 — THE FEATURE SWEEP (0:11–0:19)

**VO:** "Every customer. Every job. Every lead in your pipeline. Every payment you're owed."

**Concept:** Four words — "customer", "job", "lead", "payment" — each punctuated by a different UI card materializing. Not a slide deck. A staccato cascade, each entity slamming in on its narration word, building a living mosaic of the product's data model. By the end, we're looking at four panels side-by-side.

**Mood:** Rhythmic and percussive. Josef Albers grid energy. Everything has a place.

**Techniques:**
- **Per-word synchronization**: The four entity names appear word-synced to VO onset — each word's panel SLAMS in at the exact beat the word is spoken. Panel entrance uses `y: -60 → 0, scale: 0.92 → 1, opacity: 0 → 1, 0.25s power3.out`.
- **CSS 3D stagger**: As each new panel arrives, the previous panels slide left and shrink slightly (`scale: 0.96`), like a hand of cards fanning out. 3D perspective gives depth to the arrangement.
- **SVG path drawing**: Thin connector lines draw between the four panels after all four land — a visual suggestion that they're linked data, not separate apps. Paths use `#4A3FA8` stroke at 40% opacity.

**Visual (9 elements):**
1. BG: `#f4f3f0`.
2. Canvas grain 3%.
3. Ghost oversized word each time — "CUSTOMERS", "JOBS", "PIPELINE", "REVENUE" — 200px Geist 900, `rgba(23,22,20,0.04)` — behind each card.
4. Panel 1 (Customers): white card, customer list rows (name, phone, email columns), 3 visible rows.
5. Panel 2 (Jobs): white card, week strip miniature + 2 job rows with status badges.
6. Panel 3 (Pipeline): white card, 2 lead rows with estimated value + status badge.
7. Panel 4 (Sales): white card, 2 sale rows with "Paid" / "Unpaid" payment badges.
8. SVG connectors between panels — draw in after all 4 land. Stroke `#4A3FA8` 40% opacity.
9. Bottom rule: thin 2px line `#4A3FA8`, scaleX 0→1, appears on last panel land.

**Camera:** Static. The panels arrive — camera holds.

**Transition OUT:** Blur through — `blur:20px, 0.3s` out, `blur:20px→0, 0.25s power3.out` into Beat 4.

**SFX:** Each panel lands with a crisp, soft "tap" sound effect — four taps in quick succession matching the VO rhythm. Final connector draw: faint electronic hum.

---

## BEAT 4 — QUICK ADD (0:19–0:23)

**VO:** "Add anything in seconds with the quick-add forms built into every page."

**Concept:** A compact, focused scene. A quick-add form floats centered on screen. Fields populate character-by-character — a customer name types in, then a phone number, then a select field snaps open and closes. The form submits. A soft confirmation tick appears. This is a practiced, fluent motion — someone who knows exactly what they're doing.

**Mood:** Efficient and tactile. The form responds like a well-made tool.

**Techniques:**
- **Typing effect**: Customer name types into the first field character by character. `tl.call()` updating field value. Cursor blinks with `steps(1)` ease.
- **Variable font axis animation**: On form submit, the "Save" button text briefly animates from `wght: 400` to `wght: 700` and back — a pulse of confidence as it confirms. Uses Geist variable font's wght axis.
- **SVG path drawing**: A soft checkmark SVG draws itself on submit confirmation — stroke-dashoffset animation over 0.4s.

**Visual (8 elements):**
1. BG: `#f4f3f0`.
2. Large ghost text "add" behind the form — Geist 900, 320px, `rgba(74,63,168,0.06)`.
3. Form card: white surface, 480×380px, 14px radius, raised shadow (`0 8px 24px rgba(23,22,20,0.08)`). Centered frame.
4. Form header: "New customer" — 20px Geist 600 `#171614`.
5. Three input fields with labels — "Name", "Phone", "Source". Each field has 1px border `rgba(23,22,20,0.14)`, 10px radius.
6. Typing animation in "Name" field — character-by-character, blinking cursor.
7. "Save" button: indigo `#4A3FA8` background, white text, 12px radius. Pulses wght: 400→700→400 on click.
8. Checkmark SVG in `#3f7c3f` draws in after submit. Success flash on card background (brief green tint at 8%).

**Camera:** Static. Focused on the card.

**Transition OUT:** Zoom through — card scale 1.05→1.2, blur:20px, 0.25s power3.in. Beat 5 enters from scale:0.8→1, blur:20px→0, 0.4s expo.out.

**SFX:** Keyboard click sounds for each character typed (faint, satisfying). Soft "whoosh" on submit. Clean chime on checkmark.

---

## BEAT 5 — INTEGRATIONS (0:23–0:36)

**VO:** "Connect Stripe, HubSpot, or Jobber — your existing records sync in automatically. Then review, confirm, and merge. No overwrites."

**Concept:** We see the integrations page as a minimal grid — provider cards arranged in a 3-column grid. Each provider logo pulses as the narrator mentions it. A "Sync now" action triggers a progress animation: data rows stream in from the right side of the screen, populating a preview table. This is the import flow in motion.

**Mood:** Technical confidence. Systems talking to each other, cleanly.

**Techniques:**
- **SVG path drawing**: Data flow lines animate from each provider card outward to a central "sync in" arrow. Paths curve gracefully, drawn in staggered sequence.
- **Counter animation**: After sync completes, a counter appears: "247 records imported" counting up from 0 at speed. Geist Mono, tabular-nums.
- **CSS 3D card reveal**: The import review table rises from a `rotateX(20deg)` perspective tilt to flat — same treatment as the dashboard in Beat 2, but this time it's the import staging table revealing newly-synced rows.

**Visual (10 elements):**
1. BG: `#f4f3f0`.
2. Canvas grain 3%.
3. Ghost oversized "sync" — Geist 900, 280px, `rgba(23,22,20,0.04)`.
4. Integration card grid: 3 cards in a row (Stripe, HubSpot, Jobber). Each card: white surface, 180×100px, rounded 12px, provider name + a subtle color indicator. Stagger fade in from y:20.
5. Each card pulses (scale 1→1.04→1, 0.3s) as its name is spoken.
6. SVG flow lines from cards converging to a right-pointing arrow in the center-right. Drawn after all cards appear.
7. Progress bar: thin 4px line `#4A3FA8` expanding from 0%→100% over 1.5s below the cards.
8. Import staging table rises into view from bottom: 3 rows of synced customer data, each row fading in staggered 0.15s. Status badge "Ready to review" on each.
9. Counter: "247 records" — Geist Mono 500, 64px, `#171614` with "imported" label beneath. Counts up from 0.
10. "No overwrites" badge (pill, navy `#1D2D3E` bg, white text) — slides in from right at line end.

**Camera:** Slight downward drift 0→-20px over the duration — surveying the data flow from above.

**Transition OUT:** Velocity-matched upward — `y:-150, blur:30px, 0.33s power2.in`. Beat 6 enters from `y:150→0, blur:30px→0, 1.0s power2.out`.

**SFX:** Soft sync pulse sound when each provider card pulses. Data rows: faint paper-shuffle as they populate. Counter: subtle tick up. "No overwrites" badge: clean click.

---

## BEAT 6 — DATA REVIEW (0:36–0:41)

**VO:** "Then review, confirm, and merge. No overwrites."

*(Note: this VO line is shared with Beat 5 tail — Beat 6 visually continues the thought and resolves it.)*

**Concept:** Close-up on the import review table. Three staged rows are visible. A "Confirm all" button glows. Cursor hovers → button pulses indigo → click. Rows transform from "Ready to review" badges to "Confirmed" badges in a ripple cascade. Then they disappear cleanly upward as if absorbed into the system. Clean, safe, done.

**Mood:** Resolution. The system handled it. Nothing was overwritten.

**Techniques:**
- **Staggered CSS transition**: Each "Ready to review" badge morphs to "Confirmed" (color + text) with a 0.1s stagger, rippling left-to-right.
- **MotionPath**: A checkmark icon travels from the confirm button along a brief arc to the center of the screen, then the rows scatter upward off-screen in a subtle `y:-80, opacity:0` stagger.
- **Variable font**: The "Confirm all" button text pulses weight 400→700 on hover then again on click — matched to Beat 4's form submit pattern (visual consistency).

**Visual (7 elements):**
1. BG: `#f4f3f0` + light shadow halo behind table card.
2. Import review table card: white surface, 880×400px, 14px radius.
3. Table header: "Staged import · 3 rows" in eyebrow style.
4. Three data rows (customer name + status badge "Ready to review" in `#92571b` warning color).
5. "Confirm all" button: indigo `#4A3FA8`, 180×48px, 12px radius. Glows with a faint indigo aura on hover.
6. Badges cascade: warning → success (`#3f7c3f` green, "Confirmed") in 0.1s stagger.
7. Rows lift off (`y:-80, opacity:0`) after confirmation, staggered 0.15s. Card dims and shrinks.

**Camera:** Static, close on the table.

**Transition OUT:** Hard cut — the rows are gone, pure frame. Pause 0.15s. Beat 7 enters.

**SFX:** Soft "tick" per badge change. "Whoosh" as rows absorb upward. Clean resolution chord.

---

## BEAT 7 — BRAND CLOSE (0:41–0:47)

**VO:** "It works the way your business works. unifdata."

**Concept:** The frame clears. Warm off-white canvas. The wordmark "unifdata" materializes — not with a dramatic reveal, but with calm, deliberate presence. Letters appear left-to-right, each one settling with a slight upward easing. Below it, a one-line descriptor appears. The underscore resolves to a final sustained note. A beat of silence. End.

**Mood:** Confident simplicity. The product has nothing to prove. It just is.

**Techniques:**
- **Variable font animation**: "unifdata" renders at `wght: 200`, then each letter animates to its final `wght: 600` with staggered timing (0.06s per letter) — a weight bloom from light to solid.
- **Per-word typography**: Descriptor line "It works the way your business works." enters per-word beneath the wordmark, Geist 400, 36px, `#6b6760`.
- **SVG path drawing**: A single horizontal rule beneath the wordmark draws in left-to-right — `#4A3FA8` at 60% opacity, 2px stroke, 320px width. Draws in sync with the "unifdata" word landing.

**Visual (6 elements):**
1. BG: `#f4f3f0` — pure, undisturbed.
2. Ghost repeat of "unifdata" at 320px Geist 900, `rgba(23,22,20,0.04)` — slightly offset below.
3. Wordmark: "unifdata" at 120px Geist variable — wght bloom 200→600 per letter stagger.
4. Horizontal rule beneath: `#4A3FA8` 60%, draws in 0.4s.
5. Descriptor: "It works the way your business works." — 36px Geist 400, `#6b6760`, per-word entrance.
6. Soft vignette at frame edges — Canvas2D radial gradient from transparent to `rgba(244,243,240,0.6)` — focuses center.

**Camera:** Static. No movement.

**Transition OUT:** Fade to `#f4f3f0` over 1.5s, ease: power1.in.

**SFX:** Music resolves to sustained piano note on the wordmark. Silence under "It works the way your business works." Final soft fade.

---

## Production Architecture

```
videos/app-walkthrough/
├── index.html                    root — VO + underscore + beat orchestration
├── DESIGN.md                     brand reference
├── SCRIPT.md                     narration text
├── STORYBOARD.md                 THIS FILE
├── transcript.json               word-level timestamps (Step 5)
├── narration.wav                 TTS audio (Step 5)
├── capture/                      site capture (login page only — app behind auth)
│   ├── screenshots/
│   ├── assets/
│   └── extracted/
└── compositions/
    ├── beat-1-hook.html
    ├── beat-2-dashboard.html
    ├── beat-3-feature-sweep.html
    ├── beat-4-quick-add.html
    ├── beat-5-integrations.html
    ├── beat-6-data-review.html
    ├── beat-7-brand-close.html
    └── captions.html
```
