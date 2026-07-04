/**
 * A real class stream (e.g. Form 1 / Stream A). Stored FLAT under
 * schools/{code}/streams keyed by `${academicLevelCode}-${streamCode}`
 * (e.g. "F1-A"), which keeps "all streams" / "streams in a level" a
 * single query and gives teaching assignments a stable id to reference.
 *
 * occupiedCount is maintained by the onEnrollmentWritten Cloud Function
 * (Admin SDK), never by clients; capacity bounds it. classTeacherId is
 * seeded null and assigned once Teacher Management exists.
 */
export interface Stream {
  streamId: string;
  academicLevelCode: string;
  streamCode: string;
  name: string;
  capacity: number;
  occupiedCount: number;
  classTeacherId: string | null;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface StreamInput {
  academicLevelCode: string;
  streamCode: string;
  name: string;
  capacity: number;
}

export function streamId(
  academicLevelCode: string,
  streamCode: string
): string {
  return `${academicLevelCode}-${streamCode.toUpperCase()}`;
}
