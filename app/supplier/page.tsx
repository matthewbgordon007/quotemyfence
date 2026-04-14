import Link from 'next/link';

export default function SupplierLandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-14 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-12">
          <p className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-700">
            Supplier Portal
          </p>
          <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Supplier account access
          </h1>
          <p className="mt-3 max-w-2xl text-base text-slate-600">
            Sign in to your supplier dashboard or create a new supplier account. Supplier accounts include contractor
            tools plus dedicated supplier pages.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">Contractor Quotes</p>
              <p className="mt-1 text-sm text-slate-600">Track and respond to contractor quote requests in one place.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">Contractor Management</p>
              <p className="mt-1 text-sm text-slate-600">Manage contractor relationships, status, and account details.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">Material Calculator</p>
              <p className="mt-1 text-sm text-slate-600">Build material estimates quickly for incoming contractor jobs.</p>
            </div>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <Link
              href="/supplier/login"
              className="inline-flex min-h-[50px] items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
            >
              Supplier login
            </Link>
            <Link
              href="/supplier/signup"
              className="inline-flex min-h-[50px] items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              Supplier signup
            </Link>
          </div>

          <div className="mt-8 border-t border-slate-200 pt-6 text-sm text-slate-600">
            Looking for contractor access?{' '}
            <Link href="/login" className="font-semibold text-blue-700 hover:underline">
              Contractor login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
