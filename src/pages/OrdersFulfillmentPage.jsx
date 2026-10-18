import React, { useState, useEffect, useMemo } from 'react';
import { 
  Truck, 
  Warehouse, 
  CheckCircle2, 
  Clock, 
  Package, 
  Search, 
  Filter, 
  Download, 
  Building2, 
  User, 
  Eye, 
  X, 
  AlertCircle,
  Layers,
  ChevronRight,
  ArrowRight,
  MapPin,
  Phone,
  ExternalLink,
  DollarSign,
  Calendar,
  RefreshCw
} from 'lucide-react';
import { useAdminRole } from '../context/AdminRoleContext';
import { useToast } from '../context/ToastContext';
import { orders as orderResource, societies as societyResource, warehouses as warehouseResource, useUpdateOrderStatus } from '../hooks/resources';
import { exportToExcel } from '../utils/excelExporter';

export default function OrdersFulfillmentPage() {
  const { currentUser, currentRoleId } = useAdminRole();
  const { showToast } = useToast();

  const { data: rawOrders = [], isLoading: isLoadingOrders } = orderResource.useList();
  const { data: rawSocieties = [] } = societyResource.useList();
  const { data: rawWarehouses = [] } = warehouseResource.useList();

  const orders = Array.isArray(rawOrders) ? rawOrders : [];
  const societies = Array.isArray(rawSocieties) ? rawSocieties : [];
  const warehouses = Array.isArray(rawWarehouses) ? rawWarehouses : [];

  const updateOrderStatusMutation = useUpdateOrderStatus();

  // URL Hash synchronization (#packing, #dispatch, #delivered, etc.)
  const getInitialStatusFilter = () => {
    if (typeof window === 'undefined') return 'ALL';
    const hash = (window.location.hash || '').toLowerCase();
    if (hash === '#packing' || hash === '#packed') return 'PACKED';
    if (hash === '#dispatch' || hash === '#out_for_delivery' || hash === '#out-for-delivery') return 'OUT_FOR_DELIVERY';
    if (hash === '#delivered') return 'DELIVERED';
    if (hash === '#warehouse') return 'AT_WAREHOUSE';
    if (hash === '#procuring' || hash === '#mandi') return 'PROCURING';
    if (hash === '#confirmed') return 'CONFIRMED';
    return 'ALL';
  };

  const getInitialRiderTab = () => {
    if (typeof window === 'undefined') return 'PENDING';
    const hash = (window.location.hash || '').toLowerCase();
    if (hash === '#delivered') return 'DELIVERED';
    if (hash === '#all') return 'ALL';
    return 'PENDING';
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(getInitialStatusFilter);
  const [societyFilter, setSocietyFilter] = useState('ALL');
  const [warehouseFilter, setWarehouseFilter] = useState('ALL');
  const [slotFilter, setSlotFilter] = useState('ALL');
  const [riderTab, setRiderTab] = useState(getInitialRiderTab); // 'PENDING' | 'DELIVERED' | 'ALL'
  const [dateFilter, setDateFilter] = useState('ALL'); // 'ALL' | 'TODAY' | 'YESTERDAY' | 'WEEK' | 'CUSTOM'

  // Hash listener
  useEffect(() => {
    const handleHashChange = () => {
      setStatusFilter(getInitialStatusFilter());
      setRiderTab(getInitialRiderTab());
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleStatusFilterChange = (newStatus) => {
    setStatusFilter(newStatus);
    const hashMap = {
      CONFIRMED: '#confirmed',
      PROCURING: '#procuring',
      AT_WAREHOUSE: '#warehouse',
      PACKED: '#packing',
      OUT_FOR_DELIVERY: '#dispatch',
      DELIVERED: '#delivered',
      ALL: '#all'
    };
    const targetHash = hashMap[newStatus] || '#all';
    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash;
    }
  };

  const handleRiderTabChange = (newTab) => {
    setRiderTab(newTab);
    const hashMap = {
      PENDING: '#dispatch',
      DELIVERED: '#delivered',
      ALL: '#all'
    };
    const targetHash = hashMap[newTab] || '#dispatch';
    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash;
    }
  };
  const [customDate, setCustomDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Society Batch Update State
  const [batchSociety, setBatchSociety] = useState(societies[0]?.name || '');
  const [batchTargetStatus, setBatchTargetStatus] = useState('AT_WAREHOUSE');

  // Order Details Modal
  const [selectedOrder, setSelectedOrder] = useState(null);

  // COD Payment Collection Modal state
  const [codModalOrder, setCodModalOrder] = useState(null);
  const [codPaymentMode, setCodPaymentMode] = useState('CASH'); // 'CASH' | 'UPI_QR'

  // Status definitions & badges (Unified canonical lifecycle)
  const STATUS_CONFIG = {
    CONFIRMED: { label: 'Confirmed', badgeClass: 'pending', desc: 'Order locked at 9 PM cutoff', color: '#6366F1' },
    PROCURING: { label: 'Procuring at Mandi', badgeClass: 'in-progress', desc: 'Sourcing at APMC Yard 4:30 AM', color: '#D97706' },
    AT_WAREHOUSE: { label: 'At Warehouse', badgeClass: 'approved', desc: 'Arrived at hub for sorting', color: '#0284C7' },
    PACKED: { label: 'Packed & Crated', badgeClass: 'approved', desc: 'Quality checked, flat-tagged & loaded in crate', color: '#10B981' },
    OUT_FOR_DELIVERY: { label: 'Out for Delivery', badgeClass: 'in-progress', desc: 'Dispatched to society drop desk', color: '#F28E14' },
    DELIVERED: { label: 'Delivered', badgeClass: 'approved', desc: 'Secured at society drop desk', color: '#059669' },
    CANCELLED: { label: 'Cancelled', badgeClass: 'rejected', desc: 'Order voided / refunded', color: '#DC2626' }
  };

  // Status counts
  const countConfirmed = orders.filter(o => (o.status || 'CONFIRMED') === 'CONFIRMED').length;
  const countProcuring = orders.filter(o => o.status === 'PROCURING').length;
  const countWarehouse = orders.filter(o => o.status === 'AT_WAREHOUSE').length;
  const countPacked = orders.filter(o => o.status === 'PACKED').length;
  const countOut = orders.filter(o => o.status === 'OUT_FOR_DELIVERY').length;
  const countDelivered = orders.filter(o => o.status === 'DELIVERED').length;

  const ORDER_STAGE_HIERARCHY = {
    CONFIRMED: 1,
    PROCURING: 2,
    AT_WAREHOUSE: 3,
    PACKED: 4,
    OUT_FOR_DELIVERY: 5,
    DELIVERED: 6,
    CANCELLED: 99
  };

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.roles?.includes('SUPER_ADMIN');

  // Single Order Status Change (Accrues society commission strictly when becoming DELIVERED)
  const handleUpdateOrderStatus = async (orderId, newStatus, paymentCollectionData = null) => {
    const targetOrder = (orders || []).find(o => o.id === orderId);
    if (!targetOrder) return;

    if (targetOrder.status === 'CANCELLED') {
      showToast('Cannot modify status of a CANCELLED order', 'error');
      return;
    }

    const isCod = (targetOrder.paymentMethod || '').includes('PAY_ON_DELIVERY');

    // COD Prompt: If COD order is being marked DELIVERED and payment is not yet recorded, prompt rider to confirm payment received!
    if (newStatus === 'DELIVERED' && isCod && targetOrder.paymentStatus !== 'PAID' && !paymentCollectionData) {
      setCodModalOrder(targetOrder);
      setCodPaymentMode('CASH');
      return;
    }

    // Role Guard: Delivery Executive can ONLY mark orders as DELIVERED
    if (isDeliveryExecutive) {
      if (newStatus !== 'DELIVERED') {
        showToast('Delivery executives can only mark assigned orders as DELIVERED.', 'error');
        return;
      }
      if (targetOrder.status === 'DELIVERED') {
        showToast('This order has already been delivered and verified.', 'info');
        return;
      }
    }

    // Strict Reversal Guard: ONLY Super Admin can revert order status backwards!
    if (!isSuperAdmin) {
      const currentLevel = ORDER_STAGE_HIERARCHY[targetOrder.status || 'CONFIRMED'] || 1;
      const newLevel = ORDER_STAGE_HIERARCHY[newStatus] || 1;
      if (newLevel < currentLevel) {
        showToast('Permission Denied: Only Super Admin can revert an order to a previous stage.', 'error');
        return;
      }
      if (targetOrder.status === 'DELIVERED' && newStatus !== 'DELIVERED') {
        showToast('Permission Denied: Delivered orders cannot be reversed except by Super Admin.', 'error');
        return;
      }
    }

    try {
      await updateOrderStatusMutation.mutateAsync({
        id: orderId,
        status: newStatus,
        paymentStatus: (isCod && newStatus === 'DELIVERED') ? 'PAID' : undefined,
        codCollectedAmount: (isCod && newStatus === 'DELIVERED') ? (targetOrder.totalAmount || 0) : undefined,
        codCollectedBy: currentUser?.name || 'Delivery Partner',
        codReceivedMode: paymentCollectionData?.mode || (isCod ? 'CASH' : null),
      });

      if (newStatus === 'DELIVERED') {
        if (isCod) {
          showToast(`✅ Payment of ₹${(targetOrder.totalAmount || 0).toLocaleString()} received via ${paymentCollectionData?.mode === 'UPI_QR' ? 'UPI QR' : 'Cash'}! Order #${orderId} marked DELIVERED.`, 'success');
        } else {
          showToast(`Order #${orderId} marked DELIVERED! Society commission credited to community wallet.`, 'success');
        }
      } else {
        showToast(`Order #${orderId} status set to ${newStatus}`);
      }
    } catch (err) {
      console.error('Status PATCH sync error:', err);
      showToast(err.message || 'Failed to update order status on server.', 'error');
    }
  };

  // Dedicated COD Payment Recorder (can be invoked independently or as part of delivery)
  const handleRecordCodPayment = async (orderId, mode = 'CASH', alsoDeliver = false) => {
    const targetOrder = (orders || []).find(o => o.id === orderId);
    if (!targetOrder) return;

    if (alsoDeliver) {
      await handleUpdateOrderStatus(orderId, 'DELIVERED', { mode, amount: targetOrder.totalAmount });
      setCodModalOrder(null);
      return;
    }

    try {
      await updateOrderStatusMutation.mutateAsync({
        id: orderId,
        paymentStatus: 'PAID',
        codCollectedAmount: targetOrder.totalAmount || 0,
        codCollectedBy: currentUser?.name || 'Delivery Partner',
        codReceivedMode: mode,
      });
      showToast(`✅ Payment of ₹${(targetOrder.totalAmount || 0).toLocaleString()} recorded as received via ${mode === 'UPI_QR' ? 'UPI QR' : 'Cash'}!`, 'success');
    } catch (err) {
      console.error('COD recording error:', err);
      showToast(err.message || 'Failed to record COD payment on server.', 'error');
    } finally {
      setCodModalOrder(null);
    }
  };

  // Society Batch Update Handler (Accrues commissions on batch DELIVERED)
  const handleBatchUpdateSociety = async (e) => {
    e.preventDefault();
    if (!batchSociety) return;

    const targetOrders = orders.filter(o => o.societyName === batchSociety && o.status !== 'CANCELLED' && o.status !== batchTargetStatus);
    if (targetOrders.length === 0) {
      showToast(`No pending orders found for "${batchSociety}" to set to ${batchTargetStatus}.`);
      return;
    }

    try {
      await Promise.all(targetOrders.map(o => updateOrderStatusMutation.mutateAsync({
        id: o.id,
        status: batchTargetStatus,
        paymentStatus: (batchTargetStatus === 'DELIVERED' && (o.paymentMethod || '').includes('PAY_ON_DELIVERY')) ? 'PAID' : undefined,
        codCollectedAmount: (batchTargetStatus === 'DELIVERED' && (o.paymentMethod || '').includes('PAY_ON_DELIVERY')) ? (o.totalAmount || 0) : undefined,
        codCollectedBy: currentUser?.name || 'Operations Lead',
      })));
      showToast(`Batch Update: Set ${targetOrders.length} orders for "${batchSociety}" to ${batchTargetStatus}!`, 'success');
    } catch (err) {
      showToast(err.message || 'Failed some batch order status updates.', 'error');
    }
  };

  // Export Delivery Manifest Excel
  const handleExportManifestExcel = () => {
    const headers = [
      'Order ID',
      'Placed At',
      'Customer Name',
      'Contact Phone',
      'Society / Community',
      'Flat / Door No',
      'Items Breakdown',
      'Total Items',
      'Order Total (₹)',
      'Payment Mode',
      'Fulfillment Warehouse',
      'Current Status'
    ];

    const rows = filteredOrders.map(o => [
      o.id,
      o.createdAt || 'Today 8:45 PM',
      o.userName || o.customerName || 'Resident',
      o.userPhone || 'N/A',
      o.societyName || 'Direct Delivery',
      o.flatNo || o.flatNumber || 'N/A',
      (o.items || []).map(i => `${i.name || i.productName} (${i.quantity || i.qty || 1}x)`).join('; '),
      (o.items || []).length,
      o.totalAmount || 0,
      o.paymentMethod || 'UPI',
      o.warehouseCode || 'Central Hub',
      o.status || 'CONFIRMED'
    ]);

    exportToExcel('Freshioz_Morning_Delivery_Manifest', headers, rows);
  };

  const isDeliveryExecutive = currentRoleId === 'DELIVERY_EXECUTIVE' || currentUser?.role === 'DELIVERY_EXECUTIVE';

  const isAssignedToCurrentRider = (o) => {
    if (o.deliveryPartnerId && (o.deliveryPartnerId === currentUser?.id || o.deliveryPartnerId === currentUser?.uuid)) return true;
    if (o.deliveryPartnerPhone && currentUser?.phone && o.deliveryPartnerPhone.replace(/\D/g, '') === currentUser.phone.replace(/\D/g, '')) return true;
    if (o.deliveryPartnerName && currentUser?.name && o.deliveryPartnerName.toLowerCase() === currentUser.name.toLowerCase()) return true;
    if (currentUser?.assignedLocationName && currentUser.assignedLocationName !== 'ALL' && currentUser.assignedLocationName !== 'Citywide' && o.societyName === currentUser.assignedLocationName) return true;
    return false;
  };

  const hasSpecificAssignedOrders = orders.some(isAssignedToCurrentRider);

  const riderBaseOrders = orders.filter(o => {
    if (hasSpecificAssignedOrders) {
      return isAssignedToCurrentRider(o);
    }
    // In test environment, if no orders were specifically tagged with rider ID, show active delivery orders
    return o.status === 'OUT_FOR_DELIVERY' || o.status === 'PACKED' || o.status === 'DELIVERED';
  });

  const countRiderPending = riderBaseOrders.filter(o => o.status === 'OUT_FOR_DELIVERY' || o.status === 'PACKED').length;
  const countRiderDelivered = riderBaseOrders.filter(o => o.status === 'DELIVERED').length;
  const riderTotalCodToCollect = riderBaseOrders
    .filter(o => o.status !== 'DELIVERED' && (o.paymentMethod || '').includes('PAY_ON_DELIVERY'))
    .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  const handleClaimRun = async () => {
    const claimableOrders = orders.filter(o => o.status === 'OUT_FOR_DELIVERY' || o.status === 'PACKED');
    if (claimableOrders.length === 0) {
      showToast('No active orders available to claim.', 'info');
      return;
    }

    try {
      await Promise.all(claimableOrders.map(o => updateOrderStatusMutation.mutateAsync({
        id: o.id,
        status: 'OUT_FOR_DELIVERY',
        deliveryPartnerId: currentUser?.id || 'FRZ_EMP_105',
        deliveryPartnerName: currentUser?.name || 'Society Gate Delivery Rider',
        deliveryPartnerPhone: currentUser?.phone || '9845033333',
      })));
      showToast(`Claimed ${claimableOrders.length} active deliveries for ${currentUser?.name || 'Rider'}!`, 'success');
    } catch (err) {
      showToast(err.message || 'Failed to claim deliveries.', 'error');
    }
  };

  // Filtered Orders
  const filteredOrders = orders.filter(o => {
    const currentStatus = o.status || 'CONFIRMED';

    if (isDeliveryExecutive) {
      const inRiderBase = hasSpecificAssignedOrders 
        ? isAssignedToCurrentRider(o)
        : (o.status === 'OUT_FOR_DELIVERY' || o.status === 'PACKED' || o.status === 'DELIVERED');
      if (!inRiderBase) return false;

      if (riderTab === 'PENDING' && o.status === 'DELIVERED') return false;
      if (riderTab === 'DELIVERED' && o.status !== 'DELIVERED') return false;
    } else {
      const matchesStatus = statusFilter === 'ALL' || currentStatus === statusFilter;
      if (!matchesStatus) return false;
    }

    const matchesSearch = 
      o.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.societyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.flatNumber?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSociety = societyFilter === 'ALL' || o.societyName === societyFilter;
    const matchesSlot = slotFilter === 'ALL' || (o.deliverySlot || 'Morning Fresh Slot').toLowerCase().includes(slotFilter.toLowerCase());

    // Date range filter
    if (dateFilter !== 'ALL') {
      const orderDateStr = (o.deliveryDate || o.orderPlacedAt || o.createdAt || '').slice(0, 10);
      const todayStr = new Date().toISOString().slice(0, 10);

      if (dateFilter === 'TODAY' && orderDateStr !== todayStr) return false;
      if (dateFilter === 'YESTERDAY') {
        const y = new Date();
        y.setDate(y.getDate() - 1);
        if (orderDateStr !== y.toISOString().slice(0, 10)) return false;
      }
      if (dateFilter === 'WEEK') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        if (new Date(o.createdAt || o.orderPlacedAt || 0).getTime() < weekAgo.getTime()) return false;
      }
      if (dateFilter === 'CUSTOM' && customDate && orderDateStr !== customDate) return false;
    }

    return matchesSearch && matchesSociety && matchesSlot;
  });

  // Reset pagination on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, societyFilter, warehouseFilter, slotFilter, riderTab, dateFilter, customDate]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage, pageSize]);

  return (
    <div className="admin-page-container">
      {/* High-Density Compact Page Header (Under 50px) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px',
        paddingBottom: '10px',
        borderBottom: '1.5px solid #E2E8F0',
        marginBottom: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h1 style={{ fontSize: '18px', color: '#0F172A', fontWeight: 800, margin: 0 }}>
            {isDeliveryExecutive ? `My Delivery Manifest (${currentUser?.name || 'Delivery Partner'})` : 'Order Fulfillment Pipeline'}
          </h1>
          <span style={{ fontSize: '11px', background: isDeliveryExecutive ? '#DCFCE7' : '#E0F2FE', color: isDeliveryExecutive ? '#15803D' : '#0369A1', fontWeight: 800, padding: '2px 8px', borderRadius: '4px' }}>
            {filteredOrders.length} {isDeliveryExecutive ? 'Assigned Stops' : 'Orders Active'}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={handleExportManifestExcel}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '6px 12px',
              borderRadius: '6px',
              background: '#FFFFFF',
              border: '1.5px solid #CBD5E1',
              color: '#334155',
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            <Download size={13} />
            <span>Export Delivery Manifest</span>
          </button>
        </div>
      </div>

      {/* RIDER-SPECIFIC SHIFT OVERVIEW & TABS */}
      {isDeliveryExecutive ? (
        <>
          {/* Shift Overview Banner */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '12px',
            border: '1.5px solid #E2E8F0',
            padding: '12px 16px',
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#DCFCE7', border: '1px solid #86EFAC', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#15803D' }}>
                <Truck size={20} />
              </div>
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A' }}>
                  {currentUser?.name || 'Society Gate Delivery Rider'}
                  <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, marginLeft: '6px' }}>
                    ({currentUser?.phone || '+91 98450 33333'})
                  </span>
                </div>
                <div style={{ fontSize: '11.5px', color: '#475569', marginTop: '1px' }}>
                  Assigned Route: <strong>{currentUser?.assignedLocationName || 'All Registered Communities (Citywide)'}</strong>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center', padding: '0 6px' }}>
                <div style={{ fontSize: '16px', fontWeight: 900, color: '#EA580C' }}>{countRiderPending}</div>
                <div style={{ fontSize: '10px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>To Deliver</div>
              </div>
              <div style={{ height: '24px', width: '1px', background: '#E2E8F0' }} />
              <div style={{ textAlign: 'center', padding: '0 6px' }}>
                <div style={{ fontSize: '16px', fontWeight: 900, color: '#059669' }}>{countRiderDelivered}</div>
                <div style={{ fontSize: '10px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Delivered</div>
              </div>
              <div style={{ height: '24px', width: '1px', background: '#E2E8F0' }} />
              <div style={{ textAlign: 'center', padding: '0 6px' }}>
                <div style={{ fontSize: '16px', fontWeight: 900, color: '#B91C1C' }}>₹{riderTotalCodToCollect.toLocaleString()}</div>
                <div style={{ fontSize: '10px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>COD to Collect</div>
              </div>

              {!hasSpecificAssignedOrders && countRiderPending > 0 && (
                <button
                  type="button"
                  onClick={handleClaimRun}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '6px',
                    background: '#1E293B',
                    color: '#FFF',
                    fontSize: '11px',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer'
                  }}
                  title="Claim active runs for this rider account"
                >
                  Claim Active Route Run
                </button>
              )}
            </div>
          </div>

          {/* Rider Stage Tabs (Replaces 6 Admin Pipeline Stages) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '10px'
          }}>
            <button
              type="button"
              onClick={() => handleRiderTabChange('PENDING')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer',
                border: 'none',
                background: riderTab === 'PENDING' ? '#EA580C' : '#F1F5F9',
                color: riderTab === 'PENDING' ? '#FFF' : '#475569',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <Truck size={13} />
              <span>1. Pending Deliveries ({countRiderPending})</span>
            </button>

            <button
              type="button"
              onClick={() => handleRiderTabChange('DELIVERED')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer',
                border: 'none',
                background: riderTab === 'DELIVERED' ? '#059669' : '#F1F5F9',
                color: riderTab === 'DELIVERED' ? '#FFF' : '#475569',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <CheckCircle2 size={13} />
              <span>2. Completed Today ({countRiderDelivered})</span>
            </button>

            <button
              type="button"
              onClick={() => handleRiderTabChange('ALL')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer',
                border: 'none',
                background: riderTab === 'ALL' ? '#234B3C' : '#F1F5F9',
                color: riderTab === 'ALL' ? '#FFF' : '#475569'
              }}
            >
              <span>All Assigned Stops ({riderBaseOrders.length})</span>
            </button>
          </div>
        </>
      ) : (
        /* ================= ADMIN ENTERPRISE 6-STAGE PIPELINE PILLS ================= */
        <>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            overflowX: 'auto',
            paddingBottom: '4px',
            marginBottom: '10px'
          }}>
            <button
              type="button"
              onClick={() => handleStatusFilterChange('ALL')}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '11.5px',
                fontWeight: 800,
                cursor: 'pointer',
                border: 'none',
                background: statusFilter === 'ALL' ? '#234B3C' : '#F1F5F9',
                color: statusFilter === 'ALL' ? '#FFF' : '#475569',
                whiteSpace: 'nowrap'
              }}
            >
              All Stages ({orders.length})
            </button>

            <button
              type="button"
              onClick={() => handleStatusFilterChange('CONFIRMED')}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '11.5px',
                fontWeight: 800,
                cursor: 'pointer',
                border: statusFilter === 'CONFIRMED' ? '1.5px solid #6366F1' : '1px solid #E2E8F0',
                background: statusFilter === 'CONFIRMED' ? '#EEF2FF' : '#FFF',
                color: statusFilter === 'CONFIRMED' ? '#4F46E5' : '#334155',
                whiteSpace: 'nowrap'
              }}
            >
              1. Confirmed ({countConfirmed})
            </button>

            <button
              type="button"
              onClick={() => handleStatusFilterChange('PROCURING')}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '11.5px',
                fontWeight: 800,
                cursor: 'pointer',
                border: statusFilter === 'PROCURING' ? '1.5px solid #D97706' : '1px solid #E2E8F0',
                background: statusFilter === 'PROCURING' ? '#FEF3C7' : '#FFF',
                color: statusFilter === 'PROCURING' ? '#B45309' : '#334155',
                whiteSpace: 'nowrap'
              }}
            >
              2. Mandi Procurement ({countProcuring})
            </button>

            <button
              type="button"
              onClick={() => handleStatusFilterChange('AT_WAREHOUSE')}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '11.5px',
                fontWeight: 800,
                cursor: 'pointer',
                border: statusFilter === 'AT_WAREHOUSE' ? '1.5px solid #0284C7' : '1px solid #E2E8F0',
                background: statusFilter === 'AT_WAREHOUSE' ? '#E0F2FE' : '#FFF',
                color: statusFilter === 'AT_WAREHOUSE' ? '#0369A1' : '#334155',
                whiteSpace: 'nowrap'
              }}
            >
              3. At Warehouse Sorting ({countWarehouse})
            </button>

            <button
              type="button"
              onClick={() => handleStatusFilterChange('PACKED')}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '11.5px',
                fontWeight: 800,
                cursor: 'pointer',
                border: statusFilter === 'PACKED' ? '1.5px solid #10B981' : '1px solid #E2E8F0',
                background: statusFilter === 'PACKED' ? '#ECFDF5' : '#FFF',
                color: statusFilter === 'PACKED' ? '#059669' : '#334155',
                whiteSpace: 'nowrap'
              }}
            >
              4. Packed & Crated ({countPacked})
            </button>

            <button
              type="button"
              onClick={() => handleStatusFilterChange('OUT_FOR_DELIVERY')}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '11.5px',
                fontWeight: 800,
                cursor: 'pointer',
                border: statusFilter === 'OUT_FOR_DELIVERY' ? '1.5px solid #F28E14' : '1px solid #E2E8F0',
                background: statusFilter === 'OUT_FOR_DELIVERY' ? '#FFF7ED' : '#FFF',
                color: statusFilter === 'OUT_FOR_DELIVERY' ? '#EA580C' : '#334155',
                whiteSpace: 'nowrap'
              }}
            >
              5. Out for Delivery ({countOut})
            </button>

            <button
              type="button"
              onClick={() => handleStatusFilterChange('DELIVERED')}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '11.5px',
                fontWeight: 800,
                cursor: 'pointer',
                border: statusFilter === 'DELIVERED' ? '1.5px solid #059669' : '1px solid #E2E8F0',
                background: statusFilter === 'DELIVERED' ? '#ECFDF5' : '#FFF',
                color: statusFilter === 'DELIVERED' ? '#047857' : '#334155',
                whiteSpace: 'nowrap'
              }}
            >
              6. Delivered ({countDelivered})
            </button>
          </div>

          {/* Slim Society Batch Quick Updater Bar */}
          <div style={{
            background: '#F0FDF4',
            border: '1px solid #BBF7D0',
            borderRadius: '8px',
            padding: '6px 12px',
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#166534', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Layers size={13} />
              <span>Quick Society Batch Advance:</span>
            </div>

            <form onSubmit={handleBatchUpdateSociety} style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <select
                value={batchSociety}
                onChange={(e) => setBatchSociety(e.target.value)}
                style={{ padding: '3px 8px', borderRadius: '4px', border: '1px solid #86EFAC', background: '#FFF', fontSize: '11.5px', fontWeight: 700, color: '#0F172A' }}
              >
                {societies.length === 0 ? (
                  <option value="">No societies enrolled</option>
                ) : (
                  societies.map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))
                )}
              </select>

              <span style={{ fontSize: '11px', fontWeight: 800, color: '#166534' }}>&rarr;</span>

              <select
                value={batchTargetStatus}
                onChange={(e) => setBatchTargetStatus(e.target.value)}
                style={{ padding: '3px 8px', borderRadius: '4px', border: '1px solid #86EFAC', background: '#FFF', fontSize: '11.5px', fontWeight: 700, color: '#0F172A' }}
              >
                <option value="PROCURING">PROCURING (Mandi Yard)</option>
                <option value="AT_WAREHOUSE">AT WAREHOUSE (Sorting & Crating)</option>
                <option value="OUT_FOR_DELIVERY">OUT FOR DELIVERY (In Transit)</option>
                <option value="DELIVERED">DELIVERED (Drop Desk Handover)</option>
              </select>

              <button
                type="submit"
                style={{ padding: '4px 10px', borderRadius: '4px', background: '#166534', color: '#FFF', border: 'none', fontSize: '11.5px', fontWeight: 800, cursor: 'pointer' }}
              >
                Apply to All Orders
              </button>
            </form>
          </div>
        </>
      )}

      {/* ================= SEARCH & FILTER CONTROLS ================= */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '12px',
        border: '1.5px solid #E2E8F0',
        padding: '10px 14px',
        marginBottom: '14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '220px' }}>
          <Search size={15} color="#64748B" />
          <input
            type="text"
            placeholder={isDeliveryExecutive ? "Search my deliveries by order #, resident, society, flat..." : "Search by Order ID, customer, society, or flat number..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', border: 'none', outline: 'none', fontSize: '12.5px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {!isDeliveryExecutive && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748B' }}>
              <Filter size={13} />
              <span>Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ padding: '3px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px' }}
              >
                <option value="ALL">All Status ({orders.length})</option>
                <option value="CONFIRMED">Confirmed ({countConfirmed})</option>
                <option value="PROCURING">Procuring ({countProcuring})</option>
                <option value="AT_WAREHOUSE">At Warehouse ({countWarehouse})</option>
                <option value="OUT_FOR_DELIVERY">Out for Delivery ({countOut})</option>
                <option value="DELIVERED">Delivered ({countDelivered})</option>
              </select>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748B' }}>
            <span>Society:</span>
            <select
              value={societyFilter}
              onChange={(e) => setSocietyFilter(e.target.value)}
              style={{ padding: '3px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px' }}
            >
              <option value="ALL">All Societies</option>
              {societies.map(s => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748B' }}>
            <span>Run Slot:</span>
            <select
              value={slotFilter}
              onChange={(e) => setSlotFilter(e.target.value)}
              style={{ padding: '3px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px', fontWeight: 700 }}
            >
              <option value="ALL">All Run Slots</option>
              <option value="Morning">🌅 Morning Run (06:30 AM)</option>
              <option value="Evening">🌇 Evening Run (05:00 PM)</option>
            </select>
          </div>

          {/* Day-to-Day Date Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748B' }}>
            <Calendar size={13} color="#059669" />
            <span>Date:</span>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              style={{ padding: '3px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px', fontWeight: 700 }}
            >
              <option value="ALL">All Dates</option>
              <option value="TODAY">Today Only</option>
              <option value="YESTERDAY">Yesterday</option>
              <option value="WEEK">Past 7 Days</option>
              <option value="CUSTOM">Custom Single Day...</option>
            </select>
            {dateFilter === 'CUSTOM' && (
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                style={{ padding: '2px 6px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '11px', background: '#FFF' }}
              />
            )}
          </div>
        </div>
      </div>

      {/* ================= PRIMARY CONTENT AREA ================= */}
      {isDeliveryExecutive ? (
        /* RIDER DELIVERY MANIFEST CARDS VIEW (NO TABLE, NO REVERSAL DROPDOWNS) */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {isLoadingOrders ? (
            <div style={{ background: '#FFF', borderRadius: '12px', border: '1.5px solid #E2E8F0', padding: '36px 20px', textAlign: 'center', color: '#64748B' }}>
              <RefreshCw size={24} style={{ margin: '0 auto 12px', display: 'block', animation: 'spin 1s linear infinite' }} />
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>Loading Delivery Stops...</div>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="admin-empty-state" style={{ background: '#FFF', borderRadius: '12px', border: '1.5px solid #E2E8F0', padding: '36px 20px', textAlign: 'center' }}>
              <div className="admin-empty-state-icon" style={{ margin: '0 auto 12px' }}>
                <Package size={26} color="#059669" />
              </div>
              <div className="admin-empty-state-title" style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
                {riderTab === 'PENDING' ? 'All Assigned Stops Delivered!' : 'No Orders in This View'}
              </div>
              <div className="admin-empty-state-desc" style={{ fontSize: '13px', color: '#64748B', maxWidth: '420px', margin: '6px auto 0' }}>
                {riderTab === 'PENDING' 
                  ? 'Great job! You have completed all active deliveries for this route run.'
                  : 'Check with the warehouse dispatch desk for upcoming lots assigned to your vehicle.'}
              </div>
            </div>
          ) : (
            paginatedOrders.map((order, idx) => {
              const targetSoc = societies.find(s => s.id === order.societyId || s.name === order.societyName);
              const socAddress = targetSoc?.address || `${order.societyName}, Drop Desk / Security Gate`;
              const mapQuery = targetSoc?.lat && targetSoc?.lng
                ? `${targetSoc.lat},${targetSoc.lng}`
                : encodeURIComponent(`${order.societyName} ${socAddress}`);
              const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;
              const isCod = (order.paymentMethod || '').includes('PAY_ON_DELIVERY');
              const isDelivered = order.status === 'DELIVERED';

              return (
                <div 
                  key={order.id}
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '12px',
                    border: isDelivered ? '1.5px solid #BBF7D0' : '1.5px solid #CBD5E1',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                    padding: '16px 18px',
                    transition: 'border-color 0.15s ease'
                  }}
                >
                  {/* Top Bar: Stop #, Slot & Cutoff, Status */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '8px',
                    paddingBottom: '10px',
                    borderBottom: '1px solid #F1F5F9',
                    marginBottom: '12px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        background: isDelivered ? '#059669' : '#EA580C',
                        color: '#FFF',
                        fontSize: '11px',
                        fontWeight: 900,
                        padding: '3px 8px',
                        borderRadius: '4px',
                        letterSpacing: '0.4px'
                      }}>
                        STOP #{idx + 1}
                      </span>
                      <strong style={{ fontSize: '14px', color: '#0F172A', fontFamily: 'monospace' }}>
                        #{order.id}
                      </strong>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        fontSize: '11px',
                        background: '#FEF3C7',
                        color: '#B45309',
                        fontWeight: 800,
                        padding: '3px 8px',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <Clock size={12} />
                        <span>{order.deliverySlot || 'Morning Run (06:30 AM - 08:30 AM)'}</span>
                      </span>

                      <span style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        padding: '3px 8px',
                        borderRadius: '4px',
                        background: isDelivered ? '#DCFCE7' : '#FFF7ED',
                        color: isDelivered ? '#15803D' : '#C2410C'
                      }}>
                        {isDelivered ? '✅ DELIVERED' : '🚚 TO DELIVER'}
                      </span>
                    </div>
                  </div>

                  {/* 3 Core Delivery Columns: WHERE, TO WHOM, WHAT TO COLLECT & DROP */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                    gap: '12px',
                    marginBottom: '14px'
                  }}>
                    {/* 1. WHERE: Customer Location & Google Maps */}
                    <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: '#0369A1', textTransform: 'uppercase', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={13} color="#0369A1" />
                        <span>Where: Drop Location</span>
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: 900, color: '#0F172A' }}>
                        {order.societyName}
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#166534', marginTop: '2px' }}>
                        Flat / Door: {order.flatNumber || order.flatNo || 'Society Drop Desk'}
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '4px', lineHeight: 1.4 }}>
                        📍 {socAddress}
                      </div>

                      <div style={{ marginTop: '10px' }}>
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            background: '#0284C7',
                            color: '#FFF',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontSize: '11.5px',
                            fontWeight: 800,
                            textDecoration: 'none'
                          }}
                        >
                          <MapPin size={13} />
                          <span>Open in Google Maps ➔</span>
                        </a>
                      </div>
                    </div>

                    {/* 2. TO WHOM: Customer Contact */}
                    <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: '#166534', textTransform: 'uppercase', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <User size={13} color="#166534" />
                        <span>To Whom: Resident</span>
                      </div>
                      <div style={{ fontSize: '14.5px', fontWeight: 900, color: '#0F172A' }}>
                        {order.userName || order.customerName || 'Resident Customer'}
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155', marginTop: '3px' }}>
                        +91 {order.userPhone || '98450 11999'}
                      </div>

                      <div style={{ marginTop: '10px' }}>
                        <a
                          href={`tel:${order.userPhone || '9845011999'}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            background: '#ECFDF5',
                            color: '#059669',
                            border: '1px solid #A7F3D0',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontSize: '11.5px',
                            fontWeight: 800,
                            textDecoration: 'none'
                          }}
                        >
                          <Phone size={13} />
                          <span>Call Customer</span>
                        </a>
                      </div>
                    </div>

                    {/* 3. WHAT TO COLLECT & WHAT TO DROP */}
                    <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '4px' }}>
                        Payment & Crate
                      </div>

                      {isCod ? (
                        (order.paymentStatus === 'PAID' || order.codPaymentReceived) ? (
                          <div style={{ background: '#ECFDF5', border: '1.5px solid #86EFAC', color: '#166534', padding: '7px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 900, marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>✅ COD PAYMENT COLLECTED</span>
                            <span style={{ fontSize: '12px' }}>₹{(order.totalAmount || 0).toLocaleString()} ({order.codReceivedMode === 'UPI_QR' ? 'UPI QR' : 'Cash'})</span>
                          </div>
                        ) : (
                          <div style={{ background: '#FEF2F2', border: '1.5px solid #FCA5A5', color: '#991B1B', padding: '7px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 900, marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                            <span>💵 COD TO COLLECT: ₹{(order.totalAmount || 0).toLocaleString()}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setCodModalOrder(order);
                                setCodPaymentMode('CASH');
                              }}
                              style={{
                                background: '#DC2626',
                                color: '#FFF',
                                border: 'none',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 800,
                                cursor: 'pointer'
                              }}
                              title="Record payment collected from resident"
                            >
                              💵 Receive Payment
                            </button>
                          </div>
                        )
                      ) : (
                        <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', padding: '5px 10px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 800, marginBottom: '8px' }}>
                          ✅ PAID ONLINE (₹0 to collect)
                        </div>
                      )}

                      <div style={{ fontSize: '12px', color: '#0F172A', fontWeight: 700 }}>
                        {(order.items || []).map((it, iIdx) => (
                          <div key={iIdx} style={{ padding: '2px 0' }}>
                            • {it.name || it.productName} — {(it.qty || it.quantity || 1)} * {(it.unit || 'Pack')}
                          </div>
                        ))}
                      </div>

                      <div style={{ marginTop: '8px' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(order)}
                          style={{ background: 'none', border: 'none', color: '#0369A1', fontSize: '11.5px', fontWeight: 800, padding: 0, cursor: 'pointer', textDecoration: 'underline' }}
                        >
                          View Address Label & QR ➔
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Action Row: Strictly One-Way Mark Delivered for Rider */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px', borderTop: '1px solid #F1F5F9', paddingTop: '10px' }}>
                    {!isDelivered ? (
                      <button
                        type="button"
                        onClick={() => handleUpdateOrderStatus(order.id, 'DELIVERED')}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: '#059669',
                          color: '#FFF',
                          border: 'none',
                          padding: '8px 18px',
                          borderRadius: '8px',
                          fontWeight: 800,
                          fontSize: '13px',
                          cursor: 'pointer',
                          boxShadow: '0 2px 4px rgba(5, 150, 105, 0.25)'
                        }}
                      >
                        <CheckCircle2 size={16} />
                        <span>Mark Delivered at Drop Desk</span>
                      </button>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#059669', fontWeight: 800, fontSize: '12.5px' }}>
                        <CheckCircle2 size={16} />
                        <span>Delivered & Verified at Drop Desk ({order.lastStatusUpdate || 'Today'})</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {/* Rider Pagination Bar */}
          {filteredOrders.length > pageSize && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#FFF', borderRadius: '10px', border: '1.5px solid #E2E8F0', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: '#64748B' }}>
                Showing <strong>{Math.min((currentPage - 1) * pageSize + 1, filteredOrders.length)}</strong>–<strong>{Math.min(currentPage * pageSize, filteredOrders.length)}</strong> of <strong>{filteredOrders.length}</strong> stops
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', background: currentPage <= 1 ? '#F1F5F9' : '#FFF', fontSize: '12px', fontWeight: 700, cursor: currentPage <= 1 ? 'not-allowed' : 'pointer' }}
                >
                  ‹ Prev
                </button>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#0F172A', padding: '4px 8px' }}>
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', background: currentPage >= totalPages ? '#F1F5F9' : '#FFF', fontSize: '12px', fontWeight: 700, cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer' }}
                >
                  Next ›
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ================= PRIMARY ENTERPRISE ORDERS DATA TABLE (ADMIN & WAREHOUSE) ================= */
        <div className="admin-table-card">
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>Order # & Timestamp</th>
                  <th>Resident & Community</th>
                  <th>Produce Basket Items</th>
                  <th>Value & Mode</th>
                  <th>Assigned Warehouse Hub</th>
                  <th>Live Fulfillment Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingOrders ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>
                      <RefreshCw size={24} style={{ margin: '0 auto 10px', display: 'block', animation: 'spin 1s linear infinite', color: '#0284C7' }} />
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>Loading Orders Pipeline...</div>
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan="7">
                      <div className="admin-empty-state">
                        <div className="admin-empty-state-icon">
                          <Package size={22} />
                        </div>
                        <div className="admin-empty-state-title">No Orders in Dispatch Queue</div>
                        <div className="admin-empty-state-desc">
                          Customer orders placed before the 9:00 PM cutoff will automatically populate this dispatch board.
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedOrders.map(order => {
                    const currentStatus = order.status || 'CONFIRMED';
                    const statusConf = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.CONFIRMED;

                    return (
                      <tr key={order.id}>
                        <td>
                          <strong style={{ fontSize: '13px', color: '#0F172A' }}>#{order.id}</strong>
                          <div style={{ fontSize: '11px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                            <Clock size={11} />
                            <span>{order.createdAt || 'Cutoff 9 PM'}</span>
                          </div>
                        </td>

                        <td>
                          <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                            {order.userName || order.customerName || 'Resident User'}
                          </div>
                          <div style={{ fontSize: '11.5px', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                            <Building2 size={12} color="#64748B" />
                            <span>{order.societyName || 'Greenfield Heights'}</span>
                            {order.flatNumber && <span style={{ fontWeight: 700 }}>({order.flatNumber})</span>}
                          </div>
                        </td>

                        <td>
                          <div style={{ fontSize: '12.5px', color: '#1E293B', fontWeight: 600 }}>
                            {(order.items || []).slice(0, 2).map((item, idx) => (
                              <span key={idx}>
                                {item.name || item.productName || 'Fresh Item'} ({(item.quantity || item.qty || 1)} * {(item.unit || 'Pack')})
                                {idx < Math.min((order.items || []).length, 2) - 1 ? ', ' : ''}
                              </span>
                            ))}
                            {(order.items || []).length > 2 && (
                              <span style={{ color: '#0369A1', fontSize: '11.5px', fontWeight: 700 }}>
                                {' '}+{ (order.items || []).length - 2 } more
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                            {(order.items || []).length} items in crate
                          </div>
                        </td>

                        <td>
                          <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A' }}>
                            ₹{(order.totalAmount || 0).toLocaleString()}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '2px' }}>
                            <span style={{ fontSize: '10.5px', background: '#F1F5F9', color: '#475569', padding: '1px 5px', borderRadius: '4px', fontWeight: 700, width: 'fit-content' }}>
                              {order.paymentMethod || 'UPI / Prepaid'}
                            </span>
                            {((order.paymentMethod || '').includes('PAY_ON_DELIVERY') || order.paymentMethod === 'COD') && (
                              (order.paymentStatus === 'PAID' || order.codPaymentReceived) ? (
                                <span style={{ fontSize: '10px', background: '#DCFCE7', color: '#15803D', padding: '2px 6px', borderRadius: '4px', fontWeight: 800, width: 'fit-content' }}>
                                  ✓ COD Received ({order.codReceivedMode === 'UPI_QR' ? 'UPI QR' : 'Cash'})
                                </span>
                              ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <span style={{ fontSize: '10px', background: '#FEF2F2', color: '#991B1B', padding: '2px 5px', borderRadius: '4px', fontWeight: 800 }}>
                                    ⚠️ Due
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCodModalOrder(order);
                                      setCodPaymentMode('CASH');
                                    }}
                                    style={{
                                      fontSize: '9.5px',
                                      fontWeight: 800,
                                      background: '#059669',
                                      color: '#FFF',
                                      border: 'none',
                                      padding: '2px 5px',
                                      borderRadius: '4px',
                                      cursor: 'pointer'
                                    }}
                                    title="Record payment collected for COD order"
                                  >
                                    💵 Pay
                                  </button>
                                </div>
                              )
                            )}
                          </div>
                        </td>

                        <td>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Warehouse size={13} color="#059669" />
                            <span>{order.warehouseCode || 'Central Hub'}</span>
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>
                            Morning Drop Desk
                          </div>
                        </td>

                        <td>
                          {/* STRICT PERMISSION: Only Super Admin gets the reversible selector dropdown */}
                          {isSuperAdmin ? (
                            <select
                              value={currentStatus}
                              onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                              style={{
                                padding: '4px 8px',
                                borderRadius: '6px',
                                border: `1.5px solid ${statusConf.color}`,
                                background: '#FFFFFF',
                                color: statusConf.color,
                                fontWeight: 800,
                                fontSize: '11.5px',
                                cursor: 'pointer'
                              }}
                            >
                              <option value="CONFIRMED">CONFIRMED (Cutoff)</option>
                              <option value="PROCURING">PROCURING (Mandi)</option>
                              <option value="AT_WAREHOUSE">AT WAREHOUSE (Sorting)</option>
                              <option value="PACKED">PACKED & CRATED (Tags)</option>
                              <option value="OUT_FOR_DELIVERY">OUT FOR DELIVERY</option>
                              <option value="DELIVERED">DELIVERED (Drop Desk)</option>
                              <option value="CANCELLED">CANCELLED</option>
                            </select>
                          ) : (
                            <span style={{
                              padding: '4px 8px',
                              borderRadius: '6px',
                              background: `${statusConf.color}15`,
                              color: statusConf.color,
                              fontWeight: 800,
                              fontSize: '11.5px',
                              display: 'inline-block'
                            }}>
                              {statusConf.label}
                            </span>
                          )}
                          {order.lastStatusUpdate && (
                            <div style={{ fontSize: '10px', color: '#64748B', marginTop: '2px' }}>
                              Updated: {order.lastStatusUpdate}
                            </div>
                          )}
                        </td>

                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {currentStatus === 'OUT_FOR_DELIVERY' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateOrderStatus(order.id, 'DELIVERED')}
                              style={{
                                background: '#059669',
                                color: '#FFF',
                                border: 'none',
                                padding: '5px 9px',
                                borderRadius: '6px',
                                fontSize: '11.5px',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                marginRight: '6px'
                              }}
                              title="Mark Delivered to society drop desk"
                            >
                              <CheckCircle2 size={13} />
                              <span>Mark Delivered</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(order)}
                            style={{
                              background: '#F8FAFC',
                              border: '1px solid #CBD5E1',
                              padding: '5px 9px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 700,
                              color: '#334155',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title="View Order Details & Address Label"
                          >
                            <Eye size={12} />
                            <span>View Label</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Admin Table Pagination Controls Footer */}
          {filteredOrders.length > 0 && (
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
                  Showing <strong>{Math.min((currentPage - 1) * pageSize + 1, filteredOrders.length)}</strong>–<strong>{Math.min(currentPage * pageSize, filteredOrders.length)}</strong> of <strong>{filteredOrders.length}</strong> orders
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

      {/* ================= ORDER DETAILS & ADDRESS LABEL MODAL ================= */}
      {selectedOrder && (() => {
        const targetSoc = societies.find(s => s.id === selectedOrder.societyId || s.name === selectedOrder.societyName);
        const socAddress = targetSoc?.address || `${selectedOrder.societyName}, Drop Desk / Security Gate`;
        const mapQuery = targetSoc?.lat && targetSoc?.lng
          ? `${targetSoc.lat},${targetSoc.lng}`
          : encodeURIComponent(`${selectedOrder.societyName} ${socAddress}`);
        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;
        const isCod = (selectedOrder.paymentMethod || '').includes('PAY_ON_DELIVERY');

        return (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px'
          }}>
            <div style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '440px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '20px',
              border: '2px dashed #234B3C',
              boxShadow: '0 20px 30px rgba(0, 0, 0, 0.25)'
            }}>
              <div style={{ textAlign: 'center', borderBottom: '1.5px solid #E2E8F0', paddingBottom: '12px', marginBottom: '14px' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#234B3C', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Freshioz Direct Farm Produce
                </div>
                <div style={{ fontSize: '17px', fontWeight: 900, color: '#0F172A', marginTop: '2px' }}>
                  CUSTOMER DELIVERY MANIFEST LABEL
                </div>
              </div>

              <div style={{ fontSize: '13px', lineHeight: 1.6, marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <div>
                    <span style={{ color: '#64748B' }}>Recipient:</span>{' '}
                    <strong style={{ fontSize: '14px', color: '#0F172A' }}>
                      {selectedOrder.userName || selectedOrder.customerName || 'Resident'}
                    </strong>
                  </div>
                  {selectedOrder.userPhone && (
                    <a
                      href={`tel:${selectedOrder.userPhone}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: '#ECFDF5',
                        color: '#059669',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        textDecoration: 'none',
                        border: '1px solid #A7F3D0'
                      }}
                    >
                      <Phone size={11} />
                      <span>Call</span>
                    </a>
                  )}
                </div>

                <div>
                  <span style={{ color: '#64748B' }}>Contact Phone:</span>{' '}
                  <strong style={{ color: '#0F172A' }}>+91 {selectedOrder.userPhone || '98450 11999'}</strong>
                </div>

                {/* DESTINATION WITH DIRECT MAP NAVIGATION */}
                <div style={{ background: '#F0FDF4', padding: '10px 12px', borderRadius: '8px', margin: '10px 0', border: '1.5px solid #86EFAC' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <div style={{ fontSize: '11px', color: '#166534', fontWeight: 800, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={13} color="#166534" />
                      <span>Drop Destination & Society Gate:</span>
                    </div>
                    <span style={{ fontSize: '10px', background: '#DCFCE7', color: '#15803D', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
                      {selectedOrder.deliverySlot || 'Morning Run'}
                    </span>
                  </div>

                  <div style={{ fontSize: '15px', fontWeight: 900, color: '#166534' }}>
                    {selectedOrder.societyName}
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
                    Flat / Room: {selectedOrder.flatNumber || selectedOrder.flatNo || 'Drop Desk'}
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#475569', marginTop: '4px', lineHeight: 1.4 }}>
                    📍 {socAddress}
                  </div>

                  {/* ONE-TAP GOOGLE MAPS NAVIGATION BUTTON */}
                  <div style={{ marginTop: '10px' }}>
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        background: '#0284C7',
                        color: '#FFFFFF',
                        padding: '7px 12px',
                        borderRadius: '6px',
                        fontWeight: 800,
                        fontSize: '12px',
                        textDecoration: 'none',
                        boxShadow: '0 2px 4px rgba(2, 132, 199, 0.25)'
                      }}
                    >
                      <MapPin size={14} />
                      <span>Navigate to Society on Google Maps ➔</span>
                    </a>
                  </div>
                </div>

                {/* PAYMENT DUE ON DELIVERY */}
                <div style={{ marginBottom: '10px' }}>
                  {isCod ? (
                    (selectedOrder.paymentStatus === 'PAID' || selectedOrder.codPaymentReceived) ? (
                      <div style={{ background: '#ECFDF5', border: '1.5px solid #86EFAC', color: '#166534', padding: '9px 12px', borderRadius: '8px', fontSize: '12.5px', fontWeight: 900, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>✅ COD PAYMENT RECEIVED:</span>
                        <span style={{ fontSize: '13.5px' }}>₹{(selectedOrder.totalAmount || 0).toLocaleString()} via {selectedOrder.codReceivedMode === 'UPI_QR' ? 'UPI QR' : 'Cash'}</span>
                      </div>
                    ) : (
                      <div style={{ background: '#FEF2F2', border: '1.5px solid #FCA5A5', color: '#991B1B', padding: '9px 12px', borderRadius: '8px', fontSize: '12.5px', fontWeight: 900, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <span>💵 COD PAYMENT DUE: </span>
                          <span style={{ fontSize: '14px', fontWeight: 900 }}>₹{(selectedOrder.totalAmount || 0).toLocaleString()} (Cash/UPI)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setCodModalOrder(selectedOrder);
                            setCodPaymentMode('CASH');
                          }}
                          style={{
                            background: '#059669',
                            color: '#FFF',
                            border: 'none',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '11.5px',
                            fontWeight: 800,
                            cursor: 'pointer'
                          }}
                          title="Record COD payment received from customer"
                        >
                          💵 Record Payment Received
                        </button>
                      </div>
                    )
                  ) : (
                    <div style={{ background: '#ECFDF5', border: '1.5px solid #A7F3D0', color: '#065F46', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>✅ PAYMENT:</span>
                      <span>PAID ONLINE (No cash to collect)</span>
                    </div>
                  )}
                </div>

                <div>
                  <span style={{ color: '#64748B' }}>Order ID:</span>{' '}
                  <span style={{ fontFamily: 'monospace', fontWeight: 800 }}>#{selectedOrder.id}</span>
                </div>

                {/* CRATED PRODUCE CONTENTS - CLEAN FORMATTING WITH space * space */}
                <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '10px', marginTop: '10px' }}>
                  <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#334155', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Contents:</span>
                    <span style={{ color: '#059669', fontWeight: 700 }}>{(selectedOrder.items || []).length} Item(s)</span>
                  </div>

                  <div style={{ background: '#F8FAFC', borderRadius: '8px', padding: '6px 10px', border: '1px solid #E2E8F0' }}>
                    {(selectedOrder.items || []).map((it, idx) => {
                      const q = it.qty || it.quantity || 1;
                      const u = it.unit || 'Pack';
                      return (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: idx < selectedOrder.items.length - 1 ? '1px dashed #E2E8F0' : 'none', fontSize: '12.5px' }}>
                          <span style={{ fontWeight: 700, color: '#0F172A' }}>• {it.name || it.productName}</span>
                          <span style={{ fontWeight: 800, color: '#166534', background: '#DCFCE7', padding: '2px 8px', borderRadius: '4px', fontSize: '11.5px' }}>
                            {q} * {u}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #E2E8F0' }}>
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="admin-btn-secondary"
                  style={{ fontSize: '12.5px', padding: '7px 20px', fontWeight: 700, borderRadius: '6px' }}
                >
                  Close Label
                </button>

                {isDeliveryExecutive && selectedOrder.status !== 'DELIVERED' && (
                  <button
                    type="button"
                    onClick={() => {
                      handleUpdateOrderStatus(selectedOrder.id, 'DELIVERED');
                      setSelectedOrder(null);
                    }}
                    style={{
                      background: '#059669',
                      color: '#FFF',
                      border: 'none',
                      padding: '7px 16px',
                      borderRadius: '6px',
                      fontWeight: 800,
                      fontSize: '12.5px',
                      cursor: 'pointer'
                    }}
                  >
                    Mark Delivered
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ================= COD PAYMENT COLLECTION CONFIRMATION MODAL ================= */}
      {codModalOrder && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 11000,
          padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            maxWidth: '420px',
            width: '100%',
            padding: '22px 24px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '2px solid #F59E0B'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', borderBottom: '1.5px solid #F1F5F9', paddingBottom: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#FEF3C7', border: '1px solid #FDE68A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D97706' }}>
                <DollarSign size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 900, color: '#0F172A', margin: 0 }}>
                  Confirm COD Payment Received
                </h3>
                <div style={{ fontSize: '12px', color: '#64748B' }}>
                  Order #{codModalOrder.id} • {codModalOrder.userName || codModalOrder.customerName || 'Resident'}
                </div>
              </div>
            </div>

            {/* Payment Amount Box */}
            <div style={{ background: '#FFFBEB', border: '1.5px solid #FCD34D', borderRadius: '10px', padding: '14px', textAlign: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#B45309', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                Total Cash / UPI to Collect:
              </div>
              <div style={{ fontSize: '30px', fontWeight: 900, color: '#92400E', marginTop: '2px' }}>
                ₹{(codModalOrder.totalAmount || 0).toLocaleString()}
              </div>
              <div style={{ fontSize: '11.5px', color: '#78350F', marginTop: '4px' }}>
                📍 {codModalOrder.societyName} • Flat {codModalOrder.flatNumber || codModalOrder.flatNo || 'Drop Desk'}
              </div>
            </div>

            {/* Mode of Payment Selector */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ fontSize: '12px', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '8px' }}>
                Select How Payment Was Received:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setCodPaymentMode('CASH')}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: codPaymentMode === 'CASH' ? '2px solid #059669' : '1px solid #CBD5E1',
                    background: codPaymentMode === 'CASH' ? '#ECFDF5' : '#FFFFFF',
                    color: codPaymentMode === 'CASH' ? '#065F46' : '#475569',
                    fontWeight: 800,
                    fontSize: '12.5px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span style={{ fontSize: '16px' }}>💵</span>
                  <span>Cash Handover</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCodPaymentMode('UPI_QR')}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: codPaymentMode === 'UPI_QR' ? '2px solid #0284C7' : '1px solid #CBD5E1',
                    background: codPaymentMode === 'UPI_QR' ? '#F0F9FF' : '#FFFFFF',
                    color: codPaymentMode === 'UPI_QR' ? '#0369A1' : '#475569',
                    fontWeight: 800,
                    fontSize: '12.5px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span style={{ fontSize: '16px' }}>📱</span>
                  <span>UPI QR Scanned</span>
                </button>
              </div>
            </div>

            {/* Confirmation Buttons */}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setCodModalOrder(null)}
                style={{
                  padding: '9px 14px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  background: '#FFF',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>

              {codModalOrder.status !== 'DELIVERED' && (
                <button
                  type="button"
                  onClick={() => handleRecordCodPayment(codModalOrder.id, codPaymentMode, false)}
                  style={{
                    padding: '9px 14px',
                    borderRadius: '8px',
                    border: '1.5px solid #0284C7',
                    background: '#F0F9FF',
                    color: '#0369A1',
                    fontWeight: 800,
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="Record that payment was collected without changing order status"
                >
                  <span>💵 Record Payment Only</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  const target = codModalOrder;
                  if (target.status === 'DELIVERED') {
                    handleRecordCodPayment(target.id, codPaymentMode, false);
                  } else {
                    handleRecordCodPayment(target.id, codPaymentMode, true);
                  }
                }}
                style={{
                  padding: '9px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#059669',
                  color: '#FFF',
                  fontWeight: 800,
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 4px rgba(5, 150, 105, 0.25)'
                }}
              >
                <CheckCircle2 size={15} />
                <span>{codModalOrder.status === 'DELIVERED' ? 'Confirm Payment Received' : 'Record Payment & Mark Delivered ➔'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
