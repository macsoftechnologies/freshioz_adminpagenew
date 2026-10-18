import React, { useState, useMemo, useEffect } from 'react';
import { Truck, MapPin, FileText, CheckCircle2, Eye, X, Image as ImageIcon, Trash2, Users, Building2, Calendar, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAdminRole } from '../context/AdminRoleContext';
import { useToast } from '../context/ToastContext';
import { procurement as procurementResource } from '../hooks/resources';
import AdminPagination from '../components/common/AdminPagination';

export default function ProcurementLogsPage() {
  const { currentUser } = useAdminRole();
  const { showToast } = useToast();

  const [scopeFilter, setScopeFilter] = useState('ALL'); // 'ALL' | 'MY'
  const [datePreset, setDatePreset] = useState('ALL'); // 'ALL' | 'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH' | 'CUSTOM'
  const [customDate, setCustomDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const { data: rawLogs = [], isLoading } = procurementResource.useList();
  const removeProcurementMutation = procurementResource.useRemove();
  const allLogs = Array.isArray(rawLogs) ? rawLogs : [];

  // Filter logs by scope, date, and search query
  const filteredLogs = useMemo(() => {
    return allLogs.filter(log => {
      // 1. Scope filter (All vs My bills)
      if (scopeFilter === 'MY' && currentUser) {
        if (log.loggedByOfficerId !== currentUser.id && log.loggedByOfficerName !== currentUser.name) {
          return false;
        }
      }

      // 2. Date filter
      const rawDate = log.timestamp || log.createdAt || log.date || '';
      const logDateStr = rawDate ? new Date(rawDate).toISOString().slice(0, 10) : '';
      const todayStr = new Date().toISOString().slice(0, 10);

      if (datePreset === 'TODAY' && logDateStr !== todayStr) return false;
      if (datePreset === 'YESTERDAY') {
        const y = new Date();
        y.setDate(y.getDate() - 1);
        if (logDateStr !== y.toISOString().slice(0, 10)) return false;
      }
      if (datePreset === 'WEEK') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        if (new Date(rawDate || 0).getTime() < weekAgo.getTime()) return false;
      }
      if (datePreset === 'MONTH') {
        if (!logDateStr.startsWith(todayStr.slice(0, 7))) return false;
      }
      if (datePreset === 'CUSTOM' && customDate) {
        if (logDateStr !== customDate) return false;
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesBill = String(log.billNumber || '').toLowerCase().includes(q);
        const matchesVendor = String(log.vendorName || '').toLowerCase().includes(q);
        const matchesMandi = String(log.mandiName || '').toLowerCase().includes(q);
        const matchesBuyer = String(log.loggedByOfficerName || '').toLowerCase().includes(q);
        const matchesItems = (log.items || []).some(i => String(i.name || '').toLowerCase().includes(q));
        if (!matchesBill && !matchesVendor && !matchesMandi && !matchesBuyer && !matchesItems) return false;
      }

      return true;
    });
  }, [allLogs, scopeFilter, currentUser, datePreset, customDate, searchQuery]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [scopeFilter, datePreset, customDate, searchQuery]);

  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  // Period totals
  const periodTotalPaid = useMemo(() => {
    return filteredLogs.reduce((acc, l) => acc + (Number(l.totalAmountPaid) || 0), 0);
  }, [filteredLogs]);

  const periodTotalWeight = useMemo(() => {
    return filteredLogs.reduce((acc, l) => acc + (Number(l.totalWeightKg) || (l.items || []).reduce((sum, it) => sum + (parseFloat(it.qty) || 0), 0)), 0);
  }, [filteredLogs]);

  const datePresetLabel = useMemo(() => {
    if (datePreset === 'TODAY') return 'Today';
    if (datePreset === 'YESTERDAY') return 'Yesterday';
    if (datePreset === 'WEEK') return 'This Week (Past 7 Days)';
    if (datePreset === 'MONTH') return 'This Month';
    if (datePreset === 'CUSTOM') return customDate ? `Date: ${customDate}` : 'Custom Date';
    return 'All Time';
  }, [datePreset, customDate]);

  const [activePhotoModal, setActivePhotoModal] = useState(null); // URL or null
  const [deleteLogModal, setDeleteLogModal] = useState(null); // log or null

  const handleConfirmDelete = async () => {
    if (!deleteLogModal) return;
    try {
      await removeProcurementMutation.mutateAsync(deleteLogModal.id);
      showToast(`Mandi bill #${deleteLogModal.billNumber} removed from ledger.`, 'info');
    } catch (err) {
      showToast(err.message || 'Failed to remove bill from server.', 'error');
    } finally {
      setDeleteLogModal(null);
    }
  };

  return (
    <div className="admin-page-container">
      {/* Compact Page Title & Stats */}
      <div className="page-title-header" style={{ marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Mandi Purchases Audit & Bills Ledger
            </h1>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>
              Morning APMC transactions, weighing slip images & society allocation ledger
            </p>
          </div>

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            {currentUser && (
              <div style={{ display: 'flex', gap: '4px', background: '#F1F5F9', border: '1px solid #CBD5E1', padding: '2px', borderRadius: '8px' }}>
                <button
                  type="button"
                  onClick={() => setScopeFilter('ALL')}
                  style={{
                    padding: '3px 9px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    background: scopeFilter === 'ALL' ? '#234B3C' : 'transparent',
                    color: scopeFilter === 'ALL' ? '#FFFFFF' : '#475569',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  All Bills ({allLogs.length})
                </button>
                <button
                  type="button"
                  onClick={() => setScopeFilter('MY')}
                  style={{
                    padding: '3px 9px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    background: scopeFilter === 'MY' ? '#234B3C' : 'transparent',
                    color: scopeFilter === 'MY' ? '#FFFFFF' : '#475569',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  My Bills ({allLogs.filter(l => l.loggedByOfficerId === currentUser?.id || l.loggedByOfficerName === currentUser?.name).length})
                </button>
              </div>
            )}
            <span style={{ fontSize: '11.5px', background: '#E2E8F0', color: '#334155', padding: '3px 10px', borderRadius: '6px', fontWeight: 700 }}>
              Bills: {filteredLogs.length}
            </span>
            <span style={{ fontSize: '11.5px', background: '#EBF2EE', color: '#234B3C', padding: '3px 10px', borderRadius: '6px', fontWeight: 700 }}>
              Period Spend: ₹{periodTotalPaid.toLocaleString()}
            </span>
          </div>
        </div>

        <Link
          to="/procurement-entry"
          className="admin-btn-accent"
          style={{ fontSize: '12.5px', padding: '7px 16px', borderRadius: '8px', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
        >
          <span>+ Log Mandi Purchase</span>
        </Link>
      </div>

      {/* Date & Filter Control Bar */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '12px',
        padding: '12px 16px',
        marginBottom: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        {/* Row 1: Date Range Pills & Calendar Picker + Search */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => { setDatePreset('TODAY'); setCustomDate(''); }}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                border: datePreset === 'TODAY' ? '1.5px solid #059669' : '1px solid #CBD5E1',
                background: datePreset === 'TODAY' ? '#ECFDF5' : '#FFFFFF',
                color: datePreset === 'TODAY' ? '#065F46' : '#475569',
                fontWeight: 800,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <span>Today</span>
              {datePreset === 'TODAY' && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#059669' }} />}
            </button>

            <button
              type="button"
              onClick={() => { setDatePreset('YESTERDAY'); setCustomDate(''); }}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                border: datePreset === 'YESTERDAY' ? '1.5px solid #059669' : '1px solid #CBD5E1',
                background: datePreset === 'YESTERDAY' ? '#ECFDF5' : '#FFFFFF',
                color: datePreset === 'YESTERDAY' ? '#065F46' : '#475569',
                fontWeight: 800,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <span>Yesterday</span>
              {datePreset === 'YESTERDAY' && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#059669' }} />}
            </button>

            <button
              type="button"
              onClick={() => { setDatePreset('WEEK'); setCustomDate(''); }}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                border: datePreset === 'WEEK' ? '1.5px solid #059669' : '1px solid #CBD5E1',
                background: datePreset === 'WEEK' ? '#ECFDF5' : '#FFFFFF',
                color: datePreset === 'WEEK' ? '#065F46' : '#475569',
                fontWeight: 800,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <span>This Week (7 Days)</span>
              {datePreset === 'WEEK' && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#059669' }} />}
            </button>

            <button
              type="button"
              onClick={() => { setDatePreset('MONTH'); setCustomDate(''); }}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                border: datePreset === 'MONTH' ? '1.5px solid #059669' : '1px solid #CBD5E1',
                background: datePreset === 'MONTH' ? '#ECFDF5' : '#FFFFFF',
                color: datePreset === 'MONTH' ? '#065F46' : '#475569',
                fontWeight: 800,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <span>This Month</span>
              {datePreset === 'MONTH' && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#059669' }} />}
            </button>

            <button
              type="button"
              onClick={() => { setDatePreset('ALL'); setCustomDate(''); }}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                border: datePreset === 'ALL' ? '1.5px solid #059669' : '1px solid #CBD5E1',
                background: datePreset === 'ALL' ? '#ECFDF5' : '#FFFFFF',
                color: datePreset === 'ALL' ? '#065F46' : '#475569',
                fontWeight: 800,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <span>All Time</span>
              {datePreset === 'ALL' && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#059669' }} />}
            </button>

            {/* Custom Single Day Calendar Picker */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '6px' }}>
              <Calendar size={14} color="#059669" />
              <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600 }}>Calendar:</span>
              <input
                type="date"
                value={customDate}
                onChange={(e) => {
                  if (e.target.value) {
                    setCustomDate(e.target.value);
                    setDatePreset('CUSTOM');
                  }
                }}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: datePreset === 'CUSTOM' ? '1.5px solid #059669' : '1.5px solid #CBD5E1',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  color: '#0F172A',
                  background: datePreset === 'CUSTOM' ? '#ECFDF5' : '#FFFFFF',
                  cursor: 'pointer'
                }}
              />
            </div>
          </div>

          {/* Quick Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#F8FAFC', border: '1.5px solid #CBD5E1', borderRadius: '8px', padding: '4px 10px', minWidth: '240px' }}>
            <Search size={14} color="#64748B" />
            <input
              type="text"
              placeholder="Search by Bill #, Vendor, Crop, Yard..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '12px', width: '100%' }}
            />
          </div>
        </div>

        {/* Row 2: Selected Period Summary Badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', borderTop: '1px solid #F1F5F9', paddingTop: '8px' }}>
          <div style={{ fontSize: '12px', color: '#64748B' }}>
            Showing <strong>{filteredLogs.length}</strong> verified bills for <strong>{datePresetLabel}</strong>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span style={{ fontSize: '11.5px', background: '#F1F5F9', color: '#334155', padding: '3px 9px', borderRadius: '6px', fontWeight: 700 }}>
              ⚖️ Total Weight: {periodTotalWeight.toLocaleString()} kg
            </span>
            <span style={{ fontSize: '12px', background: '#ECFDF5', color: '#047857', padding: '3px 10px', borderRadius: '6px', fontWeight: 800 }}>
              💰 Mandi Spend: ₹{periodTotalPaid.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      <div className="admin-table-card">
        <div className="admin-table-header">
          <div>
            <h3 style={{ fontSize: '15px', color: '#0F172A', margin: 0 }}>Verified Mandi Invoices ({filteredLogs.length})</h3>
            <span style={{ fontSize: '12px', color: '#64748B' }}>
              Audited weighing slips and produce deliveries allocated across apartment communities
            </span>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>Invoice & Slip Photo</th>
                <th>Mandi Vendor & Yard</th>
                <th>Items Procured</th>
                <th>Destination Hub & Societies</th>
                <th>Payment Mode</th>
                <th>Total Paid (₹)</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="7">
                    <div className="admin-empty-state">
                      <div className="admin-empty-state-icon">
                        <FileText size={22} />
                      </div>
                      <div className="admin-empty-state-title">No Mandi Bills Found</div>
                      <div className="admin-empty-state-desc">
                        {datePreset !== 'ALL' || searchQuery
                          ? `No purchase bills matching ${datePresetLabel} and search criteria.`
                          : 'Click "+ Log Mandi Purchase" above to enter APMC auction purchase receipts and vendor weights.'}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedLogs.map(log => (
                  <tr key={log.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {log.receiptPhoto ? (
                          <div 
                            style={{ position: 'relative', cursor: 'pointer' }}
                            onClick={() => setActivePhotoModal(log.receiptPhoto)}
                            title="Click to view full Mandi slip"
                          >
                            <img
                              src={log.receiptPhoto}
                              alt="Bill Slip"
                              style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px', border: '1.5px solid #10B981' }}
                            />
                            <div style={{
                              position: 'absolute',
                              bottom: '-4px',
                              right: '-4px',
                              background: '#234B3C',
                              color: '#FFF',
                              borderRadius: '50%',
                              width: '18px',
                              height: '18px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              <Eye size={10} />
                            </div>
                          </div>
                        ) : (
                          <div style={{ width: '48px', height: '48px', borderRadius: '6px', background: '#F1F5F9', border: '1px dashed #CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <ImageIcon size={18} color="#94A3B8" />
                          </div>
                        )}
                        <div>
                          <strong style={{ fontFamily: 'monospace', color: '#0F172A', fontSize: '13px' }}>
                            {log.billNumber}
                          </strong>
                          <div style={{ fontSize: '11px', color: log.receiptPhoto ? '#059669' : '#64748B', fontWeight: 700 }}>
                            {log.receiptPhoto ? '✓ Weighing Slip Attached' : 'Slip Verified'}
                          </div>
                          <div style={{ fontSize: '10.5px', color: '#94A3B8' }}>
                            {log.timestamp ? new Date(log.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : ''}{' '}
                            • {log.timestamp ? new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Dawn 05:30 AM'}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <strong style={{ fontSize: '13px', color: '#0F172A' }}>{log.vendorName}</strong>
                      <div style={{ fontSize: '11.5px', color: '#64748B' }}>{log.mandiName}</div>
                      <div style={{ fontSize: '11px', color: '#234B3C', fontWeight: 600 }}>Buyer: {log.loggedByOfficerName || 'Procurement Buyer'}</div>
                    </td>

                    <td>
                      <div style={{ fontSize: '12.5px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        {(log.items || []).map((i, idx) => (
                          <div key={idx} style={{ color: '#1E293B' }}>
                            • {i.name} — <strong>{i.qty}</strong> @ ₹{i.rate}/kg
                          </div>
                        ))}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', fontWeight: 700 }}>
                        Total Weight: {log.totalWeightKg || (log.items || []).reduce((acc, it) => acc + (parseFloat(it.qty) || 0), 0)} kg
                      </div>
                    </td>

                    <td>
                      <div>
                        <span style={{ fontSize: '11.5px', background: '#EBF2EE', color: '#234B3C', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', display: 'inline-block', marginBottom: '4px' }}>
                          {log.destinationName}
                        </span>
                        
                        {/* Contributing Societies & Customers */}
                        <div style={{ fontSize: '11.5px', color: '#334155', marginTop: '4px' }}>
                          <div style={{ fontWeight: 700, color: '#0284C7', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Building2 size={12} />
                            <span>{log.contributingSocieties && log.contributingSocieties.length > 0 ? log.contributingSocieties.join(', ') : 'Direct Warehouse Inflow'}</span>
                          </div>
                          {log.contributingResidents && log.contributingResidents.length > 0 && (
                            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                              Serving: {log.contributingResidents.slice(0, 2).join(', ')}
                              {log.contributingResidents.length > 2 && ` +${log.contributingResidents.length - 2} more`}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td>
                      <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '3px' }}>
                        <span style={{
                          background: '#ECFDF5',
                          color: '#059669',
                          fontWeight: 800,
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '4px'
                        }}>
                          {log.paymentMode?.replace(/_/g, ' ') || 'IMPS TRANSFER'}
                        </span>
                        <span style={{ fontSize: '10.5px', color: '#64748B' }}>
                          Freight: ₹{log.transportAmount || 0}
                        </span>
                      </div>
                    </td>

                    <td>
                      <strong style={{ fontSize: '15px', color: '#0F172A', fontWeight: 800 }}>
                        ₹{(log.totalAmountPaid || 0).toLocaleString()}
                      </strong>
                      <div style={{ fontSize: '10.5px', color: '#64748B' }}>
                        Produce: ₹{(log.produceSubtotal || 0).toLocaleString()}
                      </div>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        {log.receiptPhoto && (
                          <button
                            type="button"
                            onClick={() => setActivePhotoModal(log.receiptPhoto)}
                            style={{
                              background: '#F1F5F9',
                              border: '1px solid #CBD5E1',
                              borderRadius: '6px',
                              padding: '5px 8px',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              color: '#334155'
                            }}
                          >
                            View Slip
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setDeleteLogModal(log)}
                          style={{
                            background: '#FFF',
                            border: '1px solid #FCA5A5',
                            borderRadius: '6px',
                            padding: '5px 8px',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            color: '#DC2626'
                          }}
                          title="Void bill entry"
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
          totalItems={filteredLogs.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          itemLabel="mandi bills"
        />
      </div>

      {/* FULL RECEIPT PHOTO VIEW MODAL */}
      {activePhotoModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.8)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            maxWidth: '650px',
            width: '100%',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <strong style={{ fontSize: '14px', color: '#0F172A' }}>Mandi Weighing Slip / Bill Invoice Photo</strong>
              <button
                type="button"
                onClick={() => setActivePhotoModal(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '16px', textAlign: 'center', maxHeight: '70vh', overflowY: 'auto' }}>
              <img
                src={activePhotoModal}
                alt="Full Mandi Slip"
                style={{ maxWidth: '100%', maxHeight: '65vh', objectFit: 'contain', borderRadius: '8px' }}
              />
            </div>
            <div style={{ padding: '12px 18px', borderTop: '1px solid #E2E8F0', textAlign: 'right' }}>
              <button
                type="button"
                onClick={() => setActivePhotoModal(null)}
                className="admin-btn-secondary"
                style={{ fontSize: '12.5px', padding: '6px 16px' }}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteLogModal && (
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
          <div style={{
            background: '#FFFFFF',
            borderRadius: '14px',
            maxWidth: '440px',
            width: '100%',
            padding: '20px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: '0 0 8px' }}>
              Void Mandi Purchase #{deleteLogModal.billNumber}?
            </h3>
            <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, margin: '0 0 16px' }}>
              Are you sure you want to remove this Mandi bill entry for <strong>₹{deleteLogModal.totalAmountPaid.toLocaleString()}</strong>? Use this if this was an accidental duplicate entry.
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setDeleteLogModal(null)}
                style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFF', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                style={{ flex: 1, padding: '8px', borderRadius: '6px', border: 'none', background: '#DC2626', color: '#FFF', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
              >
                Yes, Void Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
