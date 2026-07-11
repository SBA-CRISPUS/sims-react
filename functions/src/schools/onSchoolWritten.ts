import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

/**
 * Mirrors each school's public identity (name, district, active) into
 * the top-level /directory collection. Schools cannot read each other's
 * documents (tenant isolation), but the transfer form needs to validate
 * a receiving school's code and show its name before sending - the
 * directory is that safe, signed-in-readable surface. Letterhead data
 * only; nothing sensitive.
 */
export const onSchoolWritten = onDocumentWritten(
  "schools/{schoolCode}",
  async (event) => {
    const after = event.data?.after;
    if (!after?.exists) return;
    const school = after.data() ?? {};
    await getFirestore()
      .doc(`directory/${event.params.schoolCode}`)
      .set({
        schoolCode: event.params.schoolCode,
        name: school.name ?? "",
        district: school.location?.district ?? "",
        province: school.location?.province ?? "",
        active: school.status === "active",
        updatedAt: FieldValue.serverTimestamp(),
      });
  }
);
