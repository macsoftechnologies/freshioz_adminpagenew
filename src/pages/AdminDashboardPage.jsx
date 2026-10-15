import React from 'react';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, 
  DollarSign, 
  Building2, 
  Coins, 
  Clock, 
  CheckCircle2, 
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Download,
  Users,
  Database,
  Truck
} from 'lucide-react';
import { useAdminRole } from '../context/AdminRoleContext';
import { 
  RevenueMarginChart, 
  WarehouseVolumeChart, 
  CategoryRevenueDonutChart 
} from '../components/charts/InteractiveAdminCharts';
import { exportToExcel } from '../utils/excelExporter';

export default function AdminDashboardPage() {
  const { store } = useAdminRole();

  const pendingSocieties = (store.societies || []).filter(s => s.status === 'PENDING');
  const approvedSocieties = (store.societies || []).filter(s => s.status === 'APPROVED');
  const pendingPayouts = (store.withdrawals || []).filter(w => w.status === 'PENDING_APPROVAL');

  const totalGrossSales = (store.orders || []).reduce((acc, o) => acc + (o.totalAmount || 0), 0);
  const totalMandiSpend = (store.procurementLogs || []).reduce((acc, l) => acc + (l.totalSpend || 0), 0);
  const netMargin = totalGrossSales > 0 ? (((totalGrossSales - totalMandiSpend) / totalGrossSales) * 100).toFixed(1) : '0.0';

  // Consolidated Excel Report
  const handleExportConsolidatedExcel = () => {
    const headers = [
      'Report Section',
      'Metric / Key Parameter',
      'Recorded Value',
      'Benchmark / Notes'
    ];

    const rows = [
      ['FINANCIALS', 'Batched Next-Day Sales (GMV)', `₹${totalGrossSales.toLocaleString()}`, 'Prepaid orders locked by 9 PM cutoff'],
      ['FINANCIALS', 'Dawn Mandi Procurement Spend', `₹${totalMandiSpend.toLocaleString()}`, 'Direct APMC Kolar & Lasalgaon auctions'],
      ['FINANCIALS', 'Gross Operating Margin', `${netMargin}%`, 'Direct farm procurement efficiency spread'],
      ['OPERATIONS', 'Active Warehouses', `${(store.warehouses || []).length} Hubs`, 'Cold storage atmosphere controlled'],
      ['OPERATIONS', 'Regional Agri Logistics Hubs', `${(store.warehouses || []).length} Sorting Centers`, 'Central receiving and lot packaging hubs'],
      ['OPERATIONS', 'Operational Staff Registered', `${(store.employees || []).length} Staff Members`, 'Multi-role field & warehouse workforce'],
      ['OPERATIONS', 'Super Admins (Main)', `${(store.employees || []).filter(e => e.roles?.includes('SUPER_ADMIN')).length} Master Admins`, 'Executive oversight access'],
      ['COMMUNITIES', 'Active Approved Societies', `${approvedSocieties.length} Communities`, 'Apartment complexes and gated communities'],
      ['COMMUNITIES', 'Pending Onboarding Queue', `${pendingSocieties.length} Societies`, 'Submitted by field sales officers'],
      ['COMMUNITIES', 'Pending Wallet Withdrawals', `${pendingPayouts.length} Requests`, 'Society committee green maintenance fund payouts']
    ];

    exportToExcel('Freshioz_Consolidated_Executive_Report', headers, rows);
  };

  return (
    <div className="admin-page-container">
      {/* Compact Page Header */}
      <div className="page-title-header" style={{ marginBottom: '12px' }}>
        <div>
          <h1 style={{ fontSize: '18px', color: '#0F172A', fontWeight: 800, margin: 0 }}>
            Executive Operations Dashboard
          </h1>
          <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>
            Next-day delivery performance, interactive margin analytics & society metrics
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleExportConsolidatedExcel}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '6px',
              background: '#FFFFFF',
              border: '1.5px solid #CBD5E1',
              color: '#334155',
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            <Download size={14} />
            <span>Export Report (Excel)</span>
          </button>

          <Link to="/orders-fulfillment" className="admin-btn-accent" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '6px 14px', borderRadius: '6px' }}>
            <Truck size={14} />
            <span>Fulfillment Pipeline</span>
          </Link>
        </div>
      </div>

      {/* Pending Action Banner if any */}
      {pendingSocieties.length > 0 && (
        <div style={{
          background: '#FEF3C7',
          border: '1.5px solid #FCD34D',
          borderRadius: '8px',
          padding: '8px 14px',
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} color="#B45309" />
            <div>
              <span style={{ fontWeight: 800, fontSize: '13px', color: '#92400E' }}>
                {pendingSocieties.length} New Society Onboarding Awaiting Approval:
              </span>
              <span style={{ fontSize: '12px', color: '#B45309', marginLeft: '6px' }}>
                Field submissions with GPS coordinates and store mapping.
              </span>
            </div>
          </div>

          <Link to="/approvals" style={{ background: '#D97706', color: '#FFF', fontSize: '11.5px', fontWeight: 700, padding: '4px 12px', borderRadius: '6px' }}>
            Review & Set Commission &rarr;
          </Link>
        </div>
      )}

      {/* Compact 4 Metric KPI Cards */}
      <div className="admin-metric-grid" style={{ marginBottom: '14px', gap: '10px' }}>
        <div className="admin-metric-card" style={{ padding: '12px 14px' }}>
          <div className="metric-label" style={{ fontSize: '11px' }}>Batched Next-Day Sales</div>
          <div className="metric-value" style={{ fontSize: '20px', margin: '4px 0 2px' }}>₹{totalGrossSales.toLocaleString()}</div>
          <div className="metric-sub" style={{ color: '#059669', fontWeight: 700, fontSize: '11px' }}>
            +18.4% vs last week
          </div>
        </div>

        <div className="admin-metric-card" style={{ padding: '12px 14px' }}>
          <div className="metric-label" style={{ fontSize: '11px' }}>Dawn Mandi Spend</div>
          <div className="metric-value" style={{ color: '#F28E14', fontSize: '20px', margin: '4px 0 2px' }}>
            ₹{totalMandiSpend.toLocaleString()}
          </div>
          <div className="metric-sub" style={{ fontSize: '11px' }}>APMC Kolar & Lasalgaon</div>
        </div>

        <div className="admin-metric-card" style={{ padding: '12px 14px' }}>
          <div className="metric-label" style={{ fontSize: '11px' }}>Gross Margin Spread</div>
          <div className="metric-value" style={{ color: '#059669', fontSize: '20px', margin: '4px 0 2px' }}>
            {netMargin}%
          </div>
          <div className="metric-sub" style={{ fontSize: '11px' }}>Farm procurement spread</div>
        </div>

        <div className="admin-metric-card" style={{ padding: '12px 14px' }}>
          <div className="metric-label" style={{ fontSize: '11px' }}>Approved Societies</div>
          <div className="metric-value" style={{ fontSize: '20px', margin: '4px 0 2px' }}>
            {approvedSocieties.length}
          </div>
          <div className="metric-sub" style={{ fontSize: '11px' }}>
            {approvedSocieties.reduce((acc, s) => acc + (s.totalUnits || 0), 0)} Total Flats/Rooms
          </div>
        </div>
      </div>

      {/* Compact Admin Shortcuts Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
        gap: '8px',
        marginBottom: '14px'
      }}>
        <Link 
          to="/employees" 
          style={{
            background: '#FFFFFF',
            border: '1px solid #CBD5E1',
            borderRadius: '8px',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            textDecoration: 'none',
            color: 'inherit'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ background: '#234B3C', color: '#FFF', width: '28px', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={14} />
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#0F172A' }}>Employee & Roles</div>
              <div style={{ fontSize: '10.5px', color: '#64748B' }}>Multi-role & Super Admin</div>
            </div>
          </div>
          <ArrowRight size={13} color="#64748B" />
        </Link>

        <Link 
          to="/master-data" 
          style={{
            background: '#FFFFFF',
            border: '1px solid #CBD5E1',
            borderRadius: '8px',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            textDecoration: 'none',
            color: 'inherit'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ background: '#0284C7', color: '#FFF', width: '28px', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Database size={14} />
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#0F172A' }}>Master Data Catalog</div>
              <div style={{ fontSize: '10.5px', color: '#64748B' }}>Categories, Produce & Units</div>
            </div>
          </div>
          <ArrowRight size={13} color="#64748B" />
        </Link>

        <Link 
          to="/warehouse-settings" 
          style={{
            background: '#FFFFFF',
            border: '1px solid #CBD5E1',
            borderRadius: '8px',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            textDecoration: 'none',
            color: 'inherit',
            transition: 'border 0.2s'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: '#D97706', color: '#FFF', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 size={16} />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>Warehouses & Hubs</div>
              <div style={{ fontSize: '11px', color: '#64748B' }}>Cutoff & Hub Directory</div>
            </div>
          </div>
          <ArrowRight size={14} color="#64748B" />
        </Link>

        <Link 
          to="/orders-fulfillment" 
          style={{
            background: '#FFFFFF',
            border: '1px solid #CBD5E1',
            borderRadius: '10px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            textDecoration: 'none',
            color: 'inherit',
            transition: 'border 0.2s'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: '#059669', color: '#FFF', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Truck size={16} />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>Fulfillment Pipeline</div>
              <div style={{ fontSize: '11px', color: '#64748B' }}>Live morning status tracking</div>
            </div>
          </div>
          <ArrowRight size={14} color="#64748B" />
        </Link>
      </div>

      {/* ================= INTERACTIVE OPERATIONAL GRAPHS ================= */}
      <div className="admin-dashboard-graphs-grid">
        {/* Graph 1: Sales vs Mandi Spend Trend */}
        <RevenueMarginChart store={store} />

        {/* Graph 2: Produce Category Revenue Split */}
        <CategoryRevenueDonutChart store={store} />
      </div>

      {/* Secondary Graphs: Hub Volume Fulfillment */}
      <div style={{ marginBottom: '28px' }}>
        <WarehouseVolumeChart store={store} />
      </div>

      {/* Quick Recent Pending Approvals Table */}
      <div className="admin-table-card">
        <div className="admin-table-header">
          <h3 style={{ fontSize: '15px', color: '#0F172A', fontWeight: 800 }}>Pending Society Verification Queue</h3>
          <Link to="/approvals" style={{ fontSize: '12.5px', color: '#F28E14', fontWeight: 700 }}>
            View All Approvals &rarr;
          </Link>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>Society / Hostel Name</th>
                <th>Type</th>
                <th>Flats / Units</th>
                <th>Serving Warehouse</th>
                <th>Sales Rep</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {pendingSocieties.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#64748B' }}>
                    ✓ All submitted societies have been reviewed and approved!
                  </td>
                </tr>
              ) : (
                pendingSocieties.map(soc => (
                  <tr key={soc.id}>
                    <td>
                      <strong>{soc.name}</strong>
                      <div style={{ fontSize: '11.5px', color: '#64748B' }}>{soc.address}</div>
                    </td>
                    <td>{soc.type}</td>
                    <td>{soc.totalUnits} Units</td>
                    <td>{(store.warehouses || []).find(w => w.id === soc.warehouseId)?.name || 'Central Hub'}</td>
                    <td>{soc.salesRepName || 'Field Sales'}</td>
                    <td>
                      <span className="status-pill pending">PENDING</span>
                    </td>
                    <td>
                      <Link to="/approvals" style={{ color: '#234B3C', fontWeight: 700, fontSize: '13px' }}>
                        Review & Approve
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
