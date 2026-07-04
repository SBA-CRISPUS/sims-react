import type { Stream } from "./Stream";

export class StreamCapacityService {
  static remaining(stream: Stream): number {
    return Math.max(0, stream.capacity - stream.current);
  }

  static isFull(stream: Stream): boolean {
    return stream.current >= stream.capacity;
  }

  /** Firestore path to a stream document. */
  static path(
    schoolCode: string,
    levelCode: string,
    streamCode: string
  ): string[] {
    return [
      "schools",
      schoolCode,
      "academicLevels",
      levelCode,
      "streams",
      streamCode,
    ];
  }
}
