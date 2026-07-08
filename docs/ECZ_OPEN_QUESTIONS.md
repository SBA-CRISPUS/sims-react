# ECZ Open Questions — deferred pending official confirmation

Source: *"ECZ Assessment Guidelines and Blueprint — A Competence-Based Assessment
Framework for Secondary Education (Forms 1–4)"*, compiled by Bernard Tito
(CBC/STEM ambassador, Mkushi Secondary School), © 2026 — based on an ECZ
presentation at the ZAME national conference.

**This is NOT an official ECZ publication.** Its examination-structure table is
explicitly labelled "Proposed", and it states that the official SBA Guidelines
are distributed to schools in Q2 2026. SIMS's SBA engine was built against two
official ECZ guides (SBA Calculation Guide Forms 1–3; CBC SBA Marks Entry Guide
ECSEOL 2026) and cross-checked against their worked examples. The two items
below CONFLICT with what SIMS currently enforces and must be confirmed against
the official guidelines (or with the mentor) before any change is made.

---

## Conflict 1 — SBA scope: Forms 1–3, not only Forms 2–3

**The document says** (§2.1.1): SBA is *compulsory for all learners in all
subjects from Forms 1 to 4*, with no SBA administered in the examination year
(Form 4). Effectively F1, F2 and F3 run SBA every year. The submission example
(§2.1.3) confirms it: "SBA scores for Form 1, Form 2, and Form 3 learners of
2026 should be submitted on 31st January, 2027."

**SIMS currently enforces F2/F3 only**, in three places:

1. `SBA_LEVELS = ["F2", "F3"]` in `src/domain/assessments/SbaPlan.ts`
2. `SbaValidator` rejects other levels ("SBA plans are only for Form 2 and Form 3.")
3. The **deployed** Firestore rule on sbaPlans create requires
   `level in {F2, F3}` (firestore/60_assessments.rules)

**If confirmed**, the change is mechanical: extend `SBA_LEVELS` to
`["F1", "F2", "F3"]`, update the validator message, update the rule constant,
redeploy rules. UI pickers (plans, marks, readiness, export, exam numbers)
all iterate `SBA_LEVELS`, so they follow automatically.

**Why we did not change it yet:** the official calculation guide's
Combined-SBA formula (`round(F2/10) + round(F3/10)` = /20) gives F2/F3 special
certification status, and the F2/F3 restriction was a deliberate design
decision derived from the official guides. Changing scope changes what
teachers are asked to do school-wide.

---

## Conflict 2 — Term weighting inside the SBA year (20% / 30% / 50%)

**The document says** (§4.2.1, "End of Year Examinations (Forms 1-3)"):

| Term   | Purpose              | Weighting   |
|--------|----------------------|-------------|
| Term 1 | Formative assessment | 20% of SBA  |
| Term 2 | Formative assessment | 30% of SBA  |
| Term 3 | Summative assessment | 50% of SBA  |

**SIMS currently computes** a flat raw score:
`rawScore = round((Σ obtained ÷ Σ maxMarks) × 100)` across ALL of the plan's
tasks, regardless of term (`SbaCalculationService.sbaRawOutOf100`, verified
against the official guide's worked examples: 61/80→76, 203/240→85, 99/120→83).
Per-task `termId` is OPTIONAL.

These two formulas disagree whenever the three terms carry unequal mark
totals. **If the 20/30/50 weighting is real**, the impact is large:

- `SbaCalculationService` needs a term-weighted variant
- every task would need a mandatory `termId`
- the `onSbaSubmissionWritten` freeze CF recomputes totals — it must change too
- already-frozen marks would need a policy decision (recompute vs grandfather)

**Ambiguity to resolve first:** the table sits under a heading about
end-of-year *examinations* — it may describe how the three END-OF-TERM TESTS
are weighted relative to each other, not how all SBA tasks are weighted. The
official guide's worked examples show flat summation. Ask the mentor / check
the official SBA Guidelines before touching the calculation.

---

## Adopted from the same document (no conflict)

- `School.examCentreNumber` + configurable `School.sbaSubmissionDeadline`
  (School Profile → "ECZ examinations"; deadline defaults to the 31 January
  norm but stays editable for changes/extensions). Centre number is printed
  in the ECZ export header block per the §4.1.1 submission format.
- Extra SBA task types: Homework, Fieldwork, Observation, End of Term Test.
- Evidence retention ≥ 2 years: SIMS's frozen marks, workflow event history
  and audit logs satisfy this for the digital score record. BUILT 2026-07-08
  as the **SBA evidence add-on**: photos of student work + marked written
  work (PDF only, ≤10MB, NO video by design) attached per class submission
  (`sbaSubmissions/{id}/evidence` metadata + Storage
  `schools/{code}/sbaEvidence/`). OFF by default — `school.features.sbaEvidence`
  is an entitlement flag flipped only by the system administrator (Schools
  page) on the school's request, billed on top of the subscription; the
  school-admin update rule freezes the whole `features` map. Rules are
  get()-free, so the entitlement is client-gated (accepted posture, same as
  the government-school payments page).
