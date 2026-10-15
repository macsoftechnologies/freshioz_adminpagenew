import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Plus, MapPin, Store, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { useAdminRole } from '../context/AdminRoleContext';

export default function SalesMySocietiesPage() {
  const { store, currentUser } = useAdminRole();

  const [repFilter, setRepFilter] = useState('MY'); // 'MY' | 'ALL'
  const [statusFilter, setStatusFilter] = useState('ALL');

  const allSocieties = store.societies || [];
  const mySocietiesCount = allSocieties.filter(s => 
    !currentUser || 
    s.createdById === currentUser.id || 
    s.salesRepPhone === currentUser.phone || 
    s.salesRepName === currentUser.name ||
    !s.salesRepName
  ).length;

  const filtered = allSocieties.filter(s => {
    if (repFilter === 'MY' && currentUser) {
      const isMine = s.createdById === currentUser.id ||
                     s.salesRepPhone === currentUser.phone ||
                     s.salesRepName === currentUser.name ||
                     !s.salesRepName; // include default demo fixtures
      if (!isMine) return false;
    }
    if (statusFilter === 'ALL') return true;
    return s.status === statusFilter;
  });

  return (
    <div className="admin-page-container">
      {/* Compact Page Title & Filter Tabs */}
      <div className="page-title-header" style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Field Sales: Registered Societies
            </h1>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>
              Onboarded societies, store hub mapping & verification status
            </p>
          </div>

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
          <div style={{ display: 'flex', gap: '4px', background: '#E2E8F0', padding: '3px', borderRadius: '8px' }}>
            {['ALL', 'APPROVED', 'PENDING', 'REJECTED'].map(st => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                style={{
                  padding: '4px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
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

      {/* High-Density Table */}
      <div className="admin-table-card">
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>Society / Hostel</th>
                <th>Units / Floors</th>
                <th>Secretary / POC</th>
                <th>Sales Officer</th>
                <th>Status</th>
                <th>Remarks / Commission</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '36px 16px', color: '#64748B' }}>
                    <Building2 size={28} color="#CBD5E1" style={{ margin: '0 auto 6px' }} />
                    <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '13.5px' }}>No societies found</div>
                  </td>
                </tr>
              ) : (
                filtered.map(soc => (
                  <tr key={soc.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '6px',
                          background: '#EBF2EE',
                          color: '#234B3C',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <Building2 size={15} />
                        </div>
                        <div>
                          <strong style={{ fontSize: '13px', color: '#0F172A' }}>{soc.name}</strong>
                          <div style={{ fontSize: '11px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <MapPin size={11} color="#F28E14" />
                            <span>{soc.address}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <strong style={{ fontSize: '12.5px', color: '#0F172A' }}>{soc.totalUnits || 0} Units</strong>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>{soc.totalFloors || 0} Floors</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#0F172A' }}>{soc.secretaryName || 'POC Lead'}</div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>+91 {soc.secretaryPhone || '—'}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#1E293B' }}>{soc.salesRepName || 'Field Sales'}</div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>+91 {soc.salesRepPhone || '9845011000'}</div>
                    </td>
                    <td>
                      <span className={`status-pill ${soc.status.toLowerCase()}`}>
                        {soc.status}
                      </span>
                    </td>
                    <td>
                      {soc.status === 'APPROVED' ? (
                        <div style={{ fontSize: '12px', color: '#065F46', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle2 size={13} color="#059669" />
                          <span>Live in Storefront! Commission: <strong>{soc.commissionValue}%</strong></span>
                        </div>
                      ) : soc.status === 'REJECTED' ? (
                        <div style={{ fontSize: '11.5px', color: '#B91C1C', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <AlertCircle size={13} color="#E11D48" />
                          <span>Reason: {soc.rejectionReason || 'Location criteria not met'}</span>
                        </div>
                      ) : (
                        <div style={{ fontSize: '12px', color: '#B45309', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={13} />
                          <span>Awaiting Super Admin Review & Commission Setup</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
