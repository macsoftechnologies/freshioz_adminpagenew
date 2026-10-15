import React, { useState } from 'react';
import { Users, MapPin, Phone, Mail, ArrowRight, Building2, UserCheck, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAdminRole } from '../context/AdminRoleContext';
import { saveFreshiozStore } from '../shared/freshiozStore';
import { useToast } from '../context/ToastContext';
import AdminPagination from '../components/common/AdminPagination';

export default function InboundLeadsPage() {
  const { store, currentUser, isAdmin, isSales } = useAdminRole();
  const { showToast } = useToast();

  const [filterTab, setFilterTab] = useState('ALL'); // 'ALL' | 'MY_LEADS' | 'UNASSIGNED' | 'CONVERTED'
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const rawRequests = store.societyRequests || [];
  const salesOfficers = (store.employees || []).filter(e => (e.roles || []).includes('SALES_OFFICER') || e.role === 'SALES_OFFICER');

  // Handle assign sales rep
  const handleAssignSalesRep = (leadId, salesRepId) => {
    const rep = salesOfficers.find(s => s.id === salesRepId);
    saveFreshiozStore(prev => ({
      ...prev,
      societyRequests: (prev.societyRequests || []).map(r => r.id === leadId ? {
        ...r,
        assignedToId: rep ? rep.id : null,
        assignedToName: rep ? rep.name : null,
        assignedAt: rep ? new Date().toISOString() : null,
        assignedBy: currentUser?.name || 'Super Admin',
        assignedById: currentUser?.id || 'emp-101'
      } : r)
    }));
    showToast(rep ? `Assigned lead to ${rep.name}` : 'Unassigned lead', 'success');
  };

  // Scoped requests
  const requests = rawRequests.filter(req => {
    if (filterTab === 'CONVERTED') return req.status === 'CONVERTED';
    if (filterTab === 'UNASSIGNED') return !req.assignedToId && req.status !== 'CONVERTED';
    if (filterTab === 'MY_LEADS') return req.assignedToId === currentUser?.id;

    if (isSales) {
      // Sales person sees leads assigned to them or unassigned leads
      return !req.assignedToId || req.assignedToId === currentUser?.id;
    }
    return true;
  });

  const paginatedRequests = requests.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const pendingCount = rawRequests.filter(r => r.status !== 'CONVERTED').length;

  return (
    <div className="admin-page-container">
      {/* Compact Page Title & Stats */}
      <div className="page-title-header" style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Inbound Customer Society Requests
            </h1>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>
              Societies requested by shoppers not yet in the registration dropdown • Assigned to Field Sales for onboarding
            </p>
          </div>

          <span style={{ fontSize: '11.5px', background: '#FEF3C7', color: '#B45309', padding: '3px 10px', borderRadius: '6px', fontWeight: 700 }}>
            {pendingCount} Pending Leads
          </span>
        </div>

        <Link
          to="/sales-onboarding"
          className="admin-btn-primary"
          style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '6px', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <span>+ Onboard New Building</span>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
        {[
          { id: 'ALL', label: `All Leads (${rawRequests.length})` },
          ...(isSales ? [{ id: 'MY_LEADS', label: `Assigned To Me (${rawRequests.filter(r => r.assignedToId === currentUser?.id).length})` }] : []),
          { id: 'UNASSIGNED', label: `Unassigned (${rawRequests.filter(r => !r.assignedToId && r.status !== 'CONVERTED').length})` },
          { id: 'CONVERTED', label: `Converted (${rawRequests.filter(r => r.status === 'CONVERTED').length})` }
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setFilterTab(tab.id);
              setCurrentPage(1);
            }}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              border: filterTab === tab.id ? '1.5px solid #234B3C' : '1px solid #E2E8F0',
              background: filterTab === tab.id ? '#234B3C' : '#FFFFFF',
              color: filterTab === tab.id ? '#FFFFFF' : '#64748B'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* High-Density Table */}
      <div className="admin-table-card">
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>Requested Society</th>
                <th>Requester Customer</th>
                <th>Est. Flats / GPS</th>
                <th>Assigned Sales Rep</th>
                <th>Lead Status</th>
                <th style={{ textAlign: 'right' }}>Sales Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td colSpan="6">
                    <div className="admin-empty-state">
                      <div className="admin-empty-state-icon">
                        <Building2 size={22} />
                      </div>
                      <div className="admin-empty-state-title">No Inbound Society Leads</div>
                      <div className="admin-empty-state-desc">
                        When customers request fresh doorstep delivery to unlisted residential apartments, leads appear here for field verification.
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedRequests.map(req => (
                  <tr key={req.id}>
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
                          <strong style={{ fontSize: '13px', color: '#0F172A' }}>{req.societyName}</strong>
                          <div style={{ fontSize: '11px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <MapPin size={11} color="#F28E14" />
                            <span>{req.address}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#0F172A' }}>{req.requesterName}</div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>
                        +91 {req.requesterPhone} {req.requesterEmail ? `• ${req.requesterEmail}` : ''}
                      </div>
                    </td>
                    <td>
                      <strong style={{ fontSize: '12.5px', color: '#0F172A' }}>
                        ~{req.estimatedFlats || 150} Flats
                      </strong>
                      <div style={{ fontSize: '10.5px', color: '#64748B' }}>
                        Lat {req.lat}, Lng {req.lng}
                      </div>
                    </td>
                    <td>
                      {isAdmin ? (
                        <select
                          className="admin-input-compact"
                          value={req.assignedToId || ''}
                          onChange={(e) => handleAssignSalesRep(req.id, e.target.value)}
                          style={{ fontSize: '11.5px', padding: '3px 8px', borderRadius: '4px' }}
                        >
                          <option value="">-- Unassigned --</option>
                          {salesOfficers.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      ) : (
                        req.assignedToName ? (
                          <span style={{ fontSize: '11.5px', color: '#0F172A', fontWeight: 600 }}>
                            {req.assignedToName}
                          </span>
                        ) : (
                          <span style={{ fontSize: '11px', color: '#94A3B8', fontStyle: 'italic' }}>
                            Unassigned
                          </span>
                        )
                      )}
                    </td>
                    <td>
                      {req.status === 'CONVERTED' ? (
                        <span style={{ fontSize: '11px', background: '#DCFCE7', color: '#166534', fontWeight: 800, padding: '2px 8px', borderRadius: '4px' }}>
                          ✓ CONVERTED
                        </span>
                      ) : (
                        <span style={{ fontSize: '11px', background: '#FEF3C7', color: '#B45309', fontWeight: 800, padding: '2px 8px', borderRadius: '4px' }}>
                          NEW FIELD LEAD
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {req.status === 'CONVERTED' ? (
                        <Link
                          to="/societies"
                          style={{
                            background: '#ECFDF5',
                            color: '#065F46',
                            border: '1px solid #A7F3D0',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            padding: '4px 10px',
                            borderRadius: '6px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            textDecoration: 'none'
                          }}
                        >
                          <span>View in Societies</span>
                          <ArrowRight size={12} />
                        </Link>
                      ) : (
                        <Link
                          to={`/sales-onboarding?leadId=${req.id}`}
                          style={{
                            background: '#234B3C',
                            color: '#FFF',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            padding: '5px 12px',
                            borderRadius: '6px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            textDecoration: 'none'
                          }}
                        >
                          <span>Onboard Field</span>
                          <ArrowRight size={13} />
                        </Link>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <AdminPagination
          currentPage={currentPage}
          totalItems={requests.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          itemLabel="society leads"
        />
      </div>
    </div>
  );
}
