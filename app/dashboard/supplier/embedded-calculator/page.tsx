import { redirect } from 'next/navigation';

/** @deprecated Use `/dashboard/material-calculator` instead. */
export default function SupplierEmbeddedCalculatorRedirectPage({
  searchParams,
}: {
  searchParams: { materialRequest?: string | string[] };
}) {
  const raw = searchParams.materialRequest;
  const id = Array.isArray(raw) ? raw[0] : raw;
  if (id && String(id).trim()) {
    redirect(`/dashboard/material-calculator?materialRequest=${encodeURIComponent(String(id).trim())}`);
  }
  redirect('/dashboard/material-calculator');
}
