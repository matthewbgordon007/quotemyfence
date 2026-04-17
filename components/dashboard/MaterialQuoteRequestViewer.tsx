'use client';

import { LayoutDrawCanvas } from '@/components/LayoutDrawCanvas';
import type { MaterialQuoteRequestDto } from '@/lib/supplier-material-quote-requests-enrich';
import dynamic from 'next/dynamic';

const FenceDrawingMap = dynamic(
  () => import('@/components/FenceDrawingMap').then((m) => ({ default: m.FenceDrawingMap })),
  { ssr: false, loading: () => <div className="min-h-[200px] animate-pulse rounded-lg border border-slate-200 bg-slate-50" /> }
);

type Props = {
  request: MaterialQuoteRequestDto;
  /** Tighter spacing when used in the sheet-calculator side rail */
  compact?: boolean;
};

export function MaterialQuoteRequestViewer({ request: selectedRequest, compact }: Props) {
  const pad = compact ? 'p-3' : 'p-3';
  const gap = compact ? 'mt-3' : 'mt-4';

  return (
    <div className={compact ? 'text-sm' : ''}>
      {(selectedRequest.contractor.email || selectedRequest.contractor.phone) && (
        <div className={`rounded-lg border border-slate-200 bg-slate-50 ${pad} text-slate-700`}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Contractor details</p>
          {selectedRequest.contractor.email && <p className="mt-2">Email: {selectedRequest.contractor.email}</p>}
          {selectedRequest.contractor.phone && <p className="mt-1">Phone: {selectedRequest.contractor.phone}</p>}
        </div>
      )}

      <div className={`${gap} grid gap-3 ${compact ? '' : 'md:grid-cols-2'}`}>
        <div className={`rounded-lg border border-slate-200 bg-slate-50 ${pad}`}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Fence information</p>
          <p className="mt-2 text-slate-800">
            Material selection: {selectedRequest.project?.design_summary || 'Not selected'}
          </p>
          <p className="mt-1 text-slate-800">
            Total footage: {Math.round(Number(selectedRequest.project?.total_length_ft || 0))} ft
          </p>
          {selectedRequest.project?.has_removal ? <p className="mt-1 text-slate-600">Removal included</p> : null}
          <p className="mt-2 text-xs font-medium text-slate-500">
            Status: <span className="text-slate-800">{selectedRequest.status}</span>
          </p>
        </div>
        {selectedRequest.attachment_url && (
          <div className={`rounded-lg border border-slate-200 bg-slate-50 ${pad}`}>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Attachment</p>
            <a
              href={selectedRequest.attachment_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block font-semibold text-indigo-700 hover:underline"
            >
              {selectedRequest.attachment_name || 'Open file'}
            </a>
          </div>
        )}
      </div>

      <div className={`${gap} rounded-lg border border-slate-200 bg-slate-50 ${pad}`}>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Request notes</p>
        <p className="mt-2 text-slate-800">{selectedRequest.description}</p>
      </div>

      {((selectedRequest.project?.segments?.length ?? 0) > 0 || selectedRequest.project?.drawing_data) && (
        <div className={`${gap} rounded-lg border border-slate-200 bg-slate-50 ${pad}`}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Fence drawing</p>
          <p className="mt-1 text-slate-500">
            {selectedRequest.project?.image_data_url ? 'Layout drawing (from Draw).' : 'The outline they drew on the map.'}
          </p>
          {selectedRequest.project?.image_data_url ? (
            <div className="mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white">
              <img
                src={selectedRequest.project.image_data_url}
                alt="Customer layout"
                className="max-h-[min(360px,50vh)] w-full object-contain"
              />
            </div>
          ) : null}
          {(selectedRequest.project?.segments?.length ?? 0) > 0 ? (
            <div className="mt-2">
              <p className="mb-2 font-medium text-slate-600">
                {selectedRequest.project?.image_data_url ? 'Map view' : 'Fence outline'}
              </p>
              <FenceDrawingMap
                segments={selectedRequest.project?.segments || []}
                gates={selectedRequest.project?.gates || []}
                className="min-h-[220px]"
              />
            </div>
          ) : selectedRequest.project?.drawing_data ? (
            <div className="mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white">
              <LayoutDrawCanvas
                initialDrawing={{
                  points: selectedRequest.project.drawing_data.points ?? [],
                  segments: selectedRequest.project.drawing_data.segments ?? [],
                  gates: selectedRequest.project.drawing_data.gates ?? [],
                  total_length_ft:
                    (selectedRequest.project.drawing_data.total_length_ft ??
                      Number(selectedRequest.project.total_length_ft)) ||
                    0,
                }}
                readOnly
              />
            </div>
          ) : null}
          {((selectedRequest.project?.segments?.length ?? 0) > 0 || selectedRequest.project?.total_length_ft) && (
            <div className="mt-3 space-y-2">
              {(selectedRequest.project?.segments?.length ?? 0) > 0 && (
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-medium">Segment lengths:</span>
                  {(selectedRequest.project?.segments || []).map((seg, i) => (
                    <span key={i} className="text-slate-600">
                      Line {i + 1}: {seg.length_ft != null ? `${Number(seg.length_ft).toFixed(1)} ft` : '—'}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-3">
                <span>
                  <strong>Total length:</strong> {Number(selectedRequest.project?.total_length_ft || 0).toFixed(1)} ft
                </span>
                {selectedRequest.project?.has_removal && <span className="text-slate-600">Removal included</span>}
                {(selectedRequest.project?.gates?.length ?? 0) > 0 && (
                  <span>
                    <strong>Gates:</strong>{' '}
                    {(selectedRequest.project?.gates || []).map((g) => `${g.quantity} ${g.gate_type}`).join(', ')}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div className={`${gap} rounded-lg border border-slate-200 bg-slate-50 ${pad}`}>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Design choice</p>
        {selectedRequest.project?.design_summary ? (
          <>
            <p className="mt-2 font-medium text-slate-900">{selectedRequest.project.design_summary}</p>
            {selectedRequest.project.design_option && (
              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
                {selectedRequest.project.design_option.height_ft != null && (
                  <>
                    <dt className="text-slate-500">Height</dt>
                    <dd>{selectedRequest.project.design_option.height_ft} ft</dd>
                  </>
                )}
                {selectedRequest.project.design_option.type && (
                  <>
                    <dt className="text-slate-500">Material / type</dt>
                    <dd>{selectedRequest.project.design_option.type}</dd>
                  </>
                )}
                {selectedRequest.project.design_option.style && (
                  <>
                    <dt className="text-slate-500">Style</dt>
                    <dd>{selectedRequest.project.design_option.style}</dd>
                  </>
                )}
                {selectedRequest.project.design_option.colour && (
                  <>
                    <dt className="text-slate-500">Colour</dt>
                    <dd>{selectedRequest.project.design_option.colour}</dd>
                  </>
                )}
              </dl>
            )}
          </>
        ) : (
          <p className="mt-2 text-slate-600">No design selection saved.</p>
        )}
      </div>

      {selectedRequest.supplier_material_list && selectedRequest.supplier_material_list.length > 0 ? (
        <div className={`${gap} rounded-lg border border-slate-200 bg-white ${pad}`}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Final material list</p>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[320px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-3">Item</th>
                  <th className="py-2 pr-3">Qty</th>
                  <th className="py-2 pr-3">Unit</th>
                  <th className="py-2 pr-3">Unit $</th>
                  <th className="py-2">Line $</th>
                </tr>
              </thead>
              <tbody>
                {selectedRequest.supplier_material_list.map((row, i) => (
                  <tr key={i} className="border-b border-slate-100 text-slate-800">
                    <td className="py-2 pr-3">{row.description}</td>
                    <td className="py-2 pr-3 tabular-nums">{row.qty ?? '—'}</td>
                    <td className="py-2 pr-3">{row.unit ?? '—'}</td>
                    <td className="py-2 pr-3 tabular-nums">{row.unitPrice != null ? row.unitPrice : '—'}</td>
                    <td className="py-2 tabular-nums">{row.lineTotal != null ? row.lineTotal : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
