/**
 * The SCHOOL's own calculations over SBA scores - class averages, ranges,
 * learner averages and class positions. Pure functions (no Firebase).
 *
 * These are internal school analytics: ECZ still receives only raw marks
 * (and applies the 30%/40% weighting centrally); nothing here feeds the
 * export.
 */

export interface ClassStats {
  count: number;
  mean: number;
  min: number;
  max: number;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Mean/min/max over the scored learners of one class subject. */
export function classStats(scores: number[]): ClassStats | null {
  if (scores.length === 0) return null;
  const sum = scores.reduce((a, b) => a + b, 0);
  return {
    count: scores.length,
    mean: round1(sum / scores.length),
    min: Math.min(...scores),
    max: Math.max(...scores),
  };
}

/** A learner's overall average across their scored subjects. */
export function learnerAverage(scores: number[]): number | null {
  if (scores.length === 0) return null;
  return round1(scores.reduce((a, b) => a + b, 0) / scores.length);
}

/**
 * Class positions by average, standard competition ranking ("1224"):
 * equal averages share a position and the next rank is skipped.
 */
export function rankPositions(
  averages: Map<string, number>
): Map<string, number> {
  const sorted = [...averages.entries()].sort((a, b) => b[1] - a[1]);
  const positions = new Map<string, number>();
  sorted.forEach(([id, avg], i) => {
    if (i > 0 && avg === sorted[i - 1][1]) {
      positions.set(id, positions.get(sorted[i - 1][0])!);
    } else {
      positions.set(id, i + 1);
    }
  });
  return positions;
}
