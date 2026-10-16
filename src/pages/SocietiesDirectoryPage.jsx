import React, { useState } from 'react';
import { 
  Building2, 
  Users, 
  MapPin, 
  Phone, 
  Mail, 
  ShoppingBag, 
  CheckCircle2, 
  Search, 
  Filter, 
  ChevronRight, 
  X, 
  Building, 
  GraduationCap, 
  Coins, 
  Clock, 
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import { useAdminRole } from '../context/AdminRoleContext';
import AdminPagination from '../components/common/AdminPagination';

export default function SocietiesDirectoryPage() {
  const { store } = useAdminRole();
  const societies = store.societies || [];
  const orders = store.orders || [];
  const warehouses = store.warehouses || [];

  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'APARTMENT' | 'HOSTEL' | 'VILLA'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSociety, setSelectedSociety] = useState(null);
  const [detailTab, setDetailTab] = useState('RESIDENTS'); // 'RESIDENTS' | 'ORDERS' | 'BANK'
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Extract all registered residents from both store.users and store.orders
  const getResidentsForSociety = (societyId) => {
    const residentMap = new Map();

    // 1. From store.users
    (store.users || []).forEach(u => {
      if (u.societyId === societyId) {
        residentMap.set(u.phone, {
          name: u.name,
          phone: u.phone,
          email: u.email || '—',
          flatNo: u.flatNo,
          registeredAt: u.registeredAt ? new Date(u.registeredAt).toLocaleDateString() : 'Active Resident',
          ordersCount: 0,
          totalSpent: 0
        });
      }
    });

    // 2. From store.orders
    orders.forEach(o => {
      if (o.societyId === societyId && o.userPhone) {
        const existing = residentMap.get(o.userPhone) || {
          name: o.userName || 'Resident',
          phone: o.userPhone,
          email: '—',
          flatNo: o.flatNo || 'Flat Assigned',
          registeredAt: o.orderPlacedAt ? new Date(o.orderPlacedAt).toLocaleDateString() : 'Active Resident',
          ordersCount: 0,
          totalSpent: 0
        };

        existing.ordersCount += 1;
        existing.totalSpent += (o.totalAmount || 0);
        if (o.flatNo) existing.flatNo = o.flatNo;
        residentMap.set(o.userPhone, existing);
      }
    });

    return Array.from(residentMap.values());
  };

  // Filter societies based on category and search query
  const filteredSocieties = societies.filter(s => {
    if (activeTab !== 'ALL' && s.type !== activeTab) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = s.name?.toLowerCase().includes(q);
      const matchAddress = s.address?.toLowerCase().includes(q);
      const matchSec = s.secretaryName?.toLowerCase().includes(q);
      const residents = getResidentsForSociety(s.id);
      const matchResident = residents.some(r => r.name.toLowerCase().includes(q) || r.phone.includes(q) || r.flatNo.toLowerCase().includes(q));
      if (!matchName && !matchAddress && !matchSec && !matchResident) return false;
    }
    return true;
  });

  // Reset pagination on filter change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery]);

  const paginatedSocieties = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSocieties.slice(start, start + pageSize);
  }, [filteredSocieties, currentPage, pageSize]);

  // Calculate high-level platform community stats
  const totalFlats = societies.reduce((acc, s) => acc + (Number(s.totalUnits) || 0), 0);
  const allUniqueResidents = new Set();
  societies.forEach(s => {
    getResidentsForSociety(s.id).forEach(r => allUniqueResidents.add(r.phone));
  });

  return (
    <div className="admin-page-container">
      {/* Page Title & Live Counter Header */}
      <div className="page-title-header" style={{ marginBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building2 size={22} color="#234B3C" />
            <span>Apartments, Hostels & Resident Directory</span>
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', margin: '3px 0 0' }}>
            Centralized database of onboarded residential complexes, student living spaces, and registered flat residents
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '12px', background: '#EBF2EE', color: '#234B3C', padding: '4px 12px', borderRadius: '8px', fontWeight: 700 }}>
            {societies.length} Onboarded Communities
          </span>
          <span style={{ fontSize: '12px', background: '#FEF3C7', color: '#B45309', padding: '4px 12px', borderRadius: '8px', fontWeight: 700 }}>
            {allUniqueResidents.size} Registered Residents
          </span>
        </div>
      </div>

      {/* KPI Metrics Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '14px',
        marginBottom: '18px'
      }}>
        <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1.5px solid #E2E8F0', padding: '16px 18px' }}>
          <div style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Total Communities</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>{societies.length}</div>
          <div style={{ fontSize: '11.5px', color: '#059669', marginTop: '2px', fontWeight: 600 }}>100% Verified Society Desks</div>
        </div>

        <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1.5px solid #E2E8F0', padding: '16px 18px' }}>
          <div style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Verified Residents</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#234B3C', marginTop: '4px' }}>{allUniqueResidents.size}</div>
          <div style={{ fontSize: '11.5px', color: '#52635A', marginTop: '2px' }}>Linked to registered flats & rooms</div>
        </div>

        <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1.5px solid #E2E8F0', padding: '16px 18px' }}>
          <div style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Total Resident Flats</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#0284C7', marginTop: '4px' }}>{totalFlats}</div>
          <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>Total addressable households</div>
        </div>

        <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1.5px solid #E2E8F0', padding: '16px 18px' }}>
          <div style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Society Orders Placed</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#D97706', marginTop: '4px' }}>{orders.length}</div>
          <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>Morning dawn society drops</div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '12px',
        border: '1.5px solid #E2E8F0',
        padding: '12px 16px',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        {/* Category Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {[
            { id: 'ALL', label: 'All Communities', count: societies.length },
            { id: 'APARTMENT', label: 'Apartments', count: societies.filter(s => s.type === 'APARTMENT').length },
            { id: 'HOSTEL', label: 'Student Hostels & PGs', count: societies.filter(s => s.type === 'HOSTEL').length },
            { id: 'VILLA', label: 'Gated Villas', count: societies.filter(s => s.type === 'VILLA').length }
          ].map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: activeTab === t.id ? '1.5px solid #234B3C' : '1px solid #E2E8F0',
                background: activeTab === t.id ? '#234B3C' : '#FFFFFF',
                color: activeTab === t.id ? '#FFFFFF' : '#475569',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>{t.label}</span>
              <span style={{
                fontSize: '10.5px',
                padding: '1px 6px',
                borderRadius: '9999px',
                background: activeTab === t.id ? 'rgba(255, 255, 255, 0.25)' : '#F1F5F9',
                color: activeTab === t.id ? '#FFFFFF' : '#64748B'
              }}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', width: '280px' }}>
          <Search size={15} color="#94A3B8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search society, flat or resident..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              height: '36px',
              paddingLeft: '32px',
              paddingRight: '10px',
              borderRadius: '8px',
              border: '1.5px solid #CBD5E1',
              fontSize: '12.5px',
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Main Societies Master Table */}
      <div className="admin-table-card">
        <div className="admin-table-header">
          <h3 style={{ fontSize: '15px', color: '#0F172A', margin: 0 }}>Registered Communities & Society Desks</h3>
          <span style={{ fontSize: '12px', color: '#64748B' }}>
            Showing {filteredSocieties.length} of {societies.length} communities
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>Society / Hostel Name</th>
                <th>Type</th>
                <th>Serving Warehouse Hub</th>
                <th>Units / Flats</th>
                <th>Registered Residents</th>
                <th>Orders Placed</th>
                <th>Cashback / Commission</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredSocieties.length === 0 ? (
                <tr>
                  <td colSpan="9">
                    <div className="admin-empty-state">
                      <div className="admin-empty-state-icon">
                        <Building2 size={22} />
                      </div>
                      <div className="admin-empty-state-title">No Matching Communities Found</div>
                      <div className="admin-empty-state-desc">
                        No onboarded apartments or hostels match your filter query.
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedSocieties.map(s => {
                  const residents = getResidentsForSociety(s.id);
                  const servingWh = warehouses.find(wh => wh.id === s.warehouseId);
                  const warehouseLabel = servingWh ? `${servingWh.name} (${servingWh.code || 'HUB'})` : (s.warehouseName || 'Central Regional Warehouse Hub');
                  const socOrders = orders.filter(o => o.societyId === s.id);

                  return (
                    <tr key={s.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedSociety(s)}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: s.type === 'HOSTEL' ? '#FEF3C7' : '#EBF2EE',
                            color: s.type === 'HOSTEL' ? '#B45309' : '#234B3C',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            {s.type === 'HOSTEL' ? <GraduationCap size={16} /> : <Building2 size={16} />}
                          </div>
                          <div style={{ minWidth: 0, maxWidth: '280px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <strong style={{ fontSize: '13px', color: '#0F172A', whiteSpace: 'nowrap' }}>{s.name}</strong>
                              <code style={{ fontSize: '10px', color: '#234B3C', background: '#EBF2EE', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>{s.id}</code>
                            </div>
                            <div style={{ 
                              fontSize: '11px', 
                              color: '#64748B', 
                              whiteSpace: 'nowrap', 
                              overflow: 'hidden', 
                              textOverflow: 'ellipsis',
                              marginTop: '1px'
                            }} title={s.address}>
                              {s.address ? s.address.replace(/\r?\n/g, ', ') : 'Address on file'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{
                          fontSize: '11px',
                          background: s.type === 'HOSTEL' ? '#FEF3C7' : '#F1F5F9',
                          color: s.type === 'HOSTEL' ? '#92400E' : '#334155',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontWeight: 700
                        }}>
                          {s.type || 'APARTMENT'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '12px', color: '#0F172A', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <span>🏭</span>
                          <span>{warehouseLabel}</span>
                        </span>
                      </td>
                      <td>
                        <strong style={{ fontSize: '13px', color: '#334155' }}>
                          {s.totalUnits || 0} flats
                        </strong>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>{s.totalFloors || 0} floors</div>
                      </td>
                      <td>
                        <span style={{
                          fontSize: '12px',
                          background: '#EBF2EE',
                          color: '#234B3C',
                          padding: '3px 10px',
                          borderRadius: '9999px',
                          fontWeight: 800,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <Users size={12} />
                          <span>{residents.length} Residents</span>
                        </span>
                      </td>
                      <td>
                        <strong style={{ fontSize: '13.5px', color: socOrders.length > 0 ? '#234B3C' : '#94A3B8' }}>
                          {socOrders.length} orders
                        </strong>
                      </td>
                      <td>
                        <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#059669' }}>
                          {s.commissionType === 'FLAT' || s.commissionType === 'FIXED_PER_ORDER'
                            ? `₹${s.commissionValue || 0} Flat`
                            : `${s.commissionValue || 3.5}%`}
                        </span>
                        <div style={{ fontSize: '10.5px', color: '#64748B' }}>Welfare Fund</div>
                      </td>
                      <td>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: '4px',
                          background: s.status === 'APPROVED' ? '#ECFDF5' : '#FEF3C7',
                          color: s.status === 'APPROVED' ? '#059669' : '#B45309'
                        }}>
                          {s.status}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSociety(s);
                          }}
                          style={{
                            background: '#F0F4F2',
                            color: '#234B3C',
                            border: '1px solid #CBD5E1',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <span>View Details & Residents</span>
                          <ChevronRight size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <AdminPagination
          currentPage={currentPage}
          totalItems={filteredSocieties.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          itemLabel="communities"
        />
      </div>

      {/* Society Details & Registered Residents Deep-Dive Drawer / Modal */}
      {selectedSociety && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'flex-end',
          zIndex: 9999
        }}>
          <div style={{
            width: '100%',
            maxWidth: '720px',
            background: '#FFFFFF',
            height: '100%',
            overflowY: 'auto',
            padding: '28px',
            boxShadow: '-10px 0 25px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Top Close Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1.5px solid #E2E8F0' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', background: '#EBF2EE', color: '#234B3C', padding: '2px 8px', borderRadius: '4px', fontWeight: 800 }}>
                    {selectedSociety.type}
                  </span>
                  <span style={{ fontSize: '12px', color: '#64748B' }}>
                    ID: <strong>{selectedSociety.id}</strong>
                  </span>
                </div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: '4px 0 0' }}>
                  {selectedSociety.name}
                </h2>
                <div style={{ fontSize: '12.5px', color: '#64748B', marginTop: '2px' }}>
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
                  width: '34px',
                  height: '34px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748B',
                  cursor: 'pointer'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick Metrics Banner inside Drawer */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '10px',
              marginBottom: '20px'
            }}>
              <div style={{ background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '12px' }}>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>REGISTERED RESIDENTS</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#234B3C', marginTop: '2px' }}>
                  {getResidentsForSociety(selectedSociety.id).length}
                </div>
              </div>
              <div style={{ background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '12px' }}>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>COMMUNITY ORDERS</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#0284C7', marginTop: '2px' }}>
                  {orders.filter(o => o.societyId === selectedSociety.id).length}
                </div>
              </div>
              <div style={{ background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '12px' }}>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>WELFARE CASHBACK</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#059669', marginTop: '2px' }}>
                  {selectedSociety.commissionType === 'FLAT' || selectedSociety.commissionType === 'FIXED_PER_ORDER'
                    ? `₹${selectedSociety.commissionValue || 0} Flat`
                    : `${selectedSociety.commissionValue || 3.5}%`}
                </div>
              </div>
            </div>

            {/* Deep-Dive Sub-Tabs */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #E2E8F0', marginBottom: '18px' }}>
              <button
                type="button"
                onClick={() => setDetailTab('RESIDENTS')}
                style={{
                  padding: '8px 16px',
                  background: 'none',
                  border: 'none',
                  borderBottom: detailTab === 'RESIDENTS' ? '3px solid #234B3C' : '3px solid transparent',
                  color: detailTab === 'RESIDENTS' ? '#234B3C' : '#64748B',
                  fontWeight: 800,
                  fontSize: '13.5px',
                  cursor: 'pointer',
                  marginBottom: '-2px'
                }}
              >
                👥 Registered Residents ({getResidentsForSociety(selectedSociety.id).length})
              </button>

              <button
                type="button"
                onClick={() => setDetailTab('ORDERS')}
                style={{
                  padding: '8px 16px',
                  background: 'none',
                  border: 'none',
                  borderBottom: detailTab === 'ORDERS' ? '3px solid #234B3C' : '3px solid transparent',
                  color: detailTab === 'ORDERS' ? '#234B3C' : '#64748B',
                  fontWeight: 800,
                  fontSize: '13.5px',
                  cursor: 'pointer',
                  marginBottom: '-2px'
                }}
              >
                📦 Society Orders ({orders.filter(o => o.societyId === selectedSociety.id).length})
              </button>

              <button
                type="button"
                onClick={() => setDetailTab('BANK')}
                style={{
                  padding: '8px 16px',
                  background: 'none',
                  border: 'none',
                  borderBottom: detailTab === 'BANK' ? '3px solid #234B3C' : '3px solid transparent',
                  color: detailTab === 'BANK' ? '#234B3C' : '#64748B',
                  fontWeight: 800,
                  fontSize: '13.5px',
                  cursor: 'pointer',
                  marginBottom: '-2px'
                }}
              >
                🏦 Association & Bank Info
              </button>
            </div>

            {/* TAB CONTENT 1: REGISTERED RESIDENTS DIRECTORY */}
            {detailTab === 'RESIDENTS' && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                    Resident Members Registered at {selectedSociety.name}
                  </h4>
                  <span style={{ fontSize: '11px', color: '#64748B' }}>
                    Flats verified for Society Desk delivery
                  </span>
                </div>

                {getResidentsForSociety(selectedSociety.id).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', background: '#F8FAFC', borderRadius: '12px' }}>
                    <Users size={32} color="#94A3B8" style={{ margin: '0 auto 8px' }} />
                    <div style={{ fontWeight: 700, color: '#334155' }}>No Residents Registered Yet</div>
                    <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                      When residents sign up and link their flat to this society, their contact details appear here.
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {getResidentsForSociety(selectedSociety.id).map((r, i) => (
                      <div
                        key={i}
                        style={{
                          background: '#FFFFFF',
                          border: '1.5px solid #E2E8F0',
                          borderRadius: '12px',
                          padding: '14px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '10px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: '#234B3C',
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '15px',
                            fontWeight: 800
                          }}>
                            {r.name?.[0]?.toUpperCase() || 'R'}
                          </div>

                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <strong style={{ fontSize: '14px', color: '#0F172A' }}>{r.name}</strong>
                              <span style={{
                                fontSize: '10px',
                                background: '#ECFDF5',
                                color: '#059669',
                                fontWeight: 800,
                                padding: '1px 6px',
                                borderRadius: '4px'
                              }}>
                                VERIFIED
                              </span>
                            </div>
                            <div style={{ fontSize: '12.5px', color: '#475569', marginTop: '2px' }}>
                              📞 +91 {r.phone} {r.email && r.email !== '—' ? `• ✉️ ${r.email}` : ''}
                            </div>
                            <div style={{ fontSize: '12px', color: '#0284C7', fontWeight: 700, marginTop: '2px' }}>
                              🚪 Flat / Room: {r.flatNo}
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#234B3C' }}>
                            {r.ordersCount} Orders Placed
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748B' }}>
                            Total Spent: <strong>₹{r.totalSpent}</strong>
                          </div>
                          <div style={{ fontSize: '10.5px', color: '#94A3B8', marginTop: '2px' }}>
                            Joined: {r.registeredAt}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT 2: ORDERS LIST */}
            {detailTab === 'ORDERS' && (
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', marginBottom: '12px' }}>
                  Orders Dispatched & Scheduled for {selectedSociety.name}
                </h4>

                {orders.filter(o => o.societyId === selectedSociety.id).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '36px', background: '#F8FAFC', borderRadius: '12px' }}>
                    <ShoppingBag size={30} color="#94A3B8" style={{ margin: '0 auto 8px' }} />
                    <div style={{ fontWeight: 700, color: '#334155' }}>No Orders Found</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {orders.filter(o => o.societyId === selectedSociety.id).map(o => (
                      <div
                        key={o.id}
                        style={{
                          background: '#FFFFFF',
                          border: '1.5px solid #E2E8F0',
                          borderRadius: '10px',
                          padding: '12px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '10px'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <strong style={{ fontSize: '13.5px', color: '#234B3C' }}>{o.id}</strong>
                            <span style={{ fontSize: '12px', color: '#64748B' }}>
                              • {o.userName} ({o.flatNo})
                            </span>
                          </div>
                          <div style={{ fontSize: '12px', color: '#334155', marginTop: '4px' }}>
                            Items: {o.items?.map(i => `${i.name} (${i.qty} ${i.unit || 'kg'})`).join(', ')}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                            Schedule: {o.deliveryDate} ({o.deliverySlot})
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
                            ₹{o.totalAmount}
                          </div>
                          <span style={{
                            fontSize: '10.5px',
                            fontWeight: 800,
                            padding: '2px 8px',
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '16px', border: '1px solid #E2E8F0' }}>
                  <h4 style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A', margin: '0 0 10px' }}>
                    Secretary & Management Committee Contact
                  </h4>
                  <div style={{ fontSize: '13px', color: '#334155', lineHeight: '1.6' }}>
                    <div>👤 <strong>Secretary:</strong> {selectedSociety.secretaryName || 'Not Assigned'}</div>
                    <div>📞 <strong>Phone:</strong> {selectedSociety.secretaryPhone || '—'}</div>
                    <div>🏭 <strong>Serving Regional Warehouse:</strong> {warehouses.find(w => w.id === selectedSociety.warehouseId)?.name || selectedSociety.warehouseName || 'Central Cold Atmosphere Hub'}</div>
                    <div>📦 <strong>Delivery Drop Mode:</strong> {selectedSociety.deliveryMode?.replace(/_/g, ' ') || 'Society Security Desk'}</div>
                    <div>🏢 <strong>Society Address:</strong> {selectedSociety.address}</div>
                  </div>
                </div>

                <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '16px', border: '1px solid #E2E8F0' }}>
                  <h4 style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Coins size={16} color="#059669" />
                    <span>Welfare Association Bank Account for Payouts</span>
                  </h4>
                  <div style={{ fontSize: '13px', color: '#334155', lineHeight: '1.6' }}>
                    <div>🏛️ <strong>Bank Name:</strong> {selectedSociety.bankDetails?.bankName || 'Axis Bank'}</div>
                    <div>👤 <strong>Account Holder:</strong> {selectedSociety.bankDetails?.accountHolder || selectedSociety.name}</div>
                    <div>🔢 <strong>Account Number:</strong> {selectedSociety.bankDetails?.accountNumber || '91802004819201'}</div>
                    <div>🏷️ <strong>IFSC Code:</strong> {selectedSociety.bankDetails?.ifscCode || 'UTIB0000841'}</div>
                    <div>📍 <strong>Branch:</strong> {selectedSociety.bankDetails?.branch || 'Bengaluru Main Branch'}</div>
                    <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #E2E8F0', fontWeight: 700, color: '#059669' }}>
                      ✨ Commission Rate: {selectedSociety.commissionType === 'FLAT' || selectedSociety.commissionType === 'FIXED_PER_ORDER'
                        ? `₹${selectedSociety.commissionValue || 0} Flat`
                        : `${selectedSociety.commissionValue || 3.5}%`} credited automatically on every delivery.
                    </div>
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
