import { doc, serverTimestamp, updateDoc } from "firebase/firestore";

import { db } from "../../firebase";

/**
 * Assigns or clears a stream's class teacher.
 *
 * The mechanism lives here now, but the allocation UI (picking a real
 * teacher) waits for Teacher Management in Sprint 5 - until then
 * classTeacherId stays null and this is only wired to a teacher picker
 * once teacher records exist. No teacher-existence validation yet.
 */
export class ClassTeacherAllocationService {
  static async assign(
    schoolCode: string,
    levelCode: string,
    streamCode: string,
    teacherId: string | null
  ): Promise<void> {
    await updateDoc(
      doc(
        db,
        "schools",
        schoolCode,
        "academicLevels",
        levelCode,
        "streams",
        streamCode
      ),
      {
        classTeacherId: teacherId,
        updatedAt: serverTimestamp(),
      }
    );
  }
}
