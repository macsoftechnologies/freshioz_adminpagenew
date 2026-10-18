import React, { useState, useMemo } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { 
  Truck, 
  MapPin, 
  FileText, 
  DollarSign, 
  Camera, 
  CheckCircle2, 
  Send,
  Building2,
  Store,
  Layers,
  AlertTriangle,
  X,
  Plus,
  Trash2,
  ArrowLeft,
  Info,
  Package,
  Users,
  Eye,
  CreditCard,
  Copy
} from 'lucide-react';
import { useAdminRole } from '../context/AdminRoleContext';
import { useToast } from '../context/ToastContext';
import { warehouses as warehouseResource, vendors as vendorResource, products as productResource, orders as orderResource, procurement as procurementResource, useInventory } from '../hooks/resources';

// Robust helper to parse weights in kg from packaging units
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

export default function ProcurementEntryPage() {
  const { currentUser } = useAdminRole();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { data: rawWarehouses = [] } = warehouseResource.useList();
  const { data: rawVendors = [] } = vendorResource.useList();
  const { data: rawProducts = [] } = productResource.useList();
  const { data: rawOrders = [] } = orderResource.useList();
  const { data: rawProcLogs = [] } = procurementResource.useList();

  const warehouses = Array.isArray(rawWarehouses) ? rawWarehouses : [];
  const vendors = Array.isArray(rawVendors) ? rawVendors : [];
  const products = Array.isArray(rawProducts) ? rawProducts : [];
  const orders = Array.isArray(rawOrders) ? rawOrders : [];
  const procurementLogs = Array.isArray(rawProcLogs) ? rawProcLogs : [];

  const createProcurementMutation = procurementResource.useCreate();

  const queryWarehouseId = searchParams.get('warehouseId');
  const querySlot = searchParams.get('slot') || 'ALL';
  const queryDate = searchParams.get('date') || 'ALL';
  const queryCrop = searchParams.get('crop');

  const selectedWh = (warehouses || []).find(w => w.id === queryWarehouseId) || warehouses[0];
  const activeWhId = selectedWh?.id || warehouses[0]?.id || '';

  const { data: rawInventory = [] } = useInventory(activeWhId);
  const warehouseStock = useMemo(() => {
    const stockMap = {};
    if (Array.isArray(rawInventory)) {
      rawInventory.forEach(item => {
        const name = item.productName || item.product?.name || item.name;
        if (name) stockMap[name] = item.quantity ?? item.stockQty ?? 0;
      });
    } else if (rawInventory && typeof rawInventory === 'object') {
      return rawInventory;
    }
    return stockMap;
  }, [rawInventory]);

  // Active customer orders that require Mandi fulfillment
  const unprocuredOrders = orders.filter(o => {
    if (['CANCELLED', 'DELIVERED'].includes(o.status)) return false;
    if (queryWarehouseId && queryWarehouseId !== 'ALL') {
      if (o.warehouseId && o.warehouseId !== queryWarehouseId) return false;
    }
    if (querySlot !== 'ALL') {
      const orderSlot = o.deliverySlot || 'Morning Fresh Slot';
      if (!orderSlot.toLowerCase().includes(querySlot.toLowerCase())) return false;
    }
    if (queryDate !== 'ALL' && o.deliveryDate !== queryDate) return false;
    return true;
  });

  // Contributing Societies & Customer Breakdown for pending demand
  const contributingSocietiesList = Array.from(new Set(unprocuredOrders.map(o => o.societyName || 'Prestige Falcon City')));
  const contributingResidentsList = unprocuredOrders.map(o => ({
    orderId: o.id,
    name: o.userName,
    phone: o.userPhone,
    flatNo: o.flatNo,
    societyName: o.societyName
  }));

  // Auto-aggregate unprocured orders into consolidated demand
  const aggregatedDemandMap = {};
  unprocuredOrders.forEach(order => {
    (order.items || []).forEach(item => {
      const itemName = item.name || item.productName || 'Fresh Item';
      const prod = products.find(p => 
        (item.id && p.id === item.id) ||
        p.name.toLowerCase() === itemName.toLowerCase() ||
        p.name.toLowerCase().includes(itemName.toLowerCase()) ||
        itemName.toLowerCase().includes(p.name.toLowerCase())
      ) || {};
      const unit = item.unit || prod.retailUnit || 'kg';
      const qty = Number(item.qty || item.quantity) || 1;
      const weightKg = parseUnitWeightInKg(unit) * qty;

      if (!aggregatedDemandMap[itemName]) {
        const benchmarkRate = prod.wholesalePrice 
          ? Math.round(prod.wholesalePrice / 20) 
          : Math.round((prod.retailPrice || 40) * 0.65);

        aggregatedDemandMap[itemName] = {
          name: itemName,
          unit: 'kg',
          grossQty: 0,
          rate: benchmarkRate
        };
      }
      aggregatedDemandMap[itemName].grossQty += weightKg;
    });
  });

  // Calculate what has ALREADY been procured across bills today for this run
  const matchingProcLogs = procurementLogs.filter(log => {
    if (queryWarehouseId && queryWarehouseId !== 'ALL' && log.destinationWarehouseId && log.destinationWarehouseId !== queryWarehouseId) {
      return false;
    }
    if (querySlot !== 'ALL' && log.slot) {
      if (!log.slot.toLowerCase().includes(querySlot.toLowerCase())) return false;
    }
    if (queryDate !== 'ALL' && log.deliveryDate) {
      if (log.deliveryDate !== queryDate) return false;
    }
    return true;
  });

  const alreadyProcuredMap = {};
  matchingProcLogs.forEach(log => {
    (log.items || []).forEach(it => {
      if (it.name) {
        const unitWeight = parseUnitWeightInKg(it.unit);
        let numQty = 0;
        if (typeof it.qty === 'string') {
          const match = it.qty.match(/(\d+(?:\.\d+)?)/);
          numQty = match ? parseFloat(match[1]) : 0;
        } else {
          numQty = Number(it.qty) || 0;
        }
        const itemKg = Number((unitWeight * numQty).toFixed(2));
        alreadyProcuredMap[it.name] = (alreadyProcuredMap[it.name] || 0) + itemKg;
      }
    });
  });

  // Calculate net quantities needed with opening stock & already procured reconciliation
  const unprocuredItemsList = Object.values(aggregatedDemandMap).map(item => {
    const rawStock = Number(warehouseStock[item.name] || 0);
    const alreadyBought = Number(alreadyProcuredMap[item.name] || 0);
    const openingStock = Math.max(0, Number((rawStock - alreadyBought).toFixed(2)));
    const totalCovered = Number((openingStock + alreadyBought).toFixed(2));
    const netQty = Math.max(0, Number((item.grossQty - totalCovered).toFixed(2)));
    return {
      name: item.name,
      qty: netQty,
      grossQty: item.grossQty,
      alreadyBought,
      openingStock,
      totalCovered,
      unit: 'kg',
      rate: item.rate,
      total: Math.round(netQty * item.rate)
    };
  });

  // Filter items to pre-fill
  let computedInitialItems = [];
  if (queryCrop) {
    const matched = unprocuredItemsList.find(i => i.name.toLowerCase() === queryCrop.toLowerCase());
    if (matched) {
      computedInitialItems = [matched];
    } else {
      const prod = products.find(p => p.name.toLowerCase() === queryCrop.toLowerCase()) || products[0];
      const rate = prod?.wholesalePrice ? Math.round(prod.wholesalePrice / 20) : 25;
      computedInitialItems = [{ name: prod?.name || queryCrop, qty: 10, unit: 'kg', rate, total: rate * 10 }];
    }
  } else {
    // Only pre-fill items that still have netQty > 0
    computedInitialItems = unprocuredItemsList.filter(i => i.qty > 0);
  }

  const initialItems = computedInitialItems;

  // Vendor selection state
  const [selectedVendorId, setSelectedVendorId] = useState(vendors[0]?.id || 'CUSTOM');
  const activeVendor = vendors.find(v => v.id === selectedVendorId);

  const [vendorName, setVendorName] = useState(activeVendor?.name || '');
  const [mandiLocation, setMandiLocation] = useState(activeVendor?.mandiLocation || '');
  const [destinationWarehouseId, setDestinationWarehouseId] = useState(selectedWh?.id || warehouses[0]?.id || '');
  const [billNumber, setBillNumber] = useState(`APMC/KLR/2026/${Math.floor(1000 + Math.random() * 9000)}`);
  const [paymentMode, setPaymentMode] = useState('IMPS_TRANSFER');
  const [transportCharge, setTransportCharge] = useState(0);
  const [items, setItems] = useState(initialItems);
  const [receiptPhoto, setReceiptPhoto] = useState(null);
  const [previewPhotoModal, setPreviewPhotoModal] = useState(false);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [submittedBill, setSubmittedBill] = useState(null);

  // When vendor select changes, auto-fill vendor info
  const handleVendorSelectChange = (vendorId) => {
    setSelectedVendorId(vendorId);
    if (vendorId === 'CUSTOM') {
      setVendorName('');
      setMandiLocation('');
    } else {
      const v = vendors.find(item => item.id === vendorId);
      if (v) {
        setVendorName(v.name);
        setMandiLocation(v.mandiLocation);
      }
    }
  };

  // Real Receipt Image Upload with Canvas WebP Optimization
  const handleReceiptPhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        const maxDim = 1200;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/webp', 0.85);
        setReceiptPhoto(compressedDataUrl);
        showToast('✓ Mandi bill photo uploaded & optimized successfully!', 'success');
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Recalculate invoice totals
  const totalWeight = items.reduce((acc, i) => acc + (Number(i.qty) || 0), 0);
  const produceAmount = items.reduce((acc, i) => acc + ((Number(i.qty) || 0) * (Number(i.rate) || 0)), 0);
  const totalAmount = produceAmount + Number(transportCharge || 0);

  const handleItemChange = (index, field, value) => {
    setItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      const q = Number(updated[index].qty) || 0;
      const r = Number(updated[index].rate) || 0;
      updated[index].total = q * r;
      return updated;
    });
  };

  const handleAddItem = () => {
    const firstProd = products[0];
    setItems(prev => [
      ...prev,
      {
        name: firstProd ? firstProd.name : 'Fresh Produce',
        qty: 10,
        unit: 'kg',
        rate: 35,
        total: 350
      }
    ]);
  };

  const handleRemoveItem = (index) => {
    if (items.length <= 1) {
      showToast('Invoice must contain at least one produce line item.', 'error');
      return;
    }
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!vendorName.trim() || !billNumber.trim()) {
      showToast('Please enter vendor name and APMC bill number.', 'error');
      return;
    }
    if (items.length === 0 || produceAmount <= 0) {
      showToast('Please enter valid quantities and rates for procured produce.', 'error');
      return;
    }
    setShowConfirmModal(true);
  };

  const handleFinalConfirm = async () => {
    const destWh = warehouses.find(w => w.id === destinationWarehouseId) || selectedWh;

    const newProcLog = {
      id: generateId('FRZ_PROC'),
      uuid: generateUUID(),
      vendorId: selectedVendorId,
      vendorName: vendorName,
      mandiName: mandiLocation,
      vendorBankDetails: activeVendor?.bankDetails || null,
      lat: Number(activeVendor?.lat) || 17.7231,
      lng: Number(activeVendor?.lng) || 83.3013,
      items: items.map(i => ({
        name: i.name,
        qty: `${i.qty} (${i.unit})`,
        rate: Number(i.rate),
        total: Number(i.total)
      })),
      produceSubtotal: Number(produceAmount),
      transportAmount: Number(transportCharge || 0),
      totalAmountPaid: Number(totalAmount),
      totalWeightKg: totalWeight,
      destinationType: 'CENTRAL_WAREHOUSE',
      destinationName: destWh ? `${destWh.name} (${destWh.code || destWh.id})` : (warehouses[0] ? `${warehouses[0].name} (${warehouses[0].code || warehouses[0].id})` : 'Regional Warehouse Hub'),
      destinationWarehouseId: destWh?.id || warehouses[0]?.id || '',
      paymentMode: paymentMode,
      billNumber: billNumber,
      loggedByOfficerId: currentUser?.id || 'emp-101',
      loggedByOfficerName: currentUser?.name || 'Procurement Lead',
      receiptPhotoAttached: !!receiptPhoto,
      receiptPhoto: receiptPhoto,
      contributingSocieties: contributingSocietiesList,
      contributingResidents: contributingResidentsList.map(r => `${r.name} (${r.flatNo || 'Resident'})`),
      fulfilledOrderIds: unprocuredOrders.map(o => o.id),
      timestamp: new Date().toISOString()
    };

    try {
      await createProcurementMutation.mutateAsync({
        billNumber: billNumber,
        vendorId: selectedVendorId || undefined,
        vendorName: vendorName,
        mandiLocation: mandiLocation,
        destinationWarehouseId: destWh?.id || warehouses[0]?.id || 'FRZ_WH_01',
        destinationName: destWh ? destWh.name : (warehouses[0]?.name || 'Regional Hub'),
        paymentMode: paymentMode,
        totalWeightKg: Number(totalWeight) || 0,
        produceAmount: Number(produceAmount) || 0,
        transportAmount: Number(transportCharge) || 0,
        totalAmountPaid: Number(totalAmount) || 0,
        totalAmount: Number(totalAmount) || 0,
        receiptPhoto: receiptPhoto || undefined,
        items: items.map(i => ({
          name: i.name,
          qty: Number(i.qty) || 1,
          rate: Number(i.rate) || 0,
          unit: i.unit || 'kg',
          total: Number(i.total) || 0
        }))
      });

      setShowConfirmModal(false);
      showToast(`✓ Mandi Bill #${billNumber} recorded on server! Viewing updated demand checklist...`, 'success');
      navigate(`/procurement-demand?warehouseId=${destWh?.id || 'ALL'}&slot=${querySlot}&date=${queryDate}`);
    } catch (err) {
      console.error('Backend procurement creation failed:', err);
      showToast(`Failed to record procurement bill on server: ${err?.message || 'Server error'}`, 'error');
    }
  };

  const handleCopyText = (text, label) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} copied to clipboard!`, 'success');
  };

  return (
    <div className="admin-page-container" style={{ maxWidth: '920px' }}>
      {/* Top Header */}
      <div className="page-title-header" style={{ marginBottom: '16px' }}>
        <div>
          <Link to="/procurement-demand" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748B', fontWeight: 600, textDecoration: 'none', marginBottom: '6px' }}>
            <ArrowLeft size={14} /> Back to Mandi Demand Checklist
          </Link>
          <h1 style={{ fontSize: '19px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            Log Consolidated APMC Mandi Purchase Bill & Transport
          </h1>
          <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>
            Record farmer/agent auction invoice, bank settlement details, transport freight & weighing slip photo
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', background: '#EBF2EE', color: '#234B3C', padding: '4px 12px', borderRadius: '6px', fontWeight: 700 }}>
            Procurement Officer: <strong>{currentUser?.name || 'Mohan Gowda'}</strong>
          </span>
        </div>
      </div>

      {/* SUCCESS SCREEN */}
      {submittedBill ? (
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          border: '1.5px solid #059669',
          padding: '36px 24px',
          textAlign: 'center',
          boxShadow: '0 4px 16px rgba(5, 150, 105, 0.1)'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: '#ECFDF5',
            color: '#059669',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <CheckCircle2 size={36} />
          </div>

          <h2 style={{ fontSize: '22px', color: '#065F46', marginBottom: '8px', fontWeight: 800 }}>
            Consolidated Mandi Purchase Recorded!
          </h2>

          <p style={{ fontSize: '14px', color: '#475569', maxWidth: '620px', margin: '0 auto 20px', lineHeight: '1.6' }}>
            Invoice <strong>#{submittedBill.billNumber}</strong> for <strong>₹{submittedBill.totalAmountPaid.toLocaleString()}</strong> ({submittedBill.totalWeightKg} kg farm produce + ₹{submittedBill.transportAmount} transport freight) committed to the audit ledger.
            En route by truck to <strong>{submittedBill.destinationName}</strong> for dawn sorting and packing.
          </p>

          {/* Breakdown Card */}
          <div style={{
            background: '#F8FAFC',
            borderRadius: '12px',
            padding: '18px',
            maxWidth: '540px',
            margin: '0 auto 24px',
            border: '1px solid #E2E8F0',
            textAlign: 'left',
            fontSize: '13px'
          }}>
            <div style={{ fontWeight: 800, color: '#0F172A', marginBottom: '10px', borderBottom: '1px solid #E2E8F0', paddingBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
              <span>Procured Produce Line Items</span>
              <span style={{ color: '#64748B', fontWeight: 600 }}>{submittedBill.items.length} Crops</span>
            </div>

            {submittedBill.items.map((it, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <span style={{ color: '#334155' }}>• {it.name} ({it.qty}) @ ₹{it.rate}/kg</span>
                <strong style={{ color: '#234B3C' }}>₹{it.total.toLocaleString()}</strong>
              </div>
            ))}

            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #E2E8F0', paddingTop: '8px', marginTop: '6px' }}>
              <span style={{ color: '#64748B' }}>Produce Subtotal:</span>
              <strong style={{ color: '#0F172A' }}>₹{submittedBill.produceSubtotal.toLocaleString()}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
              <span style={{ color: '#0284C7', fontWeight: 700 }}>+ Transport / Freight Amount:</span>
              <strong style={{ color: '#0284C7' }}>₹{submittedBill.transportAmount.toLocaleString()}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1.5px solid #CBD5E1', paddingTop: '8px', marginTop: '6px', fontWeight: 800, fontSize: '15px' }}>
              <span>Total Mandi Spend:</span>
              <span style={{ color: '#059669', fontSize: '17px' }}>₹{submittedBill.totalAmountPaid.toLocaleString()}</span>
            </div>

            {/* Contributing Communities Notice */}
            <div style={{ borderTop: '1px dashed #CBD5E1', paddingTop: '10px', marginTop: '10px', fontSize: '12px', color: '#64748B' }}>
              <div style={{ fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>
                Contributing Customer Societies & Flats:
              </div>
              <div>
                🏢 <strong>{submittedBill.contributingSocieties?.join(', ')}</strong>
              </div>
              {submittedBill.contributingResidents?.length > 0 && (
                <div style={{ marginTop: '2px', color: '#475569' }}>
                  Residents: {submittedBill.contributingResidents.join(', ')}
                </div>
              )}
            </div>

            {/* Receipt Photo Attached Thumbnail */}
            {submittedBill.receiptPhoto && (
              <div style={{ marginTop: '12px', borderTop: '1px solid #E2E8F0', paddingTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img
                  src={submittedBill.receiptPhoto}
                  alt="Bill Receipt"
                  style={{ width: '45px', height: '45px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                />
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#065F46' }}>✓ Mandi Bill Slip Attached</div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>Verified with APMC weighing scale slip</div>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <Link
              to="/procurement-logs"
              className="admin-btn-primary"
              style={{ textDecoration: 'none', padding: '10px 20px', fontSize: '13px' }}
            >
              View Mandi Bills Audit Ledger
            </Link>
            <Link
              to="/warehouse-crating"
              className="admin-btn-accent"
              style={{ textDecoration: 'none', padding: '10px 20px', fontSize: '13px' }}
            >
              Proceed to Warehouse Packing Desk ➔
            </Link>
          </div>
        </div>
      ) : (
        /* PROCUREMENT BILL ENTRY FORM */
        <form onSubmit={handleSubmit} className="admin-form-card">
          {/* ZERO PENDING DEMAND NOTICE BANNER */}
          {unprocuredItemsList.filter(i => i.qty > 0).length === 0 ? (
            <div style={{
              background: '#EFF6FF',
              border: '1.5px solid #BFDBFE',
              borderRadius: '10px',
              padding: '14px 16px',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px'
            }}>
              <CheckCircle2 size={20} color="#2563EB" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#1E40AF' }}>
                  All Customer Produce Demand is Already Procured!
                </div>
                <div style={{ fontSize: '12.5px', color: '#3B82F6', marginTop: '2px', lineHeight: 1.4 }}>
                  There are no pending customer order requirements. You are currently in <strong>Buffer / Extra Lot</strong> procurement mode.
                </div>
              </div>
            </div>
          ) : (
            /* CONTRIBUTING CUSTOMERS CARD */
            <div style={{
              background: '#F0FDF4',
              border: '1.5px solid #BBF7D0',
              borderRadius: '10px',
              padding: '14px 16px',
              marginBottom: '18px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={18} color="#166534" />
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#166534' }}>
                    Remaining Mandi Demand for {unprocuredOrders.length} Active Customer Orders
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {querySlot !== 'ALL' && (
                    <span style={{ fontSize: '11px', background: querySlot.includes('Evening') ? '#FEF3C7' : '#E0F2FE', color: querySlot.includes('Evening') ? '#92400E' : '#0369A1', fontWeight: 700, padding: '2px 8px', borderRadius: '4px' }}>
                      {querySlot.includes('Evening') ? '🌇 Evening Run' : '🌅 Morning Run'}
                    </span>
                  )}
                  <span style={{ fontSize: '11.5px', background: '#DCFCE7', color: '#15803D', fontWeight: 800, padding: '2px 8px', borderRadius: '4px' }}>
                    {contributingSocietiesList.join(', ')}
                  </span>
                </div>
              </div>

              <div style={{ fontSize: '12px', color: '#374151', lineHeight: 1.5, marginBottom: '8px' }}>
                Net produce demand aggregated across confirmed customer orders (less opening inventory & previous purchases):
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {unprocuredItemsList.filter(i => i.qty > 0).map((crop, idx) => (
                  <span key={idx} style={{
                    fontSize: '12px',
                    background: '#FFFFFF',
                    border: '1px solid #86EFAC',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    color: '#14532D',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                  }}>
                    <span>{crop.name}:</span>
                    <strong style={{ color: '#15803D' }}>{crop.qty} kg</strong>
                    {crop.openingStock > 0 && (
                      <span style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 500 }}>
                        ({crop.openingStock}kg in stock)
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Section 1: Vendor Selection & Bank Settlement */}
          <div style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: '18px', marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '15px', color: '#234B3C', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <Store size={18} />
                <span>1. Mandi Commission Agent & Vendor Bank Details</span>
              </h3>
              <Link
                to="/vendors"
                style={{ fontSize: '12px', color: '#0284C7', textDecoration: 'none', fontWeight: 700 }}
              >
                Manage Vendors Master ➔
              </Link>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '12px' }}>
              <div>
                <label style={{ fontSize: '12.5px', fontWeight: 700, display: 'block', marginBottom: '4px', color: '#334155' }}>
                  Select Registered Vendor / Agent *
                </label>
                <select
                  value={selectedVendorId}
                  onChange={(e) => handleVendorSelectChange(e.target.value)}
                  style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '13px', fontWeight: 700, color: '#0F172A', background: '#FFFFFF' }}
                >
                  {vendors.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.mandiLocation})
                    </option>
                  ))}
                  <option value="CUSTOM">-- Manual / Other Vendor --</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12.5px', fontWeight: 700, display: 'block', marginBottom: '4px', color: '#334155' }}>
                  Commission Agent / Vendor Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. M.K. APMC Mandi Traders"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '13.5px' }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '12.5px', fontWeight: 700, display: 'block', marginBottom: '4px', color: '#334155' }}>
                  APMC Market Yard & Location *
                </label>
                <input
                  type="text"
                  placeholder="e.g. APMC Yard Kolar, Gate No. 4"
                  value={mandiLocation}
                  onChange={(e) => setMandiLocation(e.target.value)}
                  style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '13.5px' }}
                  required
                />
              </div>
            </div>

            {/* Vendor Bank Details Card */}
            {activeVendor?.bankDetails?.accountNumber && (
              <div style={{
                background: '#F0F9FF',
                border: '1.5px solid #BAE6FD',
                borderRadius: '8px',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <CreditCard size={18} color="#0284C7" />
                  <div style={{ fontSize: '12.5px' }}>
                    <span style={{ color: '#0369A1', fontWeight: 700 }}>Settlement Bank:</span>{' '}
                    <strong>{activeVendor.bankDetails.bankName}</strong> | A/C:{' '}
                    <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{activeVendor.bankDetails.accountNumber}</span> | IFSC:{' '}
                    <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{activeVendor.bankDetails.ifscCode}</span>
                    {activeVendor.bankDetails.upiId && (
                      <span style={{ color: '#059669', marginLeft: '8px', fontWeight: 600 }}>UPI: {activeVendor.bankDetails.upiId}</span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopyText(`${activeVendor.bankDetails.accountNumber} ${activeVendor.bankDetails.ifscCode}`, 'Bank Info')}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #7DD3FC',
                    color: '#0369A1',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Copy size={11} />
                  <span>Copy Bank Info</span>
                </button>
              </div>
            )}
          </div>

          {/* Section 2: Consolidated Multi-Item Invoice Table */}
          <div style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: '18px', marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '15px', color: '#234B3C', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <FileText size={18} />
                  <span>2. Procured Produce Line Items</span>
                </h3>
                <span style={{ fontSize: '11.5px', color: '#64748B' }}>
                  Actual Mandi cost rates (COGS) paid per kg to the commission agent
                </span>
              </div>
              <button
                type="button"
                onClick={handleAddItem}
                style={{
                  background: '#EBF2EE',
                  color: '#234B3C',
                  border: '1px solid #C8DBD0',
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Plus size={14} />
                <span>Add Crop / Extra Buffer</span>
              </button>
            </div>

            <div style={{ overflowX: 'auto', background: '#F8FAFC', borderRadius: '10px', border: '1.5px solid #E2E8F0', padding: '12px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1.5px solid #CBD5E1', textAlign: 'left', color: '#64748B', fontSize: '12px' }}>
                    <th style={{ padding: '8px' }}>Crop / Produce Item</th>
                    <th style={{ padding: '8px', width: '120px' }}>Quantity (kg)</th>
                    <th style={{ padding: '8px', width: '160px' }}>Mandi Purchase Rate (₹/kg)</th>
                    <th style={{ padding: '8px', width: '130px' }}>Line Total (₹)</th>
                    <th style={{ padding: '8px', width: '50px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '32px 16px', textAlign: 'center', color: '#64748B' }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                          No pending demand items to procure
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '14px' }}>
                          All customer order quantities are satisfied. You can manually add extra buffer stock or custom lots below.
                        </div>
                        <button
                          type="button"
                          onClick={handleAddItem}
                          style={{
                            background: '#234B3C',
                            color: '#FFFFFF',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            fontSize: '12.5px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <Plus size={15} />
                          <span>+ Add Buffer Produce Row</span>
                        </button>
                      </td>
                    </tr>
                  ) : (
                    items.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #E2E8F0' }}>
                        <td style={{ padding: '8px' }}>
                          <select
                            value={item.name}
                            onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                            style={{
                              width: '100%',
                              height: '36px',
                              padding: '0 8px',
                              borderRadius: '6px',
                              border: '1px solid #CBD5E1',
                              fontSize: '13px',
                              fontWeight: 700,
                              color: '#0F172A',
                              background: '#FFFFFF'
                            }}
                          >
                            {products.map(p => (
                              <option key={p.id} value={p.name}>{p.name} ({p.origin || 'Kolar Mandi'})</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ padding: '8px' }}>
                          <input
                            type="number"
                            min="1"
                            step="0.5"
                            value={item.qty}
                            onChange={(e) => handleItemChange(idx, 'qty', e.target.value)}
                            style={{
                              width: '100%',
                              height: '36px',
                              padding: '0 8px',
                              borderRadius: '6px',
                              border: '1px solid #CBD5E1',
                              fontSize: '13px',
                              fontWeight: 700,
                              textAlign: 'center'
                            }}
                            required
                          />
                        </td>
                        <td style={{ padding: '8px' }}>
                          <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#64748B', fontWeight: 700 }}>₹</span>
                            <input
                              type="number"
                              min="1"
                              step="0.5"
                              value={item.rate}
                              onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                              style={{
                                width: '100%',
                                height: '36px',
                                paddingLeft: '22px',
                                paddingRight: '8px',
                                borderRadius: '6px',
                                border: '1px solid #CBD5E1',
                                fontSize: '13px',
                                fontWeight: 700
                              }}
                              required
                            />
                          </div>
                        </td>
                        <td style={{ padding: '8px' }}>
                          <strong style={{ color: '#234B3C', fontSize: '14px' }}>
                            ₹{(Number(item.qty) * Number(item.rate)).toLocaleString()}
                          </strong>
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#EF4444',
                              cursor: 'pointer',
                              padding: '4px'
                            }}
                            title="Remove item"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* Subtotal & Transport Breakdown Footer */}
              <div style={{
                paddingTop: '12px',
                marginTop: '8px',
                borderTop: '1.5px solid #CBD5E1'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13.5px' }}>
                  <span style={{ color: '#475569' }}>
                    Total Farm Produce Weight: <strong style={{ color: '#234B3C', fontSize: '14.5px' }}>{totalWeight} kg</strong>
                  </span>
                  <span>
                    Produce Subtotal: <strong style={{ color: '#0F172A', fontSize: '15px' }}>₹{produceAmount.toLocaleString()}</strong>
                  </span>
                </div>

                {/* Transport Freight Input Row */}
                <div style={{
                  background: '#F1F5F9',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Truck size={16} color="#0284C7" />
                    <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155' }}>
                      Transport / Truck Freight Charge:
                    </label>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748B' }}>₹</span>
                    <input
                      type="number"
                      min="0"
                      step="10"
                      value={transportCharge}
                      onChange={(e) => setTransportCharge(Math.max(0, parseFloat(e.target.value) || 0))}
                      style={{ width: '100px', height: '34px', padding: '0 8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', fontWeight: 800, textAlign: 'right' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px', paddingTop: '6px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
                    Total Mandi Settlement (Produce + Transport):
                  </span>
                  <span style={{ fontSize: '18px', fontWeight: 800, color: '#059669' }}>
                    ₹{totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Billing & Warehouse Routing */}
          <div style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: '18px', marginBottom: '18px' }}>
            <h3 style={{ fontSize: '15px', color: '#234B3C', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Truck size={18} />
              <span>3. APMC Invoice & Distribution Routing</span>
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12.5px', fontWeight: 700, display: 'block', marginBottom: '4px', color: '#334155' }}>
                  APMC Invoice / Auction Bill # *
                </label>
                <input
                  type="text"
                  value={billNumber}
                  onChange={(e) => setBillNumber(e.target.value)}
                  style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '13.5px', fontFamily: 'monospace', fontWeight: 700 }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '12.5px', fontWeight: 700, display: 'block', marginBottom: '4px', color: '#334155' }}>
                  Destination Cold Hub / Warehouse *
                </label>
                <select
                  value={destinationWarehouseId}
                  onChange={(e) => setDestinationWarehouseId(e.target.value)}
                  style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '13px', fontWeight: 700, color: '#0F172A', background: '#FFFFFF' }}
                >
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12.5px', fontWeight: 700, display: 'block', marginBottom: '4px', color: '#334155' }}>
                  Settlement Payment Mode
                </label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '13px' }}
                >
                  <option value="IMPS_TRANSFER">IMPS / Bank Transfer</option>
                  <option value="UPI">Instant Mandi UPI</option>
                  <option value="CASH">Cash Settlement</option>
                  <option value="MANDI_CREDIT">Mandi 7-Day Credit Ledger</option>
                </select>
              </div>
            </div>

            {/* REAL RECEIPT PHOTO UPLOAD SECTION */}
            <div style={{
              background: '#F8FAFC',
              border: receiptPhoto ? '2px solid #10B981' : '2px dashed #94A3B8',
              borderRadius: '12px',
              padding: '16px',
              marginTop: '16px'
            }}>
              <input
                type="file"
                id="mandi-bill-photo-input"
                accept="image/*"
                onChange={handleReceiptPhotoUpload}
                style={{ display: 'none' }}
              />

              {receiptPhoto ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img
                      src={receiptPhoto}
                      alt="Mandi Bill Slip Preview"
                      style={{ width: '70px', height: '70px', objectFit: 'cover', borderRadius: '8px', border: '1.5px solid #10B981', cursor: 'pointer' }}
                      onClick={() => setPreviewPhotoModal(true)}
                    />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#065F46', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CheckCircle2 size={16} />
                        <span>Mandi Weighing Slip / Bill Photo Attached</span>
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                        Digital weighing slip verified • Click image to zoom
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setPreviewPhotoModal(true)}
                      style={{
                        fontSize: '12px',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        background: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        color: '#334155',
                        cursor: 'pointer',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Eye size={13} />
                      <span>View Full Slip</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => document.getElementById('mandi-bill-photo-input')?.click()}
                      style={{
                        fontSize: '12px',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        background: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        color: '#334155',
                        cursor: 'pointer',
                        fontWeight: 600
                      }}
                    >
                      Change Photo
                    </button>
                    <button
                      type="button"
                      onClick={() => setReceiptPhoto(null)}
                      style={{
                        fontSize: '12px',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        background: '#FEE2E2',
                        border: '1px solid #FECACA',
                        color: '#DC2626',
                        cursor: 'pointer',
                        fontWeight: 600
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '8px', background: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Camera size={22} color="#475569" />
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                        Upload Mandi Weighing Slip / Farmer Invoice Photo *
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                        Upload photo of physical APMC weighbridge slip or commission agent bill
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => document.getElementById('mandi-bill-photo-input')?.click()}
                    style={{
                      fontSize: '12.5px',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      background: '#234B3C',
                      border: 'none',
                      color: '#FFFFFF',
                      cursor: 'pointer',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Camera size={15} />
                    <span>Upload Bill / Slip Photo</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            className="admin-btn-accent"
            style={{ width: '100%', padding: '14px', fontSize: '15px', justifyContent: 'center' }}
          >
            <Send size={18} />
            <span>Submit Consolidated Mandi Bill & Commit to Ledger (₹{totalAmount.toLocaleString()})</span>
          </button>
        </form>
      )}

      {/* CONFIRMATION MODAL */}
      {showConfirmModal && (
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
            maxWidth: '540px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            border: '1.5px solid #E2E8F0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: '#FEF3C7',
                  color: '#B45309',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <AlertTriangle size={20} />
                </div>
                <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  Confirm Mandi Bill Logging
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, margin: '0 0 16px' }}>
              Are you sure you want to log this APMC Mandi purchase? This will commit <strong>₹{totalAmount.toLocaleString()}</strong> (₹{produceAmount.toLocaleString()} produce + ₹{transportCharge} transport freight) to the ledger.
            </p>

            <div style={{
              background: '#F8FAFC',
              borderRadius: '10px',
              padding: '12px 14px',
              border: '1px solid #E2E8F0',
              marginBottom: '20px',
              fontSize: '12.5px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Vendor / Mandi Yard:</span>
                <strong style={{ color: '#0F172A' }}>{vendorName} ({mandiLocation})</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Bill / Invoice #:</span>
                <span style={{ color: '#0F172A', fontWeight: 700, fontFamily: 'monospace' }}>{billNumber}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Bill Photo Attached:</span>
                <span style={{ color: receiptPhoto ? '#059669' : '#B45309', fontWeight: 700 }}>
                  {receiptPhoto ? '✓ Yes (Weighing Slip Uploaded)' : '⚠ No Photo Attached'}
                </span>
              </div>
              <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '6px', marginTop: '4px' }}>
                <div style={{ color: '#64748B', marginBottom: '4px', fontWeight: 700 }}>Line Items to be Procured:</div>
                {items.map((it, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                    <span>• {it.name} ({it.qty} * {it.unit}) @ ₹{it.rate}/kg</span>
                    <strong>₹{it.total.toLocaleString()}</strong>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #E2E8F0', paddingTop: '6px', marginTop: '4px' }}>
                <span style={{ color: '#64748B' }}>Produce Subtotal:</span>
                <strong>₹{produceAmount.toLocaleString()}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#0284C7', fontWeight: 700 }}>Transport / Freight:</span>
                <strong style={{ color: '#0284C7' }}>₹{transportCharge.toLocaleString()}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1.5px solid #CBD5E1', paddingTop: '6px', marginTop: '4px' }}>
                <span style={{ color: '#0F172A', fontWeight: 800 }}>Total Mandi Spend:</span>
                <strong style={{ color: '#059669', fontSize: '15px' }}>₹{totalAmount.toLocaleString()}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                style={{
                  flex: 1,
                  padding: '10px',
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
              <button
                type="button"
                onClick={handleFinalConfirm}
                style={{
                  flex: 2,
                  padding: '10px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#059669',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                Yes, Confirm & Log Bill
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL BILL PHOTO PREVIEW MODAL */}
      {previewPhotoModal && receiptPhoto && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.8)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            maxWidth: '650px',
            width: '100%',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <strong style={{ fontSize: '14px', color: '#0F172A' }}>Mandi Weighing Slip / Bill Invoice Photo</strong>
              <button
                type="button"
                onClick={() => setPreviewPhotoModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '16px', textAlign: 'center', maxHeight: '70vh', overflowY: 'auto' }}>
              <img
                src={receiptPhoto}
                alt="Full Mandi Slip"
                style={{ maxWidth: '100%', maxHeight: '65vh', objectFit: 'contain', borderRadius: '8px' }}
              />
            </div>
            <div style={{ padding: '12px 18px', borderTop: '1px solid #E2E8F0', textAlign: 'right' }}>
              <button
                type="button"
                onClick={() => setPreviewPhotoModal(false)}
                className="admin-btn-secondary"
                style={{ fontSize: '12.5px', padding: '6px 16px' }}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
