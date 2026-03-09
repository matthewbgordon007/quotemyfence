'use client';

import { useParams, useRouter } from 'next/navigation';

export default function QuotePreviewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  return (
    <div className="flex flex-col h-screen -m-4 md:-m-6">
      <div className="flex items-center gap-4 border-b border-[var(--line)] bg-white p-4">
        <button
          onClick={() => router.back()}
          className="rounded-lg border border-[var(--line)] bg-[var(--bg2)] px-4 py-2 text-sm font-medium transition hover:bg-[var(--line)]"
        >
          ← Back to customer
        </button>
        <h1 className="font-semibold">Quote Preview</h1>
      </div>
      <iframe
        src={`/api/contractor/customers/${id}/quote-pdf?preview=1`}
        className="flex-1 w-full bg-gray-100"
        title="Quote PDF"
      />
    </div>
  );
}