# Roshan Rozgar — Figma MCP Prompt Plan

**Figma deadline: 12:00. Target: submit by 11:45.**
Run these prompts in Claude Code with the Figma MCP connected. Put this file in the repo root so Claude Code can read it. Run them in order and check the result in Figma after each one.

---

## ⚠️ Read first: originality rule

The problem statement (Rules, section 8) says: *"code copied from a prior project will lead to disqualification."* The AI Web Forge rulebook also bans *"using AI to … reproduce or disguise an existing project."*

- **Do NOT** give Claude Code the Serviqo repo or its frontend code, and don't ask it to "convert Serviqo screens to Figma". Renaming an old project is exactly what the rules call disguising it, and judges can compare the two repos.
- **What's allowed:** what your team *knows* from building Serviqo (flows, edge cases, data model ideas). Design the screens new from the problem statement below. This is also safer for scoring, because the problem asks for things Serviqo was not built around: low literacy, voice, Urdu, and availability.

## Brand decisions (already applied in the prompts)

The attached brand guide is GoFundMe's design system. Its own last section says to *change the green and the typeface* before using it as your own brand. So:

- **Keep:** the token *structure* (primitives → semantic roles, the `surface/text/border/icon` naming, the 8px spacing scale, radii, pill buttons, soft shadows, motion tokens).
- **Replace:** the green scale, built from the Roshan Rozgar logo:
  - Forest (logo "Roshan"): **#0E4B35**
  - Leaf (logo "Rozgar"): **#6AB733**
  - Spark (logo rays): **#78CC4A**
- **Contrast rules:** #6AB733 and #78CC4A fail contrast as text on white, so use them only for icons, accents, large fills and progress. Body and button text uses #0E4B35 or white on #0E4B35.
- **Fonts:** Figtree (Latin) + **Noto Nastaliq Urdu** (Urdu). Never "GoFundMe Sans".
- **Don't use** the lime-text-on-forest button or the arc section edges (GoFundMe signatures). Use white text on forest for primary buttons.

## Screen map (derived from the 5 required outcomes)

| # | Screen | Role | Outcome | Priority |
|---|---|---|---|---|
| S0 | Welcome: language + role picker | Both | — | P0 |
| W1 | Phone + OTP (number pad only) | Worker | Onboarding | P0 |
| W2 | Voice onboarding: "Apne baare mein bataiye" (mic) | Worker | Onboarding (AI) | P0 |
| W3 | AI-built profile review (icons, tap to fix, re-record) | Worker | Onboarding (AI) | P0 |
| W4 | Worker home: big Available/Busy toggle + job requests | Worker | Booking | P0 |
| W5 | Job request: customer voice note + Urdu summary + price, Accept/Counter/Decline | Worker | Communication | P0 |
| W6 | Active job → "Kaam mukammal" (complete) | Worker | Booking/Trust | P1 |
| C1 | Customer home: "Kya kharab hai?" (voice/photo/text) + trade icons | Customer | Discovery (AI) | P0 |
| C2 | AI understanding: detected trade, urgency, est. PKR range | Customer | Discovery (AI) | P0 |
| C3 | Results: nearby + available-now workers, list/map toggle | Customer | Discovery | P0 |
| C4 | Worker profile: trust badges, AI review summary, reviews, work photos | Customer | Trust | P0 |
| C5 | Chat: voice notes + auto-transcript/translation + price offer card | Both | Communication (AI) | P0 |
| C6 | Booking confirmed: status tracker, worker marked Busy | Customer | Booking | P0 |
| C7 | Review: tap stars + tags + voice review → AI-structured | Customer | Trust (AI) | P1 |
| BG | **Brand Guidelines sheet** (1440 wide): logo, logo usage, colours, type, components, voice | — | UI/UX + pitch | P0 |
| D1 | Desktop customer results (1440) — for the pitch screen | Customer | Discovery | P2 |

Frame size: **390 × 844** (mobile-first, as the problem requires). P0 must be done by 11:30. P1 is next. P2 only if time is left.

**Who runs what (in parallel):** B runs Prompts 0–2 and then the Worker screens (Prompt 3). Once Prompt 2 finishes, C runs the Brand Guidelines (Prompt 2b) and then the Customer screens (Prompt 4) in a *second* Claude Code session on their own Figma pages. A keeps setting up the code repo.

---

## Prompt 0 — Create the file (B, ~2 min)

```
Using the Figma MCP, create a new Figma Design file named "Roshan Rozgar — AI Web Forge".
Create these pages in order: "00 Cover", "00b Brand Guidelines", "01 Foundations", "02 Components", "03 Worker Flow", "04 Customer Flow", "05 Prototype". 
Give me the file URL when done. Read FIGMA_PLAN.md in this repo for all brand rules; follow it strictly.
```

## Prompt 1 — Variables, text styles, effects (B, ~8 min)

```
In the Roshan Rozgar Figma file, page "01 Foundations", build the design tokens as Figma variables. Follow FIGMA_PLAN.md brand decisions.

1. Collection "Primitives":
   - green: 50 #E8F6E0, 100 #D3EEC2, 200 #B5E39A, 300 #8FD368, 400 #78CC4A, 500 #6AB733, 600 #4E9426, 700 #2F6E3F, 800 #0E4B35, 900 #08372A, 950 #04241B
   - Keep the neutral, red, yellow, teal (rename to "blue"), purple scales from the attached tokens.css primitives unchanged.
2. Collection "Semantic" (aliases to Primitives), use this naming pattern category/intent/emphasis:
   - surface/default = neutral-0, surface/neutral-subtle = neutral-50, surface/brand-subtle = green-50, surface/brand = green-500, surface/brand-strong = green-800, surface/negative-subtle = red-50, surface/warning-subtle = yellow-50, surface/info-subtle = blue-50
   - text/default = neutral-900, text/supporting = neutral-500, text/brand-strong = green-800, text/on-strong = neutral-0, text/negative = red-600, text/positive = green-700
   - border/neutral = neutral-300, border/subtle = neutral-200, border/focused = neutral-900, border/brand = green-500
   - icon/default = neutral-900, icon/brand = green-500, icon/supporting = neutral-500
   - button/primary-surface = green-800, button/primary-hover = green-700, button/primary-text = neutral-0, button/secondary-border = neutral-300
   - status/available = green-500, status/busy = red-500, status/offline = neutral-400
3. Number variables: spacing 4,8,12,16,24,32,40,48,64; radius sm 4, md 8, lg 12, xl 16, xxxl 24, full 9999.
4. Text styles (Figtree): Display 32/1.1 Bold -2%, Heading-LG 24/1.1 Bold -1%, Heading-MD 20/1.1 Bold, Heading-SM 18/1.2 Bold, Body-LG 18/1.5 Regular, Body-MD 16/1.5 Regular, Body-SM 14/20 Regular, Label 16/20 Bold, Caption 12/1.33 Regular.
   Urdu text styles (Noto Nastaliq Urdu): Urdu-Heading 24/1.8 Bold, Urdu-Body 18/1.9 Regular (Nastaliq needs a tall line height).
5. Effect styles: shadow-soft 0 1 2 rgba(35,35,35,.1), shadow-medium 0 2 6 rgba(35,35,35,.1), shadow-strong 0 6 14 rgba(35,35,35,.1).
6. On the page, draw a simple foundations sheet: colour swatches with names, the type ramp, spacing and radius samples. Use auto layout.
Bind everything to variables, with no hard-coded hex in later steps.
```

## Prompt 2 — Components (B, ~12 min)

```
On page "02 Components" of the Roshan Rozgar file, build these components with auto layout, bound to the Semantic variables and text styles from page 01. Use variants where listed. Name layers clearly (e.g. "Button/Primary/XL").

1. Button — variants: type (Primary, Secondary, Tertiary, Danger) × size (XL 56px, MD 40px) × state (Default, Pressed, Disabled). Pill radius, Label style, 24px side padding, optional leading icon.
2. Big Icon Tile — 160×140, radius xl, icon 48px + label (English Label + Urdu-Body under it). Variants: Default, Selected (border/brand 2px + surface/brand-subtle). Used for role pick and trade categories.
3. Mic Button — 96px circle, surface/brand-strong, white mic icon. Variants: Idle, Listening (pulsing green-400 rings), Processing (spinner), Done (check).
4. Audio Play Button (speaker icon, 44px) — every instruction text gets one, so low-literacy users can listen.
5. Voice Note Bubble — play button, waveform, duration, and under it a transcript line (Body-SM) with a "Translated from Urdu" caption. Variants: Sent, Received.
6. Price Offer Card — "Offer: Rs 1,500", sender, Agree / Counter buttons. Variants: Pending, Agreed, Countered.
7. Worker Card — 56px avatar, name, trade tag, ★ 4.8 (32 reviews), distance "1.2 km", Available-now badge, trust badges row, Rs/visit. Variants: Available, Busy.
8. Availability Toggle — huge (full width, 72px) switch: "Kaam ke liye tayyar / Available" (green) vs "Masroof / Busy" (red-subtle).
9. Trust Badge — small tag: "Phone verified", "12 jobs done", "Top rated", "Neighbourhood favourite". Medium surface + strong text of same hue, 4px radius, 14px Bold.
10. Status Tracker — 4 steps: Requested → Agreed → On the way → Done. Variants per step active.
11. AI Chip — sparkle icon + "AI summary" label, surface/info-subtle. Mark every AI output with it.
12. Bottom Nav — Home, Jobs/Bookings, Chat, Profile; icons + labels; variants Worker/Customer.
13. Top Bar — back, title, language toggle "اردو | EN".
14. Text Input (only for customers) with label, helper, error state; Rating Stars (tap 1–5, 40px stars).
Lay them out in a tidy grid with section titles.
```

## Prompt 2b — Brand Guidelines screen + logo (A or C, ~10 min, right after Prompt 2)

**Before running:** save the logo PNG into the repo as `public/brand/roshan-rozgar-logo.png`. If you have it, also save the mark only (person + leaf, no text) as `logo-mark.png`.

```
Read FIGMA_PLAN.md. In the Roshan Rozgar Figma file, upload public/brand/roshan-rozgar-logo.png (and logo-mark.png if present) with the Figma MCP upload_assets tool. Make a "Logo/Full" component and a "Logo/Mark" component from them (if there is no mark file, crop the full logo to the icon only) on page "02 Components".

Then on page "00b Brand Guidelines", build ONE frame 1440 wide (auto height, vertical auto layout, 80px padding, 64px gap between sections), bound to the variables and text styles on page 01. Sections, in order, each with a Heading-LG title and a one-line Body-MD explanation:

1. Header: Logo/Full large on white, "Brand Guidelines — v1.0 · Roshan Rozgar (روشن روزگار)", tagline "Har hunar ko qareeb ka kaam".
2. Brand idea: 3 principle cards. "Roshan" means hope/light: optimism. "Rozgar" means work: dignity of skill. "Qareeb" means nearby: neighbourhood trust. Plus who we serve: skilled workers with limited literacy, and households needing fast, trusted help.
3. Logo: (a) Full logo on white, (b) Full logo on forest #0E4B35 in a white-text version (or on a white card if no reversed file), (c) Logo/Mark as app icon 96px rounded 24px, (d) clear space = height of the mark's head circle, shown with dashed guides, (e) minimum size 120px wide (full) / 32px (mark), (f) a "Don't" row of 4 small examples with red ✕ captions: don't stretch, don't recolour, don't add shadows, don't place on busy photos.
4. Colour: swatches for Forest #0E4B35, Leaf #6AB733, Spark #78CC4A, and the full green 50–950 scale, neutrals, and the status colours (Available green, Busy red, Offline grey). Each swatch shows name, hex, variable name, and a contrast note (e.g. "Leaf: icons and large fills only. Fails as text on white").
5. Typography: Figtree ramp (Display → Caption with size/line-height) and Noto Nastaliq Urdu samples ("روشن روزگار — قریب کا کام") with the rule "Roman Urdu primary, English secondary, Urdu script for voice transcripts".
6. Iconography & imagery: use rounded line icons (Lucide style) 24px, 2px stroke; trade icons at 48px; photos show real local workers and homes, warm light, no stock posing.
7. Components preview: instances of Button (Primary/Secondary/Tertiary), Mic Button states, Worker Card, Trust Badges, AI Chip, Availability Toggle.
8. Accessibility rules for low-literacy users: min 48px tap targets; every instruction has an Audio Play button; icon + word on every action; one primary action per screen; text contrast ≥ 4.5:1; voice-first input with a typing fallback.
9. Voice & tone: respectful ("Ustad", "aap"), short sentences, benefit first. Do/Don't pairs, e.g. Do "Kaam mil gaya!" / Don't "Your job request has been successfully processed."
10. Spacing & radius: 8px scale chips, radius samples, pill buttons, soft shadows only.

Keep every value bound to variables/styles. Report anything you couldn't bind.
```

## Prompt 3 — Worker flow screens (B, ~20 min)

```
On page "03 Worker Flow", build these mobile screens (390×844), using only the components and variables from pages 01–02. Mobile-first, big tap targets (min 48px), one primary action per screen, Roman Urdu primary copy with English secondary, and an Audio Play Button next to every instruction. Seed data: Islamabad/Rawalpindi areas (G-9, F-10, Satellite Town, Bahria Phase 7), PKR prices, Pakistani names.

S0 Welcome: Logo/Full component instance (from page 02), "Khush aamdeed — Roshan Rozgar", language toggle, two Big Icon Tiles: "Mujhe kaam chahiye (I'm a worker)" and "Mujhe worker chahiye (I need a worker)".
W1 Phone: big numeric keypad, phone field +92, "OTP bhejein" button, then OTP 4 boxes. No other typing.
W2 Voice onboarding: step 1/3 progress, Mic Button (Listening state), prompt "Apna naam, kaam, tajurba aur ilaqa batayein" with Audio Play Button, live transcript card in Urdu script below, "Ya photo se batayein" secondary button (camera icon) for photos of past work.
W3 AI profile review: AI Chip "Aap ki awaz se profile banai gayi", fields as large icon rows (Naam: Muhammad Arif, Kaam: Electrician, Tajurba: 12 saal, Ilaqa: G-9 Islamabad, Rate: Rs 800/visit, Skills tags from photo: wiring, UPS, fan fitting). Each row has a re-record mic and a pencil. Primary button "Theek hai, profile banayein".
W4 Worker home: greeting, huge Availability Toggle (Available state), today's stats (jobs, rating), list of 2 incoming Job Request cards (trade icon, area, distance, offered price, time "Abhi"), Bottom Nav (Worker).
W5 Job request detail: customer name + area + distance, Voice Note Bubble (received) with Urdu transcript, AI Chip summary card "Kitchen ka socket jal gaya, 2 points, aaj shaam 5 baje", Price Offer Card "Rs 1,200", buttons: Accept (Primary XL), Counter with voice (Secondary), Decline (Tertiary).
W6 Active job: Status Tracker at "On the way", customer address card with "Map kholein", call button, big "Kaam mukammal" primary button. Toggle automatically shows Busy.
Arrange frames left to right with 80px gaps and a title label above each.
```

## Prompt 4 — Customer flow screens (C, ~20 min, second session, after Prompt 2)

```
Open the Roshan Rozgar Figma file (URL: <paste>). Read FIGMA_PLAN.md. On page "04 Customer Flow", build these mobile screens (390×844) using only components and variables from pages 01–02. Same rules: big targets, one primary action, Roman Urdu + English, seeded Islamabad/Rawalpindi data, PKR.

C1 Customer home: Top Bar, heading "Kya kharab hai?", three input options in a row: Mic (speak), Camera (photo of the problem), Type; grid of 8 Big Icon Tiles for trades (Electrician, Plumber, AC Technician, Carpenter, Mechanic, Painter, Mason, Welder); "Aap ka ilaqa: G-11, Islamabad" chip; Bottom Nav (Customer).
C2 AI understanding: photo thumbnail of a leaking pipe + transcript "Kitchen ke sink ke neeche paani tapak raha hai", AI Chip card: Trade = Plumber, Urgency = Aaj (today), Estimated price Rs 800–1,500, "Sahi hai?" with Yes / Change. Primary "Qareeb ke plumber dhoondein".
C3 Results: filter chips (Abhi available ✓, < 3 km, ★ 4+), list/map segmented control, 4 Worker Cards sorted by distance (3 Available, 1 Busy greyed at bottom), "4 plumbers available near G-11".
C4 Worker profile: header with avatar, name "Ustad Rafiq", Plumber, ★ 4.9 (41), 18 jobs on Roshan Rozgar, Trust Badges, a 20-sec voice intro, AI Chip "Reviews ka khulasa: waqt ke pabandi, saaf kaam, munasib rate", 3 review cards (with "Verified booking" tag), work photo grid, sticky bottom bar: Rs 900/visit + "Baat karein" Primary.
C5 Chat: Top Bar with worker + Available dot, mix of Voice Note Bubbles (both sides) with transcripts, a quick-reply chip row ("Kab aa saktay hain?", "Kitne paise?", "Address bhej raha hoon"), Price Offer Card (Agreed state) "Rs 1,000 — Aaj 5 PM", input bar with big mic hold-to-talk.
C6 Booking confirmed: success icon, "Booking pakki ho gayi!", summary card (worker, time, price, address), Status Tracker at "Agreed", note "Ustad Rafiq ab dusre customers ke liye Busy hain", buttons Call / Chat, Cancel (tertiary).
C7 Review: "Kaam kaisa raha?", Rating Stars (4 selected), tag chips (Waqt par aaye, Saaf kaam, Munasib rate, Acha rawaiya), Mic "Awaz mein review dein" with transcript, AI Chip "Aap ka review: …", Primary "Review bhejein".
Arrange left to right with 80px gaps and title labels.
```

## Prompt 5 — States, cover, prototype (B or C, ~10 min, start by 11:25)

```
In the Roshan Rozgar file:
1. On page "03 Worker Flow", add 3 state frames: W2-error "Mic ki ijazat nahi mili" with "Type karke batayein" fallback + Audio Play; C3-empty "Abhi koi available nahi — 30 min mein dobara check karein / Notify me"; AI-loading skeleton for C2 ("AI samajh raha hai…").
2. Page "00 Cover": 1440×1024 frame, Logo/Full instance, "Roshan Rozgar — روشن روزگار", tagline "Har hunar ko qareeb ka kaam" (A hyper-local marketplace for skilled trade workers), team members, CUI Tech Fest · AI Web Forge · 10 Nov 2026, and the 5 outcomes as icon rows mapped to screen IDs.
3. Page "05 Prototype": duplicate the P0 screens and wire a click-through prototype: S0 → (worker) W1 → W2 → W3 → W4 → W5 → W6, and S0 → (customer) C1 → C2 → C3 → C4 → C5 → C6 → C7. Use Smart Animate, 300ms, ease-out. Set the flow starting points "Worker flow" and "Customer flow".
4. Check every text layer uses a text style and every fill uses a variable; list anything that doesn't and fix it.
```

**Manual finish (11:35–11:45):** check the logo shows on S0, the Cover and the Brand Guidelines page. If the MCP upload failed, drag the PNG in by hand. Fix any spacing by eye. Click **Share → Anyone with the link → can view**, open the link in an incognito window to check it, and submit it on Classroom.

---

## After 12:00 — Design → code (for reference)

```
Read FIGMA_PLAN.md. Using the Figma MCP (get_design_context + get_variable_defs), implement frame <node link> from the Roshan Rozgar file as a Next.js App Router page with Tailwind. First generate tailwind theme tokens from the Figma variables (colors, spacing, radius, fontFamily figtree + nastaliq). Reuse components in /components; create new ones as small files. Mobile-first at 390px. No hard-coded hex. Explain each new file in 1 line so we can defend it to judges.
```

**AI parts to build (answer to "what breaks without AI"):**
1. **Speech-to-text** in Urdu (Whisper or Gemini), used for onboarding, chat voice notes and reviews.
2. **LLM extraction** turning a transcript into structured JSON (profile fields, job trade/urgency/price range).
3. **Image understanding**: photo of the problem gives the trade, and work photos give skill tags.
4. **Review summary** feeding the trust signal.

Remove the AI and a worker can't sign up without typing. That's the core argument for the pitch.
