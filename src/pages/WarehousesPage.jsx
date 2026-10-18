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
  HelpCircle
} from 'lucide-react';
import { useAdminRole } from '../context/AdminRoleContext';
import { warehouses as warehouseResource, societies as societyResource } from '../hooks/resources';
import { useToast } from '../context/ToastContext';
import { exportToExcel } from '../utils/excelExporter';
import AdminWarehouseLocationMapPicker from '../components/common/AdminWarehouseLocationMapPicker';

export default function WarehousesPage() {
  const { currentUser } = useAdminRole();
  const { showToast } = useToast();

  const { data: rawWarehouses = [], isLoading: isLoadingWarehouses } = warehouseResource.useList();
  const { data: rawSocieties = [] } = societyResource.useList();

  const warehouses = Array.isArray(rawWarehouses) ? rawWarehouses : [];
  const societies = Array.isArray(rawSocieties) ? rawSocieties : [];
  const isLoading = isLoadingWarehouses;

  const createWarehouseMutation = warehouseResource.useCreate();
  const updateWarehouseMutation = warehouseResource.useUpdate();

  // Modals state
  const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  // Warehouse Form State with Lat / Lng Coordinates
  const [warehouseForm, setWarehouseForm] = useState({
    code: '',
    name: '',
    location: '',
    lat: 17.7231,
    lng: 83.3013,
    openTime: '05:00',
    cutoffTime: '21:00',
    capacityTons: 40,
    managerName: '',
    managerPhone: '',
    status: 'ACTIVE'
  });

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
        wh.managerPhone || '+91 9999999999',
        whSocCount,
        wh.status || 'ACTIVE'
      ];
    });

    exportToExcel('Freshioz_Warehouses_Directory', headers, rows);
  };

  const isSuperAdmin = currentUser?.roles?.includes('SUPER_ADMIN') || currentUser?.role === 'SUPER_ADMIN';

  // ================= WAREHOUSE MODAL HANDLERS =================
  const handleOpenAddWarehouse = () => {
    if (!isSuperAdmin) {
      showToast('Restricted: Only Super Admin can register new physical warehouses.', 'error');
      return;
    }
    setEditingWarehouse(null);
    setWarehouseForm({
      code: '',
      name: '',
      location: '',
      lat: 13.0358,
      lng: 77.5970,
      openTime: '05:00',
      cutoffTime: '21:00',
      capacityTons: 40,
      managerName: '',
      managerPhone: '',
      status: 'ACTIVE'
    });
    setIsWarehouseModalOpen(true);
  };

  const handleOpenEditWarehouse = (wh) => {
    setEditingWarehouse(wh);
    setWarehouseForm({
      code: wh.code || wh.id,
      name: wh.name,
      location: wh.location || '',
      lat: wh.lat || 13.0358,
      lng: wh.lng || 77.5970,
      openTime: wh.openTime || '05:00',
      cutoffTime: wh.cutoffTime || '21:00',
      capacityTons: wh.capacityTons || 40,
      managerName: wh.managerName || '',
      managerPhone: wh.managerPhone || '',
      status: wh.status || 'ACTIVE'
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
              {warehouses.length} Active Hubs
            </span>
          </div>

          {/* Compact Inline Stats Strip */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '11.5px', color: '#64748B', marginTop: '3px', flexWrap: 'wrap' }}>
            <span>• <strong>{societies.length}</strong> Covered Communities & Hostels</span>
            <span>• Total Handling Capacity: <strong style={{ color: '#059669' }}>{warehouses.reduce((acc, w) => acc + (w.capacityTons || 35), 0)} Tons</strong></span>
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
              <span>Regional Warehouses & Logistics Hubs ({warehouses.length})</span>
            </h3>
            <p style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
              Direct Agri-Logistics Sorting & Crating Hubs serving registered apartment communities and hostels.
            </p>
          </div>

          <div style={{ fontSize: '12px', color: '#0369A1', fontWeight: 700, background: '#E0F2FE', padding: '4px 10px', borderRadius: '6px' }}>
            {warehouses.length} Active Hubs
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
              ) : warehouses.length === 0 ? (
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
                warehouses.map(wh => {
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
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#FEF3C7', color: '#B45309', padding: '2px 7px', borderRadius: '5px', fontSize: '11.5px', fontWeight: 700 }}>
                        <Clock size={11} />
                        <span>{wh.cutoffTime || '21:00'}</span>
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
                          ({wh.managerPhone || '+91 98450 11223'})
                        </span>
                      </div>
                    </td>

                    <td>
                      <span className={`status-pill ${wh.status === 'ACTIVE' ? 'approved' : 'rejected'}`}>
                        {wh.status || 'ACTIVE'}
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
                  <label className="form-label-title">Daily Order Cut-off Time *</label>
                  <input
                    type="time"
                    className="form-input-control"
                    value={warehouseForm.cutoffTime}
                    onChange={(e) => setWarehouseForm({ ...warehouseForm, cutoffTime: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label className="form-label-title">Handling Capacity (Metric Tons)</label>
                <input
                  type="number"
                  className="form-input-control"
                  placeholder="40"
                  value={warehouseForm.capacityTons}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, capacityTons: Number(e.target.value) })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
                <div>
                  <label className="form-label-title">Hub Manager Name</label>
                  <input
                    type="text"
                    className="form-input-control"
                    placeholder="e.g. Anand Gowda"
                    value={warehouseForm.managerName}
                    onChange={(e) => setWarehouseForm({ ...warehouseForm, managerName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label-title">Manager Phone</label>
                  <input
                    type="tel"
                    className="form-input-control"
                    placeholder="e.g. +91 98450 11223"
                    value={warehouseForm.managerPhone}
                    onChange={(e) => setWarehouseForm({ ...warehouseForm, managerPhone: e.target.value })}
                  />
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
