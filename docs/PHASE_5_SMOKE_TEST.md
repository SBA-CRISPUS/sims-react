# Phase 5 — SBA Engine Smoke Test

**Goal:** drive the whole CBC SBA chain end-to-end with realistic data before tagging `v1.0.0-beta`.
**Date:** 2026-07-05 · **Build under test:** commit `6013a2f` (Phase 5 complete + hardening).

> **Reality check for today's build:** teachers have **no login accounts yet** (that's Phase 6),
> so there is no "Teacher → Login / My Classes" step and no teacher-scoped restriction to test.
> Run the whole workflow as **`school_admin`** (who is allowed at every step). To verify *role
> separation* (that an HOD can't approve, a teacher can't moderate, etc.), you'd need seeded
> `hod` / `head_teacher` accounts — otherwise rely on the rule trace in the review notes.

## 0. Prerequisites (set up once, as `school_admin`)
- [ ] Log in; pick an **Academic Year** and **Term** in the header bar.
- [ ] **Academic Structure**: a Form 2 level exists with a stream (e.g. `F2-A`).
- [ ] **Students**: admit ~5–35 learners into `F2-A` this year (Student Registry shows them).
- [ ] **Subjects**: a subject (e.g. Mathematics) with **SBA enabled** and **Form 2** in "forms offered".
- [ ] **Teachers** + **Teaching**: register a teacher and assign them Mathematics → `F2-A` (this makes the class show on the Readiness board).

## 1. Assessment plan  (`/assessments/plans`)
- [ ] **New Plan** → Form 2 → Mathematics → add several tasks (vary the max marks, e.g. 4 tasks × 20). Live total updates.
- [ ] **Save** (draft) → **Publish**. Try **Edit** while published → blocked (must unpublish). ✔ expected.

## 2. Marks entry  (`/assessments/marks`)
- [ ] Pick Form 2 → `F2-A` → Mathematics. The roster loads.
- [ ] Enter marks. Watch **typing latency** on a full grid (the perf fix) — should feel snappy.
- [ ] Try to type a mark **above a task's max** → it clamps. Toggle one learner **Not taking**.
- [ ] **Save**. **Reload the browser.** Reopen the class → marks persisted. ✔
- [ ] **Submit for moderation** (blocked until every taking learner is fully scored + saved).

## 3. Moderation & return  (`/assessments/review`)
- [ ] "Needs review" shows the class. Click **Return**, type a reason → Confirm.
- [ ] Click **History** on that row → the timeline shows submitted → returned with your comment.

## 4. Correct & resubmit  (`/assessments/marks`)
- [ ] The sheet is editable again (returned). Change a mark → **Save** → **Submit**.
- [ ] Back on Review, the status badge shows **v2** (version bumped on resubmit).

## 5. Approve & freeze  (`/assessments/review`)
- [ ] **Moderate** → **Approve**. Status → approved.
- [ ] Wait ~2–5s for the freeze function, then reopen the class in Marks → it's **locked** (read-only).
- [ ] **Immutability check:** with the sheet approved, confirm you cannot edit any mark. ✔ expected.

## 6. Verify frozen results
- [ ] **Student profile → SBA tab** (open a learner in the class): shows Form 2 raw %, band, **frozen · approved**.
- [ ] **SBA Readiness** (`/assessments/readiness`): Mathematics · F2 bar shows **Ready**.
- [ ] **Register** (click the class chip on Readiness): printable list with raw % / band / frozen.

## 7. Exam numbers & export
- [ ] **Examination Numbers** (`/assessments/exam-numbers`): Form 2 → `F2-A` → enter numbers → **Save**.
- [ ] **ECZ Export** (`/assessments/export`): Form 2 → Mathematics. Tiles show **Ready / Missing exam # / Not approved**.
- [ ] **Export CSV** → open it. Confirm: raw marks (not weighted), keyed by exam number, and a name/number
      starting with `=`/`+`/`-`/`@` is **not** executed as a formula (the injection fix). **Print** the register.

## 8. Offline (optional)
- [ ] DevTools → Network → Offline. Edit an **already-created** sheet → **Save** → it queues.
      Go back online → it syncs. ✔
- [ ] Note: the **first** save of a *brand-new* class offline will fail (submission creation needs connectivity) — expected.

---

## Review notes to keep in mind while testing
- **Rules — all 8 security invariants traced and confirmed safe** (teacher can't moderate/approve; approved marks immutable; totals CF-only; multi-tenant isolation; no stage-skipping; id integrity; actor pinned; audit/events unforgeable).
- **Fixed in `6013a2f`:** CSV formula injection; marks-grid re-render performance.
- **Known, low / by-design (not fixed):** offline last-write-wins if two devices edit the same class; offline first-save of a new class fails with a raw error; a scorer can pre-lock their own mark to `submitted` via a raw write (self-inflicted, no escalation); submit-completeness is UI-only; CF audit/event may double-log a transition under duplicate delivery.

## Exit criteria → tag `v1.0.0-beta`
All of §1–§7 pass with realistic data, no console errors, marks immutable after approval, and the export opens clean.
