# SIMS — Multi-School Test Scenarios (3 schools)

**Purpose:** exercise the full platform end-to-end across three schools — SBA engine,
teacher identity & scoping, cross-school transfers, reports, transcripts — with realistic data.
**Build under test:** Phase 8 core + transfer placement (2026-07-06).

> You provision the schools and create the students/teachers; this doc says exactly what to enter
> and what to verify. Work through it in order — later scenarios depend on earlier setup.

## Accounts & roles — read first
- **Provision schools** as a **super_admin** (schoolbasedassessment1@gmail.com).
- Each provisioned school gets **one `school_admin`** (temp password shown once — copy it).
- **Teacher** logins are created from **Teachers → profile → Create login account** (role `teacher`).
- **Leadership** logins (`head_teacher` / `deputy_head` / `hod` / another `school_admin`) are created
  from **Staff Accounts** (Administration nav, school_admin). Scenario 8 exercises this; for
  Scenarios 1–6 you can still let the school_admin play every review role.
- **Every provisioned account must change its temporary password at first sign-in** (full-screen
  prompt before the app opens). Budget for this on each first login below.
- Tip: use two browsers/profiles (or one normal + one incognito) so you can be signed in as an
  admin and a teacher at once.

---

## Part 0 — Provision the three schools (as super_admin)
Register each via **Register School**. Record the generated **SIMS code** (`SCH-0000xx`) — you'll
need the receiving school's code for transfers.

| # | Name | EMIS (you enter) | Type | Ownership | Province | District | SIMS code (record) |
|---|------|------|------|-----------|----------|----------|--------------------|
| A | Discovery Secondary School | `10001` | Secondary | Government | Lusaka | Lusaka | `SCH-______` |
| B | Kansenshi Secondary School | `20002` | Secondary | Government | Copperbelt | Ndola | `SCH-______` |
| C | Kasama Boys Secondary School | `30003` | Secondary | Government | Northern | Kasama | `SCH-______` |

- [ ] All three provisioned; three admin temp passwords copied; three SIMS codes recorded.
- [ ] For each school, sign in as its admin once (this backfills claims), open **School Profile**, confirm the EMIS shows.

---

## Part 1 — Per-school setup (as each `school_admin`)
Do this for **School A** fully first (Scenarios 1–3 run on A), then a lighter setup for **B** and **C**
(they mainly receive transfers).

For **each** school, signed in as its admin:
1. **Academic context** — in the header bar, pick the **Academic Year** and **Term** (e.g. AY-2026 · Term 1). Confirm Form 2 / Form 3 exist under Academic Structure.
2. **Streams** — Academic Structure → Streams: create **F2-A** and **F3-A** (capacity 40).
   - [ ] Typo recovery: create **F2-Q** by mistake → Edit → change its **Code** to **B** → saved as F2-B (learners, if any, move with it). Deactivate or reuse it. Renaming is blocked once teaching assignments / SBA sheets exist for the stream.
3. **Subjects** — Subjects: create three, **SBA enabled**, forms offered **F2, F3**:
   - `MATH` Mathematics · `ENG` English Language · `BIO` Biology
4. **Teachers** — register two, then **Create login account** for each (copy temp passwords):
   - School A: **Mr John Banda** (Maths dept), **Mrs Grace Phiri** (Languages)
   - School B: **Mr Peter Mwale**, **Mrs Sarah Zulu**
   - School C: **Mr David Tembo**, **Mrs Mary Sakala**
5. **Teaching assignments** — Teaching (pick Year+Term in header): assign
   - teacher 1 → **MATH** → **F2-A**  (confirm the form shows the teacher's **Department**)
   - teacher 2 → **ENG** → **F2-A**
6. **Students** — Admit **6 learners into F2-A** (Admission wizard; admission number is auto, EMIS auto from the school). Suggested names so transfers are traceable:
   - School A: Liam O'Brien, Emma Sullivan, Noah Kelly, Olivia Kennedy, Mason Byrne, Ava Ryan
   - School B: Ethan Burke, Mia Fitzpatrick, Jackson Murphy, Charlotte O'Donnell
   - School C: Aiden Hayes, Amelia Brennan, Grayson Foley, Harper Doyle
   - [ ] After admitting, open a student → confirm a **SIMS Learner ID** (`SL-2026-…`) appears (it's minted by a function ~1–2 s after admission; refresh if not shown).

> Faster alternative for A: as the admin, use **SBA Demo Data** (`/dev/seed`) to seed a Form 2 class in one click, and/or **Bulk Admit** for many learners. But provision B and C's admins/streams/subjects manually (the seeders only touch the signed-in school).

---

## Scenario 1 — SBA happy path (School A)
Signed in as **School A admin** unless noted.
1. **SBA Plans** → New Plan → Form 2 → Mathematics → add 4 tasks (e.g. Test 1 /20, Test 2 /20, Assignment /20, Project /20) → **Save** → **Publish**.
2. Sign in as **Mr Banda (teacher)** in the other browser. He lands on **My Classes** → he sees **Mathematics · F2-A** with the learner count and "Marks entry".
   - [ ] Expected: only *his* class(es) show — no dropdowns.
3. Mr Banda opens the class → enters marks for all 6 learners → **Save** → **reload the browser** → marks persisted → **Submit for moderation**.
   - [ ] Submit is blocked until every learner is fully scored + saved.
   - [ ] Back as **admin**: the sidebar shows a **red count badge on SBA Review** (a sheet awaits action).
4. Back as **admin** → **SBA Review** → "Needs review" shows the class → **Moderate** → then **Approve** (add a note if you like).
5. Wait ~3 s (freeze function) → reopen the class in **SBA Marks** → it's **locked/read-only**.
   - [ ] A learner's mark can no longer be edited.
6. Verify results:
   - [ ] **Student profile → SBA tab**: Form 2 raw %, band, **frozen · approved**.
   - [ ] **SBA Readiness**: Mathematics · F2 shows **Ready**.
   - [ ] **Reports**: KPIs update; Compliance-by-subject bar for Mathematics moves toward Ready.
   - [ ] **Register** (click the class chip on Readiness): printable list.

## Scenario 2 — Return, resubmit, versioning (School A)
1. Repeat a plan+marks for **English (ENG) F2-A** as **Mrs Phiri**, and **Submit**.
2. As **admin** → **SBA Review** → **Return** with a note ("recheck Test 2").
   - [ ] As **Mrs Phiri**: the sidebar shows a **badge on SBA Marks** (her returned sheet).
3. As **Mrs Phiri** → the class is editable again → change a mark → **Save** → **Submit**.
   - [ ] On Review the status badge shows **v2**; **History** lists submitted → returned (with your note) → submitted.
4. As **admin** → Moderate → Approve.

## Scenario 3 — Teacher scoping (School A)  ⭐ security
1. As **Mr Banda (teacher)**, open **SBA Marks** and try to select **English · F2-A** (Mrs Phiri's class).
   - [ ] Expected: the grid loads **read-only** (he isn't the assigned teacher) — he can't Save.
   - Note: read-scoping isn't implemented yet, so he can still *view* it; the check is that he **cannot save**.
2. Confirm Mr Banda has **no Moderate/Approve** actions anywhere (only admin/head/hod do).

## Scenario 4 — Cross-school transfer  A → B  ⭐ the big one
1. As **School A admin**, open **Liam O'Brien**'s profile → confirm his **SIMS Learner ID**.
2. Click **Transfer out** → Receiving school code = **School B's SIMS code** → Reason "Parent relocation" → date → **Send transfer request**.
   - [ ] Success message; on School A's **Transfers → Outgoing**, the request shows **requested**.
   - [ ] After a moment (refresh), the row shows a **transfer number** `TRF-2026-…` (minted server-side).
   - [ ] Try **Transfer out** on Liam again → blocked: "a transfer for this learner is already in progress".
3. Sign in as **School B admin** → **Transfers → Incoming** → the request from Discovery appears.
   - [ ] The sidebar shows a **badge on Transfers** (an incoming request awaits a decision).
   - [ ] **View record** shows Liam's identity, **guardians**, enrollment history, and any SBA results (the "digital envelope").
4. Click **Accept** → wait ~5 s → **refresh**.
   - [ ] The request moves **accepted → completed** ("learner imported").
5. Verify the move:
   - [ ] **School B → Students registry**: **Liam O'Brien** now exists, **same SIMS Learner ID**, status active, stream shows **—** (unplaced).
   - [ ] **School B → Liam's profile → Guardians**: his guardian arrived with him (imported from the envelope, with a new `GRD-…` number).
   - [ ] **School A → Liam's profile**: status is now **transferred**; his transcript/history still shows his School A record (history preserved).
   - [ ] **School A → Liam's profile → Transfer certificate** → print view: identity, admitted/leaving dates, destination school code, **TRF number**, signature line.
   - [ ] **School A → Liam's profile → Audit**: `transfer.requested` → `transfer.accepted` → `student.transferred_out`, each quoting the TRF number.
6. **Place the learner** (imports arrive unplaced — the receiving school assigns the class):
   - On the completed request (Transfers → Incoming) click **Open their profile to assign a class** — or open Liam from the registry.
   - [ ] His profile shows an amber **"No class assigned"** banner → pick **F2-A** → **Assign class**.
   - [ ] Banner disappears; Enrollment tab shows stream **A**; registry now shows the stream.
   - [ ] Wait ~3 s → **Academic Structure → Streams**: F2-A's occupancy went up by 1 (the recount function).
   - [ ] School B's **teacher 1 (Maths)** now sees Liam in the **F2-A learner count** on My Classes.

## Scenario 4b — Cancel a transfer (School A)
1. As **School A admin**, transfer out **Emma Sullivan** to School B (as in Scenario 4).
2. On **Transfers → Outgoing**, the pending row has a **Cancel request** button → click it.
   - [ ] Status becomes **cancelled**; School B's inbox shows it cancelled with no actions.
   - [ ] Emma is untouched at School A (still active — nothing moves until acceptance).
   - [ ] Sending a **fresh** request for Emma now works (cancel is how you refresh a stale envelope).
3. Cancel the fresh one too (so Emma stays at School A for Scenario 6).

## Scenario 5 — Transfer chain  B → C  (identity continuity)
1. As **School B admin**, open **Liam O'Brien** → **Transfer out** → Receiving code = **School C's SIMS code** → send.
2. As **School C admin** → **Transfers → Incoming** → **Accept** → refresh.
   - [ ] Liam appears at **School C** with the **same SIMS Learner ID** as at A and B — the identity is continuous across all three schools.
   - [ ] School B's Liam is now **transferred**; School A's remains **transferred**. Three enrollment records, one learner.
   - [ ] Place him at C too (profile banner → **F2-A**) — placement at B is *not* required for the onward transfer, but C should place him to finish.
   - [ ] School B's F2-A occupancy **drops back** after he leaves (recount excludes non-active enrollments).

## Scenario 6 — Exam numbers, transcript, export (School A)
1. **Examination Numbers** (`/assessments/exam-numbers`) → Form 2 → F2-A → enter numbers for the learners → **Save**.
2. Open a learner → **Transcript** → **Print / Save as PDF**.
   - [ ] Clean sheet (no app sidebar/header): school + EMIS, learner identity + **SIMS Learner ID**, enrollment history, SBA results, signature line.
3. Open a learner → **Report card** → the school's own calculations:
   - [ ] Subject rows show score /100, **Grade** (school scale), **class average**, class range, final/provisional.
   - [ ] Footer shows **overall average**, **class position (N of M)**, class average; the **grading scale legend** (0–49 Fail … 80–100 Excellent, or as set on School Profile); remarks + signature lines; school **logo** in the header; prints clean.
   - [ ] **Reporting period:** pick a Term (only offered if plan tasks are tagged with terms) + "Midterm" → the card header reads e.g. **Term 2 — Midterm** and scores recompute over that term's tasks only.
4. **ECZ Export** (`/assessments/export`) → Form 2 → Mathematics → tiles (Ready / Missing exam# / Not approved):
   - [ ] **Export for ECZ**: raw marks only, keyed by exam number; a name like `=x` is **not** executed (injection guard).
   - [ ] **School copy (per-task)**: one column per task (`Test 1 /20`, …) + `Obtained /80` + `Raw /100`.

## Scenario 7 — Role & security spot-checks
- [ ] A **teacher** account has **no** School Profile / Reports / SBA Review / Transfers / Staff Accounts nav.
- [ ] A **teacher** cannot open another school's data at all (multi-tenant): they only ever see their own school.
- [ ] The header shows the **school name on top** with the SIMS title beneath it, on every account.

## Scenario 8 — Staff accounts, password change, deactivation (School A)
1. As **School A admin** → **Staff Accounts** → **Create staff account**: "Mrs Ruth Chanda",
   an email you control, role **Head of Department** → temp password shown **once** → copy.
   - [ ] She appears in the accounts list as **active · temp password**.
2. Sign in as **Mrs Chanda** (other browser).
   - [ ] Before anything else, a full-screen **"set your own password"** prompt appears; the app is unreachable until she changes it.
   - [ ] After changing: she lands on the dashboard; signing out and back in with the **new** password works; the **old temp password fails**.
   - [ ] On **SBA Review** she can **Moderate** a submitted sheet but has **no Approve** button (HOD ≠ approver).
3. Voluntary change: as any account → header → **Change password** → change and re-login.
4. **Deactivation:** as admin → Staff Accounts → **Deactivate** Mr Banda's teacher account.
   - [ ] Mr Banda's open session is locked out on next load ("Account deactivated"); fresh sign-in fails (Auth account disabled — allow up to ~1 h for an already-issued token to die).
   - [ ] **Reactivate** him → he can sign in again.
5. As admin, confirm you **cannot deactivate yourself** (no button on your own row).

## Scenario 9 — Branding, dashboard, payments & report-card gate
1. **Branding:** School Profile → **Branding** → upload a logo (PNG/JPG ≤ 2MB).
   - [ ] Logo shows on School Profile immediately and on printed report card / transcript / certificate headers; app header shows it after next sign-in.
2. **Grading scale:** School Profile → **Grading scale** → change a band label (e.g. 80–100 → "Distinction") → Save.
   - [ ] A report card now grades with the new label and the legend reflects it.
3. **Dashboard:** sign in as admin → the landing page is the cockpit: greeting hero with year/term chips, KPI tiles (learners / teachers / SBA approved / actions pending), "Needs your attention", SBA pipeline bars, quick actions.
4. **Payments (private school only — School A is Government, so set a test school's ownership to Private on School Profile first):**
   - [ ] As a **Government** school, the Payments nav is hidden and /finance/payments says fees are off (free education).
   - [ ] As **Private**: Payments page → record a payment for a learner (amount, method, reference) → totals update; ledger CSV exports.
   - [ ] **Report-card gate:** with the learner NOT cleared → a **teacher** opening their report card is blocked ("withheld"); the **admin** sees it with an amber withhold notice.
   - [ ] Tick **Cleared for reports** on the Payments page → the report card opens normally for everyone.
   - [ ] Record a **negative adjustment** entry (e.g. -200, note "posting error") → net total drops; the original entry is untouched (append-only).
- [ ] On **Transfers**, a teacher has no "Transfer out" button (initiating is admin/head only).
- [ ] School B cannot see School A's transfer requests **except** the one addressed to School B.

---

## Known limitations to expect (not bugs)
- **Transferred learner has no stream** at the receiving school until placed — no placement UI yet (follow-up 8.3b).
- **hod/head_teacher** role accounts can't be created in the UI — admin plays those roles.
- **Read-scoping** of SBA sheets isn't done — a teacher can *view* (not save) another class's sheet.
- **Existing/older students** (admitted before the Learner-ID feature) have **no** SIMS Learner ID — use freshly admitted learners for transfer tests.
- **Guardians/medical/documents** aren't in the transfer envelope yet (identity + enrollment + SBA only).
- **Offline:** the *first* save of a brand-new class needs connectivity; later saves work offline.
- Learner ID and SBA freezing are done by Cloud Functions — allow a few seconds + refresh.

## Pass criteria → tag v1.0.0-beta
Scenarios 1–6 pass with realistic data, no console errors, marks immutable after approval, the A→B→C
transfer preserves one Learner ID, and the transcript/export come out clean.
