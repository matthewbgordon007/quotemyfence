import { requireSupplierDashboard } from '@/lib/supplier-dashboard-guard';
import { ContractorQuotesClient } from './ContractorQuotesClient';

export default async function SupplierContractorQuotesPage() {
  await requireSupplierDashboard();
  return <ContractorQuotesClient />;
}
