const styles: Record<string, string> = {
  upcoming: "bg-orange-100 text-orange-700",
  completed: "bg-pink-100 text-deep-pink",
  cancelled: "bg-red-100 text-red-600",
  pending: "bg-gray-100 text-gray-600",
  CONFIRMED: "bg-pink-100 text-deep-pink",
};

export function StatusBadge({ status }: { status: string }) {
  const key = status.toLowerCase();
  const label = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${
        styles[key] ?? styles[status] ?? "bg-gray-100 text-gray-600"
      }`}
    >
      {label}
    </span>
  );
}
