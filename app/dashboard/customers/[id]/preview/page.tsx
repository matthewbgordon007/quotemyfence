'use client';

import { useParams, useRouter } from 'next/navigation';

export default function QuotePreviewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const pdfUrl = `/api/contractor/customers/${id}/quote-pdf?preview=1`;

  return (
    <div className="flex flex-col h-screen -m-4 md:-m-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--line)] bg-white p-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="rounded-lg border border-[var(--line)] bg-[var(--bg2)] px-4 py-2 text-sm font-medium transition hover:bg-[var(--line)]"
          >
            ← Back to customer
          </button>
          <h1 className="font-semibold">Quote Preview</h1>
        </div>
        <a
          href={pdfUrl}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          Open Full Screen
        </a>
      </div>
      
      <div className="bg-blue-50 p-3 text-sm text-blue-800 border-b border-blue-100 md:hidden text-center">
        If the PDF is cut off or won't scroll, tap <strong>Open Full Screen</strong> above.
      </div>

      <div className="flex-1 w-full bg-gray-100 overflow-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
        <object
          data={pdfUrl}
          type="application/pdf"
          className="w-full h-full min-h-[1200px]"
        >
          <iframe
            src={pdfUrl}
            className="w-full h-full min-h-[1200px] border-none"
            title="Quote PDF"
          />
        </object>
      </div>
    </div>
  );
}