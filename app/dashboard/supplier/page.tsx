import { DashboardOverview } from '../DashboardOverview';
import { requireSupplierDashboard } from '@/lib/supplier-dashboard-guard';

export default async function SupplierDashboardHomePage() {
  await requireSupplierDashboard();
  return <DashboardOverview mode="supplier_combined" />;
}
