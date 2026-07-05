import type { SubjectInput } from "./Subject";

export class SubjectValidator {
  static validate(
    input: { subjectCode: string; name: string },
    existingCodes: string[]
  ): string | null {
    const code = input.subjectCode.trim().toUpperCase();

    if (!code) return "Subject code is required.";
    if (!/^[A-Z0-9]{2,6}$/.test(code))
      return "Subject code must be 2-6 letters or digits.";
    if (existingCodes.map((c) => c.toUpperCase()).includes(code))
      return `Subject ${code} already exists.`;
    if (!input.name.trim()) return "Subject name is required.";

    return null;
  }
}

export type { SubjectInput };
