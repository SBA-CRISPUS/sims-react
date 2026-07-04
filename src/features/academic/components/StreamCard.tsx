import { StreamCapacityService } from "../../../domain/academic/StreamCapacityService";
import type { Stream } from "../../../domain/academic/Stream";

interface Props {
  stream: Stream;
  canManage: boolean;
  onEdit: () => void;
}

export default function StreamCard({ stream, canManage, onEdit }: Props) {
  const remaining = StreamCapacityService.remaining(stream);
  const full = StreamCapacityService.isFull(stream);
  const pct =
    stream.capacity > 0 ? (stream.occupiedCount / stream.capacity) * 100 : 0;

  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold">{stream.name}</span>
          {!stream.active && (
            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
              inactive
            </span>
          )}
          {full && stream.active && (
            <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-700">
              Full
            </span>
          )}
        </div>
        {canManage && (
          <button
            onClick={onEdit}
            className="text-sm text-blue-700 hover:underline"
          >
            Edit
          </button>
        )}
      </div>

      <div className="mt-3">
        <div className="flex justify-between text-sm text-gray-600">
          <span>
            {stream.occupiedCount}/{stream.capacity}
          </span>
          <span>{remaining} left</span>
        </div>
        <div className="mt-1 h-2 rounded bg-slate-100">
          <div
            className={`h-2 rounded ${full ? "bg-red-500" : "bg-blue-700"}`}
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>
      </div>

      <p className="mt-3 text-sm text-gray-500">
        Class Teacher:{" "}
        {stream.classTeacherId ?? <span className="italic">unassigned</span>}
      </p>
    </div>
  );
}
