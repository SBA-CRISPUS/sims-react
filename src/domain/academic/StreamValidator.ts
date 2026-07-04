import type { StreamInput } from "./Stream";

/**
 * Validates a stream. Returns an error message, or null when valid.
 */
export class StreamValidator {
  static validateCapacity(capacity: number, minCurrent = 0): string | null {
    if (!Number.isInteger(capacity) || capacity <= 0)
      return "Capacity must be a positive whole number.";
    if (capacity < minCurrent)
      return `Capacity cannot be below the current enrollment (${minCurrent}).`;
    return null;
  }

  static validate(
    input: StreamInput,
    existingCodes: string[]
  ): string | null {
    const code = input.streamCode.trim().toUpperCase();

    if (!code) return "Stream code is required.";
    if (!/^[A-Z0-9]{1,4}$/.test(code))
      return "Stream code must be 1-4 letters or digits.";
    if (existingCodes.includes(code))
      return `Stream ${code} already exists for this level.`;

    return this.validateCapacity(input.capacity);
  }
}
