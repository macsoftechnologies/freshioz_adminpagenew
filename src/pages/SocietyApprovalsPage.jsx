import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Building2, 
  MapPin, 
  CreditCard, 
  Coins, 
  Check, 
  X, 
  AlertTriangle,
  User,
  Phone
} from 'lucide-react';
import { useAdminRole } from '../context/AdminRoleContext';
import { useToast } from '../context/ToastContext';
import { saveFreshiozStore } from '../shared/freshiozStore';
import { societyService } from '../services/societyService';
import AdminPagination from '../components/common/AdminPagination';

export default function SocietyApprovalsPage() {
  const { store, currentUser } = useAdminRole();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('PENDING'); // 'PENDING' | 'APPROVED' | 'REJECTED'
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Modal States
  const [selectedSociety, setSelectedSociety] = useState(null);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

  // Commission Form on Approval
  // Commission Form on Approval
  const [commissionType, setCommissionType] = useState('PERCENTAGE'); // 'PERCENTAGE' | 'FLAT'
  const [commissionValue, setCommissionValue] = useState('3.5');

  // Rejection Form
  const [rejectionReason, setRejectionReason] = useState('');
  const [successToast, setSuccessToast] = useState('');
  const [apiSocieties, setApiSocieties] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load live canonical societies from server
  useEffect(() => {
    let isMounted = true;
    async function loadSocieties() {
      try {
        setIsLoading(true);
        const data = await societyService.getAll();
        if (isMounted && Array.isArray(data)) {
          setApiSocieties(data);
          saveFreshiozStore(prev => ({ ...prev, societies: data }));
        }
      } catch (err) {
        console.warn('Backend societies load note:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadSocieties();
    return () => { isMounted = false; };
  }, []);

  const effectiveSocieties = apiSocieties.length > 0 ? apiSocieties : (store.societies || []);

  const societiesList = effectiveSocieties.filter(s => {
    if (activeTab === 'PENDING') return s.status === 'PENDING';
    if (activeTab === 'APPROVED') return s.status === 'APPROVED';
    if (activeTab === 'REJECTED') return s.status === 'REJECTED';
    return true;
  });

  const paginatedSocieties = societiesList.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleOpenApproveModal = (soc) => {
    setSelectedSociety(soc);
    setCommissionType('PERCENTAGE');
    setCommissionValue('3.5');
    setIsApproveModalOpen(true);
  };

  const handleConfirmApproval = async (e) => {
    e.preventDefault();
    if (!selectedSociety) return;

    try {
      const updatedSociety = await societyService.update(selectedSociety.id, {
        status: 'APPROVED',
        commissionType,
        commissionValue: Number(commissionValue),
      });

      // Strictly on confirmed server success, update component state with canonical server record
      const canonicalRecord = {
        ...selectedSociety,
        ...(updatedSociety || {}),
        status: 'APPROVED',
        commissionType,
        commissionValue: Number(commissionValue),
        approvedAt: new Date().toISOString(),
        approvedBy: currentUser?.name || 'Super Admin',
        approvedById: currentUser?.id || 'emp-101'
      };

      setApiSocieties(prev => prev.map(s => s.id === selectedSociety.id ? canonicalRecord : s));

      saveFreshiozStore(prev => ({
        ...prev,
        societies: (prev.societies || []).map(s => s.id === selectedSociety.id ? canonicalRecord : s)
      }));

      setIsApproveModalOpen(false);
      showToast(`✓ "${selectedSociety.name}" approved and live in User Storefront!`, 'success');
      setSuccessToast(`✓ "${selectedSociety.name}" has been approved on the server! It is now live in the User Storefront registration dropdown.`);
      setTimeout(() => setSuccessToast(''), 6000);
    } catch (err) {
      console.error('Society approval failed:', err);
      showToast(`Failed to approve society on server: ${err?.message || 'Network / Server Error'}`, 'error');
    }
  };

  const handleOpenRejectModal = (soc) => {
    setSelectedSociety(soc);
    setRejectionReason('');
    setIsRejectModalOpen(true);
  };

  const handleConfirmRejection = async (e) => {
    e.preventDefault();
    if (!selectedSociety) return;
    if (!rejectionReason.trim()) {
      showToast('Please provide a mandatory reason for rejecting this society onboarding.', 'error');
      return;
    }

    try {
      const updatedSociety = await societyService.update(selectedSociety.id, {
        status: 'REJECTED',
        rejectionReason: rejectionReason.trim(),
      });

      // Strictly on confirmed server success, update component state with canonical server record
      const canonicalRecord = {
        ...selectedSociety,
        ...(updatedSociety || {}),
        status: 'REJECTED',
        rejectionReason: rejectionReason.trim(),
        rejectedAt: new Date().toISOString(),
        rejectedBy: currentUser?.name || 'Super Admin',
        rejectedById: currentUser?.id || 'emp-101'
      };

      setApiSocieties(prev => prev.map(s => s.id === selectedSociety.id ? canonicalRecord : s));

      saveFreshiozStore(prev => ({
        ...prev,
        societies: (prev.societies || []).map(s => s.id === selectedSociety.id ? canonicalRecord : s)
      }));

      setIsRejectModalOpen(false);
      showToast(`✓ "${selectedSociety.name}" rejected on server.`, 'warning');
      setSuccessToast(`"${selectedSociety.name}" marked as Rejected on server. Feedback recorded.`);
      setTimeout(() => setSuccessToast(''), 6000);
    } catch (err) {
      console.error('Society rejection failed:', err);
      showToast(`Failed to reject society on server: ${err?.message || 'Network / Server Error'}`, 'error');
    }
  };

  return (
    <div className="admin-page-container">
      {/* Compact Page Title & Tabs */}
      <div className="page-title-header" style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Society & Hostel Verification Desk
            </h1>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>
              Field sales submissions, community network approval & commission setup
            </p>
          </div>

          {/* Tab Pill Switcher */}
          <div style={{ display: 'flex', gap: '4px', background: '#E2E8F0', padding: '3px', borderRadius: '8px' }}>
            {['PENDING', 'APPROVED', 'REJECTED'].map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setActiveTab(tab);
                  setCurrentPage(1);
                }}
                style={{
                  padding: '4px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  background: activeTab === tab ? '#FFFFFF' : 'transparent',
                  color: activeTab === tab ? '#234B3C' : '#64748B',
                  boxShadow: activeTab === tab ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                {tab} ({(store.societies || []).filter(s => s.status === tab).length})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Success Notification Alert */}
      {successToast && (
        <div style={{
          background: '#ECFDF5',
          border: '1.5px solid #059669',
          color: '#065F46',
          padding: '8px 14px',
          borderRadius: '8px',
          fontWeight: 700,
          fontSize: '12.5px',
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Check size={16} />
          <span>{successToast}</span>
        </div>
      )}

      {/* Societies High-Density Data Table */}
      <div className="admin-table-card">
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>Society / Hostel</th>
                <th>Units / Floors</th>
                <th>Secretary / POC Contact</th>
                <th>Settlement Bank Account</th>
                <th>Commission Model</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {societiesList.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '36px 16px', color: '#64748B' }}>
                    <Building2 size={28} color="#CBD5E1" style={{ margin: '0 auto 6px' }} />
                    <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '13.5px' }}>No societies found in {activeTab} status</div>
                    <div style={{ fontSize: '12px', marginTop: '2px' }}>Field submissions will appear here for verification.</div>
                  </td>
                </tr>
              ) : (
                paginatedSocieties.map(soc => (
                  <tr key={soc.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {soc.imageUrl ? (
                          <img 
                            src={soc.imageUrl} 
                            alt={soc.name} 
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '6px',
                              objectFit: 'cover',
                              border: '1.5px solid #CBD5E1',
                              flexShrink: 0
                            }} 
                          />
                        ) : (
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
                        )}
                        <div style={{ minWidth: 0, maxWidth: '280px' }}>
                          <strong style={{ fontSize: '13px', color: '#0F172A', display: 'block', whiteSpace: 'nowrap' }}>{soc.name}</strong>
                          <div style={{ 
                            fontSize: '11px', 
                            color: '#64748B', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '3px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }} title={soc.address}>
                            <MapPin size={11} color="#F28E14" style={{ flexShrink: 0 }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {soc.address ? soc.address.replace(/\r?\n/g, ', ') : 'Address on file'}
                            </span>
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
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A' }}>
                        {soc.bankDetails?.bankName || 'Bank Pending'}
                      </div>
                      <div style={{ fontSize: '10.5px', color: '#64748B', fontFamily: 'monospace' }}>
                        A/C ...{soc.bankDetails?.accountNumber?.slice(-4) || '—'} • IFSC: {soc.bankDetails?.ifscCode || '—'}
                      </div>
                    </td>
                    <td>
                      {soc.commissionValue ? (
                        <span style={{
                          background: '#FEF3C7',
                          color: '#B45309',
                          fontWeight: 800,
                          fontSize: '11.5px',
                          padding: '2px 8px',
                          borderRadius: '4px'
                        }}>
                          {soc.commissionType === 'PERCENTAGE' ? `${soc.commissionValue}% / Order` : `₹${soc.commissionValue} Flat`}
                        </span>
                      ) : (
                        <span style={{ fontSize: '11.5px', color: '#94A3B8' }}>Unconfigured</span>
                      )}
                    </td>
                    <td>
                      <span className={`status-pill ${soc.status.toLowerCase()}`}>
                        {soc.status}
                      </span>
                      {soc.rejectionReason && (
                        <div style={{ fontSize: '10.5px', color: '#E11D48', marginTop: '2px', maxWidth: '180px' }} title={soc.rejectionReason}>
                          Reason: {soc.rejectionReason.slice(0, 32)}...
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {soc.status === 'PENDING' ? (
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenApproveModal(soc)}
                            style={{
                              background: '#234B3C',
                              color: '#FFF',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              padding: '5px 10px',
                              borderRadius: '6px',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <CheckCircle size={13} />
                            <span>Approve</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenRejectModal(soc)}
                            style={{
                              background: '#FFE4E6',
                              color: '#E11D48',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              padding: '5px 10px',
                              borderRadius: '6px',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <XCircle size={13} />
                            <span>Reject</span>
                          </button>
                        </div>
                      ) : soc.status === 'APPROVED' ? (
                        <button
                          type="button"
                          onClick={() => handleOpenApproveModal(soc)}
                          style={{
                            background: '#F1F5F9',
                            color: '#234B3C',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: '1px solid #CBD5E1',
                            cursor: 'pointer'
                          }}
                        >
                          Edit %
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenApproveModal(soc)}
                          style={{
                            background: '#F1F5F9',
                            color: '#64748B',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: '1px solid #CBD5E1',
                            cursor: 'pointer'
                          }}
                        >
                          Re-evaluate
                        </button>
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
          totalItems={societiesList.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          itemLabel="societies"
        />
      </div>

      {/* APPROVAL MODAL (As Requested: Admin sets commission type & value with confirmation) */}
      {isApproveModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#FFF', borderRadius: '16px', maxWidth: '500px', width: '100%', padding: '24px', position: 'relative' }}>
            <button
              type="button"
              onClick={() => setIsApproveModalOpen(false)}
              style={{ position: 'absolute', top: '16px', right: '16px', width: '30px', height: '30px', borderRadius: '50%', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={16} />
            </button>

            <h3 style={{ fontSize: '20px', color: '#234B3C', marginBottom: '6px' }}>
              Approve Society Onboarding
            </h3>
            <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '18px' }}>
              Confirm onboarding for <strong>{selectedSociety?.name}</strong>. Configure the society maintenance cashback pool below:
            </p>

            <form onSubmit={handleConfirmApproval}>
              {/* Commission Type Selector */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', display: 'block', marginBottom: '6px' }}>
                  Society Commission Structure *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setCommissionType('PERCENTAGE')}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      border: commissionType === 'PERCENTAGE' ? '2px solid #234B3C' : '1px solid #CBD5E1',
                      background: commissionType === 'PERCENTAGE' ? '#EBF2EE' : '#FFF',
                      fontWeight: 700,
                      fontSize: '13px',
                      color: commissionType === 'PERCENTAGE' ? '#234B3C' : '#64748B'
                    }}
                  >
                    Percentage (%) per order
                  </button>

                  <button
                    type="button"
                    onClick={() => setCommissionType('FLAT')}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      border: commissionType === 'FLAT' ? '2px solid #234B3C' : '1px solid #CBD5E1',
                      background: commissionType === 'FLAT' ? '#EBF2EE' : '#FFF',
                      fontWeight: 700,
                      fontSize: '13px',
                      color: commissionType === 'FLAT' ? '#234B3C' : '#64748B'
                    }}
                  >
                    Flat (₹) per order
                  </button>
                </div>
              </div>

              {/* Commission Value */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', display: 'block', marginBottom: '6px' }}>
                  {commissionType === 'PERCENTAGE' ? 'Commission Percentage (e.g. 3.5%)' : 'Flat Cashback per Order (e.g. ₹5.00)'}
                </label>
                <input
                  type="number"
                  step="0.1"
                  className="form-input-control"
                  value={commissionValue}
                  onChange={(e) => setCommissionValue(e.target.value)}
                  style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '14px' }}
                  required
                />
              </div>

              <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '10px', padding: '12px', fontSize: '12px', color: '#065F46', marginBottom: '20px' }}>
                ✨ <strong>Immediate Action:</strong> Upon approval, residents of {selectedSociety?.name} can select this building in the dropdown and place next-day orders immediately!
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsApproveModalOpen(false)}
                  style={{ flex: 1, padding: '11px', background: '#F1F5F9', color: '#64748B', fontWeight: 700, borderRadius: '8px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ flex: 2, padding: '11px', background: '#234B3C', color: '#FFF', fontWeight: 700, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <Check size={16} /> Confirm & Activate Society
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REJECTION MODAL (As Requested: Mandatory Reason) */}
      {isRejectModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#FFF', borderRadius: '16px', maxWidth: '460px', width: '100%', padding: '24px', position: 'relative' }}>
            <button
              type="button"
              onClick={() => setIsRejectModalOpen(false)}
              style={{ position: 'absolute', top: '16px', right: '16px', width: '30px', height: '30px', borderRadius: '50%', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={16} />
            </button>

            <h3 style={{ fontSize: '18px', color: '#E11D48', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertTriangle size={18} /> Reject Society Submission
            </h3>
            <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '16px' }}>
              Provide a mandatory reason for rejecting <strong>{selectedSociety?.name}</strong>. This feedback will be displayed directly to the field sales representative.
            </p>

            <form onSubmit={handleConfirmRejection}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', display: 'block', marginBottom: '6px' }}>
                  Mandatory Rejection Reason *
                </label>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Society location is beyond our current delivery corridor for Regional Warehouse Hub; or bank IFSC code mismatched."
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '13px', resize: 'none' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsRejectModalOpen(false)}
                  style={{ flex: 1, padding: '11px', background: '#F1F5F9', color: '#64748B', fontWeight: 700, borderRadius: '8px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ flex: 1.5, padding: '11px', background: '#E11D48', color: '#FFF', fontWeight: 700, borderRadius: '8px' }}
                >
                  Submit Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
