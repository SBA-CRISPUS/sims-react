interface Props {
  title: string;
  items: { key: string; count: number }[];
}

/**
 * Magnitude-by-category: a single-series horizontal bar per category.
 * One hue (magnitude, not identity), each bar direct-labeled with its
 * count so the value never rests on colour alone.
 */
export default function CountBars({ title, items }: Props) {
  const max = Math.max(1, ...items.map((i) => i.count));

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <h2 className="text-lg font-semibold">{title}</h2>

      {items.length === 0 ? (
        <p className="mt-3 text-gray-500">No data yet.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((item) => (
            <li key={item.key} className="flex items-center gap-3">
              <span className="w-16 shrink-0 text-sm text-gray-600">
                {item.key}
              </span>
              <div className="h-5 flex-1 rounded bg-slate-100">
                <div
                  className="h-5 rounded bg-blue-700"
                  style={{ width: `${(item.count / max) * 100}%` }}
                />
              </div>
              <span className="w-8 shrink-0 text-right text-sm font-medium">
                {item.count}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
