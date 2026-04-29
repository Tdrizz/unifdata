export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
      <div className="max-w-3xl text-center space-y-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          FrontierOps
        </p>

        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-slate-950">
          One dashboard for your customers, jobs, sales, and follow-ups.
        </h1>

        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          FrontierOps helps local service businesses organize messy business
          data into one simple cloud dashboard.
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <a
            href="/dashboard"
            className="bg-slate-950 text-white px-5 py-3 rounded-xl font-medium hover:bg-slate-800"
          >
            View Demo
          </a>

          <a
            href="/login"
            className="bg-white border border-slate-200 px-5 py-3 rounded-xl font-medium hover:bg-slate-100"
          >
            Log In
          </a>
        </div>
      </div>
    </main>
  );
}
