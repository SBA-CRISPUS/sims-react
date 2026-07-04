import { doc, runTransaction } from "firebase/firestore";
import { db } from "../../../firebase";

export class SchoolCodeGenerator {
  static async generate(): Promise<string> {
    const counterRef = doc(db, "system", "counters");

    const schoolCode = await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);

      if (!counterDoc.exists()) {
        throw new Error("System counter document does not exist.");
      }

      const data = counterDoc.data();

      const nextNumber = data.nextSchoolNumber as number;

      const code = `SCH-${nextNumber
        .toString()
        .padStart(6, "0")}`;

      transaction.update(counterRef, {
        nextSchoolNumber: nextNumber + 1,
      });

      return code;
    });

    return schoolCode;
  }
}