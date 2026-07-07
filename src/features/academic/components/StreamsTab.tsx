import { useState } from "react";

import { useAuth } from "../../auth/hooks/useAuth";
import {
  useLevels,
  useStreams,
  useCreateStream,
  useUpdateStream,
  useRenameStream,
} from "../hooks/streamQueries";
import type { Stream } from "../../../domain/academic/Stream";
import StreamCard from "./StreamCard";
import StreamForm from "./StreamForm";
import type { StreamFormValues } from "./StreamForm";

interface FormTarget {
  levelCode: string;
  levelName: string;
  stream?: Stream;
  existingCodes: string[];
}

export default function StreamsTab() {
  const { school, profile } = useAuth();
  const schoolCode = school?.schoolCode;
  const canManage = profile?.role === "school_admin";

  const levels = useLevels(schoolCode);
  const streams = useStreams(schoolCode);
  const createStream = useCreateStream(schoolCode ?? "");
  const updateStream = useUpdateStream(schoolCode ?? "");
  const renameStream = useRenameStream(schoolCode ?? "");

  const [form, setForm] = useState<FormTarget | null>(null);

  async function handleSubmit(values: StreamFormValues) {
    if (!form) return;
    if (form.stream) {
      const codeChanged =
        values.streamCode.trim().toUpperCase() !== form.stream.streamCode;
      if (codeChanged) {
        await renameStream.mutateAsync({
          streamId: form.stream.streamId,
          values: {
            streamCode: values.streamCode,
            name: values.name,
            capacity: values.capacity,
            active: values.active,
          },
        });
      } else {
        await updateStream.mutateAsync({
          streamId: form.stream.streamId,
          patch: {
            name: values.name,
            capacity: values.capacity,
            active: values.active,
          },
        });
      }
    } else {
      await createStream.mutateAsync({
        academicLevelCode: form.levelCode,
        streamCode: values.streamCode,
        name: values.name,
        capacity: values.capacity,
      });
    }
    setForm(null);
  }

  if (levels.isLoading || streams.isLoading) {
    return <p className="text-gray-500">Loading streams...</p>;
  }
  if (levels.isError || streams.isError) {
    return <p className="text-red-600">Failed to load streams.</p>;
  }

  const allStreams = streams.data ?? [];

  return (
    <div className="space-y-8">
      {(levels.data ?? []).map((level) => {
        const levelStreams = allStreams.filter(
          (s) => s.academicLevelCode === level.levelCode
        );
        const existingCodes = levelStreams.map((s) => s.streamCode);
        const isAddingHere =
          form?.levelCode === level.levelCode && !form.stream;

        return (
          <section key={level.levelCode}>
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-lg font-semibold">{level.name}</h3>
              {canManage && !isAddingHere && (
                <button
                  onClick={() =>
                    setForm({
                      levelCode: level.levelCode,
                      levelName: level.name,
                      existingCodes,
                    })
                  }
                  className="rounded bg-blue-700 px-3 py-1 text-sm text-white hover:bg-blue-800"
                >
                  + Add Stream
                </button>
              )}
            </div>

            {isAddingHere && (
              <div className="mt-4">
                <StreamForm
                  levelName={level.name}
                  existingCodes={existingCodes}
                  onCancel={() => setForm(null)}
                  onSubmit={handleSubmit}
                />
              </div>
            )}

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {levelStreams.length === 0 && !isAddingHere && (
                <p className="text-gray-500">No streams yet.</p>
              )}
              {levelStreams.map((stream) =>
                form?.stream?.streamId === stream.streamId ? (
                  <div
                    key={stream.streamId}
                    className="sm:col-span-2 lg:col-span-3"
                  >
                    <StreamForm
                      levelName={level.name}
                      existing={stream}
                      existingCodes={existingCodes}
                      onCancel={() => setForm(null)}
                      onSubmit={handleSubmit}
                    />
                  </div>
                ) : (
                  <StreamCard
                    key={stream.streamId}
                    stream={stream}
                    canManage={canManage}
                    onEdit={() =>
                      setForm({
                        levelCode: level.levelCode,
                        levelName: level.name,
                        stream,
                        existingCodes,
                      })
                    }
                  />
                )
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
