export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-ud-surface-sunk text-ud-muted mb-4">
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7m16 0v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-5m16 0H4" />
        </svg>
      </div>
      <p className="text-[15px] font-semibold tracking-[-0.005em] text-ud-ink">{title}</p>
      {description && <p className="mt-2 max-w-xs text-sm leading-6 text-ud-muted">{description}</p>}
    </div>
  );
}
