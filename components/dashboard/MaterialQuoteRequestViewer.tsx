'use client';

import { LayoutDrawCanvas } from '@/components/LayoutDrawCanvas';
import { getLayoutDrawingFootage } from '@/lib/layout-drawing-footage';
import { lineHighlightModesFromDrawing, parseSavedLayoutDrawing } from '@/lib/layout-drawing-view';
import type { MaterialQuoteRequestDto } from '@/lib/supplier-material-quote-requests-enrich';
import dynamic from 'next/dynamic';

const FenceDrawingMap = dynamic(
  () => import('@/components/FenceDrawingMap').then((m) => ({ default: m.FenceDrawingMap })),
  { ssr: false, loading: () => <div className="min-h-[200px] animate-pulse rounded-lg border border-slate-200 bg-slate-50" /> }
);

type Props = {
  request: MaterialQuoteRequestDto;
  /** Tighter spacing when used beside the material calculator */
  compact?: boolean;
};

export function MaterialQuoteRequestViewer({ request: selectedRequest, compact }: Props) {
  const pad = compact ? 'p-3' : 'p-3';
  const gap = compact ? 'mt-3' : 'mt-4';
  const savedLayoutSketch = selectedRequest.project?.drawing_data
    ? parseSavedLayoutDrawing(selectedRequest.project.drawing_data)
    : null;
  const savedLayoutHighlights = selectedRequest.project?.drawing_data
    ? lineHighlightModesFromDrawing(selectedRequest.project.drawing_data)
    : undefined;
  const hasLayoutPlanView = !!savedLayoutSketch;
  const layoutFootage = selectedRequest.project?.drawing_data
    ? getLayoutDrawingFootage(selectedRequest.project.drawing_data)
    : null;
  const mapSegments = selectedRequest.project?.segments || [];
  const displayLineLengths =
    mapSegments.length > 0
      ? mapSegments.map((seg) => seg.length_ft)
      : layoutFootage?.line_lengths_ft ?? [];
  const displayTotalFt =
    selectedRequest.project?.total_length_ft != null && Number(selectedRequest.project.total_length_ft) > 0
      ? Number(selectedRequest.project.total_length_ft)
      : layoutFootage?.total_length_ft ?? 0;
  const displayGates =
    (selectedRequest.project?.gates?.length ?? 0) > 0
      ? selectedRequest.project?.gates || []
      : layoutFootage?.gates ?? [];

  return (
    <div className={compact ? 'text-sm' : ''}>
      {(selectedRequest.contractor.email || selectedRequest.contractor.phone) && (
        <div className={`rounded-lg border border-slate-200 bg-slate-50 ${pad} text-slate-700`}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Contractor details</p>
          {selectedRequest.contractor.email && <p className="mt-2">Email: {selectedRequest.contractor.email}</p>}
          {selectedRequest.contractor.phone && <p className="mt-1">Phone: {selectedRequest.contractor.phone}</p>}
        </div>
      )}

      {selectedRequest.project?.home_address ? (
        <div className={`${gap} rounded-lg border border-slate-200 bg-slate-50 ${pad} text-slate-700`}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Home address</p>
          <p className="mt-2 font-medium text-slate-900">{selectedRequest.project.home_address}</p>
        </div>
      ) : null}

      <div className={`${gap} grid gap-3 ${compact ? '' : 'md:grid-cols-2'}`}>
        <div className={`rounded-lg border border-slate-200 bg-slate-50 ${pad}`}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Fence information</p>
          <p className="mt-2 text-slate-800">
            Material selection: {selectedRequest.project?.design_summary || 'Not selected'}
          </p>
          <p className="mt-1 text-slate-800">
            Total footage: {displayTotalFt > 0 ? `${displayTotalFt.toFixed(1)} ft` : '—'}
          </p>
          {displayLineLengths.some((ft) => ft != null && Number(ft) > 0) && (
            <p className="mt-1 text-slate-800">
              Line lengths:{' '}
              {displayLineLengths
                .map((ft, i) =>
                  ft != null && Number(ft) > 0 ? `Line ${i + 1}: ${Number(ft).toFixed(1)} ft` : null
                )
                .filter(Boolean)
                .join(' · ')}
            </p>
          )}
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
            {hasLayoutPlanView ? 'Layout drawing (from Draw).' : 'The outline they drew on the map.'}
          </p>
          {hasLayoutPlanView && savedLayoutSketch ? (
            <div className="mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white">
              <LayoutDrawCanvas
                initialDrawing={savedLayoutSketch}
                lineHighlightModes={savedLayoutHighlights}
                readOnly
                fillParent={false}
              />
            </div>
          ) : null}
          {(selectedRequest.project?.segments?.length ?? 0) > 0 ? (
            <div className="mt-2">
              <p className="mb-2 font-medium text-slate-600">
                {hasLayoutPlanView ? 'Map view' : 'Fence outline'}
              </p>
              <FenceDrawingMap
                segments={selectedRequest.project?.segments || []}
                gates={selectedRequest.project?.gates || []}
                className="min-h-[220px]"
              />
            </div>
          ) : null}
          {(displayLineLengths.length > 0 || displayTotalFt > 0 || displayGates.length > 0) && (
            <div className="mt-3 space-y-2">
              {displayLineLengths.length > 0 && (
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-medium">Segment lengths:</span>
                  {displayLineLengths.map((ft, i) => (
                    <span key={i} className="text-slate-600">
                      Line {i + 1}: {ft != null && Number(ft) > 0 ? `${Number(ft).toFixed(1)} ft` : '—'}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-3">
                {displayTotalFt > 0 && (
                  <span>
                    <strong>Total length:</strong> {displayTotalFt.toFixed(1)} ft
                  </span>
                )}
                {selectedRequest.project?.has_removal && <span className="text-slate-600">Removal included</span>}
                {displayGates.length > 0 && (
                  <span>
                    <strong>Gates:</strong>{' '}
                    {displayGates.map((g) => `${g.quantity} ${g.gate_type}`).join(', ')}
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
