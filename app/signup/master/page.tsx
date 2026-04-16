import Link from 'next/link';

export default function MasterSignupClosedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <Link href="/" className="mb-6 block rounded-xl bg-black p-1.5 w-fit transition-opacity hover:opacity-90">
        <img src="/quotemyfence-logo.png" alt="QuoteMyFence" className="h-10 w-auto" />
      </Link>
      <div className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-white p-8 shadow-xl">
        <h1 className="text-2xl font-bold tracking-tight">Master admin</h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
          New master admin accounts are not created through this page. The master console is limited to the existing
          admin account. If you need access, contact the team.
        </p>
        <p className="mt-6 text-center text-sm">
          <Link href="/login" className="font-semibold text-[var(--accent)] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
