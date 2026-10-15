import React, { useState } from 'react';
import { 
  Store, 
  Plus, 
  Search, 
  MapPin, 
  Phone, 
  CreditCard, 
  Building2, 
  FileText, 
  CheckCircle2, 
  X, 
  Edit3, 
  Trash2, 
  Copy, 
  ExternalLink,
  DollarSign,
  AlertTriangle
} from 'lucide-react';
import { useAdminRole } from '../context/AdminRoleContext';
import { useToast } from '../context/ToastContext';
import { saveFreshiozStore, generateId, generateUUID } from '../shared/freshiozStore';
import AdminPagination from '../components/common/AdminPagination';
import AdminWarehouseLocationMapPicker from '../components/common/AdminWarehouseLocationMapPicker';

export default function VendorsDirectoryPage() {
  const { store, currentUser } = useAdminRole();
  const { showToast } = useToast();

  const vendors = store.vendors || [];
  const procurementLogs = store.procurementLogs || [];

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [vendorToDelete, setVendorToDelete] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    mandiLocation: '',
    lat: 12.9716,
    lng: 77.5946,
    category: 'VEGETABLES',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    branch: '',
    upiId: ''
  });

  const resetForm = () => {
    setFormData({
      name: '',
      contactPerson: '',
      phone: '',
      mandiLocation: '',
      lat: 12.9716,
      lng: 77.5946,
      category: 'VEGETABLES',
      bankName: '',
      accountNumber: '',
      ifscCode: '',
      branch: '',
      upiId: ''
    });
    setEditingVendor(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (v) => {
    setEditingVendor(v);
    setFormData({
      name: v.name || '',
      contactPerson: v.contactPerson || '',
      phone: v.phone || '',
      mandiLocation: v.mandiLocation || '',
      lat: Number(v.lat) || 12.9716,
      lng: Number(v.lng) || 77.5946,
      category: v.category || 'VEGETABLES',
      bankName: v.bankDetails?.bankName || '',
      accountNumber: v.bankDetails?.accountNumber || '',
      ifscCode: v.bankDetails?.ifscCode || '',
      branch: v.bankDetails?.branch || '',
      upiId: v.bankDetails?.upiId || ''
    });
    setIsModalOpen(true);
  };

  const handleSaveVendor = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      showToast('Please enter vendor name and phone number', 'error');
      return;
    }

    const vendorPayload = {
      id: editingVendor ? editingVendor.id : generateId('FRZ_VEN'),
      uuid: editingVendor?.uuid || generateUUID(),
      name: formData.name.trim(),
      contactPerson: formData.contactPerson.trim(),
      phone: formData.phone.trim(),
      mandiLocation: formData.mandiLocation.trim(),
      lat: Number(formData.lat) || 12.9716,
      lng: Number(formData.lng) || 77.5946,
      category: formData.category,
      bankDetails: {
        bankName: formData.bankName.trim(),
        accountNumber: formData.accountNumber.trim(),
        ifscCode: formData.ifscCode.trim().toUpperCase(),
        branch: formData.branch.trim(),
        upiId: formData.upiId.trim()
      },
      status: 'ACTIVE',
      totalBills: editingVendor ? editingVendor.totalBills || 0 : 0,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser?.name || 'Super Admin',
      updatedById: currentUser?.id || 'emp-101',
      ...(editingVendor ? {} : {
        createdAt: new Date().toISOString(),
        createdBy: currentUser?.name || 'Super Admin',
        createdById: currentUser?.id || 'emp-101'
      })
    };

    saveFreshiozStore(prev => {
      const currentVendors = prev.vendors || [];
      if (editingVendor) {
        return {
          ...prev,
          vendors: currentVendors.map(v => v.id === editingVendor.id ? { ...v, ...vendorPayload } : v)
        };
      } else {
        return {
          ...prev,
          vendors: [vendorPayload, ...currentVendors]
        };
      }
    });

    setIsModalOpen(false);
    resetForm();
    showToast(editingVendor ? 'Vendor details updated successfully!' : 'New Vendor registered successfully!', 'success');
  };

  const handleConfirmDelete = () => {
    if (!vendorToDelete) return;
    saveFreshiozStore(prev => ({
      ...prev,
      vendors: (prev.vendors || []).filter(v => v.id !== vendorToDelete.id)
    }));
    showToast(`Vendor ${vendorToDelete.name} removed.`, 'info');
    setVendorToDelete(null);
  };

  const handleCopyText = (text, label) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} copied to clipboard!`, 'success');
  };

  // Filter vendors
  const filteredVendors = vendors.filter(v => {
    const matchesSearch = 
      (v.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.contactPerson || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.phone || '').includes(searchTerm) ||
      (v.mandiLocation || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCat = selectedCategory === 'ALL' || v.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const paginatedVendors = filteredVendors.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Calculate totals
  const totalVendors = vendors.length;
  const totalMandiSpend = procurementLogs.reduce((acc, l) => acc + (l.totalAmountPaid || 0), 0);

  return (
    <div className="admin-page-container">
      {/* Top Header */}
      <div className="page-title-header" style={{ marginBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '19px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            Vendors & Mandi Commission Agents Master
          </h1>
          <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>
            Direct agricultural suppliers, APMC mandi commission agents, FPOs & verified settlement bank accounts
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="admin-btn-accent"
          style={{ fontSize: '13px', padding: '8px 16px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <Plus size={16} />
          <span>+ Add Vendor / Mandi Agent</span>
        </button>
      </div>

      {/* KPI Cards Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
        <div className="admin-stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#EBF2EE', color: '#234B3C', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Store size={20} />
            </div>
            <div>
              <div style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 700 }}>Total Registered Vendors</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>{totalVendors}</div>
            </div>
          </div>
        </div>

        <div className="admin-stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#FEF3C7', color: '#B45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MapPin size={20} />
            </div>
            <div>
              <div style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 700 }}>Primary Mandi Yards</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>Kolar, Shimla, Hosur</div>
            </div>
          </div>
        </div>

        <div className="admin-stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#DCFCE7', color: '#15803D', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CreditCard size={20} />
            </div>
            <div>
              <div style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 700 }}>Total Mandi Invoiced</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#059669' }}>₹{totalMandiSpend.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div style={{
        background: '#FFFFFF',
        border: '1.5px solid #E2E8F0',
        borderRadius: '10px',
        padding: '10px 14px',
        marginBottom: '14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '240px' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '320px' }}>
            <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
            <input
              type="text"
              placeholder="Search vendor, contact, phone, mandi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', height: '36px', paddingLeft: '32px', paddingRight: '10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12.5px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            {['ALL', 'VEGETABLES', 'FRUITS'].map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: selectedCategory === cat ? 'none' : '1px solid #CBD5E1',
                  background: selectedCategory === cat ? '#234B3C' : '#FFFFFF',
                  color: selectedCategory === cat ? '#FFFFFF' : '#475569'
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
          Showing <strong>{filteredVendors.length}</strong> of {totalVendors} Vendors
        </span>
      </div>

      {/* Vendors Table */}
      <div className="admin-table-card">
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>Vendor / Agency Name</th>
                <th>Contact Person & Phone</th>
                <th>APMC Mandi Yard / Location</th>
                <th>Category</th>
                <th>Bank & Settlement Info</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVendors.length === 0 ? (
                <tr>
                  <td colSpan="6">
                    <div className="admin-empty-state">
                      <div className="admin-empty-state-icon">
                        <Store size={22} />
                      </div>
                      <div className="admin-empty-state-title">No Vendors Found</div>
                      <div className="admin-empty-state-desc">
                        Click "+ Add Vendor / Mandi Agent" above to register an APMC trader or direct farmer with bank details.
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedVendors.map(vendor => (
                  <tr key={vendor.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#234B3C', fontWeight: 800, fontSize: '12px' }}>
                          {vendor.name.charAt(0)}
                        </div>
                        <div>
                          <strong style={{ fontSize: '13.5px', color: '#0F172A' }}>{vendor.name}</strong>
                          <div style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace' }}>ID: {vendor.id}</div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>{vendor.contactPerson || 'Proprietor'}</div>
                      <a href={`tel:${vendor.phone}`} style={{ fontSize: '12px', color: '#0284C7', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                        <Phone size={11} />
                        <span>+91 {vendor.phone}</span>
                      </a>
                    </td>

                    <td>
                      <div style={{ fontSize: '12.5px', color: '#334155', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={12} color="#64748B" />
                        <span>{vendor.mandiLocation}</span>
                      </div>
                    </td>

                    <td>
                      <span style={{ fontSize: '11px', background: '#EBF2EE', color: '#234B3C', fontWeight: 700, padding: '2px 8px', borderRadius: '4px' }}>
                        {vendor.category}
                      </span>
                    </td>

                    <td>
                      {vendor.bankDetails?.accountNumber ? (
                        <div style={{ fontSize: '12px', background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '6px 10px', borderRadius: '6px', maxWidth: '240px' }}>
                          <div style={{ fontWeight: 700, color: '#0F172A' }}>{vendor.bankDetails.bankName || 'Direct Bank'}</div>
                          <div style={{ color: '#475569', fontFamily: 'monospace', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span>A/C: {vendor.bankDetails.accountNumber}</span>
                            <button
                              type="button"
                              onClick={() => handleCopyText(vendor.bankDetails.accountNumber, 'Account Number')}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: '2px' }}
                              title="Copy Account Number"
                            >
                              <Copy size={11} />
                            </button>
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>
                            IFSC: <strong>{vendor.bankDetails.ifscCode}</strong>
                          </div>
                          {vendor.bankDetails.upiId && (
                            <div style={{ fontSize: '11px', color: '#059669', fontWeight: 600, marginTop: '2px' }}>
                              UPI: {vendor.bankDetails.upiId}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: '11.5px', color: '#94A3B8' }}>No Bank Info Logged</span>
                      )}
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(vendor)}
                          style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', padding: '5px 8px', borderRadius: '6px', cursor: 'pointer', color: '#334155' }}
                          title="Edit Vendor"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setVendorToDelete(vendor)}
                          style={{ background: '#FEE2E2', border: '1px solid #FECACA', padding: '5px 8px', borderRadius: '6px', cursor: 'pointer', color: '#DC2626' }}
                          title="Delete Vendor"
                        >
                          <Trash2 size={13} />
                        </button>
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
          totalItems={filteredVendors.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          itemLabel="vendors"
        />
      </div>

      {/* ADD / EDIT VENDOR MODAL */}
      {isModalOpen && (
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
            maxWidth: '560px',
            width: '100%',
            padding: '24px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            border: '1.5px solid #E2E8F0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#EBF2EE', color: '#234B3C', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Store size={18} />
                </div>
                <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  {editingVendor ? 'Edit Vendor / Mandi Agent' : 'Register New Vendor / Mandi Agent'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveVendor}>
              {/* Basic Information */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: '#234B3C', letterSpacing: '0.5px', marginBottom: '8px' }}>
                  1. Business & Contact Info
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '4px', color: '#334155' }}>
                      Vendor / Trader Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Sri Manjunatha Agro Traders"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '6px', border: '1.5px solid #CBD5E1', fontSize: '13px' }}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '4px', color: '#334155' }}>
                      Contact Person *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Manjunath Gowda"
                      value={formData.contactPerson}
                      onChange={(e) => setFormData(prev => ({ ...prev, contactPerson: e.target.value }))}
                      style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '6px', border: '1.5px solid #CBD5E1', fontSize: '13px' }}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '4px', color: '#334155' }}>
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. 9845088991"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '6px', border: '1.5px solid #CBD5E1', fontSize: '13px' }}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '4px', color: '#334155' }}>
                      Primary Crop Category
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '6px', border: '1.5px solid #CBD5E1', fontSize: '13px' }}
                    >
                      <option value="VEGETABLES">Fresh Vegetables</option>
                      <option value="FRUITS">Seasonal Fruits</option>
                      <option value="LEAFY_GREENS">Leafy Greens & Herbs</option>
                      <option value="EXOTIC">Exotic & Salads</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginTop: '12px' }}>
                  <AdminWarehouseLocationMapPicker
                    address={formData.mandiLocation}
                    lat={formData.lat}
                    lng={formData.lng}
                    onChange={({ address, lat, lng }) => {
                      setFormData(prev => ({
                        ...prev,
                        mandiLocation: address,
                        lat,
                        lng
                      }));
                    }}
                  />
                </div>
              </div>

              {/* Settlement Bank Details */}
              <div style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: '10px', padding: '14px', marginBottom: '20px' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: '#0284C7', letterSpacing: '0.5px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CreditCard size={15} />
                  <span>2. Settlement Bank & UPI Details</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '11.5px', fontWeight: 700, display: 'block', marginBottom: '3px', color: '#475569' }}>Bank Name</label>
                    <input
                      type="text"
                      placeholder="e.g. State Bank of India"
                      value={formData.bankName}
                      onChange={(e) => setFormData(prev => ({ ...prev, bankName: e.target.value }))}
                      style={{ width: '100%', height: '36px', padding: '0 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12.5px' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '11.5px', fontWeight: 700, display: 'block', marginBottom: '3px', color: '#475569' }}>Account Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 30918274910"
                      value={formData.accountNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, accountNumber: e.target.value }))}
                      style={{ width: '100%', height: '36px', padding: '0 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12.5px', fontFamily: 'monospace' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '11.5px', fontWeight: 700, display: 'block', marginBottom: '3px', color: '#475569' }}>IFSC Code</label>
                    <input
                      type="text"
                      placeholder="e.g. SBIN0004012"
                      value={formData.ifscCode}
                      onChange={(e) => setFormData(prev => ({ ...prev, ifscCode: e.target.value.toUpperCase() }))}
                      style={{ width: '100%', height: '36px', padding: '0 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12.5px', fontFamily: 'monospace' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '11.5px', fontWeight: 700, display: 'block', marginBottom: '3px', color: '#475569' }}>UPI ID (Instant Settlement)</label>
                    <input
                      type="text"
                      placeholder="e.g. manjunatha@sbi"
                      value={formData.upiId}
                      onChange={(e) => setFormData(prev => ({ ...prev, upiId: e.target.value }))}
                      style={{ width: '100%', height: '36px', padding: '0 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12.5px' }}
                    />
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFF', color: '#475569', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn-accent"
                  style={{ padding: '9px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 700 }}
                >
                  {editingVendor ? 'Save Changes' : 'Register Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {vendorToDelete && (
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
          <div style={{ background: '#FFFFFF', borderRadius: '14px', maxWidth: '420px', width: '100%', padding: '20px', border: '1.5px solid #E2E8F0' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: '0 0 8px' }}>
              Remove Vendor {vendorToDelete.name}?
            </h3>
            <p style={{ fontSize: '13px', color: '#475569', margin: '0 0 16px', lineHeight: 1.5 }}>
              Are you sure you want to remove this vendor from the active APMC directory? Existing historical purchase logs will remain preserved.
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setVendorToDelete(null)}
                style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFF', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#DC2626', color: '#FFF', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer' }}
              >
                Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
