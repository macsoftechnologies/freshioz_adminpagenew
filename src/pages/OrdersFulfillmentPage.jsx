import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
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
  IndianRupee,
  Calendar,
  RefreshCw,
  Printer,
  QrCode,
  XCircle,
  Camera
} from 'lucide-react';
import { useAdminRole } from '../context/AdminRoleContext';
import { useToast } from '../context/ToastContext';
import { orders as orderResource, societies as societyResource, warehouses as warehouseResource, useUpdateOrderStatus } from '../hooks/resources';
import { exportToExcel } from '../utils/excelExporter';
import { printOrderTaxInvoice, printSocietyDispatchManifest } from '../utils/printInvoices';
import { apiClient } from '../api/client';
import { extractBlockAndFlat } from '../utils/addressParser';

export default function OrdersFulfillmentPage() {
  const { currentUser, currentRoleId } = useAdminRole();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const location = useLocation();

  const { data: rawOrders = [], isLoading: isLoadingOrders } = orderResource.useList();
  const { data: rawSocieties = [] } = societyResource.useList();
  const { data: rawWarehouses = [] } = warehouseResource.useList();

  const orders = Array.isArray(rawOrders) ? rawOrders : [];
  const societies = Array.isArray(rawSocieties) ? rawSocieties : [];
  const warehouses = Array.isArray(rawWarehouses) ? rawWarehouses : [];

  const updateOrderStatusMutation = useUpdateOrderStatus();

  // URL Hash synchronization (#packing, #dispatch, #delivered, #cancelled, etc.)
  const getInitialStatusFilter = (hashStr) => {
    const hash = (hashStr ?? (typeof window !== 'undefined' ? window.location.hash : '')).toLowerCase();
    if (hash === '#packing' || hash === '#packed') return 'PACKED';
    if (hash === '#dispatch' || hash === '#out_for_delivery' || hash === '#out-for-delivery') return 'OUT_FOR_DELIVERY';
    if (hash === '#delivered') return 'DELIVERED';
    if (hash === '#cancelled') return 'CANCELLED';
    if (hash === '#warehouse') return 'AT_WAREHOUSE';
    if (hash === '#procuring' || hash === '#mandi') return 'PROCURING';
    if (hash === '#confirmed') return 'CONFIRMED';
    return 'ALL';
  };

  const getInitialRiderTab = (hashStr) => {
    const hash = (hashStr ?? (typeof window !== 'undefined' ? window.location.hash : '')).toLowerCase();
    if (hash === '#delivered') return 'DELIVERED';
    if (hash === '#cancelled' || hash === '#undelivered' || hash === '#returns') return 'CANCELLED';
    if (hash === '#all') return 'ALL';
    return 'PENDING';
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(() => getInitialStatusFilter(location.hash));
  const [societyFilter, setSocietyFilter] = useState('ALL');
  const [blockFilter, setBlockFilter] = useState('ALL');
  const [warehouseFilter, setWarehouseFilter] = useState('ALL');
  const [slotFilter, setSlotFilter] = useState('ALL');
  const [riderTab, setRiderTab] = useState(() => getInitialRiderTab(location.hash)); // 'PENDING' | 'DELIVERED' | 'CANCELLED' | 'ALL'
  const [dateFilter, setDateFilter] = useState('ALL'); // 'ALL' | 'TODAY' | 'YESTERDAY' | 'WEEK' | 'CUSTOM'

  // Sync with React Router location.hash & browser hashchange
  useEffect(() => {
    setStatusFilter(getInitialStatusFilter(location.hash));
    setRiderTab(getInitialRiderTab(location.hash));
  }, [location.hash]);

  const handleStatusFilterChange = (newStatus) => {
    setStatusFilter(newStatus);
    const hashMap = {
      CONFIRMED: '#confirmed',
      PROCURING: '#procuring',
      AT_WAREHOUSE: '#warehouse',
      PACKED: '#packing',
      OUT_FOR_DELIVERY: '#dispatch',
      DELIVERED: '#delivered',
      CANCELLED: '#cancelled',
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
      PENDING: '#pending',
      DELIVERED: '#delivered',
      CANCELLED: '#cancelled',
      ALL: '#all'
    };
    const targetHash = hashMap[newTab] || '#pending';
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

  // Delivery Confirmation Modal State
  const [deliveryConfirmOrder, setDeliveryConfirmOrder] = useState(null);

  // COD Payment Collection Modal state
  const [codModalOrder, setCodModalOrder] = useState(null);
  const [codPaymentMode, setCodPaymentMode] = useState('CASH'); // 'CASH' | 'UPI_QR'
  const [dynamicQrData, setDynamicQrData] = useState(null);
  const [isLoadingQr, setIsLoadingQr] = useState(false);
  const [customRefId, setCustomRefId] = useState('');

  // Fetch dynamic Razorpay / UPI QR code when driver selects UPI QR
  useEffect(() => {
    if (codModalOrder && codPaymentMode === 'UPI_QR') {
      let isMounted = true;
      setIsLoadingQr(true);
      setDynamicQrData(null);
      setCustomRefId('');

      apiClient(`/payments/orders/${codModalOrder.id}/dynamic-qr`)
        .then(res => {
          if (isMounted && res) {
            setDynamicQrData(res);
          }
        })
        .catch(err => {
          console.warn('Dynamic QR fetch fallback to standard UPI URI:', err);
          const amt = codModalOrder.totalAmount || 0;
          const upiUri = `upi://pay?pa=freshioz@icici&pn=Freshioz%20Produce&am=${amt}&cu=INR&tn=Order_${codModalOrder.id?.slice(-6)}`;
          if (isMounted) {
            setDynamicQrData({
              orderId: codModalOrder.id,
              amount: amt,
              imageUrl: `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=8&data=${encodeURIComponent(upiUri)}`,
              paymentUrl: upiUri,
              upiString: upiUri,
              gatewaySource: 'DIRECT_UPI_FALLBACK',
            });
          }
        })
        .finally(() => {
          if (isMounted) setIsLoadingQr(false);
        });

      return () => { isMounted = false; };
    }
  }, [codModalOrder?.id, codPaymentMode]);

  // Status definitions & badges (Unified canonical lifecycle)
  const STATUS_CONFIG = {
    CONFIRMED: { label: 'Confirmed', badgeClass: 'pending', desc: 'Order locked at cutoff', color: '#6366F1' },
    PROCURING: { label: 'In Procurement', badgeClass: 'in-progress', desc: 'Sourcing inward stock', color: '#D97706' },
    AT_WAREHOUSE: { label: 'At Warehouse', badgeClass: 'approved', desc: 'Arrived at hub for sorting', color: '#0284C7' },
    PACKED: { label: 'Packed & Crated', badgeClass: 'approved', desc: 'Quality checked, flat-tagged & loaded in crate', color: '#10B981' },
    OUT_FOR_DELIVERY: { label: 'Out for Delivery', badgeClass: 'in-progress', desc: 'Dispatched to society drop desk', color: '#F28E14' },
    DELIVERED: { label: 'Delivered', badgeClass: 'approved', desc: 'Secured at society drop desk', color: '#059669' },
    CANCELLED: { label: 'Cancelled', badgeClass: 'rejected', desc: 'Order voided / cancelled', color: '#DC2626' }
  };

  const isDeliveryExecutive = currentRoleId === 'DELIVERY_EXECUTIVE' || currentUser?.role === 'DELIVERY_EXECUTIVE';
  const isExplicitSuperAdminDesk = currentRoleId === 'SUPER_ADMIN' && (currentUser?.role === 'SUPER_ADMIN' || currentUser?.roles?.includes('SUPER_ADMIN') || currentUser?.email === 'superadmin@gmail.com');
  const isWarehouseScoped = !isExplicitSuperAdminDesk;

  const resolvedWh = React.useMemo(() => {
    if (!warehouses || warehouses.length === 0) return null;
    const assignedId = currentUser?.assignedWarehouseId;
    if (assignedId && assignedId !== 'ALL') {
      const match = warehouses.find(w => w.id === assignedId || w.code === assignedId || w.uuid === assignedId);
      if (match) return match;
    }
    return warehouses[0];
  }, [warehouses, currentUser?.assignedWarehouseId]);

  const assignedWhId = resolvedWh?.id;
  const assignedWhCode = resolvedWh?.code;
  const assignedWhName = resolvedWh?.name;

  // Warehouse Scoped Orders & Societies
  const scopedOrders = React.useMemo(() => {
    if (!isWarehouseScoped || isDeliveryExecutive || warehouses.length <= 1) return orders;
    return orders.filter(o => {
      const orderWhId = o.warehouseId || o.warehouse?.id || societies.find(s => s.id === o.societyId)?.warehouseId;
      const orderWhCode = o.warehouseCode || o.warehouse?.code || warehouses.find(w => w.id === orderWhId)?.code;
      return (!orderWhId && !orderWhCode) ||
             (orderWhId && (orderWhId === assignedWhId || orderWhId === assignedWhCode || orderWhId === resolvedWh?.uuid)) ||
             (orderWhCode && (orderWhCode === assignedWhCode || orderWhCode === assignedWhId));
    });
  }, [orders, isWarehouseScoped, isDeliveryExecutive, assignedWhId, assignedWhCode, resolvedWh, societies, warehouses]);

  const accessibleSocieties = React.useMemo(() => {
    if (!isWarehouseScoped || warehouses.length <= 1) return societies;
    return societies.filter(s => !s.warehouseId || s.warehouseId === assignedWhId || s.warehouseId === assignedWhCode || s.warehouseId === resolvedWh?.uuid);
  }, [societies, isWarehouseScoped, assignedWhId, assignedWhCode, resolvedWh, warehouses]);

  // Status counts (scoped to current warehouse)
  const countConfirmed = scopedOrders.filter(o => (o.status || 'CONFIRMED') === 'CONFIRMED').length;
  const countProcuring = scopedOrders.filter(o => o.status === 'PROCURING').length;
  const countWarehouse = scopedOrders.filter(o => o.status === 'AT_WAREHOUSE').length;
  const countPacked = scopedOrders.filter(o => o.status === 'PACKED').length;
  const countOut = scopedOrders.filter(o => o.status === 'OUT_FOR_DELIVERY').length;
  const countDelivered = scopedOrders.filter(o => o.status === 'DELIVERED').length;
  const countCancelled = scopedOrders.filter(o => o.status === 'CANCELLED').length;
  const countActiveOrders = scopedOrders.filter(o => o.status !== 'CANCELLED').length;

  const ORDER_STAGE_HIERARCHY = {
    CONFIRMED: 1,
    PROCURING: 2,
    AT_WAREHOUSE: 3,
    PACKED: 4,
    OUT_FOR_DELIVERY: 5,
    DELIVERED: 6,
    CANCELLED: 99
  };

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.roles?.includes('SUPER_ADMIN') || currentUser?.email === 'superadmin@gmail.com';

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

    // Role Guard: Delivery Executive can ONLY mark orders as DELIVERED or CANCELLED
    if (isDeliveryExecutive) {
      if (newStatus !== 'DELIVERED' && newStatus !== 'CANCELLED') {
        showToast('Delivery executives can only mark assigned orders as DELIVERED or CANCELLED.', 'error');
        return;
      }
      if (targetOrder.status === 'DELIVERED') {
        showToast('This order has already been delivered and verified.', 'info');
        return;
      }
      if (targetOrder.status === 'CANCELLED') {
        showToast('This order has already been cancelled.', 'info');
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
        ...(paymentCollectionData?.paymentRef ? { razorpayPaymentId: paymentCollectionData.paymentRef } : {})
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
  const handleRecordCodPayment = async (orderId, mode = 'CASH', alsoDeliver = false, paymentRef = null) => {
    const targetOrder = (orders || []).find(o => o.id === orderId);
    if (!targetOrder) return;

    if (alsoDeliver) {
      await handleUpdateOrderStatus(orderId, 'DELIVERED', { mode, amount: targetOrder.totalAmount, paymentRef });
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
        ...(paymentRef ? { razorpayPaymentId: paymentRef } : {})
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

// (isDeliveryExecutive, isWarehouseScoped and resolvedWh defined above)

  // Strict Assignment Guard: Drivers ONLY receive orders specifically assigned to them in Step 2 Handover!
  const isAssignedToCurrentRider = (o) => {
    // Orders assigned to this driver that are in progress, delivered, or reported cancelled
    if (o.status !== 'OUT_FOR_DELIVERY' && o.status !== 'PACKED' && o.status !== 'DELIVERED' && o.status !== 'CANCELLED') return false;

    // Super Admin preview: Allow Super Admin testing/previewing Rider desk to view all active dispatched orders
    if (isSuperAdmin) return true;

    // Match by ID
    if (o.deliveryPartnerId && (
      o.deliveryPartnerId === currentUser?.id ||
      o.deliveryPartnerId === currentUser?.uuid ||
      o.deliveryPartnerId === currentUser?.employeeId
    )) return true;

    // Match by normalized Phone (last 10 digits to handle +91 / 0 prefixes)
    const orderPhone = (o.deliveryPartnerPhone || '').replace(/\D/g, '').slice(-10);
    const userPhone = (currentUser?.phone || '').replace(/\D/g, '').slice(-10);
    if (orderPhone && userPhone && orderPhone === userPhone) return true;

    // Match by Name (case-insensitive & whitespace trimmed)
    const orderName = (o.deliveryPartnerName || '').trim().toLowerCase();
    const userName = (currentUser?.name || '').trim().toLowerCase();
    if (orderName && userName && (orderName === userName || orderName.includes(userName) || userName.includes(orderName))) return true;

    // Match by assigned location
    if (currentUser?.assignedLocationName && currentUser.assignedLocationName !== 'ALL' && currentUser.assignedLocationName !== 'Citywide' && o.societyName === currentUser.assignedLocationName) return true;

    // Warehouse Driver Fallback: If this driver is registered to a warehouse hub and an order is dispatched from that hub
    if (currentUser?.assignedWarehouseId && currentUser.assignedWarehouseId !== 'ALL') {
      const orderWhId = o.warehouseId || o.warehouse?.id;
      const orderWhCode = o.warehouseCode || o.warehouse?.code;
      const isMyWarehouse = 
        (!orderWhId && !orderWhCode) ||
        (orderWhId && (orderWhId === currentUser.assignedWarehouseId || orderWhId === assignedWhId || orderWhId === assignedWhCode)) ||
        (orderWhCode && (orderWhCode === currentUser.assignedWarehouseId || orderWhCode === assignedWhCode || orderWhCode === assignedWhId));
      if (isMyWarehouse && (!o.deliveryPartnerId || o.deliveryPartnerId === 'CUSTOM' || !o.deliveryPartnerPhone)) return true;
    }

    // Single Hub Fallback: If only 1 warehouse is configured in system, all out-for-delivery orders belong to this hub's fleet
    if (warehouses.length <= 1) return true;

    return false;
  };

  // Strictly assigned orders only
  const riderBaseOrders = orders.filter(isAssignedToCurrentRider);

  // Available blocks from active visible orders
  const availableBlocks = useMemo(() => {
    const blockSet = new Set();
    const sourceOrders = isDeliveryExecutive ? riderBaseOrders : scopedOrders;
    (sourceOrders || []).forEach(o => {
      if (societyFilter === 'ALL' || o.societyName === societyFilter || o.societyId === societyFilter) {
        const { block } = extractBlockAndFlat(o.flatNo || o.flatNumber);
        if (block && block !== 'General') {
          blockSet.add(block);
        }
      }
    });
    return Array.from(blockSet).sort();
  }, [isDeliveryExecutive, riderBaseOrders, scopedOrders, societyFilter]);

  const countRiderPending = riderBaseOrders.filter(o => o.status === 'OUT_FOR_DELIVERY' || o.status === 'PACKED').length;
  const countRiderDelivered = riderBaseOrders.filter(o => o.status === 'DELIVERED').length;
  const countRiderCancelled = riderBaseOrders.filter(o => o.status === 'CANCELLED').length;
  const riderTotalCodToCollect = riderBaseOrders
    .filter(o => o.status !== 'DELIVERED' && o.status !== 'CANCELLED' && ((o.paymentMethod || '').includes('PAY_ON_DELIVERY') || o.paymentMethod === 'COD'))
    .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  // Strictly accumulate ONLY physical CASH received at doorstep (UPI QR goes directly to bank and never accumulates in rider's hands)
  const riderCashCollectedInHand = riderBaseOrders
    .filter(o =>
      o.status === 'DELIVERED' &&
      !o.codSettledToHub &&
      ((o.paymentMethod || '').includes('PAY_ON_DELIVERY') || o.paymentMethod === 'COD') &&
      (o.codReceivedMode === 'CASH' || !o.codReceivedMode)
    )
    .reduce((sum, o) => sum + (o.codCollectedAmount || o.totalAmount || 0), 0);

  // Rider Cancellation / Exception Modal State
  const [riderCancelModalOrder, setRiderCancelModalOrder] = useState(null);
  const [riderCancelReason, setRiderCancelReason] = useState('CUSTOMER_NOT_AVAILABLE');
  const [riderCancelNotes, setRiderCancelNotes] = useState('');
  const [riderCancelPhoto, setRiderCancelPhoto] = useState(null);
  const [isCompressingPhoto, setIsCompressingPhoto] = useState(false);

  const handlePhotoCapture = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsCompressingPhoto(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 800;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        setRiderCancelPhoto(compressedBase64);
        setIsCompressingPhoto(false);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmRiderCancel = async (e) => {
    e.preventDefault();
    if (!riderCancelModalOrder) return;
    const targetOrder = riderCancelModalOrder;

    const reasonLabelMap = {
      CUSTOMER_NOT_AVAILABLE: 'Resident Not Available / Door Locked / Unreachable',
      WRONG_ADDRESS: 'Incorrect Flat # / Invalid Address',
      CUSTOMER_REFUSED: 'Resident Refused Delivery / Cancelled at Door',
      QUALITY_REJECTED: 'Produce Quality Rejected by Resident',
      SOCIETY_GATE_DENIED: 'Society Security / Association Denied Entry',
      OTHER: 'Other Exception'
    };
    const baseReason = `${reasonLabelMap[riderCancelReason] || riderCancelReason}${riderCancelNotes ? ` - ${riderCancelNotes}` : ''} (Reported by Rider ${currentUser?.name || 'Driver'})`;
    const fullReason = riderCancelPhoto ? `${baseReason} [PROOF_PHOTO]${riderCancelPhoto}` : baseReason;

    try {
      await updateOrderStatusMutation.mutateAsync({
        id: targetOrder.id,
        status: 'CANCELLED',
        reason: fullReason,
        cancelledReason: fullReason
      });
      showToast(`Order #${targetOrder.id} marked Undelivered / Cancelled. Return produce bag to warehouse.`, 'info');
      setRiderCancelModalOrder(null);
      setRiderCancelPhoto(null);
      setRiderCancelNotes('');
    } catch (err) {
      showToast(err.message || 'Failed to cancel order.', 'error');
    }
  };

  // Filtered Orders
  const filteredOrders = scopedOrders.filter(o => {
    const currentStatus = o.status || 'CONFIRMED';

    if (isDeliveryExecutive) {
      if (!isAssignedToCurrentRider(o)) return false;

      if (riderTab === 'PENDING' && (o.status === 'DELIVERED' || o.status === 'CANCELLED')) return false;
      if (riderTab === 'DELIVERED' && o.status !== 'DELIVERED') return false;
      if (riderTab === 'CANCELLED' && o.status !== 'CANCELLED') return false;
    } else {
      // Warehouse Scope Guard: Staff assigned to a warehouse only see orders for their warehouse
      if (isWarehouseScoped && warehouses.length > 1) {
        const orderWhId = o.warehouseId || o.warehouse?.id;
        const orderWhCode = o.warehouseCode || o.warehouse?.code;

        const isWhMatch = 
          (!orderWhId && !orderWhCode) ||
          (orderWhId && (orderWhId === assignedWhId || orderWhId === assignedWhCode)) ||
          (orderWhCode && (orderWhCode === assignedWhCode || orderWhCode === assignedWhId));

        if (!isWhMatch) return false;
      }

      const matchesStatus = statusFilter === 'ALL'
        ? currentStatus !== 'CANCELLED'
        : currentStatus === statusFilter;
      if (!matchesStatus) return false;
    }

    const matchesSearch = 
      o.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.societyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.flatNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.flatNumber?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSociety = societyFilter === 'ALL' || o.societyName === societyFilter || o.societyId === societyFilter;
    const matchesBlock = blockFilter === 'ALL' || extractBlockAndFlat(o.flatNo || o.flatNumber).block === blockFilter;
    if (!matchesBlock) return false;
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
  const sortedFilteredOrders = useMemo(() => {
    return [...filteredOrders].sort((a, b) => {
      // Priority 1: Pending / Active stops at top above Delivered / Cancelled
      const isPendingA = a.status !== 'DELIVERED' && a.status !== 'CANCELLED' ? 0 : 1;
      const isPendingB = b.status !== 'DELIVERED' && b.status !== 'CANCELLED' ? 0 : 1;
      if (isPendingA !== isPendingB) return isPendingA - isPendingB;

      // Priority 2: Society -> Block -> Flat
      const socCompare = (a.societyName || '').localeCompare(b.societyName || '');
      if (socCompare !== 0) return socCompare;
      const bA = extractBlockAndFlat(a.flatNo || a.flatNumber);
      const bB = extractBlockAndFlat(b.flatNo || b.flatNumber);
      const blockCompare = bA.block.localeCompare(bB.block);
      if (blockCompare !== 0) return blockCompare;
      return (bA.flat || '').localeCompare(bB.flat || '', undefined, { numeric: true });
    });
  }, [filteredOrders]);

  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedFilteredOrders.slice(start, start + pageSize);
  }, [sortedFilteredOrders, currentPage, pageSize]);

  // Dynamic Warehouse Time-Batch Slots for Driver & Hub Filtering
  const driverTimeSlots = useMemo(() => {
    const rawSlots = resolvedWh?.deliverySlots || resolvedWh?.slots || [];
    if (Array.isArray(rawSlots) && rawSlots.length > 0) {
      return rawSlots.filter(s => s.active !== false && s.enabled !== false).map(s => ({
        id: s.id || s.name || s.label,
        label: s.name || s.label || 'Delivery Slot',
        window: s.timeWindow || (s.startTime && s.endTime ? `${s.startTime} – ${s.endTime}` : '')
      }));
    }
    return [
      { id: 'Early Dawn Drop', label: 'Early Dawn Drop', window: '05:30 AM – 07:00 AM' },
      { id: 'Morning Fresh Slot', label: 'Morning Fresh Slot', window: '07:00 AM – 08:30 AM' },
      { id: 'Evening Fresh Run', label: 'Evening Fresh Run', window: '05:30 PM – 07:30 PM' }
    ];
  }, [resolvedWh]);

  // Group Rider's Paginated Orders by Society + Block for 1-handed mobile route execution
  const riderGroupedBlocks = useMemo(() => {
    const map = new Map();
    paginatedOrders.forEach(o => {
      const socName = o.societyName || 'Assigned Society';
      const { block } = extractBlockAndFlat(o.flatNo || o.flatNumber);
      const blockLabel = block && block !== 'General' ? `Block ${block}` : 'Main Gate / Desk';
      const key = `${socName}__${blockLabel}`;
      if (!map.has(key)) {
        const targetSoc = societies.find(s => s.id === o.societyId || s.name === o.societyName);
        const socAddress = targetSoc?.address || `${socName}, Security Gate`;
        const mapQuery = targetSoc?.lat && targetSoc?.lng
          ? `${targetSoc.lat},${targetSoc.lng}`
          : encodeURIComponent(`${socName} ${socAddress}`);
        map.set(key, {
          key,
          societyName: socName,
          blockLabel,
          socAddress,
          mapsUrl: `https://www.google.com/maps/search/?api=1&query=${mapQuery}`,
          slotLabel: o.deliverySlot || 'Morning Fresh Slot',
          orders: []
        });
      }
      map.get(key).orders.push(o);
    });
    return Array.from(map.values());
  }, [paginatedOrders, societies]);

  return (
    <div className="admin-page-container">
      {/* High-Density Compact Page Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '6px',
        paddingBottom: '8px',
        borderBottom: '1px solid #E2E8F0',
        marginBottom: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: '16px', color: '#0F172A', fontWeight: 800, margin: 0 }}>
            {isDeliveryExecutive
              ? (riderTab === 'PENDING' ? `1. To Deliver (${countRiderPending})` :
                 riderTab === 'DELIVERED' ? `2. Delivered (${countRiderDelivered})` :
                 riderTab === 'CANCELLED' ? `3. Undelivered (${countRiderCancelled})` :
                 `4. All Route Stops (${riderBaseOrders.length})`)
              : 'Order Fulfillment Pipeline'}
          </h1>
          <span style={{
            fontSize: '10.5px',
            background: '#ECFDF5',
            border: '1px solid #A7F3D0',
            color: '#065F46',
            fontWeight: 800,
            padding: '2px 7px',
            borderRadius: '5px'
          }}>
            🏢 {assignedWhName || assignedWhCode || 'Hub'}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['orders'] });
              showToast('🔄 Synced live orders...', 'info');
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 9px',
              borderRadius: '6px',
              background: '#F0FDF4',
              border: '1px solid #86EFAC',
              color: '#166534',
              fontWeight: 700,
              fontSize: '11px',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={12} />
            <span>Sync</span>
          </button>
          {!isDeliveryExecutive && (
            <button
              type="button"
              onClick={handleExportManifestExcel}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 9px',
                borderRadius: '6px',
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                color: '#334155',
                fontWeight: 700,
                fontSize: '11px',
                cursor: 'pointer'
              }}
            >
              <Download size={12} />
              <span>Export</span>
            </button>
          )}
        </div>
      </div>

      {/* RIDER-SPECIFIC COMPACT STICKY BAR (Single unified card: Cash + Date + Time Batch + Search) */}
      {isDeliveryExecutive ? (
        <div style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          background: '#FFFFFF',
          borderRadius: '10px',
          border: '1.5px solid #E2E8F0',
          padding: '8px 10px',
          marginBottom: '10px',
          boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          {/* Row 1: Cash Summary Pills + Date Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#B91C1C', background: '#FEF2F2', border: '1px solid #FECACA', padding: '2px 7px', borderRadius: '5px' }}>
                COD: ₹{riderTotalCodToCollect.toLocaleString()}
              </span>
              <span style={{
                fontSize: '11px',
                fontWeight: 900,
                color: riderCashCollectedInHand > 0 ? '#991B1B' : '#166534',
                background: riderCashCollectedInHand > 0 ? '#FEE2E2' : '#DCFCE7',
                border: `1px solid ${riderCashCollectedInHand > 0 ? '#FCA5A5' : '#86EFAC'}`,
                padding: '2px 7px',
                borderRadius: '5px'
              }}>
                💵 Cash in Hand: ₹{riderCashCollectedInHand.toLocaleString()}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {[
                { id: 'TODAY', label: 'Today' },
                { id: 'ALL', label: 'All Dates' }
              ].map(d => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDateFilter(d.id)}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '5px',
                    fontSize: '11px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    border: dateFilter === d.id ? '1.5px solid #234B3C' : '1px solid #CBD5E1',
                    background: dateFilter === d.id ? '#234B3C' : '#F8FAFC',
                    color: dateFilter === d.id ? '#FFF' : '#475569'
                  }}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Row 2: Compact Warehouse Time-Batch Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', overflowX: 'auto', paddingBottom: '2px' }}>
            <button
              type="button"
              onClick={() => setSlotFilter('ALL')}
              style={{
                padding: '4px 8px',
                borderRadius: '5px',
                fontSize: '11px',
                fontWeight: 800,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                border: slotFilter === 'ALL' ? '1.5px solid #059669' : '1px solid #E2E8F0',
                background: slotFilter === 'ALL' ? '#ECFDF5' : '#F8FAFC',
                color: slotFilter === 'ALL' ? '#065F46' : '#475569'
              }}
            >
              All Slots ({riderBaseOrders.length})
            </button>
            {driverTimeSlots.map(slot => {
              const slotActive = slotFilter.toLowerCase() === slot.label.toLowerCase();
              const slotCount = riderBaseOrders.filter(o => (o.deliverySlot || 'Morning Fresh Slot').toLowerCase().includes(slot.label.toLowerCase())).length;
              return (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => setSlotFilter(slotActive ? 'ALL' : slot.label)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '5px',
                    fontSize: '11px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    border: slotActive ? '1.5px solid #059669' : '1px solid #E2E8F0',
                    background: slotActive ? '#ECFDF5' : '#FFF',
                    color: slotActive ? '#065F46' : '#334155',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span>{slot.label}</span>
                  {slot.window && <span style={{ fontSize: '10px', color: '#059669', fontWeight: 700 }}>({slot.window})</span>}
                  <span style={{ background: slotActive ? '#059669' : '#E2E8F0', color: slotActive ? '#FFF' : '#334155', padding: '0 4px', borderRadius: '4px', fontSize: '10px' }}>
                    {slotCount}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Row 3: Slim Inline Search + Society Select (No duplicate Date/Slot dropdowns) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', paddingTop: '4px', borderTop: '1px solid #F1F5F9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flex: '1 1 160px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '4px 8px' }}>
              <Search size={13} color="#64748B" />
              <input
                type="text"
                placeholder="Search flat #, name, order #..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', border: 'none', outline: 'none', fontSize: '11.5px', background: 'transparent' }}
              />
            </div>
            <select
              value={societyFilter}
              onChange={(e) => {
                setSocietyFilter(e.target.value);
                setBlockFilter('ALL');
              }}
              style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '11.5px', fontWeight: 700, color: '#334155', background: '#FFF' }}
            >
              <option value="ALL">All Societies</option>
              {accessibleSocieties.map(s => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>
      ) : currentRoleId === 'WAREHOUSE_STAFF' ? null : (
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
              All Stages ({countActiveOrders})
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
              2. Produce Sourcing ({countProcuring})
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

            <button
              type="button"
              onClick={() => handleStatusFilterChange('CANCELLED')}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '11.5px',
                fontWeight: 800,
                cursor: 'pointer',
                border: statusFilter === 'CANCELLED' ? '1.5px solid #DC2626' : '1px solid #E2E8F0',
                background: statusFilter === 'CANCELLED' ? '#FEF2F2' : '#FFF',
                color: statusFilter === 'CANCELLED' ? '#DC2626' : '#64748B',
                whiteSpace: 'nowrap'
              }}
            >
              Cancelled ({countCancelled})
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
                <option value="PROCURING">PROCURING (Inward Sourcing)</option>
                <option value="AT_WAREHOUSE">AT WAREHOUSE (Sorting & Crating)</option>
                <option value="PACKED">PACKED (Crated & Labeled)</option>
                <option value="OUT_FOR_DELIVERY">OUT FOR DELIVERY (In Transit)</option>
                <option value="DELIVERED">DELIVERED (Drop Desk Handover)</option>
              </select>

              <button
                type="submit"
                style={{ padding: '4px 10px', borderRadius: '4px', background: '#166534', color: '#FFF', border: 'none', fontSize: '11.5px', fontWeight: 800, cursor: 'pointer' }}
              >
                Apply to All Orders
              </button>

              <button
                type="button"
                onClick={() => printSocietyDispatchManifest(batchSociety, orders, slotFilter !== 'ALL' ? slotFilter : 'Morning Run', customDate || dateFilter)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  background: '#FFFFFF',
                  color: '#166534',
                  border: '1.5px solid #166534',
                  fontSize: '11.5px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                title="Print batch dispatch manifest for society desk handover"
              >
                <Printer size={12} />
                <span>Print Society Manifest</span>
              </button>
            </form>
          </div>
        </>
      )}

      {/* ================= SEARCH & FILTER CONTROLS (NON-RIDER DESKS) ================= */}
      {!isDeliveryExecutive && (
        <div style={{
          background: '#FFFFFF',
          borderRadius: '12px',
          border: '1.5px solid #E2E8F0',
          padding: '8px 12px',
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '200px' }}>
            <Search size={14} color="#64748B" />
            <input
              type="text"
              placeholder="Search by Order ID, customer, society, or flat #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', border: 'none', outline: 'none', fontSize: '12px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '11.5px', fontWeight: 600 }}
            >
              <option value="ALL">All Status ({scopedOrders.length})</option>
              <option value="CONFIRMED">Confirmed ({countConfirmed})</option>
              <option value="PROCURING">Procuring ({countProcuring})</option>
              <option value="AT_WAREHOUSE">At Warehouse ({countWarehouse})</option>
              <option value="OUT_FOR_DELIVERY">Out for Delivery ({countOut})</option>
              <option value="DELIVERED">Delivered ({countDelivered})</option>
            </select>

            <select
              value={societyFilter}
              onChange={(e) => {
                setSocietyFilter(e.target.value);
                setBlockFilter('ALL');
              }}
              style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '11.5px', fontWeight: 600 }}
            >
              <option value="ALL">All Societies</option>
              {accessibleSocieties.map(s => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>

            {availableBlocks.length > 0 && (
              <select
                value={blockFilter}
                onChange={(e) => setBlockFilter(e.target.value)}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: blockFilter !== 'ALL' ? '1.5px solid #234B3C' : '1px solid #CBD5E1',
                  background: blockFilter !== 'ALL' ? '#F0FDF4' : '#FFF',
                  color: blockFilter !== 'ALL' ? '#234B3C' : '#334155',
                  fontSize: '11.5px',
                  fontWeight: 700
                }}
              >
                <option value="ALL">All Blocks ({availableBlocks.length})</option>
                {availableBlocks.map(b => (
                  <option key={b} value={b}>Block {b}</option>
                ))}
              </select>
            )}

            <select
              value={slotFilter}
              onChange={(e) => setSlotFilter(e.target.value)}
              style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '11.5px', fontWeight: 700 }}
            >
              <option value="ALL">All Time Slots</option>
              {driverTimeSlots.map(s => (
                <option key={s.id} value={s.label}>{s.label} {s.window ? `(${s.window})` : ''}</option>
              ))}
            </select>

            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '11.5px', fontWeight: 700 }}
            >
              <option value="ALL">All Dates</option>
              <option value="TODAY">Today Only</option>
              <option value="YESTERDAY">Yesterday</option>
              <option value="WEEK">Past 7 Days</option>
              <option value="CUSTOM">Custom Day...</option>
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
      )}

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
            riderGroupedBlocks.map((group) => {
              const pendingInGroup = group.orders.filter(o => o.status !== 'DELIVERED' && o.status !== 'CANCELLED').length;
              const deliveredInGroup = group.orders.filter(o => o.status === 'DELIVERED').length;

              return (
                <div
                  key={group.key}
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '12px',
                    border: pendingInGroup > 0 ? '1.5px solid #94A3B8' : '1.5px solid #BBF7D0',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                    overflow: 'hidden'
                  }}
                >
                  {/* Society + Block Crate Header with 1-Tap Maps Navigation */}
                  <div style={{
                    background: pendingInGroup > 0 ? '#F8FAFC' : '#F0FDF4',
                    padding: '10px 14px',
                    borderBottom: '1px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '8px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{
                        background: '#234B3C',
                        color: '#FFF',
                        fontSize: '12px',
                        fontWeight: 900,
                        padding: '3px 9px',
                        borderRadius: '6px'
                      }}>
                        🏢 {group.societyName} · {group.blockLabel}
                      </span>
                      <span style={{ fontSize: '11px', background: '#FEF3C7', color: '#B45309', fontWeight: 800, padding: '2px 7px', borderRadius: '4px' }}>
                        ⏱ {group.slotLabel}
                      </span>
                      <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#475569' }}>
                        {pendingInGroup > 0 ? <span style={{ color: '#EA580C' }}>{pendingInGroup} Pending</span> : null}
                        {pendingInGroup > 0 && deliveredInGroup > 0 ? ' · ' : null}
                        {deliveredInGroup > 0 ? <span style={{ color: '#059669' }}>{deliveredInGroup} Delivered</span> : null}
                      </span>
                    </div>

                    <a
                      href={group.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: '#0284C7',
                        color: '#FFF',
                        padding: '5px 10px',
                        borderRadius: '6px',
                        fontSize: '11.5px',
                        fontWeight: 800,
                        textDecoration: 'none'
                      }}
                    >
                      <MapPin size={12} />
                      <span>Navigate</span>
                    </a>
                  </div>

                  {/* Individual Flat Rows inside the Block Group */}
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {group.orders.map((order, idx) => {
                      const isCod = (order.paymentMethod || '').includes('PAY_ON_DELIVERY') || order.paymentMethod === 'COD';
                      const isDelivered = order.status === 'DELIVERED';
                      const isCancelled = order.status === 'CANCELLED';
                      const isCodPaid = order.paymentStatus === 'PAID' || order.codPaymentReceived;
                      const flatDisplay = order.flatNumber || order.flatNo || 'Gate Desk';

                      return (
                        <div
                          key={order.id}
                          style={{
                            padding: '12px 14px',
                            borderBottom: idx < group.orders.length - 1 ? '1px solid #F1F5F9' : 'none',
                            background: isDelivered ? '#FAFFFC' : isCancelled ? '#FFFBFB' : '#FFFFFF',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px'
                          }}
                        >
                          {/* Row 1: Flat Badge + Resident + 1-Tap Call + Payment Badge */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <span style={{
                                background: isDelivered ? '#DCFCE7' : isCancelled ? '#FEE2E2' : '#FFF7ED',
                                color: isDelivered ? '#15803D' : isCancelled ? '#B91C1C' : '#C2410C',
                                border: `1.5px solid ${isDelivered ? '#86EFAC' : isCancelled ? '#FCA5A5' : '#FDBA74'}`,
                                fontSize: '13px',
                                fontWeight: 900,
                                padding: '3px 9px',
                                borderRadius: '6px'
                              }}>
                                Flat {flatDisplay}
                              </span>
                              <strong style={{ fontSize: '13.5px', color: '#0F172A' }}>
                                {order.userName || order.customerName || 'Resident'}
                              </strong>
                              <span style={{ fontSize: '11.5px', color: '#64748B', fontFamily: 'monospace', fontWeight: 700 }}>
                                #{order.id}
                              </span>
                              <a
                                href={`tel:${order.userPhone || '9845011999'}`}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  background: '#ECFDF5',
                                  color: '#059669',
                                  border: '1px solid #A7F3D0',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  fontSize: '11.5px',
                                  fontWeight: 800,
                                  textDecoration: 'none'
                                }}
                              >
                                <Phone size={11} />
                                <span>Call</span>
                              </a>
                            </div>

                            {/* Payment Pill */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              {isCod ? (
                                isCodPaid ? (
                                  <span style={{ background: '#DCFCE7', color: '#166534', border: '1px solid #86EFAC', padding: '3px 8px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 900 }}>
                                    ✅ COD Paid ₹{(order.totalAmount || 0).toLocaleString()} ({order.codReceivedMode === 'UPI_QR' ? 'UPI QR' : 'Cash'})
                                  </span>
                                ) : (
                                  <span style={{ background: '#FEF2F2', color: '#B91C1C', border: '1.5px solid #FCA5A5', padding: '3px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 900 }}>
                                    💵 Collect ₹{(order.totalAmount || 0).toLocaleString()} COD
                                  </span>
                                )
                              ) : (
                                <span style={{ background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0', padding: '3px 8px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 800 }}>
                                  ✅ Prepaid Online
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Row 2: Compact Produce Item Pills + 1-Tap Rider Actions */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', flex: 1, minWidth: '180px' }}>
                              {(order.items || []).map((it, iIdx) => {
                                const q = it.qty || it.quantity || 1;
                                const cleanU = String(it.unit || '').replace(/\b(?:pc|pcs|pieces?)\b/gi, '').trim();
                                return (
                                  <span
                                    key={iIdx}
                                    style={{
                                      background: '#F1F5F9',
                                      color: '#1E293B',
                                      border: '1px solid #E2E8F0',
                                      padding: '2px 7px',
                                      borderRadius: '5px',
                                      fontSize: '11.5px',
                                      fontWeight: 700
                                    }}
                                  >
                                    {it.name || it.productName} · <strong>{cleanU ? `${q} ${cleanU}` : `×${q}`}</strong>
                                  </span>
                                );
                              })}
                            </div>

                            {/* Action Buttons */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                onClick={() => setSelectedOrder(order)}
                                style={{
                                  background: '#F8FAFC',
                                  color: '#475569',
                                  border: '1px solid #CBD5E1',
                                  padding: '5px 8px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: 800,
                                  cursor: 'pointer'
                                }}
                              >
                                Label
                              </button>
                              <button
                                type="button"
                                onClick={() => printOrderTaxInvoice(order)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  background: '#F8FAFC',
                                  color: '#334155',
                                  border: '1px solid #CBD5E1',
                                  padding: '5px 8px',
                                  borderRadius: '6px',
                                  fontWeight: 700,
                                  fontSize: '11px',
                                  cursor: 'pointer'
                                }}
                                title="Print Slip"
                              >
                                <Printer size={12} />
                                <span>Slip</span>
                              </button>

                              {isCancelled ? (
                                <span style={{ color: '#DC2626', fontWeight: 800, fontSize: '11.5px', background: '#FEF2F2', padding: '4px 9px', borderRadius: '6px', border: '1px solid #FCA5A5' }}>
                                  ✕ Undelivered ({order.cancelledReason || 'Returned'})
                                </span>
                              ) : isDelivered ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#059669', fontWeight: 800, fontSize: '12px', background: '#DCFCE7', padding: '4px 10px', borderRadius: '6px' }}>
                                  <CheckCircle2 size={14} />
                                  <span>Delivered</span>
                                </span>
                              ) : (
                                <>
                                  {isCod && !isCodPaid && (
                                    <>
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
                                          padding: '6px 10px',
                                          borderRadius: '6px',
                                          fontSize: '11.5px',
                                          fontWeight: 800,
                                          cursor: 'pointer'
                                        }}
                                      >
                                        💵 Cash
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setCodModalOrder(order);
                                          setCodPaymentMode('UPI_QR');
                                        }}
                                        style={{
                                          background: '#0284C7',
                                          color: '#FFF',
                                          border: 'none',
                                          padding: '6px 10px',
                                          borderRadius: '6px',
                                          fontSize: '11.5px',
                                          fontWeight: 800,
                                          cursor: 'pointer'
                                        }}
                                      >
                                        📱 UPI QR
                                      </button>
                                    </>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => setDeliveryConfirmOrder(order)}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      background: '#059669',
                                      color: '#FFF',
                                      border: 'none',
                                      padding: '6px 12px',
                                      borderRadius: '6px',
                                      fontWeight: 800,
                                      fontSize: '12px',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    <CheckCircle2 size={14} />
                                    <span>Deliver</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRiderCancelModalOrder(order);
                                      setRiderCancelReason('CUSTOMER_NOT_AVAILABLE');
                                      setRiderCancelNotes('');
                                    }}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      background: '#FEF2F2',
                                      color: '#DC2626',
                                      border: '1px solid #FCA5A5',
                                      padding: '6px 10px',
                                      borderRadius: '6px',
                                      fontWeight: 800,
                                      fontSize: '11.5px',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    <XCircle size={13} />
                                    <span>Undelivered</span>
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
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
                  <th>Assigned Driver & Logistics</th>
                  <th>Live Fulfillment Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingOrders ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '40px' }}>
                      <RefreshCw size={24} style={{ margin: '0 auto 10px', display: 'block', animation: 'spin 1s linear infinite', color: '#0284C7' }} />
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>Loading Orders Pipeline...</div>
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan="8">
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
                          </div>
                          {(() => {
                            const { block, flat } = extractBlockAndFlat(order.flatNo || order.flatNumber);
                            return (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px' }}>
                                <span style={{ fontSize: '10.5px', background: '#234B3C', color: '#FFF', fontWeight: 800, padding: '1px 5px', borderRadius: '4px' }}>
                                  📦 {block}
                                </span>
                                <span style={{ fontSize: '11px', background: '#EBF2EE', color: '#234B3C', fontWeight: 800, padding: '1px 5px', borderRadius: '4px', border: '1px solid #C8DBD0' }}>
                                  📍 {flat}
                                </span>
                              </div>
                            );
                          })()}
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
                          {order.deliveryPartnerName ? (
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12.5px', fontWeight: 800, color: '#0F172A' }}>
                                <Truck size={13} color="#D97706" />
                                <span>{order.deliveryPartnerName}</span>
                              </div>
                              {order.deliveryPartnerPhone && (
                                <a
                                  href={`tel:${order.deliveryPartnerPhone}`}
                                  style={{
                                    fontSize: '11px',
                                    color: '#059669',
                                    fontWeight: 700,
                                    textDecoration: 'none',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    marginTop: '2px'
                                  }}
                                >
                                  <Phone size={10} />
                                  <span>+91 {order.deliveryPartnerPhone}</span>
                                </a>
                              )}
                              <div style={{ fontSize: '10.5px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '3px', flexWrap: 'wrap' }}>
                                {order.vehicleNumber && (
                                  <span style={{ fontFamily: 'monospace', fontWeight: 800, background: '#F1F5F9', color: '#334155', padding: '1px 5px', borderRadius: '3px' }}>
                                    {order.vehicleNumber}
                                  </span>
                                )}
                                {order.deliveryLotId && (
                                  <span style={{ fontWeight: 800, color: '#234B3C', background: '#EBF2EE', padding: '1px 5px', borderRadius: '3px' }}>
                                    #{order.deliveryLotId}
                                  </span>
                                )}
                              </div>
                              {order.dispatchedBy && (
                                <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '2px' }}>
                                  Dispatched: {order.dispatchedBy}
                                </div>
                              )}
                            </div>
                          ) : currentStatus === 'OUT_FOR_DELIVERY' ? (
                            <div>
                              <div style={{ fontSize: '11.5px', color: '#D97706', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Truck size={12} color="#D97706" />
                                <span>Hub Fleet Transport</span>
                              </div>
                              <div style={{ fontSize: '10.5px', color: '#94A3B8', marginTop: '2px' }}>
                                In-Transit to Drop Desk
                              </div>
                            </div>
                          ) : (
                            <div style={{ fontSize: '11px', color: '#94A3B8', fontStyle: 'italic' }}>
                              Awaiting Handover
                            </div>
                          )}
                        </td>

                        <td>
                          {/* STRICT PERMISSION: Only Super Admin gets the reversible selector dropdown */}
                          {isSuperAdmin ? (
                            <select
                              value={currentStatus}
                              onChange={(e) => {
                                if (e.target.value === 'DELIVERED') {
                                  setDeliveryConfirmOrder(order);
                                } else {
                                  handleUpdateOrderStatus(order.id, e.target.value);
                                }
                              }}
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
                              <option value="PROCURING">PROCURING (Inward Sourcing)</option>
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
                          {currentStatus === 'CANCELLED' && order.cancelledReason && (
                            <div style={{ fontSize: '10px', color: '#DC2626', fontWeight: 700, marginTop: '3px', maxWidth: '170px', lineHeight: 1.2 }}>
                              ⚠️ {order.cancelledReason}
                            </div>
                          )}
                          {currentStatus === 'DELIVERED' && order.deliveredAt && (
                            <div style={{ fontSize: '10px', color: '#15803D', fontWeight: 700, marginTop: '3px' }}>
                              ✓ Verified at {new Date(order.deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          )}
                          {order.lastStatusUpdate && (
                            <div style={{ fontSize: '10px', color: '#64748B', marginTop: '2px' }}>
                              Updated: {order.lastStatusUpdate}
                            </div>
                          )}
                        </td>

                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {currentStatus === 'OUT_FOR_DELIVERY' && isSuperAdmin && (
                            <button
                              type="button"
                              onClick={() => setDeliveryConfirmOrder(order)}
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
                              title="Mark Delivered to society drop desk (Super Admin override)"
                            >
                              <CheckCircle2 size={13} />
                              <span>Mark Delivered</span>
                            </button>
                          )}
                          {currentStatus === 'OUT_FOR_DELIVERY' && !isSuperAdmin && (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: '#FEF3C7',
                              color: '#92400E',
                              border: '1px solid #FDE68A',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                              marginRight: '6px'
                            }}>
                              <Truck size={12} color="#D97706" />
                              <span>In-Transit with Rider</span>
                            </span>
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
                          <button
                            type="button"
                            onClick={() => printOrderTaxInvoice(order)}
                            style={{
                              background: '#F0FDF4',
                              border: '1px solid #BBF7D0',
                              padding: '5px 9px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 700,
                              color: '#166534',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              marginLeft: '6px'
                            }}
                            title="Print Tax Invoice / Delivery Slip"
                          >
                            <Printer size={12} />
                            <span>Invoice</span>
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

                {/* LOGISTICS & DISPATCH AUDIT BOX */}
                {(selectedOrder.deliveryPartnerName || selectedOrder.dispatchedBy || selectedOrder.status === 'OUT_FOR_DELIVERY' || selectedOrder.status === 'DELIVERED') && (
                  <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '10px 12px', marginTop: '10px', fontSize: '12px' }}>
                    <div style={{ fontWeight: 800, color: '#334155', textTransform: 'uppercase', fontSize: '11px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Truck size={13} color="#D97706" />
                      <span>Logistics & Handover Audit Trail:</span>
                    </div>
                    {selectedOrder.deliveryPartnerName && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                        <span style={{ color: '#64748B' }}>Assigned Partner:</span>
                        <strong style={{ color: '#0F172A' }}>{selectedOrder.deliveryPartnerName} {selectedOrder.deliveryPartnerPhone ? `(+91 ${selectedOrder.deliveryPartnerPhone})` : ''}</strong>
                      </div>
                    )}
                    {selectedOrder.vehicleNumber && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                        <span style={{ color: '#64748B' }}>Vehicle Registration:</span>
                        <span style={{ fontFamily: 'monospace', fontWeight: 800 }}>{selectedOrder.vehicleNumber}</span>
                      </div>
                    )}
                    {selectedOrder.deliveryLotId && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                        <span style={{ color: '#64748B' }}>Delivery Lot Code:</span>
                        <strong style={{ color: '#234B3C' }}>#{selectedOrder.deliveryLotId}</strong>
                      </div>
                    )}
                    {selectedOrder.dispatchedBy && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                        <span style={{ color: '#64748B' }}>Dispatched By:</span>
                        <span>{selectedOrder.dispatchedBy}</span>
                      </div>
                    )}
                    {selectedOrder.cancelledReason && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', paddingTop: '4px', borderTop: '1px dashed #FCA5A5', color: '#991B1B' }}>
                        <span>Cancellation Reason:</span>
                        <strong>{selectedOrder.cancelledReason}</strong>
                      </div>
                    )}
                  </div>
                )}

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
                            {(() => {
                              const cleanU = String(u || '').replace(/\b(?:pc|pcs|pieces?)\b/gi, '').trim();
                              return cleanU ? `${q} ${cleanU}` : `×${q}`;
                            })()}
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

                <button
                  type="button"
                  onClick={() => printOrderTaxInvoice(selectedOrder)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#059669',
                    color: '#FFF',
                    border: 'none',
                    padding: '7px 16px',
                    borderRadius: '6px',
                    fontWeight: 800,
                    fontSize: '12.5px',
                    cursor: 'pointer'
                  }}
                  title="Print Tax Invoice / Packing Slip"
                >
                  <Printer size={14} />
                  <span>Print Tax Invoice</span>
                </button>

                {isDeliveryExecutive && selectedOrder.status !== 'DELIVERED' && (
                  <button
                    type="button"
                    onClick={() => {
                      setDeliveryConfirmOrder(selectedOrder);
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

      {/* ================= ORDER DELIVERY CONFIRMATION MODAL ================= */}
      {deliveryConfirmOrder && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 11000,
          padding: '16px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            maxWidth: '460px',
            width: '100%',
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
            border: '1.5px solid #E2E8F0'
          }}>
            <div style={{
              background: '#F0FDF4',
              padding: '18px 20px',
              borderBottom: '1.5px solid #BBF7D0',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: '#DCFCE7',
                color: '#15803D',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <CheckCircle2 size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#166534', margin: 0 }}>
                  Confirm Order Delivery
                </h3>
                <p style={{ fontSize: '12px', color: '#15803D', margin: '2px 0 0' }}>
                  Society Doorstep Drop Verification
                </p>
              </div>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
                padding: '14px',
                marginBottom: '16px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#64748B' }}>Order ID:</span>
                  <strong style={{ fontSize: '13px', color: '#0F172A', fontFamily: 'monospace' }}>#{deliveryConfirmOrder.id}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#64748B' }}>Customer:</span>
                  <strong style={{ fontSize: '13px', color: '#0F172A' }}>{deliveryConfirmOrder.userName || 'Resident'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#64748B' }}>Flat / Society:</span>
                  <strong style={{ fontSize: '13px', color: '#0F172A', textAlign: 'right', maxWidth: '240px' }}>
                    {deliveryConfirmOrder.flat ? `${deliveryConfirmOrder.flat}, ` : ''}{deliveryConfirmOrder.societyName}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '12px', color: '#64748B' }}>Amount & Mode:</span>
                  <strong style={{ fontSize: '13px', color: '#059669' }}>
                    ₹{deliveryConfirmOrder.totalAmount || 0} ({deliveryConfirmOrder.paymentMethod || 'PAID'})
                  </strong>
                </div>
              </div>
              {deliveryConfirmOrder.paymentMethod === 'COD' && (
                <div style={{
                  background: '#FEF3C7',
                  border: '1px solid #FCD34D',
                  color: '#92400E',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <AlertCircle size={16} />
                  <span>Cash on Delivery: Ensure ₹{deliveryConfirmOrder.totalAmount} cash was collected.</span>
                </div>
              )}
              <p style={{ fontSize: '13px', color: '#475569', margin: '0 0 4px', lineHeight: 1.5 }}>
                Are you sure you want to mark this order as <strong>DELIVERED</strong>?
              </p>
            </div>
            <div style={{
              padding: '14px 20px',
              background: '#F8FAFC',
              borderTop: '1px solid #E2E8F0',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px'
            }}>
              <button
                type="button"
                onClick={() => setDeliveryConfirmOrder(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: '#FFFFFF',
                  border: '1.5px solid #CBD5E1',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  handleUpdateOrderStatus(deliveryConfirmOrder.id, 'DELIVERED');
                  setDeliveryConfirmOrder(null);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 18px',
                  borderRadius: '8px',
                  background: '#059669',
                  color: '#FFFFFF',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(5, 150, 105, 0.3)'
                }}
              >
                <CheckCircle2 size={15} />
                <span>Yes, Confirm Delivered</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= COMPACT COD / UPI PAYMENT MODAL ================= */}
      {codModalOrder && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 11000,
          padding: '16px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '14px',
            maxWidth: '360px',
            width: '100%',
            padding: '16px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25)',
            border: '1.5px solid #E2E8F0',
            maxHeight: '94vh',
            overflowY: 'auto'
          }}>
            {/* Compact Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IndianRupee size={17} />
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 900, color: '#0F172A' }}>
                    Collect ₹{(codModalOrder.totalAmount || 0).toLocaleString()}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>
                    #{codModalOrder.id} • Flat {codModalOrder.flatNumber || codModalOrder.flatNo || 'Drop Desk'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCodModalOrder(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Mode of Payment Pill Selector */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', background: '#F1F5F9', padding: '3px', borderRadius: '8px', marginBottom: '12px' }}>
              <button
                type="button"
                onClick={() => setCodPaymentMode('UPI_QR')}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  background: codPaymentMode === 'UPI_QR' ? '#FFFFFF' : 'transparent',
                  color: codPaymentMode === 'UPI_QR' ? '#0369A1' : '#64748B',
                  fontWeight: 800,
                  fontSize: '12px',
                  cursor: 'pointer',
                  boxShadow: codPaymentMode === 'UPI_QR' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <QrCode size={13} />
                <span>UPI QR</span>
              </button>

              <button
                type="button"
                onClick={() => setCodPaymentMode('CASH')}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  background: codPaymentMode === 'CASH' ? '#FFFFFF' : 'transparent',
                  color: codPaymentMode === 'CASH' ? '#15803D' : '#64748B',
                  fontWeight: 800,
                  fontSize: '12px',
                  cursor: 'pointer',
                  boxShadow: codPaymentMode === 'CASH' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <span>💵</span>
                <span>Cash</span>
              </button>
            </div>

            {/* UPI QR Display */}
            {codPaymentMode === 'UPI_QR' && (
              <div style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
                padding: '12px',
                marginBottom: '12px',
                textAlign: 'center'
              }}>
                {isLoadingQr ? (
                  <div style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <RefreshCw size={20} color="#0284C7" style={{ animation: 'spin 1s linear infinite' }} />
                    <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#0369A1' }}>
                      Generating QR for ₹{(codModalOrder.totalAmount || 0).toLocaleString()}...
                    </span>
                  </div>
                ) : dynamicQrData?.imageUrl ? (
                  <div>
                    <div style={{
                      display: 'inline-block',
                      background: '#FFFFFF',
                      padding: '8px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
                    }}>
                      <img 
                        src={dynamicQrData.imageUrl} 
                        alt="UPI QR" 
                        style={{ width: '140px', height: '140px', display: 'block', borderRadius: '4px' }} 
                      />
                    </div>

                    <div style={{ marginTop: '8px', fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                      Scan to Pay ₹{(codModalOrder.totalAmount || 0).toLocaleString()}
                    </div>
                    <div style={{ fontSize: '10.5px', color: '#64748B', marginTop: '2px' }}>
                      freshioz@icici • Any UPI App
                    </div>

                    <input
                      type="text"
                      placeholder="UTR / Ref # (Optional)"
                      value={customRefId}
                      onChange={(e) => setCustomRefId(e.target.value)}
                      style={{
                        width: '100%',
                        height: '30px',
                        padding: '0 8px',
                        borderRadius: '5px',
                        border: '1px solid #CBD5E1',
                        fontSize: '11px',
                        marginTop: '8px',
                        background: '#FFFFFF'
                      }}
                    />
                  </div>
                ) : (
                  <div style={{ color: '#DC2626', fontSize: '11.5px', padding: '10px' }}>
                    UPI QR unavailable. Collect cash or pay to freshioz@icici.
                  </div>
                )}
              </div>
            )}

            {/* Cash Display */}
            {codPaymentMode === 'CASH' && (
              <div style={{
                background: '#F0FDF4',
                border: '1px solid #BBF7D0',
                borderRadius: '10px',
                padding: '14px',
                marginBottom: '12px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#166534' }}>
                  💵 Collect ₹{(codModalOrder.totalAmount || 0).toLocaleString()} in Cash
                </div>
                <div style={{ fontSize: '11.5px', color: '#15803D', marginTop: '3px' }}>
                  Customer: {codModalOrder.userName || codModalOrder.customerName || 'Resident'}
                </div>
              </div>
            )}

            {/* Compact Footer Actions */}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setCodModalOrder(null)}
                style={{
                  padding: '7px 12px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  background: '#FFF',
                  color: '#64748B',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => {
                  const target = codModalOrder;
                  if (target.status === 'DELIVERED') {
                    handleRecordCodPayment(target.id, codPaymentMode, false, customRefId || dynamicQrData?.qrId || null);
                  } else {
                    handleRecordCodPayment(target.id, codPaymentMode, true, customRefId || dynamicQrData?.qrId || null);
                  }
                }}
                style={{
                  padding: '7px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#059669',
                  color: '#FFF',
                  fontWeight: 800,
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <CheckCircle2 size={14} />
                <span>{codModalOrder.status === 'DELIVERED' ? 'Confirm Received' : 'Mark Delivered ➔'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RIDER DELIVERY EXCEPTION & CANCELLATION */}
      {riderCancelModalOrder && (() => {
        const { block, flat } = extractBlockAndFlat(riderCancelModalOrder.flatNo);
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
              maxWidth: '480px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25)',
              border: '2px solid #DC2626'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', borderBottom: '1.5px solid #F1F5F9', paddingBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#FEF2F2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <XCircle size={22} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 900, color: '#0F172A', margin: 0 }}>
                      Report Delivery Exception / Cancel
                    </h3>
                    <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                      #{riderCancelModalOrder.id} • Flat {flat} ({riderCancelModalOrder.societyName})
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setRiderCancelModalOrder(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleConfirmRiderCancel}>
                {/* Destination & Customer Summary */}
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '12px', marginBottom: '14px', fontSize: '12.5px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: '#64748B' }}>Resident:</span>
                    <strong style={{ color: '#0F172A' }}>{riderCancelModalOrder.userName} (+91 {riderCancelModalOrder.userPhone})</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: '#64748B' }}>Destination:</span>
                    <strong>{riderCancelModalOrder.societyName} — Flat {flat} (Block {block})</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Basket Items:</span>
                    <span>{(riderCancelModalOrder.items || []).length} produce items</span>
                  </div>
                </div>

                {/* Exception Reason Selector */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '12.5px', fontWeight: 800, display: 'block', marginBottom: '6px', color: '#1E293B' }}>
                    Select Reason for Non-Delivery *
                  </label>
                  <select
                    value={riderCancelReason}
                    onChange={(e) => setRiderCancelReason(e.target.value)}
                    style={{
                      width: '100%',
                      height: '42px',
                      padding: '0 12px',
                      borderRadius: '8px',
                      border: '1.5px solid #CBD5E1',
                      background: '#FFF',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: '#0F172A',
                      cursor: 'pointer'
                    }}
                    required
                  >
                    <option value="CUSTOMER_NOT_AVAILABLE">🚪 Resident Not Available / Flat Locked / Unreachable</option>
                    <option value="WRONG_ADDRESS">📍 Incorrect Flat # / Wrong Community Address</option>
                    <option value="CUSTOMER_REFUSED">🙅 Resident Refused Delivery / Cancelled at Doorstep</option>
                    <option value="QUALITY_REJECTED">🥦 Produce Quality Rejected by Resident</option>
                    <option value="SOCIETY_GATE_DENIED">⛔ Society Security / Association Denied Entry</option>
                    <option value="OTHER">✏️ Other Delivery Exception</option>
                  </select>
                </div>

                {/* Additional Rider Notes */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '4px', color: '#475569' }}>
                    Rider Delivery Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Called resident 3 times, flat door locked. Security verified resident not in town."
                    value={riderCancelNotes}
                    onChange={(e) => setRiderCancelNotes(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '12.5px',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Doorstep Proof Photo Facility */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', color: '#1E293B' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Camera size={15} color="#DC2626" />
                      <span>Take Photo Proof (Door Locked / Rejected Produce)</span>
                    </span>
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Audited by Hub Lead</span>
                  </label>

                  {riderCancelPhoto ? (
                    <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1.5px solid #86EFAC', background: '#F0FDF4', padding: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <img
                        src={riderCancelPhoto}
                        alt="Cancellation Proof"
                        style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '12px', fontWeight: 800, color: '#166534' }}>✓ Photo Attached</div>
                        <div style={{ fontSize: '11px', color: '#475569' }}>Will be audited during produce inward review</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setRiderCancelPhoto(null)}
                        style={{ padding: '4px 8px', background: '#FEE2E2', border: '1px solid #FCA5A5', color: '#991B1B', borderRadius: '6px', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <label style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1.5px dashed #CBD5E1',
                      background: '#F8FAFC',
                      cursor: 'pointer',
                      gap: '4px',
                      transition: 'all 0.15s ease'
                    }}>
                      <Camera size={20} color="#64748B" />
                      <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#2563EB' }}>
                        {isCompressingPhoto ? 'Processing Camera Photo...' : '📸 Snap Photo via Phone Camera / Upload'}
                      </span>
                      <span style={{ fontSize: '11px', color: '#64748B' }}>
                        Photo of Flat Door #{extractBlockAndFlat(riderCancelModalOrder?.flatNo).flat || ''} or rejected produce
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handlePhotoCapture}
                        style={{ display: 'none' }}
                      />
                    </label>
                  )}
                </div>

                {/* Return Produce Notice */}
                <div style={{
                  background: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  marginBottom: '18px',
                  fontSize: '12px',
                  color: '#991B1B',
                  lineHeight: 1.4,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px'
                }}>
                  <AlertCircle size={16} color="#DC2626" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong>Inventory Return Required:</strong> Order will be marked <strong>CANCELLED</strong>. Keep the produce bag sealed in the crate and hand it back to the warehouse lead during return reconciliation.
                  </div>
                </div>

                {/* Modal Buttons */}
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setRiderCancelModalOrder(null)}
                    style={{
                      padding: '9px 16px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      background: '#FFF',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      color: '#475569'
                    }}
                  >
                    Back / Keep Stop
                  </button>

                  <button
                    type="submit"
                    style={{
                      padding: '9px 18px',
                      borderRadius: '8px',
                      border: 'none',
                      background: '#DC2626',
                      color: '#FFF',
                      fontSize: '13px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 4px rgba(220, 38, 38, 0.25)'
                    }}
                  >
                    <XCircle size={15} />
                    <span>Confirm Undelivered & Cancel ➔</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
