import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
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
  Check
} from 'lucide-react';
import { useAdminRole } from '../context/AdminRoleContext';
import { useToast } from '../context/ToastContext';
import { orders as orderResource, employees as employeeResource, warehouses as warehouseResource, societies as societyResource, procurement as procurementResource, useUpdateOrderStatus } from '../hooks/resources';
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

  const { data: rawOrders = [], isLoading: isLoadingOrders } = orderResource.useList();
  const { data: rawEmployees = [] } = employeeResource.useList();
  const { data: rawWarehouses = [] } = warehouseResource.useList();
  const { data: rawSocieties = [] } = societyResource.useList();
  const { data: rawProcurement = [], isLoading: isLoadingProcurement } = procurementResource.useList();

  const orders = Array.isArray(rawOrders) ? rawOrders : [];
  const employees = Array.isArray(rawEmployees) ? rawEmployees : [];
  const warehouses = Array.isArray(rawWarehouses) ? rawWarehouses : [];
  const societies = Array.isArray(rawSocieties) ? rawSocieties : [];
  const procurementBills = Array.isArray(rawProcurement) ? rawProcurement : [];

  // Modal to preview Mandi Weighing Slip
  const [viewSlipBill, setViewSlipBill] = useState(null);
  const [isAdvancingOrders, setIsAdvancingOrders] = useState(false);

  const updateOrderStatusMutation = useUpdateOrderStatus();
  const deliveryRiders = useMemo(() => {
    return employees.filter(e => 
      e.role === 'DELIVERY_EXECUTIVE' || 
      (e.roles || []).includes('DELIVERY_EXECUTIVE')
    );
  }, [employees]);

  // URL Hash synchronization (#packing, #dispatch, #delivered)
  const getTabFromHash = () => {
    if (typeof window === 'undefined') return 'PACKING_STATION';
    const hash = (window.location.hash || '').toLowerCase();
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

  // Active view tab: 'PACKING_STATION' | 'SOCIETY_LOTS'
  const [activeTab, setActiveTab] = useState(getTabFromHash);
  const [lotFilter, setLotFilter] = useState(getLotFilterFromHash); // 'ALL' | 'READY_FOR_HANDOVER' | 'OUT_FOR_DELIVERY' | 'DELIVERED'
  const [slotFilter, setSlotFilter] = useState('ALL'); // 'ALL' | 'Morning' | 'Evening'
  const [societyFilter, setSocietyFilter] = useState('ALL');
  const [blockFilter, setBlockFilter] = useState('ALL');
  const [packingStageFilter, setPackingStageFilter] = useState('READY_TO_PACK'); // 'ALL' | 'READY_TO_PACK' | 'CONFIRMED' | 'PACKED'
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

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
    const targetHash = newTab === 'SOCIETY_LOTS' 
      ? (lotFilter === 'DELIVERED' ? '#delivered' : (lotFilter === 'OUT_FOR_DELIVERY' ? '#out-for-delivery' : '#dispatch')) 
      : '#packing';
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

  // 1. Mark individual order packed with customer address tag & deduct inventory
  const handleMarkPacked = async (orderId) => {
    try {
      await updateOrderStatusMutation.mutateAsync({
        id: orderId,
        status: 'PACKED',
        packedBy: currentUser?.name || 'Warehouse Packing Team',
        packedById: currentUser?.id || 'emp-packer',
      });
      showToast(`✓ Order #${orderId} packed & labeled on server!`, 'success');
    } catch (err) {
      console.error('Backend order packing status failed:', err);
      showToast(`Failed to pack order on server: ${err?.message || 'Server error'}`, 'error');
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

  const visibleOrders = orders.filter(order => {
    // Exclude cancelled and delivered orders from packing desk
    if (order.status === 'CANCELLED' || order.status === 'DELIVERED') return false;

    if (isWarehouseScoped && warehouses.length > 1) {
      const orderWhId = order.warehouseId || order.warehouse?.id || societies.find(s => s.id === order.societyId)?.warehouseId;
      const orderWhCode = order.warehouseCode || order.warehouse?.code || warehouses.find(w => w.id === orderWhId)?.code;

      const isWhMatch = 
        (!orderWhId && !orderWhCode) ||
        (orderWhId && (orderWhId === assignedWhId || orderWhId === assignedWhCode || orderWhId === resolvedWh?.uuid)) ||
        (orderWhCode && (orderWhCode === assignedWhCode || orderWhCode === assignedWhId));

      if (!isWhMatch) return false;
    }
    // Strict Scope Guard: Delivery Executive only sees orders assigned to them!
    if (isRiderRole) {
      const matchRider = 
        order.deliveryPartnerId === currentUser.id ||
        order.deliveryPartnerPhone === currentUser.phone ||
        (order.deliveryPartnerName && order.deliveryPartnerName.toLowerCase() === currentUser.name?.toLowerCase()) ||
        (currentUser.assignedLocationName && currentUser.assignedLocationName !== 'ALL' && currentUser.assignedLocationName !== 'Citywide' && order.societyName === currentUser.assignedLocationName);
      if (!matchRider) return false;
    }
    if (slotFilter !== 'ALL') {
      const s = (order.deliverySlot || 'Morning Fresh Slot').toLowerCase();
      if (!s.includes(slotFilter.toLowerCase())) return false;
    }
    return true;
  });

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

  // Filtered and Sorted Packing Orders
  const filteredPackingOrders = useMemo(() => {
    return visibleOrders.filter(order => {
      if (societyFilter !== 'ALL' && order.societyId !== societyFilter && order.societyName !== societyFilter) {
        return false;
      }
      const { block } = extractBlockAndFlat(order.flatNo);
      if (blockFilter !== 'ALL' && block !== blockFilter) {
        return false;
      }
      if (packingStageFilter === 'READY_TO_PACK' && (order.status === 'PACKED' || order.status === 'OUT_FOR_DELIVERY' || order.status === 'DELIVERED')) {
        return false;
      }
      if (packingStageFilter === 'CONFIRMED' && order.status !== 'CONFIRMED' && order.status !== 'PROCURING') {
        return false;
      }
      if (packingStageFilter === 'PACKED' && order.status !== 'PACKED' && order.status !== 'OUT_FOR_DELIVERY' && order.status !== 'DELIVERED') {
        return false;
      }
      return true;
    }).sort((a, b) => {
      const socCompare = (a.societyName || '').localeCompare(b.societyName || '');
      if (socCompare !== 0) return socCompare;
      const bA = extractBlockAndFlat(a.flatNo);
      const bB = extractBlockAndFlat(b.flatNo);
      const blockCompare = bA.block.localeCompare(bB.block);
      if (blockCompare !== 0) return blockCompare;
      return (bA.flat || '').localeCompare(bB.flat || '', undefined, { numeric: true });
    });
  }, [visibleOrders, societyFilter, blockFilter, packingStageFilter]);

  // Group into Block Crates
  const blockCrates = useMemo(() => {
    const map = {};
    filteredPackingOrders.forEach(order => {
      const soc = order.societyName || 'Society Hub';
      const { block } = extractBlockAndFlat(order.flatNo);
      const key = `${soc}____${block}`;

      if (!map[key]) {
        map[key] = {
          key,
          societyName: soc,
          societyId: order.societyId,
          blockName: block,
          orders: [],
          totalItems: 0,
          totalWeightKg: 0,
          allPacked: true,
          readyToPackCount: 0,
          confirmedCount: 0,
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

      if (order.status === 'PACKED' || order.status === 'OUT_FOR_DELIVERY' || order.status === 'DELIVERED') {
        map[key].packedCount += 1;
      } else {
        map[key].allPacked = false;
      }

      if (order.status === 'AT_WAREHOUSE') {
        map[key].readyToPackCount += 1;
      }
      if (order.status === 'CONFIRMED' || order.status === 'PROCURING') {
        map[key].confirmedCount += 1;
      }
    });

    return Object.values(map);
  }, [filteredPackingOrders]);

  const paginatedOrders = filteredPackingOrders.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Group orders into Consolidated Society Delivery Lots (Scoped by Society, Delivery Date & Delivery Slot)
  // Strict Isolation: Dispatched and Delivered orders are kept in their completed lots and NEVER mixed into pending handover lots.
  const societyLotsMap = {};
  visibleOrders.forEach(order => {
    // Only include orders in the run (not cancelled)
    if (order.status === 'CANCELLED') return;

    // Dispatch Isolation: Orders must be procured and arrived at the warehouse (AT_WAREHOUSE / PACKED / OUT_FOR_DELIVERY) to form delivery lots
    if (order.status === 'CONFIRMED' || order.status === 'PROCURING') return;
    const socName = order.societyName || 'Society Hub';
    const delivDate = order.deliveryDate || 'Morning Run';
    const delivSlot = order.deliverySlot || 'Morning Fresh Slot';

    let lotKey;
    let initialLotId = null;

    if (order.deliveryLotId) {
      // Dispatched or previously assigned lot
      lotKey = `LOT_${order.deliveryLotId}`;
      initialLotId = order.deliveryLotId;
    } else if (order.status === 'DELIVERED') {
      // Historical delivered orders without a lot ID: isolate them so they never contaminate active packing lots
      lotKey = `HIST_DELIVERED_${socName}__${delivDate}__${delivSlot}`;
    } else if (order.status === 'OUT_FOR_DELIVERY') {
      // Active in-transit orders
      lotKey = `IN_TRANSIT_${socName}__${delivDate}__${delivSlot}`;
    } else {
      // Pending active orders awaiting packing and handover (CONFIRMED, PROCURING, AT_WAREHOUSE, PACKED)
      lotKey = `PENDING_${socName}__${delivDate}__${delivSlot}`;
    }

    if (!societyLotsMap[lotKey]) {
      societyLotsMap[lotKey] = {
        lotKey,
        lotId: initialLotId,
        societyId: order.societyId,
        societyName: socName,
        deliveryDate: delivDate,
        deliverySlot: delivSlot,
        orders: [],
        totalWeightKg: 0,
        totalFlats: 0,
        isFullyPacked: true,
        status: 'PENDING_PACKING' // 'PENDING_PACKING' | 'READY_FOR_HANDOVER' | 'OUT_FOR_DELIVERY' | 'DELIVERED'
      };
    }

    societyLotsMap[lotKey].orders.push(order);
    if (!societyLotsMap[lotKey].lotId && order.deliveryLotId) {
      societyLotsMap[lotKey].lotId = order.deliveryLotId;
    }
    
    // Calculate weight
    (order.items || []).forEach(it => {
      const q = parseFloat(it.qty) || 1;
      const unit = String(it.unit || '').toLowerCase();
      let multiplier = 1;
      if (unit.includes('25 kg') || unit.includes('sack')) multiplier = 25;
      else if (unit.includes('20 kg') || unit.includes('crate')) multiplier = 20;
      else if (unit.includes('10 kg') || unit.includes('box')) multiplier = 10;
      societyLotsMap[lotKey].totalWeightKg += q * multiplier;
    });

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

  // Determine overall status for each society lot
  const societyLots = Object.values(societyLotsMap).map(lot => {
    const allDelivered = lot.orders.length > 0 && lot.orders.every(o => o.status === 'DELIVERED');
    const allOut = lot.orders.length > 0 && lot.orders.every(o => o.status === 'OUT_FOR_DELIVERY' || o.status === 'DELIVERED');
    const allPacked = lot.orders.length > 0 && lot.orders.every(o => o.status === 'PACKED');

    let lotStatus = 'PENDING_PACKING';
    if (allDelivered) lotStatus = 'DELIVERED';
    else if (allOut) lotStatus = 'OUT_FOR_DELIVERY';
    else if (allPacked) lotStatus = 'READY_FOR_HANDOVER';

    // Get assigned delivery partner if already dispatched
    const firstAssigned = lot.orders.find(o => o.deliveryPartnerName);

    return {
      ...lot,
      status: lotStatus,
      deliveryPartnerName: firstAssigned?.deliveryPartnerName || null,
      vehicleNumber: firstAssigned?.vehicleNumber || null,
      dispatchedAt: firstAssigned?.dispatchedAt || null
    };
  });

  // Open Handover Modal & Auto-Populate Warehouse Assigned Driver
  const handleOpenHandover = (lot) => {
    // Strictly isolate only active, non-delivered orders for the handover dispatch payload
    const activeOrders = lot.orders.filter(o => o.status !== 'DELIVERED' && o.status !== 'CANCELLED');
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
      (resolvedWh && (r.assignedWarehouseId === resolvedWh.id || r.assignedWarehouseId === resolvedWh.code || r.assignedWarehouseId === resolvedWh.uuid))
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
      showToast(`✓ Lot #${handoverLot.lotId} dispatched to driver ${driverName} (${vehicleNumber}) on server!`, 'success');
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

  // Pack & Seal Entire Block Crate
  const handlePackEntireBlock = async (crate) => {
    const unpackagedOrders = crate.orders.filter(o => o.status !== 'PACKED' && o.status !== 'OUT_FOR_DELIVERY' && o.status !== 'DELIVERED');
    if (unpackagedOrders.length === 0) {
      showToast('All orders in this crate are already packed & sealed!', 'info');
      return;
    }

    const confirmed = window.confirm(`Confirm packing & sealing all ${unpackagedOrders.length} order(s) for ${crate.societyName} [${crate.blockName}]?`);
    if (!confirmed) return;

    try {
      await Promise.all(unpackagedOrders.map(o => updateOrderStatusMutation.mutateAsync({
        id: o.id,
        status: 'PACKED',
        packedBy: currentUser?.name || 'Warehouse Packing Lead',
        packedById: currentUser?.id || 'emp-packer'
      })));
      showToast(`✓ Crate [${crate.societyName} — ${crate.blockName}] packed & sealed (${unpackagedOrders.length} orders)!`, 'success');
    } catch (err) {
      showToast(`Failed to pack crate: ${err?.message || 'Server error'}`, 'error');
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
              <div style="font-size: 13px; color: #64748B; font-weight: 800; letter-spacing: 1px; text-transform: uppercase;">FRESHIOZ MORNING DISPATCH CRATE</div>
              <div class="title">${crate.societyName}</div>
              <div class="block-badge">${crate.blockName}</div>
            </div>
            <div class="meta">
              <span>Orders: ${crate.orders.length}</span>
              <span>Weight: ~${crate.totalWeightKg.toFixed(1)} kg</span>
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

  const readyToPackCount = visibleOrders.filter(o => o.status !== 'PACKED' && o.status !== 'OUT_FOR_DELIVERY' && o.status !== 'DELIVERED').length;
  const mandiTransitCount = visibleOrders.filter(o => o.status === 'CONFIRMED' || o.status === 'PROCURING').length;
  const toPackCount = readyToPackCount;
  const packedCount = visibleOrders.filter(o => o.status === 'PACKED').length;
  const outCount = visibleOrders.filter(o => o.status === 'OUT_FOR_DELIVERY').length;

  return (
    <div className="admin-page-container">
      {/* Page Header */}
      <div className="page-title-header" style={{ marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Warehouse Packing Desk & Society Lot Dispatch
            </h1>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>
              Weigh customer retail bags, apply flat address labels, group into One Society Lot, and assign to Delivery Partner
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Logistics Hub Badge */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 12px',
              borderRadius: '6px',
              border: isWarehouseScoped ? '1.5px solid #A7F3D0' : '1.5px solid #E2E8F0',
              background: isWarehouseScoped ? '#ECFDF5' : '#F8FAFC',
              fontSize: '12px',
              fontWeight: 800,
              color: isWarehouseScoped ? '#065F46' : '#1E293B'
            }}>
              <Warehouse size={15} color={isWarehouseScoped ? "#059669" : "#0284C7"} />
              <span>🏢 {assignedWhCode ? `${assignedWhCode} — ${assignedWhName}` : (assignedWhName || currentUser?.assignedLocationName || (currentUser?.assignedWarehouseId !== 'ALL' ? currentUser?.assignedWarehouseId : 'All Hubs & Warehouses'))}</span>
              {isWarehouseScoped && (
                <span style={{ fontSize: '10px', background: '#059669', color: '#FFF', padding: '1px 5px', borderRadius: '4px' }}>🔒 Assigned Hub</span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11.5px', background: '#DCFCE7', color: '#166534', padding: '3px 10px', borderRadius: '6px', fontWeight: 800, border: '1px solid #86EFAC' }}>
                ⚡ Ready to Pack: {readyToPackCount}
              </span>
              <span style={{ fontSize: '11.5px', background: '#FEF3C7', color: '#B45309', padding: '3px 10px', borderRadius: '6px', fontWeight: 700 }}>
                ⏳ Mandi Sourcing: {mandiTransitCount}
              </span>
              <span style={{ fontSize: '11.5px', background: '#E0F2FE', color: '#0369A1', padding: '3px 10px', borderRadius: '6px', fontWeight: 700 }}>
                ✓ Packed & Labeled: {packedCount}
              </span>
              <span style={{ fontSize: '11.5px', background: '#F1F5F9', color: '#475569', padding: '3px 10px', borderRadius: '6px', fontWeight: 700 }}>
                🚚 In-Transit: {outCount}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Streamlined 2-Step Operations Workflow Tabs */}
      <div style={{
        display: 'flex',
        alignItems: 'stretch',
        gap: '12px',
        marginBottom: '16px',
        flexWrap: 'wrap'
      }}>
        {/* Step 1: Pack & Crate */}
        <button
          type="button"
          onClick={() => handleTabChange('PACKING_STATION')}
          style={{
            flex: '1 1 280px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 18px',
            borderRadius: '10px',
            border: activeTab === 'PACKING_STATION' ? '2px solid #234B3C' : '1.5px solid #E2E8F0',
            background: activeTab === 'PACKING_STATION' ? '#F0FDF4' : '#FFFFFF',
            cursor: 'pointer',
            textAlign: 'left',
            boxShadow: activeTab === 'PACKING_STATION' ? '0 2px 6px rgba(35, 75, 60, 0.1)' : 'none',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            background: activeTab === 'PACKING_STATION' ? '#234B3C' : '#F1F5F9',
            color: activeTab === 'PACKING_STATION' ? '#FFFFFF' : '#64748B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 900,
            fontSize: '15px',
            flexShrink: 0
          }}>
            1
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13.5px', fontWeight: 900, color: activeTab === 'PACKING_STATION' ? '#234B3C' : '#1E293B' }}>
                Step 1: Pack & Crate Orders
              </span>
              {toPackCount > 0 && (
                <span style={{ background: '#FEF3C7', color: '#B45309', fontSize: '11px', padding: '1px 7px', borderRadius: '9999px', fontWeight: 800 }}>
                  {toPackCount} to pack
                </span>
              )}
            </div>
            <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
              Weigh produce bags, verify items & assign to Block Crates
            </div>
          </div>
        </button>

        {/* Step 2: Driver Handover */}
        <button
          type="button"
          onClick={() => handleTabChange('SOCIETY_LOTS')}
          style={{
            flex: '1 1 280px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 18px',
            borderRadius: '10px',
            border: activeTab === 'SOCIETY_LOTS' ? '2px solid #234B3C' : '1.5px solid #E2E8F0',
            background: activeTab === 'SOCIETY_LOTS' ? '#F0FDF4' : '#FFFFFF',
            cursor: 'pointer',
            textAlign: 'left',
            boxShadow: activeTab === 'SOCIETY_LOTS' ? '0 2px 6px rgba(35, 75, 60, 0.1)' : 'none',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            background: activeTab === 'SOCIETY_LOTS' ? '#234B3C' : '#F1F5F9',
            color: activeTab === 'SOCIETY_LOTS' ? '#FFFFFF' : '#64748B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 900,
            fontSize: '15px',
            flexShrink: 0
          }}>
            2
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13.5px', fontWeight: 900, color: activeTab === 'SOCIETY_LOTS' ? '#234B3C' : '#1E293B' }}>
                Step 2: Driver Handover & Lots
              </span>
              <span style={{ background: '#E2E8F0', color: '#334155', fontSize: '11px', padding: '1px 7px', borderRadius: '9999px', fontWeight: 800 }}>
                {societyLots.length} Society Lots
              </span>
            </div>
            <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
              Dispatch sealed crates to delivery partners with vehicle check
            </div>
          </div>
        </button>
      </div>

      {/* VIEW 1: PACKING STATION (APARTMENT & BLOCK-WISE CRATING) */}
      {activeTab === 'PACKING_STATION' && (
        <div>
          {/* LIVE MANDI INWARD CONSIGNMENT ARRIVALS DOCK */}
          {warehouseProcurements.length > 0 && (
            <div style={{
              background: '#F0FDF4',
              border: '1.5px solid #86EFAC',
              borderRadius: '12px',
              padding: '14px 18px',
              marginBottom: '16px',
              boxShadow: '0 2px 6px rgba(5, 150, 105, 0.05)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#059669', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Truck size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#064E3B', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span>Mandi Inward Arrivals (Warehouse Intake Dock)</span>
                      <span style={{ fontSize: '11px', background: '#DCFCE7', color: '#166534', padding: '1px 8px', borderRadius: '999px', fontWeight: 800, border: '1px solid #86EFAC' }}>
                        ✓ {warehouseProcurements.length} Consignment(s) Inwarded
                      </span>
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#047857', marginTop: '2px' }}>
                      Produce arrived from Mandi vendors ready for sorting into resident bags
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {visibleOrders.some(o => o.status === 'CONFIRMED' || o.status === 'PROCURING') && (
                    <button
                      type="button"
                      onClick={handleAdvanceOrdersToPacking}
                      disabled={isAdvancingOrders}
                      style={{
                        padding: '6px 14px',
                        background: '#059669',
                        color: '#FFF',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 800,
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <PackageCheck size={14} />
                      <span>{isAdvancingOrders ? 'Advancing...' : '⚡ Unlock Matching Orders to Pack'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Consignment Items Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
                {warehouseProcurements.slice(0, 3).map(bill => (
                  <div key={bill.id} style={{
                    background: '#FFFFFF',
                    border: '1px solid #BBF7D0',
                    borderRadius: '8px',
                    padding: '10px 14px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#0F172A' }}>
                        Bill #{bill.billNumber} • {bill.vendorName}
                      </span>
                      <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
                        {bill.procuredAtTime || 'Today'}
                      </span>
                    </div>
                    
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                      {(bill.items || []).map((it, idx) => (
                        <span key={idx} style={{
                          fontSize: '11px',
                          background: '#F1F5F9',
                          color: '#334155',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontWeight: 700
                        }}>
                          {it.name}: <strong>{it.qty} {it.unit || 'kg'}</strong>
                        </span>
                      ))}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '6px', borderTop: '1px dashed #E2E8F0', fontSize: '11.5px' }}>
                      <span style={{ color: '#059669', fontWeight: 800 }}>
                        Total: {bill.totalWeightKg || (bill.items || []).reduce((s, i) => s + (Number(i.qty) || 0), 0)} kg
                      </span>
                      {bill.receiptPhoto && (
                        <button
                          type="button"
                          onClick={() => setViewSlipBill(bill)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#0284C7',
                            fontWeight: 700,
                            fontSize: '11.5px',
                            cursor: 'pointer',
                            textDecoration: 'underline'
                          }}
                        >
                          View Weighing Slip
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CONSOLIDATED SINGLE-BAR PACKING CONTROLS */}
          <div style={{
            background: '#FFFFFF',
            border: '1.5px solid #E2E8F0',
            borderRadius: '10px',
            padding: '10px 14px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            {/* Filter Dropdowns in a single row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {/* Run Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#F8FAFC', border: '1px solid #CBD5E1', padding: '4px 8px', borderRadius: '6px' }}>
                <Clock size={13} color="#64748B" />
                <select
                  value={slotFilter}
                  onChange={(e) => setSlotFilter(e.target.value)}
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
                  <option value="ALL">All Runs (Morning & Evening)</option>
                  <option value="Morning">🌅 Morning Fresh Run</option>
                  <option value="Evening">🌇 Evening Run</option>
                </select>
              </div>

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
                  <option value="ALL">🏢 All Apartments ({availableSocieties.length})</option>
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
                  <option value="ALL">📦 All Blocks / Wings ({availableBlocks.length})</option>
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
                  <option value="ALL">All Packing Stages</option>
                  <option value="READY_TO_PACK">⚡ Ready to Pack (Produce Received)</option>
                  <option value="CONFIRMED">⏳ Awaiting Mandi Inflow (Pending Orders)</option>
                  <option value="PACKED">✓ Packed & Sealed</option>
                </select>
              </div>
            </div>

            {/* Right: Active Crates & Flats Counter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#EBF2EE',
                color: '#234B3C',
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 800,
                border: '1px solid #A7C4B8'
              }}>
                <Boxes size={14} color="#234B3C" />
                <span>{blockCrates.length} Block Crate(s) • {filteredPackingOrders.length} Flats</span>
              </span>
            </div>
          </div>

          {/* DEDICATED APARTMENT & BLOCK CRATE BOXES */}
          <div>
              {blockCrates.length === 0 ? (
                <div className="admin-empty-state" style={{ background: '#FFF', borderRadius: '12px', border: '1.5px solid #E2E8F0', padding: '36px 20px', textAlign: 'center' }}>
                  <div className="admin-empty-state-icon" style={{ margin: '0 auto 12px' }}>
                    <PackageCheck size={26} color="#059669" />
                  </div>
                  <div className="admin-empty-state-title" style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
                    {warehouseProcurements.length > 0 
                      ? 'Mandi Consignment Inwarded & Ready at Dock'
                      : 'No Orders Matching Packing Criteria'}
                  </div>
                  <div className="admin-empty-state-desc" style={{ fontSize: '13px', color: '#64748B', maxWidth: '480px', margin: '6px auto 0', lineHeight: 1.5 }}>
                    {warehouseProcurements.length > 0 ? (
                      <>
                        <span style={{ fontWeight: 700, color: '#065F46' }}>✓ Consignment produce safely inwarded at warehouse dock.</span>
                        <div style={{ marginTop: '4px' }}>
                          Produce is stored in hub inventory. As soon as resident flat orders for this run are confirmed, they will appear here in Block Crates for weighing, bagging, and address labeling.
                        </div>
                      </>
                    ) : (
                      'Select another Apartment or Block, or adjust the stage filter to view orders.'
                    )}
                  </div>
                  {warehouseProcurements.length > 0 && packingStageFilter !== 'ALL' && (
                    <button
                      type="button"
                      onClick={() => setPackingStageFilter('ALL')}
                      style={{
                        marginTop: '14px',
                        padding: '6px 16px',
                        background: '#234B3C',
                        color: '#FFF',
                        borderRadius: '6px',
                        border: 'none',
                        fontWeight: 700,
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      View All Orders & Stages
                    </button>
                  )}
                </div>
              ) : (
                blockCrates.map(crate => {
                  const unpackagedOrders = crate.orders.filter(o => o.status !== 'PACKED' && o.status !== 'OUT_FOR_DELIVERY' && o.status !== 'DELIVERED');
                  const isCrateDone = crate.allPacked;

                  return (
                    <div key={crate.key} style={{
                      background: '#FFFFFF',
                      border: isCrateDone ? '2px solid #86EFAC' : '2px solid #CBD5E1',
                      borderRadius: '12px',
                      marginBottom: '20px',
                      overflow: 'hidden',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
                    }}>
                      {/* Crate Header Banner */}
                      <div style={{
                        background: isCrateDone ? '#F0FDF4' : '#F8FAFC',
                        borderBottom: isCrateDone ? '1.5px solid #BBF7D0' : '1.5px solid #E2E8F0',
                        padding: '14px 18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '12px'
                      }}>
                        {/* Left: Crate Title & Identity */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            background: isCrateDone ? '#DCFCE7' : '#E0F2FE',
                            color: isCrateDone ? '#166534' : '#0369A1',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <PackageCheck size={22} />
                          </div>

                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '15px', fontWeight: 900, color: '#0F172A' }}>
                                {crate.societyName}
                              </span>
                              <span style={{
                                background: '#234B3C',
                                color: '#FFFFFF',
                                fontSize: '12px',
                                fontWeight: 900,
                                padding: '3px 10px',
                                borderRadius: '6px',
                                letterSpacing: '0.4px'
                              }}>
                                📦 CRATE: {crate.blockName}
                              </span>
                              {isCrateDone ? (
                                <span style={{ fontSize: '11px', background: '#DCFCE7', color: '#166534', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', border: '1px solid #86EFAC' }}>
                                  ✓ Crate Sealed & Ready
                                </span>
                              ) : crate.readyToPackCount > 0 ? (
                                <span style={{ fontSize: '11px', background: '#E0F2FE', color: '#0369A1', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', border: '1px solid #BAE6FD' }}>
                                  ⚡ Produce Arrived ({crate.readyToPackCount} to pack)
                                </span>
                              ) : (
                                <span style={{ fontSize: '11px', background: '#FEF3C7', color: '#B45309', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', border: '1px solid #FDE68A' }}>
                                  ⏳ Mandi Procurement ({crate.confirmedCount})
                                </span>
                              )}
                            </div>

                            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <span><strong>{crate.orders.length}</strong> Flats in Crate</span>
                              <span>•</span>
                              <span><strong>{crate.totalItems}</strong> Produce Bags</span>
                              <span>•</span>
                              <span>Est. Weight: <strong>~{crate.totalWeightKg.toFixed(1)} kg</strong></span>
                            </div>
                          </div>
                        </div>

                        {/* Right: Actions */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => handlePrintCrateTag(crate)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '7px 12px',
                              borderRadius: '6px',
                              border: '1.5px solid #CBD5E1',
                              background: '#FFFFFF',
                              color: '#334155',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                            title="Print physical crate manifest label for plastic tote"
                          >
                            <Printer size={14} />
                            <span>Print Crate Tag</span>
                          </button>

                          {!isCrateDone && (
                            <button
                              type="button"
                              onClick={() => handlePackEntireBlock(crate)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '7px 14px',
                                borderRadius: '6px',
                                border: 'none',
                                background: '#166534',
                                color: '#FFFFFF',
                                fontSize: '12px',
                                fontWeight: 800,
                                cursor: 'pointer',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                              }}
                            >
                              <Check size={14} />
                              <span>Pack & Seal Block Crate ({unpackagedOrders.length})</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Orders Table inside Crate */}
                      <div style={{ overflowX: 'auto' }}>
                        <table className="admin-data-table" style={{ margin: 0 }}>
                          <thead>
                            <tr style={{ background: '#FAFBFB' }}>
                              <th style={{ width: '140px' }}>Flat / Door #</th>
                              <th style={{ width: '150px' }}>Order ID</th>
                              <th style={{ width: '180px' }}>Resident POC</th>
                              <th>Produce Items in Bag</th>
                              <th style={{ width: '150px' }}>Status</th>
                              <th style={{ width: '140px', textAlign: 'right' }}>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {crate.orders.map(order => {
                              const { flat } = extractBlockAndFlat(order.flatNo);
                              const isPacked = order.status === 'PACKED' || order.status === 'OUT_FOR_DELIVERY' || order.status === 'DELIVERED';
                              const isReady = order.status === 'AT_WAREHOUSE';

                              return (
                                <tr key={order.id} style={{ background: isPacked ? '#F9FCF9' : '#FFF' }}>
                                  <td>
                                    <div style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '5px',
                                      background: '#EBF2EE',
                                      color: '#234B3C',
                                      fontWeight: 900,
                                      fontSize: '13px',
                                      padding: '4px 10px',
                                      borderRadius: '6px',
                                      border: '1.5px solid #A7C4B8'
                                    }}>
                                      <MapPin size={13} color="#234B3C" />
                                      <span>{flat}</span>
                                    </div>
                                  </td>

                                  <td>
                                    <strong style={{ fontFamily: 'monospace', color: '#0F172A', fontSize: '13px' }}>
                                      #{order.id}
                                    </strong>
                                    <div style={{ fontSize: '10.5px', color: '#64748B' }}>
                                      {order.deliverySlot || 'Morning Run'}
                                    </div>
                                  </td>

                                  <td>
                                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>{order.userName || 'Resident'}</div>
                                    <div style={{ fontSize: '11px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                      <span>{formatMaskedPhone(order.userPhone)}</span>
                                      {order.userPhone && (
                                        <a
                                          href={`tel:${order.userPhone}`}
                                          title={`Call Resident: ${formatMaskedPhone(order.userPhone)}`}
                                          style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '3px',
                                            color: '#15803D',
                                            background: '#DCFCE7',
                                            padding: '1px 6px',
                                            borderRadius: '4px',
                                            textDecoration: 'none',
                                            fontSize: '10px',
                                            fontWeight: 700
                                          }}
                                        >
                                          <Phone size={10} />
                                          <span>Call</span>
                                        </a>
                                      )}
                                    </div>
                                  </td>

                                  <td>
                                    <div style={{ fontSize: '12.5px', color: '#1E293B', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                      {(order.items || []).map((i, iIdx) => (
                                        <span key={iIdx} style={{ background: '#F1F5F9', padding: '2px 7px', borderRadius: '4px', fontSize: '11.5px', fontWeight: 600 }}>
                                          {i.name} <strong>({i.qty} * {i.unit})</strong>
                                        </span>
                                      ))}
                                    </div>
                                  </td>

                                  <td>
                                    {isPacked ? (
                                      <span style={{ fontSize: '11px', fontWeight: 800, padding: '3px 8px', borderRadius: '4px', background: '#DCFCE7', color: '#15803D' }}>
                                        ✓ Packed & Labeled
                                      </span>
                                    ) : isReady ? (
                                      <span style={{ fontSize: '11px', fontWeight: 800, padding: '3px 8px', borderRadius: '4px', background: '#E0F2FE', color: '#0369A1' }}>
                                        ⚡ Ready to Pack
                                      </span>
                                    ) : (
                                      <span style={{ fontSize: '11px', fontWeight: 800, padding: '3px 8px', borderRadius: '4px', background: '#FEF3C7', color: '#B45309' }}>
                                        ⏳ Mandi Sourcing
                                      </span>
                                    )}
                                  </td>

                                  <td style={{ textAlign: 'right' }}>
                                    {!isPacked ? (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenPackingVerification(order)}
                                        className="admin-btn-accent"
                                        style={{
                                          fontSize: '11.5px',
                                          padding: '5px 12px',
                                          borderRadius: '6px',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          background: isReady ? '#059669' : '#234B3C'
                                        }}
                                      >
                                        <Tag size={13} />
                                        <span>Pack & Label</span>
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => setLabelModalOrder(order)}
                                        style={{
                                          background: '#FFFFFF',
                                          border: '1px solid #CBD5E1',
                                          padding: '4px 8px',
                                          borderRadius: '6px',
                                          fontSize: '11.5px',
                                          fontWeight: 700,
                                          color: '#334155',
                                          cursor: 'pointer',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px'
                                        }}
                                      >
                                        <Printer size={12} />
                                        <span>Label</span>
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Sub-Lot Filter Pills for Dispatch and Delivery Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', padding: '4px 0' }}>
            <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, marginRight: '4px' }}>Filter Lots:</span>
            <button
              type="button"
              onClick={() => handleLotFilterChange('ALL')}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11.5px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: lotFilter === 'ALL' ? '#234B3C' : '#E2E8F0',
                color: lotFilter === 'ALL' ? '#FFFFFF' : '#475569'
              }}
            >
              All Lots ({societyLots.length})
            </button>
            <button
              type="button"
              onClick={() => handleLotFilterChange('READY_FOR_HANDOVER')}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11.5px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: lotFilter === 'READY_FOR_HANDOVER' ? '#15803D' : '#DCFCE7',
                color: lotFilter === 'READY_FOR_HANDOVER' ? '#FFFFFF' : '#15803D'
              }}
            >
              Ready for Handover ({societyLots.filter(l => l.status === 'READY_FOR_HANDOVER').length})
            </button>
            <button
              type="button"
              onClick={() => handleLotFilterChange('OUT_FOR_DELIVERY')}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11.5px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: lotFilter === 'OUT_FOR_DELIVERY' ? '#B45309' : '#FEF3C7',
                color: lotFilter === 'OUT_FOR_DELIVERY' ? '#FFFFFF' : '#B45309'
              }}
            >
              Out for Delivery ({societyLots.filter(l => l.status === 'OUT_FOR_DELIVERY').length})
            </button>
            <button
              type="button"
              onClick={() => handleLotFilterChange('DELIVERED')}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11.5px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: lotFilter === 'DELIVERED' ? '#047857' : '#ECFDF5',
                color: lotFilter === 'DELIVERED' ? '#FFFFFF' : '#047857'
              }}
            >
              Delivered at Society Drop Desk ({societyLots.filter(l => l.status === 'DELIVERED').length})
            </button>
          </div>

          {societyLots.filter(l => lotFilter === 'ALL' || l.status === lotFilter).length === 0 ? (
            <div className="admin-table-card" style={{ padding: '36px', textAlign: 'center' }}>
              <Building2 size={32} color="#94A3B8" style={{ margin: '0 auto 10px' }} />
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>No Matching Society Delivery Lots</div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>No lots found matching status filter "{lotFilter}".</div>
            </div>
          ) : (
            societyLots.filter(l => lotFilter === 'ALL' || l.status === lotFilter).map(lot => (
              <div 
                key={lot.lotId}
                style={{
                  background: '#FFFFFF',
                  borderRadius: '12px',
                  border: lot.status === 'OUT_FOR_DELIVERY' ? '2px solid #F59E0B' : lot.status === 'DELIVERED' ? '2px solid #10B981' : '1.5px solid #E2E8F0',
                  padding: '18px 20px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
                }}
              >
                {/* Lot Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', borderBottom: '1px solid #F1F5F9', paddingBottom: '12px', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '10px',
                      background: '#EBF2EE',
                      color: '#234B3C',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '14px'
                    }}>
                      📦
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                          {lot.societyName}
                        </h3>
                        <span style={{ fontSize: '11px', fontFamily: 'monospace', background: '#F1F5F9', color: '#475569', fontWeight: 800, padding: '2px 6px', borderRadius: '4px' }}>
                          #{lot.lotId}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                        One Consolidated Delivery Lot for {lot.orders.length} {lot.orders.length === 1 ? 'Resident Flat' : 'Resident Flats'} • Total: <strong>{lot.totalWeightKg} kg</strong> Produce
                      </div>
                    </div>
                  </div>

                  {/* Lot Status Badge */}
                  <div>
                    {lot.status === 'READY_FOR_HANDOVER' && (
                      <span style={{ fontSize: '12px', background: '#DCFCE7', color: '#15803D', fontWeight: 800, padding: '4px 12px', borderRadius: '9999px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <CheckCircle2 size={13} />
                        <span>All Packets Ready for Handover</span>
                      </span>
                    )}
                    {lot.status === 'OUT_FOR_DELIVERY' && (
                      <span style={{ fontSize: '12px', background: '#FEF3C7', color: '#B45309', fontWeight: 800, padding: '4px 12px', borderRadius: '9999px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <Truck size={13} />
                        <span>Out for Delivery • In-Transit</span>
                      </span>
                    )}
                    {lot.status === 'DELIVERED' && (
                      <span style={{ fontSize: '12px', background: '#ECFDF5', color: '#059669', fontWeight: 800, padding: '4px 12px', borderRadius: '9999px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <CheckCircle2 size={13} />
                        <span>Secured at Society Drop Desk</span>
                      </span>
                    )}
                    {lot.status === 'PENDING_PACKING' && (
                      <span style={{ fontSize: '12px', background: '#F1F5F9', color: '#64748B', fontWeight: 700, padding: '4px 12px', borderRadius: '9999px' }}>
                        Packing in Progress ({lot.orders.filter(o => o.status === 'PACKED').length}/{lot.orders.length})
                      </span>
                    )}
                  </div>
                </div>

                {/* Packets inside this Lot */}
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>
                    Packets in this Consolidated Lot:
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '8px' }}>
                    {lot.orders.map(o => (
                      <div 
                        key={o.id}
                        style={{
                          background: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          borderRadius: '8px',
                          padding: '10px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '13px' }}>
                            {o.flatNo} — {o.userName}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>
                            {o.items.map(it => {
                              const q = Number(it.qty) || 1;
                              const rawUnit = (it.unit || '').trim();
                              const isPc = /^(1\s*)?pcs?$/i.test(rawUnit);
                              if (isPc || !rawUnit) {
                                return q > 1 ? `${it.name} (×${q})` : it.name;
                              }
                              const cleanUnit = rawUnit.replace(/^1\s*/, '').trim();
                              return cleanUnit ? `${it.name} (${q > 1 ? `${q} ` : ''}${cleanUnit})` : (q > 1 ? `${it.name} (×${q})` : it.name);
                            }).join(', ')}
                          </div>
                        </div>

                        <span style={{
                          fontSize: '10.5px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: o.status === 'PACKED' || o.status === 'OUT_FOR_DELIVERY' || o.status === 'DELIVERED' ? '#DCFCE7' : '#FEF3C7',
                          color: o.status === 'PACKED' || o.status === 'OUT_FOR_DELIVERY' || o.status === 'DELIVERED' ? '#15803D' : '#B45309'
                        }}>
                          {o.status === 'PACKED' ? '✓ Packed' : o.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Handover & Driver Info Bar */}
                <div style={{
                  background: lot.status === 'OUT_FOR_DELIVERY' ? '#FFFBEB' : '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}>
                  {lot.deliveryPartnerName ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Truck size={20} color="#D97706" />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: '#92400E' }}>
                          Assigned Driver: {lot.deliveryPartnerName} {lot.vehicleNumber ? `(${lot.vehicleNumber})` : ''}
                        </div>
                        <div style={{ fontSize: '11px', color: '#B45309' }}>
                          Dispatched at {lot.dispatchedAt ? new Date(lot.dispatchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Transport Run'}
                        </div>
                      </div>
                    </div>
                  ) : lot.status === 'OUT_FOR_DELIVERY' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#92400E', fontSize: '12.5px', fontWeight: 700 }}>
                      <Truck size={16} color="#D97706" />
                      <span>Dispatched from Warehouse • Route run in progress</span>
                    </div>
                  ) : (
                    <div style={{ fontSize: '12.5px', color: '#64748B' }}>
                      Ready to assign vehicle & delivery driver for transport run
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {lot.status !== 'OUT_FOR_DELIVERY' && lot.status !== 'DELIVERED' && (
                      <button
                        type="button"
                        onClick={() => handleOpenHandover(lot)}
                        className="admin-btn-accent"
                        style={{ fontSize: '12.5px', padding: '7px 16px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Send size={14} />
                        <span>Handover & Dispatch Lot to Driver</span>
                      </button>
                    )}

                    {lot.status === 'OUT_FOR_DELIVERY' && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: '#FEF3C7',
                        color: '#92400E',
                        border: '1px solid #FDE68A',
                        padding: '6px 14px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 800
                      }}>
                        <Truck size={14} color="#D97706" />
                        <span>In-Transit • Awaiting Rider Drop Desk Confirmation</span>
                      </span>
                    )}

                    {lot.status === 'DELIVERED' && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: '#DCFCE7',
                        color: '#15803D',
                        border: '1px solid #86EFAC',
                        padding: '6px 14px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 800
                      }}>
                        <CheckCircle2 size={14} color="#15803D" />
                        <span>Delivered & Verified at Society Gate</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
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
                      if (selectedVal === 'CUSTOM') {
                        setDriverName('');
                        setDriverPhone('');
                      } else {
                        const rider = deliveryRiders.find(r => r.id === selectedVal);
                        if (rider) {
                          setDriverName(rider.name);
                          setDriverPhone(rider.phone);
                        }
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
                      cursor: 'pointer',
                      marginBottom: (driverId === 'CUSTOM' || deliveryRiders.length === 0) ? '8px' : '0'
                    }}
                    required
                  >
                    {deliveryRiders.length === 0 && (
                      <option value="">No registered delivery executives found</option>
                    )}
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
                    <option value="CUSTOM">✏️ Other / Freelance Temp Driver</option>
                  </select>

                  {/* Manual input only if Other is selected or no drivers registered */}
                  {(driverId === 'CUSTOM' || deliveryRiders.length === 0) && (
                    <input
                      type="text"
                      placeholder="Enter driver full name..."
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '6px', border: '1.5px solid #CBD5E1', fontSize: '13px', fontWeight: 700, marginTop: '8px' }}
                      required
                    />
                  )}
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '4px', color: '#334155' }}>
                    Driver Contact Phone *
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. 9845077112"
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '0 10px',
                      borderRadius: '6px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '13px',
                      fontWeight: 700,
                      background: driverId !== 'CUSTOM' && deliveryRiders.length > 0 ? '#F8FAFC' : '#FFF'
                    }}
                    required
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
                  style={{ padding: '8px 18px', borderRadius: '6px', fontSize: '13px', fontWeight: 800 }}
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
                      <strong>Produce In Sourcing:</strong> This order is listed under Mandi Sourcing. Please ensure produce from today's mandi arrivals is physically weighed and present on the sorting table before packing.
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
                  💡 Confirm all items are weighed into the retail bag, then place the bag into <strong>Crate: {block}</strong> for {packingModalOrder.societyName}.
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
