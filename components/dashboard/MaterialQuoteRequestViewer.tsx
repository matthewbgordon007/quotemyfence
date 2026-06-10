'use client';

import { LayoutDrawCanvas } from '@/components/LayoutDrawCanvas';
import { getLayoutDrawingFootage } from '@/lib/layout-drawing-footage';
import { lineHighlightModesFromDrawing, parseSavedLayoutDrawing } from '@/lib/layout-drawing-view';
import {
  materialQuoteProductLabel,
  materialQuoteUserNotes,
} from '@/lib/material-quote-request-display';
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
  const displayTotalFt =
    selectedRequest.project?.total_length_ft != null && Number(selectedRequest.project.total_length_ft) > 0
      ? Number(selectedRequest.project.total_length_ft)
      : layoutFootage?.total_length_ft ?? 0;
  const displayGates =
    (selectedRequest.project?.gates?.length ?? 0) > 0
      ? selectedRequest.project?.gates || []
      : layoutFootage?.gates ?? [];
  const hasFenceDrawing =
    hasLayoutPlanView ||
    !!selectedRequest.project?.image_data_url ||
    (selectedRequest.project?.segments?.length ?? 0) > 0;

  const productLabel = materialQuoteProductLabel(selectedRequest.project);
  const userNotes = materialQuoteUserNotes(
    selectedRequest.description,
    selectedRequest.project?.home_address
  );

  const layoutDrawingBlock = hasFenceDrawing ? (
    <div className={`${gap} rounded-lg border border-slate-200 bg-slate-50 ${pad}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Layout drawing</p>
      <p className="mt-1 text-slate-500">
        {hasLayoutPlanView
          ? 'Fence sketch with labeled line lengths.'
          : 'The outline they drew on the map.'}
      </p>
      {hasLayoutPlanView && savedLayoutSketch ? (
        <div className={`mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white ${compact ? '' : 'min-h-[280px]'}`}>
          <LayoutDrawCanvas
            initialDrawing={savedLayoutSketch}
            lineHighlightModes={savedLayoutHighlights}
            readOnly
            fillParent={false}
          />
        </div>
      ) : selectedRequest.project?.image_data_url ? (
        <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={selectedRequest.project.image_data_url}
            alt="Fence layout drawing"
            className="mx-auto max-h-[min(420px,70vh)] w-full object-contain"
          />
        </div>
      ) : null}
      {(selectedRequest.project?.segments?.length ?? 0) > 0 ? (
        <div className="mt-3">
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
      {(displayTotalFt > 0 || displayGates.length > 0 || selectedRequest.project?.has_removal) && (
        <div className="mt-3 flex flex-wrap gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-800">
          {displayTotalFt > 0 && (
            <span>
              <strong>Total:</strong> {displayTotalFt.toFixed(1)} ft
            </span>
          )}
          {selectedRequest.project?.has_removal && <span className="text-slate-600">Removal included</span>}
          {displayGates.length > 0 && (
            <span>
              <strong>Gates:</strong> {displayGates.map((g) => `${g.quantity} ${g.gate_type}`).join(', ')}
            </span>
          )}
        </div>
      )}
    </div>
  ) : null;

  const hasContractorDetails =
    selectedRequest.contractor.company_name ||
    selectedRequest.contractor.email ||
    selectedRequest.contractor.phone;

  return (
    <div className={compact ? 'text-sm' : ''}>
      {hasContractorDetails && (
        <div className={`rounded-lg border border-slate-200 bg-slate-50 ${pad} text-slate-700`}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Contractor details</p>
          {selectedRequest.contractor.company_name && (
            <p className="mt-2 font-semibold text-slate-900">{selectedRequest.contractor.company_name}</p>
          )}
          {selectedRequest.contractor.email && (
            <p className={selectedRequest.contractor.company_name ? 'mt-1' : 'mt-2'}>
              Email: {selectedRequest.contractor.email}
            </p>
          )}
          {selectedRequest.contractor.phone && <p className="mt-1">Phone: {selectedRequest.contractor.phone}</p>}
        </div>
      )}

      {selectedRequest.project?.home_address ? (
        <div className={`${gap} rounded-lg border border-slate-200 bg-slate-50 ${pad} text-slate-700`}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Home address</p>
          <p className="mt-2 font-medium text-slate-900">{selectedRequest.project.home_address}</p>
        </div>
      ) : null}

      {layoutDrawingBlock}

      <div className={`${gap} rounded-lg border border-slate-200 bg-slate-50 ${pad}`}>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Request</p>
        <dl className="mt-3 space-y-2.5 text-slate-800">
          <div>
            <dt className="text-xs font-medium text-slate-500">Product</dt>
            <dd className="mt-0.5 font-medium">{productLabel || 'Not specified'}</dd>
          </div>
          {selectedRequest.project?.design_option?.height_ft != null && (
            <div>
              <dt className="text-xs font-medium text-slate-500">Height</dt>
              <dd className="mt-0.5">{selectedRequest.project.design_option.height_ft} ft</dd>
            </div>
          )}
          {userNotes ? (
            <div>
              <dt className="text-xs font-medium text-slate-500">Notes</dt>
              <dd className="mt-0.5 whitespace-pre-wrap">{userNotes}</dd>
            </div>
          ) : null}
          {selectedRequest.attachment_url && (
            <div>
              <dt className="text-xs font-medium text-slate-500">Attachment</dt>
              <dd className="mt-0.5">
                <a
                  href={selectedRequest.attachment_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-indigo-700 hover:underline"
                >
                  {selectedRequest.attachment_name || 'Open file'}
                </a>
              </dd>
            </div>
          )}
        </dl>
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
