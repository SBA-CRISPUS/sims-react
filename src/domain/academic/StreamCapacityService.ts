import type { Stream } from "./Stream";

export class StreamCapacityService {
  static remaining(stream: Stream): number {
    return Math.max(0, stream.capacity - stream.occupiedCount);
  }

  static isFull(stream: Stream): boolean {
    return stream.occupiedCount >= stream.capacity;
  }
}
