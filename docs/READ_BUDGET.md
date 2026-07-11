# READ BUDGET — Firestore cost discipline

Standing rule (user directive, 2026-07-11): **keep Firestore reads at the
minimum possible.** Firestore bills per document read. The math that
matters: 500 schools × ~20 staff × dozens of page loads a day × the docs
each page reads. A page that scans a 1,000-student collection costs
1,000 reads *per visit*; the same page built on the rules below costs a
handful.

## Rules for every new feature

1. **Long cache, explicit invalidation.** The global react-query default
   is `staleTime: 5 min` / `gcTime: 30 min` (src/lib/queryClient.ts).
   Every mutation MUST invalidate exactly the query keys it changes —
   this is what makes the long staleTime safe: your own writes appear
   instantly, other users' writes appear within the window. Never set
   `staleTime: 0` or add polling/refetch intervals without a reason
   written next to it.

2. **Counts are aggregate queries, never scans.** If a screen needs only
   "how many", use `countDocs` / `getCountFromServer`
   (src/lib/firestoreCounts.ts): 1 read per 1,000 index entries instead
   of 1 read per document. Dashboard tiles, plan caps and badges must
   never load full collections. (Applied: AdminDashboard student/teacher
   tiles, AdmissionWizard Starter cap.)

3. **One query, client-side filtering.** Prefer a single equality query
   (no composite index) filtered in memory over multiple narrower
   queries, when the base result set is small (a class, a term's
   submissions). Prefer a *narrower query* when the base set is large
   (never "all students" when "stream's students" exists).

4. **No per-row reads.** Never fetch documents in a loop per table row
   (N+1). Join client-side from collections already in the cache, or
   denormalise the field onto the row's document at write time (as
   teacherId is denormalised onto SBA submissions).

5. **No always-on listeners.** `onSnapshot` keeps charging for every
   change while mounted. SIMS uses fetch + cache; add a listener only
   for something genuinely real-time and mount it narrowly.

6. **Denormalise for the hot path, recompute via CF.** Counters and
   projections that would otherwise need scans (stream occupancy,
   learner registry) are maintained by Cloud Functions at write time.
   Follow that pattern for new aggregates (e.g. a future school stats
   doc updated on admission rather than counted on view).

7. **Watch the always-mounted surfaces.** Sidebar badges
   (useActionCounts), the subscription banner and gates run on every
   page. Anything added there must be cheap (cached, count-based, or
   reading a doc already in cache).

8. **Exports/prints reuse the cache.** CSV/print views must be built
   from queries the page already ran, never fresh scans.

## Current known heavy readers (acceptable today, revisit at scale)

- `useRegistry` (all students + all enrollments): needed by the
  registry page itself, My Tasks admin checks, and payments. At 1,000+
  students consider paginating the registry and moving My Tasks counts
  to CF-maintained aggregates.
- `useSbaSubmissions` (all of a school's sheets): bounded (~classes ×
  subjects), fine.
- SBA marks pages: bounded per class, fine.

## Cost sanity check

Firestore reads ≈ $0.06 / 100k. Target: an average staff session should
stay under ~2k reads. 500 schools × 20 staff × 2k reads/day ≈ 20M/day ≈
$12/day worst case — the rules above are what keep the real number far
below that.
