import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, 
  TrendingDown, 
  IndianRupee, 
  Wallet, 
  Truck, 
  Scale, 
  ShieldCheck, 
  AlertCircle, 
  Calendar, 
  RefreshCw, 
  Download, 
  Printer, 
  ArrowUpRight, 
  CheckCircle2, 
  Clock, 
  X, 
  ArrowLeft, 
  Building, 
  Building2,
  Warehouse,
  Search,
  Filter,
  Check,
  Percent,
  Layers,
  ShoppingBag,
  Info,
  Tag,
  MapPin,
  CheckCircle,
  BarChart3,
  GitCompare,
  ArrowRight,
  Plus
} from 'lucide-react';
import FreshiozLogo from '../components/common/FreshiozLogo';
import { useMisAnalytics, useReconcileRiderCash, warehouses as warehouseResource } from '../hooks/resources';
import { useToast } from '../context/ToastContext';

// Color Palette Constants for Freshioz Official Logo & Brand Theme
const C = {
  bg: '#FFFFFF',             // Pure White Canvas
  panel: '#FFFFFF',          // Clean White Card Panels
  panelHover: '#FAFAF9',
  border: '#E2E8F0',         // Soft Clean Slate Border
  borderLight: '#F1F5F9',
  text: '#0F172A',           // Slate-900 High Contrast Text
  textMuted: '#64748B',      // Slate-500
  textDim: '#94A3B8',        // Slate-400
  
  // Official Freshioz Logo Colors:
  spruce: '#234B3C',         // Deep Evergreen / Vegetable Spruce (Primary Brand)
  spruceLight: '#2D5D4B',
  spruceSurface: '#EBF2EE',
  spruceBorder: '#A7C4B8',

  citrus: '#F28E14',         // Fresh Citrus Fruit Orange (Secondary Brand Accent)
  citrusDark: '#DE7D09',
  citrusSurface: '#FFF7ED',  // Warm Orange Surface
  citrusBorder: '#FED7AA',

  emerald: '#059669',        // Fresh Farm Leaf Emerald
  emeraldSurface: '#ECFDF5',
  emeraldBorder: '#A7F3D0',

  amber: '#D97706',          // Mandi Harvest Gold
  amberSurface: '#FEF3C7',
  amberBorder: '#FDE68A',

  rose: '#DC2626',
  roseSurface: '#FEF2F2',
  roseBorder: '#FECACA',
};

export default function ExecutiveMisPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Filter state
  const [range, setRange] = useState('today');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Active Deep-Dive Navigation Tab: 'economics' | 'warehouseCompare' | 'monthCompare' | 'fieldCash'
  const [activeTab, setActiveTab] = useState('economics');

  // Produce SKU Table filters
  const [skuSearch, setSkuSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [marginTier, setMarginTier] = useState('ALL'); // 'ALL' | 'HIGH' | 'STAPLE' | 'THIN'
  const [settlingRiderId, setSettlingRiderId] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Driver Daily Wage Flat Settlement State
  const [driverPayoutInputs, setDriverPayoutInputs] = useState({});
  const [driverDailyPayouts, setDriverDailyPayouts] = useState(() => {
    try {
      const stored = localStorage.getItem('freshioz_driver_payouts_ledger');
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      return {};
    }
  });

  const handlePayDriverDaily = (rider) => {
    const defaultAmount = 2000;
    const inputVal = driverPayoutInputs[rider.id || rider.riderPhone];
    const amount = (inputVal !== undefined && inputVal !== '') ? Number(inputVal) : defaultAmount;
    const dateStr = selectedDate || 'TODAY';
    const key = `${rider.id || rider.riderPhone}__${dateStr}`;
    const newEntry = {
      riderId: rider.id || rider.riderPhone,
      riderName: rider.riderName,
      riderPhone: rider.riderPhone,
      amount,
      paidAt: new Date().toISOString(),
      date: dateStr,
      paidBy: 'Warehouse Operations Manager',
      ordersDelivered: rider.ordersDelivered
    };
    const updated = { ...driverDailyPayouts, [key]: newEntry };
    setDriverDailyPayouts(updated);
    localStorage.setItem('freshioz_driver_payouts_ledger', JSON.stringify(updated));
    showToast(`✓ Settled ₹${amount.toLocaleString('en-IN')} wage for ${rider.riderName} (${dateStr}) into ledger!`, 'success');
  };

  // Warehouse Head-to-Head Comparison States
  const [compareHubA, setCompareHubA] = useState('');
  const [compareHubB, setCompareHubB] = useState('');

  // Month Comparison States
  const [compareMonthA, setCompareMonthA] = useState('');
  const [compareMonthB, setCompareMonthB] = useState('');

  // Live Warehouses list from database
  const { data: rawWarehouses = [] } = warehouseResource.useList();
  const warehouseList = Array.isArray(rawWarehouses) ? rawWarehouses : [];

  // MIS Data Hook directly connected to backend /api/mis/executive-summary
  const { 
    data: misData, 
    isLoading, 
    isFetching, 
    refetch, 
    error 
  } = useMisAnalytics({
    range,
    startDate: range === 'custom' ? startDate : undefined,
    endDate: range === 'custom' ? endDate : undefined,
    warehouseId: selectedWarehouseId !== 'ALL' ? selectedWarehouseId : undefined,
  });

  const reconcileMutation = useReconcileRiderCash();

  const kpis = misData?.kpis || {
    totalGrossInflow: 0,
    grossBillingValue: 0,
    bulkDiscountSavings: 0,
    deliveryFeesCollected: 0,
    totalOrdersCount: 0,
    cancelledOrdersCount: 0,
    cancelledRevenue: 0,
    totalProduceDispatchedKg: 0,
    totalMandiOutflow: 0,
    produceProcuredAmount: 0,
    freightLogisticsAmount: 0,
    procurementBillsCount: 0,
    societyCommissionsEarned: 0,
    societyPayoutsDisbursed: 0,
    grossMarginSpread: 0,
    netOperatingProfit: 0,
    grossMarginPercent: 0.0,
    netProfitPercent: 0.0,
    doorstepCashCollected: 0,
    cashSettledToHubVault: 0,
    cashInTransitWithRiders: 0,
  };

  const productEconomics = misData?.productEconomics || [];
  const riderLedger = misData?.riderCashLedger || [];
  const dailySeries = misData?.charts?.dailySeries || [];
  const warehouseBreakdown = misData?.warehouseBreakdown || [];
  const monthlySeries = misData?.monthlySeries || misData?.charts?.monthlySeries || [];

  // Selected Months for Dynamic Comparison
  const monthAData = useMemo(() => {
    if (monthlySeries.length === 0) return null;
    const targetKey = compareMonthA || monthlySeries[0]?.key;
    return monthlySeries.find(m => m.key === targetKey) || monthlySeries[0];
  }, [monthlySeries, compareMonthA]);

  const monthBData = useMemo(() => {
    if (monthlySeries.length < 2) return null;
    const targetKey = compareMonthB || monthlySeries[1]?.key;
    return monthlySeries.find(m => m.key === targetKey) || monthlySeries[1];
  }, [monthlySeries, compareMonthB]);

  // Extract dynamic categories directly from the database response
  const availableCategories = useMemo(() => {
    const set = new Set();
    productEconomics.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return ['ALL', ...Array.from(set)];
  }, [productEconomics]);

  // Filter products by search, category, and margin tier
  const filteredProducts = useMemo(() => {
    return productEconomics.filter(item => {
      const q = skuSearch.trim().toLowerCase();
      const matchSearch = !q || 
        item.name.toLowerCase().includes(q) ||
        (item.kannadaName && item.kannadaName.toLowerCase().includes(q)) ||
        (item.origin && item.origin.toLowerCase().includes(q)) ||
        (item.id && item.id.toLowerCase().includes(q));

      const matchCat = categoryFilter === 'ALL' || item.category === categoryFilter;

      let matchTier = true;
      if (marginTier === 'HIGH') matchTier = item.marginPercent >= 35;
      else if (marginTier === 'STAPLE') matchTier = item.marginPercent >= 20 && item.marginPercent < 35;
      else if (marginTier === 'THIN') matchTier = item.marginPercent < 20;

      return matchSearch && matchCat && matchTier;
    });
  }, [productEconomics, skuSearch, categoryFilter, marginTier]);

  // Active warehouse name helper
  const activeWarehouseName = useMemo(() => {
    if (selectedWarehouseId === 'ALL') return 'All Warehouses (Consolidated Network)';
    const found = warehouseList.find(w => w.id === selectedWarehouseId);
    return found ? `${found.name} (${found.code})` : selectedWarehouseId;
  }, [selectedWarehouseId, warehouseList]);

  // Selected Hubs for Comparison
  const hubAData = useMemo(() => {
    if (warehouseBreakdown.length === 0) return null;
    const targetId = compareHubA || warehouseBreakdown[0]?.id;
    return warehouseBreakdown.find(w => w.id === targetId) || warehouseBreakdown[0];
  }, [warehouseBreakdown, compareHubA]);

  const hubBData = useMemo(() => {
    if (warehouseBreakdown.length < 2) return null;
    const targetId = compareHubB || warehouseBreakdown[1]?.id;
    return warehouseBreakdown.find(w => w.id === targetId) || warehouseBreakdown[1];
  }, [warehouseBreakdown, compareHubB]);

  // Handle Rider Cash Reconcile
  const handleReconcileRider = async (rider) => {
    try {
      setSettlingRiderId(rider.id);
      await reconcileMutation.mutateAsync({
        riderPhone: rider.riderPhone,
        amountSettled: rider.cashInTransit,
        settledBy: 'Super Admin Operations Desk',
        notes: `Reconciled from Executive Command Center for ${rider.riderName}`,
      });
      showToast(`Settled ₹${rider.cashInTransit.toLocaleString('en-IN')} for ${rider.riderName} into Hub Vault!`, 'success');
      refetch();
    } catch (err) {
      showToast(err.message || 'Failed to settle rider cash', 'error');
    } finally {
      setSettlingRiderId(null);
    }
  };

  // CSV Export with ALL rich product details
  const handleExportCSV = () => {
    const headers = [
      'Product ID',
      'Produce Name',
      'Kannada Name',
      'Category',
      'Unit',
      'Mandi Sourcing Rate (₹)',
      'Retail Price (₹)',
      'Market Benchmark (₹)',
      'Margin Spread (₹)',
      'Margin Spread %',
      'Sourced Qty (Kg)',
      'Sold Qty (Kg)',
      'Consumer Revenue (₹)',
      'Profit Contribution (₹)',
      'Origin Mandi Yard',
      'Shelf Life',
      'Stock Status'
    ];
    
    const rows = filteredProducts.map(p => [
      `"${p.id || ''}"`,
      `"${p.name || ''}"`,
      `"${p.kannadaName || ''}"`,
      `"${p.category || ''}"`,
      `"${p.unit || ''}"`,
      p.sourcingRatePerKg,
      p.sellingRatePerKg,
      p.retailMarketPrice || p.sellingRatePerKg,
      p.marginSpreadPerKg,
      `${p.marginPercent}%`,
      p.sourcedQtyKg,
      p.soldQtyKg,
      p.revenue,
      p.netProfitContribution,
      `"${p.origin || ''}"`,
      `"${p.shelfLife || ''}"`,
      p.inStock ? 'IN_STOCK' : 'OUT_OF_STOCK'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Freshioz_MIS_Report_${selectedWarehouseId}_${range}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported report to CSV!`, 'success');
  };

  // Close or navigate back
  const handleClose = () => {
    if (window.opener && !window.opener.closed) {
      window.close();
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: C.bg,
      color: C.text,
      fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      padding: '24px 32px',
      boxSizing: 'border-box',
    }}>
      {/* =========================================================================
          TOP COMMAND HEADER (WITH OFFICIAL FRESHIOZ BRAND IDENTITY)
         ========================================================================= */}
      <header style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
        paddingBottom: '20px',
        borderBottom: `1.5px solid ${C.border}`,
        marginBottom: '24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Official Freshioz Logo */}
          <FreshiozLogo height={44} showTagline={false} />

          <div style={{ borderLeft: `1.5px solid ${C.border}`, paddingLeft: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 style={{
                margin: 0,
                fontSize: '21px',
                fontWeight: 800,
                color: C.spruce,
                letterSpacing: '-0.02em',
              }}>
                Executive MIS & Cash Flow Command Center
              </h1>
              <span style={{
                background: C.spruceSurface,
                color: C.spruce,
                border: `1px solid ${C.spruceBorder}`,
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}>
                Super Admin Privilege
              </span>
            </div>
            <p style={{
              margin: '4px 0 0',
              fontSize: '12.5px',
              color: C.textMuted,
            }}>
              Active Scope: <strong style={{ color: C.spruce }}>{activeWarehouseName}</strong> • {productEconomics.length} Catalog Items • Zero-Leakage Field Cash
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              background: '#FFFFFF',
              border: `1.5px solid ${C.border}`,
              color: C.spruce,
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              transition: 'background 0.2s',
            }}
            title="Refresh analytics data"
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} color={C.spruce} />
            <span>{isFetching ? 'Syncing...' : 'Sync'}</span>
          </button>

          <button
            onClick={handleExportCSV}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              background: '#FFFFFF',
              border: `1.5px solid ${C.border}`,
              color: '#334155',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            }}
            title="Export CSV of detailed SKU unit economics"
          >
            <Download size={14} color="#334155" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={() => window.print()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              background: '#FFFFFF',
              border: `1.5px solid ${C.border}`,
              color: '#334155',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            }}
            title="Print PDF report"
          >
            <Printer size={14} color="#334155" />
            <span>Print PDF</span>
          </button>

          <button
            onClick={handleClose}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              background: C.roseSurface,
              border: `1.5px solid ${C.roseBorder}`,
              color: C.rose,
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
            title="Return to Ops Desk or Close Window"
          >
            <X size={15} />
            <span>Back to Ops Desk</span>
          </button>
        </div>
      </header>

      {/* =========================================================================
          WAREHOUSE HUB & TIME HORIZON COMMAND BAR
         ========================================================================= */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '14px',
        background: C.panel,
        padding: '12px 18px',
        borderRadius: '12px',
        border: `1.5px solid ${C.border}`,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        marginBottom: '24px',
      }}>
        {/* Left Side: Warehouse Hub Dropdown + Time Horizon Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          
          {/* Dynamic Warehouse Hub Selector */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: '#FFFFFF',
            border: `1.5px solid ${selectedWarehouseId !== 'ALL' ? C.spruce : C.border}`,
            borderRadius: '8px',
            padding: '6px 12px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
          }}>
            <Warehouse size={15} color={C.spruce} />
            <select
              value={selectedWarehouseId}
              onChange={(e) => setSelectedWarehouseId(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                fontSize: '13px',
                fontWeight: 700,
                color: C.spruce,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="ALL">🏢 All Regional Hubs (Consolidated)</option>
              {warehouseList.map(w => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.code || w.id})
                </option>
              ))}
            </select>
          </div>

          <div style={{ width: '1px', height: '24px', background: C.border }} />

          {/* Time Horizon Filter Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <Calendar size={14} color={C.spruce} />
            {[
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: '7d', label: 'Last 7 Days' },
              { id: '30d', label: 'Last 30 Days' },
              { id: 'mtd', label: 'Month to Date (MTD)' },
              { id: 'custom', label: 'Custom' },
            ].map((item) => {
              const active = range === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setRange(item.id)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '7px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: active ? `1.5px solid ${C.spruce}` : `1px solid ${C.border}`,
                    background: active ? C.spruce : '#FFFFFF',
                    color: active ? '#FFFFFF' : C.textMuted,
                    transition: 'all 0.15s ease',
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Custom Date Inputs */}
          {range === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  padding: '5px 8px',
                  borderRadius: '6px',
                  background: '#FFFFFF',
                  border: `1px solid ${C.border}`,
                  fontSize: '12px',
                }}
              />
              <span style={{ color: C.textMuted, fontSize: '12px' }}>to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{
                  padding: '5px 8px',
                  borderRadius: '6px',
                  background: '#FFFFFF',
                  border: `1px solid ${C.border}`,
                  fontSize: '12px',
                }}
              />
            </div>
          )}
        </div>

        {/* Right Side: Active Scope Badge */}
        <div style={{ color: C.spruce, fontSize: '12.5px', fontWeight: 800 }}>
          Period: <span style={{ color: C.citrusDark }}>{misData?.period?.label || 'Today (Live)'}</span>
        </div>
      </div>

      {/* =========================================================================
          5 HERO KPI CARDS (DYNAMIC TO SELECTED WAREHOUSE & TIME HORIZON)
         ========================================================================= */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
        gap: '16px',
        marginBottom: '28px',
      }}>
        {/* KPI 1: Customer Inflow (GMV) */}
        <div style={{
          background: C.panel,
          border: `1.5px solid ${C.border}`,
          borderRadius: '12px',
          padding: '18px 20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: C.spruce }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: C.spruce, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Customer Inflow (GMV)
            </span>
            <div style={{ padding: '6px', borderRadius: '8px', background: C.spruceSurface, color: C.spruce }}>
              <IndianRupee size={16} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 900, color: C.spruce, marginBottom: '6px' }}>
            ₹{kpis.totalGrossInflow.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '12px', color: C.textMuted, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span><strong>{kpis.totalOrdersCount}</strong> Live Orders</span>
            {kpis.cancelledOrdersCount > 0 ? (
              <span style={{ color: C.rose, fontWeight: 700, fontSize: '11px', background: C.roseSurface, padding: '1px 6px', borderRadius: '4px', border: `1px solid ${C.roseBorder}` }}>
                {kpis.cancelledOrdersCount} Cancelled (-₹{kpis.cancelledRevenue.toLocaleString('en-IN')})
              </span>
            ) : (
              <span style={{ color: C.spruce, fontWeight: 800 }}>Realized Net</span>
            )}
          </div>
          <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: `1px solid ${C.borderLight}`, fontSize: '11px', color: C.textMuted, display: 'flex', justifyContent: 'space-between' }}>
            <span>Billing: ₹{kpis.grossBillingValue.toLocaleString('en-IN')}</span>
            <span>Bulk Savings: -₹{kpis.bulkDiscountSavings.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* KPI 2: Mandi & Sourcing Outflow */}
        <div style={{
          background: C.panel,
          border: `1.5px solid ${C.border}`,
          borderRadius: '12px',
          padding: '18px 20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: C.citrus }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: C.citrusDark, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Mandi Sourcing Outflow
            </span>
            <div style={{ padding: '6px', borderRadius: '8px', background: C.citrusSurface, color: C.citrus }}>
              <Truck size={16} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 900, color: C.text, marginBottom: '6px' }}>
            ₹{kpis.totalMandiOutflow.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '12px', color: C.textMuted, display: 'flex', justifyContent: 'space-between' }}>
            <span><strong>{kpis.procurementBillsCount}</strong> APMC Mandi Bills</span>
            <span style={{ color: C.citrusDark, fontWeight: 800 }}>Wholesale Cost</span>
          </div>
          <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: `1px solid ${C.borderLight}`, fontSize: '11px', color: C.textMuted, display: 'flex', justifyContent: 'space-between' }}>
            <span>Produce: ₹{kpis.produceProcuredAmount.toLocaleString('en-IN')}</span>
            <span>Freight: ₹{kpis.freightLogisticsAmount.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* KPI 3: Net Operating Spread */}
        <div style={{
          background: C.panel,
          border: `1.5px solid ${C.border}`,
          borderRadius: '12px',
          padding: '18px 20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: C.emerald }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: C.emerald, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Net Operating Spread
            </span>
            <div style={{ padding: '6px', borderRadius: '8px', background: C.emeraldSurface, color: C.emerald }}>
              <Scale size={16} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 900, color: C.emerald, marginBottom: '6px' }}>
            ₹{kpis.netOperatingProfit.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '12px', color: C.textMuted, display: 'flex', justifyContent: 'space-between' }}>
            <span>Margin: <strong style={{ color: C.emerald }}>{kpis.grossMarginPercent}%</strong></span>
            <span>Net Profit: <strong>{kpis.netProfitPercent}%</strong></span>
          </div>
          <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: `1px solid ${C.borderLight}`, fontSize: '11px', color: C.textMuted, display: 'flex', justifyContent: 'space-between' }}>
            <span>Gross Spread: ₹{kpis.grossMarginSpread.toLocaleString('en-IN')}</span>
            <span>Society Comm: -₹{kpis.societyCommissionsEarned.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* KPI 4: Dispatched Volume */}
        <div style={{
          background: C.panel,
          border: `1.5px solid ${C.border}`,
          borderRadius: '12px',
          padding: '18px 20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: C.amber }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: C.amber, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Produce Dispatched
            </span>
            <div style={{ padding: '6px', borderRadius: '8px', background: C.amberSurface, color: C.amber }}>
              <Layers size={16} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 900, color: C.text, marginBottom: '6px' }}>
            {kpis.totalProduceDispatchedKg.toLocaleString('en-IN')} <span style={{ fontSize: '16px', fontWeight: 700, color: C.textMuted }}>Kg</span>
          </div>
          <div style={{ fontSize: '12px', color: C.textMuted, display: 'flex', justifyContent: 'space-between' }}>
            <span>Volume Handled</span>
            <span style={{ color: C.amber, fontWeight: 800 }}>Hub Lots</span>
          </div>
          <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: `1px solid ${C.borderLight}`, fontSize: '11px', color: C.textMuted, display: 'flex', justifyContent: 'space-between' }}>
            <span>Wholesale Lots Dispatched</span>
            <span>Morning Fresh Slot</span>
          </div>
        </div>

        {/* KPI 5: Field Cash Collected */}
        <div style={{
          background: C.panel,
          border: `1.5px solid ${C.border}`,
          borderRadius: '12px',
          padding: '18px 20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: '#0284C7' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#0284C7', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Doorstep Cash (COD)
            </span>
            <div style={{ padding: '6px', borderRadius: '8px', background: '#E0F2FE', color: '#0284C7' }}>
              <Wallet size={16} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 900, color: C.text, marginBottom: '6px' }}>
            ₹{kpis.doorstepCashCollected.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '12px', color: C.textMuted, display: 'flex', justifyContent: 'space-between' }}>
            <span>Settled: <strong>₹{kpis.cashSettledToHubVault.toLocaleString('en-IN')}</strong></span>
            <span style={{ color: kpis.cashInTransitWithRiders > 0 ? C.rose : C.emerald, fontWeight: 800 }}>
              {kpis.cashInTransitWithRiders > 0 ? `₹${kpis.cashInTransitWithRiders} In Transit` : '✓ Reconciled'}
            </span>
          </div>
          <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: `1px solid ${C.borderLight}`, fontSize: '11px', color: C.textMuted, display: 'flex', justifyContent: 'space-between' }}>
            <span>Hub Vault Status</span>
            <span>Zero Cash Leakage</span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          FOUR EXECUTIVE COMMAND TABS
         ========================================================================= */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        borderBottom: `2px solid ${C.border}`,
        marginBottom: '22px',
        paddingBottom: '2px',
        flexWrap: 'wrap'
      }}>
        {/* Tab 1: Produce SKU Economics */}
        <button
          onClick={() => setActiveTab('economics')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            fontSize: '13.5px',
            fontWeight: 800,
            cursor: 'pointer',
            borderBottom: activeTab === 'economics' ? `3px solid ${C.spruce}` : '3px solid transparent',
            color: activeTab === 'economics' ? C.spruce : C.textMuted,
            background: 'none',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            transition: 'color 0.15s ease',
          }}
        >
          <Scale size={16} color={activeTab === 'economics' ? C.spruce : C.textMuted} />
          <span>Produce SKU Economics & Margins ({productEconomics.length} Active SKUs)</span>
        </button>

        {/* Tab 2: Warehouse Hub Performance & Comparison */}
        <button
          onClick={() => setActiveTab('warehouseCompare')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            fontSize: '13.5px',
            fontWeight: 800,
            cursor: 'pointer',
            borderBottom: activeTab === 'warehouseCompare' ? `3px solid ${C.spruce}` : '3px solid transparent',
            color: activeTab === 'warehouseCompare' ? C.spruce : C.textMuted,
            background: 'none',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            transition: 'color 0.15s ease',
          }}
        >
          <Warehouse size={16} color={activeTab === 'warehouseCompare' ? C.spruce : C.textMuted} />
          <span>Warehouse Hubs & Comparison ({warehouseList.length} Hubs)</span>
        </button>

        {/* Tab 3: Month-over-Month & Annual Trends */}
        <button
          onClick={() => setActiveTab('monthCompare')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            fontSize: '13.5px',
            fontWeight: 800,
            cursor: 'pointer',
            borderBottom: activeTab === 'monthCompare' ? `3px solid ${C.spruce}` : '3px solid transparent',
            color: activeTab === 'monthCompare' ? C.spruce : C.textMuted,
            background: 'none',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            transition: 'color 0.15s ease',
          }}
        >
          <Calendar size={16} color={activeTab === 'monthCompare' ? C.spruce : C.textMuted} />
          <span>Month-over-Month & Seasonal Trends</span>
        </button>

        {/* Tab 4: Field Cash & Rider Vault Settlement */}
        <button
          onClick={() => setActiveTab('fieldCash')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            fontSize: '13.5px',
            fontWeight: 800,
            cursor: 'pointer',
            borderBottom: activeTab === 'fieldCash' ? `3px solid ${C.citrus}` : '3px solid transparent',
            color: activeTab === 'fieldCash' ? C.citrusDark : C.textMuted,
            background: 'none',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            transition: 'color 0.15s ease',
          }}
        >
          <ShieldCheck size={16} color={activeTab === 'fieldCash' ? C.citrusDark : C.textMuted} />
          <span>Field Cash & Rider Vault Settlement ({riderLedger.length})</span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: SKU UNIT ECONOMICS TABLE
         ========================================================================= */}
      {activeTab === 'economics' && (
        <div style={{
          background: C.panel,
          border: `1.5px solid ${C.border}`,
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}>
          {/* Table Header Filter & Search Row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '14px', marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', flex: 1 }}>
              {/* Search Bar */}
              <div style={{ position: 'relative', minWidth: '300px', flex: 1, maxWidth: '420px' }}>
                <Search size={15} style={{ position: 'absolute', left: '12px', top: '10px', color: C.textMuted }} />
                <input
                  type="text"
                  placeholder="Search by English name, Kannada name (ಟೊಮೆಟೊ), SKU..."
                  value={skuSearch}
                  onChange={(e) => setSkuSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 36px',
                    borderRadius: '8px',
                    background: '#FFFFFF',
                    border: `1.5px solid ${C.border}`,
                    color: C.text,
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Dynamic Category Filter Pills */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {availableCategories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: categoryFilter === cat ? C.spruce : '#FFFFFF',
                      border: `1.5px solid ${categoryFilter === cat ? C.spruce : C.border}`,
                      color: categoryFilter === cat ? '#FFFFFF' : C.textMuted,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Margin Health Filter Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11.5px', color: C.textMuted, fontWeight: 700 }}>Margin Health:</span>
              {[
                { id: 'ALL', label: 'All Margins' },
                { id: 'HIGH', label: 'High (>35%)' },
                { id: 'STAPLE', label: 'Core (20-35%)' },
                { id: 'THIN', label: 'Thin (<20%)' },
              ].map(tier => (
                <button
                  key={tier.id}
                  onClick={() => setMarginTier(tier.id)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: marginTier === tier.id ? C.citrusSurface : '#FFFFFF',
                    border: `1px solid ${marginTier === tier.id ? C.citrusBorder : C.border}`,
                    color: marginTier === tier.id ? C.citrusDark : C.textMuted,
                  }}
                >
                  {tier.label}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto', borderRadius: '8px', border: `1.5px solid ${C.border}` }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', color: C.spruce, textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '12px 16px', borderBottom: `1.5px solid ${C.border}`, fontWeight: 800 }}>Produce Item (SKU & Origin)</th>
                  <th style={{ padding: '12px 16px', borderBottom: `1.5px solid ${C.border}`, fontWeight: 800 }}>Category & Unit</th>
                  <th style={{ padding: '12px 16px', borderBottom: `1.5px solid ${C.border}`, textAlign: 'right', fontWeight: 800 }}>Mandi Sourcing (₹)</th>
                  <th style={{ padding: '12px 16px', borderBottom: `1.5px solid ${C.border}`, textAlign: 'right', fontWeight: 800 }}>Retail Rate (₹)</th>
                  <th style={{ padding: '12px 16px', borderBottom: `1.5px solid ${C.border}`, textAlign: 'right', fontWeight: 800 }}>Spread (₹/unit)</th>
                  <th style={{ padding: '12px 16px', borderBottom: `1.5px solid ${C.border}`, textAlign: 'center', fontWeight: 800 }}>Margin %</th>
                  <th style={{ padding: '12px 16px', borderBottom: `1.5px solid ${C.border}`, textAlign: 'right', fontWeight: 800 }}>Dispatched Volume</th>
                  <th style={{ padding: '12px 16px', borderBottom: `1.5px solid ${C.border}`, textAlign: 'right', fontWeight: 800 }}>Realized Revenue</th>
                  <th style={{ padding: '12px 16px', borderBottom: `1.5px solid ${C.border}`, textAlign: 'right', fontWeight: 800 }}>Profit Contribution</th>
                  <th style={{ padding: '12px 16px', borderBottom: `1.5px solid ${C.border}`, textAlign: 'center', fontWeight: 800 }}>Spec</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p, idx) => {
                  const isHighMargin = p.marginPercent >= 35;
                  const isThinMargin = p.marginPercent < 20;

                  return (
                    <tr
                      key={p.id || idx}
                      style={{
                        borderBottom: `1px solid ${C.border}`,
                        background: idx % 2 === 0 ? '#FFFFFF' : '#FAFAF9',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div>
                            <div style={{ fontWeight: 800, color: C.text, fontSize: '13.5px' }}>
                              {p.name}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', flexWrap: 'wrap' }}>
                              {p.kannadaName && (
                                <span style={{ fontSize: '11px', color: C.spruce, fontWeight: 700, background: C.spruceSurface, padding: '1px 5px', borderRadius: '4px' }}>
                                  {p.kannadaName}
                                </span>
                              )}
                              <span style={{ fontSize: '11px', color: C.textMuted }}>
                                📍 {p.origin || 'APMC Mandi'} • ⏱ {p.shelfLife || '3-5 Days'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 700, color: C.text }}>{p.category}</div>
                        <div style={{ fontSize: '11px', color: C.textMuted }}>per {p.unit}</div>
                      </td>

                      <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#334155' }}>
                        ₹{p.sourcingRatePerKg.toFixed(2)}
                      </td>

                      <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: C.spruce }}>
                        ₹{p.sellingRatePerKg.toFixed(2)}
                      </td>

                      <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: C.emerald }}>
                        +₹{p.marginSpreadPerKg.toFixed(2)}
                      </td>

                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '11.5px',
                          fontWeight: 800,
                          background: isHighMargin ? C.emeraldSurface : (isThinMargin ? C.roseSurface : C.citrusSurface),
                          color: isHighMargin ? C.emerald : (isThinMargin ? C.rose : C.citrusDark),
                          border: `1px solid ${isHighMargin ? C.emeraldBorder : (isThinMargin ? C.roseBorder : C.citrusBorder)}`,
                        }}>
                          {p.marginPercent.toFixed(1)}%
                        </span>
                      </td>

                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: C.text }}>
                        {p.soldQtyKg} {p.unit}
                      </td>

                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: C.spruce }}>
                        ₹{p.revenue.toLocaleString('en-IN')}
                      </td>

                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: C.emerald }}>
                        ₹{p.netProfitContribution.toLocaleString('en-IN')}
                      </td>

                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <button
                          onClick={() => setSelectedProduct(p)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            background: '#FFFFFF',
                            border: `1px solid ${C.border}`,
                            color: C.spruce,
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: WAREHOUSE HUB PERFORMANCE & COMPARISON
         ========================================================================= */}
      {activeTab === 'warehouseCompare' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Header & Head-to-Head Hub Selector */}
          <div style={{
            background: C.panel,
            border: `1.5px solid ${C.border}`,
            borderRadius: '12px',
            padding: '18px 22px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 800, color: C.spruce, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Warehouse size={19} color={C.spruce} />
                <span>Warehouse Hub Network Performance & Benchmarking</span>
              </h2>
              <p style={{ fontSize: '12.5px', color: C.textMuted, margin: '4px 0 0' }}>
                Comparative operational volume, APMC sourcing spend & fulfillment margin across all {warehouseList.length} hubs
              </p>
            </div>

            {/* Hub vs Hub Comparison Dropdowns */}
            {warehouseList.length >= 2 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#F8FAFC', padding: '6px 12px', borderRadius: '10px', border: `1px solid ${C.border}` }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: C.textMuted }}>Compare:</span>
                <select
                  value={compareHubA || warehouseList[0]?.id}
                  onChange={(e) => setCompareHubA(e.target.value)}
                  style={{ padding: '4px 8px', borderRadius: '6px', border: `1px solid ${C.border}`, fontSize: '12px', fontWeight: 700, color: C.spruce }}
                >
                  {warehouseList.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
                <span style={{ fontSize: '12px', fontWeight: 800, color: C.citrusDark }}>VS</span>
                <select
                  value={compareHubB || warehouseList[1]?.id}
                  onChange={(e) => setCompareHubB(e.target.value)}
                  style={{ padding: '4px 8px', borderRadius: '6px', border: `1px solid ${C.border}`, fontSize: '12px', fontWeight: 700, color: C.citrusDark }}
                >
                  {warehouseList.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* All Hubs Metric Grid */}
          {warehouseBreakdown.length > 0 ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '18px'
            }}>
              {warehouseBreakdown.map((wh) => (
                <div
                  key={wh.id}
                  style={{
                    background: C.panel,
                    border: `1.5px solid ${C.border}`,
                    borderRadius: '14px',
                    padding: '20px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '15px', fontWeight: 800, color: C.text }}>{wh.name}</span>
                          <span style={{ fontSize: '10.5px', fontWeight: 800, background: C.spruceSurface, color: C.spruce, padding: '1px 6px', borderRadius: '4px' }}>
                            {wh.code}
                          </span>
                        </div>
                        <div style={{ fontSize: '11.5px', color: C.textMuted, marginTop: '2px' }}>
                          📍 {wh.location} • Cut-off {wh.cutoffTime}
                        </div>
                      </div>
                      <div style={{ padding: '6px 10px', borderRadius: '8px', background: C.emeraldSurface, color: C.emerald, fontSize: '12px', fontWeight: 800 }}>
                        {wh.marginPercent}% Spread
                      </div>
                    </div>

                    {/* Financial Figures */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', margin: '14px 0', padding: '12px', background: '#F8FAFC', borderRadius: '10px' }}>
                      <div>
                        <div style={{ fontSize: '11px', color: C.textMuted, fontWeight: 700 }}>Realized Revenue</div>
                        <div style={{ fontSize: '18px', fontWeight: 900, color: C.spruce }}>₹{wh.revenue.toLocaleString('en-IN')}</div>
                        <div style={{ fontSize: '10.5px', color: C.textMuted }}>{wh.orderCount} orders</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: C.textMuted, fontWeight: 700 }}>Mandi Outflow</div>
                        <div style={{ fontSize: '18px', fontWeight: 900, color: C.citrusDark }}>₹{wh.procurementSpend.toLocaleString('en-IN')}</div>
                        <div style={{ fontSize: '10.5px', color: C.textMuted }}>lot sourcing</div>
                      </div>
                    </div>

                    {/* Operational Details */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: C.textMuted }}>
                      <span>Dispatched Volume: <strong style={{ color: C.text }}>{wh.volumeDispatchedKg} Kg</strong></span>
                      <span>Drop Points: <strong style={{ color: C.text }}>{wh.societiesCount} Communities</strong></span>
                    </div>
                  </div>

                  <div style={{ marginTop: '16px', paddingTop: '10px', borderTop: `1px solid ${C.borderLight}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11.5px', color: C.textMuted }}>Capacity: {wh.capacityTons} Tons</span>
                    <button
                      onClick={() => {
                        setSelectedWarehouseId(wh.id);
                        setActiveTab('economics');
                        showToast(`Filtered report to ${wh.name}`, 'info');
                      }}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        background: '#FFFFFF',
                        border: `1px solid ${C.border}`,
                        color: C.spruce,
                        fontSize: '11.5px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Filter Analytics &rarr;
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              padding: '40px 24px',
              textAlign: 'center',
              background: '#FFFFFF',
              borderRadius: '16px',
              border: `1.5px dashed ${C.border}`
            }}>
              <Warehouse size={36} color="#94A3B8" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: C.text, margin: '0 0 6px' }}>
                0 Warehouse Hubs Currently Configured
              </h3>
              <p style={{ fontSize: '13px', color: C.textMuted, maxWidth: '460px', margin: '0 auto 18px', lineHeight: 1.4 }}>
                Add your sorting hubs and cold storage facilities in Bangalore to enable multi-warehouse comparison, inventory lot tracking, and regional dispatch audits.
              </p>
              <button
                onClick={() => navigate('/warehouse-settings')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 18px',
                  background: C.spruce,
                  color: '#FFFFFF',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '13px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                <Plus size={15} />
                <span>Configure Regional Hubs</span>
              </button>
            </div>
          )}

          {/* Head-to-Head Comparative Cards (When 2+ Hubs Selected) */}
          {hubAData && hubBData && hubAData.id !== hubBData.id && (
            <div style={{
              background: C.panel,
              border: `1.5px solid ${C.border}`,
              borderRadius: '14px',
              padding: '22px 26px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: C.spruce, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <GitCompare size={17} color={C.spruce} />
                <span>Head-to-Head Hub Benchmark: {hubAData.name} vs {hubBData.name}</span>
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                {/* Benchmark 1: Revenue (GMV) */}
                <div style={{ padding: '14px', background: '#F8FAFC', borderRadius: '10px', border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: '11.5px', color: C.textMuted, fontWeight: 700, marginBottom: '6px' }}>Realized Revenue (GMV)</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: C.spruce }}>{hubAData.code}: ₹{hubAData.revenue.toLocaleString('en-IN')}</span>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: C.citrusDark }}>{hubBData.code}: ₹{hubBData.revenue.toLocaleString('en-IN')}</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: '#E2E8F0', borderRadius: '9999px', overflow: 'hidden', display: 'flex' }}>
                    <div style={{ width: `${(hubAData.revenue / (hubAData.revenue + hubBData.revenue || 1)) * 100}%`, background: C.spruce }} />
                    <div style={{ width: `${(hubBData.revenue / (hubAData.revenue + hubBData.revenue || 1)) * 100}%`, background: C.citrus }} />
                  </div>
                </div>

                {/* Benchmark 2: Orders Dispatched */}
                <div style={{ padding: '14px', background: '#F8FAFC', borderRadius: '10px', border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: '11.5px', color: C.textMuted, fontWeight: 700, marginBottom: '6px' }}>Orders Dispatched</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: C.spruce }}>{hubAData.code}: {hubAData.orderCount} orders</span>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: C.citrusDark }}>{hubBData.code}: {hubBData.orderCount} orders</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: '#E2E8F0', borderRadius: '9999px', overflow: 'hidden', display: 'flex' }}>
                    <div style={{ width: `${(hubAData.orderCount / (hubAData.orderCount + hubBData.orderCount || 1)) * 100}%`, background: C.spruce }} />
                    <div style={{ width: `${(hubBData.orderCount / (hubAData.orderCount + hubBData.orderCount || 1)) * 100}%`, background: C.citrus }} />
                  </div>
                </div>

                {/* Benchmark 3: Gross Margin % */}
                <div style={{ padding: '14px', background: '#F8FAFC', borderRadius: '10px', border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: '11.5px', color: C.textMuted, fontWeight: 700, marginBottom: '6px' }}>Gross Margin Spread %</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: C.emerald }}>{hubAData.code}: {hubAData.marginPercent}%</span>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: C.citrusDark }}>{hubBData.code}: {hubBData.marginPercent}%</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: '#E2E8F0', borderRadius: '9999px', overflow: 'hidden', display: 'flex' }}>
                    <div style={{ width: `${(hubAData.marginPercent / (hubAData.marginPercent + hubBData.marginPercent || 1)) * 100}%`, background: C.emerald }} />
                    <div style={{ width: `${(hubBData.marginPercent / (hubAData.marginPercent + hubBData.marginPercent || 1)) * 100}%`, background: C.citrus }} />
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* =========================================================================
          TAB 3: MONTH-OVER-MONTH & SEASONAL TRENDS
         ========================================================================= */}
      {activeTab === 'monthCompare' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Header */}
          <div style={{
            background: C.panel,
            border: `1.5px solid ${C.border}`,
            borderRadius: '12px',
            padding: '18px 22px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 800, color: C.spruce, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={19} color={C.spruce} />
                <span>Month-over-Month & Historical Seasonal Comparison</span>
              </h2>
              <p style={{ fontSize: '12.5px', color: C.textMuted, margin: '4px 0 0' }}>
                Analyze monthly GMV trajectories, seasonal produce demand surges, and basket size deltas
              </p>
            </div>

            {/* Month Selectors */}
            {monthlySeries.length >= 2 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#F8FAFC', padding: '6px 12px', borderRadius: '10px', border: `1px solid ${C.border}` }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: C.textMuted }}>Period A:</span>
                <select
                  value={compareMonthA || monthlySeries[0]?.key}
                  onChange={(e) => setCompareMonthA(e.target.value)}
                  style={{ padding: '4px 8px', borderRadius: '6px', border: `1px solid ${C.border}`, fontSize: '12px', fontWeight: 700, color: C.spruce }}
                >
                  {monthlySeries.map(m => (
                    <option key={m.key} value={m.key}>
                      {m.name} {m.isCurrent ? '(Current)' : ''}
                    </option>
                  ))}
                </select>

                <span style={{ fontSize: '12px', fontWeight: 800, color: C.citrusDark }}>VS Period B:</span>
                <select
                  value={compareMonthB || monthlySeries[1]?.key}
                  onChange={(e) => setCompareMonthB(e.target.value)}
                  style={{ padding: '4px 8px', borderRadius: '6px', border: `1px solid ${C.border}`, fontSize: '12px', fontWeight: 700, color: C.citrusDark }}
                >
                  {monthlySeries.map(m => (
                    <option key={m.key} value={m.key}>
                      {m.name} {m.isCurrent ? '(Current)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>

          {/* Comparative Metrics Grid */}
          {monthAData && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '16px'
            }}>
              {/* Metric 1: GMV Growth */}
              <div style={{ background: C.panel, border: `1.5px solid ${C.border}`, borderRadius: '12px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: C.textMuted, textTransform: 'uppercase' }}>
                  {monthAData.name} Sales (GMV)
                </div>
                <div style={{ fontSize: '24px', fontWeight: 900, color: C.spruce, margin: '6px 0 2px' }}>
                  ₹{monthAData.revenue.toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: '12px', color: monthBData && monthAData.revenue >= monthBData.revenue ? C.emerald : C.rose, fontWeight: 800 }}>
                  {monthBData ? (
                    monthBData.revenue > 0 
                      ? `${monthAData.revenue >= monthBData.revenue ? '↑' : '↓'} ${Math.abs(Number((((monthAData.revenue - monthBData.revenue) / monthBData.revenue) * 100).toFixed(1)))}% vs ${monthBData.name}`
                      : '0.0% vs ' + monthBData.name
                  ) : 'Current Period'}
                </div>
                <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: `1px solid ${C.borderLight}`, fontSize: '11px', color: C.textMuted }}>
                  Customer realizations across all communities
                </div>
              </div>

              {/* Metric 2: Order Volume Delta */}
              <div style={{ background: C.panel, border: `1.5px solid ${C.border}`, borderRadius: '12px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: C.textMuted, textTransform: 'uppercase' }}>
                  {monthAData.name} Orders
                </div>
                <div style={{ fontSize: '24px', fontWeight: 900, color: C.text, margin: '6px 0 2px' }}>
                  {monthAData.orderCount.toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: '12px', color: C.spruce, fontWeight: 800 }}>
                  {monthBData ? `${monthAData.orderCount - monthBData.orderCount >= 0 ? '+' : ''}${monthAData.orderCount - monthBData.orderCount} Orders vs ${monthBData.name}` : `${monthAData.orderCount} Orders`}
                </div>
                <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: `1px solid ${C.borderLight}`, fontSize: '11px', color: C.textMuted }}>
                  Batch deliveries into society reception gates
                </div>
              </div>

              {/* Metric 3: Average Order Value (AOV) */}
              <div style={{ background: C.panel, border: `1.5px solid ${C.border}`, borderRadius: '12px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: C.textMuted, textTransform: 'uppercase' }}>
                  Average Order Value (AOV)
                </div>
                <div style={{ fontSize: '24px', fontWeight: 900, color: '#9333EA', margin: '6px 0 2px' }}>
                  ₹{monthAData.aov.toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: '12px', color: '#9333EA', fontWeight: 800 }}>
                  {monthBData ? `₹${monthAData.aov - monthBData.aov >= 0 ? '+' : ''}${monthAData.aov - monthBData.aov} vs ${monthBData.name}` : 'Basket Size Benchmark'}
                </div>
                <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: `1px solid ${C.borderLight}`, fontSize: '11px', color: C.textMuted }}>
                  Produce quantity and basket composition
                </div>
              </div>

              {/* Metric 4: Volume Dispatched */}
              <div style={{ background: C.panel, border: `1.5px solid ${C.border}`, borderRadius: '12px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: C.textMuted, textTransform: 'uppercase' }}>
                  Volume Handled
                </div>
                <div style={{ fontSize: '24px', fontWeight: 900, color: C.amber, margin: '6px 0 2px' }}>
                  {monthAData.volumeKg.toLocaleString('en-IN')} <span style={{ fontSize: '15px', color: C.textMuted }}>Kg</span>
                </div>
                <div style={{ fontSize: '12px', color: C.amber, fontWeight: 800 }}>
                  {monthBData ? `${monthAData.volumeKg - monthBData.volumeKg >= 0 ? '+' : ''}${monthAData.volumeKg - monthBData.volumeKg} Kg vs ${monthBData.name}` : 'Produce Dispatched'}
                </div>
                <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: `1px solid ${C.borderLight}`, fontSize: '11px', color: C.textMuted }}>
                  Wholesale crate lot volume
                </div>
              </div>
            </div>
          )}

          {/* Head-to-Head Comparative Month Bar Benchmark */}
          {monthAData && monthBData && monthAData.key !== monthBData.key && (
            <div style={{
              background: C.panel,
              border: `1.5px solid ${C.border}`,
              borderRadius: '14px',
              padding: '22px 26px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: C.spruce, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <GitCompare size={17} color={C.spruce} />
                <span>Head-to-Head Monthly Trend: {monthAData.name} vs {monthBData.name}</span>
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                {/* Metric 1: Revenue Benchmark */}
                <div style={{ padding: '14px', background: '#F8FAFC', borderRadius: '10px', border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: '11.5px', color: C.textMuted, fontWeight: 700, marginBottom: '6px' }}>Monthly GMV Realization</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: C.spruce }}>{monthAData.name.split(' ')[0]}: ₹{monthAData.revenue.toLocaleString('en-IN')}</span>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: C.citrusDark }}>{monthBData.name.split(' ')[0]}: ₹{monthBData.revenue.toLocaleString('en-IN')}</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: '#E2E8F0', borderRadius: '9999px', overflow: 'hidden', display: 'flex' }}>
                    <div style={{ width: `${(monthAData.revenue / (monthAData.revenue + monthBData.revenue || 1)) * 100}%`, background: C.spruce }} />
                    <div style={{ width: `${(monthBData.revenue / (monthAData.revenue + monthBData.revenue || 1)) * 100}%`, background: C.citrus }} />
                  </div>
                </div>

                {/* Metric 2: Orders Dispatched */}
                <div style={{ padding: '14px', background: '#F8FAFC', borderRadius: '10px', border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: '11.5px', color: C.textMuted, fontWeight: 700, marginBottom: '6px' }}>Customer Orders</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: C.spruce }}>{monthAData.name.split(' ')[0]}: {monthAData.orderCount}</span>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: C.citrusDark }}>{monthBData.name.split(' ')[0]}: {monthBData.orderCount}</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: '#E2E8F0', borderRadius: '9999px', overflow: 'hidden', display: 'flex' }}>
                    <div style={{ width: `${(monthAData.orderCount / (monthAData.orderCount + monthBData.orderCount || 1)) * 100}%`, background: C.spruce }} />
                    <div style={{ width: `${(monthBData.orderCount / (monthAData.orderCount + monthBData.orderCount || 1)) * 100}%`, background: C.citrus }} />
                  </div>
                </div>

                {/* Metric 3: Basket Size (AOV) */}
                <div style={{ padding: '14px', background: '#F8FAFC', borderRadius: '10px', border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: '11.5px', color: C.textMuted, fontWeight: 700, marginBottom: '6px' }}>Average Order Value (AOV)</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#9333EA' }}>{monthAData.name.split(' ')[0]}: ₹{monthAData.aov}</span>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: C.citrusDark }}>{monthBData.name.split(' ')[0]}: ₹{monthBData.aov}</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: '#E2E8F0', borderRadius: '9999px', overflow: 'hidden', display: 'flex' }}>
                    <div style={{ width: `${(monthAData.aov / (monthAData.aov + monthBData.aov || 1)) * 100}%`, background: '#9333EA' }} />
                    <div style={{ width: `${(monthBData.aov / (monthAData.aov + monthBData.aov || 1)) * 100}%`, background: C.citrus }} />
                  </div>
                </div>

                {/* Metric 4: Volume Dispatched */}
                <div style={{ padding: '14px', background: '#F8FAFC', borderRadius: '10px', border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: '11.5px', color: C.textMuted, fontWeight: 700, marginBottom: '6px' }}>Volume Dispatched (Kg)</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: C.amber }}>{monthAData.name.split(' ')[0]}: {monthAData.volumeKg} Kg</span>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: C.citrusDark }}>{monthBData.name.split(' ')[0]}: {monthBData.volumeKg} Kg</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: '#E2E8F0', borderRadius: '9999px', overflow: 'hidden', display: 'flex' }}>
                    <div style={{ width: `${(monthAData.volumeKg / (monthAData.volumeKg + monthBData.volumeKg || 1)) * 100}%`, background: C.amber }} />
                    <div style={{ width: `${(monthBData.volumeKg / (monthAData.volumeKg + monthBData.volumeKg || 1)) * 100}%`, background: C.citrus }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Clean Slate Notice for Historical Comparisons */}
          <div style={{
            background: '#F8FAFC',
            border: `1.5px dashed ${C.border}`,
            borderRadius: '12px',
            padding: '24px',
            textAlign: 'center',
            color: C.textMuted,
            fontSize: '12.5px'
          }}>
            🌱 <strong>Multi-Month Historical Ledger</strong>: Trend comparisons will dynamically calculate and draw seasonal growth curves as multi-month orders accumulate in the PostgreSQL database.
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: ZERO-LEAKAGE FIELD CASH & DELIVERY AUDIT
         ========================================================================= */}
      {activeTab === 'fieldCash' && (
        <div style={{
          background: C.panel,
          border: `1.5px solid ${C.border}`,
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 800, color: C.spruce, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={18} color={C.citrus} />
                <span>Zero-Leakage Field Cash & Delivery Executive Ledger</span>
              </h2>
              <p style={{ fontSize: '12px', color: C.textMuted, margin: '4px 0 0' }}>
                Real-time reconciliation of COD cash collected by delivery executives vs deposits into the hub cash vault.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ padding: '6px 12px', borderRadius: '8px', background: C.spruceSurface, color: C.spruce, fontSize: '12px', fontWeight: 800 }}>
                Settled to Vault: ₹{kpis.cashSettledToHubVault.toLocaleString('en-IN')}
              </div>
              <div style={{ padding: '6px 12px', borderRadius: '8px', background: kpis.cashInTransitWithRiders > 0 ? C.roseSurface : C.emeraldSurface, color: kpis.cashInTransitWithRiders > 0 ? C.rose : C.emerald, fontSize: '12px', fontWeight: 800 }}>
                In Transit: ₹{kpis.cashInTransitWithRiders.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          {riderLedger.length > 0 ? (
            <div style={{ overflowX: 'auto', borderRadius: '8px', border: `1.5px solid ${C.border}` }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', color: C.spruce, textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.04em' }}>
                    <th style={{ padding: '12px 16px', borderBottom: `1.5px solid ${C.border}` }}>Rider Identity & Route</th>
                    <th style={{ padding: '12px 16px', borderBottom: `1.5px solid ${C.border}`, textAlign: 'right' }}>Orders Delivered</th>
                    <th style={{ padding: '12px 16px', borderBottom: `1.5px solid ${C.border}`, textAlign: 'right' }}>COD Cash Collected</th>
                    <th style={{ padding: '12px 16px', borderBottom: `1.5px solid ${C.border}`, textAlign: 'right' }}>Settled into Vault</th>
                    <th style={{ padding: '12px 16px', borderBottom: `1.5px solid ${C.border}`, textAlign: 'right' }}>Cash in Transit</th>
                    <th style={{ padding: '12px 16px', borderBottom: `1.5px solid ${C.border}`, textAlign: 'center' }}>Vault Status</th>
                    <th style={{ padding: '12px 16px', borderBottom: `1.5px solid ${C.border}`, textAlign: 'center' }}>COD Reconciliation</th>
                    <th style={{ padding: '12px 16px', borderBottom: `1.5px solid ${C.border}`, textAlign: 'center', background: '#F0FDF4', color: '#166534' }}>Daily Driver Pay (Ledger)</th>
                  </tr>
                </thead>
                <tbody>
                  {riderLedger.map((r, idx) => (
                    <tr key={r.id || idx} style={{ borderBottom: `1px solid ${C.border}`, background: idx % 2 === 0 ? '#FFFFFF' : '#FAFAF9' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 800, color: C.text }}>{r.riderName}</div>
                        <div style={{ fontSize: '11px', color: C.textMuted }}>{r.riderPhone} • Route: {r.societyAssigned}</div>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700 }}>{r.ordersDelivered}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: C.citrusDark }}>₹{r.cashCollected.toLocaleString('en-IN')}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: C.emerald }}>₹{r.cashSettled.toLocaleString('en-IN')}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: r.cashInTransit > 0 ? C.rose : C.emerald }}>
                        ₹{r.cashInTransit.toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 800,
                          background: r.status === 'RECONCILED' ? C.emeraldSurface : C.roseSurface,
                          color: r.status === 'RECONCILED' ? C.emerald : C.rose,
                          border: `1px solid ${r.status === 'RECONCILED' ? C.emeraldBorder : C.roseBorder}`,
                        }}>
                          {r.status === 'RECONCILED' ? '✓ RECONCILED' : 'ACTION REQUIRED'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        {r.cashInTransit > 0 ? (
                          <button
                            onClick={() => handleReconcileRider(r)}
                            disabled={settlingRiderId === r.id}
                            style={{
                              padding: '5px 12px',
                              borderRadius: '6px',
                              background: C.spruce,
                              color: '#FFFFFF',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              border: 'none',
                              cursor: 'pointer',
                            }}
                          >
                            {settlingRiderId === r.id ? 'Settling...' : 'Reconcile into Vault'}
                          </button>
                        ) : (
                          <span style={{ fontSize: '11.5px', color: C.emerald, fontWeight: 700 }}>Settled</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', background: '#F9FCF9' }}>
                        {driverDailyPayouts[`${r.id || r.riderPhone}__${selectedDate || 'TODAY'}`] ? (
                          <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                            <span style={{ fontSize: '12px', background: '#DCFCE7', color: '#166534', padding: '3px 10px', borderRadius: '6px', fontWeight: 800, border: '1px solid #86EFAC' }}>
                              ✓ ₹{driverDailyPayouts[`${r.id || r.riderPhone}__${selectedDate || 'TODAY'}`].amount.toLocaleString('en-IN')} Paid
                            </span>
                            <span style={{ fontSize: '10px', color: '#64748B' }}>Recorded in Ledger</span>
                          </div>
                        ) : (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 800, color: '#64748B' }}>₹</span>
                            <input
                              type="number"
                              placeholder="2000"
                              value={driverPayoutInputs[r.id || r.riderPhone] !== undefined ? driverPayoutInputs[r.id || r.riderPhone] : 2000}
                              onChange={(e) => setDriverPayoutInputs({ ...driverPayoutInputs, [r.id || r.riderPhone]: e.target.value })}
                              style={{
                                width: '85px',
                                padding: '5px 8px',
                                border: '1.5px solid #CBD5E1',
                                borderRadius: '6px',
                                fontSize: '12.5px',
                                fontWeight: 800,
                                textAlign: 'right',
                                background: '#FFF'
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => handlePayDriverDaily(r)}
                              style={{
                                padding: '5px 14px',
                                background: '#059669',
                                color: '#FFF',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 800,
                                cursor: 'pointer',
                                boxShadow: '0 1px 3px rgba(5,150,105,0.2)'
                              }}
                            >
                              Paid
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{
              padding: '36px',
              textAlign: 'center',
              background: '#F8FAFC',
              borderRadius: '8px',
              border: `1.5px dashed ${C.border}`
            }}>
              <ShieldCheck size={32} color="#94A3B8" style={{ margin: '0 auto 8px' }} />
              <div style={{ fontSize: '14px', fontWeight: 800, color: C.text }}>0 Cash-on-Delivery Collections Recorded</div>
              <div style={{ fontSize: '12px', color: C.textMuted, marginTop: '4px' }}>
                All customer orders will automatically report doorstep cash and QR payments here for hub vault auditing.
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          PRODUCT SPEC MODAL
         ========================================================================= */}
      {selectedProduct && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px',
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            maxWidth: '620px',
            width: '100%',
            overflow: 'hidden',
            boxShadow: '0 20px 40px -15px rgba(0,0,0,0.3)',
            border: `1.5px solid ${C.border}`,
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '18px 24px',
              background: C.spruce,
              color: '#FFFFFF',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800 }}>
                  {selectedProduct.name}
                </h3>
                <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '2px' }}>
                  SKU: {selectedProduct.id} • Category: {selectedProduct.category}
                </div>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                style={{ background: 'none', border: 'none', color: '#FFFFFF', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Financial Snapshot */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '12px',
                background: C.spruceSurface,
                padding: '14px',
                borderRadius: '10px',
                border: `1px solid ${C.spruceBorder}`,
                textAlign: 'center',
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: C.spruceLight, fontWeight: 700, textTransform: 'uppercase' }}>Retail Selling Rate</div>
                  <div style={{ fontSize: '18px', fontWeight: 900, color: C.spruce }}>₹{selectedProduct.sellingRatePerKg.toFixed(2)}</div>
                  <div style={{ fontSize: '10.5px', color: C.textMuted }}>per {selectedProduct.unit}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: C.spruceLight, fontWeight: 700, textTransform: 'uppercase' }}>Mandi Sourcing Cost</div>
                  <div style={{ fontSize: '18px', fontWeight: 900, color: '#334155' }}>₹{selectedProduct.sourcingRatePerKg.toFixed(2)}</div>
                  <div style={{ fontSize: '10.5px', color: C.textMuted }}>wholesale benchmark</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: C.spruceLight, fontWeight: 700, textTransform: 'uppercase' }}>Margin Spread</div>
                  <div style={{ fontSize: '18px', fontWeight: 900, color: C.emerald }}>{selectedProduct.marginPercent.toFixed(1)}%</div>
                  <div style={{ fontSize: '10.5px', color: C.emerald, fontWeight: 700 }}>+₹{selectedProduct.marginSpreadPerKg.toFixed(2)} net</div>
                </div>
              </div>

              {/* Specifications Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12.5px' }}>
                <div style={{ padding: '10px 14px', background: '#F8FAFC', borderRadius: '8px', border: `1px solid ${C.border}` }}>
                  <div style={{ color: C.textMuted, fontSize: '11px', fontWeight: 600 }}>Farm Sourcing Origin</div>
                  <div style={{ color: C.text, fontWeight: 800, marginTop: '2px' }}>📍 {selectedProduct.origin || 'APMC Mandi Yard'}</div>
                </div>

                <div style={{ padding: '10px 14px', background: '#F8FAFC', borderRadius: '8px', border: `1px solid ${C.border}` }}>
                  <div style={{ color: C.textMuted, fontSize: '11px', fontWeight: 600 }}>Cold Storage Shelf Life</div>
                  <div style={{ color: C.text, fontWeight: 800, marginTop: '2px' }}>⏱ {selectedProduct.shelfLife || '3-5 Days'}</div>
                </div>

                <div style={{ padding: '10px 14px', background: '#F8FAFC', borderRadius: '8px', border: `1px solid ${C.border}` }}>
                  <div style={{ color: C.textMuted, fontSize: '11px', fontWeight: 600 }}>Volume Bulk Discount</div>
                  <div style={{ color: C.citrusDark, fontWeight: 800, marginTop: '2px' }}>
                    {selectedProduct.bulkMinQty > 0 ? `Min ${selectedProduct.bulkMinQty} kg → ${selectedProduct.bulkDiscountPercent}% OFF` : 'Standard Pricing'}
                  </div>
                </div>

                <div style={{ padding: '10px 14px', background: '#F8FAFC', borderRadius: '8px', border: `1px solid ${C.border}` }}>
                  <div style={{ color: C.textMuted, fontSize: '11px', fontWeight: 600 }}>Tax / GST Classification</div>
                  <div style={{ color: C.spruce, fontWeight: 800, marginTop: '2px' }}>
                    {selectedProduct.gstPercent === 0 ? '0.0% GST Exempt (Agri Fresh)' : `${selectedProduct.gstPercent}% GST`}
                  </div>
                </div>
              </div>

              {/* Order Performance summary */}
              <div style={{ padding: '12px 16px', background: '#FFFFFF', borderRadius: '8px', border: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '11px', color: C.textMuted, fontWeight: 600 }}>Dispatched Volume</div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: C.text }}>{selectedProduct.soldQtyKg} Kg delivered</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: C.textMuted, fontWeight: 600 }}>Realized Consumer Revenue</div>
                  <div style={{ fontSize: '15px', fontWeight: 900, color: C.spruce }}>₹{selectedProduct.revenue.toLocaleString('en-IN')}</div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '14px 24px', background: '#F8FAFC', borderTop: `1px solid ${C.border}`, textAlign: 'right' }}>
              <button
                onClick={() => setSelectedProduct(null)}
                style={{
                  padding: '7px 16px',
                  borderRadius: '6px',
                  background: C.spruce,
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '12.5px',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Close Spec
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
