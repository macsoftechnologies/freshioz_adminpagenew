import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Plus, MapPin, Store, AlertCircle, CheckCircle2, Clock, Phone } from 'lucide-react';
import { useAdminRole } from '../context/AdminRoleContext';

export default function SalesMySocietiesPage() {
  const { store, currentUser } = useAdminRole();

  const [repFilter, setRepFilter] = useState('MY'); // 'MY' | 'ALL'
  const [statusFilter, setStatusFilter] = useState('ALL');

  const allSocieties = store.societies || [];
  const mySocietiesCount = allSocieties.filter(s => {
    if (!currentUser) return true;
    const matchId = s.createdById && (s.createdById === currentUser.id || s.createdById === currentUser.uuid);
    const matchPhone = s.salesRepPhone && currentUser.phone && s.salesRepPhone.replace(/\D/g, '') === currentUser.phone.replace(/\D/g, '');
    const matchName = s.salesRepName && currentUser.name && s.salesRepName.toLowerCase() === currentUser.name.toLowerCase();
    return matchId || matchPhone || matchName;
  }).length;

  // Sort PENDING societies to the top, followed by APPROVED, then REJECTED
  const statusPriority = { PENDING: 0, APPROVED: 1, REJECTED: 2 };
  const filtered = allSocieties
    .filter(s => {
      if (repFilter === 'MY' && currentUser) {
        const matchId = s.createdById && (s.createdById === currentUser.id || s.createdById === currentUser.uuid);
        const matchPhone = s.salesRepPhone && currentUser.phone && s.salesRepPhone.replace(/\D/g, '') === currentUser.phone.replace(/\D/g, '');
        const matchName = s.salesRepName && currentUser.name && s.salesRepName.toLowerCase() === currentUser.name.toLowerCase();
        if (!matchId && !matchPhone && !matchName) return false;
      }
      if (statusFilter === 'ALL') return true;
      return s.status === statusFilter;
    })
    .sort((a, b) => {
      const pA = statusPriority[a.status] ?? 9;
      const pB = statusPriority[b.status] ?? 9;
      if (pA !== pB) return pA - pB;
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });

  return (
    <div className="admin-page-container">
      {/* Compact Page Title & Filter Tabs */}
      <div className="page-title-header" style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            3. My Submitted Societies
          </h1>

          {/* Rep Scope Filter */}
          <div style={{ display: 'flex', gap: '4px', background: '#F1F5F9', border: '1px solid #CBD5E1', padding: '2px', borderRadius: '8px' }}>
            <button
              type="button"
              onClick={() => setRepFilter('MY')}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11.5px',
                fontWeight: 700,
                background: repFilter === 'MY' ? '#234B3C' : 'transparent',
                color: repFilter === 'MY' ? '#FFFFFF' : '#475569',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              My Societies ({mySocietiesCount})
            </button>
            <button
              type="button"
              onClick={() => setRepFilter('ALL')}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11.5px',
                fontWeight: 700,
                background: repFilter === 'ALL' ? '#234B3C' : 'transparent',
                color: repFilter === 'ALL' ? '#FFFFFF' : '#475569',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              All City ({allSocieties.length})
            </button>
          </div>

          {/* Status Tabs */}
          <div style={{ display: 'flex', gap: '4px', background: '#E2E8F0', padding: '3px', borderRadius: '8px', flexWrap: 'wrap' }}>
            {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map(st => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  background: statusFilter === st ? '#FFFFFF' : 'transparent',
                  color: statusFilter === st ? '#234B3C' : '#64748B',
                  boxShadow: statusFilter === st ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <Link
          to="/sales-onboarding"
          className="admin-btn-primary"
          style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '6px', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <Plus size={14} />
          <span>+ Onboard New Building</span>
        </Link>
      </div>

      {/* Responsive Mobile / Tablet / Desktop Card List */}
      <div className="admin-table-card">
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 16px', color: '#64748B' }}>
            <Building2 size={28} color="#CBD5E1" style={{ margin: '0 auto 6px' }} />
            <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '13.5px' }}>No societies found</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filtered.map((soc, idx) => (
              <div
                key={soc.id}
                style={{
                  padding: '12px 14px',
                  borderBottom: idx < filtered.length - 1 ? '1px solid #E2E8F0' : 'none',
                  background: soc.status === 'PENDING' ? '#FFFDF5' : '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}
              >
                {/* Society Name + Address + Units */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: '1 1 240px', minWidth: '220px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: '#EBF2EE',
                    color: '#234B3C',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px'
                  }}>
                    <Building2 size={16} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '13.5px', color: '#0F172A' }}>{soc.name}</strong>
                      <span style={{ fontSize: '11px', background: '#F1F5F9', color: '#334155', fontWeight: 700, padding: '1px 6px', borderRadius: '4px' }}>
                        {soc.totalUnits || 0} Units · {soc.totalFloors || 0} Floors
                      </span>
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                      <MapPin size={11} color="#F28E14" />
                      <span>{soc.address}</span>
                    </div>
                  </div>
                </div>

                {/* Secretary POC + 1-Tap Call */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 190px', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#0F172A' }}>{soc.secretaryName || 'POC Lead'}</div>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>+91 {soc.secretaryPhone || '—'}</div>
                  </div>
                  {soc.secretaryPhone && (
                    <a
                      href={`tel:${soc.secretaryPhone}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: '#ECFDF5',
                        color: '#059669',
                        border: '1px solid #A7F3D0',
                        padding: '4px 9px',
                        borderRadius: '6px',
                        fontSize: '11.5px',
                        fontWeight: 800,
                        textDecoration: 'none'
                      }}
                    >
                      <Phone size={11} />
                      <span>Call</span>
                    </a>
                  )}
                </div>

                {/* Status + Approval / Commission Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginLeft: 'auto' }}>
                  <span className={`status-pill ${(soc.status || 'PENDING').toLowerCase()}`}>
                    {soc.status}
                  </span>

                  {soc.status === 'APPROVED' ? (
                    <span style={{ fontSize: '11.5px', color: '#065F46', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#ECFDF5', padding: '3px 8px', borderRadius: '6px' }}>
                      <CheckCircle2 size={12} color="#059669" />
                      <span>Commission: <strong>{soc.commissionValue || 0}%</strong></span>
                    </span>
                  ) : soc.status === 'REJECTED' ? (
                    <span style={{ fontSize: '11.5px', color: '#B91C1C', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#FEF2F2', padding: '3px 8px', borderRadius: '6px' }}>
                      <AlertCircle size={12} color="#E11D48" />
                      <span>{soc.rejectionReason || 'Rejected'}</span>
                    </span>
                  ) : (
                    <span style={{ fontSize: '11.5px', color: '#B45309', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#FEF3C7', padding: '3px 8px', borderRadius: '6px' }}>
                      <Clock size={12} />
                      <span>Awaiting Admin Approval</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
