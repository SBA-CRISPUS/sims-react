import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import { useAuth } from "../../auth/hooks/useAuth";
import {
  useStudent,
  useSetWithdrawn,
  useUndoManualTransfer,
} from "../hooks/studentQueries";
import { fullName } from "../format";

import ProfileTab from "../components/tabs/ProfileTab";
import EnrollmentTab from "../components/tabs/EnrollmentTab";
import GuardiansTab from "../components/tabs/GuardiansTab";
import TimelineTab from "../components/tabs/TimelineTab";
import AuditTab from "../components/tabs/AuditTab";
import DocumentsTab from "../components/tabs/DocumentsTab";
import SbaTab from "../components/tabs/SbaTab";
import PlaceholderTab from "../components/tabs/PlaceholderTab";
import TransferInitiateForm from "../../transfers/components/TransferInitiateForm";
import PlacementPanel from "../components/PlacementPanel";
import StudentEditForm from "../components/StudentEditForm";

const TABS = [
  "Profile",
  "Enrollment",
  "Guardians",
  "Timeline",
  "Attendance",
  "SBA",
  "Reports",
  "Documents",
  "Audit",
] as const;

type Tab = (typeof TABS)[number];

export default function StudentProfilePage() {
  const { studentNumber } = useParams<{ studentNumber: string }>();
  const { school, profile } = useAuth();
  const schoolCode = school?.schoolCode;
  const canTransfer = ["school_admin", "head_teacher"].includes(
    profile?.role ?? ""
  );

  const { data: student, isLoading, isError } = useStudent(
    schoolCode,
    studentNumber
  );

  const [tab, setTab] = useState<Tab>("Profile");
  const [showTransfer, setShowTransfer] = useState(false);
  const [editing, setEditing] = useState(false);
  const setWithdrawn = useSetWithdrawn(schoolCode, studentNumber);
  const undoManualTransfer = useUndoManualTransfer(schoolCode, studentNumber);

  if (isLoading) {
    return <div className="p-8 text-gray-500">Loading student...</div>;
  }

  if (isError || !student || !schoolCode || !studentNumber) {
    return (
      <div className="p-8">
        <p className="text-red-600">Student not found.</p>
        <Link to="/students" className="text-blue-700 hover:underline">
          Back to Students
        </Link>
      </div>
    );
  }

  const tabProps = { schoolCode, studentNumber, student };

  return (
    <div className="p-8">
      <Link to="/students" className="text-sm text-blue-700 hover:underline">
        ← Back to Students
      </Link>

      <div className="mt-3 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{fullName(student)}</h1>
          <p className="mt-1 font-mono text-gray-600">
            {student.studentNumber} · {student.admissionId}
          </p>
          {student.learnerId && (
            <p className="mt-1 font-mono text-sm text-blue-700">
              SIMS Learner ID: {student.learnerId}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded bg-slate-100 px-3 py-1 text-sm capitalize">
            {student.status}
          </span>
          <Link
            to={`/students/${studentNumber}/report-card`}
            className="rounded border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50"
          >
            Report card
          </Link>
          <Link
            to={`/students/${studentNumber}/transcript`}
            className="rounded border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50"
          >
            Transcript
          </Link>
          {student.status === "transferred" && canTransfer && (
            <>
              <Link
                to={`/students/${studentNumber}/transfer-letter`}
                className="rounded border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50"
              >
                Transfer letter
              </Link>
              <Link
                to={`/students/${studentNumber}/transfer-certificate`}
                className="rounded border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50"
              >
                Transfer certificate
              </Link>
              {student.transferredTo?.manual && (
                <button
                  onClick={() => {
                    if (
                      window.confirm(
                        `Undo this manual transfer for ${fullName(student)}? They return to "active" and rejoin their class rosters. Only do this if the transfer was recorded in error.`
                      )
                    )
                      undoManualTransfer.mutate();
                  }}
                  disabled={undoManualTransfer.isPending}
                  className="rounded border border-red-300 px-3 py-1 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  {undoManualTransfer.isPending ? "Undoing..." : "Undo transfer"}
                </button>
              )}
            </>
          )}
          {canTransfer && student.status === "active" && (
            <button
              onClick={() => setShowTransfer((v) => !v)}
              className="rounded border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50"
            >
              Transfer out
            </button>
          )}
          {canTransfer && (
            <button
              onClick={() => setEditing((v) => !v)}
              className="rounded border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50"
            >
              {editing ? "Close edit" : "Edit details"}
            </button>
          )}
          {canTransfer &&
            ["active", "withdrawn"].includes(student.status) && (
              <button
                onClick={() => {
                  const withdrawing = student.status === "active";
                  if (
                    window.confirm(
                      withdrawing
                        ? `Withdraw ${fullName(student)}? They leave rosters and score sheets, but the full record and history stay — this can be reversed.`
                        : `Reactivate ${fullName(student)}? They rejoin their class rosters.`
                    )
                  )
                    setWithdrawn.mutate(withdrawing);
                }}
                disabled={setWithdrawn.isPending}
                className={`rounded border px-3 py-1 text-sm disabled:opacity-50 ${
                  student.status === "active"
                    ? "border-red-300 text-red-700 hover:bg-red-50"
                    : "border-green-400 text-green-700 hover:bg-green-50"
                }`}
              >
                {setWithdrawn.isPending
                  ? "Saving..."
                  : student.status === "active"
                    ? "Withdraw"
                    : "Reactivate"}
              </button>
            )}
        </div>
      </div>

      {editing && (
        <StudentEditForm
          schoolCode={schoolCode}
          student={student}
          onDone={() => setEditing(false)}
        />
      )}

      {showTransfer && schoolCode && profile && (
        <TransferInitiateForm
          schoolCode={schoolCode}
          schoolName={school?.name ?? schoolCode}
          actorUid={profile.uid}
          studentNumber={student.studentNumber}
          learnerId={student.learnerId}
          studentName={fullName(student)}
          onDone={() => setShowTransfer(false)}
        />
      )}

      <PlacementPanel schoolCode={schoolCode} studentNumber={studentNumber} />

      <div className="mt-6 flex gap-1 overflow-x-auto border-b">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`whitespace-nowrap px-4 py-2 text-sm ${
              tab === t
                ? "border-b-2 border-blue-700 font-medium text-blue-700"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-6 rounded-lg bg-white p-6 shadow">
        {tab === "Profile" && <ProfileTab {...tabProps} />}
        {tab === "Enrollment" && <EnrollmentTab {...tabProps} />}
        {tab === "Guardians" && <GuardiansTab {...tabProps} />}
        {tab === "Timeline" && <TimelineTab {...tabProps} />}
        {tab === "Audit" && <AuditTab {...tabProps} />}
        {tab === "Attendance" && <PlaceholderTab label="Attendance" />}
        {tab === "SBA" && (
          <SbaTab schoolCode={schoolCode} studentNumber={studentNumber} />
        )}
        {tab === "Reports" && <PlaceholderTab label="Reports" />}
        {tab === "Documents" && <DocumentsTab {...tabProps} />}
      </div>
    </div>
  );
}
