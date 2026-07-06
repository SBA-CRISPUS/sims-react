# SIMS — Multi-School Test Scenarios (3 schools)

**Purpose:** exercise the full platform end-to-end across three schools — SBA engine,
teacher identity & scoping, cross-school transfers, reports, transcripts — with realistic data.
**Build under test:** commit `f013d02` (Phase 8 core complete). **Date:** 2026-07-06.

> You provision the schools and create the students/teachers; this doc says exactly what to enter
> and what to verify. Work through it in order — later scenarios depend on earlier setup.

## Accounts & roles — read first
- **Provision schools** as a **super_admin** (schoolbasedassessment1@gmail.com).
- Each provisioned school gets **one `school_admin`** (temp password shown once — copy it).
- **Teacher** logins are created from **Teachers → profile → Create login account** (role `teacher`).
- **There is no UI to create `hod` / `head_teacher` accounts yet.** `school_admin` is allowed at
  every SBA step (moderate + approve), so **the school_admin plays HOD and Head Teacher.** Use a real
  **teacher** account only to verify teacher scoping.
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
3. Sign in as **School B admin** → **Transfers → Incoming** → the request from Discovery appears.
   - [ ] **View record** shows Liam's identity, enrollment history, and any SBA results (the "digital envelope").
4. Click **Accept** → wait ~5 s → **refresh**.
   - [ ] The request moves **accepted → completed** ("learner imported").
5. Verify the move:
   - [ ] **School B → Students registry**: **Liam O'Brien** now exists, **same SIMS Learner ID**, status active.
   - [ ] **School A → Liam's profile**: status is now **transferred**; his transcript/history still shows his School A record (history preserved).
   - [ ] **Known limitation:** at School B, Liam has **no stream yet** (import leaves placement to you) — he's in the registry but not in a class roster. There's no placement screen yet; this is expected.

## Scenario 5 — Transfer chain  B → C  (identity continuity)
1. As **School B admin**, open **Liam O'Brien** → **Transfer out** → Receiving code = **School C's SIMS code** → send.
2. As **School C admin** → **Transfers → Incoming** → **Accept** → refresh.
   - [ ] Liam appears at **School C** with the **same SIMS Learner ID** as at A and B — the identity is continuous across all three schools.
   - [ ] School B's Liam is now **transferred**; School A's remains **transferred**. Three enrollment records, one learner.

## Scenario 6 — Exam numbers, transcript, export (School A)
1. **Examination Numbers** (`/assessments/exam-numbers`) → Form 2 → F2-A → enter numbers for the learners → **Save**.
2. Open a learner → **Transcript** → **Print / Save as PDF**.
   - [ ] Clean sheet (no app sidebar/header): school + EMIS, learner identity + **SIMS Learner ID**, enrollment history, SBA results, signature line.
3. **ECZ Export** (`/assessments/export`) → Form 2 → Mathematics → tiles (Ready / Missing exam# / Not approved) → **Export CSV**.
   - [ ] CSV opens with raw marks keyed by exam number; a name like `=x` is **not** executed (injection guard).

## Scenario 7 — Role & security spot-checks
- [ ] A **teacher** account has **no** School Profile / Reports / SBA Review / Transfers nav.
- [ ] A **teacher** cannot open another school's data at all (multi-tenant): they only ever see their own school.
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
