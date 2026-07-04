import { useEffect, useRef } from "react";
import { useFormContext, useWatch } from "react-hook-form";

import { useAuth } from "../../auth/hooks/useAuth";
import { useLevels, useStreams } from "../../academic/hooks/streamQueries";
import { StreamCapacityService } from "../../../domain/academic/StreamCapacityService";

import type { AdmissionFormValues } from "./AdmissionFormValues";

// Fallback if academic levels haven't loaded (they are provisioned per school).
const FALLBACK_LEVELS = [
  { levelCode: "F1", name: "Form 1" },
  { levelCode: "F2", name: "Form 2" },
  { levelCode: "F3", name: "Form 3" },
  { levelCode: "F4", name: "Form 4" },
];

export default function PlacementStep() {
  const {
    register,
    setValue,
    formState: { errors },
  } = useFormContext<AdmissionFormValues>();
  const { school } = useAuth();
  const schoolCode = school?.schoolCode;

  const levels = useLevels(schoolCode);
  const streams = useStreams(schoolCode);

  const selectedLevel = useWatch<AdmissionFormValues>({
    name: "enrollment.academicLevelCode",
  }) as string;

  // Clear a now-invalid stream when the level actually changes (a stale
  // streamId from another level would otherwise submit silently). The
  // ref avoids clearing on mount / when revisiting the step.
  const prevLevel = useRef(selectedLevel);
  useEffect(() => {
    if (prevLevel.current !== selectedLevel) {
      setValue("enrollment.streamId", "", { shouldValidate: false });
      prevLevel.current = selectedLevel;
    }
  }, [selectedLevel, setValue]);

  const levelOptions =
    levels.data && levels.data.length > 0 ? levels.data : FALLBACK_LEVELS;

  const levelStreams = (streams.data ?? []).filter(
    (s) => s.academicLevelCode === selectedLevel && s.active
  );
  const hasStreams = levelStreams.length > 0;

  return (
    <div className="space-y-5">
      <div>
        <label className="block font-medium">Academic Year</label>
        <input
          {...register("enrollment.academicYearId", {
            required: "Academic year is required",
          })}
          className="w-full border rounded p-2"
        />
        {errors.enrollment?.academicYearId && (
          <p className="mt-1 text-sm text-red-600">
            {errors.enrollment.academicYearId.message}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block font-medium">Academic Level</label>
          <select
            {...register("enrollment.academicLevelCode")}
            className="w-full border rounded p-2"
          >
            {levelOptions.map((level) => (
              <option key={level.levelCode} value={level.levelCode}>
                {level.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-medium">Stream</label>
          {hasStreams ? (
            <select
              {...register("enrollment.streamId", {
                required: "Stream is required",
              })}
              className="w-full border rounded p-2"
            >
              <option value="">Select a stream...</option>
              {levelStreams.map((s) => {
                const remaining = StreamCapacityService.remaining(s);
                const full = StreamCapacityService.isFull(s);
                return (
                  <option key={s.streamId} value={s.streamCode} disabled={full}>
                    {s.name} ({s.occupiedCount}/{s.capacity}
                    {full ? " — full" : ` — ${remaining} left`})
                  </option>
                );
              })}
            </select>
          ) : (
            <input
              {...register("enrollment.streamId", {
                required: "Stream is required",
              })}
              placeholder="e.g. A"
              className="w-full border rounded p-2"
            />
          )}
          {errors.enrollment?.streamId && (
            <p className="mt-1 text-sm text-red-600">
              {errors.enrollment.streamId.message}
            </p>
          )}
          {!hasStreams && (
            <p className="mt-1 text-xs text-gray-500">
              No streams defined for this level yet — define them in Academic
              Structure to enforce capacity.
            </p>
          )}
        </div>
      </div>

      <div>
        <label className="block font-medium">Admission Date</label>
        <input
          type="date"
          {...register("enrollment.admissionDate", {
            required: "Admission date is required",
          })}
          className="w-full border rounded p-2"
        />
        {errors.enrollment?.admissionDate && (
          <p className="mt-1 text-sm text-red-600">
            {errors.enrollment.admissionDate.message}
          </p>
        )}
      </div>
    </div>
  );
}
