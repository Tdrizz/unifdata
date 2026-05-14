export default function Loading() {
  return (
    <div className="min-h-screen bg-[#eef2f7]">
      <div className="flex min-h-screen">
        <aside className="hidden w-76 shrink-0 bg-slate-900 md:block" />
        <main className="flex-1 p-6 space-y-5">
          <div className="h-10 w-64 rounded-2xl bg-slate-200 animate-pulse" />
          <div className="h-64 rounded-3xl bg-slate-200 animate-pulse" />
          <div className="h-96 rounded-3xl bg-slate-200 animate-pulse" />
        </main>
      </div>
    </div>
  );
}
