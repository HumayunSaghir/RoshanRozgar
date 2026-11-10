# RoshanRozgar

A mobile-first, voice-first marketplace connecting trade workers (electricians, plumbers, AC technicians, carpenters, painters, mechanics…) with nearby customers in Islamabad / Rawalpindi. Built for the Roshan Rozgar hackathon problem statement.

The five outcomes and where they live:

| Outcome | Implementation |
|---|---|
| Onboarding without typing forms | `/join`: worker speaks for ~20 s in Urdu; AI extracts trade, skills, experience, area, rate; worker confirms/edits chips. |
| Discovery (nearby + available at that time) | `/workers`: MongoDB `2dsphere` `$geoNear`, distance + ETA, "Available now / Busy" computed from working hours, manual toggle and live slot locks. Customer describes the problem by voice, text or photo on the landing page. |
| Communication & price agreement | `/messages`: chat with voice notes (auto-transcribed, Urdu/Roman Urdu), quick replies, offer cards, counter-offers, both-sides "agree" step. Text-to-speech reads messages aloud. |
| Booking consistency | `SlotLock` collection with unique `workerId:YYYY-MM-DDTHH` keys: atomic double-booking prevention, 409 `SLOT_TAKEN` with alternative times; worker flips to Busy on confirmation and is released on completion. |
| Trust after the job | `/bookings/[id]`: stars, tags, voice review, AI review tags; ratings update incrementally; badges and an AI review summary on worker profiles. |

### Extra: job posting and bidding
Beyond the five required outcomes, customers can post a job (`/jobs/new`, by voice, photo or text) and nearby workers of that trade bid with a price (`/worker/find-jobs`). The customer compares bids, accepts one (`/jobs/[id]`), and the winning bid becomes an agreed booking that continues through the normal chat, confirm, complete and review flow. Bids, new jobs and booking events also create in-app notifications (bell in the header).

## Stack (unchanged from Serviqo)
- Frontend: Next.js 16 (App Router, JavaScript), Tailwind CSS 4 (design tokens from `tokens.css` mapped in `globals.css`), lucide-react, Figtree + Noto Nastaliq Urdu.
- Backend: Express 5, Mongoose / MongoDB, JWT (httpOnly cookie + Bearer), multer.

## Setup
Prerequisites: Node 20+ and a MongoDB database (local or Atlas).

```bash
# backend
cd backend
cp .env.example .env      # fill in MONGODB_URI, JWT_SECRET, Cloudinary and WhatsApp settings
npm install
npm run seed              # loads demo workers, customers, reviews, bookings
npm run dev               # http://localhost:5000  (prints a WhatsApp QR on first run)

# frontend (new terminal)
cd frontend
npm install
# .env.local: NEXT_PUBLIC_API_BASE=http://localhost:5000/api
npm run dev               # http://localhost:3000
```

### Environment (backend/.env)
`PORT`, `MONGODB_URI` (database name `roshanrozgar`), `MONGODB_DNS_SERVERS` (optional resolvers for Atlas SRV lookups), `JWT_SECRET`, `FRONTEND_ORIGIN`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `WHATSAPP_OTP_ENABLED`, `WHATSAPP_AUTH_DIR`, `OTP_DEMO_FALLBACK`, `DEMO_OTP`, optional `GEMINI_API_KEY` / `GEMINI_MODEL`.

### WhatsApp OTP
Codes are sent over WhatsApp with Baileys (WhatsApp Web protocol). On the first start the backend prints a QR code in the terminal: scan it with the sender account (WhatsApp > Linked devices). The session is saved in `WHATSAPP_AUTH_DIR` and reused afterwards. Once connected, a random 4-digit code is sent to the number the user enters and is never returned by the API. If WhatsApp is not connected and `OTP_DEMO_FALLBACK=true`, the API falls back to the demo code `1234` shown in the UI; set it to `false` in production. `GET /api/health` reports the WhatsApp connection state.

### Uploads
All uploaded images and voice notes go to Cloudinary (folder `roshanrozgar/`) and only the returned https URLs are stored in MongoDB. Local disk is used only if the Cloudinary keys are missing.

### Language
The header toggle switches the whole interface between English and Urdu (RTL). Only one language is shown at a time.

### Re-seeding
`npm run seed` only replaces seeded demo data; real sign-ups, bookings and jobs are kept.

### Demo accounts (demo fallback code is `1234`)
- Worker: Ustad Rafiq Ahmed `0300 1000001`, Muhammad Arif `0300 1000010`
- Customer: Sana Khan `0300 2000001`
- Any new number can sign up; choose Customer or Worker.

## Worker verification and admin
- After finishing their profile, a worker uploads a CNIC photo and a selfie holding it (`/worker/verification`). Status becomes `pending` and the worker is notified that the documents are under approval.
- An admin (`/admin/dashboard`) approves or rejects each application. A rejection **requires a comment**, which the worker sees; the worker can then resubmit.
- Only **approved** workers appear in search, can be booked and can bid on jobs. Approved workers get an "ID verified" badge.
- Demo admin: `0300 0000000` (demo code 1234). For a real admin set `ADMIN_PHONES=03xxxxxxxxx` in `backend/.env` (that number becomes an admin on first login via WhatsApp OTP). Remove the demo admin before a real launch.
- Documents are stored on Cloudinary and only exposed to admins and the owner; the check is manual (no automated ID verification).

## AI worker recommendation
On a customer's job page the **top 3 workers** are shown. Candidates are verified workers of the job's trade nearby. Gemini embeddings (`gemini-embedding-001`, task types `RETRIEVAL_QUERY` for the job and `RETRIEVAL_DOCUMENT` for worker profiles; vectors are cached on the worker and refreshed when the profile changes) give a semantic score, blended with distance, rating, availability at the job time and price fit. Without a Gemini key it falls back to keyword overlap. Customers can invite a recommended worker to bid.

## AI services used
1. **Google Gemini API** (optional, `GEMINI_API_KEY`): audio transcription of Urdu speech, structured extraction of worker profiles and job requests, photo understanding for job descriptions, review tag extraction and review summaries.
2. **Browser Web Speech API** (`SpeechRecognition`, ur-PK): live transcript fallback when no Gemini key is set.
3. **Browser `speechSynthesis`**: reads Urdu / Roman Urdu text aloud for low-literacy users.
4. **Rule-based fallback parsers** (`backend/services/ai.js`): keyword extraction for trades, areas, prices, times and review tags. Every AI result carries `source: "gemini" | "rules"` and the UI labels it.

Without a Gemini key the app still works end to end using (2)–(4); extraction quality is lower and image understanding is unavailable.

## AI coding assistant disclosure
This project was rewritten from the earlier Serviqo codebase with Claude Code (Anthropic) assisting on architecture, backend services, frontend pages and this README. All output was reviewed and run by the team.

## Seeded and mocked
- **Seeded:** 19 workers and several customers across Islamabad/Rawalpindi, with ratings, review counts, reviews, jobs-done counts, a few historical bookings and slot locks (one worker is deliberately busy right now). Their voice intros are text played via browser TTS, not real recordings.
- **Mocked:** the demo OTP fallback (used only when WhatsApp is not connected); payments (cash on completion only, no gateway); area coordinates are simulated centroids; the map is a stylised canvas, not real map tiles; ETA is ~5 min/km straight-line.
- **Out of scope (per problem statement):** real payments, automated ID/CNIC verification (admins review documents manually), native apps.
- **Seeded workers** are pre-approved; the seeded demo admin account is for demonstration only.

## Known limitations
- UI was built from the exported design PDFs (Figma MCP could not be authorised in the build session); match is by visual comparison, not measured against Figma nodes.
- Voice recording needs HTTPS or localhost and a browser with `MediaRecorder`; Urdu speech recognition fallback works best in Chrome.
- Polling (8 s) is used for chat/status instead of websockets.
- WhatsApp delivery uses an unofficial WhatsApp Web client (Baileys): it needs a linked sender account and is not suitable for high volume.
- Server-generated chat lines and API error messages are English only; the interface itself is fully translated.
- No automated test suite; verified with an API smoke script and manual walkthroughs.

## Credits
Logo, brand guide and tokens: Roshan Rozgar. Icons: lucide-react. Fonts: Figtree, Noto Nastaliq Urdu (Google Fonts).
