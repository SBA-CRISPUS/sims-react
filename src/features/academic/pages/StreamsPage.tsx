import { useState } from "react";

import { useAuth } from "../../auth/hooks/useAuth";
import {
  useAcademicStructure,
  useCreateStream,
  useUpdateStream,
} from "../hooks/streamQueries";
import type { Stream } from "../../../domain/academic/Stream";
import StreamCard from "../components/StreamCard";
import StreamForm from "../components/StreamForm";
import type { StreamFormValues } from "../components/StreamForm";

interface FormTarget {
  levelCode: string;
  levelName: string;
  stream?: Stream;
  existingCodes: string[];
}

export default function StreamsPage() {
  const { school, profile } = useAuth();
  const schoolCode = school?.schoolCode;
  const canManage = profile?.role === "school_admin";

  const { data, isLoading, isError } = useAcademicStructure(schoolCode);
  const createStream = useCreateStream(schoolCode ?? "");
  const updateStream = useUpdateStream(schoolCode ?? "");

  const [form, setForm] = useState<FormTarget | null>(null);

  async function handleSubmit(values: StreamFormValues) {
    if (!form) return;
    if (form.stream) {
      await updateStream.mutateAsync({
        levelCode: form.levelCode,
        streamCode: form.stream.streamCode,
        patch: {
          name: values.name,
          capacity: values.capacity,
          active: values.active,
        },
      });
    } else {
      await createStream.mutateAsync({
        levelCode: form.levelCode,
        stream: {
          streamCode: values.streamCode,
          name: values.name,
          capacity: values.capacity,
        },
      });
    }
    setForm(null);
  }

  return (
    <div className="p-8">
      <div>
        <h1 className="text-3xl font-bold">Streams</h1>
        {school && <p className="mt-1 text-gray-600">{school.name}</p>}
      </div>

      {isLoading && <p className="mt-6 text-gray-500">Loading streams...</p>}
      {isError && (
        <p className="mt-6 text-red-600">Failed to load academic structure.</p>
      )}

      {!isLoading && !isError && (data ?? []).length === 0 && (
        <p className="mt-6 text-gray-500">
          No academic levels found for this school.
        </p>
      )}

      <div className="mt-6 space-y-8">
        {(data ?? []).map(({ level, streams }) => {
          const existingCodes = streams.map((s) => s.streamCode);
          const isAddingHere =
            form?.levelCode === level.levelCode && !form.stream;

          return (
            <section key={level.levelCode}>
              <div className="flex items-center justify-between border-b pb-2">
                <h2 className="text-xl font-semibold">{level.name}</h2>
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
                {streams.length === 0 && !isAddingHere && (
                  <p className="text-gray-500">No streams yet.</p>
                )}
                {streams.map((stream) =>
                  form?.levelCode === level.levelCode &&
                  form.stream?.streamCode === stream.streamCode ? (
                    <div key={stream.streamCode} className="sm:col-span-2 lg:col-span-3">
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
                      key={stream.streamCode}
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
    </div>
  );
}
