# Year-End Promotion — design

The January problem: enrollments are per academic year, so when a year
ends every active student needs a NEW enrollment in the next year (at
the next form), F4s must graduate, and repeaters must stay put. Without
a tool this is hundreds of manual actions per school at the exact
moment every school does it at once.

## Model decisions

1. **The old enrollment is untouched.** An enrollment describes one
   year; history stays as written. The student's "current" placement is
   already defined as the newest enrollment by admission date, so the
   new year's record naturally takes over. No status change, no
   migration.
2. **Promotion creates enrollments, it never mints numbers.** Student
   numbers, admission ids and Learner IDs are permanent. Promotion is
   pure enrollment-writing (batched, ~300 per commit) plus, for
   graduates, a student.status flip. The occupancy Cloud Function
   recounts streams as usual.
3. **Actions per student** (defaults, each overridable per row):
   - `promote` (default below F4): enrollment in the target year at the
     NEXT form. The stream code carries over when the same code exists
     and is active at the next form (F1 A -> F2 A); otherwise the
     student arrives unplaced and the existing placement banner takes
     over.
   - `repeat`: enrollment at the SAME form (stream carried the same way).
   - `graduate` (default at F4): student.status = "graduated", no new
     enrollment. The record and transcript remain forever.
   - `skip`: do nothing (e.g. student known to be leaving; a withdrawal
     workflow is a separate future feature).
4. **Idempotent by target year.** Before applying, the tool loads the
   student ids already enrolled in the target year and marks them
   "already enrolled" - re-running after a partial failure never
   duplicates.
5. **The next year must exist first.** Year docs were only ever created
   at provisioning, so the tool includes "Create {year+1}" (year doc,
   current:false, plus Terms 1-3) and a separate, explicit "Make it the
   current year" action (flips the current flags and
   school.currentAcademicYearId). Creating the year is
   school_admin-only (academic structure rules); promotion itself is
   admin/head (student-managing rules). Both already permitted - no
   rules deploy.
6. **Gates.** Read-only mode (lapsed subscription) blocks the whole
   tool - the mentor's grace-period list names "create new academic
   year" as a blocked action. SBA is untouched: old-year sheets stay
   frozen/queryable under their own year id.

## Out of scope (recorded)

- Withdrawal workflow (status "withdrawn" exists on the model, no UI).
- Stream re-shuffling at promotion (schools re-place via the existing
  placement panel / structure page).
- A "promotion certificate" print; transcripts already exist.
