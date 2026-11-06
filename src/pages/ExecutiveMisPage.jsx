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
  Plus,
  Camera,
  RotateCcw,
  FileText
} from 'lucide-react';
import FreshiozLogo from '../components/common/FreshiozLogo';
import { useMisAnalytics, useReconcileRiderCash, warehouses as warehouseResource, orders as orderResource } from '../hooks/resources';
import { useToast } from '../context/ToastContext';

// Clean Executive Palette for Official Brand & Audit Review
const C = {
  bg: '#FFFFFF',
  panel: '#FFFFFF',
  panelHover: '#FAFAF9',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  text: '#0F172A',
  textMuted: '#64748B',
  textDim: '#94A3B8',
  
  spruce: '#234B3C',
  spruceLight: '#2D5D4B',
  spruceSurface: '#EBF2EE',
  spruceBorder: '#A7C4B8',

  citrus: '#F28E14',
  citrusDark: '#DE7D09',
  citrusSurface: '#FFF7ED',
  citrusBorder: '#FED7AA',

  emerald: '#059669',
  emeraldSurface: '#ECFDF5',
  emeraldBorder: '#A7F3D0',

  amber: '#D97706',
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

  // Active Statutory Audit Tabs: 'stockLedger' | 'pnl' | 'driverLedger' | 'cashAudit' | 'cancellationsAudit' | 'warehouseCompare'
  const [activeTab, setActiveTab] = useState('stockLedger');

  // Produce SKU Table filters
  const [skuSearch, setSkuSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [marginTier, setMarginTier] = useState('ALL'); // 'ALL' | 'HIGH' | 'STAPLE' | 'THIN'
  const [settlingRiderId, setSettlingRiderId] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [photoPreviewModal, setPhotoPreviewModal] = useState(null);

  // Delivery Partner Date-Wise Wage Settlement State
  const [selectedPayoutDate, setSelectedPayoutDate] = useState(() => new Date().toISOString().slice(0, 10));
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
    const dateStr = selectedPayoutDate || new Date().toISOString().slice(0, 10);
    const key = `${rider.id || rider.riderPhone}__${dateStr}`;
    const newEntry = {
      id: `PAY_${Date.now()}`,
      riderId: rider.id || rider.riderPhone,
      riderName: rider.riderName,
      riderPhone: rider.riderPhone,
      amount,
      paidAt: new Date().toISOString(),
      date: dateStr,
      paidBy: 'Warehouse Operations Lead',
      ordersDelivered: rider.ordersDelivered || 0
    };
    const updated = { ...driverDailyPayouts, [key]: newEntry };
    setDriverDailyPayouts(updated);
    localStorage.setItem('freshioz_driver_payouts_ledger', JSON.stringify(updated));
    showToast(`✓ Settled ₹${amount.toLocaleString('en-IN')} wage for ${rider.riderName} (${dateStr}) into ledger!`, 'success');
  };

  // Warehouse Head-to-Head Comparison States
  const [compareHubA, setCompareHubA] = useState('');
  const [compareHubB, setCompareHubB] = useState('');

  // Live Warehouses list from database
  const { data: rawWarehouses = [] } = warehouseResource.useList();
  const warehouseList = Array.isArray(rawWarehouses) ? rawWarehouses : [];

  // Live Orders list for audit fallback
  const { data: rawOrders = [] } = orderResource.useList();
  const allOrders = Array.isArray(rawOrders) ? rawOrders : [];

  // MIS Data Hook directly connected to backend /api/mis/executive-summary
  const { 
    data: misData, 
    isLoading, 
    isFetching, 
    refetch 
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
    wholesalePurchasesTotal: 0,
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
  const warehouseBreakdown = misData?.warehouseBreakdown || [];

  // Cancelled Orders List directly from backend or fallback
  const cancelledOrders = useMemo(() => {
    if (misData?.cancelledOrdersList && misData.cancelledOrdersList.length > 0) {
      return misData.cancelledOrdersList;
    }
    return allOrders.filter(o => o.status === 'CANCELLED').map(o => {
      const [reasonText, photoProof] = (o.cancelledReason || '').split(' [PROOF_PHOTO]');
      return {
        id: o.id,
        createdAt: o.createdAt,
        cancelledAt: o.cancelledAt,
        reasonText: reasonText || 'Doorstep Delivery Exception / Refusal',
        photoProof: photoProof || null,
        totalAmount: o.totalAmount || 0,
        societyName: o.societyName || 'N/A',
        flatNo: o.flatNo || 'N/A',
        userPhone: o.userPhone || 'N/A',
        dispatchedToRiderName: o.dispatchedToRiderName || o.codCollectedBy || 'Field Driver',
        items: Array.isArray(o.items) ? o.items : []
      };
    });
  }, [misData?.cancelledOrdersList, allOrders]);

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

  // Complete Stock Summary Totals for Statutory Audit Table
  const stockSummary = useMemo(() => {
    let totalBoughtQty = 0;
    let totalPurchaseCost = 0;
    let totalSoldQty = 0;
    let totalSalesRevenue = 0;
    let totalGrossMargin = 0;
    let totalWastageQty = 0;

    filteredProducts.forEach(p => {
      const bQty = p.boughtQtyKg !== undefined ? p.boughtQtyKg : (p.sourcedQtyKg || 0);
      const bRate = p.purchaseRatePerKg !== undefined ? p.purchaseRatePerKg : (p.sourcingRatePerKg || 0);
      const bCost = p.purchaseCost !== undefined ? p.purchaseCost : Math.round(bQty * bRate);
      const sQty = p.soldQtyKg || 0;
      const sRev = p.revenue || 0;
      const margin = p.netProfitContribution !== undefined ? p.netProfitContribution : Math.round(sRev - (sQty * bRate));
      const wQty = p.wastageQtyKg !== undefined ? p.wastageQtyKg : Math.max(0, Number((bQty - sQty).toFixed(1)));

      totalBoughtQty += bQty;
      totalPurchaseCost += bCost;
      totalSoldQty += sQty;
      totalSalesRevenue += sRev;
      totalGrossMargin += margin;
      totalWastageQty += wQty;
    });

    const avgMarginPct = totalSalesRevenue > 0 ? Number(((totalGrossMargin / totalSalesRevenue) * 100).toFixed(1)) : 0;

    return {
      totalBoughtQty: Number(totalBoughtQty.toFixed(1)),
      totalPurchaseCost,
      totalSoldQty: Number(totalSoldQty.toFixed(1)),
      totalSalesRevenue,
      totalGrossMargin,
      totalWastageQty: Number(totalWastageQty.toFixed(1)),
      avgMarginPct
    };
  }, [filteredProducts]);

  // Active warehouse name helper
  const activeWarehouseName = useMemo(() => {
    if (selectedWarehouseId === 'ALL') return 'All Regional Warehouses (Consolidated Network)';
    const found = warehouseList.find(w => w.id === selectedWarehouseId);
    return found ? `${found.name} (${found.code})` : selectedWarehouseId;
  }, [selectedWarehouseId, warehouseList]);

  // Total Settled Driver Payouts
  const totalDriverWagesSettled = useMemo(() => {
    return Object.values(driverDailyPayouts).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [driverDailyPayouts]);

  // Handle Rider Cash Reconcile
  const handleReconcileRider = async (rider) => {
    try {
      setSettlingRiderId(rider.id);
      await reconcileMutation.mutateAsync({
        riderPhone: rider.riderPhone,
        amountSettled: rider.cashInTransit,
        settledBy: 'Warehouse Operations Desk',
        notes: `Reconciled from Executive MIS for ${rider.riderName}`,
      });
      showToast(`Settled ₹${rider.cashInTransit.toLocaleString('en-IN')} for ${rider.riderName} into Hub Vault!`, 'success');
      refetch();
    } catch (err) {
      showToast(err.message || 'Failed to settle rider cash', 'error');
    } finally {
      setSettlingRiderId(null);
    }
  };

  // CSV Export for Statutory Audit & Chartered Accountant Review
  const handleExportCSV = () => {
    const headers = [
      'Product SKU Code',
      'Produce Name',
      'Regional Language',
      'Category',
      'Unit',
      'Inward Bought Qty',
      'Wholesale Purchase Rate (₹)',
      'Total Purchase Cost (₹)',
      'Outward Sold Qty',
      'Selling Rate (₹)',
      'Total Sales Revenue (₹)',
      'Wastage / Unsold Qty',
      'Gross Profit Spread (₹)',
      'Gross Margin %',
      'Sourcing Origin',
      'Shelf Life'
    ];
    
    const rows = filteredProducts.map(p => {
      const bQty = p.boughtQtyKg !== undefined ? p.boughtQtyKg : (p.sourcedQtyKg || 0);
      const bRate = p.purchaseRatePerKg !== undefined ? p.purchaseRatePerKg : (p.sourcingRatePerKg || 0);
      const bCost = p.purchaseCost !== undefined ? p.purchaseCost : Math.round(bQty * bRate);
      const sQty = p.soldQtyKg || 0;
      const sRev = p.revenue || 0;
      const margin = p.netProfitContribution !== undefined ? p.netProfitContribution : Math.round(sRev - (sQty * bRate));
      const wQty = p.wastageQtyKg !== undefined ? p.wastageQtyKg : Math.max(0, Number((bQty - sQty).toFixed(1)));

      return [
        `"${p.id || ''}"`,
        `"${p.name || ''}"`,
        `"${p.kannadaName || ''}"`,
        `"${p.category || ''}"`,
        `"${p.unit || ''}"`,
        bQty,
        bRate.toFixed(2),
        bCost,
        sQty,
        (p.sellingRatePerKg || 0).toFixed(2),
        sRev,
        wQty,
        margin,
        `${(p.marginPercent || 0).toFixed(1)}%`,
        `"${p.origin || 'Direct Farm Intake'}"`,
        `"${p.shelfLife || '3-5 Days'}"`
      ];
    });

    // Add Summary Totals Row at the bottom
    rows.push([
      '"TOTAL SUMMARY"',
      `"${filteredProducts.length} Items"`,
      '""',
      '""',
      '""',
      stockSummary.totalBoughtQty,
      '""',
      stockSummary.totalPurchaseCost,
      stockSummary.totalSoldQty,
      '""',
      stockSummary.totalSalesRevenue,
      stockSummary.totalWastageQty,
      stockSummary.totalGrossMargin,
      `${stockSummary.avgMarginPct}%`,
      '""',
      '""'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Freshioz_Statutory_Stock_Ledger_${selectedWarehouseId}_${range}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClose = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/orders-fulfillment');
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
          TOP COMMAND HEADER (STATUTORY AUDIT & EXECUTIVE DESK)
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
          <FreshiozLogo height={44} showTagline={false} />

          <div style={{ borderLeft: `1.5px solid ${C.border}`, paddingLeft: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 style={{
                margin: 0,
                fontSize: '20px',
                fontWeight: 900,
                color: C.spruce,
                letterSpacing: '-0.02em',
              }}>
                Executive Financial MIS & Statutory Audit Ledger
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
                Chartered Accountant (CA) Ready
              </span>
            </div>
            <p style={{
              margin: '4px 0 0',
              fontSize: '12.5px',
              color: C.textMuted,
            }}>
              Scope: <strong style={{ color: C.spruce }}>{activeWarehouseName}</strong> • Inward Purchases, Outward Sales, Physical Stock & Cash Reconciliation
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
            title="Export CSV of stock ledger and margins"
          >
            <Download size={14} color="#334155" />
            <span>Export Stock Register</span>
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
            title="Print PDF audit report"
          >
            <Printer size={14} color="#334155" />
            <span>Print Audit Report</span>
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
          >
            <X size={14} />
            <span>Close Desk</span>
          </button>
        </div>
      </header>

      {/* =========================================================================
          CONTROL & AUDIT SCOPE BAR
         ========================================================================= */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '14px',
        background: '#F8FAFC',
        border: `1.5px solid ${C.border}`,
        borderRadius: '12px',
        padding: '12px 18px',
        marginBottom: '24px',
      }}>
        {/* Left Controls: Warehouse + Date Horizon Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          {/* Warehouse Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
          Audit Period: <span style={{ color: C.citrusDark }}>{misData?.period?.label || 'Today (Live)'}</span>
        </div>
      </div>

      {/* =========================================================================
          5 EXECUTIVE FINANCIAL KPI CARDS (AUDITED STATUTORY NUMBERS)
         ========================================================================= */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '28px',
      }}>
        {/* KPI 1: Gross Sales Revenue */}
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
              Gross Sales Revenue
            </span>
            <div style={{ padding: '6px', borderRadius: '8px', background: C.spruceSurface, color: C.spruce }}>
              <IndianRupee size={16} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 900, color: C.spruce, marginBottom: '6px' }}>
            ₹{kpis.totalGrossInflow.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '12px', color: C.textMuted, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span><strong>{kpis.totalOrdersCount}</strong> Fulfilled Orders</span>
            {kpis.cancelledOrdersCount > 0 ? (
              <span style={{ color: C.rose, fontWeight: 700, fontSize: '11px', background: C.roseSurface, padding: '1px 6px', borderRadius: '4px', border: `1px solid ${C.roseBorder}` }}>
                {kpis.cancelledOrdersCount} Cancelled (-₹{kpis.cancelledRevenue.toLocaleString('en-IN')})
              </span>
            ) : (
              <span style={{ color: C.spruce, fontWeight: 800 }}>Net Realized</span>
            )}
          </div>
          <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: `1px solid ${C.borderLight}`, fontSize: '11px', color: C.textMuted, display: 'flex', justifyContent: 'space-between' }}>
            <span>Billing: ₹{kpis.grossBillingValue.toLocaleString('en-IN')}</span>
            <span>Discounts: -₹{kpis.bulkDiscountSavings.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* KPI 2: Wholesale Purchases / Cost of Goods Sourced */}
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
              Wholesale Sourcing (COGS)
            </span>
            <div style={{ padding: '6px', borderRadius: '8px', background: C.citrusSurface, color: C.citrus }}>
              <Truck size={16} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 900, color: C.text, marginBottom: '6px' }}>
            ₹{(kpis.wholesalePurchasesTotal || kpis.totalMandiOutflow).toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '12px', color: C.textMuted, display: 'flex', justifyContent: 'space-between' }}>
            <span><strong>{kpis.procurementBillsCount}</strong> Inward Consignments</span>
            <span style={{ color: C.citrusDark, fontWeight: 800 }}>Direct Cost</span>
          </div>
          <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: `1px solid ${C.borderLight}`, fontSize: '11px', color: C.textMuted, display: 'flex', justifyContent: 'space-between' }}>
            <span>Produce: ₹{kpis.produceProcuredAmount.toLocaleString('en-IN')}</span>
            <span>Inward Freight: ₹{kpis.freightLogisticsAmount.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* KPI 3: Gross Trading Profit */}
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
              Gross Trading Profit
            </span>
            <div style={{ padding: '6px', borderRadius: '8px', background: C.emeraldSurface, color: C.emerald }}>
              <Scale size={16} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 900, color: C.emerald, marginBottom: '6px' }}>
            ₹{kpis.grossMarginSpread.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '12px', color: C.textMuted, display: 'flex', justifyContent: 'space-between' }}>
            <span>Gross Margin: <strong style={{ color: C.emerald }}>{kpis.grossMarginPercent}%</strong></span>
            <span>Volume: <strong>{kpis.totalProduceDispatchedKg} kg</strong></span>
          </div>
          <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: `1px solid ${C.borderLight}`, fontSize: '11px', color: C.textMuted }}>
            Sales Revenue minus Direct Wholesale Produce Cost
          </div>
        </div>

        {/* KPI 4: Net Operating Profit */}
        <div style={{
          background: C.panel,
          border: `1.5px solid ${C.border}`,
          borderRadius: '12px',
          padding: '18px 20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: '#3B82F6' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#1D4ED8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Net Operating Profit
            </span>
            <div style={{ padding: '6px', borderRadius: '8px', background: '#EFF6FF', color: '#2563EB' }}>
              <TrendingUp size={16} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 900, color: '#1E293B', marginBottom: '6px' }}>
            ₹{kpis.netOperatingProfit.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '12px', color: C.textMuted, display: 'flex', justifyContent: 'space-between' }}>
            <span>Net Margin: <strong style={{ color: '#1D4ED8' }}>{kpis.netProfitPercent}%</strong></span>
            <span>Commissions: ₹{kpis.societyCommissionsEarned.toLocaleString('en-IN')}</span>
          </div>
          <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: `1px solid ${C.borderLight}`, fontSize: '11px', color: C.textMuted }}>
            Trading Profit after Driver Wages & Society Commissions
          </div>
        </div>

        {/* KPI 5: Field Cash Collected & Vault Inflow */}
        <div style={{
          background: C.panel,
          border: `1.5px solid ${C.border}`,
          borderRadius: '12px',
          padding: '18px 20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: kpis.cashInTransitWithRiders > 0 ? C.rose : C.emerald }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: C.spruce, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Field Cash Vault Inflow
            </span>
            <div style={{ padding: '6px', borderRadius: '8px', background: C.spruceSurface, color: C.spruce }}>
              <Wallet size={16} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 900, color: C.text, marginBottom: '6px' }}>
            ₹{kpis.doorstepCashCollected.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '12px', color: C.textMuted, display: 'flex', justifyContent: 'space-between' }}>
            <span>Vault Settled: <strong style={{ color: C.emerald }}>₹{kpis.cashSettledToHubVault.toLocaleString('en-IN')}</strong></span>
            <span style={{ color: kpis.cashInTransitWithRiders > 0 ? C.rose : C.emerald, fontWeight: 700 }}>
              {kpis.cashInTransitWithRiders > 0 ? `In Transit: ₹${kpis.cashInTransitWithRiders}` : '✓ Reconciled'}
            </span>
          </div>
          <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: `1px solid ${C.borderLight}`, fontSize: '11px', color: C.textMuted }}>
            Cash collected at doorstep by delivery partners
          </div>
        </div>
      </div>

      {/* =========================================================================
          STATUTORY AUDIT & EXECUTIVE NAVIGATION TABS
         ========================================================================= */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        borderBottom: `2px solid ${C.border}`,
        marginBottom: '24px',
        paddingBottom: '2px',
        flexWrap: 'wrap'
      }}>
        {/* Tab 1: Product Stock & Trading Ledger */}
        <button
          onClick={() => setActiveTab('stockLedger')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            fontSize: '13.5px',
            fontWeight: 800,
            cursor: 'pointer',
            borderBottom: activeTab === 'stockLedger' ? `3px solid ${C.spruce}` : '3px solid transparent',
            color: activeTab === 'stockLedger' ? C.spruce : C.textMuted,
            background: 'none',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            transition: 'color 0.15s ease',
          }}
        >
          <Scale size={16} color={activeTab === 'stockLedger' ? C.spruce : C.textMuted} />
          <span>Produce Stock & Trading Ledger ({productEconomics.length} SKUs)</span>
        </button>

        {/* Tab 2: Financial P&L Statement */}
        <button
          onClick={() => setActiveTab('pnl')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            fontSize: '13.5px',
            fontWeight: 800,
            cursor: 'pointer',
            borderBottom: activeTab === 'pnl' ? `3px solid ${C.spruce}` : '3px solid transparent',
            color: activeTab === 'pnl' ? C.spruce : C.textMuted,
            background: 'none',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            transition: 'color 0.15s ease',
          }}
        >
          <FileText size={16} color={activeTab === 'pnl' ? C.spruce : C.textMuted} />
          <span>Financial P&L Statement (CA Review)</span>
        </button>

        {/* Tab 3: Delivery Partner Wage Ledger */}
        <button
          onClick={() => setActiveTab('driverLedger')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            fontSize: '13.5px',
            fontWeight: 800,
            cursor: 'pointer',
            borderBottom: activeTab === 'driverLedger' ? `3px solid ${C.citrusDark}` : '3px solid transparent',
            color: activeTab === 'driverLedger' ? C.citrusDark : C.textMuted,
            background: 'none',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            transition: 'color 0.15s ease',
          }}
        >
          <Truck size={16} color={activeTab === 'driverLedger' ? C.citrusDark : C.textMuted} />
          <span>Delivery Partner Daily Wage Ledger</span>
        </button>

        {/* Tab 4: Field Cash & Vault Audit */}
        <button
          onClick={() => setActiveTab('cashAudit')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            fontSize: '13.5px',
            fontWeight: 800,
            cursor: 'pointer',
            borderBottom: activeTab === 'cashAudit' ? `3px solid ${C.emerald}` : '3px solid transparent',
            color: activeTab === 'cashAudit' ? C.emerald : C.textMuted,
            background: 'none',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            transition: 'color 0.15s ease',
          }}
        >
          <ShieldCheck size={16} color={activeTab === 'cashAudit' ? C.emerald : C.textMuted} />
          <span>Field Cash & Vault Reconciliation</span>
        </button>

        {/* Tab 5: Cancelled Orders & Wastage Audit */}
        <button
          onClick={() => setActiveTab('cancellationsAudit')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            fontSize: '13.5px',
            fontWeight: 800,
            cursor: 'pointer',
            borderBottom: activeTab === 'cancellationsAudit' ? `3px solid ${C.rose}` : '3px solid transparent',
            color: activeTab === 'cancellationsAudit' ? C.rose : C.textMuted,
            background: 'none',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            transition: 'color 0.15s ease',
          }}
        >
          <RotateCcw size={16} color={activeTab === 'cancellationsAudit' ? C.rose : C.textMuted} />
          <span>Cancelled Orders & Wastage Audit ({cancelledOrders.length})</span>
        </button>

        {/* Tab 6: Warehouse Hub Performance */}
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
          <span>Warehouse Hubs ({warehouseList.length})</span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: COMPLETE PRODUCT STOCK & TRADING RECONCILIATION LEDGER
          ("How much bought, how much sold, and each product")
         ========================================================================= */}
      {activeTab === 'stockLedger' && (
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
                  placeholder="Search produce name, Kannada name, SKU code..."
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

          {/* Complete Itemized Stock & Trading Table */}
          <div style={{ overflowX: 'auto', borderRadius: '8px', border: `1.5px solid ${C.border}` }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', color: C.spruce, textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '12px 14px', borderBottom: `1.5px solid ${C.border}`, fontWeight: 800 }}>Produce Item & SKU</th>
                  <th style={{ padding: '12px 14px', borderBottom: `1.5px solid ${C.border}`, fontWeight: 800 }}>Category & Unit</th>
                  <th style={{ padding: '12px 14px', borderBottom: `1.5px solid ${C.border}`, textAlign: 'right', fontWeight: 800, background: '#EFF6FF', color: '#1E40AF' }}>Inward Bought Qty</th>
                  <th style={{ padding: '12px 14px', borderBottom: `1.5px solid ${C.border}`, textAlign: 'right', fontWeight: 800, background: '#EFF6FF', color: '#1E40AF' }}>Purchase Rate</th>
                  <th style={{ padding: '12px 14px', borderBottom: `1.5px solid ${C.border}`, textAlign: 'right', fontWeight: 800, background: '#EFF6FF', color: '#1E40AF' }}>Total Purchase Cost</th>
                  <th style={{ padding: '12px 14px', borderBottom: `1.5px solid ${C.border}`, textAlign: 'right', fontWeight: 800, background: '#F0FDF4', color: '#166534' }}>Outward Sold Qty</th>
                  <th style={{ padding: '12px 14px', borderBottom: `1.5px solid ${C.border}`, textAlign: 'right', fontWeight: 800, background: '#F0FDF4', color: '#166534' }}>Selling Rate</th>
                  <th style={{ padding: '12px 14px', borderBottom: `1.5px solid ${C.border}`, textAlign: 'right', fontWeight: 800, background: '#F0FDF4', color: '#166534' }}>Total Sales Revenue</th>
                  <th style={{ padding: '12px 14px', borderBottom: `1.5px solid ${C.border}`, textAlign: 'right', fontWeight: 800, color: '#DC2626' }}>Wastage / Unsold</th>
                  <th style={{ padding: '12px 14px', borderBottom: `1.5px solid ${C.border}`, textAlign: 'right', fontWeight: 800 }}>Gross Margin (₹)</th>
                  <th style={{ padding: '12px 14px', borderBottom: `1.5px solid ${C.border}`, textAlign: 'center', fontWeight: 800 }}>Margin %</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p, idx) => {
                  const bQty = p.boughtQtyKg !== undefined ? p.boughtQtyKg : (p.sourcedQtyKg || 0);
                  const bRate = p.purchaseRatePerKg !== undefined ? p.purchaseRatePerKg : (p.sourcingRatePerKg || 0);
                  const bCost = p.purchaseCost !== undefined ? p.purchaseCost : Math.round(bQty * bRate);
                  const sQty = p.soldQtyKg || 0;
                  const sRev = p.revenue || 0;
                  const margin = p.netProfitContribution !== undefined ? p.netProfitContribution : Math.round(sRev - (sQty * bRate));
                  const wQty = p.wastageQtyKg !== undefined ? p.wastageQtyKg : Math.max(0, Number((bQty - sQty).toFixed(1)));
                  const isHighMargin = p.marginPercent >= 35;
                  const isThinMargin = p.marginPercent < 20;

                  return (
                    <tr
                      key={p.id || idx}
                      onClick={() => setSelectedProduct(p)}
                      style={{
                        borderBottom: `1px solid ${C.border}`,
                        background: idx % 2 === 0 ? '#FFFFFF' : '#FAFAF9',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease',
                      }}
                      title="Click to view full specifications"
                    >
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 800, color: C.text, fontSize: '13px' }}>
                          {p.name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace' }}>
                            {p.id}
                          </span>
                          {p.kannadaName && (
                            <span style={{ fontSize: '11px', color: C.spruce, fontWeight: 700, background: C.spruceSurface, padding: '1px 5px', borderRadius: '4px' }}>
                              {p.kannadaName}
                            </span>
                          )}
                        </div>
                      </td>

                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 700, color: C.text }}>{p.category}</div>
                        <div style={{ fontSize: '11px', color: C.textMuted }}>per {p.unit}</div>
                      </td>

                      {/* Inward Bought Qty */}
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, background: '#F8FAFC', color: '#1E40AF', fontFamily: 'monospace' }}>
                        {bQty} {p.unit}
                      </td>

                      {/* Purchase Rate */}
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, background: '#F8FAFC', color: '#1E40AF' }}>
                        ₹{bRate.toFixed(2)}
                      </td>

                      {/* Total Purchase Cost */}
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, background: '#F8FAFC', color: '#1E3A8A' }}>
                        ₹{bCost.toLocaleString('en-IN')}
                      </td>

                      {/* Outward Sold Qty */}
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, background: '#F0FDF4', color: '#166534', fontFamily: 'monospace' }}>
                        {sQty} {p.unit}
                      </td>

                      {/* Selling Rate */}
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, background: '#F0FDF4', color: '#166534' }}>
                        ₹{(p.sellingRatePerKg || 0).toFixed(2)}
                      </td>

                      {/* Total Sales Revenue */}
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 900, background: '#F0FDF4', color: C.spruce }}>
                        ₹{sRev.toLocaleString('en-IN')}
                      </td>

                      {/* Wastage / Unsold */}
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: wQty > 0 ? '#DC2626' : '#64748B' }}>
                        {wQty > 0 ? `${wQty} ${p.unit}` : '0'}
                      </td>

                      {/* Gross Margin */}
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 900, color: margin >= 0 ? C.emerald : C.rose }}>
                        {margin >= 0 ? `+₹${margin.toLocaleString('en-IN')}` : `-₹${Math.abs(margin).toLocaleString('en-IN')}`}
                      </td>

                      {/* Margin % */}
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 800,
                          background: isHighMargin ? C.emeraldSurface : (isThinMargin ? C.roseSurface : C.citrusSurface),
                          color: isHighMargin ? C.emerald : (isThinMargin ? C.rose : C.citrusDark),
                          border: `1px solid ${isHighMargin ? C.emeraldBorder : (isThinMargin ? C.roseBorder : C.citrusBorder)}`,
                        }}>
                          {(p.marginPercent || 0).toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              
              {/* STATUTORY AUDIT SUMMARY TOTALS ROW */}
              <tfoot>
                <tr style={{ background: '#F1F5F9', borderTop: `2px solid ${C.spruce}`, fontWeight: 900, fontSize: '12.5px', color: C.text }}>
                  <td style={{ padding: '12px 14px' }}>
                    TOTAL RECONCILIATION
                  </td>
                  <td style={{ padding: '12px 14px', color: C.textMuted }}>
                    {filteredProducts.length} Items
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'monospace', color: '#1E40AF', background: '#DBEAFE' }}>
                    {stockSummary.totalBoughtQty.toLocaleString('en-IN')}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', background: '#DBEAFE', color: '#64748B' }}>
                    —
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'monospace', color: '#1E3A8A', background: '#DBEAFE' }}>
                    ₹{stockSummary.totalPurchaseCost.toLocaleString('en-IN')}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'monospace', color: '#166534', background: '#DCFCE7' }}>
                    {stockSummary.totalSoldQty.toLocaleString('en-IN')}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', background: '#DCFCE7', color: '#64748B' }}>
                    —
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'monospace', color: C.spruce, background: '#DCFCE7' }}>
                    ₹{stockSummary.totalSalesRevenue.toLocaleString('en-IN')}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'monospace', color: '#DC2626' }}>
                    {stockSummary.totalWastageQty.toLocaleString('en-IN')}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'monospace', color: C.emerald }}>
                    +₹{stockSummary.totalGrossMargin.toLocaleString('en-IN')}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'center', color: C.emerald }}>
                    {stockSummary.avgMarginPct}%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: STATUTORY FINANCIAL P&L STATEMENT (CHARTERED ACCOUNTANT REVIEW)
         ========================================================================= */}
      {activeTab === 'pnl' && (
        <div style={{
          background: C.panel,
          border: `1.5px solid ${C.border}`,
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          maxWidth: '960px',
          margin: '0 auto'
        }}>
          <div style={{ borderBottom: `2px solid ${C.spruce}`, paddingBottom: '14px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 900, color: C.spruce, margin: 0 }}>
                Income Statement / Operating P&L Ledger
              </h2>
              <div style={{ fontSize: '12px', color: C.textMuted, marginTop: '2px' }}>
                Scope: {activeWarehouseName} • Period: {misData?.period?.label || 'Today (Live)'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              style={{ padding: '6px 14px', background: C.spruce, color: '#FFF', borderRadius: '6px', fontSize: '12px', fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Printer size={14} />
              <span>Print Statement</span>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* PART 1: REVENUE FROM OPERATIONS */}
            <div style={{ border: `1px solid ${C.border}`, borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ background: '#F8FAFC', padding: '10px 16px', fontWeight: 800, fontSize: '13px', color: C.spruce, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                1. Revenue from Operations
              </div>
              <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: C.text }}>
                  <span>Gross Produce Invoiced Billing to Residents:</span>
                  <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>₹{kpis.grossBillingValue.toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#DC2626' }}>
                  <span>Less: Customer Bulk Savings & Promotions:</span>
                  <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>-₹{kpis.bulkDiscountSavings.toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#2563EB' }}>
                  <span>Add: Doorstep Resident Delivery Fees:</span>
                  <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>+₹{kpis.deliveryFeesCollected.toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1.5px solid ${C.border}`, paddingTop: '8px', fontWeight: 900, color: C.spruce, fontSize: '14px' }}>
                  <span>Net Revenue from Operations (A):</span>
                  <span style={{ fontFamily: 'monospace' }}>₹{kpis.totalGrossInflow.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* PART 2: COST OF GOODS SOURCED (COGS) */}
            <div style={{ border: `1px solid ${C.border}`, borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ background: '#F8FAFC', padding: '10px 16px', fontWeight: 800, fontSize: '13px', color: C.citrusDark, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                2. Cost of Goods Sourced (COGS)
              </div>
              <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: C.text }}>
                  <span>Direct Farm / Wholesale Produce Purchases:</span>
                  <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>₹{kpis.produceProcuredAmount.toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: C.text }}>
                  <span>Inward Freight & Logistics Transport:</span>
                  <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>₹{kpis.freightLogisticsAmount.toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1.5px solid ${C.border}`, paddingTop: '8px', fontWeight: 900, color: C.citrusDark, fontSize: '14px' }}>
                  <span>Total Direct Sourcing Cost (B):</span>
                  <span style={{ fontFamily: 'monospace' }}>₹{(kpis.wholesalePurchasesTotal || kpis.totalMandiOutflow).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* PART 3: GROSS TRADING PROFIT */}
            <div style={{ background: '#ECFDF5', border: `1.5px solid #86EFAC`, borderRadius: '10px', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 900, color: '#166534' }}>
                  3. Gross Trading Margin (A - B)
                </div>
                <div style={{ fontSize: '11.5px', color: '#15803D' }}>
                  Realized Trading Profit Spread on Fulfilled Produce
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '20px', fontWeight: 900, color: '#166534', fontFamily: 'monospace' }}>
                  ₹{kpis.grossMarginSpread.toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#15803D' }}>
                  {kpis.grossMarginPercent}% of Net Revenue
                </div>
              </div>
            </div>

            {/* PART 4: DIRECT OPERATING DISBURSEMENTS */}
            <div style={{ border: `1px solid ${C.border}`, borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ background: '#F8FAFC', padding: '10px 16px', fontWeight: 800, fontSize: '13px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                4. Direct Operating Expenses & Disbursements
              </div>
              <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: C.text }}>
                  <span>Delivery Partner Daily Wages (Settled into Ledger):</span>
                  <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>₹{totalDriverWagesSettled.toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: C.text }}>
                  <span>Gated Society Association Facility Commissions:</span>
                  <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>₹{kpis.societyCommissionsEarned.toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#DC2626' }}>
                  <span>Wastage & Produce Spoilage Write-Off:</span>
                  <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>₹{Math.round(stockSummary.totalWastageQty * 20).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* PART 5: NET OPERATING PROFIT (EBITDA) */}
            <div style={{ background: '#EFF6FF', border: `1.5px solid #93C5FD`, borderRadius: '10px', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 900, color: '#1E40AF' }}>
                  5. Net Operating Profit (EBITDA)
                </div>
                <div style={{ fontSize: '11.5px', color: '#3B82F6' }}>
                  Statutory EBITDA after wholesale cost, driver pay & society revenue-share
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '22px', fontWeight: 900, color: '#1E40AF', fontFamily: 'monospace' }}>
                  ₹{kpis.netOperatingProfit.toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#2563EB' }}>
                  {kpis.netProfitPercent}% Net Operating Margin
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: DELIVERY PARTNER DAILY WAGE LEDGER (DATE-WISE)
          ("For Delivery person it should show day wise who and how much were delivered and beside that amount field where they will enter and click paid thats it")
         ========================================================================= */}
      {activeTab === 'driverLedger' && (
        <div style={{
          background: C.panel,
          border: `1.5px solid ${C.border}`,
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}>
          {/* Header & Date Selector */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px', borderBottom: `1px solid ${C.border}`, paddingBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 900, color: C.spruce, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Truck size={20} color={C.citrusDark} />
                <span>Delivery Partner Daily Wage Desk & Ledger</span>
              </h2>
              <p style={{ fontSize: '12px', color: C.textMuted, margin: '4px 0 0' }}>
                Review active delivery executives by date, verify drops delivered, enter daily wage (e.g. ₹2,000), and click Paid to record into ledger.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '12.5px', fontWeight: 700, color: C.textMuted }}>Shift Date:</span>
              <input
                type="date"
                value={selectedPayoutDate}
                onChange={(e) => setSelectedPayoutDate(e.target.value)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: `1.5px solid ${C.border}`,
                  fontSize: '12.5px',
                  fontWeight: 700,
                  color: C.spruce,
                  background: '#FFF'
                }}
              />
            </div>
          </div>

          {/* Table of Drivers for Selected Date */}
          <div style={{ overflowX: 'auto', borderRadius: '8px', border: `1.5px solid ${C.border}`, marginBottom: '24px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', color: C.spruce, textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '12px 16px', borderBottom: `1.5px solid ${C.border}` }}>Delivery Partner Name & Mobile</th>
                  <th style={{ padding: '12px 16px', borderBottom: `1.5px solid ${C.border}` }}>Assigned Route / Society</th>
                  <th style={{ padding: '12px 16px', borderBottom: `1.5px solid ${C.border}`, textAlign: 'center' }}>Completed Drops</th>
                  <th style={{ padding: '12px 16px', borderBottom: `1.5px solid ${C.border}`, textAlign: 'center', background: '#F0FDF4', color: '#166534' }}>Daily Wage Amount (₹)</th>
                  <th style={{ padding: '12px 16px', borderBottom: `1.5px solid ${C.border}`, textAlign: 'center', background: '#F0FDF4', color: '#166534' }}>Action & Status</th>
                </tr>
              </thead>
              <tbody>
                {riderLedger.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ padding: '30px', textAlign: 'center', color: C.textMuted }}>
                      No active delivery partner runs recorded for this date.
                    </td>
                  </tr>
                ) : (
                  riderLedger.map((r, idx) => {
                    const payoutKey = `${r.id || r.riderPhone}__${selectedPayoutDate}`;
                    const isPaid = Boolean(driverDailyPayouts[payoutKey]);
                    const paidData = driverDailyPayouts[payoutKey];
                    const inputVal = driverPayoutInputs[r.id || r.riderPhone] !== undefined ? driverPayoutInputs[r.id || r.riderPhone] : 2000;

                    return (
                      <tr key={r.id || idx} style={{ borderBottom: `1px solid ${C.border}`, background: idx % 2 === 0 ? '#FFFFFF' : '#FAFAF9' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 800, color: C.text, fontSize: '13.5px' }}>{r.riderName}</div>
                          <div style={{ fontSize: '11.5px', color: C.textMuted }}>{r.riderPhone}</div>
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>
                          {r.societyAssigned}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 800, color: C.spruce, fontSize: '14px' }}>
                          {r.ordersDelivered} drops
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', background: '#F9FCF9' }}>
                          {isPaid ? (
                            <span style={{ fontSize: '14px', fontWeight: 900, color: '#166534', fontFamily: 'monospace' }}>
                              ₹{paidData.amount.toLocaleString('en-IN')}
                            </span>
                          ) : (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ fontSize: '13px', fontWeight: 800, color: '#64748B' }}>₹</span>
                              <input
                                type="number"
                                value={inputVal}
                                onChange={(e) => setDriverPayoutInputs({ ...driverPayoutInputs, [r.id || r.riderPhone]: e.target.value })}
                                style={{
                                  width: '90px',
                                  padding: '5px 8px',
                                  border: '1.5px solid #CBD5E1',
                                  borderRadius: '6px',
                                  fontSize: '13px',
                                  fontWeight: 800,
                                  textAlign: 'right',
                                  background: '#FFF'
                                }}
                              />
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', background: '#F9FCF9' }}>
                          {isPaid ? (
                            <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                              <span style={{ fontSize: '12px', background: '#DCFCE7', color: '#166534', padding: '4px 12px', borderRadius: '999px', fontWeight: 800, border: '1px solid #86EFAC', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <Check size={14} />
                                <span>Paid (Recorded in Ledger)</span>
                              </span>
                              <span style={{ fontSize: '10.5px', color: '#64748B' }}>
                                at {new Date(paidData.paidAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handlePayDriverDaily(r)}
                              style={{
                                padding: '6px 16px',
                                background: '#059669',
                                color: '#FFFFFF',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '12.5px',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              <Check size={14} />
                              <span>Paid</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Signed Historical Ledger Table */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: C.spruce, margin: 0 }}>
                Signed Delivery Partner Wage Settlement Ledger
              </h3>
              <span style={{ fontSize: '12px', color: C.textMuted }}>
                Total Disbursed: <strong style={{ color: C.emerald }}>₹{totalDriverWagesSettled.toLocaleString('en-IN')}</strong>
              </span>
            </div>

            <div style={{ overflowX: 'auto', borderRadius: '8px', border: `1px solid ${C.border}` }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', color: '#475569', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.04em' }}>
                    <th style={{ padding: '8px 12px', borderBottom: `1px solid ${C.border}` }}>Date</th>
                    <th style={{ padding: '8px 12px', borderBottom: `1px solid ${C.border}` }}>Driver Name</th>
                    <th style={{ padding: '8px 12px', borderBottom: `1px solid ${C.border}` }}>Mobile</th>
                    <th style={{ padding: '8px 12px', borderBottom: `1px solid ${C.border}`, textAlign: 'right' }}>Drops Completed</th>
                    <th style={{ padding: '8px 12px', borderBottom: `1px solid ${C.border}`, textAlign: 'right' }}>Amount Paid (₹)</th>
                    <th style={{ padding: '8px 12px', borderBottom: `1px solid ${C.border}` }}>Settled At</th>
                    <th style={{ padding: '8px 12px', borderBottom: `1px solid ${C.border}`, textAlign: 'center' }}>Audit Status</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.values(driverDailyPayouts).length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ padding: '20px', textAlign: 'center', color: C.textMuted }}>
                        No settled payouts recorded yet. Enter wage amount above and click Paid.
                      </td>
                    </tr>
                  ) : (
                    Object.values(driverDailyPayouts).map((entry, idx) => (
                      <tr key={idx} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: '8px 12px', fontWeight: 700, color: C.spruce }}>{entry.date}</td>
                        <td style={{ padding: '8px 12px', fontWeight: 700 }}>{entry.riderName}</td>
                        <td style={{ padding: '8px 12px', color: C.textMuted }}>{entry.riderPhone}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700 }}>{entry.ordersDelivered} drops</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 800, color: '#166534', fontFamily: 'monospace' }}>
                          ₹{Number(entry.amount).toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '8px 12px', color: '#64748B', fontSize: '11.5px' }}>
                          {new Date(entry.paidAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                          <span style={{ background: '#DCFCE7', color: '#166534', padding: '2px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 800 }}>
                            ✓ SETTLED
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: FIELD CASH & VAULT RECONCILIATION
         ========================================================================= */}
      {activeTab === 'cashAudit' && (
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
                <span>Field Cash & Warehouse Hub Vault Settlement</span>
              </h2>
              <p style={{ fontSize: '12px', color: C.textMuted, margin: '4px 0 0' }}>
                Reconciliation of physical COD cash collected at resident doors vs physical cash deposited into the hub vault.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ padding: '6px 12px', borderRadius: '8px', background: C.spruceSurface, color: C.spruce, fontSize: '12px', fontWeight: 800 }}>
                Vault Reconciled: ₹{kpis.cashSettledToHubVault.toLocaleString('en-IN')}
              </div>
              <div style={{ padding: '6px 12px', borderRadius: '8px', background: kpis.cashInTransitWithRiders > 0 ? C.roseSurface : C.emeraldSurface, color: kpis.cashInTransitWithRiders > 0 ? C.rose : C.emerald, fontSize: '12px', fontWeight: 800 }}>
                Cash with Riders: ₹{kpis.cashInTransitWithRiders.toLocaleString('en-IN')}
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
                    <th style={{ padding: '12px 16px', borderBottom: `1.5px solid ${C.border}`, textAlign: 'right' }}>Cash with Rider</th>
                    <th style={{ padding: '12px 16px', borderBottom: `1.5px solid ${C.border}`, textAlign: 'center' }}>Vault Status</th>
                    <th style={{ padding: '12px 16px', borderBottom: `1.5px solid ${C.border}`, textAlign: 'center' }}>Hub Deposit Action</th>
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
                            {settlingRiderId === r.id ? 'Settling...' : 'Deposit into Vault'}
                          </button>
                        ) : (
                          <span style={{ fontSize: '11.5px', color: C.emerald, fontWeight: 700 }}>Vault Reconciled</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '30px', color: C.textMuted }}>
              No cash delivery runs recorded for this filter scope.
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 5: CANCELLED ORDERS & SPOILAGE AUDIT TRAIL
         ========================================================================= */}
      {activeTab === 'cancellationsAudit' && (
        <div style={{
          background: C.panel,
          border: `1.5px solid ${C.border}`,
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#991B1B', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <RotateCcw size={18} color="#DC2626" />
                <span>Cancelled Orders & Produce Spoilage Audit Trail</span>
              </h2>
              <p style={{ fontSize: '12px', color: C.textMuted, margin: '4px 0 0' }}>
                Complete statutory audit register of doorstep refusals, reasons from standardized dropdown, and photographic proof taken by delivery partners.
              </p>
            </div>

            <div style={{ padding: '6px 14px', borderRadius: '999px', background: '#FEE2E2', color: '#991B1B', fontSize: '12px', fontWeight: 800, border: '1px solid #FECACA' }}>
              {cancelledOrders.length} Cancelled Order(s)
            </div>
          </div>

          <div style={{ overflowX: 'auto', borderRadius: '8px', border: `1.5px solid ${C.border}` }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', color: '#475569', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '10px 14px', borderBottom: `1.5px solid ${C.border}` }}>Order ID & Date</th>
                  <th style={{ padding: '10px 14px', borderBottom: `1.5px solid ${C.border}` }}>Customer Location</th>
                  <th style={{ padding: '10px 14px', borderBottom: `1.5px solid ${C.border}` }}>Delivery Partner</th>
                  <th style={{ padding: '10px 14px', borderBottom: `1.5px solid ${C.border}`, textAlign: 'right' }}>Order Amount</th>
                  <th style={{ padding: '10px 14px', borderBottom: `1.5px solid ${C.border}` }}>Cancellation Reason (Dropdown)</th>
                  <th style={{ padding: '10px 14px', borderBottom: `1.5px solid ${C.border}`, textAlign: 'center' }}>Photo Proof</th>
                </tr>
              </thead>
              <tbody>
                {cancelledOrders.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: C.textMuted }}>
                      No cancelled orders found in this period.
                    </td>
                  </tr>
                ) : (
                  cancelledOrders.map((ord, idx) => (
                    <tr key={ord.id || idx} style={{ borderBottom: `1px solid ${C.border}`, background: idx % 2 === 0 ? '#FFFFFF' : '#FAFAF9' }}>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 800, color: C.text }}>#{ord.id}</div>
                        <div style={{ fontSize: '11px', color: C.textMuted }}>
                          {ord.cancelledAt ? new Date(ord.cancelledAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : 'Today'}
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 700, color: C.text }}>{ord.societyName}</div>
                        <div style={{ fontSize: '11px', color: C.textMuted }}>Flat: {ord.flatNo}</div>
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: '#334155' }}>
                        {ord.dispatchedToRiderName || 'Delivery Partner'}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, color: '#DC2626', fontFamily: 'monospace' }}>
                        ₹{(ord.totalAmount || 0).toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: '#991B1B' }}>
                        {ord.reasonText || 'Customer Refused / Door Locked'}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        {ord.photoProof ? (
                          <button
                            type="button"
                            onClick={() => setPhotoPreviewModal({ photo: ord.photoProof, title: `Order #${ord.id} Photo Proof`, reason: ord.reasonText })}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              background: '#EFF6FF',
                              border: '1px solid #BFDBFE',
                              color: '#1D4ED8',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <Camera size={13} />
                            <span>View Photo</span>
                          </button>
                        ) : (
                          <span style={{ fontSize: '11px', color: '#94A3B8', fontStyle: 'italic' }}>
                            None attached
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 6: WAREHOUSE HUB BENCHMARKING
         ========================================================================= */}
      {activeTab === 'warehouseCompare' && (
        <div style={{
          background: C.panel,
          border: `1.5px solid ${C.border}`,
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}>
          <h2 style={{ fontSize: '16px', fontWeight: 800, color: C.spruce, marginBottom: '16px' }}>
            Regional Warehouse Hub Network Comparison
          </h2>
          <div style={{ overflowX: 'auto', borderRadius: '8px', border: `1px solid ${C.border}` }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', color: C.spruce, textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '12px 16px', borderBottom: `1.5px solid ${C.border}` }}>Hub Code & Name</th>
                  <th style={{ padding: '12px 16px', borderBottom: `1.5px solid ${C.border}` }}>Location</th>
                  <th style={{ padding: '12px 16px', borderBottom: `1.5px solid ${C.border}`, textAlign: 'right' }}>Active Societies</th>
                  <th style={{ padding: '12px 16px', borderBottom: `1.5px solid ${C.border}`, textAlign: 'right' }}>Orders Fulfilled</th>
                  <th style={{ padding: '12px 16px', borderBottom: `1.5px solid ${C.border}`, textAlign: 'right' }}>Volume Dispatched (kg)</th>
                  <th style={{ padding: '12px 16px', borderBottom: `1.5px solid ${C.border}`, textAlign: 'right' }}>Revenue Realized (₹)</th>
                  <th style={{ padding: '12px 16px', borderBottom: `1.5px solid ${C.border}`, textAlign: 'right' }}>Wholesale Sourcing Spend (₹)</th>
                  <th style={{ padding: '12px 16px', borderBottom: `1.5px solid ${C.border}`, textAlign: 'center' }}>Gross Margin %</th>
                </tr>
              </thead>
              <tbody>
                {warehouseBreakdown.map((w, idx) => (
                  <tr key={w.id || idx} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: '12px 16px', fontWeight: 800, color: C.text }}>
                      {w.name} <span style={{ color: C.textMuted, fontWeight: 500 }}>({w.code || w.id})</span>
                    </td>
                    <td style={{ padding: '12px 16px', color: C.textMuted }}>{w.location}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700 }}>{w.societiesCount}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700 }}>{w.orderCount}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700 }}>{w.volumeDispatchedKg} kg</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: C.spruce }}>₹{w.revenue.toLocaleString('en-IN')}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: C.citrusDark }}>₹{w.procurementSpend.toLocaleString('en-IN')}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 800, color: C.emerald }}>{w.marginPercent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: FULL HIGH-RES PHOTO PROOF VIEWER
         ========================================================================= */}
      {photoPreviewModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px',
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            maxWidth: '600px',
            width: '100%',
            overflow: 'hidden',
            border: `1.5px solid ${C.border}`,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, background: '#F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '14px', fontWeight: 800, color: C.spruce, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Camera size={16} color="#DC2626" />
                <span>{photoPreviewModal.title}</span>
              </div>
              <button
                type="button"
                onClick={() => setPhotoPreviewModal(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '12px 18px', background: '#FEF2F2', borderBottom: `1px solid #FECACA`, fontSize: '12.5px', color: '#991B1B', fontWeight: 700 }}>
              Exception Reason: {photoPreviewModal.reason}
            </div>
            <div style={{ padding: '16px', textAlign: 'center', background: '#0F172A' }}>
              <img
                src={photoPreviewModal.photo}
                alt="Doorstep Photo Proof"
                style={{ maxWidth: '100%', maxHeight: '65vh', borderRadius: '8px', objectFit: 'contain' }}
              />
            </div>
            <div style={{ padding: '12px 18px', display: 'flex', justifyContent: 'flex-end', background: '#F8FAFC', borderTop: `1px solid ${C.border}` }}>
              <button
                type="button"
                onClick={() => setPhotoPreviewModal(null)}
                style={{ padding: '6px 16px', background: C.spruce, color: '#FFF', borderRadius: '6px', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
              >
                Close Proof
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: PRODUCT SPECIFICATION & SOURCING DETAILS
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

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                  <div style={{ fontSize: '11px', color: C.spruceLight, fontWeight: 700, textTransform: 'uppercase' }}>Selling Rate</div>
                  <div style={{ fontSize: '18px', fontWeight: 900, color: C.spruce }}>₹{(selectedProduct.sellingRatePerKg || 0).toFixed(2)}</div>
                  <div style={{ fontSize: '10.5px', color: C.textMuted }}>per {selectedProduct.unit}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: C.spruceLight, fontWeight: 700, textTransform: 'uppercase' }}>Purchase Rate</div>
                  <div style={{ fontSize: '18px', fontWeight: 900, color: '#334155' }}>₹{(selectedProduct.purchaseRatePerKg || selectedProduct.sourcingRatePerKg || 0).toFixed(2)}</div>
                  <div style={{ fontSize: '10.5px', color: C.textMuted }}>wholesale cost</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: C.spruceLight, fontWeight: 700, textTransform: 'uppercase' }}>Trading Margin</div>
                  <div style={{ fontSize: '18px', fontWeight: 900, color: C.emerald }}>{(selectedProduct.marginPercent || 0).toFixed(1)}%</div>
                  <div style={{ fontSize: '10.5px', color: C.emerald, fontWeight: 700 }}>+₹{(selectedProduct.marginSpreadPerKg || 0).toFixed(2)} net</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12.5px' }}>
                <div style={{ padding: '10px 14px', background: '#F8FAFC', borderRadius: '8px', border: `1px solid ${C.border}` }}>
                  <div style={{ color: C.textMuted, fontSize: '11px', fontWeight: 600 }}>Sourcing Origin</div>
                  <div style={{ color: C.text, fontWeight: 800, marginTop: '2px' }}>📍 {selectedProduct.origin || 'Direct Farm Intake'}</div>
                </div>

                <div style={{ padding: '10px 14px', background: '#F8FAFC', borderRadius: '8px', border: `1px solid ${C.border}` }}>
                  <div style={{ color: C.textMuted, fontSize: '11px', fontWeight: 600 }}>Shelf Life</div>
                  <div style={{ color: C.text, fontWeight: 800, marginTop: '2px' }}>⏱ {selectedProduct.shelfLife || '3-5 Days'}</div>
                </div>
              </div>

              <div style={{ padding: '12px 16px', background: '#FFFFFF', borderRadius: '8px', border: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '11px', color: C.textMuted, fontWeight: 600 }}>Fulfilled Volume</div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: C.text }}>{selectedProduct.soldQtyKg} {selectedProduct.unit} delivered</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: C.textMuted, fontWeight: 600 }}>Realized Consumer Revenue</div>
                  <div style={{ fontSize: '15px', fontWeight: 900, color: C.spruce }}>₹{(selectedProduct.revenue || 0).toLocaleString('en-IN')}</div>
                </div>
              </div>
            </div>

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
