'use client';

import Link from 'next/link';
import { materialQuoteProductLabel } from '@/lib/material-quote-request-display';
import type { MaterialQuoteRequestDto } from '@/lib/supplier-material-quote-requests-enrich';

type Props = {
  request: MaterialQuoteRequestDto;
  /** Supplier view: show who sent the request. */
  showContractorDetails?: boolean;
  quoteDetailHref?: string;
};

export function MaterialQuoteImportBanner({ request, showContractorDetails, quoteDetailHref }: Props) {
  const product = materialQuoteProductLabel(request.project);
  const jobAddress = request.project?.home_address?.trim();

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
      {showContractorDetails ? (
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Contractor request</p>
          <p className="font-semibold text-slate-900">{request.contractor.company_name}</p>
          {request.contractor.email ? (
            <p className="text-slate-600">Email: {request.contractor.email}</p>
          ) : null}
          {request.contractor.phone ? (
            <p className="text-slate-600">Phone: {request.contractor.phone}</p>
          ) : null}
        </div>
      ) : null}
      <dl className={`${showContractorDetails ? 'mt-3 border-t border-slate-200 pt-3' : ''} space-y-1.5`}>
        {jobAddress ? (
          <div>
            <dt className="text-xs font-medium text-slate-500">Job site</dt>
            <dd className="font-medium text-slate-900">{jobAddress}</dd>
          </div>
        ) : null}
        {product ? (
          <div>
            <dt className="text-xs font-medium text-slate-500">Product</dt>
            <dd className="font-medium text-slate-900">{product}</dd>
          </div>
        ) : null}
      </dl>
      {quoteDetailHref ? (
        <Link
          href={quoteDetailHref}
          className="mt-3 inline-block text-sm font-semibold text-indigo-700 hover:underline"
        >
          View full request →
        </Link>
      ) : null}
    </div>
  );
}
