export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex items-center gap-3">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-ud-surface-sunk border-t-ud-accent" />
        <p className="text-[13px] text-ud-faint">Loading…</p>
      </div>
    </div>
  );
}
