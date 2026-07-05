import type { TeachingAssignment } from "./TeachingAssignment";

export interface TeacherWorkload {
  periodsAssigned: number;
  subjectsAssigned: number;
  streamsAssigned: number;
  classTeacher: boolean;
  workloadPercentage: number;
}

// A nominal full weekly teaching load for secondary school, used to
// express workload as a percentage. Heuristic, not a hard cap.
const FULL_LOAD_PERIODS = 40;

export class TeachingLoadService {
  static compute(assignments: TeachingAssignment[]): TeacherWorkload {
    const active = assignments.filter((a) => a.active);
    const periods = active.reduce((sum, a) => sum + (a.periodsPerWeek || 0), 0);
    return {
      periodsAssigned: periods,
      subjectsAssigned: new Set(active.map((a) => a.subjectId)).size,
      streamsAssigned: new Set(active.map((a) => a.streamId)).size,
      classTeacher: active.some((a) => a.classTeacher),
      workloadPercentage: Math.round((periods / FULL_LOAD_PERIODS) * 100),
    };
  }
}
