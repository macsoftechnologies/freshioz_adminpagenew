import React, { useState } from 'react';
import { Users, MapPin, Phone, Mail, ArrowRight, Building2, UserCheck, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAdminRole } from '../context/AdminRoleContext';
import { leads as leadResource, employees as employeeResource } from '../hooks/resources';
import { useToast } from '../context/ToastContext';
import AdminPagination from '../components/common/AdminPagination';

export default function InboundLeadsPage() {
  const { currentUser, isAdmin, isSales } = useAdminRole();
  const { showToast } = useToast();

  const [filterTab, setFilterTab] = useState('ALL'); // 'ALL' | 'MY_LEADS' | 'UNASSIGNED' | 'CONVERTED'
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const { data: rawData = [], isLoading } = leadResource.useList();
  const { data: rawEmployees = [] } = employeeResource.useList();
  const updateLeadMutation = leadResource.useUpdate();

  const rawRequests = Array.isArray(rawData) ? rawData : (rawData?.leads || []);
  const salesOfficers = (Array.isArray(rawEmployees) ? rawEmployees : []).filter(e => (e.roles || []).includes('SALES_OFFICER') || e.role === 'SALES_OFFICER');

  // Handle assign sales rep
  const handleAssignSalesRep = async (leadId, salesRepId) => {
    const rep = salesOfficers.find(s => s.id === salesRepId);
    try {
      await updateLeadMutation.mutateAsync({
        id: leadId,
        data: {
          assignedToId: rep ? rep.id : null,
          assignedToName: rep ? rep.name : null,
          status: rep ? 'VERIFIED' : 'NEW_LEAD',
        }
      });
      showToast(rep ? `Assigned lead to ${rep.name}` : 'Unassigned lead', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to update lead on server.', 'error');
    }
  };

  // Scoped requests — sorted with New / Unassigned leads at the top above Converted leads
  const requests = rawRequests
    .filter(req => {
      if (filterTab === 'CONVERTED') return req.status === 'CONVERTED' || req.status === 'ONBOARDED';
      if (filterTab === 'UNASSIGNED') return !req.assignedToId && req.status !== 'CONVERTED' && req.status !== 'ONBOARDED';
      if (filterTab === 'MY_LEADS') return req.assignedToId === currentUser?.id;

      if (isSales) {
        return !req.assignedToId || req.assignedToId === currentUser?.id;
      }
      return true;
    })
    .sort((a, b) => {
      const doneA = a.status === 'CONVERTED' || a.status === 'ONBOARDED' ? 1 : 0;
      const doneB = b.status === 'CONVERTED' || b.status === 'ONBOARDED' ? 1 : 0;
      if (doneA !== doneB) return doneA - doneB;
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });

  const paginatedRequests = requests.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const pendingCount = rawRequests.filter(r => r.status !== 'CONVERTED' && r.status !== 'ONBOARDED').length;

  return (
    <div className="admin-page-container">
      {/* Compact Page Title & Stats */}
      <div className="page-title-header" style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            1. Inbound Society Requests
          </h1>
          <span style={{ fontSize: '11.5px', background: '#FEF3C7', color: '#B45309', padding: '3px 10px', borderRadius: '6px', fontWeight: 800 }}>
            {pendingCount} Pending
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
      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
        {[
          { id: 'ALL', label: `All (${rawRequests.length})` },
          ...(isSales ? [{ id: 'MY_LEADS', label: `Assigned To Me (${rawRequests.filter(r => r.assignedToId === currentUser?.id).length})` }] : []),
          { id: 'UNASSIGNED', label: `New / Unassigned (${rawRequests.filter(r => !r.assignedToId && r.status !== 'CONVERTED' && r.status !== 'ONBOARDED').length})` },
          { id: 'CONVERTED', label: `Converted (${rawRequests.filter(r => r.status === 'CONVERTED' || r.status === 'ONBOARDED').length})` }
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
              fontWeight: 700,
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

      {/* Responsive Mobile / Tablet / Desktop Card List */}
      <div className="admin-table-card">
        {requests.length === 0 ? (
          <div className="admin-empty-state" style={{ padding: '36px 16px' }}>
            <div className="admin-empty-state-icon">
              <Building2 size={22} />
            </div>
            <div className="admin-empty-state-title">No Inbound Society Leads</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {paginatedRequests.map((req, idx) => {
              const isConverted = req.status === 'CONVERTED' || req.status === 'ONBOARDED';
              const phoneNum = req.contactPhone || req.requesterPhone;

              return (
                <div
                  key={req.id}
                  style={{
                    padding: '12px 14px',
                    borderBottom: idx < paginatedRequests.length - 1 ? '1px solid #E2E8F0' : 'none',
                    background: isConverted ? '#FAFFFC' : '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}
                >
                  {/* Society Name + Address + Flats */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: '1 1 240px', minWidth: '220px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: isConverted ? '#DCFCE7' : '#FEF3C7',
                      color: isConverted ? '#15803D' : '#B45309',
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
                        <strong style={{ fontSize: '13.5px', color: '#0F172A' }}>{req.societyName}</strong>
                        <span style={{ fontSize: '11px', background: '#F1F5F9', color: '#334155', fontWeight: 800, padding: '1px 6px', borderRadius: '4px' }}>
                          ~{req.flatCount || req.estimatedFlats || 150} Flats
                        </span>
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <MapPin size={11} color="#F28E14" />
                        <span>{req.address || 'Address pending'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Requester Contact + 1-Tap Call */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 200px', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#0F172A' }}>
                        {req.contactName || req.requesterName || 'Resident'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>
                        {phoneNum ? `+91 ${phoneNum}` : 'No phone'}
                      </div>
                    </div>
                    {phoneNum && (
                      <a
                        href={`tel:${phoneNum}`}
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

                  {/* Sales Rep + Status + 1-Tap Onboard Action */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginLeft: 'auto' }}>
                    {isAdmin && (
                      <select
                        className="admin-input-compact"
                        value={req.assignedToId || ''}
                        onChange={(e) => handleAssignSalesRep(req.id, e.target.value)}
                        style={{ fontSize: '11.5px', padding: '4px 8px', borderRadius: '6px' }}
                      >
                        <option value="">-- Unassigned --</option>
                        {salesOfficers.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    )}

                    {isConverted ? (
                      <>
                        <span style={{ fontSize: '11px', background: '#DCFCE7', color: '#166534', fontWeight: 800, padding: '3px 8px', borderRadius: '5px' }}>
                          ✓ ONBOARDED
                        </span>
                        <Link
                          to="/societies"
                          style={{
                            background: '#ECFDF5',
                            color: '#065F46',
                            border: '1px solid #A7F3D0',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            padding: '5px 10px',
                            borderRadius: '6px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            textDecoration: 'none'
                          }}
                        >
                          <span>View</span>
                          <ArrowRight size={12} />
                        </Link>
                      </>
                    ) : (
                      <>
                        <span style={{ fontSize: '11px', background: '#FEF3C7', color: '#B45309', fontWeight: 800, padding: '3px 8px', borderRadius: '5px' }}>
                          ⏳ NEW REQUEST
                        </span>
                        <Link
                          to={`/sales-onboarding?leadId=${req.id}`}
                          style={{
                            background: '#234B3C',
                            color: '#FFF',
                            fontSize: '12px',
                            fontWeight: 800,
                            padding: '6px 12px',
                            borderRadius: '6px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            textDecoration: 'none'
                          }}
                        >
                          <span>+ Onboard</span>
                          <ArrowRight size={13} />
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
