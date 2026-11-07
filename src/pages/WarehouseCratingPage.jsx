import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  ClipboardList, 
  CheckCircle2, 
  Truck, 
  PackageCheck, 
  Building2, 
  User, 
  Phone, 
  Tag, 
  Send, 
  AlertCircle,
  X,
  Layers,
  MapPin,
  Calendar,
  Clock,
  Printer,
  ChevronRight,
  Warehouse,
  Boxes,
  Box,
  Filter,
  Check,
  RotateCcw,
  Camera
} from 'lucide-react';
import { useAdminRole } from '../context/AdminRoleContext';
import { useToast } from '../context/ToastContext';
import { orders as orderResource, employees as employeeResource, warehouses as warehouseResource, societies as societyResource, procurement as procurementResource, useUpdateOrderStatus, useAdjustStock } from '../hooks/resources';
import AdminPagination from '../components/common/AdminPagination';
import { extractBlockAndFlat } from '../utils/addressParser';

// Helper to parse unit weight
const parseUnitWeightInKg = (unitStr) => {
  if (!unitStr) return 1;
  const s = String(unitStr).toLowerCase().trim();
  const tonMatch = s.match(/(\d+(?:\.\d+)?)\s*ton/);
  if (tonMatch) return parseFloat(tonMatch[1]) * 1000;
  const quintalMatch = s.match(/(\d+(?:\.\d+)?)\s*q(?:uintal)?/);
  if (quintalMatch) return parseFloat(quintalMatch[1]) * 100;
  const kgMatch = s.match(/(\d+(?:\.\d+)?)\s*kg/);
  if (kgMatch) return parseFloat(kgMatch[1]);
  const gMatch = s.match(/(\d+(?:\.\d+)?)\s*g(?:rams?)?/);
  if (gMatch) return parseFloat(gMatch[1]) / 1000;
  if (s.includes('bunch')) {
    const bunchCount = s.match(/(\d+)\s*bunch/);
    if (bunchCount) return parseFloat(bunchCount[1]) * 0.25;
    return 0.25;
  }
  if (s.includes('pack') || s.includes('tray')) {
    const packCount = s.match(/(\d+)\s*(?:pack|tray)/);
    if (packCount) return parseFloat(packCount[1]) * 0.5;
    return 0.5;
  }
  return 1;
};

// Mask resident phone with *** leaving only the last 3 digits, while preserving full tel: link for calling
const formatMaskedPhone = (phone) => {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length <= 3) return '***';
  const last3 = digits.slice(-3);
  return `+91 *******${last3}`;
};

export default function WarehouseCratingPage() {
  const { currentUser, currentRoleId } = useAdminRole();
  const { showToast } = useToast();

  const isDeliveryExecutive = currentRoleId === 'DELIVERY_EXECUTIVE' || currentUser?.role === 'DELIVERY_EXECUTIVE';
  const isProcurementAllowed =
    currentRoleId === 'SUPER_ADMIN' ||
    currentRoleId === 'WAREHOUSE_MANAGER' ||
    currentRoleId === 'PROCUREMENT_OFFICER' ||
    currentUser?.roles?.includes('SUPER_ADMIN') ||
    currentUser?.roles?.includes('WAREHOUSE_MANAGER') ||
    currentUser?.roles?.includes('PROCUREMENT_OFFICER') ||
    currentUser?.role === 'SUPER_ADMIN' ||
    currentUser?.role === 'WAREHOUSE_MANAGER' ||
    currentUser?.role === 'PROCUREMENT_OFFICER';

  const { data: rawOrders = [], isLoading: isLoadingOrders } = orderResource.useList();
  const { data: rawEmployees = [] } = employeeResource.useList(null, { enabled: !isDeliveryExecutive });
  const { data: rawWarehouses = [] } = warehouseResource.useList();
  const { data: rawSocieties = [] } = societyResource.useList();
  const { data: rawProcurement = [], isLoading: isLoadingProcurement } = procurementResource.useList(null, { enabled: isProcurementAllowed });

  const orders = Array.isArray(rawOrders) ? rawOrders : [];
  const employees = Array.isArray(rawEmployees) ? rawEmployees : [];
  const warehouses = Array.isArray(rawWarehouses) ? rawWarehouses : [];
  const societies = Array.isArray(rawSocieties) ? rawSocieties : [];
  const procurementBills = Array.isArray(rawProcurement) ? rawProcurement : [];

  // Modal to preview Mandi Weighing Slip
  const [viewSlipBill, setViewSlipBill] = useState(null);
  const [isAdvancingOrders, setIsAdvancingOrders] = useState(false);

  const updateOrderStatusMutation = useUpdateOrderStatus();
  const location = useLocation();
  const deliveryRiders = useMemo(() => {
    return employees.filter(e => {
      const roles = Array.isArray(e.roles) ? e.roles : (e.role ? [e.role] : []);
      return roles.some(r => String(r).toUpperCase().includes('DELIVERY')) ||
             (e.name && /delivery|driver|rider/i.test(e.name));
    });
  }, [employees]);

  // URL Hash synchronization (#packing, #dispatch, #delivered, #returns)
  const getTabFromHash = () => {
    if (typeof window === 'undefined') return 'PACKING_STATION';
    const hash = (window.location.hash || '').toLowerCase();
    if (hash === '#returns' || hash === '#return-audit') return 'RETURN_AUDIT';
    if (hash === '#dispatch' || hash === '#lots' || hash === '#delivered' || hash === '#out-for-delivery' || hash === '#ready') return 'SOCIETY_LOTS';
    return 'PACKING_STATION';
  };

  const getLotFilterFromHash = () => {
    if (typeof window === 'undefined') return 'ALL';
    const hash = (window.location.hash || '').toLowerCase();
    if (hash === '#delivered') return 'DELIVERED';
    if (hash === '#out-for-delivery') return 'OUT_FOR_DELIVERY';
    if (hash === '#ready') return 'READY_FOR_HANDOVER';
    // '#dispatch', '#lots', or default shows ALL lots first
    return 'ALL';
  };

  // Active view tab: 'PACKING_STATION' | 'SOCIETY_LOTS' | 'RETURN_AUDIT'
  const [activeTab, setActiveTab] = useState(getTabFromHash);
  const [lotFilter, setLotFilter] = useState(getLotFilterFromHash); // 'ALL' | 'READY_FOR_HANDOVER' | 'OUT_FOR_DELIVERY' | 'DELIVERED'
  const [dateFilter, setDateFilter] = useState('ALL'); // 'ALL' | 'TODAY' | 'TOMORROW' | dateStr
  const [slotFilter, setSlotFilter] = useState('ALL'); // 'ALL' | slot.id
  const [societyFilter, setSocietyFilter] = useState('ALL');
  const [blockFilter, setBlockFilter] = useState('ALL');
  const [packingStageFilter, setPackingStageFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'PACKED'
  const [searchQuery, setSearchQuery] = useState('');
  const [packingOrderIds, setPackingOrderIds] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Return & Wastage Quality Audit Desk State
  const adjustStockMutation = useAdjustStock();
  const [returnAudits, setReturnAudits] = useState(() => {
    try {
      const stored = localStorage.getItem('freshioz_warehouse_return_audits');
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      return {};
    }
  });
  const [returnItemAdjustments, setReturnItemAdjustments] = useState({});
  const [previewPhotoModal, setPreviewPhotoModal] = useState(null);
  const [isSubmittingAudit, setIsSubmittingAudit] = useState(false);

  const parseCancelDetails = (reasonStr) => {
    if (!reasonStr) return { reason: 'Cancelled at Doorstep', photo: null };
    const parts = reasonStr.split(' [PROOF_PHOTO]');
    return {
      reason: parts[0] || 'Cancelled at Doorstep',
      photo: parts[1] || null
    };
  };

  useEffect(() => {
    setActiveTab(getTabFromHash());
    setLotFilter(getLotFilterFromHash());
  }, [location.hash]);

  useEffect(() => {
    const handleHashChange = () => {
      setActiveTab(getTabFromHash());
      setLotFilter(getLotFilterFromHash());
    };
    window.addEventListener('hashchange', handleHashChange);
    if (!window.location.hash) {
      window.history.replaceState(null, '', '#packing');
    }
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    const targetHash = newTab === 'RETURN_AUDIT'
      ? '#returns'
      : (newTab === 'SOCIETY_LOTS' 
        ? (lotFilter === 'DELIVERED' ? '#delivered' : (lotFilter === 'OUT_FOR_DELIVERY' ? '#out-for-delivery' : '#dispatch')) 
        : '#packing');
    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash;
    }
  };

  const handleLotFilterChange = (filterVal) => {
    setLotFilter(filterVal);
    const targetHash = filterVal === 'DELIVERED' 
      ? '#delivered' 
      : (filterVal === 'OUT_FOR_DELIVERY' ? '#out-for-delivery' : (filterVal === 'READY_FOR_HANDOVER' ? '#ready' : '#dispatch'));
    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash;
    }
  };

  // Handover modal state
  const [handoverLot, setHandoverLot] = useState(null); // { societyName, orders, totalWeight, ... }
  const [driverId, setDriverId] = useState(deliveryRiders[0]?.id || '');
  const [driverName, setDriverName] = useState(deliveryRiders[0]?.name || '');
  const [driverPhone, setDriverPhone] = useState(deliveryRiders[0]?.phone || '');
  const [vehicleType, setVehicleType] = useState('Tata Ace (Mini-Truck)');
  const [vehicleNumber, setVehicleNumber] = useState('');

  // Address label preview modal
  const [labelModalOrder, setLabelModalOrder] = useState(null);

  // Packing Verification Checklist Modal
  const [packingModalOrder, setPackingModalOrder] = useState(null);
  const [checkedItems, setCheckedItems] = useState({});

  const handleOpenPackingVerification = (order) => {
    setPackingModalOrder(order);
    const initial = {};
    (order.items || []).forEach((_, idx) => {
      initial[idx] = true;
    });
    setCheckedItems(initial);
  };

  const toggleCheckItem = (idx) => {
    setCheckedItems(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const handleConfirmVerification = async (shouldPrintLabel = false) => {
    if (!packingModalOrder) return;
    const targetOrder = packingModalOrder;
    await handleMarkPacked(targetOrder.id);
    setPackingModalOrder(null);
    if (shouldPrintLabel) {
      setLabelModalOrder(targetOrder);
    }
  };

  // 1. Mark individual order packed with concurrency guard & status transition check
  const handleMarkPacked = async (orderId) => {
    if (packingOrderIds[orderId]) return;
    const targetOrder = orders.find(o => o.id === orderId);
    if (targetOrder && (targetOrder.status === 'PACKED' || targetOrder.status === 'OUT_FOR_DELIVERY' || targetOrder.status === 'DELIVERED')) {
      showToast(`Order #${orderId} is already packed.`, 'info');
      return;
    }

    setPackingOrderIds(prev => ({ ...prev, [orderId]: true }));
    try {
      await updateOrderStatusMutation.mutateAsync({
        id: orderId,
        status: 'PACKED',
        packedBy: currentUser?.name || 'Warehouse Packing Team',
        packedById: currentUser?.id || 'emp-packer',
      });
      showToast(`✓ Order #${orderId} packed!`, 'success');
    } catch (err) {
      console.error('Backend order packing status failed:', err);
      showToast(`Failed to pack order #${orderId}: ${err?.message || 'Server error'}`, 'error');
    } finally {
      setPackingOrderIds(prev => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
    }
  };

  // Crating station is strictly for warehouse ops; visibleOrders filters by manager warehouse
  const isRiderRole = currentUser?.role === 'DELIVERY_EXECUTIVE' && !currentUser?.roles?.includes('SUPER_ADMIN');

  // Filter orders based on user's role and assigned warehouse / route / dispatch slot
  const isSuperDesk = currentRoleId === 'SUPER_ADMIN' && (currentUser?.roles?.includes('SUPER_ADMIN') || currentUser?.role === 'SUPER_ADMIN' || currentUser?.email === 'superadmin@gmail.com');
  const isWarehouseScoped = !isSuperDesk;
  const isWarehouseStaff = currentRoleId === 'WAREHOUSE_STAFF' || (!isSuperDesk && currentUser?.role === 'WAREHOUSE_STAFF');

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

  // Dynamically resolve warehouse slots (Single Source of Truth from Warehouse Settings)
  const activeWarehouseSlots = useMemo(() => {
    if (Array.isArray(resolvedWh?.slots) && resolvedWh.slots.length > 0) {
      return resolvedWh.slots.filter(s => s.enabled !== false);
    }
    return [
      { id: 'SLOT_DAWN', label: 'Early Dawn Drop', startTime: '05:30', timeWindow: '05:30 AM – 07:00 AM' },
      { id: 'SLOT_MORNING', label: 'Morning Fresh Slot', startTime: '07:00', timeWindow: '07:00 AM – 08:30 AM' },
      { id: 'SLOT_EVENING', label: 'Evening Fresh Run', startTime: '17:30', timeWindow: '05:30 PM – 07:30 PM' }
    ];
  }, [resolvedWh]);

  // Exact configured time window from warehouse settings
  const getSlotPackingTime = (slot) => {
    if (slot?.timeWindow) return slot.timeWindow;
    const label = (slot?.label || '').toLowerCase();
    if (label.includes('dawn')) return '05:30 AM – 07:00 AM';
    if (label.includes('morning')) return '07:00 AM – 08:30 AM';
    if (label.includes('evening')) return '05:30 PM – 07:30 PM';
    return slot?.startTime || '';
  };

  // Resolve order's canonical slot ID & preserve historical slot time window snapshot if present
  const resolveOrderSlot = (order) => {
    const rawSlot = String(order?.deliverySlot || '').trim();
    const parenMatch = rawSlot.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
    const cleanSlotName = parenMatch ? parenMatch[1].trim() : rawSlot;
    const snapshotWindow = parenMatch ? parenMatch[2].trim() : '';
    const lowerName = cleanSlotName.toLowerCase();

    const matched = activeWarehouseSlots.find(s =>
      (order?.warehouseSlotId && s.id === order.warehouseSlotId) ||
      s.id === rawSlot ||
      (s.label && s.label.toLowerCase() === lowerName) ||
      (s.label && lowerName.includes(s.label.toLowerCase())) ||
      (s.label && s.label.toLowerCase().includes(lowerName) && lowerName.length > 3)
    );

    if (matched) {
      return {
        slotId: matched.id,
        slotLabel: matched.label,
        slotTimeWindow: snapshotWindow || getSlotPackingTime(matched)
      };
    }

    return {
      slotId: order?.warehouseSlotId || cleanSlotName || 'SLOT_MORNING',
      slotLabel: cleanSlotName || 'Morning Fresh Slot',
      slotTimeWindow: snapshotWindow || '07:00 AM – 08:30 AM'
    };
  };

  // Date helpers (DD/MM/YYYY format used across store)
  const todayStr = useMemo(() => new Date().toLocaleDateString('en-GB'), []);
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toLocaleDateString('en-GB');
  }, []);

  // Eligible warehouse orders (excludes Cancelled and invalid/failed-payment orders)
  const warehouseOrders = useMemo(() => {
    return orders.filter(order => {
      if (order.status === 'CANCELLED') return false;
      // Eligibility rule: must have valid order items and not be payment-failed
      if (!Array.isArray(order.items) || order.items.length === 0) return false;
      if (order.paymentStatus === 'FAILED') return false;

      if (isWarehouseScoped && warehouses.length > 1) {
        const orderWhId = order.warehouseId || order.warehouse?.id || societies.find(s => s.id === order.societyId)?.warehouseId;
        const orderWhCode = order.warehouseCode || order.warehouse?.code || warehouses.find(w => w.id === orderWhId)?.code;

        const isWhMatch = 
          (!orderWhId && !orderWhCode) ||
          (orderWhId && (orderWhId === assignedWhId || orderWhId === assignedWhCode || orderWhId === resolvedWh?.uuid)) ||
          (orderWhCode && (orderWhCode === assignedWhCode || orderWhCode === assignedWhId));

        if (!isWhMatch) return false;
      }

      if (isRiderRole) {
        const matchRider = 
          order.deliveryPartnerId === currentUser.id ||
          order.deliveryPartnerPhone === currentUser.phone ||
          (order.deliveryPartnerName && order.deliveryPartnerName.toLowerCase() === currentUser.name?.toLowerCase()) ||
          (currentUser.assignedLocationName && currentUser.assignedLocationName !== 'ALL' && currentUser.assignedLocationName !== 'Citywide' && order.societyName === currentUser.assignedLocationName);
        if (!matchRider) return false;
      }
      return true;
    });
  }, [orders, isWarehouseScoped, warehouses, societies, assignedWhId, assignedWhCode, resolvedWh, isRiderRole, currentUser]);

  // Filter by selected Delivery Date
  const dateFilteredOrders = useMemo(() => {
    if (dateFilter === 'ALL') return warehouseOrders;
    const targetDate = dateFilter === 'TODAY' ? todayStr : (dateFilter === 'TOMORROW' ? tomorrowStr : dateFilter);
    return warehouseOrders.filter(o => (o.deliveryDate || todayStr) === targetDate);
  }, [warehouseOrders, dateFilter, todayStr, tomorrowStr]);

  // Dynamic per-slot batch counts for the Time-Batch Tabs (active non-delivered orders)
  const slotBatchStats = useMemo(() => {
    const statsMap = {};
    activeWarehouseSlots.forEach(s => {
      statsMap[s.id] = {
        slot: s,
        slotId: s.id,
        label: s.label,
        timeWindow: getSlotPackingTime(s),
        totalFlats: 0,
        pendingCount: 0,
        packedCount: 0
      };
    });

    dateFilteredOrders.forEach(order => {
      if (order.status === 'DELIVERED') return;
      const resolved = resolveOrderSlot(order);
      if (!statsMap[resolved.slotId]) {
        statsMap[resolved.slotId] = {
          slot: { id: resolved.slotId, label: resolved.slotLabel, timeWindow: resolved.slotTimeWindow },
          slotId: resolved.slotId,
          label: resolved.slotLabel,
          timeWindow: resolved.slotTimeWindow,
          totalFlats: 0,
          pendingCount: 0,
          packedCount: 0
        };
      }
      statsMap[resolved.slotId].totalFlats += 1;
      if (order.status === 'PACKED' || order.status === 'OUT_FOR_DELIVERY') {
        statsMap[resolved.slotId].packedCount += 1;
      } else {
        statsMap[resolved.slotId].pendingCount += 1;
      }
    });

    return Object.values(statsMap);
  }, [activeWarehouseSlots, dateFilteredOrders]);

  // Filter by selected Time Batch Slot
  const visibleOrders = useMemo(() => {
    if (slotFilter === 'ALL') return dateFilteredOrders;
    return dateFilteredOrders.filter(order => {
      const resolved = resolveOrderSlot(order);
      return resolved.slotId === slotFilter || resolved.slotLabel === slotFilter;
    });
  }, [dateFilteredOrders, slotFilter, activeWarehouseSlots]);

  // Recent Mandi procurement bills inwarded for this warehouse
  const warehouseProcurements = useMemo(() => {
    return procurementBills.filter(b => {
      if (isWarehouseScoped && warehouses.length > 1) {
        const dest = b.destinationWarehouseId;
        const isMatch = !dest || dest === assignedWhId || dest === assignedWhCode || dest === resolvedWh?.uuid;
        if (!isMatch) return false;
      }
      return true;
    });
  }, [procurementBills, isWarehouseScoped, warehouses.length, assignedWhId, assignedWhCode, resolvedWh]);

  // Filter returned / cancelled orders for this warehouse (ONLY physical returns from delivery runs)
  const returnedOrders = useMemo(() => {
    return orders.filter(order => {
      if (order.status !== 'CANCELLED') return false;

      // Only orders that were physically dispatched / assigned to a delivery partner require warehouse quality audit
      const isPhysicalDoorstepReturn = Boolean(
        order.deliveryLotId || 
        order.deliveryPartnerId || 
        order.deliveryPartnerName ||
        (order.cancelledReason && (
          order.cancelledReason.includes('[PROOF_PHOTO]') || 
          order.cancelledReason.includes('Reported by Rider') ||
          order.cancelledReason.includes('Doorstep') ||
          order.cancelledReason.includes('Refused') ||
          order.cancelledReason.includes('Quality Rejected')
        ))
      );
      if (!isPhysicalDoorstepReturn) return false;

      if (isWarehouseScoped && warehouses.length > 1) {
        const orderWhId = order.warehouseId || order.warehouse?.id || societies.find(s => s.id === order.societyId)?.warehouseId;
        const orderWhCode = order.warehouseCode || order.warehouse?.code || warehouses.find(w => w.id === orderWhId)?.code;
        const isWhMatch = 
          (!orderWhId && !orderWhCode) ||
          (orderWhId && (orderWhId === assignedWhId || orderWhId === assignedWhCode || orderWhId === resolvedWh?.uuid)) ||
          (orderWhCode && (orderWhCode === assignedWhCode || orderWhCode === assignedWhId));
        if (!isWhMatch) return false;
      }
      return true;
    });
  }, [orders, isWarehouseScoped, warehouses.length, assignedWhId, assignedWhCode, resolvedWh, societies]);

  const handleApproveReturnAudit = async (order) => {
    setIsSubmittingAudit(true);
    try {
      const targetWhId = order.warehouseId || assignedWhId || resolvedWh?.id || 'WH_HEBBAL_01';
      const items = Array.isArray(order.items) ? order.items : [];
      let totalGoodKg = 0;
      let totalWastageKg = 0;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item.productId) continue;
        const key = `${order.id}_${i}`;
        const enteredGood = returnItemAdjustments[key]?.goodQty;
        const goodQty = enteredGood !== undefined ? Number(enteredGood) : (item.qty || 1);
        const wastageQty = Math.max(0, (item.qty || 1) - goodQty);
        totalGoodKg += goodQty;
        totalWastageKg += wastageQty;

        if (goodQty > 0) {
          await adjustStockMutation.mutateAsync({
            warehouseId: targetWhId,
            productId: item.productId,
            qty: goodQty,
            action: 'ADD',
            remarks: `Quality Restock from returned Order #${order.id} (${goodQty} kg good produce, ${wastageQty} kg wastage)`
          });
        }
      }

      const auditRecord = {
        auditedAt: new Date().toISOString(),
        auditedBy: currentUser?.name || 'Warehouse Operations Lead',
        totalGoodKg,
        totalWastageKg,
        itemsCount: items.length
      };

      const updatedAudits = { ...returnAudits, [order.id]: auditRecord };
      setReturnAudits(updatedAudits);
      localStorage.setItem('freshioz_warehouse_return_audits', JSON.stringify(updatedAudits));
      showToast(`✓ Quality Audit Completed for Order #${order.id}. Restocked ${totalGoodKg} kg produce to hub; ${totalWastageKg} kg written off as wastage.`, 'success');
    } catch (err) {
      showToast(err.message || 'Failed to complete quality audit.', 'error');
    } finally {
      setIsSubmittingAudit(false);
    }
  };

  const handleAdvanceOrdersToPacking = async () => {
    const pendingOrders = visibleOrders.filter(o => o.status === 'CONFIRMED' || o.status === 'PROCURING');
    if (pendingOrders.length === 0) {
      showToast('All active orders are already at warehouse or packed.', 'info');
      return;
    }
    setIsAdvancingOrders(true);
    try {
      await Promise.all(pendingOrders.map(order => 
        updateOrderStatusMutation.mutateAsync({
          id: order.id,
          status: 'AT_WAREHOUSE',
          notes: 'Advanced from Mandi produce arrival by Warehouse Staff'
        })
      ));
      showToast(`✓ Advanced ${pendingOrders.length} order(s) to Ready to Pack Station!`, 'success');
    } catch (err) {
      showToast(`Failed to advance some orders: ${err?.message || 'Error'}`, 'error');
    } finally {
      setIsAdvancingOrders(false);
    }
  };

  // Available societies and blocks from active orders
  const availableSocieties = useMemo(() => {
    const socMap = new Map();
    visibleOrders.forEach(o => {
      const id = o.societyId || o.societyName;
      if (id && !socMap.has(id)) {
        socMap.set(id, { id: o.societyId, name: o.societyName });
      }
    });
    return Array.from(socMap.values());
  }, [visibleOrders]);

  const availableBlocks = useMemo(() => {
    const blockSet = new Set();
    visibleOrders.forEach(o => {
      if (societyFilter === 'ALL' || o.societyId === societyFilter || o.societyName === societyFilter) {
        const { block } = extractBlockAndFlat(o.flatNo);
        blockSet.add(block);
      }
    });
    return Array.from(blockSet).sort();
  }, [visibleOrders, societyFilter]);

  // Filtered and Sorted Packing Orders (Active non-delivered orders)
  const filteredPackingOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return visibleOrders.filter(order => {
      if (order.status === 'DELIVERED') return false;
      if (societyFilter !== 'ALL' && order.societyId !== societyFilter && order.societyName !== societyFilter) {
        return false;
      }
      const { block, flat } = extractBlockAndFlat(order.flatNo);
      if (blockFilter !== 'ALL' && block !== blockFilter) {
        return false;
      }
      if (packingStageFilter === 'PENDING' && (order.status === 'PACKED' || order.status === 'OUT_FOR_DELIVERY')) {
        return false;
      }
      if (packingStageFilter === 'PACKED' && order.status !== 'PACKED' && order.status !== 'OUT_FOR_DELIVERY') {
        return false;
      }
      if (q) {
        const matchFlat = String(order.flatNo || '').toLowerCase().includes(q) || String(flat || '').toLowerCase().includes(q);
        const matchId = String(order.id || '').toLowerCase().includes(q);
        const matchName = String(order.userName || '').toLowerCase().includes(q);
        const matchPhone = String(order.userPhone || '').toLowerCase().includes(q);
        if (!matchFlat && !matchId && !matchName && !matchPhone) return false;
      }
      return true;
    }).sort((a, b) => {
      // 1. Unpacked (Pending) orders always at the TOP inside each crate
      const aPacked = a.status === 'PACKED' || a.status === 'OUT_FOR_DELIVERY' || a.status === 'DELIVERED' ? 1 : 0;
      const bPacked = b.status === 'PACKED' || b.status === 'OUT_FOR_DELIVERY' || b.status === 'DELIVERED' ? 1 : 0;
      if (aPacked !== bPacked) return aPacked - bPacked;

      // 2. Within same status, newest orders first (by createdAt if present, else flat number)
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (timeA !== timeB) return timeB - timeA;

      const bA = extractBlockAndFlat(a.flatNo);
      const bB = extractBlockAndFlat(b.flatNo);
      return (bA.flat || '').localeCompare(bB.flat || '', undefined, { numeric: true });
    });
  }, [visibleOrders, societyFilter, blockFilter, packingStageFilter, searchQuery]);

  // Group into Block Crates using Canonical 5-Part Grouping Key:
  // warehouse_id + delivery_date + warehouse_slot_id + society_id + block_id (+ dispatch lot isolation for late incoming orders)
  const blockCrates = useMemo(() => {
    const map = {};
    filteredPackingOrders.forEach(order => {
      const soc = order.societyName || 'Society Hub';
      const socId = order.societyId || soc;
      const delivDate = order.deliveryDate || todayStr;
      const slotInfo = resolveOrderSlot(order);
      const { block } = extractBlockAndFlat(order.flatNo);
      const dispatchScope = order.deliveryLotId ? `LOT_${order.deliveryLotId}` : 'ACTIVE';
      const key = `${assignedWhId || 'WH'}__${delivDate}__${slotInfo.slotId}__${socId}__${block}__${dispatchScope}`;
      const societyBatchKey = order.deliveryLotId
        ? `LOT_${order.deliveryLotId}`
        : `PENDING_${soc}__${delivDate}__${slotInfo.slotId}`;

      if (!map[key]) {
        map[key] = {
          key,
          societyBatchKey,
          warehouseId: assignedWhId || 'WH',
          deliveryDate: delivDate,
          slotId: slotInfo.slotId,
          slotLabel: slotInfo.slotLabel,
          slotTimeWindow: slotInfo.slotTimeWindow,
          societyName: soc,
          societyId: order.societyId,
          blockName: block,
          orders: [],
          totalItems: 0,
          totalWeightKg: 0,
          physicalCratesCount: 1,
          allPacked: true,
          isHandedOver: Boolean(order.deliveryLotId || order.status === 'OUT_FOR_DELIVERY'),
          pendingCount: 0,
          packedCount: 0,
        };
      }

      map[key].orders.push(order);
      map[key].totalItems += (order.items || []).length;

      (order.items || []).forEach(it => {
        const q = parseFloat(it.qty) || 1;
        const unit = String(it.unit || '').toLowerCase();
        let multiplier = 1;
        if (unit.includes('25 kg') || unit.includes('sack')) multiplier = 25;
        else if (unit.includes('20 kg') || unit.includes('crate')) multiplier = 20;
        else if (unit.includes('10 kg') || unit.includes('box')) multiplier = 10;
        map[key].totalWeightKg += q * multiplier;
      });

      map[key].physicalCratesCount = Math.max(1, Math.ceil(map[key].totalWeightKg / 20));

      if (order.status === 'PACKED' || order.status === 'OUT_FOR_DELIVERY' || order.status === 'DELIVERED') {
        map[key].packedCount += 1;
      } else {
        map[key].allPacked = false;
        map[key].pendingCount += 1;
      }
    });

    return Object.values(map).sort((a, b) => {
      // 1. Crates with Pending (unpacked) orders always at the TOP
      const aRank = a.pendingCount > 0 ? 0 : (a.isHandedOver ? 2 : 1);
      const bRank = b.pendingCount > 0 ? 0 : (b.isHandedOver ? 2 : 1);
      if (aRank !== bRank) return aRank - bRank;

      // 2. Then by Society & Block name
      const socCompare = (a.societyName || '').localeCompare(b.societyName || '');
      if (socCompare !== 0) return socCompare;
      return (a.blockName || '').localeCompare(b.blockName || '', undefined, { numeric: true });
    });
  }, [filteredPackingOrders, assignedWhId, todayStr, activeWarehouseSlots]);

  const paginatedOrders = filteredPackingOrders.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Group orders into Consolidated Society Delivery Batches (Scoped by Society, Delivery Date & Canonical Slot ID)
  // Strict Isolation: Dispatched and Delivered orders are kept in their completed lots and NEVER mixed into pending handover lots.
  const societyLotsMap = {};
  visibleOrders.forEach(order => {
    if (order.status === 'CANCELLED') return;

    const socName = order.societyName || 'Society Hub';
    const delivDate = order.deliveryDate || todayStr;
    const slotInfo = resolveOrderSlot(order);

    let lotKey;
    let initialLotId = null;

    if (order.deliveryLotId) {
      lotKey = `LOT_${order.deliveryLotId}`;
      initialLotId = order.deliveryLotId;
    } else if (order.status === 'DELIVERED') {
      lotKey = `HIST_DELIVERED_${socName}__${delivDate}__${slotInfo.slotId}`;
    } else if (order.status === 'OUT_FOR_DELIVERY') {
      lotKey = `IN_TRANSIT_${socName}__${delivDate}__${slotInfo.slotId}`;
    } else {
      lotKey = `PENDING_${socName}__${delivDate}__${slotInfo.slotId}`;
    }

    if (!societyLotsMap[lotKey]) {
      societyLotsMap[lotKey] = {
        lotKey,
        lotId: initialLotId,
        societyId: order.societyId,
        societyName: socName,
        deliveryDate: delivDate,
        slotId: slotInfo.slotId,
        deliverySlot: slotInfo.slotLabel,
        slotTimeWindow: slotInfo.slotTimeWindow,
        orders: [],
        blocksSet: new Set(),
        totalWeightKg: 0,
        physicalCratesCount: 1,
        isFullyPacked: true,
        status: 'PENDING_PACKING'
      };
    }

    societyLotsMap[lotKey].orders.push(order);
    societyLotsMap[lotKey].blocksSet.add(extractBlockAndFlat(order.flatNo).block);
    if (!societyLotsMap[lotKey].lotId && order.deliveryLotId) {
      societyLotsMap[lotKey].lotId = order.deliveryLotId;
    }
    
    (order.items || []).forEach(it => {
      const q = parseFloat(it.qty) || 1;
      const unit = String(it.unit || '').toLowerCase();
      let multiplier = 1;
      if (unit.includes('25 kg') || unit.includes('sack')) multiplier = 25;
      else if (unit.includes('20 kg') || unit.includes('crate')) multiplier = 20;
      else if (unit.includes('10 kg') || unit.includes('box')) multiplier = 10;
      societyLotsMap[lotKey].totalWeightKg += q * multiplier;
    });

    societyLotsMap[lotKey].physicalCratesCount = Math.max(1, Math.ceil(societyLotsMap[lotKey].totalWeightKg / 20));

    if (order.status !== 'PACKED' && order.status !== 'OUT_FOR_DELIVERY' && order.status !== 'DELIVERED') {
      societyLotsMap[lotKey].isFullyPacked = false;
    }
  });

  // Assign unique, human-readable lot codes (reuse persisted codes, else next sequential FRZ_LOT_xxx)
  const usedLotNums = orders
    .map(o => parseInt(String(o.deliveryLotId || '').replace('FRZ_LOT_', ''), 10))
    .filter(n => !isNaN(n));
  let nextLotNum = usedLotNums.length > 0 ? Math.max(...usedLotNums) + 1 : 101;
  Object.values(societyLotsMap).forEach(lot => {
    if (!lot.lotId) {
      lot.lotId = `FRZ_LOT_${nextLotNum}`;
      nextLotNum++;
    }
  });

  // Determine overall lifecycle status for each society batch
  const societyLots = Object.values(societyLotsMap).map(lot => {
    const allDelivered = lot.orders.length > 0 && lot.orders.every(o => o.status === 'DELIVERED');
    const allOut = lot.orders.length > 0 && lot.orders.every(o => o.status === 'OUT_FOR_DELIVERY' || o.status === 'DELIVERED');
    const packedCountInLot = lot.orders.filter(o => o.status === 'PACKED' || o.status === 'OUT_FOR_DELIVERY' || o.status === 'DELIVERED').length;
    const allPacked = lot.orders.length > 0 && packedCountInLot === lot.orders.length;

    let lotStatus = 'PENDING_PACKING';
    if (allDelivered) lotStatus = 'DELIVERED';
    else if (allOut) lotStatus = 'OUT_FOR_DELIVERY';
    else if (allPacked) lotStatus = 'READY_FOR_HANDOVER';
    else if (packedCountInLot > 0) lotStatus = 'PARTIALLY_PACKED';

    const firstAssigned = lot.orders.find(o => o.deliveryPartnerName);

    return {
      ...lot,
      blockCratesCount: lot.blocksSet ? lot.blocksSet.size : 1,
      packedCount: packedCountInLot,
      status: lotStatus,
      deliveryPartnerName: firstAssigned?.deliveryPartnerName || null,
      vehicleNumber: firstAssigned?.vehicleNumber || null,
      dispatchedAt: firstAssigned?.dispatchedAt || null
    };
  }).sort((a, b) => {
    const rank = { READY_FOR_HANDOVER: 0, PARTIALLY_PACKED: 1, PENDING_PACKING: 2, OUT_FOR_DELIVERY: 3, DELIVERED: 4 };
    return (rank[a.status] ?? 5) - (rank[b.status] ?? 5);
  });

  // Open Handover Modal & Auto-Populate Warehouse Assigned Driver
  const handleOpenHandover = (lot) => {
    // Strictly isolate only active, non-delivered orders for the handover dispatch payload
    const activeOrders = lot.orders.filter(o => o.status !== 'DELIVERED' && o.status !== 'CANCELLED');
    const unpackedOrders = activeOrders.filter(o => o.status !== 'PACKED' && o.status !== 'OUT_FOR_DELIVERY');
    if (unpackedOrders.length > 0) {
      showToast(`Complete packing remaining ${unpackedOrders.length} flat(s) before driver handover.`, 'warning');
      return;
    }

    const activeWeight = activeOrders.reduce((sum, order) => {
      let w = 0;
      (order.items || []).forEach(it => {
        const q = parseFloat(it.qty) || 1;
        const unit = String(it.unit || '').toLowerCase();
        let mult = 1;
        if (unit.includes('25 kg') || unit.includes('sack')) mult = 25;
        else if (unit.includes('20 kg') || unit.includes('crate')) mult = 20;
        else if (unit.includes('10 kg') || unit.includes('box')) mult = 10;
        w += q * mult;
      });
      return sum + w;
    }, 0);

    setHandoverLot({
      ...lot,
      orders: activeOrders,
      totalWeightKg: activeWeight
    });

    // 1. Check if orders in this lot already have an assigned driver
    const existingDriverOrder = activeOrders.find(o => o.deliveryPartnerId || o.deliveryPartnerName);

    // 2. Check for driver assigned to this warehouse
    const lotWhId = activeOrders[0]?.warehouseId || assignedWhId;
    const lotWhCode = activeOrders[0]?.warehouseCode || assignedWhCode;

    const assignedWhDriver = deliveryRiders.find(r => 
      (lotWhId && (r.assignedWarehouseId === lotWhId || r.assignedWarehouseId === lotWhCode)) ||
      (lotWhCode && (r.assignedWarehouseId === lotWhCode || r.assignedWarehouseId === lotWhId)) ||
      (resolvedWh && (r.assignedWarehouseId === resolvedWh.id || r.assignedWarehouseId === resolvedWh.code || r.assignedWarehouseId === resolvedWh.uuid)) ||
      r.assignedWarehouseId === 'ALL' ||
      !r.assignedWarehouseId
    );

    const selectedDriver = 
      (existingDriverOrder?.deliveryPartnerId && deliveryRiders.find(r => r.id === existingDriverOrder.deliveryPartnerId)) ||
      assignedWhDriver ||
      deliveryRiders[0];

    if (selectedDriver) {
      setDriverId(selectedDriver.id);
      setDriverName(selectedDriver.name);
      setDriverPhone(selectedDriver.phone);
      setVehicleNumber(selectedDriver.vehicleNumber || existingDriverOrder?.vehicleNumber || 'KA-04-E-5581');
    } else if (existingDriverOrder) {
      setDriverId(existingDriverOrder.deliveryPartnerId || '');
      setDriverName(existingDriverOrder.deliveryPartnerName || '');
      setDriverPhone(existingDriverOrder.deliveryPartnerPhone || '');
      setVehicleNumber(existingDriverOrder.vehicleNumber || 'KA-04-E-5581');
    } else {
      setDriverId('');
      setDriverName('');
      setDriverPhone('');
      setVehicleNumber('KA-04-E-5581');
    }
  };

  // Submit Handover to Delivery Partner
  const handleConfirmHandover = async (e) => {
    e.preventDefault();
    if (!handoverLot) return;

    // Safety guard: only dispatch orders that are not already delivered or cancelled
    const ordersToDispatch = handoverLot.orders.filter(o => o.status !== 'DELIVERED' && o.status !== 'CANCELLED');
    if (ordersToDispatch.length === 0) {
      showToast('No pending orders to dispatch in this lot.', 'warning');
      setHandoverLot(null);
      return;
    }

    try {
      await Promise.all(ordersToDispatch.map(o => updateOrderStatusMutation.mutateAsync({
        id: o.id,
        status: 'OUT_FOR_DELIVERY',
        deliveryLotId: handoverLot.lotId,
        deliveryPartnerId: driverId || (deliveryRiders.find(r => r.name === driverName || r.phone === driverPhone)?.id) || 'FRZ_EMP_105',
        deliveryPartnerName: driverName,
        deliveryPartnerPhone: driverPhone,
        vehicleNumber: vehicleNumber,
        dispatchedBy: currentUser?.name || 'Warehouse Dispatch Lead',
        dispatchedById: currentUser?.id || 'emp-lead'
      })));
      showToast(`✓ Lot #${handoverLot.lotId} handed over to driver ${driverName} (${vehicleNumber})!`, 'success');
      setHandoverLot(null);
    } catch (err) {
      console.error('Backend dispatch status update failed:', err);
      showToast(`Failed to dispatch orders on server: ${err?.message || 'Server error'}`, 'error');
    }
  };

  // Mark lot delivered at society drop desk with unified commission crediting
  const handleMarkLotDelivered = async (lot) => {
    try {
      await Promise.all(lot.orders.map(o => updateOrderStatusMutation.mutateAsync({
        id: o.id,
        status: 'DELIVERED',
        deliveredConfirmedBy: currentUser?.name || 'Delivery Rider',
        deliveredConfirmedById: currentUser?.id || 'emp-rider'
      })));
      showToast(`✓ All orders in Lot #${lot.lotId} marked Delivered on server! Commission credited.`, 'success');
    } catch (err) {
      console.error('Backend delivery confirmation failed:', err);
      showToast(`Failed to mark orders delivered on server: ${err?.message || 'Server error'}`, 'error');
    }
  };

  // Controlled Bulk Pack All Remaining in Block Crate (with per-order validation & concurrency guard)
  const handlePackEntireBlock = async (crate) => {
    const candidateOrders = crate.orders.filter(
      o => o.status !== 'PACKED' && o.status !== 'OUT_FOR_DELIVERY' && o.status !== 'DELIVERED' && o.status !== 'CANCELLED' && !packingOrderIds[o.id]
    );
    if (candidateOrders.length === 0) {
      showToast('All orders in this crate are already packed!', 'info');
      return;
    }

    // Validate each order's item list and eligibility
    const validOrders = [];
    const invalidOrders = [];
    candidateOrders.forEach(o => {
      const hasValidItems = Array.isArray(o.items) && o.items.length > 0 && o.items.every(it => (parseFloat(it.qty) || 0) > 0);
      if (hasValidItems && o.paymentStatus !== 'FAILED') {
        validOrders.push(o);
      } else {
        invalidOrders.push(o);
      }
    });

    if (validOrders.length === 0) {
      showToast(`Cannot pack: ${invalidOrders.length} order(s) failed item/payment validation.`, 'error');
      return;
    }

    const confirmed = window.confirm(
      `Pack all ${validOrders.length} remaining flat(s) in ${crate.societyName} · ${crate.blockName} (${crate.slotLabel})?`
    );
    if (!confirmed) return;

    const lockMap = {};
    validOrders.forEach(o => { lockMap[o.id] = true; });
    setPackingOrderIds(prev => ({ ...prev, ...lockMap }));

    try {
      const results = await Promise.allSettled(
        validOrders.map(o => updateOrderStatusMutation.mutateAsync({
          id: o.id,
          status: 'PACKED',
          packedBy: currentUser?.name || 'Warehouse Packing Lead',
          packedById: currentUser?.id || 'emp-packer'
        }))
      );
      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length + invalidOrders.length;

      if (failed === 0) {
        showToast(`✓ Packed ${succeeded} flat(s) in ${crate.societyName} [${crate.blockName}]!`, 'success');
      } else {
        showToast(`Packed ${succeeded} flat(s); ${failed} exception(s) skipped.`, 'warning');
      }
    } catch (err) {
      showToast(`Failed to pack crate: ${err?.message || 'Server error'}`, 'error');
    } finally {
      setPackingOrderIds(prev => {
        const next = { ...prev };
        validOrders.forEach(o => { delete next[o.id]; });
        return next;
      });
    }
  };

  // Print Physical Crate Manifest Tag
  const handlePrintCrateTag = (crate) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Freshioz Delivery Crate - ${crate.societyName} - ${crate.blockName}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 24px; color: #0F172A; }
            .crate-tag { border: 3px solid #234B3C; border-radius: 12px; padding: 24px; max-width: 500px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 2px dashed #CBD5E1; padding-bottom: 16px; margin-bottom: 16px; }
            .title { font-size: 24px; font-weight: 900; color: #234B3C; margin: 0; }
            .block-badge { display: inline-block; background: #EBF2EE; color: #234B3C; font-size: 22px; font-weight: 900; padding: 6px 18px; border-radius: 8px; margin-top: 10px; border: 2px solid #234B3C; }
            .meta { display: flex; justify-content: space-between; margin: 16px 0; font-size: 14px; font-weight: 700; color: #475569; }
            .order-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #F1F5F9; font-size: 13.5px; }
            .flat { font-weight: 800; color: #0F172A; }
          </style>
        </head>
        <body>
          <div class="crate-tag">
            <div class="header">
              <div style="font-size: 12px; color: #64748B; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase;">${crate.deliveryDate} • ${crate.slotLabel} (${crate.slotTimeWindow})</div>
              <div class="title">${crate.societyName}</div>
              <div class="block-badge">${crate.blockName}</div>
            </div>
            <div class="meta">
              <span>Flats: ${crate.orders.length}</span>
              <span>Weight: ~${crate.totalWeightKg.toFixed(1)} kg (~${crate.physicalCratesCount} Crate${crate.physicalCratesCount > 1 ? 's' : ''})</span>
              <span>Hub: ${assignedWhCode || 'Central Hub'}</span>
            </div>
            <div style="font-weight: 800; font-size: 12px; color: #64748B; text-transform: uppercase; margin-bottom: 8px;">Flat Manifest in Crate:</div>
            ${crate.orders.map(o => `
              <div class="order-item">
                <span class="flat">📍 ${extractBlockAndFlat(o.flatNo).flat} (${o.userName || 'Resident'})</span>
                <span>#${o.id} • ${(o.items || []).length} items</span>
              </div>
            `).join('')}
            <div style="margin-top: 20px; text-align: center; font-size: 11px; color: #94A3B8;">
              Direct Farm-Fresh Harvest • Security Reception Desk Handover
            </div>
          </div>
          <script>window.print(); setTimeout(() => window.close(), 500);</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const activeNonDeliveredOrders = visibleOrders.filter(o => o.status !== 'DELIVERED');
  const readyToPackCount = activeNonDeliveredOrders.filter(o => o.status !== 'PACKED' && o.status !== 'OUT_FOR_DELIVERY').length;
  const toPackCount = readyToPackCount;
  const packedCount = activeNonDeliveredOrders.filter(o => o.status === 'PACKED').length;
  const outCount = activeNonDeliveredOrders.filter(o => o.status === 'OUT_FOR_DELIVERY').length;

  if (isDeliveryExecutive) {
    return (
      <div className="admin-page-container" style={{ textAlign: 'center', padding: '60px 20px', maxWidth: '600px', margin: '40px auto' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#FEF2F2', color: '#DC2626', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
          <PackageCheck size={32} />
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>
          Warehouse Sorting & Crating Station
        </h2>
        <p style={{ color: '#64748B', margin: '0 auto 20px', fontSize: '13.5px', lineHeight: 1.5 }}>
          This operations station is restricted to Warehouse Sorting & Crating Leads. As a Delivery Partner, your active stops and customer drop desks are listed in your Dispatch Manifest.
        </p>
        <Link
          to="/orders-fulfillment"
          className="admin-btn-accent"
          style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 22px', fontSize: '13px' }}
        >
          <Truck size={16} />
          <span>Open My Assigned Dispatch Runs ➔</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="admin-page-container">
      {/* Page Header */}
      <div className="page-title-header" style={{ marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              {activeTab === 'RETURN_AUDIT'
                ? '3. Quality & Returns Audit'
                : activeTab === 'SOCIETY_LOTS'
                  ? '2. Crates & Dispatch'
                  : '1. Packing Station'}
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

          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', background: '#FEF3C7', color: '#B45309', padding: '2px 8px', borderRadius: '5px', fontWeight: 800, border: '1px solid #FDE68A' }}>
              ⏳ Pending: {readyToPackCount}
            </span>
            <span style={{ fontSize: '11px', background: '#DCFCE7', color: '#166534', padding: '2px 8px', borderRadius: '5px', fontWeight: 800, border: '1px solid #86EFAC' }}>
              ✓ Packed: {packedCount}
            </span>
            <span style={{ fontSize: '11px', background: '#F1F5F9', color: '#475569', padding: '2px 8px', borderRadius: '5px', fontWeight: 700 }}>
              🚚 Out: {outCount}
            </span>
          </div>
        </div>
      </div>

      {/* STICKY DELIVERY DATE + EXACT WAREHOUSE TIME-BATCH BAR */}
      {activeTab !== 'RETURN_AUDIT' && (
        <div style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          background: '#FFFFFF',
          border: '1.5px solid #CBD5E1',
          borderRadius: '10px',
          padding: '8px 10px',
          marginBottom: '10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)'
        }}>
          {/* Row 1: Delivery Date Selector Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              <Calendar size={11} /> Date:
            </span>
            {[
              { id: 'TODAY', label: 'Today' },
              { id: 'TOMORROW', label: 'Tomorrow' },
              { id: 'ALL', label: 'All Dates' }
            ].map(d => {
              const isSelected = dateFilter === d.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => { setDateFilter(d.id); setCurrentPage(1); }}
                  style={{
                    padding: '3px 9px',
                    borderRadius: '5px',
                    fontSize: '11px',
                    fontWeight: 800,
                    border: isSelected ? '1.5px solid #234B3C' : '1px solid #CBD5E1',
                    background: isSelected ? '#234B3C' : '#F8FAFC',
                    color: isSelected ? '#FFFFFF' : '#334155',
                    cursor: 'pointer'
                  }}
                >
                  {d.label}
                </button>
              );
            })}
          </div>

          {/* Row 2: Dynamic Warehouse Time-Batch Tabs (Horizontal Scroll on Mobile) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
            <button
              type="button"
              onClick={() => { setSlotFilter('ALL'); setCurrentPage(1); }}
              style={{
                padding: '4px 9px',
                borderRadius: '6px',
                border: slotFilter === 'ALL' ? '1.5px solid #234B3C' : '1px solid #CBD5E1',
                background: slotFilter === 'ALL' ? '#EBF2EE' : '#FFFFFF',
                color: slotFilter === 'ALL' ? '#234B3C' : '#334155',
                fontSize: '11px',
                fontWeight: 800,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <span>All Batches</span>
              <span style={{ background: slotFilter === 'ALL' ? '#234B3C' : '#E2E8F0', color: slotFilter === 'ALL' ? '#FFF' : '#334155', padding: '0 5px', borderRadius: '4px', fontSize: '10px' }}>
                {dateFilteredOrders.filter(o => o.status !== 'DELIVERED').length}
              </span>
            </button>

            {slotBatchStats.map(b => {
              const isSelected = slotFilter === b.slotId || slotFilter === b.label;
              return (
                <button
                  key={b.slotId}
                  type="button"
                  onClick={() => { setSlotFilter(b.slotId); setCurrentPage(1); }}
                  style={{
                    padding: '4px 9px',
                    borderRadius: '6px',
                    border: isSelected ? '1.5px solid #234B3C' : '1px solid #CBD5E1',
                    background: isSelected ? '#F0FDF4' : '#FFFFFF',
                    cursor: 'pointer',
                    textAlign: 'left',
                    whiteSpace: 'nowrap',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: isSelected ? '#234B3C' : '#0F172A', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>{b.label}</span>
                      <span style={{ fontSize: '10px', color: '#059669', fontWeight: 700 }}>
                        ({b.timeWindow})
                      </span>
                    </div>
                    <div style={{ fontSize: '9.5px', color: '#64748B', fontWeight: 700 }}>
                      {b.totalFlats} Flats · <span style={{ color: '#B45309' }}>{b.pendingCount} Pending</span> · <span style={{ color: '#15803D' }}>{b.packedCount} Packed</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 1: PACKING STATION (INLINE CRATE PACKING) */}
      {activeTab === 'PACKING_STATION' && (
        <div>
          {/* COMPACT SINGLE-BAR FILTERS & SEARCH */}
          <div style={{
            background: '#FFFFFF',
            border: '1.5px solid #E2E8F0',
            borderRadius: '10px',
            padding: '8px 12px',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {/* Search Flat / Order / Resident */}
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                placeholder="Search Flat #, Order ID, Name..."
                style={{
                  background: '#F8FAFC',
                  border: '1px solid #CBD5E1',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#0F172A',
                  width: '190px',
                  outline: 'none'
                }}
              />

              {/* Apartment Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#F8FAFC', border: '1px solid #CBD5E1', padding: '4px 8px', borderRadius: '6px' }}>
                <Building2 size={13} color="#0284C7" />
                <select
                  value={societyFilter}
                  onChange={(e) => {
                    setSocietyFilter(e.target.value);
                    setBlockFilter('ALL');
                    setCurrentPage(1);
                  }}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#0F172A',
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  <option value="ALL">All Apartments ({availableSocieties.length})</option>
                  {availableSocieties.map(s => (
                    <option key={s.id || s.name} value={s.id || s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Block / Wing Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#F8FAFC', border: '1px solid #CBD5E1', padding: '4px 8px', borderRadius: '6px' }}>
                <Boxes size={13} color="#059669" />
                <select
                  value={blockFilter}
                  onChange={(e) => {
                    setBlockFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#0F172A',
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  <option value="ALL">All Blocks ({availableBlocks.length})</option>
                  {availableBlocks.map(b => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              {/* Stage Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#F8FAFC', border: '1px solid #CBD5E1', padding: '4px 8px', borderRadius: '6px' }}>
                <Filter size={13} color="#D97706" />
                <select
                  value={packingStageFilter}
                  onChange={(e) => {
                    setPackingStageFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#0F172A',
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PENDING">⏳ Pending Packing</option>
                  <option value="PACKED">✓ Packed</option>
                </select>
              </div>
            </div>

            {/* Right: Active Crates & Flats Counter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {warehouseProcurements.length > 0 && (
                <span style={{
                  fontSize: '11px',
                  background: '#ECFDF5',
                  color: '#065F46',
                  padding: '4px 9px',
                  borderRadius: '6px',
                  fontWeight: 700,
                  border: '1px solid #A7F3D0'
                }}>
                  ✓ {warehouseProcurements.length} Inward Bill(s)
                </span>
              )}
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#EBF2EE',
                color: '#234B3C',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 800,
                border: '1px solid #A7C4B8'
              }}>
                <Boxes size={14} color="#234B3C" />
                <span>{blockCrates.length} Block Crate(s) · {filteredPackingOrders.length} Flats</span>
              </span>
            </div>
          </div>

          {/* DEDICATED APARTMENT & BLOCK CRATE BOXES */}
          <div>
            {blockCrates.length === 0 ? (
              <div className="admin-empty-state" style={{ background: '#FFF', borderRadius: '10px', border: '1.5px solid #E2E8F0', padding: '28px 20px', textAlign: 'center' }}>
                <PackageCheck size={24} color="#059669" style={{ margin: '0 auto 8px' }} />
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
                  No Orders for Selected Date / Time Batch
                </div>
                {(dateFilter !== 'ALL' || slotFilter !== 'ALL' || packingStageFilter !== 'ALL' || searchQuery) && (
                  <button
                    type="button"
                    onClick={() => {
                      setDateFilter('ALL');
                      setSlotFilter('ALL');
                      setPackingStageFilter('ALL');
                      setSocietyFilter('ALL');
                      setBlockFilter('ALL');
                      setSearchQuery('');
                    }}
                    style={{
                      marginTop: '10px',
                      padding: '5px 14px',
                      background: '#234B3C',
                      color: '#FFF',
                      borderRadius: '6px',
                      border: 'none',
                      fontWeight: 700,
                      fontSize: '11.5px',
                      cursor: 'pointer'
                    }}
                  >
                    Show All Active Dates & Batches
                  </button>
                )}
              </div>
            ) : (
              blockCrates.map(crate => {
                const isCrateDone = crate.allPacked;
                const matchingSocietyLot = societyLots.find(l => l.lotKey === crate.societyBatchKey);
                const canHandoverBatch = matchingSocietyLot && matchingSocietyLot.status === 'READY_FOR_HANDOVER';

                return (
                  <div key={crate.key} style={{
                    background: '#FFFFFF',
                    border: isCrateDone ? '2px solid #86EFAC' : '1.5px solid #CBD5E1',
                    borderRadius: '10px',
                    marginBottom: '14px',
                    overflow: 'hidden'
                  }}>
                    {/* Compact Crate Header Banner */}
                    <div style={{
                      background: isCrateDone ? '#F0FDF4' : '#F8FAFC',
                      borderBottom: isCrateDone ? '1px solid #BBF7D0' : '1px solid #E2E8F0',
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '10px'
                    }}>
                      {/* Left: Society + Block + Slot + Counts */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '14px', fontWeight: 900, color: '#0F172A' }}>
                          {crate.societyName}
                        </span>
                        <span style={{
                          background: '#234B3C',
                          color: '#FFFFFF',
                          fontSize: '11.5px',
                          fontWeight: 900,
                          padding: '2px 8px',
                          borderRadius: '5px'
                        }}>
                          📦 {crate.blockName}
                        </span>
                        <span style={{
                          fontSize: '11px',
                          background: '#F1F5F9',
                          color: '#334155',
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: '5px',
                          border: '1px solid #E2E8F0'
                        }}>
                          🗓️ {crate.deliveryDate} · ⏰ {crate.slotLabel} ({crate.slotTimeWindow})
                        </span>

                        {crate.isHandedOver ? (
                          <span style={{ fontSize: '11px', background: '#FEF3C7', color: '#92400E', fontWeight: 800, padding: '2px 8px', borderRadius: '5px', border: '1px solid #FDE68A' }}>
                            🚚 Handed to Driver
                          </span>
                        ) : isCrateDone ? (
                          <span style={{ fontSize: '11px', background: '#DCFCE7', color: '#166534', fontWeight: 800, padding: '2px 8px', borderRadius: '5px', border: '1px solid #86EFAC' }}>
                            ✓ {crate.packedCount}/{crate.orders.length} Packed
                          </span>
                        ) : (
                          <span style={{ fontSize: '11px', background: '#FEF3C7', color: '#B45309', fontWeight: 800, padding: '2px 8px', borderRadius: '5px', border: '1px solid #FDE68A' }}>
                            {crate.packedCount}/{crate.orders.length} Packed · {crate.pendingCount} Pending
                          </span>
                        )}

                        <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>
                          ~{crate.totalWeightKg.toFixed(1)} kg · ~{crate.physicalCratesCount} Physical Crate{crate.physicalCratesCount > 1 ? 's' : ''}
                        </span>
                      </div>

                      {/* Right: Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => handlePrintCrateTag(crate)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '5px 10px',
                            borderRadius: '6px',
                            border: '1px solid #CBD5E1',
                            background: '#FFFFFF',
                            color: '#334155',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          <Printer size={13} />
                          <span>Crate Tag</span>
                        </button>

                        {!isCrateDone && !crate.isHandedOver && (
                          <button
                            type="button"
                            onClick={() => handlePackEntireBlock(crate)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '5px 12px',
                              borderRadius: '6px',
                              border: 'none',
                              background: '#166534',
                              color: '#FFFFFF',
                              fontSize: '11.5px',
                              fontWeight: 800,
                              cursor: 'pointer'
                            }}
                          >
                            <Check size={13} />
                            <span>Pack All Remaining ({crate.pendingCount})</span>
                          </button>
                        )}

                        {canHandoverBatch && (
                          <button
                            type="button"
                            onClick={() => handleOpenHandover(matchingSocietyLot)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '5px 12px',
                              borderRadius: '6px',
                              border: 'none',
                              background: '#D97706',
                              color: '#FFFFFF',
                              fontSize: '11.5px',
                              fontWeight: 800,
                              cursor: 'pointer'
                            }}
                          >
                            <Truck size={13} />
                            <span>Handover Batch ({matchingSocietyLot.orders.length})</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Inline Flat Orders List (Responsive for Tablet, Mobile & Desktop - No Horizontal Scroll) */}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {crate.orders.map((order, oIdx) => {
                        const { flat } = extractBlockAndFlat(order.flatNo);
                        const isHanded = order.status === 'OUT_FOR_DELIVERY' || Boolean(order.deliveryLotId);
                        const isPacked = order.status === 'PACKED' || isHanded || order.status === 'DELIVERED';
                        const isPackingThis = Boolean(packingOrderIds[order.id]);

                        return (
                          <div
                            key={order.id}
                            style={{
                              padding: '10px 14px',
                              borderTop: oIdx === 0 ? 'none' : '1px solid #F1F5F9',
                              background: isPacked ? '#F9FCF9' : '#FFFFFF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              flexWrap: 'wrap',
                              gap: '10px'
                            }}
                          >
                            {/* Flat + Order ID + Resident */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', minWidth: '210px' }}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                background: '#EBF2EE',
                                color: '#234B3C',
                                fontWeight: 900,
                                fontSize: '12.5px',
                                padding: '3px 8px',
                                borderRadius: '5px',
                                border: '1px solid #A7C4B8'
                              }}>
                                <MapPin size={12} color="#234B3C" />
                                <span>{flat}</span>
                              </span>
                              <strong style={{ fontSize: '12.5px', color: '#0F172A' }}>
                                {order.userName || 'Resident'}
                              </strong>
                              <span style={{ fontFamily: 'monospace', color: '#64748B', fontSize: '11.5px', fontWeight: 700 }}>
                                #{order.id}
                              </span>
                            </div>

                            {/* Produce Items Pills */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', flex: 1, minWidth: '200px' }}>
                              {(order.items || []).map((i, iIdx) => (
                                <span
                                  key={iIdx}
                                  style={{
                                    background: '#F1F5F9',
                                    border: '1px solid #E2E8F0',
                                    padding: '2px 8px',
                                    borderRadius: '5px',
                                    fontSize: '11.5px',
                                    fontWeight: 600,
                                    color: '#1E293B'
                                  }}
                                >
                                  {i.name} <strong>× {i.qty} {i.unit}</strong>
                                </span>
                              ))}
                            </div>

                            {/* Status + 1-Tap Pack & Label Actions */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
                              {isHanded ? (
                                <span style={{ fontSize: '10.5px', fontWeight: 800, padding: '3px 8px', borderRadius: '5px', background: '#FEF3C7', color: '#92400E' }}>
                                  🚚 Handed Over
                                </span>
                              ) : isPacked ? (
                                <span style={{ fontSize: '10.5px', fontWeight: 800, padding: '3px 8px', borderRadius: '5px', background: '#DCFCE7', color: '#15803D' }}>
                                  ✓ Packed
                                </span>
                              ) : (
                                <span style={{ fontSize: '10.5px', fontWeight: 800, padding: '3px 8px', borderRadius: '5px', background: '#F1F5F9', color: '#475569' }}>
                                  ⏳ Pending
                                </span>
                              )}

                              {!isPacked && (
                                <button
                                  type="button"
                                  disabled={isPackingThis}
                                  onClick={() => handleMarkPacked(order.id)}
                                  style={{
                                    fontSize: '12px',
                                    fontWeight: 800,
                                    padding: '5px 12px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    background: isPackingThis ? '#94A3B8' : '#059669',
                                    color: '#FFFFFF',
                                    cursor: isPackingThis ? 'not-allowed' : 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                >
                                  <Check size={13} />
                                  <span>{isPackingThis ? 'Packing...' : 'Pack'}</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => setLabelModalOrder(order)}
                                style={{
                                  background: '#FFFFFF',
                                  border: '1px solid #CBD5E1',
                                  padding: '5px 9px',
                                  borderRadius: '6px',
                                  fontSize: '11.5px',
                                  fontWeight: 700,
                                  color: '#334155',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                                title="Print Flat Label"
                              >
                                <Printer size={12} />
                                <span>Label</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: CONSOLIDATED SOCIETY DELIVERY LOTS */}
      {activeTab === 'SOCIETY_LOTS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Sub-Lot Filter Pills for Dispatch and Delivery Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', padding: '2px 0' }}>
            <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, marginRight: '4px' }}>Batch Status:</span>
            {[
              { id: 'ALL', label: `All (${societyLots.length})`, activeBg: '#234B3C', bg: '#E2E8F0', color: '#475569' },
              { id: 'PENDING_PACKING', label: `Pending / Packing (${societyLots.filter(l => l.status === 'PENDING_PACKING' || l.status === 'PARTIALLY_PACKED').length})`, activeBg: '#475569', bg: '#F1F5F9', color: '#475569' },
              { id: 'READY_FOR_HANDOVER', label: `Ready for Handover (${societyLots.filter(l => l.status === 'READY_FOR_HANDOVER').length})`, activeBg: '#15803D', bg: '#DCFCE7', color: '#15803D' },
              { id: 'OUT_FOR_DELIVERY', label: `Handed Over / Out (${societyLots.filter(l => l.status === 'OUT_FOR_DELIVERY').length})`, activeBg: '#B45309', bg: '#FEF3C7', color: '#B45309' },
              { id: 'DELIVERED', label: `Delivered (${societyLots.filter(l => l.status === 'DELIVERED').length})`, activeBg: '#047857', bg: '#ECFDF5', color: '#047857' }
            ].map(f => {
              const active = lotFilter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => handleLotFilterChange(f.id)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    background: active ? f.activeBg : f.bg,
                    color: active ? '#FFFFFF' : f.color
                  }}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          {societyLots.filter(l => lotFilter === 'ALL' || l.status === lotFilter || (lotFilter === 'PENDING_PACKING' && l.status === 'PARTIALLY_PACKED')).length === 0 ? (
            <div className="admin-table-card" style={{ padding: '28px', textAlign: 'center' }}>
              <Building2 size={28} color="#94A3B8" style={{ margin: '0 auto 8px' }} />
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>No Matching Society Batches</div>
            </div>
          ) : (
            societyLots
              .filter(l => lotFilter === 'ALL' || l.status === lotFilter || (lotFilter === 'PENDING_PACKING' && l.status === 'PARTIALLY_PACKED'))
              .map(lot => (
                <div 
                  key={lot.lotId}
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '10px',
                    border: lot.status === 'OUT_FOR_DELIVERY' ? '2px solid #F59E0B' : lot.status === 'DELIVERED' ? '2px solid #10B981' : lot.status === 'READY_FOR_HANDOVER' ? '2px solid #86EFAC' : '1.5px solid #E2E8F0',
                    padding: '14px 16px'
                  }}
                >
                  {/* Lot Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', borderBottom: '1px solid #F1F5F9', paddingBottom: '10px', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '15px', fontWeight: 900, color: '#0F172A', margin: 0 }}>
                        {lot.societyName}
                      </h3>
                      <span style={{ fontSize: '11px', fontFamily: 'monospace', background: '#F1F5F9', color: '#475569', fontWeight: 800, padding: '2px 6px', borderRadius: '4px' }}>
                        #{lot.lotId}
                      </span>
                      <span style={{ fontSize: '11px', background: '#F8FAFC', color: '#334155', fontWeight: 700, padding: '2px 8px', borderRadius: '5px', border: '1px solid #E2E8F0' }}>
                        🗓️ {lot.deliveryDate} · ⏰ {lot.deliverySlot} ({lot.slotTimeWindow})
                      </span>
                      <span style={{ fontSize: '11.5px', color: '#475569', fontWeight: 700 }}>
                        <strong>{lot.packedCount}/{lot.orders.length}</strong> Flats Packed · <strong>{lot.blockCratesCount}</strong> Block Crate{lot.blockCratesCount > 1 ? 's' : ''} · <strong>~{lot.physicalCratesCount}</strong> Physical Crate{lot.physicalCratesCount > 1 ? 's' : ''} ({lot.totalWeightKg.toFixed(1)} kg)
                      </span>
                    </div>

                    {/* Lot Status Badge */}
                    <div>
                      {lot.status === 'READY_FOR_HANDOVER' && (
                        <span style={{ fontSize: '11.5px', background: '#DCFCE7', color: '#15803D', fontWeight: 800, padding: '3px 10px', borderRadius: '9999px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle2 size={12} />
                          <span>Ready for Handover</span>
                        </span>
                      )}
                      {lot.status === 'OUT_FOR_DELIVERY' && (
                        <span style={{ fontSize: '11.5px', background: '#FEF3C7', color: '#B45309', fontWeight: 800, padding: '3px 10px', borderRadius: '9999px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Truck size={12} />
                          <span>Handed Over • Out for Delivery</span>
                        </span>
                      )}
                      {lot.status === 'DELIVERED' && (
                        <span style={{ fontSize: '11.5px', background: '#ECFDF5', color: '#059669', fontWeight: 800, padding: '3px 10px', borderRadius: '9999px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle2 size={12} />
                          <span>Delivered</span>
                        </span>
                      )}
                      {(lot.status === 'PENDING_PACKING' || lot.status === 'PARTIALLY_PACKED') && (
                        <span style={{ fontSize: '11.5px', background: '#FEF3C7', color: '#B45309', fontWeight: 800, padding: '3px 10px', borderRadius: '9999px' }}>
                          {lot.status === 'PARTIALLY_PACKED' ? `Partially Packed (${lot.packedCount}/${lot.orders.length})` : `Pending Packing (0/${lot.orders.length})`}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Packets inside this Lot */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '8px', marginBottom: '10px' }}>
                    {lot.orders.map(o => (
                      <div 
                        key={o.id}
                        style={{
                          background: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          borderRadius: '6px',
                          padding: '8px 10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '6px'
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '12.5px' }}>
                            {o.flatNo} — {o.userName}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {(o.items || []).map(it => `${it.name} (×${it.qty})`).join(', ')}
                          </div>
                        </div>

                        <span style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          flexShrink: 0,
                          background: o.status === 'PACKED' || o.status === 'OUT_FOR_DELIVERY' || o.status === 'DELIVERED' ? '#DCFCE7' : '#FEF3C7',
                          color: o.status === 'PACKED' || o.status === 'OUT_FOR_DELIVERY' || o.status === 'DELIVERED' ? '#15803D' : '#B45309'
                        }}>
                          {o.status === 'PACKED' ? '✓ Packed' : o.status === 'OUT_FOR_DELIVERY' ? '🚚 Out' : o.status === 'DELIVERED' ? '✓ Done' : '⏳ Pending'}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Handover & Driver Info Bar */}
                  <div style={{
                    background: lot.status === 'OUT_FOR_DELIVERY' ? '#FFFBEB' : '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    padding: '9px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}>
                    {lot.deliveryPartnerName ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Truck size={16} color="#D97706" />
                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#92400E' }}>
                          Driver: {lot.deliveryPartnerName} {lot.vehicleNumber ? `(${lot.vehicleNumber})` : ''}
                        </span>
                      </div>
                    ) : (
                      <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
                        {lot.status === 'READY_FOR_HANDOVER'
                          ? 'All flats packed — ready for driver handover'
                          : `${lot.orders.length - lot.packedCount} flat(s) remaining to pack before handover`}
                      </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {(lot.status === 'PENDING_PACKING' || lot.status === 'PARTIALLY_PACKED') && (
                        <button
                          type="button"
                          onClick={() => handleTabChange('PACKING_STATION')}
                          style={{
                            fontSize: '11.5px',
                            fontWeight: 800,
                            padding: '5px 12px',
                            borderRadius: '6px',
                            border: '1px solid #CBD5E1',
                            background: '#FFFFFF',
                            color: '#234B3C',
                            cursor: 'pointer'
                          }}
                        >
                          Go to Pack ({lot.orders.length - lot.packedCount} left)
                        </button>
                      )}

                      {lot.status === 'READY_FOR_HANDOVER' && (
                        <button
                          type="button"
                          onClick={() => handleOpenHandover(lot)}
                          className="admin-btn-accent"
                          style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                          <Send size={13} />
                          <span>Handover Batch to Driver</span>
                        </button>
                      )}

                      {lot.status === 'OUT_FOR_DELIVERY' && (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          background: '#FEF3C7',
                          color: '#92400E',
                          border: '1px solid #FDE68A',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '11.5px',
                          fontWeight: 800
                        }}>
                          <Truck size={13} color="#D97706" />
                          <span>In-Transit</span>
                        </span>
                      )}

                      {lot.status === 'DELIVERED' && (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          background: '#DCFCE7',
                          color: '#15803D',
                          border: '1px solid #86EFAC',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '11.5px',
                          fontWeight: 800
                        }}>
                          <CheckCircle2 size={13} color="#15803D" />
                          <span>Delivered</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
          )}
        </div>
      )}

      {/* VIEW 3: RETURN PRODUCE & WASTAGE QUALITY AUDIT DESK */}
      {activeTab === 'RETURN_AUDIT' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Header Summary Banner */}
          <div style={{
            background: '#FEF2F2',
            border: '1.5px solid #FECACA',
            borderRadius: '12px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#DC2626', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <RotateCcw size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 900, color: '#991B1B', margin: 0 }}>
                  Returned Produce Quality & Wastage Audit Desk
                </h3>
                <p style={{ fontSize: '12px', color: '#B91C1C', margin: '3px 0 0' }}>
                  Physically inspect undelivered resident bags returned by riders. Separate fresh produce to restock into warehouse stock vs damaged quantity written off as spoilage.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, background: '#FFFFFF', color: '#991B1B', border: '1px solid #FECACA', padding: '4px 12px', borderRadius: '999px' }}>
                {returnedOrders.length} Undelivered Order(s)
              </span>
            </div>
          </div>

          {returnedOrders.length === 0 ? (
            <div style={{
              background: '#FFFFFF',
              border: '1.5px solid #E2E8F0',
              borderRadius: '12px',
              padding: '60px 20px',
              textAlign: 'center',
              color: '#64748B'
            }}>
              <CheckCircle2 size={44} color="#059669" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
                Zero Pending Returns
              </div>
              <div style={{ fontSize: '13px', color: '#64748B', maxWidth: '440px', margin: '6px auto 0' }}>
                All dispatched crates and delivery runs are successfully accounted for. There are no undelivered orders awaiting quality inspection.
              </div>
            </div>
          ) : (
            returnedOrders.map((order) => {
              const { reason, photo } = parseCancelDetails(order.cancelledReason);
              const isAudited = Boolean(returnAudits[order.id]);
              const auditData = returnAudits[order.id];
              const items = Array.isArray(order.items) ? order.items : [];

              return (
                <div
                  key={order.id}
                  style={{
                    background: '#FFFFFF',
                    border: isAudited ? '1.5px solid #86EFAC' : '1.5px solid #FECACA',
                    borderRadius: '12px',
                    padding: '18px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px'
                  }}
                >
                  {/* Top Order Information Bar */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', borderBottom: '1px solid #F1F5F9', paddingBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '14px', fontWeight: 900, color: '#0F172A' }}>
                        Order #{order.id}
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: 700, background: '#F1F5F9', color: '#475569', padding: '2px 8px', borderRadius: '6px' }}>
                        {order.societyName || 'Society Hub'} • Flat {order.flatNo || 'N/A'}
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>
                        Value: ₹{(order.totalAmount || 0).toLocaleString('en-IN')}
                      </span>
                      <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                        {order.cancelledAt ? new Date(order.cancelledAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : 'Today'}
                      </span>
                    </div>

                    <div>
                      {isAudited ? (
                        <span style={{ background: '#DCFCE7', color: '#166534', border: '1px solid #86EFAC', padding: '4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <CheckCircle2 size={14} />
                          <span>Audited & Restocked by {auditData.auditedBy}</span>
                        </span>
                      ) : (
                        <span style={{ background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A', padding: '4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 800 }}>
                          ⏳ Pending Quality Inspection
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Rider Doorstep Exception Reason & Photo Proof Card */}
                  <div style={{
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}>
                    <div style={{ flex: 1, minWidth: '240px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>
                        Doorstep Cancellation / Refusal Reason
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#DC2626' }}>
                        {reason}
                      </div>
                      {order.dispatchedToRiderName && (
                        <div style={{ fontSize: '11.5px', color: '#475569', marginTop: '2px' }}>
                          Delivery Partner: <strong style={{ color: '#0F172A' }}>{order.dispatchedToRiderName}</strong>
                        </div>
                      )}
                    </div>

                    {photo ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img
                          src={photo}
                          alt="Cancellation Proof"
                          onClick={() => setPreviewPhotoModal({ photo, title: `Order #${order.id} Doorstep Proof (${reason})` })}
                          style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: '8px', border: '1.5px solid #CBD5E1', cursor: 'pointer' }}
                        />
                        <button
                          type="button"
                          onClick={() => setPreviewPhotoModal({ photo, title: `Order #${order.id} Doorstep Proof (${reason})` })}
                          style={{
                            background: '#EFF6FF',
                            border: '1px solid #BFDBFE',
                            color: '#1D4ED8',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            padding: '6px 12px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}
                        >
                          <Camera size={14} />
                          <span>Enlarge Photo Proof</span>
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: '11.5px', color: '#94A3B8', fontStyle: 'italic' }}>
                        No doorstep photo submitted
                      </span>
                    )}
                  </div>

                  {/* Produce Items Quality Breakdown Table */}
                  <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
                      <thead>
                        <tr style={{ background: '#F8FAFC', color: '#475569', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.04em' }}>
                          <th style={{ padding: '8px 12px', borderBottom: '1px solid #E2E8F0' }}>Produce Item</th>
                          <th style={{ padding: '8px 12px', borderBottom: '1px solid #E2E8F0', textAlign: 'center' }}>Returned Qty</th>
                          <th style={{ padding: '8px 12px', borderBottom: '1px solid #E2E8F0', textAlign: 'center' }}>Good Qty (Restock to Hub)</th>
                          <th style={{ padding: '8px 12px', borderBottom: '1px solid #E2E8F0', textAlign: 'center' }}>Wastage / Spoilage Qty</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((it, idx) => {
                          const key = `${order.id}_${idx}`;
                          const enteredGood = returnItemAdjustments[key]?.goodQty;
                          const goodQty = enteredGood !== undefined ? Number(enteredGood) : (it.qty || 1);
                          const wastageQty = Math.max(0, (it.qty || 1) - goodQty);

                          return (
                            <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                              <td style={{ padding: '8px 12px', fontWeight: 700, color: '#1E293B' }}>
                                {it.name || 'Fresh Produce'} <span style={{ color: '#64748B', fontWeight: 500 }}>({it.unit || '1 kg'})</span>
                              </td>
                              <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 800, color: '#475569' }}>
                                {it.qty || 1} {it.unit || 'kg'}
                              </td>
                              <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                {isAudited ? (
                                  <span style={{ fontWeight: 800, color: '#166534' }}>{goodQty} {it.unit || 'kg'}</span>
                                ) : (
                                  <input
                                    type="number"
                                    min="0"
                                    max={it.qty || 1}
                                    step="0.1"
                                    value={goodQty}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value) || 0;
                                      setReturnItemAdjustments(prev => ({
                                        ...prev,
                                        [key]: { goodQty: Math.min(it.qty || 1, Math.max(0, val)) }
                                      }));
                                    }}
                                    style={{
                                      width: '80px',
                                      padding: '4px 8px',
                                      border: '1.5px solid #86EFAC',
                                      borderRadius: '6px',
                                      textAlign: 'center',
                                      fontWeight: 800,
                                      color: '#166534',
                                      background: '#F0FDF4'
                                    }}
                                  />
                                )}
                              </td>
                              <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                <span style={{
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  fontSize: '11.5px',
                                  fontWeight: 800,
                                  background: wastageQty > 0 ? '#FEE2E2' : '#F1F5F9',
                                  color: wastageQty > 0 ? '#DC2626' : '#64748B'
                                }}>
                                  {wastageQty.toFixed(1)} {it.unit || 'kg'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Approve Audit Button */}
                  {!isAudited && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '4px' }}>
                      <button
                        type="button"
                        onClick={() => handleApproveReturnAudit(order)}
                        disabled={isSubmittingAudit}
                        style={{
                          background: '#059669',
                          color: '#FFFFFF',
                          border: 'none',
                          padding: '8px 18px',
                          borderRadius: '8px',
                          fontSize: '12.5px',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Check size={16} />
                        <span>{isSubmittingAudit ? 'Restocking Hub...' : '✓ Approve Quality Audit & Restock to Hub'}</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* MODAL: PREVIEW CANCELLATION PHOTO PROOF */}
      {previewPhotoModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.75)',
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
            maxWidth: '640px',
            width: '100%',
            overflow: 'hidden',
            border: '1.5px solid #CBD5E1',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid #E2E8F0', background: '#F8FAFC' }}>
              <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Camera size={16} color="#DC2626" />
                <span>{previewPhotoModal.title || 'Doorstep Photo Proof'}</span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewPhotoModal(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '16px', textAlign: 'center', background: '#0F172A' }}>
              <img
                src={previewPhotoModal.photo}
                alt="Enlarged Proof"
                style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: '8px', objectFit: 'contain' }}
              />
            </div>
            <div style={{ padding: '12px 18px', display: 'flex', justifyContent: 'flex-end', background: '#F8FAFC', borderTop: '1px solid #E2E8F0' }}>
              <button
                type="button"
                onClick={() => setPreviewPhotoModal(null)}
                style={{ padding: '6px 16px', background: '#0F172A', color: '#FFF', borderRadius: '6px', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: HANDOVER TO DELIVERY PARTNER */}
      {handoverLot && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            maxWidth: '520px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            border: '1.5px solid #E2E8F0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#FEF3C7', color: '#B45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Truck size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                    Handover Lot to Delivery Partner
                  </h3>
                  <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                    {handoverLot.societyName} • Lot #{handoverLot.lotId}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHandoverLot(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmHandover}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '4px', color: '#334155' }}>
                    Select Registered Delivery Partner / Rider *
                  </label>
                  <select
                    value={driverId}
                    onChange={(e) => {
                      const selectedVal = e.target.value;
                      setDriverId(selectedVal);
                      const rider = deliveryRiders.find(r => r.id === selectedVal);
                      if (rider) {
                        setDriverName(rider.name);
                        setDriverPhone(rider.phone);
                        if (rider.vehicleNumber) setVehicleNumber(rider.vehicleNumber);
                      } else {
                        setDriverName('');
                        setDriverPhone('');
                      }
                    }}
                    style={{
                      width: '100%',
                      height: '40px',
                      padding: '0 10px',
                      borderRadius: '8px',
                      border: '1.5px solid #234B3C',
                      background: '#F0FDF4',
                      fontSize: '13px',
                      fontWeight: 800,
                      color: '#0F172A',
                      cursor: 'pointer'
                    }}
                    required
                  >
                    {deliveryRiders.length === 0 ? (
                      <option value="">No registered delivery partners found</option>
                    ) : (
                      <>
                        <option value="">-- Select Registered Delivery Partner --</option>
                        {deliveryRiders.map(r => {
                          const isWarehouseMatch = 
                            (assignedWhId && (r.assignedWarehouseId === assignedWhId || r.assignedWarehouseId === assignedWhCode)) ||
                            (resolvedWh && (r.assignedWarehouseId === resolvedWh.id || r.assignedWarehouseId === resolvedWh.code || r.assignedWarehouseId === resolvedWh.uuid));
                          return (
                            <option key={r.id} value={r.id}>
                              {r.name} • +91 {r.phone} {isWarehouseMatch ? '⭐ (Assigned to this Hub)' : ''}
                            </option>
                          );
                        })}
                      </>
                    )}
                  </select>

                  {deliveryRiders.length === 0 && (
                    <div style={{ marginTop: '8px', padding: '8px 12px', background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: '6px', fontSize: '11.5px', color: '#92400E' }}>
                      ⚠️ No delivery partners registered for this hub. Delivery partners must be registered in Staff Management before dispatch.
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '4px', color: '#334155' }}>
                    Driver Contact Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="Auto-populated from partner profile"
                    value={driverPhone ? `+91 ${driverPhone}` : ''}
                    readOnly
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '0 10px',
                      borderRadius: '6px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '13px',
                      fontWeight: 700,
                      background: '#F8FAFC',
                      color: '#1E293B'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '4px', color: '#334155' }}>
                      Vehicle Type
                    </label>
                    <select
                      value={vehicleType}
                      onChange={(e) => setVehicleType(e.target.value)}
                      style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '6px', border: '1.5px solid #CBD5E1', fontSize: '12.5px' }}
                    >
                      <option value="Tata Ace (Mini-Truck)">Tata Ace (Mini-Truck)</option>
                      <option value="EV 3-Wheeler Tempo">EV 3-Wheeler Tempo</option>
                      <option value="Pickup Truck">Pickup Truck</option>
                      <option value="Delivery Van">Delivery Van</option>
                      <option value="Motorcycle (Two-Wheeler)">Motorcycle (Two-Wheeler)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '4px', color: '#334155' }}>
                      Vehicle Registration # *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. KA-04-E-5581"
                      value={vehicleNumber}
                      onChange={(e) => setVehicleNumber(e.target.value)}
                      style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '6px', border: '1.5px solid #CBD5E1', fontSize: '13px', fontFamily: 'monospace', fontWeight: 800 }}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Handover Summary Box */}
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '12px', marginBottom: '18px', fontSize: '12.5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ color: '#64748B' }}>Destination Community:</span>
                  <strong style={{ color: '#0F172A' }}>{handoverLot.societyName}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ color: '#64748B' }}>Total Customer Flats in Lot:</span>
                  <strong>{handoverLot.orders.length} {handoverLot.orders.length === 1 ? 'Flat' : 'Flats'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Total Produce Weight:</span>
                  <strong style={{ color: '#234B3C' }}>{handoverLot.totalWeightKg} kg</strong>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setHandoverLot(null)}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFF', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn-accent"
                  disabled={!driverId || deliveryRiders.length === 0}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 800,
                    opacity: (!driverId || deliveryRiders.length === 0) ? 0.5 : 1,
                    cursor: (!driverId || deliveryRiders.length === 0) ? 'not-allowed' : 'pointer'
                  }}
                >
                  Confirm Handover & Dispatch ➔
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADDRESS LABEL PREVIEW */}
      {labelModalOrder && (
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
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{ textAlign: 'center', borderBottom: '1.5px solid #E2E8F0', paddingBottom: '12px', marginBottom: '14px' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#234B3C', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Freshioz Direct Farm Produce
              </div>
              <div style={{ fontSize: '18px', fontWeight: 900, color: '#0F172A', marginTop: '2px' }}>
                CUSTOMER DELIVERY LABEL
              </div>
            </div>

            {(() => {
              const targetSoc = societies.find(s => s.id === labelModalOrder.societyId || s.name === labelModalOrder.societyName);
              const socAddress = targetSoc?.address || `${labelModalOrder.societyName}, Drop Desk / Security Gate`;
              const mapQuery = targetSoc?.lat && targetSoc?.lng
                ? `${targetSoc.lat},${targetSoc.lng}`
                : encodeURIComponent(`${labelModalOrder.societyName} ${socAddress}`);
              const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;
              const isCod = (labelModalOrder.paymentMethod || '').includes('PAY_ON_DELIVERY');

              return (
                <div style={{ fontSize: '13px', lineHeight: 1.6, marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <div>
                      <span style={{ color: '#64748B' }}>Recipient:</span>{' '}
                      <strong style={{ fontSize: '14px', color: '#0F172A' }}>{labelModalOrder.userName}</strong>
                    </div>
                    {labelModalOrder.userPhone && (
                      <a
                        href={`tel:${labelModalOrder.userPhone}`}
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
                    <span style={{ color: '#64748B' }}>Phone:</span>{' '}
                    <strong style={{ color: '#0F172A' }}>{formatMaskedPhone(labelModalOrder.userPhone)}</strong>
                  </div>

                  {/* DESTINATION WITH DIRECT MAP NAVIGATION */}
                  <div style={{ background: '#F0FDF4', padding: '10px 12px', borderRadius: '8px', margin: '10px 0', border: '1.5px solid #86EFAC' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <div style={{ fontSize: '11px', color: '#166534', fontWeight: 800, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={13} color="#166534" />
                        <span>Drop Destination & Society Gate:</span>
                      </div>
                      <span style={{ fontSize: '10px', background: '#DCFCE7', color: '#15803D', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
                        {labelModalOrder.deliverySlot || 'Morning Run'}
                      </span>
                    </div>

                    <div style={{ fontSize: '15px', fontWeight: 900, color: '#166534' }}>
                      {labelModalOrder.societyName}
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
                      Flat / Room: {labelModalOrder.flatNo}
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
                      (labelModalOrder.paymentStatus === 'PAID' || labelModalOrder.codPaymentReceived) ? (
                        <div style={{ background: '#ECFDF5', border: '1.5px solid #86EFAC', color: '#166534', padding: '9px 12px', borderRadius: '8px', fontSize: '12.5px', fontWeight: 900, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>✅ COD PAYMENT RECEIVED:</span>
                          <span style={{ fontSize: '13.5px' }}>₹{(labelModalOrder.totalAmount || 0).toLocaleString()} via {labelModalOrder.codReceivedMode === 'UPI_QR' ? 'UPI QR' : 'Cash'}</span>
                        </div>
                      ) : (
                        <div style={{ background: '#FEF2F2', border: '1.5px solid #FCA5A5', color: '#991B1B', padding: '8px 12px', borderRadius: '8px', fontSize: '12.5px', fontWeight: 900, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>💵 COLLECT PAYMENT AT DROP DESK:</span>
                          <span style={{ fontSize: '14.5px' }}>₹{(labelModalOrder.totalAmount || 0).toLocaleString()} (Cash/UPI)</span>
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
                    <span style={{ fontFamily: 'monospace', fontWeight: 800 }}>#{labelModalOrder.id}</span>
                  </div>

                  {/* CRATED PRODUCE CONTENTS - CLEAN FORMATTING */}
                  <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '10px', marginTop: '10px' }}>
                    <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#334155', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Contents:</span>
                      <span style={{ color: '#059669', fontWeight: 700 }}>{(labelModalOrder.items || []).length} Item(s)</span>
                    </div>

                    <div style={{ background: '#F8FAFC', borderRadius: '8px', padding: '6px 10px', border: '1px solid #E2E8F0' }}>
                      {labelModalOrder.items.map((it, idx) => {
                        const q = it.qty || it.quantity || 1;
                        const u = it.unit || 'Pack';
                        return (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: idx < labelModalOrder.items.length - 1 ? '1px dashed #E2E8F0' : 'none', fontSize: '12.5px' }}>
                            <span style={{ fontWeight: 700, color: '#0F172A' }}>• {it.name}</span>
                            <span style={{ fontWeight: 800, color: '#166534', background: '#DCFCE7', padding: '2px 8px', borderRadius: '4px', fontSize: '11.5px' }}>
                              {q} * {u}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}

            <div style={{ textAlign: 'center', marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #E2E8F0' }}>
              <button
                type="button"
                onClick={() => setLabelModalOrder(null)}
                className="admin-btn-secondary"
                style={{ fontSize: '12.5px', padding: '7px 20px', fontWeight: 700, borderRadius: '6px' }}
              >
                Close Label
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PACKING VERIFICATION CHECKLIST & CONFIRMATION */}
      {packingModalOrder && (() => {
        const { block, flat } = extractBlockAndFlat(packingModalOrder.flatNo);
        const isReady = packingModalOrder.status === 'AT_WAREHOUSE';
        const isProcuring = packingModalOrder.status === 'CONFIRMED' || packingModalOrder.status === 'PROCURING';
        const itemsList = packingModalOrder.items || [];
        const allItemsChecked = itemsList.length === 0 || itemsList.every((_, idx) => checkedItems[idx]);

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
              maxWidth: '520px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              border: '2px solid #234B3C',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {/* Modal Header */}
              <div style={{
                padding: '16px 20px',
                borderBottom: '1.5px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#FAFBFB'
              }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#234B3C', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                    Warehouse Packing Station • Verification
                  </div>
                  <h3 style={{ fontSize: '17px', fontWeight: 900, color: '#0F172A', margin: '2px 0 0' }}>
                    Verify & Pack Flat {flat}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setPackingModalOrder(null)}
                  style={{
                    background: '#F1F5F9',
                    border: 'none',
                    borderRadius: '8px',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#64748B'
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Content */}
              <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Destination & Target Block Crate Banner */}
                <div style={{
                  background: '#F0FDF4',
                  border: '1.5px solid #86EFAC',
                  borderRadius: '10px',
                  padding: '12px 14px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Target Delivery Destination
                    </span>
                    <span style={{
                      background: '#234B3C',
                      color: '#FFF',
                      fontSize: '11.5px',
                      fontWeight: 900,
                      padding: '2px 8px',
                      borderRadius: '5px'
                    }}>
                      📦 Put in Crate: {block}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '16px', fontWeight: 900, color: '#0F172A' }}>
                      {packingModalOrder.societyName}
                    </span>
                    <span style={{
                      background: '#EBF2EE',
                      color: '#234B3C',
                      fontSize: '13px',
                      fontWeight: 900,
                      padding: '2px 8px',
                      borderRadius: '5px',
                      border: '1.5px solid #A7C4B8'
                    }}>
                      📍 Flat / Door: {flat}
                    </span>
                  </div>

                  <div style={{ fontSize: '12px', color: '#475569', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                    <span><strong>Order:</strong> #{packingModalOrder.id}</span>
                    <span><strong>Resident:</strong> {packingModalOrder.userName || 'Customer'} ({packingModalOrder.userPhone ? formatMaskedPhone(packingModalOrder.userPhone) : 'No phone'})</span>
                    <span><strong>Slot:</strong> {packingModalOrder.deliverySlot || 'Morning Run'}</span>
                  </div>
                </div>

                {/* Mandi Sourcing Warning Notice (if produce en route) */}
                {isProcuring && (
                  <div style={{
                    background: '#FEF3C7',
                    border: '1.5px solid #FDE68A',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px'
                  }}>
                    <AlertCircle size={16} color="#B45309" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ fontSize: '12px', color: '#92400E', lineHeight: 1.4 }}>
                      <strong>Awaiting Inward Stock:</strong> Verify produce is received and weighed before packing into crate.
                    </div>
                  </div>
                )}

                {/* Produce Packing Checklist */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#0F172A' }}>
                      Produce Items Checklist ({itemsList.length} items):
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const allState = !allItemsChecked;
                        const updated = {};
                        itemsList.forEach((_, idx) => {
                          updated[idx] = allState;
                        });
                        setCheckedItems(updated);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#0284C7',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        padding: 0
                      }}
                    >
                      {allItemsChecked ? 'Uncheck All' : 'Check All Items'}
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {itemsList.map((it, idx) => {
                      const isChecked = !!checkedItems[idx];
                      return (
                        <div
                          key={idx}
                          onClick={() => toggleCheckItem(idx)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            background: isChecked ? '#F0FDF4' : '#F8FAFC',
                            border: isChecked ? '1.5px solid #86EFAC' : '1px solid #E2E8F0',
                            cursor: 'pointer',
                            transition: 'all 0.1s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleCheckItem(idx)}
                              style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#234B3C' }}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <span style={{
                              fontSize: '13px',
                              fontWeight: 700,
                              color: isChecked ? '#0F172A' : '#64748B'
                            }}>
                              {it.name}
                            </span>
                          </div>

                          <span style={{
                            background: isChecked ? '#DCFCE7' : '#E2E8F0',
                            color: isChecked ? '#15803D' : '#475569',
                            fontSize: '12px',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: '5px'
                          }}>
                            {(() => {
                              const q = Number(it.qty) || 1;
                              const rawU = (it.unit || '').trim();
                              const isPc = /^(1\s*)?pcs?$/i.test(rawU);
                              if (isPc || !rawU) {
                                return q > 1 ? `×${q}` : `1 Unit`;
                              }
                              const cleanU = rawU.replace(/^1\s*/, '').trim();
                              return cleanU ? `${q > 1 ? `${q} ` : ''}${cleanU}` : `×${q}`;
                            })()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={{ fontSize: '11.5px', color: '#64748B', fontStyle: 'italic', background: '#F8FAFC', padding: '8px 12px', borderRadius: '6px', border: '1px dashed #CBD5E1' }}>
                  💡 Place verified bag into <strong>Crate: {block}</strong> for {packingModalOrder.societyName}.
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div style={{
                padding: '14px 20px',
                borderTop: '1.5px solid #E2E8F0',
                background: '#FAFBFB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px'
              }}>
                <button
                  type="button"
                  onClick={() => setPackingModalOrder(null)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1.5px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#475569',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => handleConfirmVerification(false)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      border: '1.5px solid #CBD5E1',
                      background: '#FFFFFF',
                      color: '#0F172A',
                      fontSize: '13px',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    ✓ Confirm Packed
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConfirmVerification(true)}
                    className="admin-btn-accent"
                    style={{
                      padding: '8px 18px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 800,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: '#234B3C'
                    }}
                  >
                    <Printer size={14} />
                    <span>Confirm & Print Label</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Mandi Weighing Slip Photo Modal */}
      {viewSlipBill && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '12px',
            maxWidth: '550px',
            width: '100%',
            overflow: 'hidden',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 18px',
              borderBottom: '1px solid #E2E8F0',
              background: '#F8FAFC'
            }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
                  Weighing Slip — Bill #{viewSlipBill.billNumber}
                </div>
                <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                  Vendor: {viewSlipBill.vendorName} • Total: {viewSlipBill.totalWeightKg || 0} kg
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewSlipBill(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748B'
                }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '16px', textAlign: 'center', background: '#0F172A' }}>
              <img
                src={viewSlipBill.receiptPhoto}
                alt="Weighing Slip"
                style={{ maxWidth: '100%', maxHeight: '420px', borderRadius: '8px', objectFit: 'contain' }}
              />
            </div>
            <div style={{ padding: '10px 18px', borderTop: '1px solid #E2E8F0', textAlign: 'right', background: '#F8FAFC' }}>
              <button
                type="button"
                onClick={() => setViewSlipBill(null)}
                style={{
                  padding: '6px 16px',
                  background: '#234B3C',
                  color: '#FFF',
                  borderRadius: '6px',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '12.5px',
                  cursor: 'pointer'
                }}
              >
                Close Slip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
