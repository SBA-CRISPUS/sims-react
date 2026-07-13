# Security rules attack panel

An adversarial test suite that loads the compiled, deployed
`firestore.rules` into the Firestore emulator and asserts, scenario by
scenario, that attacks are **denied** and legitimate actions are
**allowed**. It is the pre-deployment gate for any rules change: run it
before shipping and every scenario must stay green.

## Run it

```bash
npm run test:rules
```

This boots the Firestore emulator (`firebase emulators:exec`) and runs
the suite against it. Requirements:

- **Java (JRE 11+)** on `PATH` — the Firestore emulator is a JVM process.
- The Firebase CLI (already a dev dependency via `firebase-tools`) and
  `@firebase/rules-unit-testing`.

The suite is deliberately excluded from the plain `npm test` unit run, so
a machine without Java/the emulator still runs the unit tests.

## What it covers

Each file is one attack surface; every `it(...)` is a single scenario.

| File | Surface |
| --- | --- |
| `tenant-isolation.test.ts` | One school reading/writing another school's records |
| `identity.test.ts` | Self-service role/school/identity escalation; the forced-password-change gate; admin account management |
| `pii-and-students.test.ts` | Roster/guardian/enrollment reads scoped to staff roles |
| `sba.test.ts` | Assignment ownership, the submit→moderate→approve chain, immutability of approved marks and CF-only frozen totals |
| `transfers.test.ts` | The only cross-tenant surface: envelope validation, party-only visibility, server-owned fields |
| `governance.test.ts` | Entitlement freezing, append-only ledgers, audit-log write denial, master-data enumeration, counters |

## Adding a scenario

Reuse the actors and seeders in `_helpers.ts`. Assert the security
outcome with `assertFails` (must be denied) or `assertSucceeds` (a
legitimate control that must keep working — these catch rules that are
*too* strict, not just too loose). Seed starting state with `seed(...)`,
which writes with rules bypassed.
