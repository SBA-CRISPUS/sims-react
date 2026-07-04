# Changelog

All notable changes to SIMS are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/), and the project adheres to
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Planned — v0.5.0 Academic Structure
- Stream Management (streams as real entities, not free text)
- Stream capacity and admission capacity checks
- Class Teacher allocation (field seeded; allocation UI follows Teacher Management)
- Academic Context Service (year / term / level / stream in the session)

## [0.4.0] — 2026-07-04 — Student Registry

### Added
- Students Dashboard with computed analytics: totals, admissions this month,
  status counts, enrollment by form and by stream, gender split, recent admissions.
- Student Registry: search, filters (level, stream, gender, admission year, status),
  pagination, and CSV export.
- Student Profile with independently-loaded tabs (Overview, Enrollment, Guardians,
  Timeline, Documents, Audit).
- Guardian Profile with linked children.
- Student Documents: Firebase Storage files with a Firestore metadata subcollection;
  upload, download, and delete, plus Storage security rules.
- Domain query services: `StudentRegistryService`, `StudentProfileService`,
  `StudentTimelineService`.
- TanStack Query as the read/caching layer.

## [0.3.0] — 2026-07-04 — Student Admissions

### Added
- Five-step admission wizard (Personal, Guardian, Placement, Medical, Review).
- Transactional admission: guardian, student, enrollment, and school-local
  counters commit atomically.
- School-local counters (`students`, `guardians`, `admissions-YYYY`) with
  human-readable IDs (`STU-…`, `GRD-…`, `ADM-YYYY-…`).
- Guardian records linked to students; append-only enrollment history.
- Server-side audit logging via the `onStudentAdmitted` Cloud Function trigger.
- Firestore rules for enrollments and counters.

## [0.2.0] — 2026-07-04 — School Provisioning & Security

### Added
- School registration and provisioning (settings, academic year, terms,
  academic levels, departments).
- Administrator onboarding via the `createSchoolAdministrator` Cloud Function
  (Auth account, custom claims, profile) with a one-time password handover.
- `syncMyClaims` Cloud Function and client-side claims backfill.
- Production Firestore security rules: multi-school isolation, role-based
  access, immutable audit logs, super-admin-only system data.

### Fixed
- Provisioning ordering, duplicate steps, and status lifecycle.

## [0.1.0] — 2026-07-04 — Platform Foundation

### Added
- Vite + React + TypeScript + Tailwind + Firebase project under version control.
- Firebase Authentication and the identity/session layer (`AuthService`,
  `AuthProvider`, `useAuth`, session engine).
- Application Shell: session gate, protected routes, and role guards.
- Role-driven navigation.

### Removed
- Abandoned parallel implementations and dead/duplicate code.

[Unreleased]: https://github.com/SBA-CRISPUS/sims-react/compare/v0.4.0...HEAD
