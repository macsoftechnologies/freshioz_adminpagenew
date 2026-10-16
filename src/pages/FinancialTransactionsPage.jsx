import React, { useState, useMemo, useEffect } from 'react';
import { 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Wallet, 
  Truck, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Search, 
  Filter, 
  Download, 
  FileText, 
  Building2, 
  User, 
  Calendar, 
  CreditCard, 
  Receipt,
  Store,
  Layers,
  ArrowRight,
  ShieldCheck,
  Coins
} from 'lucide-react';
import { useAdminRole } from '../context/AdminRoleContext';
import { useToast } from '../context/ToastContext';
import { saveFreshiozStore } from '../shared/freshiozStore';
import { exportToExcel } from '../utils/excelExporter';

const HASH_TAB_MAP = {
  '#all': 'ALL',
  '#inflows': 'INFLOWS',
  '#outflows': 'OUTFLOWS',
  '#rider-settlement': 'RIDER_SETTLEMENT'
};

const TAB_HASH_MAP = {
  'ALL': '#all',
  'INFLOWS': '#inflows',
  'OUTFLOWS': '#outflows',
  'RIDER_SETTLEMENT': '#rider-settlement'
};

const getTabFromHash = () => {
  if (typeof window === 'undefined') return 'ALL';
  const hash = window.location.hash.toLowerCase();
  return HASH_TAB_MAP[hash] || 'ALL';
};

export default function FinancialTransactionsPage() {
  const { store, currentUser } = useAdminRole();
  const { showToast } = useToast();

  const orders = store.orders || [];
  const procurementLogs = store.procurementLogs || [];
  const withdrawals = store.withdrawals || [];
  const employees = store.employees || [];

  const [activeTab, setActiveTab] = useState(getTabFromHash);
  const [confirmDepositModal, setConfirmDepositModal] = useState(null); // { name, pendingHandoverAmount, totalStops, orderIds }
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState('ALL'); // 'ALL' | 'ONLINE' | 'COD_CASH' | 'COD_UPI' | 'MANDI_EXPENSE'
  const [filterSociety, setFilterSociety] = useState('ALL');
  const [datePreset, setDatePreset] = useState('ALL'); // 'ALL' | 'TODAY' | 'YESTERDAY' | 'WEEK' | 'CUSTOM'
  const [customDate, setCustomDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [selectedReceiptLog, setSelectedReceiptLog] = useState(null);

  // Sync state with URL hash
  useEffect(() => {
    const handleHashChange = () => {
      const tab = getTabFromHash();
      setActiveTab(tab);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleSwitchTab = (tabKey) => {
    setActiveTab(tabKey);
    const targetHash = TAB_HASH_MAP[tabKey] || '#all';
    window.history.replaceState(null, '', targetHash);
  };

  // 1. INFLOWS: Customer Orders Payments
  const customerPayments = useMemo(() => {
    return orders.map(order => {
      const isCod = (order.paymentMethod || '').includes('PAY_ON_DELIVERY') || order.paymentMethod === 'COD';
      const isPaid = order.paymentStatus === 'PAID' || order.codPaymentReceived || order.status === 'DELIVERED';
      const receivedMode = order.codReceivedMode || (isCod ? 'CASH' : 'ONLINE_GATEWAY');
      
      return {
        id: order.id,
        refType: 'CUSTOMER_ORDER',
        transactionType: 'INFLOW',
        date: order.createdAt || order.orderPlacedAt || new Date().toISOString(),
        deliveryDate: order.deliveryDate,
        amount: Number(order.totalAmount) || 0,
        subtotal: Number(order.subtotal) || 0,
        deliveryFee: Number(order.deliveryFee) || 0,
        customerName: order.userName || order.customerName || 'Resident Customer',
        customerPhone: order.userPhone,
        societyName: order.societyName || 'Greenfield Heights',
        flatNo: order.flatNo || order.flatNumber || 'Drop Desk',
        paymentMethod: order.paymentMethod || 'UPI / Prepaid',
        isCod,
        isPaid,
        receivedMode,
        collectedBy: isCod 
          ? (order.codCollectedBy || 'Assigned Delivery Partner') 
          : 'Razorpay Auto-Settlement Gateway',
        collectedAt: order.codCollectedAt || order.deliveredAt || order.createdAt,
        isSettledToHub: !!order.codSettledToHub,
        settledAt: order.codSettledAt,
        settledBy: order.codSettledBy,
        itemsCount: (order.items || []).length,
        status: order.status
      };
    });
  }, [orders]);

  // 2. OUTFLOWS: Mandi Procurement Spend
  const procurementExpenses = useMemo(() => {
    return procurementLogs.map(log => ({
      id: log.billNumber ? `MB-${log.billNumber}` : log.id,
      originalId: log.id,
      refType: 'MANDI_PURCHASE',
      transactionType: 'OUTFLOW',
      date: log.date || log.timestamp || new Date().toISOString(),
      amount: Number(log.totalAmountPaid || log.totalSpend || 0),
      produceSpend: Number(log.produceAmount || 0),
      transportCharge: Number(log.transportCharge || 0),
      mandiLocation: log.mandiName || log.mandiLocation || 'APMC Mandi Auction Yard',
      vendorName: log.vendorName || 'APMC Commission Agent',
      officerName: log.loggedByOfficerName || log.procurementOfficer || 'Procurement Officer',
      officerId: log.loggedByOfficerId,
      paymentMode: log.paymentMode || 'NEFT / RTGS Transfer',
      receiptPhoto: log.receiptPhoto,
      totalWeightKg: log.totalWeightKg || log.totalQuantityKg || 0,
      items: log.items || [],
      destinationWarehouse: log.destinationName || 'Central Warehouse Hub'
    }));
  }, [procurementLogs]);

  // 3. OUTFLOWS: Society Commission / Cashback Withdrawals
  const societyPayoutOutflows = useMemo(() => {
    return withdrawals.map(w => ({
      id: w.id,
      refType: 'SOCIETY_PAYOUT',
      transactionType: 'OUTFLOW',
      date: w.requestedDate || new Date().toISOString(),
      amount: Number(w.amount || 0),
      societyName: w.societyName || 'Community Network',
      purpose: w.purpose || 'Society Community Welfare Fund',
      bankAccount: w.bankAccount,
      ifsc: w.ifsc,
      status: w.status,
      handledBy: 'Super Admin Finance Desk'
    }));
  }, [withdrawals]);

  // Unified Chronological Ledger
  const allLedgerTransactions = useMemo(() => {
    const combined = [
      ...customerPayments.map(p => ({
        ...p,
        displayCategory: 'Customer Order Revenue',
        party: `${p.customerName} (${p.societyName})`,
        flowType: 'INWARD'
      })),
      ...procurementExpenses.map(e => ({
        ...e,
        displayCategory: 'APMC Mandi Fresh Produce Purchase',
        party: `${e.vendorName} • ${e.mandiLocation}`,
        flowType: 'OUTWARD'
      })),
      ...societyPayoutOutflows.map(s => ({
        ...s,
        displayCategory: 'Society Community Wallet Disbursal',
        party: s.societyName,
        flowType: 'OUTWARD'
      }))
    ];

    return combined.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [customerPayments, procurementExpenses, societyPayoutOutflows]);

  // Filtered Ledger
  const filteredTransactions = useMemo(() => {
    return allLedgerTransactions.filter(item => {
      // Tab filter
      if (activeTab === 'INFLOWS' && item.flowType !== 'INWARD') return false;
      if (activeTab === 'OUTFLOWS' && item.flowType !== 'OUTWARD') return false;

      // Mode filter
      if (filterMode === 'ONLINE' && (!item.paymentMethod || item.isCod)) return false;
      if (filterMode === 'COD_CASH' && (item.receivedMode !== 'CASH' || !item.isCod)) return false;
      if (filterMode === 'COD_UPI' && (item.receivedMode !== 'UPI_QR' || !item.isCod)) return false;
      if (filterMode === 'MANDI_EXPENSE' && item.refType !== 'MANDI_PURCHASE') return false;

      // Society filter
      if (filterSociety !== 'ALL' && item.societyName !== filterSociety) return false;

      // Date range filter
      if (datePreset !== 'ALL') {
        const itemDateStr = (item.date || '').slice(0, 10);
        const todayStr = new Date().toISOString().slice(0, 10);

        if (datePreset === 'TODAY' && itemDateStr !== todayStr) return false;
        if (datePreset === 'YESTERDAY') {
          const y = new Date();
          y.setDate(y.getDate() - 1);
          if (itemDateStr !== y.toISOString().slice(0, 10)) return false;
        }
        if (datePreset === 'WEEK') {
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          if (new Date(item.date || 0).getTime() < weekAgo.getTime()) return false;
        }
        if (datePreset === 'MONTH') {
          if (!itemDateStr.startsWith(todayStr.slice(0, 7))) return false;
        }
        if (datePreset === 'CUSTOM' && customDate && itemDateStr !== customDate) return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesId = String(item.id).toLowerCase().includes(q);
        const matchesParty = String(item.party || '').toLowerCase().includes(q);
        const matchesCollector = String(item.collectedBy || item.officerName || '').toLowerCase().includes(q);
        const matchesSoc = String(item.societyName || '').toLowerCase().includes(q);
        if (!matchesId && !matchesParty && !matchesCollector && !matchesSoc) return false;
      }

      return true;
    });
  }, [allLedgerTransactions, activeTab, filterMode, filterSociety, datePreset, customDate, searchTerm]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, filterMode, filterSociety, datePreset, customDate, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, currentPage, pageSize]);

  // Dynamic Period Totals for active date filter
  const periodStats = useMemo(() => {
    let inflows = 0;
    let outflows = 0;
    let onlineAmount = 0;
    let codCashAmount = 0;
    let codUpiAmount = 0;
    let mandiSpend = 0;

    filteredTransactions.forEach(t => {
      const amt = Number(t.amount) || 0;
      if (t.flowType === 'INWARD') {
        inflows += amt;
        if (t.isCod) {
          if (t.receivedMode === 'CASH') codCashAmount += amt;
          else codUpiAmount += amt;
        } else {
          onlineAmount += amt;
        }
      } else {
        outflows += amt;
        if (t.refType === 'MANDI_PURCHASE') mandiSpend += amt;
      }
    });

    return {
      inflows,
      outflows,
      net: inflows - outflows,
      onlineAmount,
      codCashAmount,
      codUpiAmount,
      mandiSpend
    };
  }, [filteredTransactions]);

  const datePresetLabel = useMemo(() => {
    if (datePreset === 'TODAY') return 'Today';
    if (datePreset === 'YESTERDAY') return 'Yesterday';
    if (datePreset === 'WEEK') return 'This Week (Past 7 Days)';
    if (datePreset === 'MONTH') return 'This Month';
    if (datePreset === 'CUSTOM') return customDate ? `Date: ${customDate}` : 'Custom Date';
    return 'All Time';
  }, [datePreset, customDate]);

  // RIDER CASH IN HAND BREAKDOWN
  const riderCashSettlementSummary = useMemo(() => {
    const riderMap = {};
    
    customerPayments.filter(p => p.isCod).forEach(p => {
      const riderKey = p.collectedBy || 'Unassigned Delivery Partner';
      if (!riderMap[riderKey]) {
        riderMap[riderKey] = {
          name: riderKey,
          totalStops: 0,
          totalCodAmount: 0,
          cashInHand: 0,
          upiQrAmount: 0,
          settledToHubAmount: 0,
          pendingHandoverAmount: 0,
          orderIds: []
        };
      }

      riderMap[riderKey].totalStops += 1;
      riderMap[riderKey].totalCodAmount += p.amount;
      riderMap[riderKey].orderIds.push(p.id);

      if (p.receivedMode === 'CASH') {
        riderMap[riderKey].cashInHand += p.amount;
        if (p.isSettledToHub) {
          riderMap[riderKey].settledToHubAmount += p.amount;
        } else {
          riderMap[riderKey].pendingHandoverAmount += p.amount;
        }
      } else {
        riderMap[riderKey].upiQrAmount += p.amount;
      }
    });

    return Object.values(riderMap);
  }, [customerPayments]);

  // Top KPIs
  const totalInflows = customerPayments.filter(p => p.isPaid).reduce((sum, p) => sum + p.amount, 0);
  const totalOnlineInflow = customerPayments.filter(p => p.isPaid && !p.isCod).reduce((sum, p) => sum + p.amount, 0);
  const totalCodCollected = customerPayments.filter(p => p.isPaid && p.isCod).reduce((sum, p) => sum + p.amount, 0);
  const totalPendingCodToCollect = customerPayments.filter(p => !p.isPaid && p.isCod).reduce((sum, p) => sum + p.amount, 0);

  const totalMandiSpent = procurementExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalSocietyPayoutsSpent = societyPayoutOutflows.filter(s => s.status === 'APPROVED' || s.status === 'PAID').reduce((sum, s) => sum + s.amount, 0);
  const totalOutflows = totalMandiSpent + totalSocietyPayoutsSpent;
  const netPlatformCashflow = totalInflows - totalOutflows;

  const totalRiderCashPendingDeposit = riderCashSettlementSummary.reduce((sum, r) => sum + r.pendingHandoverAmount, 0);

  // Mark Rider Cash Settled to Hub Desk
  const handleSettleRiderCash = (riderName) => {
    saveFreshiozStore(prev => ({
      ...prev,
      orders: (prev.orders || []).map(o => {
        const isMatchedRider = (o.codCollectedBy || 'Assigned Delivery Partner') === riderName;
        const isCodCash = ((o.paymentMethod || '').includes('PAY_ON_DELIVERY') || o.paymentMethod === 'COD') && (o.codReceivedMode === 'CASH' || !o.codReceivedMode);
        if (isMatchedRider && isCodCash && !o.codSettledToHub) {
          return {
            ...o,
            codSettledToHub: true,
            codSettledAt: new Date().toISOString(),
            codSettledBy: currentUser?.name || 'Hub Cashier Desk'
          };
        }
        return o;
      })
    }));

    showToast(`✓ Cash collected by ${riderName} successfully reconciled and deposited at Hub Cashier Desk!`, 'success');
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = ['Transaction Ref', 'Flow Type', 'Category', 'Party / Source', 'Amount (INR)', 'Payment Mode', 'Collector / Officer', 'Date', 'Status'];
    const rows = filteredTransactions.map(t => [
      t.id,
      t.flowType,
      t.displayCategory,
      `"${t.party || ''}"`,
      t.amount,
      `"${t.paymentMethod || t.paymentMode || ''}"`,
      `"${t.collectedBy || t.officerName || ''}"`,
      t.date,
      t.status || 'SUCCESS'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Freshioz_Financial_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Financial transactions audit ledger exported as CSV.', 'success');
  };

  // Export Excel (.xlsx formatted)
  const handleExportExcelLedger = () => {
    const headers = [
      'Transaction Ref',
      'Timestamp / Date',
      'Flow Type',
      'Category',
      'Party / Customer / Vendor',
      'Society / Location',
      'Amount (INR)',
      'Subtotal / Produce (INR)',
      'Delivery / Transport (INR)',
      'Payment Mode',
      'Received Mode',
      'Collector / Approver',
      'Settlement Status'
    ];

    const rows = filteredTransactions.map(t => [
      t.id,
      t.date ? new Date(t.date).toLocaleString('en-IN') : 'N/A',
      t.flowType === 'INWARD' ? 'INFLOW (Revenue)' : 'OUTFLOW (Expense)',
      t.displayCategory,
      t.party || t.customerName || t.vendorName || 'Freshioz Network',
      t.societyName || t.mandiLocation || 'Central Warehouse Hub',
      t.amount,
      t.subtotal || t.produceSpend || t.amount,
      t.deliveryFee || t.transportCharge || 0,
      t.paymentMethod || t.paymentMode || 'Net Banking',
      t.receivedMode === 'UPI_QR' ? 'UPI QR' : t.receivedMode === 'CASH' ? 'Cash' : 'Online Gateway',
      t.collectedBy || t.officerName || 'Finance Controller',
      t.isCod ? (t.isSettledToHub ? 'Deposited at Hub Cashier' : 'Pending Rider Deposit') : 'Bank Reconciled'
    ]);

    exportToExcel(`Freshioz_Financial_Ledger_${activeTab}`, headers, rows);
    showToast(`✓ Exported ${rows.length} records to Excel!`, 'success');
  };

  return (
    <div className="admin-page-container">
      {/* Page Header */}
      <div className="page-title-header" style={{ marginBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Receipt size={22} color="#059669" />
            <span>End-to-End Financial & Payment Transactions Ledger</span>
          </h1>
          <p style={{ fontSize: '12.5px', color: '#64748B', margin: '3px 0 0' }}>
            Complete audit trail of all customer revenue inflows, COD cash handovers, APMC Mandi spend, and community payouts.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleExportExcelLedger}
            className="admin-btn-accent"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '7px 14px', borderRadius: '8px' }}
          >
            <Download size={14} />
            <span>Export Excel (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="admin-btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '7px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFF' }}
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 5-Column Financial Overview Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '12px',
        marginBottom: '16px'
      }}>
        {/* 1. Total Customer Inflows */}
        <div 
          onClick={() => handleSwitchTab('INFLOWS')}
          style={{ 
            background: activeTab === 'INFLOWS' ? '#F0FDF4' : '#FFFFFF', 
            border: activeTab === 'INFLOWS' ? '2px solid #059669' : '1.5px solid #A7F3D0', 
            borderRadius: '12px', 
            padding: '14px', 
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          title="Click to view Customer Inflows tab (#inflows)"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#065F46', textTransform: 'uppercase' }}>Customer Payments Inward</span>
            <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#DCFCE7', color: '#166534', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowDownLeft size={15} />
            </div>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 900, color: '#065F46' }}>
            ₹{totalInflows.toLocaleString()}
          </div>
          <div style={{ fontSize: '11px', color: '#047857', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
            <span>Online: ₹{totalOnlineInflow.toLocaleString()}</span>
            <span>COD: ₹{totalCodCollected.toLocaleString()}</span>
          </div>
        </div>

        {/* 2. Total Mandi & Ops Spend */}
        <div 
          onClick={() => handleSwitchTab('OUTFLOWS')}
          style={{ 
            background: activeTab === 'OUTFLOWS' ? '#FEF2F2' : '#FFFFFF', 
            border: activeTab === 'OUTFLOWS' ? '2px solid #DC2626' : '1.5px solid #FECACA', 
            borderRadius: '12px', 
            padding: '14px', 
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          title="Click to view Mandi & Ops Outflows tab (#outflows)"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#991B1B', textTransform: 'uppercase' }}>APMC Mandi Purchases</span>
            <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#FEE2E2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowUpRight size={15} />
            </div>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 900, color: '#991B1B' }}>
            ₹{totalMandiSpent.toLocaleString()}
          </div>
          <div style={{ fontSize: '11px', color: '#B91C1C', marginTop: '4px' }}>
            {procurementExpenses.length} Mandi Bills • {procurementExpenses.reduce((s, e) => s + e.totalWeightKg, 0)} kg produce
          </div>
        </div>

        {/* 3. Community Payouts */}
        <div 
          onClick={() => handleSwitchTab('OUTFLOWS')}
          style={{ 
            background: '#FFFFFF', 
            border: '1.5px solid #FDE68A', 
            borderRadius: '12px', 
            padding: '14px', 
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          title="Click to view Outflows & Withdrawals (#outflows)"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#92400E', textTransform: 'uppercase' }}>Society Payouts</span>
            <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Coins size={15} />
            </div>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 900, color: '#92400E' }}>
            ₹{totalSocietyPayoutsSpent.toLocaleString()}
          </div>
          <div style={{ fontSize: '11px', color: '#B45309', marginTop: '4px' }}>
            Community cashback withdrawals
          </div>
        </div>

        {/* 4. Net Operating Cashflow */}
        <div 
          onClick={() => handleSwitchTab('ALL')}
          style={{ 
            background: activeTab === 'ALL' ? '#F8FAFC' : '#FFFFFF', 
            border: activeTab === 'ALL' ? '2px solid #334155' : '1.5px solid #CBD5E1', 
            borderRadius: '12px', 
            padding: '14px', 
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          title="Click to view All Transactions (#all)"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#334155', textTransform: 'uppercase' }}>Net Cash Balance</span>
            <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#F1F5F9', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Wallet size={15} />
            </div>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 900, color: netPlatformCashflow >= 0 ? '#059669' : '#DC2626' }}>
            ₹{netPlatformCashflow.toLocaleString()}
          </div>
          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
            Inflows minus Purchases & Payouts
          </div>
        </div>

        {/* 5. Rider Cash-in-Hand Settlement */}
        <div 
          onClick={() => handleSwitchTab('RIDER_SETTLEMENT')}
          style={{ 
            background: activeTab === 'RIDER_SETTLEMENT' ? '#FFFBEB' : '#FFFFFF', 
            border: activeTab === 'RIDER_SETTLEMENT' ? '2px solid #D97706' : (totalRiderCashPendingDeposit > 0 ? '1.5px solid #F59E0B' : '1.5px solid #E2E8F0'), 
            borderRadius: '12px', 
            padding: '14px', 
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          title="Click to view Rider Cash Settlement Desk (#rider-settlement)"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#78350F', textTransform: 'uppercase' }}>Rider Cash in Hand</span>
            <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#FEF3C7', color: '#B45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Truck size={15} />
            </div>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 900, color: totalRiderCashPendingDeposit > 0 ? '#B45309' : '#059669' }}>
            ₹{totalRiderCashPendingDeposit.toLocaleString()}
          </div>
          <div style={{ fontSize: '11px', color: '#78350F', marginTop: '4px' }}>
            {totalRiderCashPendingDeposit > 0 ? '⚠️ Pending Cashier Deposit' : '✓ All Cash Deposited'}
          </div>
        </div>
      </div>

      {/* Tabs & Filter Bar */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '12px',
        padding: '12px 16px',
        marginBottom: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        {/* Row 1: Date Quick Filter Pills + Calendar Picker + Period Summary Metric */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => { setDatePreset('TODAY'); setCustomDate(''); }}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                border: datePreset === 'TODAY' ? '1.5px solid #059669' : '1px solid #CBD5E1',
                background: datePreset === 'TODAY' ? '#ECFDF5' : '#FFFFFF',
                color: datePreset === 'TODAY' ? '#065F46' : '#475569',
                fontWeight: 800,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <span>Today</span>
              {datePreset === 'TODAY' && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#059669' }} />}
            </button>

            <button
              type="button"
              onClick={() => { setDatePreset('YESTERDAY'); setCustomDate(''); }}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                border: datePreset === 'YESTERDAY' ? '1.5px solid #059669' : '1px solid #CBD5E1',
                background: datePreset === 'YESTERDAY' ? '#ECFDF5' : '#FFFFFF',
                color: datePreset === 'YESTERDAY' ? '#065F46' : '#475569',
                fontWeight: 800,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <span>Yesterday</span>
              {datePreset === 'YESTERDAY' && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#059669' }} />}
            </button>

            <button
              type="button"
              onClick={() => { setDatePreset('WEEK'); setCustomDate(''); }}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                border: datePreset === 'WEEK' ? '1.5px solid #059669' : '1px solid #CBD5E1',
                background: datePreset === 'WEEK' ? '#ECFDF5' : '#FFFFFF',
                color: datePreset === 'WEEK' ? '#065F46' : '#475569',
                fontWeight: 800,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <span>This Week (7 Days)</span>
              {datePreset === 'WEEK' && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#059669' }} />}
            </button>

            <button
              type="button"
              onClick={() => { setDatePreset('MONTH'); setCustomDate(''); }}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                border: datePreset === 'MONTH' ? '1.5px solid #059669' : '1px solid #CBD5E1',
                background: datePreset === 'MONTH' ? '#ECFDF5' : '#FFFFFF',
                color: datePreset === 'MONTH' ? '#065F46' : '#475569',
                fontWeight: 800,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <span>This Month</span>
              {datePreset === 'MONTH' && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#059669' }} />}
            </button>

            <button
              type="button"
              onClick={() => { setDatePreset('ALL'); setCustomDate(''); }}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                border: datePreset === 'ALL' ? '1.5px solid #059669' : '1px solid #CBD5E1',
                background: datePreset === 'ALL' ? '#ECFDF5' : '#FFFFFF',
                color: datePreset === 'ALL' ? '#065F46' : '#475569',
                fontWeight: 800,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <span>All Time</span>
              {datePreset === 'ALL' && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#059669' }} />}
            </button>

            {/* Custom Single Day Calendar Picker */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '6px' }}>
              <Calendar size={14} color="#059669" />
              <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600 }}>Calendar:</span>
              <input
                type="date"
                value={customDate}
                onChange={(e) => {
                  if (e.target.value) {
                    setCustomDate(e.target.value);
                    setDatePreset('CUSTOM');
                  }
                }}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: datePreset === 'CUSTOM' ? '1.5px solid #059669' : '1.5px solid #CBD5E1',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  color: '#0F172A',
                  background: datePreset === 'CUSTOM' ? '#ECFDF5' : '#FFFFFF',
                  cursor: 'pointer'
                }}
              />
            </div>
          </div>

          {/* Dynamic Period Metric Badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11.5px', background: '#F1F5F9', color: '#334155', padding: '3px 8px', borderRadius: '6px', fontWeight: 700 }}>
              {datePresetLabel}: {filteredTransactions.length} records
            </span>
            <span style={{ fontSize: '11.5px', background: '#ECFDF5', color: '#065F46', padding: '3px 8px', borderRadius: '6px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              <ArrowDownLeft size={11} /> Inflows: ₹{periodStats.inflows.toLocaleString()}
            </span>
            <span style={{ fontSize: '11.5px', background: '#FEF2F2', color: '#991B1B', padding: '3px 8px', borderRadius: '6px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              <ArrowUpRight size={11} /> Outflows: ₹{periodStats.outflows.toLocaleString()}
            </span>
            <span style={{
              fontSize: '11.5px',
              background: periodStats.net >= 0 ? '#EBF2EE' : '#FEE2E2',
              color: periodStats.net >= 0 ? '#234B3C' : '#DC2626',
              padding: '3px 8px',
              borderRadius: '6px',
              fontWeight: 800
            }}>
              Net: ₹{periodStats.net.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Row 2: Desk Tabs & Search */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', borderTop: '1px solid #F1F5F9', paddingTop: '10px' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => handleSwitchTab('ALL')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'ALL' ? '#234B3C' : '#F1F5F9',
                color: activeTab === 'ALL' ? '#FFFFFF' : '#475569',
                fontWeight: 800,
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              All Transactions ({allLedgerTransactions.length})
            </button>

            <button
              type="button"
              onClick={() => handleSwitchTab('INFLOWS')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'INFLOWS' ? '#059669' : '#F1F5F9',
                color: activeTab === 'INFLOWS' ? '#FFFFFF' : '#475569',
                fontWeight: 800,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <ArrowDownLeft size={13} />
              <span>Customer Inflows ({customerPayments.length})</span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchTab('OUTFLOWS')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'OUTFLOWS' ? '#DC2626' : '#F1F5F9',
                color: activeTab === 'OUTFLOWS' ? '#FFFFFF' : '#475569',
                fontWeight: 800,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <ArrowUpRight size={13} />
              <span>Mandi & Operations Outflows ({procurementExpenses.length + societyPayoutOutflows.length})</span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchTab('RIDER_SETTLEMENT')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'RIDER_SETTLEMENT' ? '#D97706' : '#F1F5F9',
                color: activeTab === 'RIDER_SETTLEMENT' ? '#FFFFFF' : '#475569',
                fontWeight: 800,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Truck size={13} />
              <span>Rider Cash Settlement Desk ({riderCashSettlementSummary.length})</span>
              {totalRiderCashPendingDeposit > 0 && (
                <span style={{ background: '#DC2626', color: '#FFF', fontSize: '10px', padding: '1px 6px', borderRadius: '9999px', fontWeight: 900 }}>
                  ₹{totalRiderCashPendingDeposit.toLocaleString()}
                </span>
              )}
            </button>
          </div>

          {/* Quick Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '4px 10px', minWidth: '240px' }}>
            <Search size={14} color="#64748B" />
            <input
              type="text"
              placeholder="Search by Order #, Bill #, Customer, Rider..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '12px', width: '100%' }}
            />
          </div>
        </div>

        {/* Row 3: Secondary Filters: Payment Mode & Society Network */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', borderTop: '1px solid #F1F5F9', paddingTop: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={13} color="#64748B" />
            <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569' }}>Payment Mode:</label>
            <select
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value)}
              style={{ padding: '3px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '11.5px', fontWeight: 700, background: '#F8FAFC' }}
            >
              <option value="ALL">All Payment Channels</option>
              <option value="ONLINE">Prepaid Online (UPI / NetBanking / Cards)</option>
              <option value="COD_CASH">COD (Physical Cash Handover)</option>
              <option value="COD_UPI">COD (Rider UPI QR Scanned)</option>
              <option value="MANDI_EXPENSE">Mandi Bank Transfers & Invoices</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Building2 size={13} color="#64748B" />
            <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569' }}>Society Network:</label>
            <select
              value={filterSociety}
              onChange={(e) => setFilterSociety(e.target.value)}
              style={{ padding: '3px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '11.5px', fontWeight: 700, background: '#F8FAFC' }}
            >
              <option value="ALL">All Communities</option>
              {(store.societies || []).map(s => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>

          {(datePreset !== 'ALL' || filterMode !== 'ALL' || filterSociety !== 'ALL' || searchTerm.trim()) && (
            <button
              type="button"
              onClick={() => {
                setDatePreset('ALL');
                setCustomDate('');
                setFilterMode('ALL');
                setFilterSociety('ALL');
                setSearchTerm('');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#DC2626',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
                padding: '2px 6px',
                textDecoration: 'underline'
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* TAB 4: RIDER CASH SETTLEMENT DESK */}
      {activeTab === 'RIDER_SETTLEMENT' ? (
        <div className="admin-table-card">
          <div className="admin-table-header">
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Delivery Executive COD Cash Reconciliation & Deposit Desk
              </h3>
              <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>
                Track cash in hand collected by delivery partners at society drop desks and reconcile deposits with Central Hub Cashier.
              </p>
            </div>
            <span style={{ fontSize: '12px', fontWeight: 800, background: '#FEF3C7', color: '#B45309', padding: '3px 10px', borderRadius: '6px' }}>
              Pending Handover: ₹{totalRiderCashPendingDeposit.toLocaleString()}
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>Delivery Partner (Rider)</th>
                  <th>COD Stops Handled</th>
                  <th>Total Collected</th>
                  <th>UPI QR Scanned</th>
                  <th>Physical Cash in Hand</th>
                  <th>Reconciliation Status</th>
                  <th style={{ textAlign: 'right' }}>Cashier Action</th>
                </tr>
              </thead>
              <tbody>
                {riderCashSettlementSummary.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#64748B' }}>
                      No Cash on Delivery orders recorded yet today.
                    </td>
                  </tr>
                ) : (
                  riderCashSettlementSummary.map((rider, idx) => (
                    <tr key={idx}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#E0F2FE', color: '#0369A1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '12px' }}>
                            <Truck size={15} />
                          </div>
                          <div>
                            <strong style={{ fontSize: '13.5px', color: '#0F172A' }}>{rider.name}</strong>
                            <div style={{ fontSize: '11px', color: '#64748B' }}>Order Stops: #{rider.orderIds.join(', #')}</div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <strong style={{ color: '#0F172A', fontSize: '13px' }}>{rider.totalStops} Drops</strong>
                      </td>

                      <td>
                        <strong style={{ color: '#0F172A', fontSize: '14px' }}>₹{rider.totalCodAmount.toLocaleString()}</strong>
                      </td>

                      <td>
                        <span style={{ color: '#0284C7', fontWeight: 700, fontSize: '13px' }}>
                          ₹{rider.upiQrAmount.toLocaleString()}
                        </span>
                        <div style={{ fontSize: '10.5px', color: '#64748B' }}>Bank Auto-Settled</div>
                      </td>

                      <td>
                        <span style={{ color: '#B91C1C', fontWeight: 800, fontSize: '14px' }}>
                          ₹{rider.cashInHand.toLocaleString()}
                        </span>
                      </td>

                      <td>
                        {rider.pendingHandoverAmount === 0 ? (
                          <span style={{ fontSize: '11px', background: '#DCFCE7', color: '#15803D', fontWeight: 800, padding: '3px 8px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <CheckCircle2 size={12} />
                            <span>✓ Reconciled with Hub</span>
                          </span>
                        ) : (
                          <span style={{ fontSize: '11px', background: '#FEF2F2', color: '#991B1B', fontWeight: 800, padding: '3px 8px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <AlertCircle size={12} />
                            <span>Deposit Pending: ₹{rider.pendingHandoverAmount.toLocaleString()}</span>
                          </span>
                        )}
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        {rider.pendingHandoverAmount > 0 ? (
                          <button
                            type="button"
                            onClick={() => setConfirmDepositModal(rider)}
                            className="admin-btn-accent"
                            style={{ fontSize: '11.5px', padding: '5px 12px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                            title="Click to verify physical cash received and confirm deposit"
                          >
                            <ShieldCheck size={13} />
                            <span>Mark Deposited at Hub (₹{rider.pendingHandoverAmount.toLocaleString()})</span>
                          </button>
                        ) : (
                          <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>
                            Receipt Settled
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
      ) : (
        /* TAB 1, 2, 3: UNIFIED & DETAILED AUDIT TABLE */
        <div className="admin-table-card">
          <div className="admin-table-header">
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                {activeTab === 'INFLOWS' ? 'Customer Order Payments Ledger' : activeTab === 'OUTFLOWS' ? 'Mandi Purchases & Payouts Outflow Ledger' : 'Consolidated End-to-End Financial Ledger'}
              </h3>
              <span style={{ fontSize: '12px', color: '#64748B' }}>
                Showing {filteredTransactions.length} transaction records with real-time collector & timestamp verification
              </span>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <span style={{ fontSize: '11.5px', background: '#ECFDF5', color: '#065F46', padding: '3px 8px', borderRadius: '4px', fontWeight: 700 }}>
                Total Filtered: ₹{filteredTransactions.reduce((s, t) => s + t.amount, 0).toLocaleString()}
              </span>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>Ref # & Timestamp</th>
                  <th>Transaction Flow & Nature</th>
                  <th>Party (Customer / Vendor / Society)</th>
                  <th>Amount (₹)</th>
                  <th>Payment Channel</th>
                  <th>Who Received / Logged</th>
                  <th>Audit Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: '#64748B' }}>
                      <FileText size={24} style={{ display: 'block', margin: '0 auto 8px', color: '#94A3B8' }} />
                      No transactions matched your current filters.
                    </td>
                  </tr>
                ) : (
                  paginatedTransactions.map((tx, idx) => {
                    const isInflow = tx.flowType === 'INWARD';

                    return (
                      <tr key={idx} style={{ background: isInflow ? '#FFFFFF' : '#FDFCFB' }}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <strong style={{ fontFamily: 'monospace', color: '#0F172A', fontSize: '13px' }}>
                              #{tx.id}
                            </strong>
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
                            <Clock size={11} />
                            <span>{new Date(tx.date).toLocaleDateString()} {new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </td>

                        <td>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{
                              fontSize: '10.5px',
                              fontWeight: 800,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: isInflow ? '#DCFCE7' : '#FEE2E2',
                              color: isInflow ? '#15803D' : '#B91C1C',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '2px'
                            }}>
                              {isInflow ? <ArrowDownLeft size={11} /> : <ArrowUpRight size={11} />}
                              <span>{isInflow ? 'INFLOW (Revenue)' : 'OUTFLOW (Expense)'}</span>
                            </span>
                          </div>
                          <div style={{ fontSize: '11.5px', color: '#334155', fontWeight: 600, marginTop: '2px' }}>
                            {tx.displayCategory}
                          </div>
                        </td>

                        <td>
                          <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                            {tx.party}
                          </div>
                          {tx.customerPhone && (
                            <div style={{ fontSize: '11px', color: '#64748B' }}>
                              Ph: +91 {tx.customerPhone} • Flat {tx.flatNo}
                            </div>
                          )}
                          {tx.destinationWarehouse && (
                            <div style={{ fontSize: '11px', color: '#0284C7' }}>
                              Dest: {tx.destinationWarehouse}
                            </div>
                          )}
                        </td>

                        <td>
                          <div style={{ fontSize: '15px', fontWeight: 900, color: isInflow ? '#059669' : '#B91C1C' }}>
                            {isInflow ? '+' : '-'}₹{(tx.amount || 0).toLocaleString()}
                          </div>
                          {tx.transportCharge > 0 && (
                            <div style={{ fontSize: '10.5px', color: '#64748B' }}>
                              Includes ₹{tx.transportCharge} freight
                            </div>
                          )}
                        </td>

                        <td>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 7px',
                            borderRadius: '4px',
                            background: '#F1F5F9',
                            color: '#334155',
                            display: 'inline-block'
                          }}>
                            {tx.paymentMethod || tx.paymentMode || 'Net Banking'}
                          </span>
                          {tx.receivedMode && (
                            <div style={{ fontSize: '10.5px', color: '#0369A1', fontWeight: 700, marginTop: '2px' }}>
                              {tx.receivedMode === 'UPI_QR' ? '📱 UPI QR' : tx.receivedMode === 'CASH' ? '💵 Cash' : '💳 Online'}
                            </div>
                          )}
                        </td>

                        <td>
                          <div style={{ fontSize: '12px', fontWeight: 800, color: '#0F172A' }}>
                            {tx.collectedBy || tx.officerName || 'Finance Controller'}
                          </div>
                          {tx.isCod && (
                            <div style={{ fontSize: '10.5px', color: tx.isSettledToHub ? '#15803D' : '#B45309', fontWeight: 700 }}>
                              {tx.isSettledToHub ? '✓ Deposited at Hub' : '⚠️ Pending Deposit'}
                            </div>
                          )}
                        </td>

                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{
                              fontSize: '11px',
                              fontWeight: 800,
                              padding: '2px 7px',
                              borderRadius: '4px',
                              background: '#DCFCE7',
                              color: '#15803D'
                            }}>
                              ✓ Reconciled
                            </span>
                          </div>
                          {tx.receiptPhoto && (
                            <button
                              type="button"
                              onClick={() => setSelectedReceiptLog(tx)}
                              style={{ background: 'none', border: 'none', color: '#0284C7', fontSize: '11px', fontWeight: 700, cursor: 'pointer', padding: 0, marginTop: '2px', textDecoration: 'underline' }}
                            >
                              View Bill Slip ➔
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

          {/* Pagination Controls Footer */}
          {filteredTransactions.length > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderTop: '1px solid #E2E8F0',
              background: '#F8FAFC',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>
                  Showing <strong>{Math.min((currentPage - 1) * pageSize + 1, filteredTransactions.length)}</strong>–<strong>{Math.min(currentPage * pageSize, filteredTransactions.length)}</strong> of <strong>{filteredTransactions.length}</strong> transactions
                </span>
                <span style={{ color: '#CBD5E1' }}>•</span>
                <span>Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong></span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '11.5px', color: '#475569', fontWeight: 600 }}>Rows per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    style={{ padding: '3px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '11.5px', fontWeight: 700, background: '#FFF' }}
                  >
                    <option value={10}>10</option>
                    <option value={15}>15</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      background: currentPage <= 1 ? '#F1F5F9' : '#FFF',
                      color: currentPage <= 1 ? '#94A3B8' : '#334155',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: currentPage <= 1 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    ‹ Previous
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                    .map((page, idx, arr) => {
                      const showEllipsisBefore = idx > 0 && page - arr[idx - 1] > 1;
                      return (
                        <React.Fragment key={page}>
                          {showEllipsisBefore && <span style={{ padding: '0 4px', color: '#94A3B8' }}>…</span>}
                          <button
                            type="button"
                            onClick={() => setCurrentPage(page)}
                            style={{
                              padding: '4px 9px',
                              borderRadius: '6px',
                              border: '1px solid #CBD5E1',
                              background: currentPage === page ? '#059669' : '#FFF',
                              color: currentPage === page ? '#FFF' : '#334155',
                              fontSize: '12px',
                              fontWeight: 800,
                              cursor: 'pointer'
                            }}
                          >
                            {page}
                          </button>
                        </React.Fragment>
                      );
                    })}

                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      background: currentPage >= totalPages ? '#F1F5F9' : '#FFF',
                      color: currentPage >= totalPages ? '#94A3B8' : '#334155',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Next ›
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* RECEIPT / BILL SLIP PREVIEW MODAL */}
      {selectedReceiptLog && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}>
          <div style={{ background: '#FFF', borderRadius: '16px', maxWidth: '440px', width: '100%', padding: '20px', border: '1.5px solid #CBD5E1' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>
              Mandi Weighing Slip / Bill Photo
            </h3>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 12px' }}>
              Ref #{selectedReceiptLog.id} • {selectedReceiptLog.vendorName}
            </p>

            <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid #E2E8F0', marginBottom: '14px', background: '#000', textAlign: 'center' }}>
              <img
                src={selectedReceiptLog.receiptPhoto}
                alt="Mandi Bill Photo"
                style={{ width: '100%', maxHeight: '340px', objectFit: 'contain' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setSelectedReceiptLog(null)}
                className="admin-btn-primary"
                style={{ fontSize: '12px', padding: '6px 16px', borderRadius: '6px' }}
              >
                Close Slip
              </button>
            </div>
          </div>
        </div>
      )}
      {/* CASH HANDOVER CONFIRMATION MODAL */}
      {confirmDepositModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10001,
          padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            maxWidth: '480px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1.5px solid #E2E8F0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck size={26} />
              </div>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 900, color: '#0F172A', margin: 0 }}>
                  Confirm Hub Cash Deposit Handover
                </h3>
                <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>
                  Central Hub Cashier Reconciliation Desk
                </p>
              </div>
            </div>

            {/* Prominent Amount Box */}
            <div style={{
              background: '#F0FDF4',
              border: '2px dashed #86EFAC',
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center',
              marginBottom: '16px'
            }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Physical Currency to Handover & Reconcile
              </div>
              <div style={{ fontSize: '32px', fontWeight: 900, color: '#15803D', margin: '4px 0' }}>
                ₹{confirmDepositModal.pendingHandoverAmount.toLocaleString()}
              </div>
              <div style={{ fontSize: '12px', color: '#475569', fontWeight: 600 }}>
                From: <strong style={{ color: '#0F172A' }}>{confirmDepositModal.name}</strong>
              </div>
            </div>

            {/* Handover Breakdown Details */}
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '12px 14px', marginBottom: '16px', fontSize: '12.5px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Deliveries Handled:</span>
                <span style={{ fontWeight: 800, color: '#0F172A' }}>{confirmDepositModal.totalStops} Drops</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Associated Orders:</span>
                <span style={{ fontWeight: 700, color: '#0369A1', fontFamily: 'monospace', fontSize: '11.5px' }}>
                  #{confirmDepositModal.orderIds.join(', #')}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #CBD5E1', paddingTop: '6px' }}>
                <span style={{ color: '#64748B' }}>Receiving Cashier / Lead:</span>
                <span style={{ fontWeight: 800, color: '#0F172A' }}>{currentUser?.name || 'Hub Operations Lead'}</span>
              </div>
            </div>

            <div style={{
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: '8px',
              padding: '10px 12px',
              marginBottom: '18px',
              fontSize: '11.5px',
              color: '#991B1B',
              lineHeight: 1.4,
              display: 'flex',
              gap: '8px'
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
              <div>
                <strong>Cashier Verification:</strong> Please confirm you have counted and physically received this exact cash bundle of <strong>₹{confirmDepositModal.pendingHandoverAmount.toLocaleString()}</strong> from the delivery partner before approving.
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setConfirmDepositModal(null)}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  background: '#F1F5F9',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: '13px',
                  border: '1px solid #CBD5E1',
                  cursor: 'pointer'
                }}
              >
                ✕ Cancel / Recount Cash
              </button>

              <button
                type="button"
                onClick={() => {
                  handleSettleRiderCash(confirmDepositModal.name);
                  setConfirmDepositModal(null);
                }}
                className="admin-btn-accent"
                style={{
                  padding: '9px 20px',
                  borderRadius: '8px',
                  background: '#059669',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '13px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 6px -1px rgba(5, 150, 105, 0.3)'
                }}
              >
                <CheckCircle2 size={16} />
                <span>✓ Confirm Cash Received & Settle (₹{confirmDepositModal.pendingHandoverAmount.toLocaleString()})</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
