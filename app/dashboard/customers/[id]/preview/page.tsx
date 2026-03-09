'use client';

import { useState, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

function PreviewContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = params.id as string;
  const quoteId = searchParams.get('quote_id');
  const pdfUrl = `/api/contractor/customers/${id}/quote-pdf?preview=1${quoteId ? `&quote_id=${quoteId}` : ''}`;
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = async () => {
    setIsSharing(true);
    try {
      const res = await fetch(pdfUrl);
      const blob = await res.blob();
      const file = new File([blob], 'Quote.pdf', { type: 'application/pdf' });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Quote PDF',
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Quote.pdf';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to open PDF options');
    } finally {
      setIsSharing(false);
    }
  };

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
        <button
          onClick={handleShare}
          disabled={isSharing}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {isSharing ? 'Loading...' : 'Share / Save PDF'}
        </button>
      </div>
      
      <div className="bg-blue-50 p-3 text-sm text-blue-800 border-b border-blue-100 md:hidden text-center">
        If the PDF is cut off or won't scroll, tap <strong>Share / Save PDF</strong> above to view it natively!
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

export default function QuotePreviewPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PreviewContent />
    </Suspense>
  );
}