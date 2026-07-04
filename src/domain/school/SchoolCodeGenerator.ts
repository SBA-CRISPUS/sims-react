export class SchoolCodeGenerator {

  static async generate(): Promise<string> {

    /**
     * Temporary implementation.
     *
     * Later this will read a Firestore counter.
     */

    const random = Math.floor(Math.random() * 999999);

    return `SCH-${random.toString().padStart(6, "0")}`;
  }

}