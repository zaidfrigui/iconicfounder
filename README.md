# Personal-Brand Client Onboarding — Phase 1

A premium, mobile-first onboarding questionnaire for clients (EN / FR / AR with full right-to-left), and a private mentor desk to read the answers and generate the Claude analysis prompt.

No backend, no database, no monthly cost.

---

## 1. What's in the folder

| File | What it is | Edit it? |
|---|---|---|
| `index.html` | The client questionnaire (the link you send) | No |
| `mentor.html` | Your mentor desk: open answers, copy the analysis prompt | No |
| `config.js` | Brand name, your WhatsApp, Web3Forms key | **Yes, before going live** |
| `translations.js` | Every word the client sees, in EN / FR / AR | Yes, to reword anything |
| `questions.js` | Question structure, IDs, types and options (no text) | Only to add or remove questions |
| `analysis-prompt.md` | The instructions Claude follows to write your report | Yes, to refine the report |
| `core.js`, `app.js`, `mentor.js`, `styles.css` | The engine and the design | No |
| `examples/sample-answers.json` | A filled-in test file to try the mentor desk | — |

---

## 2. Put it online (Netlify Drop: free, about 5 minutes)

1. **Edit `config.js`** (open it with any text editor, e.g. Notepad or TextEdit):
   - `brandName`: your mentoring brand name
   - `mentorWhatsApp`: your number, digits only, e.g. `212612345678`
   - `web3formsKey`: see step 3 below
2. Go to **https://app.netlify.com/drop** and create a free account (sign up with Google or email).
3. **Drag the whole `pb-onboarding` folder** onto the page. After a few seconds you get a link like `https://random-name-123.netlify.app`.
4. Rename it: **Site configuration → Change site name**, e.g. `yourbrand-onboarding` → `https://yourbrand-onboarding.netlify.app`.
5. To update later (new wording, a new key): **Deploys** tab → drag the folder again.

Your two links:
- Client: `https://yourbrand-onboarding.netlify.app/`
- You: `https://yourbrand-onboarding.netlify.app/mentor.html`

> The mentor page holds no client data. Answers are only opened from files on your own device, so it's safe even if someone finds the link. For extra discretion, rename `mentor.html` to something only you know (e.g. `desk-7Hq2.html`) before uploading.

**Alternative: GitHub Pages.** It's also free, but needs a GitHub account and a repository. Netlify Drop is easier for a non-developer.

---

## 3. Get answers by email (Web3Forms: free)

1. Go to **https://web3forms.com**, enter the email where you want to receive answers, and click "Create Access Key".
2. The key arrives in that inbox. Paste it into `config.js` → `web3formsKey`.
3. Re-upload the folder to Netlify.
4. **Test it yourself once**: fill the questionnaire (you can skip questions), press Send, and check that the email arrives. Look in spam the first time and mark it "not spam".

The free plan covered 250 submissions/month at the time of writing; check their pricing page for current limits. The access key is meant to sit in a public web page: it can only send emails *to you*.

**If sending fails** (no internet, a service problem, or no key set yet), the client automatically gets a backup screen with:
- **Share my answers file**: on phones, this opens the share sheet so they can send the file straight to you on WhatsApp
- **Download my answers**: saves a `.json` file
- **Message Zaid on WhatsApp**: opens a chat with you

Their answers also stay saved on their device, so nothing is lost.

---

## 4. Send it to a client

Send the client link on WhatsApp with a short message, for example:

> Salam [Name], here's your private onboarding questionnaire. It takes 35–45 minutes. It saves automatically, so you can stop and continue later on the same phone. Answer as honestly and concretely as you can: this is the foundation of your strategy. 👉 https://yourbrand-onboarding.netlify.app

- To open it directly in a language, add `?lang=fr` or `?lang=ar` (or `?lang=en`) to the link.
- The client can also switch language at any time (welcome screen, or the "Sections" menu).
- Autosave is per device and per browser. If they switch from their phone to a laptop, they start again there.

---

## 5. Run the analysis

1. **Open the answers.** Open your mentor page, then either:
   - **Email received:** copy the whole email (select all → copy) and paste it into the box → "Open pasted answers", or
   - **File received on WhatsApp:** save it, then drop it on the page or click "Choose file".
2. Read through. ⚠ marks key questions the client skipped; ★ marks questions added by the strategist. "Print / PDF" gives you a clean printable version.
3. Click **📋 Copy analysis prompt**.
4. Open **claude.ai**, start a new chat, paste, and send. Claude writes the four-part report: diagnosis, content strategy, 90-day plan, and 15+ video ideas.
5. Optional: put each client in their own **Claude Project**, so you can keep refining the strategy with them in the same place.

---

## 6. Customize

- **Reword a question or button:** edit the text in `translations.js`, in each language. Keep the keys (`q1_2`, `l`, `ph`…).
  - `l` = the question, `h` = the helper line under it, `ph` = the example answer shown as a placeholder, `o` = option labels.
- **Remove a question:** delete its line in `questions.js`. Its text in `translations.js` can stay.
- **Add a question:** add a line in `questions.js` with a **new, never-reused ID** (e.g. `q7_8`), then add its text under `q:` in all three languages of `translations.js`.
- **Never rename or reuse an ID** once clients have answered: the ID is how answers stay readable forever.
- After changing questions, bump `questionnaireVersion` in `config.js`.

### Add a language later (e.g. Spanish)
Copy the whole `en: { … }` block in `translations.js`, rename it `es`, translate it, and add `"es"` to `languages` in `config.js`. Set `dir: "rtl"` for right-to-left languages.

### Expand to MENA later (prepared, not built)
Market-specific data lives in `questions.js → markets`. Morocco is `MA`, with its currency, cities list and money ranges (revenue, income, budget). To add the UAE, for example: copy the `MA` block as `AE`, set `currency: "AED"`, adapt the ranges and the `locations` list, and add the location labels in `translations.js → lists.locations`. The submission records which `market` and `currency` the answers used.

---

## 7. Data format (for Phase 2)

Every submission is one JSON document:

```json
{
  "schema": "pb-onboarding",
  "schemaVersion": 1,
  "questionnaireVersion": "1.0.0",
  "submissionId": "a3f1…-uuid",
  "market": "MA",
  "currency": "MAD",
  "language": "fr",
  "client": { "name": "", "business": "", "whatsapp": "", "email": "", "city": "" },
  "startedAt": "2026-11-26T09:12:00.000Z",
  "submittedAt": "2026-11-26T09:51:00.000Z",
  "durationMinutes": 38,
  "completion": { "answered": 108, "total": 113, "requiredMissing": ["q4_10"] },
  "answers": { "q1_1": "…", "q0_6": { "choice": "ecommerce" } }
}
```

Answer shapes by question type (`t` in `questions.js`):

| Type | Stored value |
|---|---|
| `short`, `long` | `"text"` |
| `number` | `12000` (parsed from "12k"), or the raw text if it couldn't be parsed |
| `single` | `{ "choice": "key", "other": "text if Other" }` (money ranges use keys `r0…rn` → `markets[market].ranges`) |
| `multi` | `{ "choices": ["key", …], "other": "…", "details": "…" }` |
| `scale`, `slider` | `7` |
| `bipolar` | `{ "expert": 3, "serious": 6, … }` (0–10, 5 = balanced) |
| `rank` | `["key1", "key2", "key3"]` (in order) |
| `ratingGrid` | `{ "money": 3, "fitness": 1, … }` |
| `choiceGrid` | `{ "spouse": "maybe", "children": "never", … }` |
| `checkGrid` | `{ "mon": ["morning"], "sat": ["morning", "evening"] }` |
| `table` | `{ "instagram": { "handle": "@x", "followers": 2400, "status": "active" } }` |
| `repeater` | `[ { "name": "…", "why": "…" }, … ]` |
| `fields` | `{ "whatsapp": "…", "email": "…" }` |

Question IDs, types, sections and the `added` (★) flag come from `questions.js`; wording comes from `translations.js`. Together they make every answer file self-explanatory, now and later.

---

## 8. Phase 2 plan (not built yet)

**Goal:** a private dashboard with login, every client in one place, and one-click analysis.

1. **Hosting & database:** Supabase (Postgres + login + storage, generous free tier) with a small Next.js app on Vercel or Netlify.
2. **Tables:**
   - `clients` (id, name, business, email, whatsapp, market, status, created_at)
   - `submissions` (id = `submissionId`, client_id, questionnaire_version, language, market, `answers` as JSONB, submitted_at, completion)
   - `reports` (id, submission_id, model, prompt_version, markdown, created_at)
   - `questions` (seeded from `questions.js` + `translations.js`, so wording history is kept per version)
3. **Questionnaire change:** the same `index.html` engine; `send()` posts the same JSON to a Supabase function instead of (or in addition to) Web3Forms. Nothing else changes, because the JSON format is already final.
4. **Import history:** a one-time script uploads every Phase 1 `.json` file (and email JSON blocks) into `submissions`, unchanged.
5. **One-click analysis:** a server function sends `analysis-prompt.md` + `PB.toReadable(submission)` to the Claude API (the newest Opus-class model, with streaming) and saves the report in `reports`. The API key stays on the server, never in the page.
6. **Dashboard:** client list with status (invited → in progress → submitted → analysed → strategy call), a search box, the same answer view as `mentor.html`, the report with export to PDF/Docs, and a "Re-run analysis" button when the prompt improves.
7. **Nice to have:** personal invite links (`?c=<client-id>`) that pre-fill name and language, WhatsApp/email alerts on new submissions, a progress view of clients who started but didn't finish, and multi-market (MENA) filters.

Because Phase 1 already uses stable question IDs, typed answers, versioning and a `market` field, the migration is mostly plumbing; no data needs re-collecting.

---

## 9. Privacy notes

- Answers live in the client's browser (autosave) until sent. They then exist in your email inbox (via Web3Forms) and/or as a file on WhatsApp.
- The mentor desk reads files locally. It remembers the last 15 opened submissions on **your** device only, for quick re-opening. Clear your browser data to remove them.
- Tell clients that question 9.5 (private past) and the revenue question are confidential and never published.

---

## 10. What was tested

- Full flow in **English, French and Arabic (RTL)** on a phone-sized screen (390 px): all 113 questions filled through the interface → review → send → answers file → mentor desk → analysis prompt copied. No errors.
- Both delivery paths: Web3Forms email (simulated success) and the automatic backup (download).
- Layout at phone (390 px) and desktop (1280 px) widths in all three languages.
- Autosave and resume after closing the page, the "this one matters" reminder on skipped key questions, the review list with jump-back links, and ⚠ flags on the mentor desk.
- Not testable here: a real Web3Forms email (needs your key) and the phone share sheet → WhatsApp (needs a real phone). Do one real end-to-end test yourself before sending to a client.
