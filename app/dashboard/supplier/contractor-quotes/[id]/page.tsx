import { requireSupplierDashboard } from '@/lib/supplier-dashboard-guard';
import { ContractorQuoteDetailClient } from './ContractorQuoteDetailClient';

export default async function SupplierContractorQuoteDetailPage() {
  await requireSupplierDashboard();
  return <ContractorQuoteDetailClient />;
}
