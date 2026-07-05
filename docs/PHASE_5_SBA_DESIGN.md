# Phase 5 — CBC School-Based Assessment (SBA) Engine

**Status:** Decisions accepted 2026-07-05; **5A–5C + 5D-1 (Results & Verification) built + deployed** · **Author:** SIMS team · **Date:** 2026-07-05

> **Mentor reorder (2026-07-05):** Sprint 5D leads with **SBA Results & Verification** (student SBA tab, subject register, school readiness radar) *before* ECZ export — schools verify frozen results first; export then only ever consumes verified, frozen records. Also requested: **append-only workflow history/versioning** (who/when/action/comment per submission, never overwritten) before export. 5E becomes **Analytics** (school/subject averages, trends, compliance).
**Sources:** ECZ *Guide to Calculating SBA (Forms 1–3)* (Bernard Tito) and *CBC SBA Marks Entry Guide (ECSEOL 2026)*.
**Audience:** mentor review + build blueprint.

> This document is the specification for the CBC SBA Engine. It states the principle,
> audits our existing foundation against the ECZ framework, fixes the data model,
> calculation, lifecycle, security and infrastructure, and breaks the work into
> dependency-ordered sprints. Recommended defaults for the open decisions are baked in
> and flagged in §12 so any of them can be overruled before we build.

---

## 1. The principle

Both ECZ documents, underneath ~17 subject-specific tables, reduce to **one** calculation and **one** governance rule:

1. **Structure-driven, raw marks only.** A subject is *a list of tasks, each with its own maximum mark*. A learner's score for a form-year is:

   ```
   raw = (Σ obtained ÷ Σ task-max) × scale     (rounded half-up)
   ```

   Task lists differ enormously (5–20 tasks; maxes of 5/10/15/20/31/50/79; some are term-structured like Maths' 4 tasks × 3 terms) — but the formula never changes. **The school never applies the 30%/40% weighting; ECZ applies it centrally.** This is the single most-repeated instruction in the 2026 guide and its #1 listed error.

2. **Immutable after sign-off, fully audited.** Subject teacher scores → HOD moderates → Head Teacher verifies & signs → locked. Marks must not change after submission without formal ECZ approval. Everything past the Head Teacher (DEBS → PEO → ECZ) is outside our system.

**Design consequence:** the engine is a generic *assessment-plan + mark-sheet + approval-workflow* system. Subject differences live in **data** (the task list), never in code. Every subject in both PDFs — and any ECZ adds later — then works with zero code change.

---

## 2. ECZ framework — the facts we implement to

| Fact | Value | Impact on the engine |
|---|---|---|
| SBA placement | Component 1; Final Exam (end of Form 4) = Component 2 | We produce Component 1 only |
| SBA years | Form 2 and Form 3, each scored /100 → 200 combined | Plans/marks keyed per form-year |
| Weighting | 30% most subjects; 40% for French, Chinese, Lit. in Zambian Languages, PE & Sport | **Never applied by us** — ECZ weights centrally |
| Submission | Raw marks, **per form-year separately** | Export splits Form 2 / Form 3 |
| Task count | 11–20 per subject (2026); "Variable" for many; **Literature in English capped at 15** | Task list is data; cap is a later validation |
| Task max marks | **Vary within a subject** (5/10/15/20/31/50/79 seen) | Each task carries its own `maxMarks` |
| Term structure | Maths I & II = 4 tasks/term × 3 terms = 12×20 = 240/yr | Tasks carry an optional `termId` |
| Denominator | Σ of administered task maxes — **often not 100** (Maths 240, Commerce 120, Art 200) | Never hard-code 100 |
| Rounding | Half-up to nearest whole number | `Math.round` matches every worked example |
| Grading | 5 competency levels (70/60/50/40 cut-offs) applied by ECZ to **combined** SBA+exam | We may show a **provisional, labelled** band only |
| Exam number | Each learner keyed by ECZ examination number | Denormalized onto the export row |
| Integrity | No alteration after submission; retain evidence ≥3 years | Lock + audit + document storage |
| Special cases | Absent (medical → alternative task); transfer (records follow); SEND access arrangements | `notTaking` flag + student lifecycle |

**Note on the two documents:** the older guide expresses SBA as ×10 (out of 10 per year, 20% total); the 2026 ECSEOL guide is the authoritative current framework (30/40%, raw /100, central weighting). **We implement the 2026 framework** and keep the calculation structure-driven so either scale is a presentation choice, not a schema change.

---

## 3. Foundation audit — what already fits

Verified against the actual files:

| ECZ needs | We have | File |
|---|---|---|
| Which subjects do SBA | `Subject.sbaEnabled` + `formsOffered[]` | `src/domain/subjects/Subject.ts` |
| Who scores a class | Teaching assignment, one teacher per `{year}_{term}_{stream}_{subject}` | `src/domain/teaching/TeachingAssignment.ts` |
| Learner exam number | `Student.examinationNumber?` **exists** (line 23) | `src/domain/students/Student.ts` |
| Submission-chain roles | `teacher / hod / head_teacher / deputy_head / school_admin` | `firestore/00_helpers.rules` |
| Special-case statuses | `applicant…transferred/graduated/withdrawn/suspended` | `src/domain/students/StudentStatus.ts` |
| Coordinates | years / terms / levels (F1–F4) / flat streams + `useAcademicContext()` | `src/domain/academic/*`, `src/features/academic/context/*` |
| Tamper-proof writes | CF audit triggers, field-guarded rules, CF-only derived fields, deterministic-id slots | `functions/src/*`, `firestore/*.rules` |
| The module slot | `firestore/60_assessments.rules` placeholder; `assessments` name reserved | `firestore/60_assessments.rules` |

The just-completed teaching-assignment work is the load-bearing piece: the SBA engine hangs directly off those slots.

---

## 4. Foundation audit — gaps to resolve up front

| # | Gap | Resolution (recommended) |
|---|---|---|
| G1 | **Teachers have no login accounts** — a rule can't say "only the slot's teacher may write these marks" (no teacher `uid`). | MVP: school_admin/head_teacher/HOD enter marks; add **Teacher Identity** (Sprint 5E) to tighten `canScoreSba` to the real teacher. |
| G2 | Teaching assignment is per-**term**; SBA is per-**year**. | Introduce a per-year **class-submission** grain (drop `term` from the key); tasks still carry an optional `termId`. |
| G3 | No per-learner subject selection (we know stream, not subjects). | Derive the roster from stream enrollment + a per-learner **`notTaking`** toggle (covers electives/absent/exempt). |
| G4 | Forms are F1–F4; SBA is F2–F3. | Gate plan creation to a configurable level set, default `{F2, F3}`. |
| G5 | Exam numbers unpopulated. | Bulk-assign/import flow in Sprint 5D (needed at export, not at entry). |
| G6 | Enrollment/occupancy is lifetime, not year-scoped; promotion (Sprint 6) not built. | SBA keys everything by `academicYearId` independently; the "Form 2 + Form 3" learner view queries both years — no dependency on promotion. |
| G7 | No ECZ subject catalog (our `subjectCode` is school-defined). | Defer: schools build the task list per ECZ guidelines by hand; add a validating catalog later (auto-enforce Lit-English-15 cap, 40% subjects). |
| G8 | Must never introduce weighting. | Store/export **raw only**; any competency band is labelled *provisional (SBA-only)*. |
| G9 | `AuditLogEntry` is student-centric. | Extend the shape (or a parallel SBA entry) keyed by `planId/submissionId/studentId`. |
| G10 | No offline-write precedent (all writes use `runTransaction`, which needs connectivity). | Deterministic-id `set()` for marks → offline classroom scoring; low-volume transitions may require connectivity. |

---

## 5. Data model

All ids are **deterministic composite keys** (like `streams` and `teachingAssignments`). This buys idempotency, the one-per-slot invariant, **offline `set()` with no counter/transaction**, and a rules-enforceable `id == composed-key` guard. **No counters anywhere in SBA** (counters need connectivity; classroom scoring is offline-prone).

Three grains, each justified:

### 5.1 `SbaPlan` — the structure (shared across streams of a form)

Path: `schools/{code}/sbaPlans/{academicYearId}_{levelCode}_{subjectId}`

```ts
interface SbaPlan {
  planId: string;                 // == doc id == `${academicYearId}_${academicLevelCode}_${subjectId}`
  academicYearId: string;
  academicLevelCode: string;      // F2 | F3 (gated)
  subjectId: string;              // == Subject.subjectCode
  subjectName: string;            // denormalized
  tasks: SbaTask[];               // 11–20 items
  totalMaxMarks: number;          // Σ tasks.maxMarks (denormalized, must equal the sum)
  status: "draft" | "published";
  createdByUid: string;
  createdAt?: Date; updatedAt?: Date;
}

interface SbaTask {
  taskId: string;                 // stable slug/ordinal, unique within the plan
  name: string;                   // "Class Test 1", "Composition", "Field Project"
  type: string;                   // Test | Assignment | Practical | Project | Presentation | ...
  maxMarks: number;               // per-task max — VARIES
  termId?: string;                // for term-structured subjects (Maths)
}
```

Define Biology-F2's five tasks **once**; F2-A and F2-B share the plan. Tasks embedded as an array (not a subcollection): the structure is small (≤20), read atomically by the plan builder and the mark grid.

### 5.2 `SbaClassSubmission` — the workflow unit (subject × stream × year)

Path: `schools/{code}/sbaSubmissions/{academicYearId}_{streamId}_{subjectId}`  ← the teaching slot **minus term**

```ts
interface SbaClassSubmission {
  submissionId: string;           // == doc id
  planId: string;
  academicYearId: string;
  academicLevelCode: string;
  streamId: string;
  subjectId: string;
  teacherId: string;              // EMP-… from the teaching assignment (denormalized)
  status: "draft" | "submitted" | "returned" | "moderated" | "approved" | "locked";
  submittedByUid?: string;
  moderatedByUid?: string;
  approvedByUid?: string;
  lastActionByUid: string;        // read by the audit CF (triggers have no auth context)
  frozenAt?: Date;                // set when totals are frozen at approval
  createdByUid: string;
  createdAt?: Date; updatedAt?: Date;
}
```

This is the sheet the Head Teacher **signs/approves** — one class's subject.

### 5.3 `SbaMark` — the learner rows (flat, top-level)

Path: `schools/{code}/sbaMarks/{academicYearId}_{streamId}_{subjectId}_{studentId}`

```ts
interface SbaMark {
  id: string;                     // == doc id
  submissionId: string;
  planId: string;
  academicYearId: string;         // ─┐
  academicLevelCode: string;      //  │ denormalized equality fields:
  streamId: string;               //  │ "all marks for this class" and
  subjectId: string;              //  │ "all marks for this learner across subjects"
  studentId: string;              // ─┘ are simple where() queries (no collection-group index)
  examinationNumber?: string;     // denormalized for export
  taskScores: Record<string, number>;  // { [taskId]: obtained } — the score-sheet row (~15 keys)
  notTaking?: boolean;            // elective/absent/exempt → excluded from calc + export
  obtainedTotal?: number;         // frozen at approval (CF-verified, rule-locked)
  rawScore?: number;              // frozen /100 at approval
  status: SbaClassSubmission["status"];  // mirrors submission; gates editability
  lastActionByUid: string;
  createdByUid: string;
  createdAt?: Date; updatedAt?: Date;
}
```

Flat top-level (like `enrollments`). `taskScores` as a **map** (not a doc per task) keeps a class to ~500 docs instead of ~7,500 and makes offline edits cheap.

---

## 6. Calculation

Pure service, no I/O — unit-tested against the PDF worked examples.

```ts
// src/domain/assessments/SbaCalculationService.ts
export function sbaRawOutOf100(taskScores: Record<string, number>, tasks: SbaTask[]): number {
  const max = tasks.reduce((s, t) => s + t.maxMarks, 0);
  if (max === 0) return 0;                                  // divide-by-zero guard
  const got = tasks.reduce((s, t) => s + (taskScores[t.taskId] ?? 0), 0);
  return Math.round((got / max) * 100);                     // half-up
}

export function provisionalBand(raw: number): string {      // LABEL AS PROVISIONAL — SBA only
  if (raw >= 70) return "Outstanding";
  if (raw >= 60) return "Advanced";
  if (raw >= 50) return "Basic";
  if (raw >= 40) return "Satisfactory";
  return "Unsatisfactory";
}
```

**Cross-checks (from the PDFs):**
- English 61/80 → `round(76.25) = 76` (guide's ×10 form: 7.625 → 8) ✓
- Maths 203/240 → `round(84.58) = 85` (guide: 8.458 → 8) ✓
- Chemistry 85/100 → `round(85) = 85` (guide: 8.5 → 9) ✓

**Placement:**
- **Compute client-side on read** for the live entry/working view (≤20 tasks — trivial, and works offline). Do **not** CF-maintain a live total (would be stale offline).
- **Freeze** `obtainedTotal`/`rawScore` onto each mark **only at approval**, recomputed and verified server-side by the CF, then rule-locked (unchanged after — exactly like `occupiedCount`). The frozen snapshot is what exports.
- Store **raw only**; `notTaking` rows are excluded from both calc and export.

---

## 7. Lifecycle state machine

```
 draft ──submit──▶ submitted ──moderate──▶ moderated ──approve──▶ approved ──▶ locked
   ▲   (teacher)       │  (HOD)                        (head teacher)     (export)
   └──── returned ◀────┘  (HOD or head bounces back for correction)
```

| Transition | Actor | Guard |
|---|---|---|
| create marks / edit `taskScores` | scorer | only while `draft` / `returned` |
| `submit` | scorer (subject teacher) | plan `published`; all non-`notTaking` learners scored |
| `return` | HOD / head | from `submitted` / `moderated` |
| `moderate` | HOD | from `submitted` |
| `approve` | Head Teacher (deputy/admin) | from `moderated` (or `submitted` if moderation skipped) → **freezes totals** |
| `lock` | system on approve/export | terminal; marks immutable |

Reopening a locked sheet is a separate, audited "ECZ-approval" action, out of MVP scope.

---

## 8. Security rules

New capability helpers in `firestore/00_helpers.rules` (role logic stays centralized):

```
function canScoreSba()    { return isSchoolAdmin() || hasRole("head_teacher")
                                   || hasRole("hod") || hasRole("teacher"); }   // MVP; tighten to slot teacher in 5E
function canModerateSba() { return isSchoolAdmin() || hasRole("head_teacher") || hasRole("hod"); }
function canApproveSba()  { return isSchoolAdmin() || hasRole("head_teacher") || hasRole("deputy_head"); }
```

`firestore/60_assessments.rules` (sketch):

```
match /schools/{schoolId}/sbaPlans/{planId} {
  allow read:   if belongsToSchool(schoolId) && isStaff();
  allow create: if belongsToSchool(schoolId) && canManageAssessments()
                && request.resource.data.planId == planId
                && planId == data.academicYearId + '_' + data.academicLevelCode + '_' + data.subjectId
                && data.academicLevelCode in ['F2','F3']
                && data.createdByUid == request.auth.uid;
  allow update: if belongsToSchool(schoolId) && canManageAssessments()
                && identity fields frozen (planId/year/level/subject/createdByUid unchanged);
  allow delete: if false;
}

match /schools/{schoolId}/sbaMarks/{markId} {
  allow read:   if belongsToSchool(schoolId) && isStaff();
  allow create: if belongsToSchool(schoolId) && canScoreSba()
                && request.resource.data.id == markId
                && markId == data.academicYearId +'_'+ data.streamId +'_'+ data.subjectId +'_'+ data.studentId
                && data.status == 'draft'
                && data.createdByUid == request.auth.uid
                && data.obtainedTotal == null && data.rawScore == null;   // frozen totals are CF-only
  allow update: if belongsToSchool(schoolId) && canScoreSba()
                && resource.data.status in ['draft','returned']           // IMMUTABLE once approved/locked
                && identity/key fields frozen
                && request.resource.data.obtainedTotal == resource.data.obtainedTotal   // client can't set totals
                && request.resource.data.rawScore == resource.data.rawScore;
  allow delete: if false;
}
// sbaSubmissions: create/edit by canScoreSba (draft/submit) and canModerate/canApprove for their transitions;
// frozen totals + status→approved side effects verified by the CF.
```

Key guards: `id == composed-key` (slot integrity, like `teachingAssignments`); `createdByUid` pinned to caller (no spoofing); frozen totals writable **only** by the CF (field-guard, like `occupiedCount`); marks immutable once `approved`/`locked`; `auditLogs` stay CF-only.

**Known MVP limitation (G1):** until teachers have accounts, `canScoreSba` is coarse (any mark-manager in the school), not "the slot's teacher." Sprint 5E tightens it once `Teacher.uid` exists.

---

## 9. Cloud Functions

`functions/src/assessments/`, exported from `functions/src/index.ts`:

- **`onSbaSubmissionWritten`** (`onDocumentWritten` on `sbaSubmissions/{id}`) — diffs `before.status → after.status` and appends **one** audit entry per transition (`sba.marks.submitted | moderated | approved | locked`), reading the actor from the client-stamped `lastActionByUid`. On `→ approved`, recomputes every learner's `obtainedTotal`/`rawScore` from `taskScores` × the plan and writes the frozen snapshot (the only writer of those fields). Mirrors `onEnrollmentWritten`'s before/after pattern — this status-diff audit trigger is the one genuinely new shape.
- Audit entry shape reuses the existing convention: `{ action, planId, submissionId, streamId, subjectId, actorUid: lastActionByUid ?? null, at: serverTimestamp() }` into `schools/{code}/auditLogs`.

(5E adds an identity callable to create teacher Auth accounts, modelled on `createSchoolAdministrator`.)

---

## 10. Infrastructure

- **Offline:** deterministic-id `set()` for marks ⇒ classroom scoring works offline and syncs on reconnect. Low-volume transitions (submit/approve) may require connectivity.
- **Indexes** (`firestore.indexes.json`): class score-sheet index `academicYearId + academicLevelCode + streamId + subjectId`; per-learner cross-subject index `studentId + academicYearId`. Flat collection ⇒ no collection-group indexes. Time-ordered audit reads use single-`where` + client-side sort (like `listStudentAudit`).
- **Read layer:** `src/features/assessments/{pages,components,hooks/sbaQueries.ts,index.ts}` + `src/domain/assessments/{SbaPlan.ts, SbaPlanService.ts, SbaCalculationService.ts, SbaSubmissionService.ts, SbaMarkService.ts, SbaValidator.ts}`. Query keys: `["sba-plans",code,year]`, `["sba-plan",code,planId]`, `["sba-marks",code,submissionId]`, `["sba-learner-marks",code,studentNumber,year]`, `["sba-audit",code,submissionId]`. Mutations invalidate the matching key `onSuccess`.
- **Actor stamping:** every client write stamps the acting uid (`createdByUid` on create; `lastActionByUid` + `status` on each transition) — the load-bearing convention that lets the CF attribute audit.

---

## 11. UI surfaces & ECZ export

| Surface | Path | Who | What |
|---|---|---|---|
| Plan builder | `/assessments/plans` | school_admin, head, HOD | Define a subject's tasks/maxes per form-year (F2/F3) |
| Marks entry grid | `/assessments/marks` | scorer | Roster (from enrollment), `taskScores` map, live raw%, `notTaking`, save (offline), submit |
| Moderation queue | `/assessments/moderation` | HOD, head | Review submitted class sheets, return or moderate |
| Approval | `/assessments/approval` | head_teacher | Approve & lock → freeze totals |
| ECZ export | `/assessments/export` | head, admin | Per-form-year raw score sheet keyed by exam number (CSV + print hardcopy) |
| Learner SBA | Student profile **SBA tab** | staff | Form 2 + Form 3 rows, provisional band (labelled) |

**ECZ export** = raw marks per form-year, one row per learner keyed by `examinationNumber`, one file per (subject, form-year). Matches the ECZ portal's raw-marks entry and the signed hardcopy chain. **No weighting applied.**

---

## 12. Decisions (**accepted 2026-07-05** — mentor may still override before later sprints)

| # | Decision | Accepted call | Alternative |
|---|---|---|---|
| D1 | Who enters marks in MVP | **school_admin/head/HOD enter now; Teacher Identity (5E) tightens later** | Do 5E first so real teachers enter their own marks |
| D2 | SBA roster source | **Derive from stream enrollment + `notTaking` toggle** | Full per-learner subject-enrolment module |
| D3 | Export value | **Store `Σobtained` + `Σmax`; export normalized /100** | Export raw sum per ECZ subject appendix |
| D4 | ECZ subject catalog | **Defer** (schools follow ECZ task counts by hand) | Build validating catalog now (caps/weights) |
| D5 | Start point | **Sprint 5A (Structure + calculation)** | — |

---

## 13. Sprint breakdown (dependency-ordered)

| Sprint | Deliverable | Unblocks |
|---|---|---|
| **5A — SBA Structure** ✅ **DONE** | `SbaPlan` + task builder (F2/F3-gated), `60_assessments.rules`, `SbaCalculationService` | everything |
| **5B — Marks Entry** ✅ **DONE** | Class score-sheet grid (roster from enrollment, `taskScores` map, live raw%, offline `set()`), `SbaClassSubmission` draft/submit + manager reopen | the daily-driver screen |
| **5C — Moderation & Approval** ✅ **DONE** | SBA Review board (HOD moderate → head approve, return); `onSbaSubmissionWritten` audit + freeze trigger; immutability after approval | completes the governance chain |
| **5D-1 — SBA Results & Verification** ✅ **DONE** | Student-profile SBA tab (F2/F3 raw%, band, frozen, combined /20); printable Subject SBA Register; School SBA Readiness radar (per-subject pipeline progress) | verify frozen results before export |
| **5D-2 — Workflow History & ECZ Export** | Append-only workflow events (who/when/action/comment) + version counter; exam-number bulk-assign; ECZ readiness validation (missing exam#/approvals/marks); per-form-year raw CSV + print | the ECZ deliverable |
| **5E — Teacher Identity** *(prereq for true teacher entry)* | Auth accounts for teachers + `uid↔EMP` link; tighten `canScoreSba` to the slot teacher; "My Classes" | teacher-entered marks |
| **5F — SBA Analytics** | School/subject averages, performance trends, completion/compliance | insight layer |

Each sprint is independently deployable and adversarially reviewed before deploy, per house practice.

---

## Appendix A — Subject task-structure reference (from the ECZ guides)

For the Sprint 5A plan builder's presets. Task counts are ECZ structure; **maxes vary — always sum the actual tasks.**

| Subject | F2 tasks | F3 tasks | Notes |
|---|---|---|---|
| English Language | 8 | 7 | Listening/Speaking, Reading, Writing (10 each) |
| Zambian Languages | 6 | 9 | L&S 30 / Writing 50 / Reading 20 |
| Mathematics I | 12 | 12 | 4 tasks/term × 3 terms × 20 = 240/yr (**term-structured**) |
| Mathematics II | 12 | 12 | as Maths I |
| Biology | 5 | 6 | tests/practical/assignments (20 each) |
| Physics | 6 | 4 + Research Project | mixed maxes |
| Chemistry | 6 | 6 | **mixed maxes** (15/20) → total 100 |
| Civic / History / Geography / RE | 5 | 5 | 20 each = 100 |
| Commerce | 6 | 6 | 15–20 each → total **120** |
| Principles of Accounts | 6 | 6 | → total 120 |
| Art & Design | 5 | 4 | + coursework project 50 → total 200 |
| Design & Technology | 3 | 3 | + Portfolio 79 + Artefact 31 → total 200 |
| Computer Science | 9 | 7 | **mixed maxes** (5/10/20) |
| ICT | 9 | 7 | mixed maxes |

2026 ECSEOL caps/weights to enforce later (D4): Literature in English **max 15 tasks**; French / Chinese / Lit. in Zambian Languages / PE & Sport **40% SBA** (all others 30%). We never apply these percentages — they document what ECZ does centrally.
