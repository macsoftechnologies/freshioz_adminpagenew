import React, { useState, useEffect } from 'react';
import { Coins, Check, CreditCard, Clock, CheckCircle2, X } from 'lucide-react';
import { useAdminRole } from '../context/AdminRoleContext';
import { useToast } from '../context/ToastContext';
import { usePayouts, useApprovePayout, useRejectPayout } from '../hooks/resources';
import AdminPagination from '../components/common/AdminPagination';

export default function SocietyPayoutsPage() {
  const { currentUser } = useAdminRole();
  const { showToast } = useToast();

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, _setPageSize] = useState(15);
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: rawPayouts = [], isLoading } = usePayouts();
  const approvePayoutMutation = useApprovePayout();
  const rejectPayoutMutation = useRejectPayout();

  const withdrawals = useMemo(() => {
    if (!Array.isArray(rawPayouts)) return [];
    return rawPayouts.map(p => ({
      id: p.id,
      societyId: p.societyId,
      societyName: p.society?.name || p.societyName || 'Society Partner',
      amount: p.amount,
      status: p.status,
      bankUtr: p.transactionRef || p.bankUtr || '',
      bankName: p.society?.bankName || p.bankName || 'Bank Account',
      accountNo: p.society?.bankAccountNumber || p.accountNo || '••••5678',
      ifsc: p.society?.bankIfsc || p.ifsc || '',
      requestedAt: p.requestedAt || p.createdAt,
      disbursedAt: p.disbursedAt,
      disbursedBy: p.disbursedBy,
      rejectionReason: p.rejectionReason,
    })).sort((a, b) => new Date(b.requestedAt || 0) - new Date(a.requestedAt || 0));
  }, [rawPayouts]);

  const paginatedWithdrawals = withdrawals.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [bankUtr, setBankUtr] = useState('');
  const [rejectingWithdrawal, setRejectingWithdrawal] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('Invalid IFSC code or account holder name mismatch');

  const handleProcessDisbursal = async (e) => {
    e.preventDefault();
    if (!selectedWithdrawal || !bankUtr.trim()) {
      showToast('Please enter a valid Bank UTR / Transaction Reference number.', 'error');
      return;
    }

    try {
      setIsProcessing(true);
      await approvePayoutMutation.mutateAsync({
        id: selectedWithdrawal.id,
        transactionRef: bankUtr.trim(),
      });

      showToast(`Payout #${selectedWithdrawal.id} for ₹${selectedWithdrawal.amount.toLocaleString()} marked as Disbursed with Bank UTR ${bankUtr}!`, 'success');
      setSelectedWithdrawal(null);
      setBankUtr('');
    } catch (err) {
      showToast(err?.message || 'Failed to disburse payout on server.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectWithdrawal = async (e) => {
    e.preventDefault();
    if (!rejectingWithdrawal || !rejectionReason.trim()) {
      showToast('Please provide a reason for rejecting the withdrawal.', 'error');
      return;
    }

    try {
      setIsProcessing(true);
      await rejectPayoutMutation.mutateAsync({
        id: rejectingWithdrawal.id,
        reason: rejectionReason.trim(),
      });

      showToast(`Withdrawal #${rejectingWithdrawal.id} rejected and refunded on server.`, 'warning');
      setRejectingWithdrawal(null);
      setRejectionReason('');
    } catch (err) {
      showToast(err?.message || 'Failed to reject payout on server.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="admin-page-container">
      {/* Compact Page Title & Stats */}
      <div className="page-title-header" style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Society Cashback & Withdrawal Desk
            </h1>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>
              Direct NEFT/IMPS disbursals to registered apartment & hostel accounts
            </p>
          </div>

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11.5px', background: '#E2E8F0', color: '#334155', padding: '3px 10px', borderRadius: '6px', fontWeight: 700 }}>
              Total: {withdrawals.length}
            </span>
            <span style={{ fontSize: '11.5px', background: '#FEF3C7', color: '#B45309', padding: '3px 10px', borderRadius: '6px', fontWeight: 700 }}>
              Pending: {withdrawals.filter(w => w.status !== 'COMPLETED').length}
            </span>
            <span style={{ fontSize: '11.5px', background: '#EBF2EE', color: '#234B3C', padding: '3px 10px', borderRadius: '6px', fontWeight: 700 }}>
              Disbursed: {withdrawals.filter(w => w.status === 'COMPLETED').length}
            </span>
          </div>
        </div>
      </div>

      {/* Withdrawals Table */}
      <div className="admin-table-card">
        <div className="admin-table-header">
          <h3 style={{ fontSize: '15px', color: '#0F172A' }}>Society Withdrawal Queue</h3>
          <span style={{ fontSize: '12px', color: '#64748B' }}>Settlement mode: Direct NEFT/IMPS Transfer</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>Payout ID</th>
                <th>Society / Hostel</th>
                <th>Requested Amount</th>
                <th>Registered Bank Account</th>
                <th>Request Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {withdrawals.length === 0 ? (
                <tr>
                  <td colSpan="7">
                    <div className="admin-empty-state">
                      <div className="admin-empty-state-icon">
                        <Coins size={22} />
                      </div>
                      <div className="admin-empty-state-title">No Withdrawal Requests</div>
                      <div className="admin-empty-state-desc">
                        When societies earn commissions from delivered orders, committee withdrawal requests appear here for disbursement.
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedWithdrawals.map(w => (
                  <tr key={w.id}>
                    <td>
                      <strong style={{ fontFamily: 'monospace' }}>{w.id}</strong>
                    </td>
                    <td>
                      <strong>{w.societyName}</strong>
                    </td>
                    <td>
                      <strong style={{ fontSize: '15px', color: '#234B3C' }}>
                        ₹{w.amount.toLocaleString()}
                      </strong>
                    </td>
                    <td>
                      <div style={{ fontSize: '12.5px', color: '#1E293B' }}>{w.bankDetails}</div>
                    </td>
                    <td>
                      <span style={{ fontSize: '12px', color: '#64748B' }}>
                        {new Date(w.requestedAt).toLocaleDateString('en-IN')}
                      </span>
                    </td>
                    <td>
                      <span className={`status-pill ${w.status === 'COMPLETED' ? 'approved' : w.status === 'REJECTED' ? 'rejected' : 'pending'}`}>
                        {w.status === 'COMPLETED' ? 'DISBURSED' : w.status === 'REJECTED' ? 'REJECTED (REFUNDED)' : 'PENDING APPROVAL'}
                      </span>
                      {w.bankUtr && (
                        <div style={{ fontSize: '10.5px', color: '#059669', fontWeight: 700, marginTop: '2px' }}>
                          UTR: {w.bankUtr}
                        </div>
                      )}
                      {w.rejectionReason && (
                        <div style={{ fontSize: '10.5px', color: '#DC2626', marginTop: '2px', maxWidth: '200px' }}>
                          Reason: {w.rejectionReason}
                        </div>
                      )}
                    </td>
                    <td>
                      {w.status === 'PENDING_APPROVAL' ? (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedWithdrawal(w);
                              setBankUtr(`HDFCN${Date.now().toString().slice(-8)}`);
                            }}
                            style={{
                              background: '#F28E14',
                              color: '#FFF',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              padding: '5px 10px',
                              borderRadius: '6px',
                              border: 'none',
                              cursor: 'pointer'
                            }}
                          >
                            Disburse
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRejectingWithdrawal(w);
                              setRejectionReason('Invalid bank account / IFSC details provided');
                            }}
                            style={{
                              background: '#FFF',
                              color: '#DC2626',
                              border: '1px solid #FCA5A5',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              padding: '5px 10px',
                              borderRadius: '6px',
                              cursor: 'pointer'
                            }}
                          >
                            Reject & Refund
                          </button>
                        </div>
                      ) : w.status === 'REJECTED' ? (
                        <span style={{ fontSize: '11.5px', color: '#DC2626', fontWeight: 700 }}>
                          Refunded to Wallet
                        </span>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#059669', fontWeight: 700 }}>
                          ✓ Disbursed
                        </span>
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
          totalItems={withdrawals.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          itemLabel="payout requests"
        />
      </div>

      {/* Disbursal Modal */}
      {selectedWithdrawal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#FFF', borderRadius: '16px', maxWidth: '460px', width: '100%', padding: '24px', position: 'relative' }}>
            <button
              type="button"
              onClick={() => setSelectedWithdrawal(null)}
              style={{ position: 'absolute', top: '16px', right: '16px', width: '30px', height: '30px', borderRadius: '50%', background: '#F1F5F9', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={16} />
            </button>

            <h3 style={{ fontSize: '18px', color: '#0F172A', marginBottom: '8px' }}>
              Confirm Bank Disbursal
            </h3>
            <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '16px' }}>
              Transferring <strong>₹{selectedWithdrawal.amount.toLocaleString()}</strong> to <strong>{selectedWithdrawal.societyName}</strong>.
            </p>

            <form onSubmit={handleProcessDisbursal}>
              <div style={{ background: '#F8FAFC', borderRadius: '10px', padding: '12px', fontSize: '12.5px', marginBottom: '16px', border: '1px solid #E2E8F0' }}>
                <div>Target Bank: <strong>{selectedWithdrawal.bankDetails}</strong></div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12.5px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  Bank UTR / Transaction Reference Number *
                </label>
                <input
                  type="text"
                  value={bankUtr}
                  onChange={(e) => setBankUtr(e.target.value)}
                  style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '13.5px', fontFamily: 'monospace', fontWeight: 700 }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => setSelectedWithdrawal(null)} style={{ flex: 1, padding: '10px', background: '#F1F5F9', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isProcessing}
                  style={{ flex: 2, padding: '10px', background: isProcessing ? '#94A3B8' : '#059669', color: '#FFF', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: isProcessing ? 'not-allowed' : 'pointer' }}
                >
                  {isProcessing ? 'Processing on Server...' : 'Confirm Transfer & Disburse'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject & Refund Modal */}
      {rejectingWithdrawal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#FFF', borderRadius: '16px', maxWidth: '460px', width: '100%', padding: '24px', position: 'relative' }}>
            <button
              type="button"
              onClick={() => setRejectingWithdrawal(null)}
              style={{ position: 'absolute', top: '16px', right: '16px', width: '30px', height: '30px', borderRadius: '50%', background: '#F1F5F9', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={16} />
            </button>

            <h3 style={{ fontSize: '18px', color: '#DC2626', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Reject Withdrawal Request</span>
            </h3>
            <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '14px' }}>
              Rejecting this request will immediately <strong>refund ₹{rejectingWithdrawal.amount.toLocaleString()}</strong> back to <strong>{rejectingWithdrawal.societyName}</strong>'s available wallet balance.
            </p>

            <form onSubmit={handleRejectWithdrawal}>
              <div style={{ marginBottom: '18px' }}>
                <label style={{ fontSize: '12.5px', fontWeight: 700, display: 'block', marginBottom: '6px', color: '#334155' }}>
                  Reason for Rejection (Visible to Society Secretary) *
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => setRejectingWithdrawal(null)} style={{ flex: 1, padding: '10px', background: '#F1F5F9', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isProcessing}
                  style={{ flex: 2, padding: '10px', background: isProcessing ? '#94A3B8' : '#DC2626', color: '#FFF', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: isProcessing ? 'not-allowed' : 'pointer' }}
                >
                  {isProcessing ? 'Processing on Server...' : `Confirm Rejection & Refund ₹${rejectingWithdrawal.amount.toLocaleString()}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
