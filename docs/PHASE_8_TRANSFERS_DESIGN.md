# Phase 8 — Student Mobility & Academic Records

**Status:** Design (pre-build) · **Date:** 2026-07-05 · **Audience:** mentor review + build blueprint.

> Let a learner move between SIMS schools without losing their academic history — no paper,
> no re-typing, no lost SBA marks — while **never** weakening the multi-tenant isolation the
> whole platform rests on. This is the strategic differentiator; it is also the single most
> security-sensitive feature in SIMS, so the cross-tenant model below must be reviewed before
> any rules/functions are written.

## 1. The principle
- **The learner is permanent; the enrollment moves.** A learner has one immutable **SIMS Learner ID** for life. Transferring schools does **not** move the student — it **closes** one enrollment and **opens** another. History is the chain of enrollments, preserved forever.
- **Schools never browse each other.** The only cross-tenant surface is a **transfer request** carrying a **snapshot** (the "digital envelope"). The receiving school previews the snapshot and accepts/rejects; the actual import is performed by a **Cloud Function** (Admin SDK). Neither school ever reads the other's live collections.

## 2. The multi-tenant challenge (and the solution)
Today every rule gates on `belongsToSchool(schoolCode)` from the token claim — school A can read/write **nothing** of school B. Transfers need controlled cross-school flow. Three deliberate moves make it safe:

1. **A top-level `transferRequests/{id}` collection** — the *only* place two schools share a document. Rules scope each request to its two parties:
   - read: `belongsToSchool(fromSchoolCode) || belongsToSchool(toSchoolCode)` (+ super_admin)
   - a school only ever sees requests where it is the **sender or receiver**, never a directory of the other school.
2. **The request carries a self-contained snapshot** (identity, enrollment, SBA results, guardians, medical, documents-manifest). The receiving school previews **that snapshot**, not the sender's live student record. The sender's records are never exposed directly.
3. **A Cloud Function performs the import** on acceptance (Admin SDK): create the enrollment + student at the receiving school, close the sending school's enrollment, stamp the timeline on both sides. Cross-school **writes** are never done by a client.

Net: the client-visible cross-tenant surface is exactly one collection of two-party request docs; everything else stays single-tenant.

## 3. Data model
### 3.1 Permanent identity — `Student.learnerId` + global `learners/{learnerId}`
- `Student.learnerId` — `SL-YYYY-NNNNNNNNN` (year of first admission + a **global** 9-digit sequence). Immutable, follows the learner across schools. The school-local `studentNumber` / `admissionNumber` may differ per school; the learner ID does not.
- Global registry `learners/{learnerId}` (platform-managed, **CF-only**): `{ learnerId, currentSchoolCode, currentStudentNumber, firstName, lastName, createdAt }`. The seed of national learner tracking and transcript verification. Read: super_admin (platform); write: CF only.
- Minting requires a **global** counter (`system/counters.learners`) which is super-admin/CF-only — so the **`onStudentAdmitted` CF assigns it** (a client transaction can't touch `system/`). Idempotent: it re-reads the student and skips if already assigned.

### 3.2 Transfer request — top-level `transferRequests/{requestId}`
```
{
  requestId,
  learnerId,                       // the permanent identity being moved
  fromSchoolCode, toSchoolCode,
  studentSnapshot,                 // the digital envelope (see §5)
  reason, effectiveDate,
  status,                          // requested → accepted | rejected | info_requested → completed
  requestedByUid, decidedByUid,
  requestedAt, decidedAt, completedAt,
}
```

## 4. Transfer workflow
```
 requested ──accept──▶ accepted ──(CF import)──▶ completed
    │  (receiving head/admin)                        ▲
    ├──reject──▶ rejected                            │
    └──request info──▶ info_requested ──resend──▶ requested
```
- **Initiate** (`requested`): the **sending** Head Teacher / School Admin. Builds the snapshot, creates the request. Roles: `canInitiateTransfer` = school_admin || head_teacher. **A teacher cannot.**
- **Decide** (`accepted`/`rejected`/`info_requested`): the **receiving** Head Teacher / School Admin. `canDecideTransfer` = school_admin || head_teacher of `toSchoolCode`.
- **Import** (`completed`): the CF, on `accepted` — creates the receiving enrollment (+ student if new to that school), closes the sending enrollment, links the learner registry to the new school, writes both timelines.

**Teachers' role (per your note):** teachers never initiate or approve. But once a transfer **completes**, the learner flows into the receiving **teacher's** roster and My Classes automatically (new enrollment), and the imported **SBA history** is visible on the student's SBA tab — so the receiving teacher immediately sees what's already done.

## 5. The Digital Transfer Envelope (snapshot)
Built by the sending school (or a CF) at initiation; previewed by the receiver before acceptance:
- **Identity** — learnerId, names, DOB, gender, nationality, exam number
- **Enrollment history** — schools attended, levels, dates
- **SBA results** — per form-year, per subject: frozen raw marks + status (Form 2 done, Form 3 pending, …)
- **Guardians**, **Medical notes**, **Documents manifest** (file list; the files themselves copy on acceptance)
- **Transfer reason**

The receiver **Accepts / Rejects / Requests clarification**. Only on **Accept** does the CF import into active records. This preserves the sender's records, avoids duplicate active enrollments, and gives both sides a complete audit trail.

## 6. Security rules (the crux — review carefully)
```
match /learners/{learnerId} {
  allow read: if isSuperAdmin();          // platform registry; schools read learnerId off the student doc
  allow write: if false;                  // CF only
}

match /transferRequests/{requestId} {
  // Two-party visibility only.
  allow read: if isSuperAdmin()
    || belongsToSchool(resource.data.fromSchoolCode)
    || belongsToSchool(resource.data.toSchoolCode);

  // The SENDING school's head/admin initiates.
  allow create: if belongsToSchool(request.resource.data.fromSchoolCode)
    && canInitiateTransfer()
    && request.resource.data.status == 'requested'
    && request.resource.data.requestedByUid == request.auth.uid;

  // The RECEIVING school's head/admin decides (accept/reject/info). The
  // 'completed' transition + all cross-school writes are CF-only.
  allow update: if belongsToSchool(resource.data.toSchoolCode)
    && canDecideTransfer()
    && resource.data.status == 'requested'
    && request.resource.data.status in ['accepted','rejected','info_requested']
    && <fromSchool/toSchool/learnerId/snapshot frozen>;

  allow delete: if false;
}
```
New helpers: `canInitiateTransfer()` / `canDecideTransfer()` = school_admin || head_teacher. The snapshot and party fields are frozen after creation; the CF (Admin SDK) owns `completed` and the actual import.

## 7. Cloud Functions
- **`onStudentAdmitted`** (extend): mint `learnerId` + seed `learners/{learnerId}` (Sprint 8.1).
- **`onTransferAccepted`** (`onDocumentWritten` on `transferRequests`, status → `accepted`): import into the receiving school (student+enrollment), close the sending enrollment, relink the learner registry, stamp both timelines, set `completed`. Idempotent recompute-style guard.
- **Snapshot builder** (callable, or built client-side at initiation from the sending school's own data — the sender already has read access to its own learner).

## 8. Transcript (later sprint)
One click on the student profile → PDF: school logo, EMIS, learner identity, enrollment history, SBA history, principal signature, QR code (future verification). Consumes the same data the envelope does.

## 9. Sprint plan
| Sprint | Deliverable |
|---|---|
| **8.1 — Permanent Learner ID** | `Student.learnerId` minted by `onStudentAdmitted` via a global counter; `learners/{id}` registry; shown on the student profile |
| **8.2 — Transfer request handshake** | top-level `transferRequests` + rules (two-party) + `canInitiate/canDecide`; initiate (sending) + inbox/decide (receiving) UI |
| **8.3 — Digital envelope + import** | snapshot builder; receiver preview (accept/reject/info); `onTransferAccepted` CF (import + close + relink + timeline) |
| **8.4 — Transcript** | one-click transcript PDF |
| **8.5 — Notifications & timeline** | transfer events on both schools' timelines; head-teacher notifications |

## 10. Open decisions for the mentor
1. **Learner-ID scheme** — global sequence `SL-YYYY-NNNNNNNNN` (my default) vs a checksum/portable format. Year = first-admission year.
2. **Global registry contents** — minimal (id + current school + name) vs richer (for national analytics). Default minimal; grows later.
3. **Snapshot freshness** — built at initiation (a point-in-time envelope) vs rebuilt at acceptance (latest). Default: at initiation, with the receiver able to "Request info" to force a refresh.
4. **Document files** — copy into the receiving school's Storage on acceptance (CF), or keep a reference. Default: copy on acceptance.
5. **Duplicate detection** — if the receiving school already has a student with that `learnerId`, block/merge. Default: block with a clear message.
