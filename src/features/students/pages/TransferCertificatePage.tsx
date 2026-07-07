import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";

import { useAuth } from "../../auth/hooks/useAuth";
import { useSchool } from "../../schools/hooks/schoolQueries";
import { useOutgoingTransfers } from "../../transfers/hooks/transferQueries";
import { useStudent, useStudentEnrollments } from "../hooks/studentQueries";
import { fullName } from "../format";

/**
 * The official leaving document for a transferred learner - deliberately
 * SEPARATE from the academic transcript (mentor: schools need both). The
 * certificate covers identity, admission, leaving date and destination;
 * academic history stays on the transcript.
 *
 * Issued by the SENDING school once the transfer request is completed.
 */
export default function TransferCertificatePage() {
  const { studentNumber } = useParams<{ studentNumber: string }>();
  const { school: sessionSchool } = useAuth();
  const schoolCode = sessionSchool?.schoolCode;
  const schoolQ = useSchool(schoolCode);
  const school = schoolQ.data ?? sessionSchool; // fresh logo/details for print

  const studentQ = useStudent(schoolCode, studentNumber);
  const enrollments = useStudentEnrollments(schoolCode, studentNumber);
  const outgoing = useOutgoingTransfers(schoolCode);

  const transfer = useMemo(
    () =>
      (outgoing.data ?? [])
        .filter(
          (r) => r.studentNumber === studentNumber && r.status === "completed"
        )
        .sort(
          (a, b) =>
            (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0)
        )[0],
    [outgoing.data, studentNumber]
  );

  const sorted = useMemo(
    () =>
      [...(enrollments.data ?? [])].sort(
        (a, b) =>
          (a.admissionDate?.getTime() ?? 0) - (b.admissionDate?.getTime() ?? 0)
      ),
    [enrollments.data]
  );
  const firstEnrollment = sorted[0];
  const lastEnrollment = sorted[sorted.length - 1];

  const student = studentQ.data;
  if (studentQ.isLoading || outgoing.isLoading) {
    return <div className="p-8 text-gray-500">Loading certificate...</div>;
  }
  if (!student || !studentNumber) {
    return (
      <div className="p-8">
        <p className="text-red-600">Student not found.</p>
        <Link to="/students" className="text-blue-700 hover:underline">
          Back to Students
        </Link>
      </div>
    );
  }
  if (!transfer) {
    return (
      <div className="p-8">
        <p className="text-gray-700">
          No completed transfer is recorded for this learner — a transfer
          certificate can only be issued after a transfer completes.
        </p>
        <Link
          to={`/students/${studentNumber}`}
          className="text-blue-700 hover:underline"
        >
          ← Back to profile
        </Link>
      </div>
    );
  }

  const issued = new Date().toLocaleDateString();
  const leavingDate = transfer.completedAt
    ? transfer.completedAt.toLocaleDateString()
    : transfer.effectiveDate;

  return (
    <div className="p-8">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between print:hidden">
          <Link
            to={`/students/${studentNumber}`}
            className="text-sm text-blue-700 hover:underline"
          >
            ← Back to profile
          </Link>
          <button
            onClick={() => window.print()}
            className="rounded bg-blue-700 px-4 py-2 text-white hover:bg-blue-800"
          >
            Print / Save as PDF
          </button>
        </div>

        <div className="mt-4 rounded-lg border bg-white p-8 shadow print:border-0 print:shadow-none">
          {/* School header */}
          <div className="border-b pb-4 text-center">
            {school?.logoUrl && (
              <img
                src={school.logoUrl}
                alt=""
                className="mx-auto mb-2 h-16 w-16 object-contain"
              />
            )}
            <h1 className="text-2xl font-bold">{school?.name ?? "School"}</h1>
            <p className="text-sm text-gray-600">
              {[school?.location?.district, school?.location?.province]
                .filter(Boolean)
                .join(", ")}
              {school?.emisCode ? ` · EMIS ${school.emisCode}` : ""}
            </p>
            <p className="mt-2 text-lg font-semibold tracking-wide">
              TRANSFER CERTIFICATE
            </p>
            {transfer.transferNumber && (
              <p className="font-mono text-sm text-gray-600">
                {transfer.transferNumber}
              </p>
            )}
          </div>

          {/* Learner identity */}
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <Detail label="Learner" value={fullName(student)} />
            <Detail label="SIMS Learner ID" value={student.learnerId ?? "—"} />
            <Detail label="Student No." value={student.studentNumber} />
            <Detail label="Admission No." value={student.admissionId} />
            <Detail label="Gender" value={student.gender} />
            <Detail
              label="Date of Birth"
              value={
                student.dateOfBirth
                  ? student.dateOfBirth.toLocaleDateString()
                  : "—"
              }
            />
            <Detail label="Nationality" value={student.nationality} />
          </div>

          {/* Transfer particulars */}
          <h2 className="mb-2 mt-6 border-b pb-1 text-base font-semibold">
            Transfer particulars
          </h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Detail
              label="Admitted"
              value={
                firstEnrollment?.admissionDate
                  ? firstEnrollment.admissionDate.toLocaleDateString()
                  : "—"
              }
            />
            <Detail
              label="Last class attended"
              value={
                lastEnrollment
                  ? `${lastEnrollment.academicLevelCode}${
                      lastEnrollment.streamId
                        ? ` ${lastEnrollment.streamId}`
                        : ""
                    } (${lastEnrollment.academicYearId})`
                  : "—"
              }
            />
            <Detail label="Date of leaving" value={leavingDate} />
            <Detail label="Transferred to" value={transfer.toSchoolCode} />
            <Detail label="Reason" value={transfer.reason || "—"} />
          </div>

          <p className="mt-6 text-sm text-gray-700">
            This certifies that the learner named above was enrolled at this
            school and has been transferred to the receiving school indicated.
            The learner's academic record is issued separately on the Academic
            Transcript.
          </p>

          {/* Signature */}
          <div className="mt-10 flex items-end justify-between">
            <div>
              <div className="h-10 w-48 border-b border-gray-400" />
              <p className="mt-1 text-sm">Head Teacher signature &amp; stamp</p>
            </div>
            <p className="text-sm text-gray-600">Issued: {issued}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-gray-500">{label}: </span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
