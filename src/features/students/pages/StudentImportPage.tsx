import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../../auth/hooks/useAuth";
import { useAcademicContext } from "../../academic/hooks/useAcademicContext";
import { useLevels, useStreams } from "../../academic/hooks/streamQueries";
import { useSubscriptionAccess } from "../../schools/hooks/useSubscriptionAccess";
import { STARTER_STUDENT_LIMIT } from "../../schools/subscription";
import { useActiveStudentCount } from "../../dashboard/hooks/countQueries";
import { StudentAdmissionService } from "../../../domain/students/StudentAdmissionService";
import type { StudentAdmissionRequest } from "../../../domain/students/StudentAdmissionRequest";
import type { GuardianRelationship } from "../../../domain/students/Guardian";
import { downloadCsv } from "../../../lib/csv";
import { useQueryClient } from "@tanstack/react-query";

const HEADERS = [
  "firstName",
  "lastName",
  "otherNames",
  "gender",
  "dateOfBirth",
  "nationality",
  "guardianFirstName",
  "guardianLastName",
  "guardianRelationship",
  "guardianPhone",
  "form",
  "stream",
] as const;

interface ParsedRow {
  line: number;
  values: Record<(typeof HEADERS)[number], string>;
  errors: string[];
}

interface LogEntry {
  line: number;
  name: string;
  ok: boolean;
  message: string;
}

/**
 * Bulk onboarding: admits existing students from a CSV file, one REAL
 * admission transaction per row (numbers minted, guardians created,
 * Cloud Functions fire) - exactly as if each was typed into the wizard.
 * The school prepares the file once instead of running the wizard
 * hundreds of times.
 */
export default function StudentImportPage() {
  const { school, profile } = useAuth();
  const schoolCode = school?.schoolCode;
  const { academicYear, academicYearId } = useAcademicContext();
  const queryClient = useQueryClient();

  const access = useSubscriptionAccess();
  const studentCount = useActiveStudentCount(schoolCode);
  const levels = useLevels(schoolCode);
  const streams = useStreams(schoolCode);

  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [finished, setFinished] = useState(false);

  const validRows = useMemo(() => rows.filter((r) => r.errors.length === 0), [rows]);

  function template() {
    downloadCsv("students_import_template.csv", [
      [...HEADERS],
      [
        "Mary",
        "Banda",
        "",
        "Female",
        "2012-03-14",
        "Zambian",
        "Joseph",
        "Banda",
        "Father",
        "0977123456",
        "F1",
        "A",
      ],
    ]);
  }

  function parse(text: string) {
    setParseError(null);
    setLog([]);
    setFinished(false);

    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (lines.length < 2) {
      setParseError("The file needs a header row and at least one student row.");
      setRows([]);
      return;
    }

    const header = lines[0].split(",").map((h) => h.trim());
    const missing = HEADERS.filter(
      (h) => !header.some((c) => c.toLowerCase() === h.toLowerCase())
    );
    if (missing.length > 0) {
      setParseError(
        `Missing columns: ${missing.join(", ")}. Download the template to get the exact header row.`
      );
      setRows([]);
      return;
    }
    const index = new Map(
      header.map((c, i) => [c.toLowerCase(), i] as const)
    );

    const streamList = streams.data ?? [];
    const levelCodes = new Set((levels.data ?? []).map((l) => l.levelCode));

    const parsed: ParsedRow[] = lines.slice(1).map((line, i) => {
      const cells = line.split(",").map((c) => c.trim());
      const get = (h: (typeof HEADERS)[number]) =>
        cells[index.get(h.toLowerCase()) ?? -1] ?? "";
      const values = Object.fromEntries(
        HEADERS.map((h) => [h, get(h)])
      ) as ParsedRow["values"];

      const errors: string[] = [];
      if (!values.firstName || !values.lastName)
        errors.push("first and last name required");
      if (!["Male", "Female"].includes(values.gender))
        errors.push("gender must be Male or Female");
      if (Number.isNaN(new Date(values.dateOfBirth).getTime()))
        errors.push("dateOfBirth must be YYYY-MM-DD");
      if (!values.guardianFirstName || !values.guardianLastName)
        errors.push("guardian names required");
      if (!values.guardianPhone) errors.push("guardian phone required");
      if (!levelCodes.has(values.form))
        errors.push(`unknown form "${values.form}"`);
      else if (
        !streamList.some(
          (s) =>
            s.academicLevelCode === values.form &&
            s.streamCode === values.stream &&
            s.active
        )
      )
        errors.push(`no active stream "${values.stream}" in ${values.form}`);

      return { line: i + 2, values, errors };
    });

    setRows(parsed);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    parse(await file.text());
  }

  async function runImport() {
    if (!school || !profile || !academicYearId) return;
    setImporting(true);
    setFinished(false);
    const entries: LogEntry[] = [];
    let admitted = 0;
    const baseCount = studentCount.data ?? 0;

    for (const row of validRows) {
      if (
        access.plan === "Starter" &&
        baseCount + admitted >= STARTER_STUDENT_LIMIT
      ) {
        entries.push({
          line: row.line,
          name: `${row.values.firstName} ${row.values.lastName}`,
          ok: false,
          message: `stopped — Starter plan limit (${STARTER_STUDENT_LIMIT} students) reached`,
        });
        break;
      }
      const v = row.values;
      const request: StudentAdmissionRequest = {
        student: {
          firstName: v.firstName,
          lastName: v.lastName,
          otherNames: v.otherNames || undefined,
          gender: v.gender as "Male" | "Female",
          dateOfBirth: new Date(v.dateOfBirth),
          nationality: v.nationality || "Zambian",
          emisNumber: school.emisCode || undefined,
          cbc: { specialNeeds: false, boarding: false, transport: false },
        },
        guardian: {
          firstName: v.guardianFirstName,
          lastName: v.guardianLastName,
          // Free-text CSV values map onto the fixed relationship set;
          // anything unrecognised lands as "Guardian".
          relationship: (
            ["Father", "Mother", "Guardian", "Grandparent", "Other"] as const
          ).includes(v.guardianRelationship as GuardianRelationship)
            ? (v.guardianRelationship as GuardianRelationship)
            : "Guardian",
          phone: v.guardianPhone,
        },
        enrollment: {
          academicYearId,
          academicLevelCode: v.form,
          streamId: v.stream,
          admissionDate: new Date(),
          status: "active",
        },
      };
      try {
        const result = await StudentAdmissionService.admit(
          school.schoolCode,
          profile.uid,
          request
        );
        admitted++;
        entries.push({
          line: row.line,
          name: `${v.firstName} ${v.lastName}`,
          ok: true,
          message: result.studentNumber,
        });
      } catch (err) {
        entries.push({
          line: row.line,
          name: `${v.firstName} ${v.lastName}`,
          ok: false,
          message:
            err instanceof Error ? err.message : "admission failed (connection?)",
        });
      }
      setLog([...entries]);
    }

    queryClient.invalidateQueries({ queryKey: ["registry", schoolCode] });
    queryClient.invalidateQueries({
      queryKey: ["count-active-students", schoolCode],
    });
    setImporting(false);
    setFinished(true);
  }

  if (access.readOnly) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold">Import Students</h1>
        <p className="mt-6 max-w-xl rounded-lg bg-amber-50 p-6 text-sm text-amber-800">
          The school is in read-only mode (lapsed subscription) — importing
          is paused until the subscription is renewed.
        </p>
      </div>
    );
  }

  const succeeded = log.filter((l) => l.ok).length;
  const failed = log.filter((l) => !l.ok).length;

  return (
    <div className="p-8">
      <Link to="/students/registry" className="text-sm text-blue-700 hover:underline">
        ← Student Registry
      </Link>
      <h1 className="mt-1 text-3xl font-bold">Import Students (CSV)</h1>
      <p className="mt-1 text-gray-600">
        {academicYear
          ? `Admitting into ${academicYear.name} — one real admission per row (numbers and Learner IDs are minted normally).`
          : "Select an academic year in the header bar first."}
      </p>

      <div className="mt-6 rounded-lg bg-white p-6 shadow">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={template}
            className="rounded border border-blue-700 px-4 py-2 text-sm text-blue-700 hover:bg-blue-50"
          >
            Download template CSV
          </button>
          <label className="rounded bg-blue-700 px-4 py-2 text-sm text-white hover:bg-blue-800">
            Choose CSV file...
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={onFile}
              disabled={!academicYearId || importing}
              className="hidden"
            />
          </label>
          <span className="text-xs text-gray-500">
            Columns: {HEADERS.join(", ")} · dates YYYY-MM-DD · no commas
            inside fields · stream is the code (e.g. A)
          </span>
        </div>
        {parseError && <p className="mt-3 text-sm text-red-600">{parseError}</p>}
      </div>

      {rows.length > 0 && (
        <div className="mt-6 rounded-lg bg-white shadow">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
            <p className="font-medium">
              {rows.length} row{rows.length === 1 ? "" : "s"} ·{" "}
              <span className="text-green-700">{validRows.length} ready</span>
              {rows.length - validRows.length > 0 && (
                <span className="text-red-600">
                  {" "}
                  · {rows.length - validRows.length} with errors (skipped)
                </span>
              )}
            </p>
            <button
              onClick={runImport}
              disabled={importing || validRows.length === 0 || !academicYearId}
              className="rounded bg-blue-700 px-5 py-2 text-sm text-white hover:bg-blue-800 disabled:opacity-50"
            >
              {importing
                ? `Importing... (${succeeded + failed}/${validRows.length})`
                : `Import ${validRows.length} students`}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-slate-50 text-gray-500">
                <tr>
                  <th className="p-2">Line</th>
                  <th className="p-2">Student</th>
                  <th className="p-2">Class</th>
                  <th className="p-2">Guardian</th>
                  <th className="p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const result = log.find((l) => l.line === r.line);
                  return (
                    <tr key={r.line} className="border-b">
                      <td className="p-2 text-gray-400">{r.line}</td>
                      <td className="p-2">
                        {r.values.firstName} {r.values.lastName}
                      </td>
                      <td className="p-2">
                        {r.values.form} {r.values.stream}
                      </td>
                      <td className="p-2 text-gray-500">
                        {r.values.guardianFirstName} {r.values.guardianLastName}
                      </td>
                      <td className="p-2 text-xs">
                        {r.errors.length > 0 ? (
                          <span className="text-red-600">
                            {r.errors.join("; ")}
                          </span>
                        ) : result ? (
                          result.ok ? (
                            <span className="text-green-700">
                              admitted · {result.message}
                            </span>
                          ) : (
                            <span className="text-red-600">{result.message}</span>
                          )
                        ) : (
                          <span className="text-gray-500">ready</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {finished && (
            <p className="border-t p-3 text-sm">
              Done: <span className="text-green-700">{succeeded} admitted</span>
              {failed > 0 && (
                <span className="text-red-600"> · {failed} failed</span>
              )}{" "}
              — failed rows can be corrected in the file and re-imported (only
              the failed ones; already-admitted students would be duplicated).
            </p>
          )}
        </div>
      )}
    </div>
  );
}
