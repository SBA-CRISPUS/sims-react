import { SBA_LEVELS } from "./SbaPlan";
import type { SbaPlanInput } from "./SbaPlan";

export class SbaValidator {
  static validate(input: SbaPlanInput): string | null {
    if (!input.academicLevelCode) return "Select a form.";
    if (!(SBA_LEVELS as readonly string[]).includes(input.academicLevelCode))
      return "SBA plans are only for Form 2 and Form 3.";
    if (!input.subjectId) return "Select a subject.";
    if (!input.tasks.length) return "Add at least one task.";

    const ids = new Set<string>();
    for (const t of input.tasks) {
      if (!t.taskId) return "Every task needs an id.";
      if (ids.has(t.taskId)) return `Duplicate task id "${t.taskId}".`;
      ids.add(t.taskId);
      if (!t.name.trim()) return "Every task needs a name.";
      if (!Number.isInteger(t.maxMarks) || t.maxMarks <= 0)
        return `Task "${t.name.trim() || t.taskId}" needs a whole max mark greater than 0.`;
    }

    return null;
  }
}
