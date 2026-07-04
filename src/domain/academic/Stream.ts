/**
 * A real class stream under an academic level (e.g. Form 1 / Stream A).
 * Replaces the free-text stream string carried on enrollments.
 *
 * `current` is a transactional occupancy counter maintained by the
 * admission flow; `capacity` bounds it. `classTeacherId` is seeded null
 * and assigned once Teacher Management exists.
 */
export interface Stream {
  streamCode: string;
  name: string;
  capacity: number;
  current: number;
  classTeacherId: string | null;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface StreamInput {
  streamCode: string;
  name: string;
  capacity: number;
}
