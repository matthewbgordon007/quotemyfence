import { requireSupplierDashboard } from '@/lib/supplier-dashboard-guard';
import { ContractorManagementClient } from './ContractorManagementClient';

export default async function SupplierContractorManagementPage() {
  await requireSupplierDashboard();
  return <ContractorManagementClient />;
}
