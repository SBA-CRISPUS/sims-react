export default function PlaceholderTab({ label }: { label: string }) {
  return (
    <p className="text-gray-500">
      The {label} module is not built yet. This tab will populate once that
      module ships.
    </p>
  );
}
