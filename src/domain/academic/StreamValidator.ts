/**
 * Validates a stream. Returns an error message, or null when valid.
 * `existingCodes` are the stream codes already defined for the SAME
 * academic level.
 */
export class StreamValidator {
  static validateCapacity(capacity: number, minOccupied = 0): string | null {
    if (!Number.isInteger(capacity) || capacity <= 0)
      return "Capacity must be a positive whole number.";
    if (capacity > 300) return "Capacity looks too large.";
    if (capacity < minOccupied)
      return `Capacity cannot be below the current enrollment (${minOccupied}).`;
    return null;
  }

  static validate(
    input: { streamCode: string; capacity: number },
    existingCodes: string[]
  ): string | null {
    const code = input.streamCode.trim().toUpperCase();

    if (!code) return "Stream code is required.";
    if (!/^[A-Z0-9]{1,4}$/.test(code))
      return "Stream code must be 1-4 letters or digits.";
    if (existingCodes.map((c) => c.toUpperCase()).includes(code))
      return `Stream ${code} already exists for this level.`;

    return this.validateCapacity(input.capacity);
  }
}
