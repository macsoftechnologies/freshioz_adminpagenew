import React, { useState, useMemo, useEffect } from 'react';
import { 
  Building2, 
  Users, 
  Phone, 
  ShoppingBag, 
  Search, 
  ChevronRight, 
  X, 
  GraduationCap, 
  Coins
} from 'lucide-react';
import { useAdminRole } from '../context/AdminRoleContext';
import AdminPagination from '../components/common/AdminPagination';

export default function SocietiesDirectoryPage() {
  const { store, currentUser, currentRoleId } = useAdminRole();
  const rawSocieties = store.societies || [];
  const orders = store.orders || [];
  const warehouses = store.warehouses || [];

  const isSuperAdmin = currentUser?.roles?.includes('SUPER_ADMIN') || currentUser?.role === 'SUPER_ADMIN' || currentUser?.email === 'superadmin@gmail.com';
  const isSalesOfficer = currentRoleId === 'SALES_OFFICER' || currentUser?.role === 'SALES_OFFICER';
  const assignedWhId = currentUser?.assignedWarehouseId;
  const isWarehouseScoped = !isSuperAdmin && assignedWhId && assignedWhId !== 'ALL';

  const resolvedWh = useMemo(() => {
    if (!warehouses || warehouses.length === 0) return null;
    if (assignedWhId && assignedWhId !== 'ALL') {
      const match = warehouses.find(w => w.id === assignedWhId || w.code === assignedWhId || w.uuid === assignedWhId);
      if (match) return match;
    }
    return null;
  }, [warehouses, assignedWhId]);

  // Scoped societies:
  // - Sales Officer: Only societies they personally onboarded / lead
  // - Warehouse Manager / Staff: Only societies assigned to their regional warehouse hub
  // - Super Admin: All societies
  const societies = useMemo(() => {
    if (isSuperAdmin) return rawSocieties;

    if (isSalesOfficer) {
      return rawSocieties.filter(s => {
        const matchCreator = s.createdById && (s.createdById === currentUser?.id || s.createdById === currentUser?.uuid);
        const matchPhone = s.salesRepPhone && currentUser?.phone && s.salesRepPhone.replace(/\D/g, '') === currentUser.phone.replace(/\D/g, '');
        const matchName = s.salesRepName && currentUser?.name && s.salesRepName.toLowerCase() === currentUser.name.toLowerCase();
        const matchSecretary = s.secretaryPhone && currentUser?.phone && s.secretaryPhone.replace(/\D/g, '') === currentUser.phone.replace(/\D/g, '');
        if (matchCreator || matchPhone || matchName || matchSecretary) return true;

        if (!s.createdById && !s.salesRepPhone && !s.salesRepName && isWarehouseScoped) {
          return s.warehouseId === assignedWhId || s.warehouseId === resolvedWh?.code || s.warehouseId === resolvedWh?.uuid;
        }
        return false;
      });
    }

    if (isWarehouseScoped) {
      return rawSocieties.filter(s => {
        return s.warehouseId === assignedWhId || s.warehouseId === resolvedWh?.code || s.warehouseId === resolvedWh?.uuid;
      });
    }

    return rawSocieties;
  }, [rawSocieties, isSuperAdmin, isSalesOfficer, isWarehouseScoped, currentUser, assignedWhId, resolvedWh]);

  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'APARTMENT' | 'HOSTEL' | 'VILLA'
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'APPROVED' | 'PENDING'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSociety, setSelectedSociety] = useState(null);
  const [detailTab, setDetailTab] = useState('RESIDENTS'); // 'RESIDENTS' | 'ORDERS' | 'BANK'
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Helper: match an order to a society by id, uuid, or exact name
  const isOrderForSociety = (order, society) => {
    if (!order || !society) return false;
    if (order.societyId && (order.societyId === society.id || (society.uuid && order.societyId === society.uuid))) {
      return true;
    }
    if (order.societyName && society.name && order.societyName.trim().toLowerCase() === society.name.trim().toLowerCase()) {
      return true;
    }
    return false;
  };

  const getOrdersForSociety = (society) => {
    if (!society) return [];
    return orders.filter(o => isOrderForSociety(o, society));
  };

  // Extract all registered residents from society.users, store.users, and store.orders
  const getResidentsForSociety = (societyOrId) => {
    const society = typeof societyOrId === 'object'
      ? societyOrId
      : societies.find(s => s.id === societyOrId || s.uuid === societyOrId);
    if (!society) return [];

    const residentMap = new Map();

    // 1. From society.users (if embedded from backend)
    if (Array.isArray(society.users)) {
      society.users.forEach(u => {
        const key = u.phone || u.id;
        if (!key) return;
        residentMap.set(key, {
          name: u.name || 'Resident',
          phone: u.phone || '—',
          email: u.email || '—',
          flatNo: u.flatNo || 'Assigned Flat',
          registeredAt: u.registeredAt ? new Date(u.registeredAt).toLocaleDateString('en-GB') : 'Verified',
          ordersCount: 0,
          totalSpent: 0
        });
      });
    }

    // 2. From store.users
    (store.users || []).forEach(u => {
      if (u.societyId === society.id || (society.uuid && u.societyId === society.uuid)) {
        const key = u.phone || u.id;
        if (!key) return;
        residentMap.set(key, {
          name: u.name || 'Resident',
          phone: u.phone || '—',
          email: u.email || '—',
          flatNo: u.flatNo || 'Assigned Flat',
          registeredAt: u.registeredAt ? new Date(u.registeredAt).toLocaleDateString('en-GB') : 'Verified',
          ordersCount: 0,
          totalSpent: 0
        });
      }
    });

    // 3. From store.orders
    orders.forEach(o => {
      if (isOrderForSociety(o, society) && (o.userPhone || o.userId || o.userName)) {
        const key = o.userPhone || o.userId || o.userName;
        const existing = residentMap.get(key) || {
          name: o.userName || 'Resident',
          phone: o.userPhone || '—',
          email: '—',
          flatNo: o.flatNo || 'Assigned Flat',
          registeredAt: o.orderPlacedAt || o.createdAt ? new Date(o.orderPlacedAt || o.createdAt).toLocaleDateString('en-GB') : 'Active',
          ordersCount: 0,
          totalSpent: 0
        };

        existing.ordersCount += 1;
        existing.totalSpent += (Number(o.totalAmount) || 0);
        if (o.flatNo) existing.flatNo = o.flatNo;
        if (o.userName && existing.name === 'Resident') existing.name = o.userName;
        residentMap.set(key, existing);
      }
    });

    return Array.from(residentMap.values());
  };

  // Format commission label cleanly without fake 3.5% fallback on PENDING societies
  const formatCommissionLabel = (s) => {
    if (!s) return '0%';
    if (s.status === 'PENDING') return 'Pending Approval';
    if (s.status === 'REJECTED') return 'Rejected';
    const val = Number(s.commissionValue ?? 0);
    if (s.commissionType === 'FLAT' || s.commissionType === 'FIXED_PER_ORDER') {
      return `₹${val} / order`;
    }
    return `${val}% Cashback`;
  };

  // Filter societies based on category, status, and search query
  const filteredSocieties = useMemo(() => {
    return societies.filter(s => {
      if (activeTab !== 'ALL' && s.type !== activeTab) return false;
      if (statusFilter !== 'ALL' && (s.status || 'APPROVED') !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = s.name?.toLowerCase().includes(q);
        const matchId = s.id?.toLowerCase().includes(q);
        const matchAddress = s.address?.toLowerCase().includes(q);
        const matchSec = s.secretaryName?.toLowerCase().includes(q);
        const residents = getResidentsForSociety(s);
        const matchResident = residents.some(r =>
          (r.name || '').toLowerCase().includes(q) ||
          (r.phone || '').includes(q) ||
          (r.flatNo || '').toLowerCase().includes(q)
        );
        if (!matchName && !matchId && !matchAddress && !matchSec && !matchResident) return false;
      }
      return true;
    });
  }, [societies, activeTab, statusFilter, searchQuery, orders, store.users]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, statusFilter, searchQuery]);

  const paginatedSocieties = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSocieties.slice(start, start + pageSize);
  }, [filteredSocieties, currentPage, pageSize]);

  // Scoped community metrics
  const totalFlats = societies.reduce((acc, s) => acc + (Number(s.totalUnits) || 0), 0);
  const allUniqueResidents = new Set();
  let scopedOrdersCount = 0;
  societies.forEach(s => {
    getResidentsForSociety(s).forEach(r => allUniqueResidents.add(r.phone || r.name));
    scopedOrdersCount += getOrdersForSociety(s).length;
  });

  // Resolve selected society bank details safely (no hardcoded fake Axis Bank fallbacks)
  const selectedBankName = selectedSociety?.bankName || selectedSociety?.bankDetails?.bankName || '';
  const selectedAccountHolder = selectedSociety?.accountHolder || selectedSociety?.bankDetails?.accountHolder || '';
  const selectedAccountNumber = selectedSociety?.accountNumber || selectedSociety?.bankDetails?.accountNumber || '';
  const selectedIfscCode = selectedSociety?.ifscCode || selectedSociety?.bankDetails?.ifscCode || '';
  const selectedBranch = selectedSociety?.branch || selectedSociety?.bankDetails?.branch || '';
  const hasBankDetails = Boolean(selectedBankName || selectedAccountNumber || selectedIfscCode);

  const selectedResidents = selectedSociety ? getResidentsForSociety(selectedSociety) : [];
  const selectedOrders = selectedSociety ? getOrdersForSociety(selectedSociety) : [];

  return (
    <div className="admin-page-container">
      {/* Compact Header & Scoped Summary Pills */}
      <div className="page-title-header" style={{ marginBottom: '10px', gap: '8px' }}>
        <h1 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Building2 size={18} color="#234B3C" />
          <span>{isSalesOfficer ? '4. Societies Directory' : 'Societies & Resident Directory'}</span>
        </h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {isSalesOfficer && (
            <span style={{ fontSize: '11px', background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', padding: '2px 8px', borderRadius: '6px', fontWeight: 800 }}>
              👤 {currentUser?.name || 'Sales Officer'}
            </span>
          )}
          {!isSalesOfficer && isWarehouseScoped && resolvedWh && (
            <span style={{ fontSize: '11px', background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', padding: '2px 8px', borderRadius: '6px', fontWeight: 800 }}>
              🏢 {resolvedWh.code} — {resolvedWh.name}
            </span>
          )}
          <span style={{ fontSize: '11px', background: '#EBF2EE', color: '#234B3C', padding: '3px 8px', borderRadius: '6px', fontWeight: 800 }}>
            🏢 {societies.length} Communities
          </span>
          <span style={{ fontSize: '11px', background: '#F0F9FF', color: '#0369A1', padding: '3px 8px', borderRadius: '6px', fontWeight: 800 }}>
            🚪 {totalFlats} Flats
          </span>
          <span style={{ fontSize: '11px', background: '#FEF3C7', color: '#B45309', padding: '3px 8px', borderRadius: '6px', fontWeight: 800 }}>
            👥 {allUniqueResidents.size} Residents
          </span>
          <span style={{ fontSize: '11px', background: '#F1F5F9', color: '#334155', padding: '3px 8px', borderRadius: '6px', fontWeight: 800 }}>
            📦 {scopedOrdersCount} Orders
          </span>
        </div>
      </div>

      {/* Compact Filter Tabs & Search Bar */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '10px',
        border: '1px solid #E2E8F0',
        padding: '10px 12px',
        marginBottom: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        {/* Type & Status Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
          {[
            { id: 'ALL', label: 'All', count: societies.length },
            { id: 'APARTMENT', label: 'Apartments', count: societies.filter(s => s.type === 'APARTMENT').length },
            { id: 'HOSTEL', label: 'Hostels', count: societies.filter(s => s.type === 'HOSTEL').length },
            { id: 'VILLA', label: 'Villas', count: societies.filter(s => s.type === 'VILLA').length }
          ].map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              style={{
                padding: '5px 10px',
                borderRadius: '7px',
                border: activeTab === t.id ? '1.5px solid #234B3C' : '1px solid #E2E8F0',
                background: activeTab === t.id ? '#234B3C' : '#FFFFFF',
                color: activeTab === t.id ? '#FFFFFF' : '#475569',
                fontSize: '11.5px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span>{t.label}</span>
              <span style={{
                fontSize: '10px',
                padding: '0 5px',
                borderRadius: '9999px',
                background: activeTab === t.id ? 'rgba(255, 255, 255, 0.22)' : '#F1F5F9',
                color: activeTab === t.id ? '#FFFFFF' : '#64748B'
              }}>
                {t.count}
              </span>
            </button>
          ))}

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              height: '30px',
              padding: '0 8px',
              borderRadius: '7px',
              border: '1px solid #CBD5E1',
              fontSize: '11.5px',
              fontWeight: 700,
              color: '#334155',
              background: '#F8FAFC',
              outline: 'none'
            }}
          >
            <option value="ALL">All Statuses</option>
            <option value="APPROVED">Approved Active</option>
            <option value="PENDING">Pending Approval</option>
          </select>
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: '300px' }}>
          <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search society, flat or resident..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              height: '32px',
              paddingLeft: '28px',
              paddingRight: '8px',
              borderRadius: '7px',
              border: '1px solid #CBD5E1',
              fontSize: '12px',
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Responsive Community Cards Directory */}
      <div className="admin-table-card" style={{ padding: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <strong style={{ fontSize: '13px', color: '#0F172A' }}>
            Communities & Resident Desks ({filteredSocieties.length})
          </strong>
        </div>

        {filteredSocieties.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '28px 16px', background: '#F8FAFC', borderRadius: '10px', border: '1px dashed #CBD5E1' }}>
            <Building2 size={22} color="#94A3B8" style={{ margin: '0 auto 6px' }} />
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>No Matching Communities Found</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {paginatedSocieties.map(s => {
              const residents = getResidentsForSociety(s);
              const servingWh = warehouses.find(wh => wh.id === s.warehouseId || wh.code === s.warehouseId || wh.uuid === s.warehouseId);
              const warehouseLabel = servingWh ? `${servingWh.name} (${servingWh.code || 'HUB'})` : (s.warehouseName || 'Unassigned Hub');
              const socOrders = getOrdersForSociety(s);
              const cleanSecPhone = s.secretaryPhone && !String(s.secretaryPhone).includes('•')
                ? String(s.secretaryPhone).replace(/\D/g, '').slice(-10)
                : '';

              return (
                <div
                  key={s.id}
                  onClick={() => setSelectedSociety(s)}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px',
                    cursor: 'pointer'
                  }}
                >
                  {/* Left: Community Identity & Hub */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: '2 1 240px', minWidth: 0 }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: s.type === 'HOSTEL' ? '#FEF3C7' : '#EBF2EE',
                      color: s.type === 'HOSTEL' ? '#B45309' : '#234B3C',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '2px'
                    }}>
                      {s.type === 'HOSTEL' ? <GraduationCap size={16} /> : <Building2 size={16} />}
                    </div>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '13.5px', color: '#0F172A' }}>{s.name}</strong>
                        <code style={{ fontSize: '10px', color: '#234B3C', background: '#EBF2EE', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                          {s.id}
                        </code>
                        <span style={{
                          fontSize: '10px',
                          background: s.type === 'HOSTEL' ? '#FEF3C7' : '#F1F5F9',
                          color: s.type === 'HOSTEL' ? '#92400E' : '#475569',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          fontWeight: 700
                        }}>
                          {s.type || 'APARTMENT'}
                        </span>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          padding: '1px 6px',
                          borderRadius: '4px',
                          background: s.status === 'APPROVED' ? '#ECFDF5' : (s.status === 'REJECTED' ? '#FEF2F2' : '#FEF3C7'),
                          color: s.status === 'APPROVED' ? '#059669' : (s.status === 'REJECTED' ? '#DC2626' : '#B45309')
                        }}>
                          {s.status || 'APPROVED'}
                        </span>
                      </div>

                      <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        📍 {s.address ? s.address.replace(/\r?\n/g, ', ') : 'Address on file'}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '4px', fontSize: '11px', color: '#334155', fontWeight: 600 }}>
                        <span>🏭 {warehouseLabel}</span>
                        {s.secretaryName && <span>• 👤 {s.secretaryName}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Middle: Operational Counts */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', flex: '1 1 220px' }}>
                    <span style={{ fontSize: '11px', background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#334155', padding: '3px 8px', borderRadius: '6px', fontWeight: 700 }}>
                      🚪 {s.totalUnits || 0} Flats
                    </span>
                    <span style={{ fontSize: '11px', background: '#EBF2EE', color: '#234B3C', padding: '3px 8px', borderRadius: '6px', fontWeight: 800 }}>
                      👥 {residents.length} Residents
                    </span>
                    <span style={{ fontSize: '11px', background: socOrders.length > 0 ? '#EFF6FF' : '#F8FAFC', color: socOrders.length > 0 ? '#0369A1' : '#64748B', padding: '3px 8px', borderRadius: '6px', fontWeight: 800 }}>
                      📦 {socOrders.length} Orders
                    </span>
                    <span style={{ fontSize: '11px', background: s.status === 'APPROVED' ? '#ECFDF5' : '#FEF3C7', color: s.status === 'APPROVED' ? '#059669' : '#B45309', padding: '3px 8px', borderRadius: '6px', fontWeight: 800 }}>
                      💰 {formatCommissionLabel(s)}
                    </span>
                  </div>

                  {/* Right: Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }} onClick={(e) => e.stopPropagation()}>
                    {cleanSecPhone && (
                      <a
                        href={`tel:${cleanSecPhone}`}
                        style={{
                          padding: '6px 9px',
                          borderRadius: '7px',
                          background: '#EFF6FF',
                          border: '1px solid #BFDBFE',
                          color: '#1D4ED8',
                          fontSize: '11.5px',
                          fontWeight: 800,
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Phone size={12} /> Call
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedSociety(s)}
                      style={{
                        background: '#F0F4F2',
                        color: '#234B3C',
                        border: '1px solid #CBD5E1',
                        padding: '6px 10px',
                        borderRadius: '7px',
                        fontSize: '11.5px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <span>Details</span>
                      <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <AdminPagination
          currentPage={currentPage}
          totalItems={filteredSocieties.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          itemLabel="communities"
        />
      </div>

      {/* Society Details & Registered Residents Deep-Dive Drawer */}
      {selectedSociety && (
        <div
          onClick={() => setSelectedSociety(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            justifyContent: 'flex-end',
            zIndex: 9999
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '640px',
              background: '#FFFFFF',
              height: '100%',
              overflowY: 'auto',
              padding: 'clamp(14px, 3vw, 22px)',
              boxShadow: '-10px 0 25px rgba(0, 0, 0, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              boxSizing: 'border-box'
            }}
          >
            {/* Top Close Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid #E2E8F0' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '10.5px', background: '#EBF2EE', color: '#234B3C', padding: '2px 7px', borderRadius: '4px', fontWeight: 800 }}>
                    {selectedSociety.type || 'APARTMENT'}
                  </span>
                  <code style={{ fontSize: '11px', color: '#475569', fontWeight: 700 }}>
                    {selectedSociety.id}
                  </code>
                  <span style={{
                    fontSize: '10.5px',
                    fontWeight: 800,
                    padding: '2px 7px',
                    borderRadius: '4px',
                    background: selectedSociety.status === 'APPROVED' ? '#ECFDF5' : '#FEF3C7',
                    color: selectedSociety.status === 'APPROVED' ? '#059669' : '#B45309'
                  }}>
                    {selectedSociety.status || 'APPROVED'}
                  </span>
                </div>
                <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', margin: '4px 0 0' }}>
                  {selectedSociety.name}
                </h2>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                  📍 {selectedSociety.address}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedSociety(null)}
                style={{
                  background: '#F1F5F9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748B',
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Compact Metrics Row inside Drawer */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: '8px',
              marginBottom: '14px'
            }}>
              <div style={{ background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '8px 10px' }}>
                <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 700 }}>RESIDENTS</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#234B3C', marginTop: '2px' }}>
                  {selectedResidents.length}
                </div>
              </div>
              <div style={{ background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '8px 10px' }}>
                <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 700 }}>ORDERS</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#0284C7', marginTop: '2px' }}>
                  {selectedOrders.length}
                </div>
              </div>
              <div style={{ background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '8px 10px' }}>
                <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 700 }}>CASHBACK</div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#059669', marginTop: '3px' }}>
                  {formatCommissionLabel(selectedSociety)}
                </div>
              </div>
            </div>

            {/* Deep-Dive Sub-Tabs */}
            <div style={{ display: 'flex', gap: '4px', borderBottom: '1.5px solid #E2E8F0', marginBottom: '12px', overflowX: 'auto' }}>
              {[
                { id: 'RESIDENTS', label: `👥 Residents (${selectedResidents.length})` },
                { id: 'ORDERS', label: `📦 Orders (${selectedOrders.length})` },
                { id: 'BANK', label: '🏦 Hub & Bank Info' }
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setDetailTab(t.id)}
                  style={{
                    padding: '7px 12px',
                    background: 'none',
                    border: 'none',
                    borderBottom: detailTab === t.id ? '2.5px solid #234B3C' : '2.5px solid transparent',
                    color: detailTab === t.id ? '#234B3C' : '#64748B',
                    fontWeight: 800,
                    fontSize: '12.5px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    marginBottom: '-1.5px'
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* TAB CONTENT 1: REGISTERED RESIDENTS DIRECTORY */}
            {detailTab === 'RESIDENTS' && (
              <div>
                {selectedResidents.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '28px 16px', background: '#F8FAFC', borderRadius: '10px' }}>
                    <Users size={26} color="#94A3B8" style={{ margin: '0 auto 6px' }} />
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>No Residents Registered Yet</div>
                    <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
                      Residents linked to {selectedSociety.name} will appear here once they sign up or place an order.
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedResidents.map((r, i) => {
                      const cleanPhone = String(r.phone || '').replace(/\D/g, '').slice(-10);
                      return (
                        <div
                          key={i}
                          style={{
                            background: '#FFFFFF',
                            border: '1px solid #E2E8F0',
                            borderRadius: '10px',
                            padding: '10px 12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '8px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: '#234B3C',
                              color: '#FFFFFF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '13px',
                              fontWeight: 800,
                              flexShrink: 0
                            }}>
                              {r.name?.[0]?.toUpperCase() || 'R'}
                            </div>

                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                <strong style={{ fontSize: '13px', color: '#0F172A' }}>{r.name}</strong>
                                <span style={{ fontSize: '11px', color: '#0284C7', fontWeight: 800 }}>
                                  🚪 {r.flatNo}
                                </span>
                              </div>
                              <div style={{ fontSize: '11.5px', color: '#475569', marginTop: '2px' }}>
                                📞 {r.phone} {r.email && r.email !== '—' ? `• ${r.email}` : ''}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '12px', fontWeight: 800, color: '#234B3C' }}>
                                {r.ordersCount} Orders · ₹{r.totalSpent}
                              </div>
                              <div style={{ fontSize: '10.5px', color: '#94A3B8' }}>
                                {r.registeredAt}
                              </div>
                            </div>
                            {cleanPhone && (
                              <a
                                href={`tel:${cleanPhone}`}
                                style={{
                                  padding: '5px 8px',
                                  borderRadius: '6px',
                                  background: '#EFF6FF',
                                  border: '1px solid #BFDBFE',
                                  color: '#1D4ED8',
                                  fontSize: '11px',
                                  fontWeight: 800,
                                  textDecoration: 'none'
                                }}
                              >
                                📞 Call
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT 2: ORDERS LIST */}
            {detailTab === 'ORDERS' && (
              <div>
                {selectedOrders.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '28px 16px', background: '#F8FAFC', borderRadius: '10px' }}>
                    <ShoppingBag size={26} color="#94A3B8" style={{ margin: '0 auto 6px' }} />
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>No Orders Found</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedOrders.map(o => (
                      <div
                        key={o.id}
                        style={{
                          background: '#FFFFFF',
                          border: '1px solid #E2E8F0',
                          borderRadius: '10px',
                          padding: '10px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '8px'
                        }}
                      >
                        <div style={{ flex: '1 1 200px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <strong style={{ fontSize: '12.5px', color: '#234B3C' }}>{o.id}</strong>
                            <span style={{ fontSize: '11.5px', color: '#334155', fontWeight: 700 }}>
                              • {o.userName} ({o.flatNo || 'Flat'})
                            </span>
                          </div>
                          <div style={{ fontSize: '11.5px', color: '#475569', marginTop: '2px' }}>
                            {o.items?.map(i => `${i.name} (${i.qty} * ${i.unit || '1 pc'})`).join(', ')}
                          </div>
                          <div style={{ fontSize: '10.5px', color: '#64748B', marginTop: '2px' }}>
                            📅 {o.deliveryDate} · {o.deliverySlot}
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A' }}>
                            ₹{o.totalAmount}
                          </div>
                          <span style={{
                            fontSize: '10px',
                            fontWeight: 800,
                            padding: '2px 7px',
                            borderRadius: '9999px',
                            background: o.status === 'DELIVERED' ? '#ECFDF5' : '#FEF3C7',
                            color: o.status === 'DELIVERED' ? '#059669' : '#B45309'
                          }}>
                            {o.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT 3: ASSOCIATION & BANK INFO */}
            {detailTab === 'BANK' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ background: '#F8FAFC', borderRadius: '10px', padding: '12px', border: '1px solid #E2E8F0' }}>
                  <h4 style={{ fontSize: '12.5px', fontWeight: 800, color: '#0F172A', margin: '0 0 8px' }}>
                    Community & Warehouse Assignment
                  </h4>
                  <div style={{ fontSize: '12px', color: '#334155', lineHeight: '1.6' }}>
                    <div>👤 <strong>Secretary / Contact:</strong> {selectedSociety.secretaryName || 'Not Provided'}</div>
                    <div>📞 <strong>Phone:</strong> {selectedSociety.secretaryPhone || 'Not Provided'}</div>
                    <div>🏭 <strong>Serving Warehouse Hub:</strong> {warehouses.find(w => w.id === selectedSociety.warehouseId || w.code === selectedSociety.warehouseId)?.name || selectedSociety.warehouseName || 'Unassigned Hub'}</div>
                    <div>📦 <strong>Delivery Mode:</strong> {selectedSociety.deliveryMode?.replace(/_/g, ' ') || 'Society Security Desk'}</div>
                    <div>🏢 <strong>Units / Floors:</strong> {selectedSociety.totalUnits || 0} Units · {selectedSociety.totalFloors || 0} Floors</div>
                  </div>
                </div>

                <div style={{ background: '#F8FAFC', borderRadius: '10px', padding: '12px', border: '1px solid #E2E8F0' }}>
                  <h4 style={{ fontSize: '12.5px', fontWeight: 800, color: '#0F172A', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Coins size={15} color="#059669" />
                    <span>Welfare Association Bank & Commission Info</span>
                  </h4>
                  {hasBankDetails ? (
                    <div style={{ fontSize: '12px', color: '#334155', lineHeight: '1.6' }}>
                      <div>🏛️ <strong>Bank Name:</strong> {selectedBankName || 'Not Provided'}</div>
                      <div>👤 <strong>Account Holder:</strong> {selectedAccountHolder || selectedSociety.name}</div>
                      <div>🔢 <strong>Account Number:</strong> {selectedAccountNumber || 'Not Provided'}</div>
                      <div>🏷️ <strong>IFSC Code:</strong> {selectedIfscCode || 'Not Provided'}</div>
                      {selectedBranch && <div>📍 <strong>Branch:</strong> {selectedBranch}</div>}
                    </div>
                  ) : (
                    <div style={{ fontSize: '12px', color: '#64748B', padding: '6px 0' }}>
                      Bank account details have not been provided for this community yet.
                    </div>
                  )}
                  <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #E2E8F0', fontSize: '12px', fontWeight: 700, color: selectedSociety.status === 'APPROVED' ? '#059669' : '#B45309' }}>
                    ✨ Commission Status: {formatCommissionLabel(selectedSociety)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
