import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ClipboardList, 
  Plus, 
  Truck, 
  CheckCircle2, 
  Clock, 
  Warehouse, 
  Filter, 
  Layers, 
  Package, 
  ArrowRight,
  FileText,
  AlertCircle,
  Database,
  Edit3,
  X
} from 'lucide-react';
import { useAdminRole } from '../context/AdminRoleContext';
import { useToast } from '../context/ToastContext';
import { saveFreshiozStore } from '../shared/freshiozStore';

// Robust helper to parse weights in kg from any packaging units (e.g. "25 kg Gunny Sack", "500g", "1 bunch (250g)", "20 bunches Harvesting Crate")
const parseUnitWeightInKg = (unitStr) => {
  if (!unitStr) return 1;
  const s = String(unitStr).toLowerCase().trim();

  // 1. Explicit Ton / Quintal
  const tonMatch = s.match(/(\d+(?:\.\d+)?)\s*ton/);
  if (tonMatch) return parseFloat(tonMatch[1]) * 1000;
  const quintalMatch = s.match(/(\d+(?:\.\d+)?)\s*q(?:uintal)?/);
  if (quintalMatch) return parseFloat(quintalMatch[1]) * 100;

  // 2. Explicit kg
  const kgMatch = s.match(/(\d+(?:\.\d+)?)\s*kg/);
  if (kgMatch) return parseFloat(kgMatch[1]);

  // 3. Explicit grams
  const gMatch = s.match(/(\d+(?:\.\d+)?)\s*g(?:rams?)?/);
  if (gMatch) return parseFloat(gMatch[1]) / 1000;

  // 4. Special produce package types (e.g., bunches, packs, trays)
  if (s.includes('bunch')) {
    const bunchCount = s.match(/(\d+)\s*bunch/);
    if (bunchCount) return parseFloat(bunchCount[1]) * 0.25; // 250g per bunch
    return 0.25;
  }

  if (s.includes('pack') || s.includes('tray')) {
    const packCount = s.match(/(\d+)\s*(?:pack|tray)/);
    if (packCount) return parseFloat(packCount[1]) * 0.5; // 500g per pack
    return 0.5;
  }

  return 1;
};
import AdminPagination from '../components/common/AdminPagination';

export default function ProcurementDemandPage() {
  const { store, currentUser } = useAdminRole();
  const { showToast } = useToast();
  const warehouses = store.warehouses || [];

  const initialWarehouse = (currentUser?.role === 'WAREHOUSE_MANAGER' && currentUser?.assignedWarehouseId && currentUser.assignedWarehouseId !== 'ALL')
    ? currentUser.assignedWarehouseId
    : 'ALL';

  // URL Hash synchronization (#pending vs #mandi)
  const getTabFromHash = () => {
    if (typeof window === 'undefined') return 'PENDING';
    const hash = (window.location.hash || '').toLowerCase();
    if (hash === '#mandi' || hash === '#procured') return 'PROCURED_TODAY';
    return 'PENDING';
  };

  const [selectedWarehouseId, setSelectedWarehouseId] = useState(initialWarehouse);
  const [selectedSlot, setSelectedSlot] = useState('ALL'); // 'ALL' | 'Morning Fresh Slot' | 'Evening Fresh Slot'
  const [selectedDate, setSelectedDate] = useState('ALL'); // 'ALL' | specific delivery date
  const [activeTab, setActiveTab] = useState(getTabFromHash); // 'PENDING' | 'PROCURED_TODAY'
  const [stockEditCrop, setStockEditCrop] = useState(null); // crop name or null
  const [stockEditWhId, setStockEditWhId] = useState(warehouses[0]?.id || '');
  const [stockInputVal, setStockInputVal] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  React.useEffect(() => {
    const handleHashChange = () => {
      setActiveTab(getTabFromHash());
    };
    window.addEventListener('hashchange', handleHashChange);
    if (!window.location.hash) {
      window.history.replaceState(null, '', '#pending');
    }
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    const targetHash = newTab === 'PROCURED_TODAY' ? '#mandi' : '#pending';
    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash;
    }
  };

  React.useEffect(() => {
    setCurrentPage(1);
  }, [selectedSlot, selectedWarehouseId, activeTab, selectedDate]);

  // Helper to query warehouse stock (single warehouse or summed citywide across all hubs)
  const getCropStockInWarehouse = (cropName) => {
    if (selectedWarehouseId !== 'ALL') {
      return Number(store.warehouseInventory?.[selectedWarehouseId]?.[cropName] || 0);
    }
    return (warehouses || []).reduce((sum, w) => {
      return sum + Number(store.warehouseInventory?.[w.id]?.[cropName] || 0);
    }, 0);
  };

  // Filter orders by warehouse
  const matchesWarehouse = (order) => {
    if (selectedWarehouseId === 'ALL') return true;
    const targetWh = warehouses.find(w => w.id === selectedWarehouseId);
    const whCode = targetWh?.code;
    if (order.warehouseId && order.warehouseId !== selectedWarehouseId) return false;
    if (order.warehouseCode && whCode && order.warehouseCode !== whCode) return false;
    return true;
  };

  // Discover all available delivery dates and slots from orders
  const allOrders = store.orders || [];
  const availableDeliveryDates = Array.from(new Set(allOrders.map(o => o.deliveryDate).filter(Boolean)));
  const availableSlots = ['Morning Fresh Slot', 'Evening Fresh Slot'];

  // Active customer orders that require fulfillment (not delivered or cancelled)
  const activeOrders = allOrders.filter(order => {
    if (order.status === 'CANCELLED' || order.status === 'DELIVERED') return false;
    if (!matchesWarehouse(order)) return false;
    if (selectedSlot !== 'ALL') {
      const orderSlot = order.deliverySlot || 'Morning Fresh Slot';
      if (!orderSlot.toLowerCase().includes(selectedSlot.toLowerCase())) return false;
    }
    if (selectedDate !== 'ALL' && order.deliveryDate !== selectedDate) return false;
    return true;
  });

  // Calculate gross customer demand by produce item
  const cropDemandMap = {};
  activeOrders.forEach(order => {
    (order.items || []).forEach(item => {
      const itemName = item.name || item.productName || 'Fresh Item';
      // Flexible product match (id, exact name, or partial match)
      const prod = (store.products || []).find(p => 
        (item.id && p.id === item.id) ||
        p.name.toLowerCase() === itemName.toLowerCase() ||
        p.name.toLowerCase().includes(itemName.toLowerCase()) ||
        itemName.toLowerCase().includes(p.name.toLowerCase())
      ) || {};

      const unit = item.unit || prod.retailUnit || 'kg';
      const qty = Number(item.qty || item.quantity) || 1;
      const weightPerUnitKg = parseUnitWeightInKg(unit);
      const itemTotalKg = Number((weightPerUnitKg * qty).toFixed(2));

      if (!cropDemandMap[itemName]) {
        cropDemandMap[itemName] = {
          name: itemName,
          category: prod.category || 'VEGETABLES',
          origin: prod.origin || 'APMC Mandi Auction Yard',
          grossDemandKg: 0,
          packages: {},
          benchmarkRate: prod.wholesalePrice 
            ? Math.round(prod.wholesalePrice / 20) 
            : Math.round((prod.retailPrice || 40) * 0.65),
          retailPrice: prod.retailPrice || 40,
          ordersCount: 0,
          orderIds: new Set(),
          societies: new Set(),
          slotBreakdown: { 'Morning Fresh Slot': 0, 'Evening Fresh Slot': 0 }
        };
      }

      cropDemandMap[itemName].grossDemandKg = Number((cropDemandMap[itemName].grossDemandKg + itemTotalKg).toFixed(2));
      cropDemandMap[itemName].packages[unit] = (cropDemandMap[itemName].packages[unit] || 0) + qty;
      cropDemandMap[itemName].ordersCount += 1;
      cropDemandMap[itemName].orderIds.add(order.id);
      if (order.societyName) cropDemandMap[itemName].societies.add(order.societyName);

      const isEvening = (order.deliverySlot || '').toLowerCase().includes('evening');
      const sKey = isEvening ? 'Evening Fresh Slot' : 'Morning Fresh Slot';
      cropDemandMap[itemName].slotBreakdown[sKey] = Number((cropDemandMap[itemName].slotBreakdown[sKey] + itemTotalKg).toFixed(2));
    });
  });

  // Calculate already procured quantities directly from matching store.procurementLogs
  const matchingProcurementLogs = (store.procurementLogs || []).filter(log => {
    if (selectedWarehouseId !== 'ALL' && log.destinationWarehouseId && log.destinationWarehouseId !== selectedWarehouseId) {
      return false;
    }
    if (selectedSlot !== 'ALL' && log.slot) {
      if (!log.slot.toLowerCase().includes(selectedSlot.toLowerCase())) return false;
    }
    if (selectedDate !== 'ALL' && log.deliveryDate) {
      if (log.deliveryDate !== selectedDate) return false;
    }
    return true;
  });

  const alreadyProcuredMap = {};
  matchingProcurementLogs.forEach(log => {
    (log.items || []).forEach(it => {
      const cropName = it.name;
      if (!cropName) return;
      const unitWeight = parseUnitWeightInKg(it.unit);
      let numQty = 0;
      if (typeof it.qty === 'string') {
        const match = it.qty.match(/(\d+(?:\.\d+)?)/);
        numQty = match ? parseFloat(match[1]) : 0;
      } else {
        numQty = Number(it.qty) || 0;
      }
      const itemKg = Number((unitWeight * numQty).toFixed(2));
      
      const matchedKey = Object.keys(cropDemandMap).find(k => 
        k.toLowerCase() === cropName.toLowerCase() ||
        k.toLowerCase().includes(cropName.toLowerCase()) ||
        cropName.toLowerCase().includes(k.toLowerCase())
      ) || cropName;

      alreadyProcuredMap[matchedKey] = Number(((alreadyProcuredMap[matchedKey] || 0) + itemKg).toFixed(2));
    });
  });

  // Combine into complete Demand Sheet with Rigorous Inventory Reconciliation:
  // Gross Customer Demand minus Total Available Supply (Warehouse Buffer Stock + Mandi Procured Today) = Net Mandi Remaining
  const allDemandItems = Object.values(cropDemandMap).map(d => {
    const rawStockKg = getCropStockInWarehouse(d.name);
    const alreadyProcuredKg = Number(alreadyProcuredMap[d.name] || 0);

    // Opening / Reserve stock in warehouse prior to today's Mandi purchase
    // (If warehouse inventory was already incremented upon logging the procurement bill, opening buffer is rawStock - alreadyProcured)
    const openingStockKg = Math.max(0, Number((rawStockKg - alreadyProcuredKg).toFixed(2)));

    // Total available supply to cover customer demand
    const totalSupplyCoveredKg = Number((openingStockKg + alreadyProcuredKg).toFixed(2));

    // Net Mandi Requirement: What is still missing and must be purchased at APMC Mandi
    const netRequiredKg = Math.max(0, Number((d.grossDemandKg - totalSupplyCoveredKg).toFixed(2)));
    const estSpend = Math.round(netRequiredKg * d.benchmarkRate);
    const isFullyCovered = netRequiredKg === 0;

    return {
      ...d,
      rawStockKg,
      openingStockKg,
      alreadyProcuredKg,
      totalSupplyCoveredKg,
      netRequiredKg,
      isFullyCovered,
      estSpend,
      societiesList: Array.from(d.societies),
      orderIdsList: Array.from(d.orderIds)
    };
  });

  // Pending items that still have net required > 0
  const pendingDemandList = allDemandItems.filter(d => !d.isFullyCovered);
  const fullyProcuredItems = allDemandItems.filter(d => d.isFullyCovered);

  // Overall KPIs
  const totalGrossDemandKg = Number(allDemandItems.reduce((acc, d) => acc + d.grossDemandKg, 0).toFixed(2));
  const totalOpeningStockKg = Number(allDemandItems.reduce((acc, d) => acc + d.openingStockKg, 0).toFixed(2));
  const totalAlreadyProcuredKg = Number(allDemandItems.reduce((acc, d) => acc + d.alreadyProcuredKg, 0).toFixed(2));
  const totalCoveredKg = Number((totalOpeningStockKg + totalAlreadyProcuredKg).toFixed(2));
  const totalNetRequiredKg = Number(allDemandItems.reduce((acc, d) => acc + d.netRequiredKg, 0).toFixed(2));
  const totalPendingEstimatedCost = pendingDemandList.reduce((acc, d) => acc + d.estSpend, 0);

  // Slot-specific gross demand totals for quick toggle pills
  const morningGrossKg = Number(allOrders.filter(o => 
    !['CANCELLED', 'DELIVERED'].includes(o.status) && 
    matchesWarehouse(o) && 
    (o.deliverySlot || 'Morning Fresh Slot').includes('Morning')
  ).reduce((sum, o) => {
    return sum + (o.items || []).reduce((iSum, it) => iSum + (parseUnitWeightInKg(it.unit) * (Number(it.qty) || 1)), 0);
  }, 0).toFixed(2));

  const eveningGrossKg = Number(allOrders.filter(o => 
    !['CANCELLED', 'DELIVERED'].includes(o.status) && 
    matchesWarehouse(o) && 
    (o.deliverySlot || '').includes('Evening')
  ).reduce((sum, o) => {
    return sum + (o.items || []).reduce((iSum, it) => iSum + (parseUnitWeightInKg(it.unit) * (Number(it.qty) || 1)), 0);
  }, 0).toFixed(2));

  // Procured produce breakdown for TAB 2 (Already Procured Today)
  const procuredLogs = matchingProcurementLogs;
  const totalProcuredSpend = procuredLogs.reduce((acc, l) => acc + (l.totalAmountPaid || 0), 0);
  const totalProcuredKg = procuredLogs.reduce((acc, l) => acc + (l.totalWeightKg || 0), 0);

  // Group procured produce across logs
  const procuredProduceMap = {};
  procuredLogs.forEach(log => {
    (log.items || []).forEach(it => {
      const name = it.name || 'Produce Item';
      if (!procuredProduceMap[name]) {
        procuredProduceMap[name] = {
          name,
          category: 'FARM_PRODUCE',
          origin: log.mandiName || 'APMC Mandi',
          totalWeightKg: 0,
          totalSpend: 0,
          packages: {},
          mandiBillNumbers: new Set(),
          vendors: new Set(),
          societies: new Set(log.contributingSocieties || []),
          ordersCount: (log.fulfilledOrderIds || []).length
        };
      }
      const unitWeight = parseUnitWeightInKg(it.unit);
      let numQty = 0;
      if (typeof it.qty === 'string') {
        const match = it.qty.match(/(\d+(?:\.\d+)?)/);
        numQty = match ? parseFloat(match[1]) : 0;
      } else {
        numQty = Number(it.qty) || 0;
      }
      const itemKg = Number((unitWeight * numQty).toFixed(2));
      procuredProduceMap[name].totalWeightKg = Number((procuredProduceMap[name].totalWeightKg + itemKg).toFixed(2));
      procuredProduceMap[name].totalSpend += Number(it.total) || 0;
      if (log.billNumber) procuredProduceMap[name].mandiBillNumbers.add(log.billNumber);
      if (log.vendorName) procuredProduceMap[name].vendors.add(log.vendorName);
    });
  });

  const procuredProduceList = Object.values(procuredProduceMap);

  // Contributing Societies for Open Orders
  const contributingSocieties = Array.from(new Set(activeOrders.map(o => o.societyName || 'Prestige Falcon City')));

  // Save updated stock count
  const handleSaveStock = (e) => {
    e.preventDefault();
    const targetWhId = (selectedWarehouseId !== 'ALL') ? selectedWarehouseId : (stockEditWhId || warehouses[0]?.id || '');
    if (!targetWhId) return;
    const newQty = Math.max(0, parseFloat(stockInputVal) || 0);

    saveFreshiozStore(prev => {
      const currentInventory = prev.warehouseInventory || {};
      const whInv = currentInventory[targetWhId] || {};
      return {
        ...prev,
        warehouseInventory: {
          ...currentInventory,
          [targetWhId]: {
            ...whInv,
            [stockEditCrop]: newQty
          }
        }
      };
    });

    const targetWhName = warehouses.find(w => w.id === targetWhId)?.name || targetWhId;
    showToast(`Updated ${stockEditCrop} in-stock inventory for ${targetWhName} to ${newQty} kg.`, 'success');
    setStockEditCrop(null);
  };

  return (
    <div className="admin-page-container">
      {/* Compact Page Title & Live Notice */}
      <div className="page-title-header" style={{ marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Dawn Mandi Aggregated Procurement Demand
            </h1>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>
              Consolidated customer orders across delivery runs minus existing stock & APMC purchases = Net Mandi Remaining
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {totalNetRequiredKg > 0 ? (
              <span style={{ fontSize: '11.5px', background: '#FEF3C7', color: '#B45309', padding: '3px 10px', borderRadius: '6px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <AlertCircle size={13} />
                <span>{pendingDemandList.length} Crops Pending Purchase (Net: {totalNetRequiredKg} kg)</span>
              </span>
            ) : totalGrossDemandKg > 0 ? (
              <span style={{ fontSize: '11.5px', background: '#DCFCE7', color: '#15803D', padding: '3px 10px', borderRadius: '6px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={13} />
                <span>All Orders Procured ({procuredLogs.length} Bills • {totalProcuredKg} kg in transit)</span>
              </span>
            ) : (
              <span style={{ fontSize: '11.5px', background: '#F1F5F9', color: '#64748B', padding: '3px 10px', borderRadius: '6px', fontWeight: 700 }}>
                No Active Customer Orders
              </span>
            )}
          </div>
        </div>

        {/* Consolidated Mandi Purchase Action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {totalNetRequiredKg > 0 ? (
            <Link
              to={`/procurement-entry?warehouseId=${selectedWarehouseId}&slot=${selectedSlot}&date=${selectedDate}`}
              className="admin-btn-accent"
              style={{ fontSize: '13px', padding: '8px 16px', borderRadius: '8px', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '7px', textDecoration: 'none' }}
            >
              <Plus size={16} />
              <span>Log Consolidated Mandi Bill (Net: {totalNetRequiredKg} kg)</span>
            </Link>
          ) : (
            <Link
              to={`/procurement-entry?warehouseId=${selectedWarehouseId}&mode=buffer`}
              className="admin-btn-secondary"
              style={{ fontSize: '12.5px', padding: '7px 14px', borderRadius: '8px', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '6px', border: '1.5px solid #CBD5E1', color: '#334155', textDecoration: 'none' }}
            >
              <Plus size={15} />
              <span>+ Log Extra / Buffer Lot</span>
            </Link>
          )}
        </div>
      </div>

      {/* Warehouse & Dispatch Slot Filter Strip */}
      <div style={{
        background: '#FFFFFF',
        border: '1.5px solid #E2E8F0',
        borderRadius: '12px',
        padding: '12px 16px',
        marginBottom: '14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        {/* Row 1: Filters (Hub, Date, Slot pills) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            {/* Hub Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Warehouse size={16} color="#0284C7" />
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>Logistics Hub:</label>
              <select
                value={selectedWarehouseId}
                onChange={(e) => setSelectedWarehouseId(e.target.value)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#0F172A',
                  background: '#F8FAFC'
                }}
              >
                <option value="ALL">All Hubs (Citywide Aggregated)</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.code} — {w.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Delivery Date Filter */}
            {availableDeliveryDates.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>Delivery Date:</span>
                <select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#0F172A',
                    background: '#F8FAFC'
                  }}
                >
                  <option value="ALL">All Delivery Dates</option>
                  {availableDeliveryDates.map(date => (
                    <option key={date} value={date}>{date}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Slot Toggle Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>Dispatch Slot:</span>
            <button
              type="button"
              onClick={() => setSelectedSlot('ALL')}
              style={{
                padding: '4px 10px',
                fontSize: '11.5px',
                fontWeight: 700,
                borderRadius: '6px',
                border: '1px solid',
                borderColor: selectedSlot === 'ALL' ? '#234B3C' : '#E2E8F0',
                background: selectedSlot === 'ALL' ? '#234B3C' : '#FFFFFF',
                color: selectedSlot === 'ALL' ? '#FFFFFF' : '#475569',
                cursor: 'pointer'
              }}
            >
              All Slots ({totalGrossDemandKg} kg)
            </button>
            <button
              type="button"
              onClick={() => setSelectedSlot('Morning Fresh Slot')}
              style={{
                padding: '4px 10px',
                fontSize: '11.5px',
                fontWeight: 700,
                borderRadius: '6px',
                border: '1px solid',
                borderColor: selectedSlot === 'Morning Fresh Slot' ? '#0284C7' : '#E2E8F0',
                background: selectedSlot === 'Morning Fresh Slot' ? '#0284C7' : '#FFFFFF',
                color: selectedSlot === 'Morning Fresh Slot' ? '#FFFFFF' : '#475569',
                cursor: 'pointer'
              }}
            >
              🌅 Morning Run (06:30 AM • {morningGrossKg} kg)
            </button>
            <button
              type="button"
              onClick={() => setSelectedSlot('Evening Fresh Slot')}
              style={{
                padding: '4px 10px',
                fontSize: '11.5px',
                fontWeight: 700,
                borderRadius: '6px',
                border: '1px solid',
                borderColor: selectedSlot === 'Evening Fresh Slot' ? '#F59E0B' : '#E2E8F0',
                background: selectedSlot === 'Evening Fresh Slot' ? '#F59E0B' : '#FFFFFF',
                color: selectedSlot === 'Evening Fresh Slot' ? '#FFFFFF' : '#475569',
                cursor: 'pointer'
              }}
            >
              🌇 Evening Run (05:00 PM • {eveningGrossKg} kg)
            </button>
          </div>
        </div>

        {/* Row 2: Live Stock & Procurement KPIs */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '12px',
          background: '#F8FAFC',
          borderRadius: '8px',
          padding: '10px 14px',
          border: '1px solid #E2E8F0'
        }}>
          <div>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>1. Gross Demand</div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>{totalGrossDemandKg} kg</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#0284C7', fontWeight: 600 }}>2. Warehouse Stock</div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#0284C7' }}>{totalOpeningStockKg} kg</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#15803D', fontWeight: 600 }}>3. Procured Today</div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#15803D' }}>{totalAlreadyProcuredKg} kg</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#475569', fontWeight: 600 }}>Total Covered (2+3)</div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#334155' }}>{totalCoveredKg} kg</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: totalNetRequiredKg > 0 ? '#B45309' : '#059669', fontWeight: 700 }}>
              4. Net Mandi to Buy
            </div>
            <div style={{ fontSize: '16px', fontWeight: 900, color: totalNetRequiredKg > 0 ? '#B45309' : '#059669' }}>
              {totalNetRequiredKg} kg
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Est. Remaining Spend</div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#234B3C' }}>₹{totalPendingEstimatedCost.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation: Pending vs Already Procured */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', borderBottom: '2px solid #E2E8F0', paddingBottom: '2px' }}>
        <button
          type="button"
          onClick={() => handleTabChange('PENDING')}
          style={{
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 700,
            borderRadius: '8px 8px 0 0',
            border: 'none',
            background: activeTab === 'PENDING' ? '#234B3C' : 'transparent',
            color: activeTab === 'PENDING' ? '#FFFFFF' : '#64748B',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <ClipboardList size={15} />
          <span>Pending Mandi Auction Demand ({pendingDemandList.length} crops)</span>
          {totalNetRequiredKg > 0 && (
            <span style={{ background: '#FEF3C7', color: '#B45309', fontSize: '11px', padding: '1px 6px', borderRadius: '9999px', fontWeight: 800 }}>
              Net: {totalNetRequiredKg} kg
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('PROCURED_TODAY')}
          style={{
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 700,
            borderRadius: '8px 8px 0 0',
            border: 'none',
            background: activeTab === 'PROCURED_TODAY' ? '#234B3C' : 'transparent',
            color: activeTab === 'PROCURED_TODAY' ? '#FFFFFF' : '#64748B',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <CheckCircle2 size={15} />
          <span>Mandi Bills & Lots Logged ({procuredLogs.length} bills)</span>
          <span style={{ background: '#DCFCE7', color: '#15803D', fontSize: '11px', padding: '1px 6px', borderRadius: '9999px', fontWeight: 800 }}>
            {totalProcuredKg} kg
          </span>
        </button>
      </div>

      {/* TAB 1: PENDING DEMAND WITH NET STOCK CALCULATION */}
      {activeTab === 'PENDING' && (
        <>
          {totalNetRequiredKg === 0 && totalGrossDemandKg > 0 ? (
            /* Celebratory Zero-Pending Card to Prevent Double Buying */
            <div style={{
              background: '#FFFFFF',
              border: '2px solid #A7F3D0',
              borderRadius: '12px',
              padding: '28px 24px',
              textAlign: 'center',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
              marginBottom: '16px'
            }}>
              <div style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                background: '#DCFCE7',
                color: '#15803D',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '12px'
              }}>
                <CheckCircle2 size={32} />
              </div>

              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#065F46', margin: '0 0 6px' }}>
                All Customer Orders Successfully Procured!
              </h2>
              <p style={{ fontSize: '13px', color: '#4B5563', maxWidth: '600px', margin: '0 auto 18px', lineHeight: 1.5 }}>
                There is <strong>0 kg pending auction demand</strong>. All confirmed customer orders across morning and evening delivery runs have been covered by warehouse stock and Mandi purchases.
              </p>

              {/* Summary Stats Grid */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '20px',
                flexWrap: 'wrap',
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
                padding: '12px 20px',
                maxWidth: '680px',
                margin: '0 auto 20px'
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>Total Produce Procured</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#234B3C' }}>{totalProcuredKg} kg</div>
                </div>
                <div style={{ borderLeft: '1px solid #CBD5E1', paddingLeft: '20px' }}>
                  <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>Mandi Bills Committed</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>{procuredLogs.length} Bills</div>
                </div>
                <div style={{ borderLeft: '1px solid #CBD5E1', paddingLeft: '20px' }}>
                  <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>Total Mandi Spend</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#0284C7' }}>₹{totalProcuredSpend.toLocaleString()}</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <Link
                  to="/procurement-logs"
                  className="admin-btn-primary"
                  style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 18px', fontSize: '13px' }}
                >
                  <FileText size={15} />
                  <span>View Mandi Bills Audit Ledger</span>
                </Link>

                <Link
                  to="/warehouse-crating"
                  className="admin-btn-accent"
                  style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 18px', fontSize: '13px' }}
                >
                  <Package size={15} />
                  <span>Proceed to Warehouse Crating & Packing</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ) : totalGrossDemandKg === 0 ? (
            <div className="admin-empty-state" style={{ background: '#FFF', borderRadius: '12px', padding: '36px', border: '1px solid #E2E8F0' }}>
              <div className="admin-empty-state-icon">
                <ClipboardList size={28} />
              </div>
              <div className="admin-empty-state-title">No Active Customer Orders for this Selection</div>
              <div className="admin-empty-state-desc">
                Change the hub or dispatch slot filter above, or wait for customers to place orders before the 9:00 PM cutoff.
              </div>
            </div>
          ) : (
            /* Pending Demand Table with Gross -> In-Stock -> Net Breakdown */
            <div className="admin-table-card">
              <div className="admin-table-header">
                <div>
                  <h3 style={{ fontSize: '15px', color: '#0F172A', margin: 0 }}>
                    Consolidated APMC Mandi Net Buying Sheet
                  </h3>
                  <span style={{ fontSize: '12px', color: '#64748B' }}>
                    Gross Demand minus Available Warehouse Stock minus Mandi Procured Today = Net Mandi Remaining
                  </span>
                </div>
                <span style={{ fontSize: '12px', color: '#B45309', fontWeight: 700, background: '#FEF3C7', padding: '3px 10px', borderRadius: '6px' }}>
                  {pendingDemandList.length} Crops Remaining • Net to Buy: {totalNetRequiredKg} kg
                </span>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="admin-data-table">
                  <thead>
                    <tr>
                      <th>Crop / Produce Item</th>
                      <th>Gross Orders (kg)</th>
                      <th>Warehouse Stock (kg)</th>
                      <th>Procured Today (kg)</th>
                      <th>Total Covered (kg)</th>
                      <th>Net Mandi Requirement</th>
                      <th>Benchmark Rate</th>
                      <th>Est. Spend</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allDemandItems.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((d, idx) => (
                      <tr key={idx} style={{ background: d.isFullyCovered ? '#F8FAFC' : '#FFFFFF' }}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <strong style={{ fontSize: '14px', color: '#0F172A' }}>{d.name}</strong>
                            {d.isFullyCovered && (
                              <span style={{ fontSize: '10.5px', background: '#DCFCE7', color: '#15803D', fontWeight: 700, padding: '1px 6px', borderRadius: '4px' }}>
                                ✓ Fully Procured
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>Origin: {d.origin}</div>
                        </td>

                        <td>
                          <div>
                            <strong style={{ color: '#0F172A', fontSize: '14px' }}>
                              {d.grossDemandKg} kg
                            </strong>
                            {/* Slot breakdown tags */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '3px' }}>
                              {d.slotBreakdown['Morning Fresh Slot'] > 0 && (
                                <span style={{ fontSize: '10px', background: '#E0F2FE', color: '#0369A1', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                                  🌅 {d.slotBreakdown['Morning Fresh Slot']} kg Morning
                                </span>
                              )}
                              {d.slotBreakdown['Evening Fresh Slot'] > 0 && (
                                <span style={{ fontSize: '10px', background: '#FEF3C7', color: '#92400E', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                                  🌇 {d.slotBreakdown['Evening Fresh Slot']} kg Evening
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '13.5px', fontWeight: 700, color: d.openingStockKg > 0 ? '#0284C7' : '#94A3B8' }}>
                              {d.openingStockKg} kg
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setStockEditCrop(d.name);
                                setStockEditWhId(selectedWarehouseId !== 'ALL' ? selectedWarehouseId : (warehouses[0]?.id || ''));
                                setStockInputVal(String(d.rawStockKg || d.openingStockKg));
                              }}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: '2px' }}
                              title="Update in-stock warehouse inventory"
                            >
                              <Edit3 size={12} />
                            </button>
                          </div>
                        </td>

                        <td>
                          <span style={{ fontSize: '13.5px', fontWeight: 700, color: d.alreadyProcuredKg > 0 ? '#15803D' : '#94A3B8' }}>
                            {d.alreadyProcuredKg} kg
                          </span>
                        </td>

                        <td>
                          <span style={{ fontSize: '13.5px', fontWeight: 800, color: d.totalSupplyCoveredKg > 0 ? '#334155' : '#94A3B8' }}>
                            {d.totalSupplyCoveredKg} kg
                          </span>
                        </td>

                        <td>
                          <div>
                            <strong style={{ color: d.netRequiredKg > 0 ? '#B45309' : '#059669', fontSize: '15px' }}>
                              {d.netRequiredKg} kg
                            </strong>
                            <div style={{ fontSize: '10.5px', color: '#64748B' }}>
                              {d.netRequiredKg === 0 
                                ? `✓ ${d.totalSupplyCoveredKg} kg Covered` 
                                : `${d.grossDemandKg} kg - ${d.totalSupplyCoveredKg} kg covered`}
                            </div>
                          </div>
                        </td>

                        <td>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                            ₹{d.benchmarkRate} / kg
                          </span>
                        </td>

                        <td>
                          <strong style={{ color: '#0F172A', fontSize: '14px' }}>
                            ₹{d.estSpend.toLocaleString()}
                          </strong>
                        </td>

                        <td>
                          {d.netRequiredKg > 0 ? (
                            <Link
                              to={`/procurement-entry?crop=${encodeURIComponent(d.name)}&warehouseId=${selectedWarehouseId}&slot=${selectedSlot}&date=${selectedDate}`}
                              className="admin-btn-accent"
                              style={{ fontSize: '11.5px', padding: '4px 10px', borderRadius: '6px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              <Plus size={13} />
                              <span>Log Bill ({d.netRequiredKg} kg)</span>
                            </Link>
                          ) : (
                            <span style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: '9999px',
                              background: '#DCFCE7',
                              color: '#15803D',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <CheckCircle2 size={12} />
                              <span>Done</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <AdminPagination
                currentPage={currentPage}
                totalItems={allDemandItems.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
                itemLabel="crops"
              />
            </div>
          )}
        </>
      )}

      {/* TAB 2: ALREADY PROCURED TODAY */}
      {activeTab === 'PROCURED_TODAY' && (
        <div className="admin-table-card">
          <div className="admin-table-header">
            <div>
              <h3 style={{ fontSize: '15px', color: '#0F172A', margin: 0 }}>
                Procured Farm Lots (In-Transit to Warehouse)
              </h3>
              <span style={{ fontSize: '12px', color: '#64748B' }}>
                Produce purchased at Mandi auctions and currently being transported to central sorting hub
              </span>
            </div>
            <Link
              to="/procurement-logs"
              style={{ fontSize: '12px', color: '#234B3C', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <span>View Mandi Invoices Ledger</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>Produce Item</th>
                  <th>Category</th>
                  <th>Procured Weight</th>
                  <th>Serving Societies & Flats</th>
                  <th>Associated APMC Bill</th>
                  <th>Logistics Status</th>
                </tr>
              </thead>
              <tbody>
                {procuredProduceList.length === 0 ? (
                  <tr>
                    <td colSpan="6">
                      <div className="admin-empty-state">
                        <div className="admin-empty-state-icon">
                          <Truck size={22} />
                        </div>
                        <div className="admin-empty-state-title">No Farm Lots Procured Yet Today</div>
                        <div className="admin-empty-state-desc">
                          Once the procurement officer logs the consolidated APMC Mandi bill, verified lots will appear here.
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  procuredProduceList.map((p, idx) => (
                    <tr key={idx}>
                      <td>
                        <strong style={{ fontSize: '14px', color: '#0F172A' }}>{p.name}</strong>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>Origin: {p.origin}</div>
                      </td>
                      <td>
                        <span style={{ fontSize: '11px', background: '#F1F5F9', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, color: '#334155' }}>
                          {p.category}
                        </span>
                      </td>
                      <td>
                        <strong style={{ color: '#234B3C', fontSize: '15px' }}>
                          {p.totalWeightKg} kg
                        </strong>
                        {Object.keys(p.packages || {}).length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '4px' }}>
                            {Object.entries(p.packages).map(([pkg, count]) => (
                              <span key={pkg} style={{
                                fontSize: '11px',
                                background: '#EBF2EE',
                                color: '#234B3C',
                                padding: '2px 7px',
                                borderRadius: '4px',
                                fontWeight: 700,
                                border: '1px solid #C8DBD0'
                              }}>
                                {count} × {pkg}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#0F172A' }}>
                          {Array.from(p.societies).join(', ')}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>
                          Fulfilling {p.ordersCount} Customer Orders
                        </div>
                      </td>
                      <td>
                        {p.mandiBillNumbers.size > 0 ? (
                          Array.from(p.mandiBillNumbers).map(b => (
                            <span key={b} style={{ fontSize: '11.5px', fontFamily: 'monospace', fontWeight: 700, color: '#0F172A', background: '#F1F5F9', padding: '2px 6px', borderRadius: '4px', display: 'inline-block' }}>
                              #{b}
                            </span>
                          ))
                        ) : (
                          <span style={{ fontSize: '11.5px', color: '#94A3B8' }}>Consolidated Lot</span>
                        )}
                      </td>
                      <td>
                        <span style={{
                          fontSize: '11.5px',
                          fontWeight: 700,
                          padding: '3px 10px',
                          borderRadius: '9999px',
                          background: '#DCFCE7',
                          color: '#15803D',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <CheckCircle2 size={12} />
                          <span>Procured @ Mandi • In-Transit</span>
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* QUICK STOCK EDIT MODAL */}
      {stockEditCrop && (
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
          <div style={{ background: '#FFFFFF', borderRadius: '14px', maxWidth: '380px', width: '100%', padding: '20px', border: '1.5px solid #E2E8F0' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: '0 0 6px' }}>
              Update In-Stock {stockEditCrop}
            </h3>
            <p style={{ fontSize: '12.5px', color: '#64748B', margin: '0 0 14px' }}>
              Enter current physical stock in the warehouse. Net demand will recalculate automatically.
            </p>
            <form onSubmit={handleSaveStock}>
              {selectedWarehouseId === 'ALL' && (
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '4px', color: '#334155' }}>
                    Select Logistics Hub:
                  </label>
                  <select
                    value={stockEditWhId}
                    onChange={(e) => {
                      const newWhId = e.target.value;
                      setStockEditWhId(newWhId);
                      const currentVal = store.warehouseInventory?.[newWhId]?.[stockEditCrop] || 0;
                      setStockInputVal(String(currentVal));
                    }}
                    style={{ width: '100%', height: '36px', padding: '0 8px', borderRadius: '6px', border: '1.5px solid #CBD5E1', fontSize: '13px', fontWeight: 700, background: '#F8FAFC' }}
                  >
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.code} — {w.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '4px', color: '#334155' }}>
                  Available Physical Quantity in Warehouse (kg)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={stockInputVal}
                  onChange={(e) => setStockInputVal(e.target.value)}
                  style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '6px', border: '1.5px solid #CBD5E1', fontSize: '14px', fontWeight: 700 }}
                  required
                  autoFocus
                />
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setStockEditCrop(null)}
                  style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFF', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn-accent"
                  style={{ padding: '8px 16px', borderRadius: '6px', fontSize: '12.5px', fontWeight: 700 }}
                >
                  Save Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
