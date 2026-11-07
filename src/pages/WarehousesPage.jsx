import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Warehouse, 
  Package, 
  Clock, 
  Plus, 
  Edit3, 
  Eye, 
  Download, 
  CheckCircle2, 
  X, 
  Phone, 
  Users, 
  Building2,
  ArrowRight,
  AlertCircle,
  MapPin,
  HelpCircle,
  Trash2,
  RotateCcw
} from 'lucide-react';
import { useAdminRole } from '../context/AdminRoleContext';
import { warehouses as warehouseResource, societies as societyResource, employees as employeeResource } from '../hooks/resources';
import { useToast } from '../context/ToastContext';
import { exportToExcel } from '../utils/excelExporter';
import AdminWarehouseLocationMapPicker from '../components/common/AdminWarehouseLocationMapPicker';

export default function WarehousesPage() {
  const { currentUser } = useAdminRole();
  const { showToast } = useToast();

  const { data: rawWarehouses = [], isLoading: isLoadingWarehouses } = warehouseResource.useList();
  const { data: rawSocieties = [] } = societyResource.useList();
  const { data: rawEmployees = [] } = employeeResource.useList();

  const warehouses = Array.isArray(rawWarehouses) ? rawWarehouses : [];
  const societies = Array.isArray(rawSocieties) ? rawSocieties : [];
  const employees = Array.isArray(rawEmployees) ? rawEmployees : [];
  const isLoading = isLoadingWarehouses;

  const [isCustomManager, setIsCustomManager] = useState(false);

  // Group registered employees for selection
  const warehouseManagers = employees.filter(emp => {
    const roles = Array.isArray(emp.roles) ? emp.roles : (emp.role ? [emp.role] : []);
    return roles.includes('WAREHOUSE_MANAGER');
  });

  const otherStaff = employees.filter(emp => {
    const roles = Array.isArray(emp.roles) ? emp.roles : (emp.role ? [emp.role] : []);
    return !roles.includes('WAREHOUSE_MANAGER') && (roles.includes('SUPER_ADMIN') || roles.includes('WAREHOUSE_STAFF') || roles.includes('PROCUREMENT_OFFICER'));
  });

  const createWarehouseMutation = warehouseResource.useCreate();
  const updateWarehouseMutation = warehouseResource.useUpdate();

  // Modals state
  const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [statusTargetWarehouse, setStatusTargetWarehouse] = useState(null);
  const [hubStatusFilter, setHubStatusFilter] = useState('ALL');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Utility: Convert 24-hour "HH:mm" to 12-hour "hh:mm AM/PM"
  const format24to12 = (time24) => {
    if (!time24 || !time24.includes(':')) return time24 || '';
    const [hStr, mStr] = time24.split(':');
    let h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    if (isNaN(h) || isNaN(m)) return time24;
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

  // Utility: Convert 12-hour string (e.g. "05:30 AM" or "5:30 PM") to 24-hour "HH:mm"
  const parse12to24 = (time12) => {
    if (!time12) return '06:00';
    const match = String(time12).trim().match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (!match) return '06:00';
    let h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const ampm = (match[3] || '').toUpperCase();
    if (ampm === 'PM' && h < 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  // Utility: Parse a range like "05:30 AM – 07:00 AM" into { start: "05:30", end: "07:00" }
  const parseRangeTo24 = (timeWindow) => {
    if (!timeWindow) return { start: '06:00', end: '08:00' };
    const parts = String(timeWindow).split(/[-–—to]/i).map(s => s.trim()).filter(Boolean);
    if (parts.length >= 2) {
      return {
        start: parse12to24(parts[0]),
        end: parse12to24(parts[1])
      };
    }
    return { start: '06:00', end: '08:00' };
  };

  // Standard Customer Delivery Slots with Clean Labels & Timer Values
  const DEFAULT_SLOTS = [
    { id: 'SLOT_DAWN', label: 'Early Dawn Drop', startTime: '05:30', endTime: '07:00', timeWindow: '05:30 AM – 07:00 AM', desc: 'Security desk / gate drop before morning commute', enabled: true },
    { id: 'SLOT_MORNING', label: 'Morning Fresh Slot', startTime: '07:00', endTime: '08:30', timeWindow: '07:00 AM – 08:30 AM', desc: 'Doorstep direct delivery for breakfast preparation', enabled: true },
    { id: 'SLOT_EVENING', label: 'Evening Fresh Run', startTime: '17:30', endTime: '19:30', timeWindow: '05:30 PM – 07:30 PM', desc: 'Evening harvest drop for dinner cooking', enabled: true }
  ];

  // Sanitize slots to ensure clean labels without redundant parenthesized times and populated start/end timer values
  const sanitizeWarehouseSlots = (slots) => {
    const list = Array.isArray(slots) && slots.length > 0 ? slots : DEFAULT_SLOTS;
    return list.map(s => {
      const range = parseRangeTo24(s.timeWindow);
      const startTime = s.startTime || range.start || '06:00';
      const endTime = s.endTime || range.end || '08:00';
      const formattedWindow = s.timeWindow || `${format24to12(startTime)} – ${format24to12(endTime)}`;
      const cleanLabel = (s.label || '')
        .replace(/\s*\(\s*\d{1,2}:\d{2}\s*(?:AM|PM)?\s*[-–—to]+\s*\d{1,2}:\d{2}\s*(?:AM|PM)?\s*\)/i, '')
        .trim();

      return {
        ...s,
        label: cleanLabel || s.label || 'Delivery Slot',
        startTime,
        endTime,
        timeWindow: formattedWindow
      };
    });
  };

  // Warehouse Form State with Lat / Lng Coordinates
  const [warehouseForm, setWarehouseForm] = useState({
    code: '',
    name: '',
    location: '',
    lat: 17.7231,
    lng: 83.3013,
    openTime: '05:00',
    cutoffTime: '23:30',
    capacityTons: 40,
    managerName: '',
    managerPhone: '',
    status: 'ACTIVE',
    slots: DEFAULT_SLOTS
  });

  const toggleSlot = (slotId) => {
    setWarehouseForm(prev => ({
      ...prev,
      slots: (prev.slots || DEFAULT_SLOTS).map(s => 
        s.id === slotId ? { ...s, enabled: !s.enabled } : s
      )
    }));
  };

  const handleUpdateSlotField = (slotId, field, value) => {
    setWarehouseForm(prev => ({
      ...prev,
      slots: (prev.slots || DEFAULT_SLOTS).map(s =>
        s.id === slotId ? { ...s, [field]: value } : s
      )
    }));
  };

  // Timer change handler: updates startTime or endTime and recalculates timeWindow string
  const handleSlotTimeChange = (slotId, type, newTime) => {
    setWarehouseForm(prev => {
      const updatedSlots = (prev.slots || DEFAULT_SLOTS).map(slot => {
        if (slot.id !== slotId) return slot;
        const currentRange = parseRangeTo24(slot.timeWindow);
        const startTime = type === 'start' ? newTime : (slot.startTime || currentRange.start || '06:00');
        const endTime = type === 'end' ? newTime : (slot.endTime || currentRange.end || '08:00');
        const timeWindow = `${format24to12(startTime)} – ${format24to12(endTime)}`;
        return {
          ...slot,
          startTime,
          endTime,
          timeWindow
        };
      });
      return { ...prev, slots: updatedSlots };
    });
  };

  // 1-Click quick timer preset applier
  const handleApplySlotPreset = (slotId, startTime, endTime) => {
    setWarehouseForm(prev => {
      const updatedSlots = (prev.slots || DEFAULT_SLOTS).map(slot => {
        if (slot.id !== slotId) return slot;
        const timeWindow = `${format24to12(startTime)} – ${format24to12(endTime)}`;
        return {
          ...slot,
          startTime,
          endTime,
          timeWindow
        };
      });
      return { ...prev, slots: updatedSlots };
    });
  };

  const handleAddCustomSlot = () => {
    const newId = `SLOT_CUSTOM_${Date.now()}`;
    const newSlot = {
      id: newId,
      label: 'Afternoon Express',
      startTime: '12:30',
      endTime: '14:00',
      timeWindow: '12:30 PM – 02:00 PM',
      desc: 'Midday fresh harvest drop for lunch & evening preparation',
      enabled: true
    };
    setWarehouseForm(prev => ({
      ...prev,
      slots: [...(prev.slots || DEFAULT_SLOTS), newSlot]
    }));
  };

  const handleRemoveSlot = (slotId) => {
    setWarehouseForm(prev => ({
      ...prev,
      slots: (prev.slots || DEFAULT_SLOTS).filter(s => s.id !== slotId)
    }));
  };

  const handleResetSlots = () => {
    setWarehouseForm(prev => ({
      ...prev,
      slots: DEFAULT_SLOTS
    }));
  };

  // ================= EXCEL EXPORT =================
  const handleExportExcel = () => {
    const headers = [
      'Warehouse Code',
      'Warehouse Name',
      'Warehouse Location',
      'Daily Cutoff Time',
      'Morning Dispatch',
      'Capacity (Tons)',
      'Warehouse Manager',
      'Manager Phone',
      'Covered Communities Count',
      'Warehouse Status'
    ];

    const rows = warehouses.map(wh => {
      const whSocCount = societies.filter(s => s.warehouseId === wh.id).length;

      return [
        wh.code || wh.id,
        wh.name,
        wh.location,
        wh.cutoffTime || '21:00',
        wh.openTime || '05:00',
        wh.capacityTons || 35,
        wh.managerName || 'Operations Lead',
        (wh.managerPhone && !wh.managerPhone.includes('\u2022')) ? wh.managerPhone : (employees.find(e => e.name === wh.managerName)?.phone || wh.managerPhone || '+91 9999999999'),
        whSocCount,
        wh.status || 'ACTIVE'
      ];
    });

    exportToExcel('Freshioz_Warehouses_Directory', headers, rows);
  };

  const isSuperAdmin = currentUser?.roles?.includes('SUPER_ADMIN') || currentUser?.role === 'SUPER_ADMIN' || currentUser?.email === 'superadmin@gmail.com';
  const assignedWhId = currentUser?.assignedWarehouseId;
  const isWarehouseScoped = !isSuperAdmin && assignedWhId && assignedWhId !== 'ALL';

  const accessibleWarehouses = React.useMemo(() => {
    if (!isWarehouseScoped) return warehouses;
    return warehouses.filter(wh => wh.id === assignedWhId || wh.code === assignedWhId || wh.uuid === assignedWhId);
  }, [warehouses, isWarehouseScoped, assignedWhId]);

  const accessibleSocieties = React.useMemo(() => {
    if (!isWarehouseScoped) return societies;
    const whIds = new Set(accessibleWarehouses.map(w => w.id));
    return societies.filter(s => whIds.has(s.warehouseId));
  }, [societies, accessibleWarehouses, isWarehouseScoped]);

  const filteredWarehouses = accessibleWarehouses.filter(wh => {
    if (hubStatusFilter === 'ACTIVE' && wh.status === 'INACTIVE') return false;
    if (hubStatusFilter === 'INACTIVE' && wh.status !== 'INACTIVE') return false;
    return true;
  });

  const handleConfirmToggleWarehouseStatus = async () => {
    if (!statusTargetWarehouse) return;
    setIsUpdatingStatus(true);
    const newStatus = statusTargetWarehouse.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await updateWarehouseMutation.mutateAsync({
        id: statusTargetWarehouse.id,
        data: { status: newStatus }
      });
      showToast(
        newStatus === 'ACTIVE'
          ? `✓ Hub "${statusTargetWarehouse.name}" is now ACTIVE. Deliveries resumed.`
          : `✓ Hub "${statusTargetWarehouse.name}" is now PAUSED (Inactive). Deliveries paused for mapped societies.`,
        'success'
      );
      setStatusTargetWarehouse(null);
    } catch (err) {
      console.error('Hub status toggle failed:', err);
      showToast(`Failed to update hub status: ${err?.message || 'Server error'}`, 'error');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // ================= WAREHOUSE MODAL HANDLERS =================
  const handleOpenAddWarehouse = () => {
    if (!isSuperAdmin) {
      showToast('Restricted: Only Super Admin can register new physical warehouses.', 'error');
      return;
    }
    setIsCustomManager(false);
    setEditingWarehouse(null);
    setWarehouseForm({
      code: '',
      name: '',
      location: '',
      lat: 13.0358,
      lng: 77.5970,
      openTime: '05:00',
      cutoffTime: '23:30',
      capacityTons: 40,
      managerName: '',
      managerPhone: '',
      status: 'ACTIVE',
      slots: DEFAULT_SLOTS
    });
    setIsWarehouseModalOpen(true);
  };

  const handleOpenEditWarehouse = (wh) => {
    setEditingWarehouse(wh);
    setIsCustomManager(false);
    const matchedEmp = employees.find(e => e.name === wh.managerName);
    const cleanPhone = (wh.managerPhone && !wh.managerPhone.includes('\u2022'))
      ? wh.managerPhone
      : (matchedEmp?.phone || wh.managerPhone || '');
    setWarehouseForm({
      code: wh.code || wh.id,
      name: wh.name,
      location: wh.location || '',
      lat: wh.lat || 13.0358,
      lng: wh.lng || 77.5970,
      openTime: wh.openTime || '05:00',
      cutoffTime: wh.cutoffTime || '23:30',
      capacityTons: wh.capacityTons || 40,
      managerName: wh.managerName || '',
      managerPhone: cleanPhone,
      status: wh.status || 'ACTIVE',
      slots: sanitizeWarehouseSlots(wh.slots)
    });
    setIsWarehouseModalOpen(true);
  };

  // Step 1: Pre-Save validation -> opens pop-up confirmation
  const handlePreSaveWarehouse = (e) => {
    e.preventDefault();
    if (!warehouseForm.name.trim() || !warehouseForm.location.trim()) {
      showToast('Please provide both warehouse name and physical receiving address / GPS pin.', 'error');
      return;
    }
    // Open Confirmation Dialog Modal
    setIsConfirmModalOpen(true);
  };

  // Step 2: User clicked "Yes, Confirm & Save" in pop-up -> commits to server and automatically invalidates query
  const handleConfirmCommitSave = async () => {
    if (editingWarehouse) {
      try {
        await updateWarehouseMutation.mutateAsync({
          id: editingWarehouse.id,
          data: warehouseForm,
        });
        showToast(`✓ Warehouse "${warehouseForm.name}" updated successfully.`, 'success');
        setIsConfirmModalOpen(false);
        setIsWarehouseModalOpen(false);
      } catch (err) {
        console.error('Backend warehouse update failed:', err);
        showToast(`Failed to update warehouse on server: ${err?.message || 'Server error'}`, 'error');
      }
    } else {
      try {
        const payload = {
          ...warehouseForm,
          code: warehouseForm.code || warehouseForm.name.toUpperCase().replace(/\s+/g, '_').slice(0, 10),
        };
        await createWarehouseMutation.mutateAsync(payload);
        showToast(`✓ New Warehouse "${warehouseForm.name}" registered and activated.`, 'success');
        setIsConfirmModalOpen(false);
        setIsWarehouseModalOpen(false);
      } catch (err) {
        console.error('Backend warehouse create failed:', err);
        showToast(`Failed to register warehouse on server: ${err?.message || 'Server error'}`, 'error');
      }
    }
  };

  return (
    <div className="admin-page-container" style={{ overflowX: 'hidden' }}>
      {/* High-Density Compact Page Header (Under 55px) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px',
        paddingBottom: '10px',
        borderBottom: '1.5px solid #E2E8F0',
        marginBottom: '12px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '18px', color: '#0F172A', fontWeight: 800, margin: 0 }}>
              Warehouses Directory
            </h1>
            <span style={{ background: '#E0F2FE', color: '#0369A1', fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '4px' }}>
              {accessibleWarehouses.length} Active Hubs
            </span>
          </div>

          {/* Compact Inline Stats Strip */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '11.5px', color: '#64748B', marginTop: '3px', flexWrap: 'wrap' }}>
            <span>• <strong>{accessibleSocieties.length}</strong> Covered Communities & Hostels</span>
            <span>• Total Handling Capacity: <strong style={{ color: '#059669' }}>{accessibleWarehouses.reduce((acc, w) => acc + (w.capacityTons || 35), 0)} Tons</strong></span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={handleExportExcel}
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
            <span>Export Excel</span>
          </button>

          {isSuperAdmin ? (
            <button
              type="button"
              onClick={handleOpenAddWarehouse}
              className="admin-btn-accent"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 14px', fontSize: '12px' }}
            >
              <Plus size={14} />
              <span>Add Warehouse</span>
            </button>
          ) : (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              background: '#F1F5F9',
              border: '1.5px solid #CBD5E1',
              fontSize: '11.5px',
              fontWeight: 700,
              color: '#64748B'
            }}>
              <span style={{ fontSize: '13px' }}>🔒</span>
              <span>Super Admin Only (New Hubs)</span>
            </div>
          )}
        </div>
      </div>

      {/* ================= PRIMARY WAREHOUSES TABLE ================= */}
      <div className="admin-table-card">
        <div className="admin-table-header">
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <Warehouse size={18} color="#234B3C" />
              <span>Regional Warehouses & Logistics Hubs ({accessibleWarehouses.length})</span>
            </h3>
            <p style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
              Direct Agri-Logistics Sorting & Crating Hubs serving registered apartment communities and hostels.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={() => setHubStatusFilter('ALL')}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: 'none',
                background: hubStatusFilter === 'ALL' ? '#234B3C' : '#F1F5F9',
                color: hubStatusFilter === 'ALL' ? '#FFFFFF' : '#64748B',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              All Hubs ({accessibleWarehouses.length})
            </button>
            <button
              type="button"
              onClick={() => setHubStatusFilter('ACTIVE')}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: 'none',
                background: hubStatusFilter === 'ACTIVE' ? '#059669' : '#F1F5F9',
                color: hubStatusFilter === 'ACTIVE' ? '#FFFFFF' : '#64748B',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Active ({accessibleWarehouses.filter(w => w.status !== 'INACTIVE').length})
            </button>
            <button
              type="button"
              onClick={() => setHubStatusFilter('INACTIVE')}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: 'none',
                background: hubStatusFilter === 'INACTIVE' ? '#DC2626' : '#F1F5F9',
                color: hubStatusFilter === 'INACTIVE' ? '#FFFFFF' : '#64748B',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Paused ({accessibleWarehouses.filter(w => w.status === 'INACTIVE').length})
            </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table className="admin-data-table" style={{ width: '100%', minWidth: '760px' }}>
            <thead>
              <tr>
                <th>Warehouse Code & Name</th>
                <th>Physical Location</th>
                <th>Cut-off Time</th>
                <th>Morning Open</th>
                <th>Capacity</th>
                <th>Covered Communities</th>
                <th>Lead In-Charge</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '48px 16px', color: '#64748B' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: 600 }}>
                      <span style={{ width: '16px', height: '16px', border: '2.5px solid #CBD5E1', borderTopColor: '#234B3C', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                      <span>Synchronizing live fulfillment hubs...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredWarehouses.length === 0 ? (
                <tr>
                  <td colSpan="9">
                    <div className="admin-empty-state">
                      <div className="admin-empty-state-icon">
                        <Warehouse size={22} />
                      </div>
                      <div className="admin-empty-state-title">No Warehouses Registered</div>
                      <div className="admin-empty-state-desc">
                        Click "+ Add Warehouse" above to add your first regional agri-sorting & crating hub.
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredWarehouses.map(wh => {
                const whSocCount = societies.filter(s => s.warehouseId === wh.id).length;

                return (
                  <tr key={wh.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          background: '#234B3C',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '12px',
                          flexShrink: 0
                        }}>
                          {wh.code?.slice(-2) || 'WH'}
                        </div>
                        <div>
                          <strong style={{ fontSize: '13.5px', color: '#0F172A' }}>{wh.name}</strong>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>
                            Code: <span style={{ fontWeight: 700 }}>{wh.code || wh.id}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div style={{ 
                        fontSize: '12px', 
                        color: '#334155', 
                        maxWidth: '220px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }} title={wh.location}>
                        {wh.location ? wh.location.replace(/\r?\n/g, ', ') : 'Location on file'}
                      </div>
                    </td>

                    <td>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#FEF3C7', color: '#B45309', padding: '2px 7px', borderRadius: '5px', fontSize: '11.5px', fontWeight: 700, marginBottom: '4px' }}>
                        <Clock size={11} />
                        <span>Cutoff: {wh.cutoffTime || '21:00'}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {(wh.slots || DEFAULT_SLOTS).filter(s => s.enabled !== false).map(s => (
                          <span key={s.id} style={{ fontSize: '10px', background: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                            {s.id === 'SLOT_DAWN' ? '🌅 Dawn' : s.id === 'SLOT_MORNING' ? '☀️ Morning' : '🌆 Evening'}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td>
                      <div style={{ fontSize: '12px', color: '#475569', fontWeight: 600 }}>
                        {wh.openTime || '05:00'} AM
                      </div>
                    </td>

                    <td>
                      <div style={{ fontSize: '12px', color: '#0F172A', fontWeight: 700 }}>
                        {wh.capacityTons || 35} Tons
                      </div>
                    </td>

                    <td>
                      <Link
                        to="/societies"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: whSocCount > 0 ? '#EBF2EE' : '#F1F5F9',
                          color: whSocCount > 0 ? '#234B3C' : '#64748B',
                          padding: '4px 9px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 800,
                          textDecoration: 'none'
                        }}
                        title="Click to view assigned apartment communities and hostels"
                      >
                        <Building2 size={13} />
                        <span>{whSocCount} Societies</span>
                        <ArrowRight size={10} />
                      </Link>
                    </td>

                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: '12.5px', color: '#0F172A', fontWeight: 700 }}>
                          {wh.managerName || 'Operations Lead'}
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748B' }}>
                          ({(wh.managerPhone && !wh.managerPhone.includes('\u2022')) ? wh.managerPhone : (employees.find(e => e.name === wh.managerName)?.phone || wh.managerPhone || '+91 98450 11223')})
                        </span>
                      </div>
                    </td>

                    <td>
                      <span className={`status-pill ${wh.status !== 'INACTIVE' ? 'approved' : 'rejected'}`} style={{ cursor: 'pointer' }}>
                        <button
                          type="button"
                          onClick={() => setStatusTargetWarehouse(wh)}
                          style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                          title={wh.status === 'INACTIVE' ? 'Click to Activate Hub' : 'Click to Pause Hub'}
                        >
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: wh.status !== 'INACTIVE' ? '#059669' : '#DC2626' }} />
                          {wh.status !== 'INACTIVE' ? 'ACTIVE' : 'PAUSED'}
                        </button>
                      </span>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <Link
                          to="/warehouse-crating"
                          style={{
                            background: '#234B3C',
                            color: '#FFFFFF',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 800,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            textDecoration: 'none',
                            transition: 'opacity 0.2s'
                          }}
                          title={`Open Packing & Crating Desk for ${wh.name}`}
                        >
                          <Package size={13} />
                          <span>Packing Desk</span>
                          <ArrowRight size={13} />
                        </Link>

                        <button
                          type="button"
                          onClick={() => handleOpenEditWarehouse(wh)}
                          style={{
                            background: '#F8FAFC',
                            border: '1.5px solid #CBD5E1',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            color: '#475569',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '12px',
                            fontWeight: 700
                          }}
                          title="Edit Warehouse Specifications"
                        >
                          <Edit3 size={13} />
                          <span>Edit</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= MODAL: ADD / EDIT WAREHOUSE ================= */}
      {isWarehouseModalOpen && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card" style={{ maxWidth: '640px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#234B3C', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Warehouse size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                    {editingWarehouse ? 'Edit Warehouse' : 'Register New Warehouse'}
                  </h3>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>
                    Configure central storage, cutoff times, and mandi receiving hub
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsWarehouseModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handlePreSaveWarehouse} onKeyDown={(e) => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') e.preventDefault(); }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label className="form-label-title">Hub Code *</label>
                  <input
                    type="text"
                    className="form-input-control"
                    placeholder="e.g. WH-BLR-03"
                    value={warehouseForm.code}
                    onChange={(e) => setWarehouseForm({ ...warehouseForm, code: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="form-label-title">Warehouse Name *</label>
                  <input
                    type="text"
                    className="form-input-control"
                    placeholder="e.g. East Agro Logistics Center"
                    value={warehouseForm.name}
                    onChange={(e) => setWarehouseForm({ ...warehouseForm, name: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Physical Location with Interactive Map & Auto-Detect */}
              <div style={{ marginBottom: '16px' }}>
                <AdminWarehouseLocationMapPicker
                  address={warehouseForm.location}
                  lat={warehouseForm.lat}
                  lng={warehouseForm.lng}
                  onChange={({ address, lat, lng }) => {
                    setWarehouseForm(prev => ({
                      ...prev,
                      location: address,
                      lat,
                      lng
                    }));
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label className="form-label-title">Morning Open Time</label>
                  <input
                    type="time"
                    className="form-input-control"
                    value={warehouseForm.openTime}
                    onChange={(e) => setWarehouseForm({ ...warehouseForm, openTime: e.target.value })}
                  />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <label className="form-label-title" style={{ margin: 0 }}>Daily Order Cut-off Time *</label>
                    <span style={{ fontSize: '10.5px', color: '#059669', fontWeight: 700 }}>Next morning batch close</span>
                  </div>
                  <input
                    type="time"
                    className="form-input-control"
                    value={warehouseForm.cutoffTime}
                    onChange={(e) => setWarehouseForm({ ...warehouseForm, cutoffTime: e.target.value })}
                    required
                  />
                  {/* Quick Cutoff Preset Buttons */}
                  <div style={{ display: 'flex', gap: '5px', marginTop: '6px', flexWrap: 'wrap' }}>
                    {[
                      { time: '20:00', label: '08:00 PM' },
                      { time: '22:00', label: '10:00 PM' },
                      { time: '23:30', label: '11:30 PM (Late Night)' },
                      { time: '02:00', label: '02:00 AM (Dawn Cutoff)' }
                    ].map(preset => (
                      <button
                        key={preset.time}
                        type="button"
                        onClick={() => setWarehouseForm({ ...warehouseForm, cutoffTime: preset.time })}
                        style={{
                          padding: '3px 7px',
                          borderRadius: '5px',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          border: warehouseForm.cutoffTime === preset.time ? '1.5px solid #059669' : '1px solid #CBD5E1',
                          background: warehouseForm.cutoffTime === preset.time ? '#DCFCE7' : '#FFFFFF',
                          color: warehouseForm.cutoffTime === preset.time ? '#166534' : '#475569',
                          cursor: 'pointer'
                        }}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Delivery Slots Configuration & Customization Desk */}
              <div style={{ marginBottom: '16px', background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: '10px', padding: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div>
                    <label className="form-label-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={15} color="#059669" />
                      <span style={{ fontSize: '13px', fontWeight: 800 }}>Customer Delivery Slots & Custom Time Windows</span>
                    </label>
                    <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                      Customize slot names, time windows, and toggle which slots are active for customers at checkout
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={handleResetSlots}
                      title="Reset to 3 Standard Slots"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        border: '1px solid #CBD5E1',
                        background: '#FFFFFF',
                        color: '#64748B',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      <RotateCcw size={12} />
                      Reset
                    </button>
                    <button
                      type="button"
                      onClick={handleAddCustomSlot}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: 'none',
                        background: '#059669',
                        color: '#FFFFFF',
                        fontSize: '11px',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                    >
                      <Plus size={13} />
                      + Add Slot
                    </button>
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {(warehouseForm.slots || DEFAULT_SLOTS).map((slot, index) => {
                    const range = parseRangeTo24(slot.timeWindow);
                    const currentStartTime = slot.startTime || range.start;
                    const currentEndTime = slot.endTime || range.end;

                    return (
                      <div
                        key={slot.id || index}
                        style={{
                          padding: '12px 14px',
                          borderRadius: '10px',
                          background: slot.enabled ? '#FFFFFF' : '#F8FAFC',
                          border: slot.enabled ? '1.5px solid #86EFAC' : '1px solid #CBD5E1',
                          boxShadow: slot.enabled ? '0 1px 3px rgba(0,0,0,0.04)' : 'none',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px'
                        }}
                      >
                        {/* Row 1: Active Checkbox, Clean Slot Name, Time Pickers (From/To Timer), Active Badge, Delete */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                          <input
                            type="checkbox"
                            checked={!!slot.enabled}
                            onChange={() => toggleSlot(slot.id)}
                            style={{ cursor: 'pointer', accentColor: '#059669', width: '18px', height: '18px', flexShrink: 0 }}
                            title="Toggle whether customers can select this slot"
                          />
                          
                          {/* Slot Name Input */}
                          <div style={{ flex: '1 1 200px', minWidth: '180px' }}>
                            <input
                              type="text"
                              className="form-input-control"
                              style={{ fontSize: '13px', padding: '6px 10px', fontWeight: 800, color: slot.enabled ? '#064E3B' : '#64748B' }}
                              value={slot.label}
                              onChange={(e) => handleUpdateSlotField(slot.id, 'label', e.target.value)}
                              placeholder="Slot Title (e.g. Early Dawn Drop)"
                              title="Delivery Slot Title"
                            />
                          </div>

                          {/* Time Pickers (Clock Timers) */}
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: '#F1F5F9',
                            padding: '4px 8px',
                            borderRadius: '8px',
                            border: '1px solid #CBD5E1'
                          }}>
                            <Clock size={14} color="#059669" />
                            <span style={{ fontSize: '11px', color: '#475569', fontWeight: 700 }}>From:</span>
                            <input
                              type="time"
                              value={currentStartTime}
                              onChange={(e) => handleSlotTimeChange(slot.id, 'start', e.target.value)}
                              style={{
                                fontSize: '12px',
                                fontWeight: 700,
                                color: '#0F172A',
                                padding: '3px 6px',
                                borderRadius: '5px',
                                border: '1px solid #CBD5E1',
                                background: '#FFFFFF',
                                cursor: 'pointer'
                              }}
                              title="Delivery Window Start Time"
                            />
                            <span style={{ fontSize: '11px', color: '#475569', fontWeight: 700 }}>To:</span>
                            <input
                              type="time"
                              value={currentEndTime}
                              onChange={(e) => handleSlotTimeChange(slot.id, 'end', e.target.value)}
                              style={{
                                fontSize: '12px',
                                fontWeight: 700,
                                color: '#0F172A',
                                padding: '3px 6px',
                                borderRadius: '5px',
                                border: '1px solid #CBD5E1',
                                background: '#FFFFFF',
                                cursor: 'pointer'
                              }}
                              title="Delivery Window End Time"
                            />
                            <span style={{
                              fontSize: '11.5px',
                              fontWeight: 800,
                              color: '#065F46',
                              background: '#D1FAE5',
                              padding: '3px 8px',
                              borderRadius: '5px',
                              whiteSpace: 'nowrap'
                            }}>
                              {slot.timeWindow}
                            </span>
                          </div>

                          {/* Active / Disabled Status Pill */}
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: '5px',
                            background: slot.enabled ? '#DCFCE7' : '#E2E8F0',
                            color: slot.enabled ? '#166534' : '#64748B',
                            whiteSpace: 'nowrap'
                          }}>
                            {slot.enabled ? 'Active Window' : 'Disabled'}
                          </span>

                          {/* Delete Slot Button */}
                          <button
                            type="button"
                            onClick={() => handleRemoveSlot(slot.id)}
                            title="Delete Delivery Slot"
                            style={{
                              padding: '6px',
                              borderRadius: '6px',
                              border: '1px solid #FECACA',
                              background: '#FEF2F2',
                              color: '#DC2626',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        {/* Row 2: Customer Description Note & Quick Timer Presets */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingLeft: '28px', flexWrap: 'wrap' }}>
                          <div style={{ flex: '1 1 280px' }}>
                            <input
                              type="text"
                              className="form-input-control"
                              style={{ fontSize: '11.5px', padding: '4px 10px', color: '#64748B', background: '#F8FAFC' }}
                              value={slot.desc}
                              onChange={(e) => handleUpdateSlotField(slot.id, 'desc', e.target.value)}
                              placeholder="Instructions shown to customer (e.g. Doorstep drop / Security desk drop)"
                              title="Instructions shown to customer at checkout"
                            />
                          </div>

                          {/* Quick Timer Preset Buttons */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '10.5px', color: '#94A3B8', fontWeight: 600 }}>Quick Presets:</span>
                            {[
                              { label: '🌅 05:30 - 07:00', start: '05:30', end: '07:00' },
                              { label: '☀️ 07:00 - 08:30', start: '07:00', end: '08:30' },
                              { label: '🥗 12:30 - 02:00', start: '12:30', end: '14:00' },
                              { label: '🌆 05:30 - 07:30', start: '17:30', end: '19:30' }
                            ].map(preset => (
                              <button
                                key={preset.label}
                                type="button"
                                onClick={() => handleApplySlotPreset(slot.id, preset.start, preset.end)}
                                style={{
                                  padding: '2px 6px',
                                  fontSize: '10.5px',
                                  fontWeight: 700,
                                  borderRadius: '4px',
                                  border: '1px solid #CBD5E1',
                                  background: '#FFFFFF',
                                  color: '#475569',
                                  cursor: 'pointer'
                                }}
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label className="form-label-title">Handling Capacity (Metric Tons)</label>
                  <input
                    type="number"
                    className="form-input-control"
                    placeholder="40"
                    value={warehouseForm.capacityTons}
                    onChange={(e) => setWarehouseForm({ ...warehouseForm, capacityTons: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="form-label-title">Hub Operational Status *</label>
                  <select
                    className="form-input-control"
                    value={warehouseForm.status || 'ACTIVE'}
                    onChange={(e) => setWarehouseForm({ ...warehouseForm, status: e.target.value })}
                  >
                    <option value="ACTIVE">🟢 ACTIVE (Accepting Orders & Crating)</option>
                    <option value="INACTIVE">🔴 INACTIVE (Hub Paused / Maintenance)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
                <div>
                  <label className="form-label-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>Hub Manager (Lead In-charge)</span>
                    {warehouseForm.managerName && (
                      <span style={{ fontSize: '11px', color: '#059669', fontWeight: 700 }}>Registered Lead</span>
                    )}
                  </label>
                  <select
                    className="form-input-control"
                    value={
                      isCustomManager
                        ? '__custom__'
                        : (employees.find(e => e.name === warehouseForm.managerName || (e.phone && e.phone === warehouseForm.managerPhone))?.id || (warehouseForm.managerName ? '__current__' : ''))
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '__custom__') {
                        setIsCustomManager(true);
                      } else if (val === '__current__') {
                        setIsCustomManager(false);
                      } else if (val === '') {
                        setIsCustomManager(false);
                        setWarehouseForm({ ...warehouseForm, managerName: '', managerPhone: '' });
                      } else {
                        setIsCustomManager(false);
                        const selectedEmp = employees.find(emp => (emp.id === val || emp.uuid === val));
                        if (selectedEmp) {
                          setWarehouseForm({
                            ...warehouseForm,
                            managerName: selectedEmp.name,
                            managerPhone: selectedEmp.phone || warehouseForm.managerPhone || ''
                          });
                        }
                      }
                    }}
                  >
                    <option value="">-- Select Registered Warehouse Manager --</option>
                    {warehouseManagers.length > 0 && (
                      <optgroup label="Warehouse & Procurement Managers">
                        {warehouseManagers.map(emp => (
                          <option key={emp.id || emp.uuid} value={emp.id || emp.uuid}>
                            {emp.name} {emp.phone ? '(' + emp.phone + ')' : ''}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {otherStaff.length > 0 && (
                      <optgroup label="Other Operations Personnel / Super Admins">
                        {otherStaff.map(emp => (
                          <option key={emp.id || emp.uuid} value={emp.id || emp.uuid}>
                            {emp.name} {emp.phone ? '(' + emp.phone + ')' : ''}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {warehouseForm.managerName && !employees.some(e => e.name === warehouseForm.managerName) && (
                      <option value="__current__">
                        {warehouseForm.managerName} (Current Lead)
                      </option>
                    )}
                    <option value="__custom__">+ Custom / External Manager Name...</option>
                  </select>

                  {isCustomManager && (
                    <input
                      type="text"
                      className="form-input-control"
                      placeholder="Enter custom manager name (e.g. Anand Gowda)"
                      style={{ marginTop: '8px' }}
                      value={warehouseForm.managerName}
                      onChange={(e) => setWarehouseForm({ ...warehouseForm, managerName: e.target.value })}
                      autoFocus
                    />
                  )}
                </div>
                <div>
                  <label className="form-label-title">Manager Phone Number</label>
                  <input
                    type="tel"
                    className="form-input-control"
                    placeholder="e.g. +91 98450 11223"
                    value={warehouseForm.managerPhone}
                    onChange={(e) => setWarehouseForm({ ...warehouseForm, managerPhone: e.target.value })}
                  />
                  <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
                    Auto-filled from selected staff profile. Visible to Super Admin.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setIsWarehouseModalOpen(false)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    border: '1.5px solid #CBD5E1',
                    background: '#F8FAFC',
                    color: '#64748B',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '10px 22px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#234B3C',
                    color: '#FFF',
                    fontWeight: 800,
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  {editingWarehouse ? 'Update Warehouse' : 'Save Warehouse'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= HUB STATUS TOGGLE CONFIRMATION POPUP ================= */}
      {statusTargetWarehouse && (
        <div 
          className="admin-modal-overlay" 
          style={{ zIndex: 1200, background: 'rgba(15, 23, 42, 0.72)' }}
        >
          <div 
            className="admin-modal-card" 
            style={{ 
              maxWidth: '480px', 
              border: '2px solid #E2E8F0',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              padding: '24px 26px',
              animation: 'adminModalEnter 0.2s ease-out'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '18px' }}>
              <div style={{ 
                width: '42px', 
                height: '42px', 
                borderRadius: '10px', 
                background: statusTargetWarehouse.status === 'ACTIVE' ? '#FEE2E2' : '#ECFDF5', 
                color: statusTargetWarehouse.status === 'ACTIVE' ? '#DC2626' : '#059669', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <AlertCircle size={22} />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  {statusTargetWarehouse.status === 'ACTIVE' ? 'Pause Fulfillment Hub?' : 'Activate Fulfillment Hub?'}
                </h3>
                <p style={{ fontSize: '13px', color: '#475569', marginTop: '6px', marginBottom: 0, lineHeight: 1.45 }}>
                  {statusTargetWarehouse.status === 'ACTIVE' ? (
                    <>
                      Are you sure you want to pause <strong>{statusTargetWarehouse.name}</strong> ({statusTargetWarehouse.code || statusTargetWarehouse.id})? Morning crate deliveries for <strong>{societies.filter(s => s.warehouseId === statusTargetWarehouse.id).length} mapped apartment societies</strong> will be temporarily paused.
                    </>
                  ) : (
                    <>
                      Are you sure you want to activate <strong>{statusTargetWarehouse.name}</strong> ({statusTargetWarehouse.code || statusTargetWarehouse.id})? Morning crating dispatch and order checkout will immediately resume for all mapped apartment communities.
                    </>
                  )}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '22px' }}>
              <button
                type="button"
                onClick={() => setStatusTargetWarehouse(null)}
                disabled={isUpdatingStatus}
                style={{
                  padding: '10px 18px',
                  borderRadius: '8px',
                  border: '1.5px solid #CBD5E1',
                  background: '#FFFFFF',
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
                onClick={handleConfirmToggleWarehouseStatus}
                disabled={isUpdatingStatus}
                style={{
                  padding: '10px 22px',
                  borderRadius: '8px',
                  border: 'none',
                  background: statusTargetWarehouse.status === 'ACTIVE' ? '#DC2626' : '#059669',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                {isUpdatingStatus 
                  ? 'Updating...' 
                  : statusTargetWarehouse.status === 'ACTIVE' 
                    ? 'Yes, Pause Hub' 
                    : 'Yes, Activate Hub'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= CONFIRMATION POPUP MODAL (YES / NO) ================= */}
      {isConfirmModalOpen && (
        <div 
          className="admin-modal-overlay" 
          style={{ zIndex: 1100, background: 'rgba(15, 23, 42, 0.72)' }}
        >
          <div 
            className="admin-modal-card" 
            style={{ 
              maxWidth: '500px', 
              border: '2px solid #E2E8F0',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              padding: '24px 26px',
              animation: 'adminModalEnter 0.2s ease-out'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '18px' }}>
              <div style={{ 
                width: '42px', 
                height: '42px', 
                borderRadius: '10px', 
                background: '#FEF3C7', 
                color: '#D97706', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <HelpCircle size={22} />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  {editingWarehouse ? 'Confirm Warehouse Updates?' : 'Confirm Warehouse Registration?'}
                </h3>
                <p style={{ fontSize: '12.5px', color: '#64748B', marginTop: '4px', marginBottom: 0, lineHeight: 1.4 }}>
                  Please review the mandi receiving address and hub details before saving:
                </p>
              </div>
            </div>

            {/* Warehouse Summary Review Card */}
            <div style={{ 
              background: '#F8FAFC', 
              borderRadius: '10px', 
              border: '1.5px solid #E2E8F0', 
              padding: '14px 16px', 
              marginBottom: '20px',
              fontSize: '12.5px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px dashed #CBD5E1' }}>
                <span style={{ color: '#64748B', fontWeight: 600 }}>Hub Name & Code:</span>
                <span style={{ color: '#0F172A', fontWeight: 800 }}>
                  {warehouseForm.name} ({warehouseForm.code})
                </span>
              </div>

              <div style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px dashed #CBD5E1' }}>
                <div style={{ color: '#64748B', fontWeight: 600, marginBottom: '2px' }}>Receiving Location:</div>
                <div style={{ color: '#1E293B', fontWeight: 700, lineHeight: 1.35 }}>
                  {warehouseForm.location}
                </div>
                {warehouseForm.lat && warehouseForm.lng && (
                  <div style={{ fontSize: '11px', color: '#059669', fontWeight: 700, marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={11} />
                    GPS: {Number(warehouseForm.lat).toFixed(4)}° N, {Number(warehouseForm.lng).toFixed(4)}° E
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px dashed #CBD5E1' }}>
                <div>
                  <span style={{ color: '#64748B', fontWeight: 600, display: 'block', fontSize: '11px' }}>Daily Cut-off:</span>
                  <span style={{ color: '#B45309', fontWeight: 800 }}>{warehouseForm.cutoffTime}</span>
                </div>
                <div>
                  <span style={{ color: '#64748B', fontWeight: 600, display: 'block', fontSize: '11px' }}>Capacity:</span>
                  <span style={{ color: '#0F172A', fontWeight: 800 }}>{warehouseForm.capacityTons} Tons</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B', fontWeight: 600 }}>Manager:</span>
                <span style={{ color: '#334155', fontWeight: 700 }}>
                  {warehouseForm.managerName || 'Unassigned'} {warehouseForm.managerPhone ? `(${warehouseForm.managerPhone})` : ''}
                </span>
              </div>
            </div>

            {/* Action Buttons: No vs Yes */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                style={{
                  flex: 1,
                  padding: '11px 16px',
                  borderRadius: '8px',
                  border: '1.5px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <X size={15} />
                <span>No, Keep Editing</span>
              </button>

              <button
                type="button"
                onClick={handleConfirmCommitSave}
                style={{
                  flex: 1,
                  padding: '11px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#234B3C',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(35, 75, 60, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <CheckCircle2 size={16} />
                <span>Yes, Confirm & Save</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
