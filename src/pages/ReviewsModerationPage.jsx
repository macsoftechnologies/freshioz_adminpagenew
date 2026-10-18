import React, { useState, useEffect } from 'react';
import { 
  Star, 
  MessageSquare, 
  CheckCircle, 
  EyeOff, 
  Flag, 
  Gift, 
  Clock, 
  User, 
  Package, 
  Truck, 
  Globe, 
  RefreshCw, 
  X, 
  AlertCircle,
  Plus,
  Ban
} from 'lucide-react';
import { reviewAdminService } from '../services/reviewAdminService';
import { discountAdminService } from '../services/discountAdminService';
import { useAdminRole } from '../context/AdminRoleContext';

export default function ReviewsModerationPage() {
  const { currentUser } = useAdminRole();
  const [activeTab, setActiveTab] = useState('REVIEWS'); // 'REVIEWS' | 'DISCOUNTS'

  // Reviews Desk State
  const [reviews, setReviews] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'APPROVED' | 'HIDDEN'
  const [typeFilter, setTypeFilter] = useState('ALL'); // 'ALL' | 'PRODUCT' | 'DELIVERY' | 'WEBSITE'
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Discounts Desk State
  const [discounts, setDiscounts] = useState([]);
  const [discountStatusFilter, setDiscountStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'REDEEMED' | 'EXPIRED' | 'REVOKED'
  const [isLoadingDiscounts, setIsLoadingDiscounts] = useState(false);

  // Award Discount Modal State
  const [isAwardModalOpen, setIsAwardModalOpen] = useState(false);
  const [awardForm, setAwardForm] = useState({
    userId: '',
    userName: '',
    discountType: 'FIXED',
    discountValue: 50,
    minOrderAmount: 200,
    expiryDays: 30,
    code: '',
    issueReason: '',
  });
  const [isSubmittingAward, setIsSubmittingAward] = useState(false);

  // Load Reviews
  const fetchReviews = async () => {
    setIsLoadingReviews(true);
    try {
      const data = await reviewAdminService.getAll({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        type: typeFilter !== 'ALL' ? typeFilter : undefined,
      });
      if (Array.isArray(data)) setReviews(data);
    } catch (err) {
      console.error('Failed to load reviews:', err);
    } finally {
      setIsLoadingReviews(false);
    }
  };

  // Load Discounts
  const fetchDiscounts = async () => {
    setIsLoadingDiscounts(true);
    try {
      const data = await discountAdminService.getAll({
        status: discountStatusFilter !== 'ALL' ? discountStatusFilter : undefined,
      });
      if (Array.isArray(data)) setDiscounts(data);
    } catch (err) {
      console.error('Failed to load discounts:', err);
    } finally {
      setIsLoadingDiscounts(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [statusFilter, typeFilter]);

  useEffect(() => {
    if (activeTab === 'DISCOUNTS') {
      fetchDiscounts();
    }
  }, [activeTab, discountStatusFilter]);

  // Handle Moderation
  const handleModerate = async (reviewId, newStatus, isFlagged = undefined) => {
    setActionLoadingId(reviewId);
    try {
      const payload = { status: newStatus };
      if (isFlagged !== undefined) payload.flagged = isFlagged;
      const updated = await reviewAdminService.moderate(reviewId, payload);
      setReviews(prev => prev.map(r => r.id === reviewId ? updated : r));
    } catch (err) {
      alert(err.message || 'Moderation action failed');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Open Award Modal Pre-populated from Review
  const handleOpenAwardFromReview = (review) => {
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const suggestedCode = `THANKS${review.userName ? review.userName.slice(0, 4).toUpperCase() : 'USER'}${randomSuffix}`;
    const reasonText = review.type === 'PRODUCT' 
      ? `Appreciation reward for review on ${review.productName || 'produce'}`
      : review.type === 'DELIVERY'
      ? `Reward for delivery rating on Order #${review.orderId}`
      : 'Reward for helpful website feedback';

    setAwardForm({
      userId: review.userId || review.userPhone,
      userName: review.userName || 'Valued Resident',
      discountType: 'FIXED',
      discountValue: 50,
      minOrderAmount: 200,
      expiryDays: 30,
      code: suggestedCode,
      issueReason: reasonText,
    });
    setIsAwardModalOpen(true);
  };

  // Submit Discount Award
  const handleSubmitAward = async (e) => {
    e.preventDefault();
    if (!awardForm.userId.trim() || !awardForm.code.trim()) {
      alert('Customer User ID/Phone and Discount Code are required');
      return;
    }

    setIsSubmittingAward(true);
    try {
      await discountAdminService.create({
        userId: awardForm.userId.trim(),
        userName: awardForm.userName.trim(),
        discountType: awardForm.discountType,
        discountValue: Number(awardForm.discountValue) || 50,
        minOrderAmount: Number(awardForm.minOrderAmount) || 0,
        expiryDays: Number(awardForm.expiryDays) || 30,
        code: awardForm.code.trim().toUpperCase(),
        issueReason: awardForm.issueReason.trim(),
      });

      alert(`Discount code ${awardForm.code.toUpperCase()} successfully awarded to ${awardForm.userName || awardForm.userId}!`);
      setIsAwardModalOpen(false);
      if (activeTab === 'DISCOUNTS') {
        fetchDiscounts();
      }
    } catch (err) {
      alert(err.message || 'Failed to award discount');
    } finally {
      setIsSubmittingAward(false);
    }
  };

  // Revoke Discount
  const handleRevokeDiscount = async (discountId) => {
    if (!window.confirm('Are you sure you want to revoke this active discount? The customer will no longer be able to redeem it.')) {
      return;
    }

    try {
      await discountAdminService.revoke(discountId);
      setDiscounts(prev => prev.map(d => d.id === discountId ? { ...d, status: 'REVOKED' } : d));
    } catch (err) {
      alert(err.message || 'Failed to revoke discount');
    }
  };

  const pendingCount = reviews.filter(r => r.status === 'PENDING').length;

  return (
    <div style={{ padding: '24px', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Top Banner */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '16px',
        border: '1.5px solid #E2E8F0',
        padding: '24px 28px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, background: '#EBF2EE', color: '#234B3C', padding: '3px 8px', borderRadius: '6px' }}>
              COMMUNITY & REVIEWS DESK
            </span>
            {pendingCount > 0 && (
              <span style={{ fontSize: '11px', fontWeight: 800, background: '#FEF3C7', color: '#92400E', padding: '3px 8px', borderRadius: '6px' }}>
                {pendingCount} Pending Moderation
              </span>
            )}
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            Customer Reviews & Feedback Rewards
          </h1>
          <p style={{ fontSize: '13.5px', color: '#64748B', margin: '4px 0 0' }}>
            Moderate product, delivery and website ratings. Reward resident feedback with exclusive account-bound discount vouchers.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={() => {
              setAwardForm({
                userId: '',
                userName: '',
                discountType: 'FIXED',
                discountValue: 50,
                minOrderAmount: 200,
                expiryDays: 30,
                code: `REWARD${Math.floor(1000 + Math.random() * 9000)}`,
                issueReason: 'Admin customer satisfaction appreciation',
              });
              setIsAwardModalOpen(true);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 18px',
              borderRadius: '8px',
              background: '#234B3C',
              color: '#FFF',
              border: 'none',
              fontWeight: 800,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            <Plus size={16} />
            <span>Award Discount Voucher</span>
          </button>
        </div>
      </div>

      {/* Primary Workdesk Tabs */}
      <div style={{ display: 'flex', gap: '10px', borderBottom: '2px solid #E2E8F0', marginBottom: '20px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('REVIEWS')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            background: 'none',
            border: 'none',
            fontSize: '14px',
            fontWeight: 800,
            cursor: 'pointer',
            color: activeTab === 'REVIEWS' ? '#234B3C' : '#64748B',
            borderBottom: activeTab === 'REVIEWS' ? '3px solid #234B3C' : '3px solid transparent',
            marginBottom: '-2px'
          }}
        >
          <MessageSquare size={17} />
          <span>Customer Reviews Moderation</span>
          {pendingCount > 0 && (
            <span style={{ background: '#F59E0B', color: '#FFF', fontSize: '11px', fontWeight: 800, padding: '1px 7px', borderRadius: '9999px' }}>
              {pendingCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('DISCOUNTS')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            background: 'none',
            border: 'none',
            fontSize: '14px',
            fontWeight: 800,
            cursor: 'pointer',
            color: activeTab === 'DISCOUNTS' ? '#234B3C' : '#64748B',
            borderBottom: activeTab === 'DISCOUNTS' ? '3px solid #234B3C' : '3px solid transparent',
            marginBottom: '-2px'
          }}
        >
          <Gift size={17} />
          <span>Awarded Discounts & Audit Ledger</span>
        </button>
      </div>

      {/* ================= TAB 1: REVIEWS MODERATION ================= */}
      {activeTab === 'REVIEWS' && (
        <div>
          {/* Sub Filters */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            background: '#FFFFFF',
            padding: '12px 18px',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            marginBottom: '18px'
          }}>
            {/* Status Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', marginRight: '4px' }}>Status:</span>
              {['ALL', 'PENDING', 'APPROVED', 'HIDDEN'].map(st => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: statusFilter === st ? '1.5px solid #234B3C' : '1px solid #CBD5E1',
                    background: statusFilter === st ? '#234B3C' : '#FFFFFF',
                    color: statusFilter === st ? '#FFF' : '#475569'
                  }}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Type Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', marginRight: '4px' }}>Type:</span>
              {['ALL', 'PRODUCT', 'DELIVERY', 'WEBSITE'].map(tp => (
                <button
                  key={tp}
                  type="button"
                  onClick={() => setTypeFilter(tp)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: typeFilter === tp ? '1.5px solid #047857' : '1px solid #CBD5E1',
                    background: typeFilter === tp ? '#ECFDF5' : '#FFFFFF',
                    color: typeFilter === tp ? '#047857' : '#475569'
                  }}
                >
                  {tp}
                </button>
              ))}

              <button
                type="button"
                onClick={fetchReviews}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'none',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  padding: '5px 10px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  color: '#475569',
                  marginLeft: '8px'
                }}
              >
                <RefreshCw size={13} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Reviews List */}
          {isLoadingReviews ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>Loading reviews...</div>
          ) : reviews.length === 0 ? (
            <div style={{ background: '#FFFFFF', padding: '48px', textAlign: 'center', borderRadius: '12px', border: '1px solid #E2E8F0', color: '#64748B' }}>
              <MessageSquare size={36} color="#CBD5E1" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>No reviews found</div>
              <p style={{ fontSize: '13px', margin: '4px 0 0' }}>Adjust filters or wait for residents to review their delivered orders.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {reviews.map((rev) => {
                const isApproved = rev.status === 'APPROVED';
                const isHidden = rev.status === 'HIDDEN';
                const isPending = rev.status === 'PENDING';

                return (
                  <div
                    key={rev.id}
                    style={{
                      background: '#FFFFFF',
                      borderRadius: '12px',
                      border: isPending ? '1.5px solid #F59E0B' : '1px solid #E2E8F0',
                      padding: '18px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {/* Type Icon Badge */}
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          background: rev.type === 'PRODUCT' ? '#EBF2EE' : rev.type === 'DELIVERY' ? '#EFF6FF' : '#F5F3FF',
                          color: rev.type === 'PRODUCT' ? '#234B3C' : rev.type === 'DELIVERY' ? '#1D4ED8' : '#6D28D9',
                          padding: '3px 9px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 800
                        }}>
                          {rev.type === 'PRODUCT' ? <Package size={13} /> : rev.type === 'DELIVERY' ? <Truck size={13} /> : <Globe size={13} />}
                          <span>{rev.type} REVIEW</span>
                        </span>

                        {/* Status Badge */}
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: isApproved ? '#DCFCE7' : isHidden ? '#FEE2E2' : '#FEF3C7',
                          color: isApproved ? '#15803D' : isHidden ? '#B91C1C' : '#92400E'
                        }}>
                          {rev.status}
                        </span>

                        {rev.flagged && (
                          <span style={{ fontSize: '11px', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', background: '#FEE2E2', color: '#B91C1C', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <Flag size={11} /> Flagged
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '12px', color: '#64748B' }}>
                        {new Date(rev.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    {/* Customer & Rating Info */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
                          {rev.userName || 'Resident'} <span style={{ fontSize: '12px', fontWeight: 500, color: '#64748B' }}>({rev.userPhone || rev.userId})</span>
                        </div>
                        {rev.productName && (
                          <div style={{ fontSize: '13px', fontWeight: 700, color: '#234B3C', marginTop: '2px' }}>
                            🥬 Crop: {rev.productName} {rev.orderId ? `• Order #${rev.orderId}` : ''}
                          </div>
                        )}
                        {!rev.productName && rev.orderId && (
                          <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#1E40AF', marginTop: '2px' }}>
                            🚚 Delivery on Order #{rev.orderId}
                          </div>
                        )}
                      </div>

                      {/* Stars */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star
                            key={s}
                            size={18}
                            fill={s <= rev.rating ? '#F59E0B' : '#E2E8F0'}
                            color={s <= rev.rating ? '#D97706' : '#CBD5E1'}
                          />
                        ))}
                        <span style={{ fontSize: '14px', fontWeight: 800, color: '#92400E', marginLeft: '6px' }}>
                          {rev.rating}.0
                        </span>
                      </div>
                    </div>

                    {/* Review Comment */}
                    {rev.comment && (
                      <div style={{
                        background: '#F8FAFC',
                        padding: '12px 14px',
                        borderRadius: '8px',
                        fontSize: '13.5px',
                        color: '#1E293B',
                        lineHeight: '1.5',
                        borderLeft: '3px solid #CBD5E1'
                      }}>
                        "{rev.comment}"
                      </div>
                    )}

                    {/* Moderation & Reward Action Buttons */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '10px',
                      paddingTop: '8px',
                      borderTop: '1px solid #F1F5F9'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          type="button"
                          disabled={actionLoadingId === rev.id || isApproved}
                          onClick={() => handleModerate(rev.id, 'APPROVED')}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            background: isApproved ? '#E2E8F0' : '#15803D',
                            color: isApproved ? '#64748B' : '#FFF',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: isApproved ? 'default' : 'pointer'
                          }}
                        >
                          <CheckCircle size={14} />
                          <span>{isApproved ? 'Approved & Public' : 'Approve for Public'}</span>
                        </button>

                        <button
                          type="button"
                          disabled={actionLoadingId === rev.id || isHidden}
                          onClick={() => handleModerate(rev.id, 'HIDDEN')}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            background: isHidden ? '#E2E8F0' : '#DC2626',
                            color: isHidden ? '#64748B' : '#FFF',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: isHidden ? 'default' : 'pointer'
                          }}
                        >
                          <EyeOff size={14} />
                          <span>{isHidden ? 'Hidden from Website' : 'Hide Review'}</span>
                        </button>

                        <button
                          type="button"
                          disabled={actionLoadingId === rev.id}
                          onClick={() => handleModerate(rev.id, rev.status, !rev.flagged)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            background: rev.flagged ? '#FEF3C7' : '#F1F5F9',
                            color: rev.flagged ? '#92400E' : '#475569',
                            border: '1px solid #CBD5E1',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          <Flag size={14} />
                          <span>{rev.flagged ? 'Unflag' : 'Flag Internal'}</span>
                        </button>
                      </div>

                      {/* Award Discount Button */}
                      <button
                        type="button"
                        onClick={() => handleOpenAwardFromReview(rev)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: '#ECFDF5',
                          color: '#065F46',
                          border: '1.5px solid #86EFAC',
                          padding: '6px 14px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 800,
                          cursor: 'pointer'
                        }}
                      >
                        <Gift size={14} color="#059669" />
                        <span>Award Discount to Resident</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2: DISCOUNTS AUDIT LEDGER ================= */}
      {activeTab === 'DISCOUNTS' && (
        <div>
          {/* Sub Filter */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            background: '#FFFFFF',
            padding: '12px 18px',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            marginBottom: '18px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', marginRight: '4px' }}>Filter Status:</span>
              {['ALL', 'ACTIVE', 'REDEEMED', 'EXPIRED', 'REVOKED'].map(st => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setDiscountStatusFilter(st)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: discountStatusFilter === st ? '1.5px solid #234B3C' : '1px solid #CBD5E1',
                    background: discountStatusFilter === st ? '#234B3C' : '#FFFFFF',
                    color: discountStatusFilter === st ? '#FFF' : '#475569'
                  }}
                >
                  {st}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={fetchDiscounts}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: 'none',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                padding: '5px 10px',
                fontSize: '12px',
                cursor: 'pointer',
                color: '#475569'
              }}
            >
              <RefreshCw size={13} />
              <span>Refresh</span>
            </button>
          </div>

          {/* Discounts Table */}
          {isLoadingDiscounts ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>Loading discounts...</div>
          ) : discounts.length === 0 ? (
            <div style={{ background: '#FFFFFF', padding: '48px', textAlign: 'center', borderRadius: '12px', border: '1px solid #E2E8F0', color: '#64748B' }}>
              <Gift size={36} color="#CBD5E1" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>No customer discounts found</div>
              <p style={{ fontSize: '13px', margin: '4px 0 0' }}>Award a feedback discount to a resident from the reviews tab or click "Award Discount Voucher".</p>
            </div>
          ) : (
            <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 700 }}>
                    <th style={{ padding: '12px 16px' }}>Code</th>
                    <th style={{ padding: '12px 16px' }}>Resident Account</th>
                    <th style={{ padding: '12px 16px' }}>Benefit</th>
                    <th style={{ padding: '12px 16px' }}>Min Cart</th>
                    <th style={{ padding: '12px 16px' }}>Expires</th>
                    <th style={{ padding: '12px 16px' }}>Admin Reason</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {discounts.map(d => (
                    <tr key={d.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 800, color: '#0F172A', letterSpacing: '0.5px' }}>
                        {d.code}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 700, color: '#0F172A' }}>{d.userName || 'Resident'}</div>
                        <div style={{ fontSize: '11.5px', color: '#64748B' }}>+91 {d.userId}</div>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#15803D' }}>
                        {d.discountType === 'PERCENTAGE' ? `${d.discountValue}% OFF` : `₹${d.discountValue} FLAT`}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#475569' }}>
                        {d.minOrderAmount > 0 ? `₹${d.minOrderAmount}` : 'None'}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#64748B', fontSize: '12px' }}>
                        {new Date(d.expiresAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#334155', maxWidth: '240px', fontSize: '12px' }}>
                        {d.issueReason || '—'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: d.status === 'ACTIVE' ? '#DCFCE7' : d.status === 'REDEEMED' ? '#EFF6FF' : '#FEE2E2',
                          color: d.status === 'ACTIVE' ? '#15803D' : d.status === 'REDEEMED' ? '#1D4ED8' : '#B91C1C'
                        }}>
                          {d.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        {d.status === 'ACTIVE' && (
                          <button
                            type="button"
                            onClick={() => handleRevokeDiscount(d.id)}
                            style={{
                              background: '#FFF1F2',
                              color: '#E11D48',
                              border: '1px solid #FECDD3',
                              padding: '5px 10px',
                              borderRadius: '6px',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            Revoke
                          </button>
                        )}
                        {d.status === 'REDEEMED' && (
                          <span style={{ fontSize: '11.5px', color: '#64748B' }}>
                            Redeemed
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ================= AWARD DISCOUNT MODAL ================= */}
      {isAwardModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }} onClick={() => setIsAwardModalOpen(false)}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '520px',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            position: 'relative'
          }} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setIsAwardModalOpen(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#64748B'
              }}
            >
              <X size={20} />
            </button>

            <div style={{ marginBottom: '18px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#ECFDF5', color: '#047857', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800, marginBottom: '6px' }}>
                <Gift size={13} />
                <span>FEEDBACK APPRECIATION</span>
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Grant Resident Account Discount
              </h2>
              <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0' }}>
                This reward code will be bound directly to the resident's mobile number and visible in their web profile.
              </p>
            </div>

            <form onSubmit={handleSubmitAward}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Customer Phone / User ID *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 9845012345"
                    value={awardForm.userId}
                    onChange={(e) => setAwardForm({ ...awardForm, userId: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Customer Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ananya Rao"
                    value={awardForm.userName}
                    onChange={(e) => setAwardForm({ ...awardForm, userName: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Discount Type *
                  </label>
                  <select
                    value={awardForm.discountType}
                    onChange={(e) => setAwardForm({ ...awardForm, discountType: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                  >
                    <option value="FIXED">Fixed Amount (₹)</option>
                    <option value="PERCENTAGE">Percentage (%)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Discount Value {awardForm.discountType === 'FIXED' ? '(₹)' : '(%)'} *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={awardForm.discountValue}
                    onChange={(e) => setAwardForm({ ...awardForm, discountValue: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Discount Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={awardForm.code}
                    onChange={(e) => setAwardForm({ ...awardForm, code: e.target.value.toUpperCase() })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '13px', fontWeight: 800, boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Min Cart Order (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={awardForm.minOrderAmount}
                    onChange={(e) => setAwardForm({ ...awardForm, minOrderAmount: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Valid Duration (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={awardForm.expiryDays}
                  onChange={(e) => setAwardForm({ ...awardForm, expiryDays: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Note to Customer / Reason *
                </label>
                <textarea
                  required
                  rows={2}
                  value={awardForm.issueReason}
                  onChange={(e) => setAwardForm({ ...awardForm, issueReason: e.target.value })}
                  placeholder="e.g. Thanks for sharing your feedback on tomatoes! Here's a ₹50 discount on your next order."
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsAwardModalOpen(false)}
                  style={{ flex: 1, padding: '10px', background: '#F1F5F9', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', color: '#475569' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAward}
                  style={{ flex: 2, padding: '10px', background: '#234B3C', color: '#FFF', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 800, cursor: isSubmittingAward ? 'not-allowed' : 'pointer' }}
                >
                  {isSubmittingAward ? 'Issuing Reward...' : 'Confirm & Award Reward'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
