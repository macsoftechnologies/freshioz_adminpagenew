import React, { useState, useEffect } from 'react';
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
  ChevronRight
} from 'lucide-react';
import { useAdminRole } from '../context/AdminRoleContext';
import { useToast } from '../context/ToastContext';
import { saveFreshiozStore, generateId, generateUUID } from '../shared/freshiozStore';
import { orderService } from '../services/orderService';
import AdminPagination from '../components/common/AdminPagination';

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

export default function WarehouseCratingPage() {
  const { store, currentUser, currentRoleId } = useAdminRole();
  const { showToast } = useToast();

  const isDeliveryExecutive = currentRoleId === 'DELIVERY_EXECUTIVE' || currentUser?.role === 'DELIVERY_EXECUTIVE';

  const orders = store.orders || [];
  const employees = store.employees || [];
  const warehouses = store.warehouses || [];
  const deliveryRiders = employees.filter(e => (e.roles || []).includes('DELIVERY_EXECUTIVE'));

  // URL Hash synchronization (#packing, #dispatch, #delivered)
  const getTabFromHash = () => {
    if (typeof window === 'undefined') return 'PACKING_STATION';
    const hash = (window.location.hash || '').toLowerCase();
    if (hash === '#dispatch' || hash === '#lots' || hash === '#delivered') return 'SOCIETY_LOTS';
    return 'PACKING_STATION';
  };

  const getLotFilterFromHash = () => {
    if (typeof window === 'undefined') return 'ALL';
    const hash = (window.location.hash || '').toLowerCase();
    if (hash === '#delivered') return 'DELIVERED';
    if (hash === '#dispatch') return 'OUT_FOR_DELIVERY';
    return 'ALL';
  };

  // Active view tab: 'PACKING_STATION' | 'SOCIETY_LOTS'
  const [activeTab, setActiveTab] = useState(getTabFromHash);
  const [lotFilter, setLotFilter] = useState(getLotFilterFromHash); // 'ALL' | 'READY_FOR_HANDOVER' | 'OUT_FOR_DELIVERY' | 'DELIVERED'
  const [slotFilter, setSlotFilter] = useState('ALL'); // 'ALL' | 'Morning' | 'Evening'
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
    const targetHash = newTab === 'SOCIETY_LOTS' ? (lotFilter === 'DELIVERED' ? '#delivered' : '#dispatch') : '#packing';
    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash;
    }
  };

  const handleLotFilterChange = (filterVal) => {
    setLotFilter(filterVal);
    const targetHash = filterVal === 'DELIVERED' ? '#delivered' : (filterVal === 'OUT_FOR_DELIVERY' ? '#dispatch' : '#lots');
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
      await orderService.updateStatus(orderId, { status: 'PACKED' });
    } catch (err) {
      console.error('Backend order packing status failed:', err);
      showToast(`Failed to pack order on server: ${err?.message || 'Server error'}`, 'error');
      return;
    }

    saveFreshiozStore(prev => {
      const targetOrder = (prev.orders || []).find(o => o.id === orderId);
      const whId = targetOrder?.warehouseId || warehouses[0]?.id || '';

      // Deduct produce from warehouse inventory upon packing
      const currentInv = prev.warehouseInventory || {};
      const whInv = { ...(currentInv[whId] || {}) };
      if (targetOrder && targetOrder.status !== 'PACKED') {
        (targetOrder.items || []).forEach(it => {
          const kg = (parseFloat(it.qty) || 1);
          if (it.name && whInv[it.name] !== undefined) {
            whInv[it.name] = Math.max(0, Number((whInv[it.name] - kg).toFixed(2)));
          }
        });
      }

      return {
        ...prev,
        warehouseInventory: {
          ...currentInv,
          [whId]: whInv
        },
        orders: (prev.orders || []).map(o => {
          if (o.id === orderId) {
            return {
              ...o,
              status: 'PACKED',
              packedAt: new Date().toISOString(),
              packedBy: currentUser?.name || 'Warehouse Packing Team',
              packedById: currentUser?.id || 'emp-packer',
              packageTag: `${o.societyName} • ${o.flatNo}`
            };
          }
          return o;
        })
      };
    });
    showToast(`✓ Order #${orderId} packed & labeled on server!`, 'success');
  };

  // Crating station is strictly for warehouse ops; visibleOrders filters by manager warehouse
  const isRiderRole = currentUser?.role === 'DELIVERY_EXECUTIVE' && !currentUser?.roles?.includes('SUPER_ADMIN');

  // Filter orders based on user's role and assigned warehouse / route / dispatch slot
  const visibleOrders = orders.filter(order => {
    if (currentUser?.role === 'WAREHOUSE_MANAGER' && currentUser?.assignedWarehouseId && currentUser.assignedWarehouseId !== 'ALL') {
      if (order.warehouseId && order.warehouseId !== currentUser.assignedWarehouseId) return false;
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

  const paginatedOrders = visibleOrders.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Group orders into Consolidated Society Delivery Lots (Scoped by Society, Delivery Date & Delivery Slot)
  const societyLotsMap = {};
  visibleOrders.forEach(order => {
    // Only include orders in the run (not cancelled)
    if (order.status === 'CANCELLED') return;
    const socName = order.societyName || 'Society Hub';
    const delivDate = order.deliveryDate || 'Morning Run';
    const delivSlot = order.deliverySlot || 'Morning Fresh Slot';
    const lotKey = `${socName}__${delivDate}__${delivSlot}`;

    if (!societyLotsMap[lotKey]) {
      societyLotsMap[lotKey] = {
        lotKey,
        lotId: null,
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
    const allDelivered = lot.orders.every(o => o.status === 'DELIVERED');
    const allOut = lot.orders.every(o => o.status === 'OUT_FOR_DELIVERY' || o.status === 'DELIVERED');
    const allPacked = lot.orders.every(o => o.status === 'PACKED' || o.status === 'OUT_FOR_DELIVERY' || o.status === 'DELIVERED');

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

  // Open Handover Modal
  const handleOpenHandover = (lot) => {
    setHandoverLot(lot);
  };

  // Submit Handover to Delivery Partner
  const handleConfirmHandover = async (e) => {
    e.preventDefault();
    if (!handoverLot) return;

    try {
      await Promise.all(handoverLot.orders.map(o => orderService.updateStatus(o.id, {
        status: 'OUT_FOR_DELIVERY',
        deliveryPartnerId: driverId || (deliveryRiders.find(r => r.name === driverName || r.phone === driverPhone)?.id) || 'FRZ_EMP_105',
        deliveryPartnerName: driverName,
        deliveryPartnerPhone: driverPhone,
        vehicleNumber: vehicleNumber
      })));
    } catch (err) {
      console.error('Backend dispatch status update failed:', err);
      showToast(`Failed to dispatch orders on server: ${err?.message || 'Server error'}`, 'error');
      return;
    }

    saveFreshiozStore(prev => {
      const targetOrderIds = new Set(handoverLot.orders.map(o => o.id));
      const sharedLotUuid = handoverLot.orders.find(o => o.deliveryLotUuid)?.deliveryLotUuid || generateUUID();
      const updatedOrders = (prev.orders || []).map(o => {
        if (targetOrderIds.has(o.id)) {
          return {
            ...o,
            status: 'OUT_FOR_DELIVERY',
            deliveryLotId: handoverLot.lotId,
            deliveryLotUuid: sharedLotUuid,
            deliveryPartnerId: driverId || (deliveryRiders.find(r => r.name === driverName || r.phone === driverPhone)?.id) || 'FRZ_EMP_105',
            deliveryPartnerName: driverName,
            deliveryPartnerPhone: driverPhone,
            vehicleType: vehicleType,
            vehicleNumber: vehicleNumber,
            dispatchedAt: new Date().toISOString(),
            dispatchedBy: currentUser?.name || 'Warehouse Dispatch Lead',
            dispatchedById: currentUser?.id || 'emp-lead'
          };
        }
        return o;
      });

      return {
        ...prev,
        orders: updatedOrders
      };
    });

    showToast(`✓ Lot #${handoverLot.lotId} dispatched to driver ${driverName} (${vehicleNumber}) on server!`, 'success');
    setHandoverLot(null);
  };

  // Mark lot delivered at society drop desk with unified commission crediting
  const handleMarkLotDelivered = async (lot) => {
    try {
      await Promise.all(lot.orders.map(o => orderService.updateStatus(o.id, {
        status: 'DELIVERED'
      })));
    } catch (err) {
      console.error('Backend delivery confirmation failed:', err);
      showToast(`Failed to mark orders delivered on server: ${err?.message || 'Server error'}`, 'error');
      return;
    }

    saveFreshiozStore(prev => {
      const targetOrderIds = new Set(lot.orders.map(o => o.id));
      let newlyDeliveredCount = 0;
      let batchCommissionAccrued = 0;

      const updatedOrders = (prev.orders || []).map(o => {
        if (targetOrderIds.has(o.id)) {
          if (o.status !== 'DELIVERED') {
            newlyDeliveredCount++;
            batchCommissionAccrued += Number(o.societyCommissionEarned || 0);
          }
          return {
            ...o,
            status: 'DELIVERED',
            deliveredAt: new Date().toISOString(),
            deliveredConfirmedBy: currentUser?.name || 'Delivery Rider',
            deliveredConfirmedById: currentUser?.id || 'emp-rider'
          };
        }
        return o;
      });

      // Credit commission to the society wallet!
      const updatedSocieties = (newlyDeliveredCount > 0) ? (prev.societies || []).map(s => {
        if (s.name === lot.societyName || s.id === lot.societyId) {
          return {
            ...s,
            balanceEarned: Number(((s.balanceEarned || 0) + batchCommissionAccrued).toFixed(2)),
            totalOrdersDelivered: (s.totalOrdersDelivered || 0) + newlyDeliveredCount
          };
        }
        return s;
      }) : (prev.societies || []);

      return {
        ...prev,
        societies: updatedSocieties,
        orders: updatedOrders
      };
    });

    showToast(`✓ All orders in Lot #${lot.lotId} marked Delivered on server! Commission credited.`, 'success');
  };

  const toPackCount = orders.filter(o => o.status === 'CONFIRMED' || o.status === 'PROCURING').length;
  const packedCount = orders.filter(o => o.status === 'PACKED').length;
  const outCount = orders.filter(o => o.status === 'OUT_FOR_DELIVERY').length;

  return (
    <div className="admin-page-container">
      {/* Page Header */}
      <div className="page-title-header" style={{ marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Warehouse Packing Desk & Society Lot Dispatch
            </h1>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>
              Weigh customer retail bags, apply flat address labels, group into One Society Lot, and assign to Delivery Partner
            </p>
          </div>

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11.5px', background: '#FEF3C7', color: '#B45309', padding: '3px 10px', borderRadius: '6px', fontWeight: 700 }}>
              To Pack: {toPackCount} Orders
            </span>
            <span style={{ fontSize: '11.5px', background: '#E0F2FE', color: '#0369A1', padding: '3px 10px', borderRadius: '6px', fontWeight: 700 }}>
              Packed & Labeled: {packedCount}
            </span>
            <span style={{ fontSize: '11.5px', background: '#DCFCE7', color: '#15803D', padding: '3px 10px', borderRadius: '6px', fontWeight: 700 }}>
              In-Transit: {outCount}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Switcher: Packing Station vs Society Lots & Slot Pills */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '2px solid #E2E8F0', paddingBottom: '2px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => handleTabChange('PACKING_STATION')}
            style={{
              padding: '8px 18px',
              fontSize: '13px',
              fontWeight: 700,
              borderRadius: '8px 8px 0 0',
              border: 'none',
              background: activeTab === 'PACKING_STATION' ? '#234B3C' : 'transparent',
              color: activeTab === 'PACKING_STATION' ? '#FFFFFF' : '#64748B',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Tag size={15} />
            <span>1. Packing Station (Address & Flat Labeling)</span>
            {toPackCount > 0 && (
              <span style={{ background: '#FEF3C7', color: '#B45309', fontSize: '11px', padding: '1px 6px', borderRadius: '9999px', fontWeight: 800 }}>
                {toPackCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('SOCIETY_LOTS')}
            style={{
              padding: '8px 18px',
              fontSize: '13px',
              fontWeight: 700,
              borderRadius: '8px 8px 0 0',
              border: 'none',
              background: activeTab === 'SOCIETY_LOTS' ? '#234B3C' : 'transparent',
              color: activeTab === 'SOCIETY_LOTS' ? '#FFFFFF' : '#64748B',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Layers size={15} />
            <span>2. Society Delivery Lots & Driver Handover ({societyLots.length})</span>
          </button>
        </div>

        {/* Slot Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>Run:</span>
          <button
            type="button"
            onClick={() => setSlotFilter('ALL')}
            style={{
              padding: '3px 8px',
              fontSize: '11px',
              borderRadius: '4px',
              border: '1px solid',
              borderColor: slotFilter === 'ALL' ? '#234B3C' : '#CBD5E1',
              background: slotFilter === 'ALL' ? '#234B3C' : '#FFF',
              color: slotFilter === 'ALL' ? '#FFF' : '#475569',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            All Runs
          </button>
          <button
            type="button"
            onClick={() => setSlotFilter('Morning')}
            style={{
              padding: '3px 8px',
              fontSize: '11px',
              borderRadius: '4px',
              border: '1px solid',
              borderColor: slotFilter === 'Morning' ? '#0284C7' : '#CBD5E1',
              background: slotFilter === 'Morning' ? '#0284C7' : '#FFF',
              color: slotFilter === 'Morning' ? '#FFF' : '#475569',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            🌅 Morning Run
          </button>
          <button
            type="button"
            onClick={() => setSlotFilter('Evening')}
            style={{
              padding: '3px 8px',
              fontSize: '11px',
              borderRadius: '4px',
              border: '1px solid',
              borderColor: slotFilter === 'Evening' ? '#F59E0B' : '#CBD5E1',
              background: slotFilter === 'Evening' ? '#F59E0B' : '#FFF',
              color: slotFilter === 'Evening' ? '#FFF' : '#475569',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            🌇 Evening Run
          </button>
        </div>
      </div>

      {/* VIEW 1: PACKING STATION (INDIVIDUAL FLAT ADDRESS LABELS) */}
      {activeTab === 'PACKING_STATION' && (
        <div className="admin-table-card">
          <div className="admin-table-header">
            <div>
              <h3 style={{ fontSize: '15px', color: '#0F172A', margin: 0 }}>
                Individual Customer Orders to Pack & Label
              </h3>
              <span style={{ fontSize: '12px', color: '#64748B' }}>
                Weigh produce, pack into consumer bags, and stick society flat address tag
              </span>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Delivery Address & Flat Tag</th>
                  <th>Customer Contact</th>
                  <th>Items to Pack</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Packing Action</th>
                </tr>
              </thead>
              <tbody>
                {visibleOrders.length === 0 ? (
                  <tr>
                    <td colSpan="6">
                      <div className="admin-empty-state">
                        <div className="admin-empty-state-icon">
                          <PackageCheck size={22} />
                        </div>
                        <div className="admin-empty-state-title">No Orders in Packing Queue</div>
                        <div className="admin-empty-state-desc">
                          Confirmed customer orders will appear here for dawn weighing and flat tagging.
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedOrders.map(order => (
                    <tr key={order.id}>
                      <td>
                        <strong style={{ fontFamily: 'monospace', color: '#0F172A', fontSize: '13px' }}>
                          #{order.id}
                        </strong>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>
                          {order.deliverySlot || 'Morning Fresh Slot'}
                        </div>
                      </td>

                      <td>
                        <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Building2 size={13} color="#0284C7" />
                          <span>{order.societyName}</span>
                        </div>
                        <span style={{
                          fontSize: '11.5px',
                          background: '#EBF2EE',
                          color: '#234B3C',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          display: 'inline-block',
                          marginTop: '3px',
                          border: '1px solid #C8DBD0'
                        }}>
                          📍 {order.flatNo}
                        </span>
                      </td>

                      <td>
                        <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#0F172A' }}>{order.userName}</div>
                        <div style={{ fontSize: '11.5px', color: '#64748B' }}>+91 {order.userPhone}</div>
                      </td>

                      <td>
                        <div style={{ fontSize: '12.5px', color: '#1E293B', maxWidth: '340px' }}>
                          {order.items.map((i, idx) => (
                            <span key={idx} style={{ display: 'inline-block', marginRight: '8px', marginBottom: '2px' }}>
                              • {i.name} <strong>({i.qty} * {i.unit})</strong>
                            </span>
                          ))}
                        </div>
                      </td>

                      <td>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '9999px',
                          background: order.status === 'PACKED' ? '#DCFCE7' : order.status === 'OUT_FOR_DELIVERY' ? '#FEF3C7' : '#F1F5F9',
                          color: order.status === 'PACKED' ? '#15803D' : order.status === 'OUT_FOR_DELIVERY' ? '#B45309' : '#475569'
                        }}>
                          {order.status === 'PACKED' ? '✓ Packed & Labeled' : order.status}
                        </span>
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          {order.status === 'CONFIRMED' || order.status === 'PROCURING' ? (
                            <button
                              type="button"
                              onClick={() => handleMarkPacked(order.id)}
                              className="admin-btn-accent"
                              style={{
                                fontSize: '11.5px',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
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
                                padding: '5px 10px',
                                borderRadius: '6px',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                color: '#334155',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                              title="Print / View Address Label"
                            >
                              <Printer size={12} />
                              <span>View Label</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <AdminPagination
            currentPage={currentPage}
            totalItems={visibleOrders.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
            itemLabel="orders to pack"
          />
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
                        One Consolidated Delivery Lot for {lot.orders.length} Resident Flats • Total: <strong>{lot.totalWeightKg} kg</strong> Produce
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
                            {o.items.map(it => `${it.name} (${it.qty} ${it.unit})`).join(', ')}
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
                          Assigned Driver: {lot.deliveryPartnerName} ({lot.vehicleNumber})
                        </div>
                        <div style={{ fontSize: '11px', color: '#B45309' }}>
                          Dispatched at {lot.dispatchedAt ? new Date(lot.dispatchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Dawn Dispatch'}
                        </div>
                      </div>
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
                      <button
                        type="button"
                        onClick={() => handleMarkLotDelivered(lot)}
                        style={{
                          background: '#059669',
                          color: '#FFFFFF',
                          border: 'none',
                          padding: '7px 16px',
                          borderRadius: '6px',
                          fontSize: '12.5px',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <CheckCircle2 size={14} />
                        <span>Mark Delivered at Society Drop Desk</span>
                      </button>
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
                  {deliveryRiders.length > 0 && (
                    <select
                      value={driverId}
                      onChange={(e) => {
                        const rider = deliveryRiders.find(r => r.id === e.target.value);
                        if (rider) {
                          setDriverId(rider.id);
                          setDriverName(rider.name);
                          setDriverPhone(rider.phone);
                        }
                      }}
                      style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '6px', border: '1.5px solid #CBD5E1', fontSize: '12.5px', marginBottom: '8px', background: '#F8FAFC' }}
                    >
                      <option value="">-- Choose Assigned Company Delivery Executive --</option>
                      {deliveryRiders.map(r => (
                        <option key={r.id} value={r.id}>
                          {r.name} • {r.phone} ({r.assignedLocationName || 'Citywide'})
                        </option>
                      ))}
                    </select>
                  )}
                  <input
                    type="text"
                    placeholder="or enter driver name..."
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '6px', border: '1.5px solid #CBD5E1', fontSize: '13px', fontWeight: 700 }}
                    required
                  />
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
                    style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '6px', border: '1.5px solid #CBD5E1', fontSize: '13px' }}
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
                  <strong>{handoverLot.orders.length} Flats</strong>
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
              const targetSoc = (store.societies || []).find(s => s.id === labelModalOrder.societyId || s.name === labelModalOrder.societyName);
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
                    <strong style={{ color: '#0F172A' }}>+91 {labelModalOrder.userPhone}</strong>
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
    </div>
  );
}
