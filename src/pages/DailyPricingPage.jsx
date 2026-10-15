import React, { useState, useEffect } from 'react';
import { 
  Tags, 
  Save, 
  Check, 
  RefreshCw, 
  AlertCircle, 
  Download, 
  HelpCircle, 
  X, 
  CheckCircle2, 
  Package, 
  Scale, 
  ArrowRight, 
  Sparkles, 
  Plus,
  Calendar,
  Lock
} from 'lucide-react';
import { useAdminRole } from '../context/AdminRoleContext';
import { useToast } from '../context/ToastContext';
import { saveFreshiozStore } from '../shared/freshiozStore';
import { exportToExcel } from '../utils/excelExporter';
import AdminPagination from '../components/common/AdminPagination';

export default function DailyPricingPage() {
  const { store, currentUser } = useAdminRole();
  const { showToast } = useToast();

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [products, setProducts] = useState(store.products || []);
  const [successToast, setSuccessToast] = useState('');
  const [isConfirmPricingModalOpen, setIsConfirmPricingModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const isPastDate = selectedDate < todayStr;
  const isToday = selectedDate === todayStr;
  const isTomorrow = selectedDate === tomorrowStr;

  const units = store.units || [];
  const bulkUnits = units.filter(u => u.isBulk);

  useEffect(() => {
    const history = store.dailyPricingHistory || {};
    if (history[selectedDate]) {
      setProducts(history[selectedDate]);
    } else {
      setProducts(store.products || []);
    }
  }, [selectedDate, store.products, store.dailyPricingHistory]);

  // Live volume bulk tier discount calculator (standardized to clean rupee integers)
  const calculateBulkStats = (prod) => {
    const minQty = Number(prod.bulkMinQty) || 0;
    const discountPercent = Number(prod.bulkDiscountPercent) || 0;
    const retailPrice = Number(prod.retailPrice) || 0;

    if (minQty > 0 && discountPercent > 0 && retailPrice > 0) {
      const effectiveRate = Math.round(retailPrice * (1 - discountPercent / 100));
      const savingsPerUnit = Math.round(retailPrice - effectiveRate);
      return {
        minQty,
        discountPercent,
        effectiveRate,
        savingsPerUnit,
        unit: prod.retailUnit || prod.defaultUnit || 'kg'
      };
    }
    return null;
  };

  const handlePriceChange = (id, field, value) => {
    if (isPastDate) return;
    setProducts(prev => prev.map(p => {
      if (p.id === id) {
        return { ...p, [field]: value === '' ? '' : Number(value) };
      }
      return p;
    }));
  };

  const handlePreSaveAll = (e) => {
    e.preventDefault();
    if (isPastDate) {
      showToast('Past historical pricing is locked and cannot be modified.', 'error');
      return;
    }
    if (products.length === 0) {
      showToast('No products available to price. Please catalog items in Master Data first.', 'error');
      return;
    }
    setIsConfirmPricingModalOpen(true);
  };

  const handleConfirmCommitPricing = () => {
    if (isPastDate) return;

    const stampedProducts = products.map(p => ({
      ...p,
      retailPrice: Number(p.retailPrice) || 0,
      retailMarketPrice: Number(p.retailMarketPrice) || Number(p.retailPrice) || 0,
      bulkMinQty: Number(p.bulkMinQty) || 0,
      bulkDiscountPercent: Number(p.bulkDiscountPercent) || 0,
      lastPricingUpdateAt: new Date().toISOString(),
      lastPricingUpdateBy: currentUser?.name || 'Super Admin',
      lastPricingUpdateById: currentUser?.id || 'emp-101',
      pricingDate: selectedDate
    }));

    saveFreshiozStore(prev => {
      const updatedHistory = {
        ...(prev.dailyPricingHistory || {}),
        [selectedDate]: stampedProducts
      };

      return {
        ...prev,
        dailyPricingHistory: updatedHistory,
        ...(selectedDate === todayStr ? { products: stampedProducts } : {})
      };
    });

    setIsConfirmPricingModalOpen(false);
    showToast(`✓ Dynamic Retail Rates & Volume Discounts for ${selectedDate === todayStr ? 'Today' : selectedDate === tomorrowStr ? 'Tomorrow' : selectedDate} saved!`, 'success');
    setSuccessToast(`✓ Rates for ${selectedDate === todayStr ? 'Today' : selectedDate === tomorrowStr ? 'Tomorrow' : selectedDate} successfully recorded.`);
    setTimeout(() => setSuccessToast(''), 5000);
  };

  // Export to Excel with complete Retail + Volume Bulk Discount specs
  const handleExportExcel = () => {
    const headers = [
      'Produce ID',
      'Produce Name',
      'Category',
      'Retail Unit',
      'Market MRP (₹)',
      'Today Selling Rate (₹)',
      'Customer Retail Savings %',
      'Bulk Min Qty',
      'Bulk Discount %',
      'Effective Bulk Rate / Unit (₹)',
      'GST %',
      'Tax Status'
    ];

    const rows = products.map(p => {
      const stats = calculateBulkStats(p);
      const mrp = Number(p.retailMarketPrice) || Number(p.retailPrice) || 0;
      const rate = Number(p.retailPrice) || 0;
      const retailSavingsPct = mrp > rate ? `${Math.round(((mrp - rate) / mrp) * 100)}%` : '0%';

      return [
        p.id,
        p.name,
        p.category,
        p.retailUnit || '1 kg',
        mrp,
        rate,
        retailSavingsPct,
        stats ? `${stats.minQty} ${stats.unit}` : 'None',
        stats ? `${stats.discountPercent}%` : '0%',
        stats ? `₹${stats.effectiveRate}/${stats.unit}` : '—',
        `${p.gstPercent ?? 0}%`,
        (p.gstPercent ?? 0) === 0 ? 'Exempt' : 'Taxable'
      ];
    });

    exportToExcel('Freshioz_Daily_Pricing_GST_Master', headers, rows);
  };

  return (
    <div className="admin-page-container">
      {/* High-Density Compact Page Header (Under 50px) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px',
        paddingBottom: '10px',
        borderBottom: '1.5px solid #E2E8F0',
        marginBottom: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h1 style={{ fontSize: '18px', color: '#0F172A', fontWeight: 800, margin: 0 }}>
            Daily Dynamic Pricing & GST Master
          </h1>
          <span style={{ fontSize: '11px', background: '#ECFDF5', color: '#059669', fontWeight: 800, padding: '2px 8px', borderRadius: '4px' }}>
            {products.length} Items Live
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={handleExportExcel}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '6px 12px',
              borderRadius: '6px',
              background: '#FFFFFF',
              border: '1.5px solid #CBD5E1',
              color: '#334155',
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            <Download size={13} />
            <span>Export Excel</span>
          </button>

          <button
            type="button"
            onClick={handlePreSaveAll}
            disabled={isPastDate}
            className="admin-btn-primary"
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '5px', 
              padding: '6px 16px', 
              fontSize: '12px',
              opacity: isPastDate ? 0.6 : 1,
              cursor: isPastDate ? 'not-allowed' : 'pointer'
            }}
          >
            {isPastDate ? <Lock size={14} /> : <Save size={14} />}
            <span>{isPastDate ? 'Historical Archive (Locked)' : isTomorrow ? 'Save Tomorrow Rates' : 'Save All Updated Rates'}</span>
          </button>
        </div>
      </div>

      {/* Date Navigation & Calendar Selection Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        background: '#F8FAFC',
        border: '1.5px solid #E2E8F0',
        borderRadius: '10px',
        padding: '10px 16px',
        marginBottom: '14px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569', fontSize: '13px', fontWeight: 700 }}>
            <Calendar size={16} color="#059669" />
            <span>Pricing Date:</span>
          </div>

          {/* Quick Date Pills */}
          <button
            type="button"
            onClick={() => setSelectedDate(todayStr)}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: isToday ? '1.5px solid #059669' : '1px solid #CBD5E1',
              background: isToday ? '#ECFDF5' : '#FFFFFF',
              color: isToday ? '#065F46' : '#475569',
              fontWeight: 800,
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>Today ({todayStr})</span>
            {isToday && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#059669' }}></span>}
          </button>

          <button
            type="button"
            onClick={() => setSelectedDate(tomorrowStr)}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: isTomorrow ? '1.5px solid #2563EB' : '1px solid #CBD5E1',
              background: isTomorrow ? '#EFF6FF' : '#FFFFFF',
              color: isTomorrow ? '#1E40AF' : '#475569',
              fontWeight: 800,
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>🌅 Next Run ({tomorrowStr})</span>
            {isTomorrow && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2563EB' }}></span>}
          </button>

          {/* Specific / Past Date Picker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600 }}>Calendar Archive:</span>
            <input
              type="date"
              max={tomorrowStr}
              value={selectedDate}
              onChange={(e) => {
                if (e.target.value) setSelectedDate(e.target.value);
              }}
              style={{
                padding: '5px 10px',
                borderRadius: '6px',
                border: '1.5px solid #CBD5E1',
                fontSize: '12px',
                fontWeight: 700,
                color: isPastDate ? '#991B1B' : '#0F172A',
                background: isPastDate ? '#FEF2F2' : '#FFFFFF',
                outline: 'none',
                cursor: 'pointer'
              }}
            />
          </div>
        </div>

        {/* Status Pill */}
        <div>
          {isPastDate ? (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '12px',
              background: '#FEE2E2',
              color: '#991B1B',
              padding: '4px 12px',
              borderRadius: '20px',
              fontWeight: 800,
              border: '1px solid #FECDD3'
            }}>
              <Lock size={13} />
              <span>Past Date Snapshot (Locked / Read-Only)</span>
            </span>
          ) : isTomorrow ? (
            <span style={{
              fontSize: '12px',
              background: '#DBEAFE',
              color: '#1E40AF',
              padding: '4px 12px',
              borderRadius: '20px',
              fontWeight: 800
            }}>
              ✨ Advance Planning for Tomorrow's Run
            </span>
          ) : (
            <span style={{
              fontSize: '12px',
              background: '#DCFCE7',
              color: '#166534',
              padding: '4px 12px',
              borderRadius: '20px',
              fontWeight: 800
            }}>
              🟢 Active Live Selling Rates
            </span>
          )}
        </div>
      </div>

      {isPastDate && (
        <div style={{
          background: '#FFFBEB',
          border: '1.5px solid #FCD34D',
          color: '#92400E',
          padding: '10px 14px',
          borderRadius: '8px',
          fontWeight: 700,
          fontSize: '12.5px',
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Lock size={16} color="#D97706" />
          <span>Historical Archive for {selectedDate}: Daily prices in the past are locked to preserve audit integrity. To update active prices, switch to Today or Next Run.</span>
        </div>
      )}

      {successToast && (
        <div style={{
          background: '#ECFDF5',
          border: '1.5px solid #059669',
          color: '#065F46',
          padding: '8px 14px',
          borderRadius: '8px',
          fontWeight: 700,
          fontSize: '12px',
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Check size={16} />
          <span>{successToast}</span>
        </div>
      )}

      {/* Pricing Table: Both Retail and Wholesale Packaging configured in the SAME ROW */}
      <div className="admin-table-card">
        <div className="admin-table-header">
          <div>
            <h3 style={{ fontSize: '15px', color: '#0F172A', fontWeight: 800, margin: 0 }}>
              Daily Rate & Tax Master ({products.length} Items)
            </h3>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
              Configure consumer retail pricing, wholesale bulk crate rates, and GST % side-by-side in each row.
            </div>
          </div>
          <span style={{ fontSize: '12px', color: '#059669', fontWeight: 700, background: '#ECFDF5', padding: '4px 10px', borderRadius: '6px' }}>
            0% Default GST for Raw Produce
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="admin-data-table">
            <thead>
              <tr>
                <th style={{ minWidth: '180px' }}>Produce Item</th>
                <th>Category</th>
                <th>Retail Pack</th>
                <th style={{ minWidth: '130px' }}>
                  Market MRP (₹)
                  <span style={{ fontSize: '10px', color: '#64748B', display: 'block', fontWeight: 500 }}>
                    (Strikethrough Price)
                  </span>
                </th>
                <th style={{ minWidth: '140px' }}>
                  Today Selling (₹)
                  <span style={{ fontSize: '10px', color: '#059669', display: 'block', fontWeight: 700 }}>
                    (Active Selling Rate)
                  </span>
                </th>
                <th style={{ minWidth: '220px' }}>Bulk Quantity Tier (Min Qty)</th>
                <th style={{ minWidth: '200px' }}>Bulk Discount % & Live Rate</th>
                <th style={{ minWidth: '120px' }}>GST % (Editable)</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan="8">
                    <div className="admin-empty-state">
                      <div className="admin-empty-state-icon">
                        <Tags size={22} />
                      </div>
                      <div className="admin-empty-state-title">No Cataloged Produce Items</div>
                      <div className="admin-empty-state-desc">
                        Add vegetables and fruits in Master Data to configure daily retail pricing, volume bulk discounts, and GST % here.
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                products.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(prod => {
                  const gst = prod.gstPercent ?? 0;
                  const stats = calculateBulkStats(prod);
                  const minQty = Number(prod.bulkMinQty) || 0;
                  const discount = Number(prod.bulkDiscountPercent) || 0;
                  const mrp = Number(prod.retailMarketPrice) || 0;
                  const rate = Number(prod.retailPrice) || 0;
                  const savingsDiff = mrp - rate;
                  const savingsPct = mrp > rate ? Math.round((savingsDiff / mrp) * 100) : 0;

                  return (
                    <tr key={prod.id}>
                      {/* Produce Item & Photo */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {prod.image ? (
                            <img
                              src={prod.image}
                              alt={prod.name}
                              style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0, border: '1px solid #E2E8F0' }}
                            />
                          ) : (
                            <div style={{ width: '36px', height: '36px', borderRadius: '6px', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <Package size={16} color="#94A3B8" />
                            </div>
                          )}
                          <div>
                            <strong style={{ fontSize: '13.5px', color: '#0F172A', display: 'block' }}>{prod.name}</strong>
                            <span style={{ fontSize: '10.5px', color: '#64748B' }}><code>{prod.id}</code></span>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td>
                        <span style={{ fontSize: '11px', background: '#F1F5F9', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, color: '#334155' }}>
                          {prod.category}
                        </span>
                      </td>

                      {/* Retail Unit */}
                      <td>
                        <strong style={{ fontSize: '12.5px', color: '#234B3C' }}>
                          {prod.retailUnit || prod.defaultUnit || '1 kg'}
                        </strong>
                      </td>

                      {/* Actual Market MRP (₹) - Strikethrough on customer storefront */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#94A3B8' }}>₹</span>
                            <input
                              type="number"
                              min="0"
                              placeholder="55"
                              disabled={isPastDate}
                              value={prod.retailMarketPrice ?? ''}
                              onChange={(e) => handlePriceChange(prod.id, 'retailMarketPrice', e.target.value)}
                              style={{
                                width: '84px',
                                height: '34px',
                                padding: '0 8px',
                                borderRadius: '6px',
                                border: '1.5px solid #CBD5E1',
                                fontWeight: 700,
                                color: isPastDate ? '#94A3B8' : '#64748B',
                                fontSize: '13px',
                                background: isPastDate ? '#F1F5F9' : '#F8FAFC',
                                cursor: isPastDate ? 'not-allowed' : 'text',
                                outline: 'none'
                              }}
                            />
                          </div>
                          <span style={{ fontSize: '10px', color: '#94A3B8' }}>Market MRP</span>
                        </div>
                      </td>

                      {/* Today's Selling Retail Price (₹) */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: isPastDate ? '#64748B' : '#059669' }}>₹</span>
                            <input
                              type="number"
                              min="0"
                              disabled={isPastDate}
                              value={prod.retailPrice ?? ''}
                              onChange={(e) => handlePriceChange(prod.id, 'retailPrice', e.target.value)}
                              style={{
                                width: '84px',
                                height: '34px',
                                padding: '0 8px',
                                borderRadius: '6px',
                                border: isPastDate ? '1.5px solid #CBD5E1' : '1.5px solid #059669',
                                fontWeight: 800,
                                color: isPastDate ? '#475569' : '#166534',
                                fontSize: '14px',
                                background: isPastDate ? '#F1F5F9' : '#F0FDF4',
                                cursor: isPastDate ? 'not-allowed' : 'text',
                                outline: 'none'
                              }}
                            />
                          </div>
                          {savingsDiff > 0 && (
                            <span style={{ fontSize: '10px', color: isPastDate ? '#64748B' : '#15803D', fontWeight: 700 }}>
                              Save {savingsPct}% (₹{savingsDiff})
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Bulk Quantity Tier (Min Qty) */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Above:</span>
                            <input
                              type="number"
                              min="0"
                              placeholder="0"
                              disabled={isPastDate}
                              value={prod.bulkMinQty ?? ''}
                              onChange={(e) => handlePriceChange(prod.id, 'bulkMinQty', e.target.value)}
                              style={{
                                width: '64px',
                                height: '32px',
                                padding: '0 6px',
                                borderRadius: '6px',
                                border: '1.5px solid #CBD5E1',
                                fontWeight: 800,
                                fontSize: '12.5px',
                                textAlign: 'center',
                                background: isPastDate ? '#F1F5F9' : '#FFFFFF',
                                cursor: isPastDate ? 'not-allowed' : 'text',
                                outline: 'none'
                              }}
                            />
                            <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155' }}>
                              {prod.retailUnit || prod.defaultUnit || 'kg'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {[5, 10].map(q => (
                              <button
                                key={q}
                                type="button"
                                disabled={isPastDate}
                                onClick={() => {
                                  handlePriceChange(prod.id, 'bulkMinQty', q);
                                  if (!prod.bulkDiscountPercent) {
                                    handlePriceChange(prod.id, 'bulkDiscountPercent', q === 5 ? 10 : 15);
                                  }
                                }}
                                style={{
                                  fontSize: '10.5px',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  border: minQty === q ? '1px solid #234B3C' : '1px solid #CBD5E1',
                                  background: minQty === q ? '#234B3C' : '#FFFFFF',
                                  color: minQty === q ? '#FFFFFF' : '#475569',
                                  fontWeight: 700,
                                  cursor: isPastDate ? 'not-allowed' : 'pointer',
                                  opacity: isPastDate ? 0.7 : 1
                                }}
                              >
                                {q}+ {prod.retailUnit || 'kg'}
                              </button>
                            ))}
                            {minQty > 0 && !isPastDate && (
                              <button
                                type="button"
                                onClick={() => {
                                  handlePriceChange(prod.id, 'bulkMinQty', 0);
                                  handlePriceChange(prod.id, 'bulkDiscountPercent', 0);
                                }}
                                style={{
                                  fontSize: '10.5px',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  border: '1px solid #FECDD3',
                                  background: '#FFF1F2',
                                  color: '#E11D48',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                                title="Disable bulk discount tier"
                              >
                                ✕ Clear
                              </button>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Bulk Discount % & Live Rate Calculation */}
                      <td>
                        {minQty > 0 ? (
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <input
                                type="number"
                                min="0"
                                max="90"
                                placeholder="10"
                                disabled={isPastDate}
                                value={prod.bulkDiscountPercent ?? 10}
                                onChange={(e) => handlePriceChange(prod.id, 'bulkDiscountPercent', e.target.value)}
                                style={{
                                  width: '64px',
                                  height: '32px',
                                  padding: '0 6px',
                                  borderRadius: '6px',
                                  border: '1.5px solid #CBD5E1',
                                  fontWeight: 800,
                                  color: isPastDate ? '#64748B' : '#D97706',
                                  fontSize: '13px',
                                  textAlign: 'center',
                                  background: isPastDate ? '#F1F5F9' : '#FFFFFF',
                                  cursor: isPastDate ? 'not-allowed' : 'text',
                                  outline: 'none'
                                }}
                              />
                              <span style={{ fontSize: '12px', fontWeight: 700, color: '#B45309' }}>% OFF</span>
                            </div>
                            {stats && (
                              <div style={{ marginTop: '4px', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span style={{ color: isPastDate ? '#475569' : '#059669', fontWeight: 800 }}>
                                  🏷️ ₹{stats.effectiveRate} / {stats.unit}
                                </span>
                                <span style={{ fontSize: '10px', color: '#64748B' }}>
                                  Save ₹{stats.savingsPerUnit}/{stats.unit} on &ge;{stats.minQty} {stats.unit}
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: '11.5px', color: '#94A3B8', fontWeight: 600 }}>
                            — Standard Retail Only
                          </span>
                        )}
                      </td>

                      {/* EDITABLE GST % FIELD */}
                      <td>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <input
                            type="number"
                            min="0"
                            max="28"
                            disabled={isPastDate}
                            value={gst}
                            onChange={(e) => handlePriceChange(prod.id, 'gstPercent', e.target.value)}
                            style={{
                              width: '58px',
                              height: '34px',
                              padding: '0 6px',
                              borderRadius: '6px',
                              border: '1.5px solid #CBD5E1',
                              fontWeight: 800,
                              color: gst === 0 ? '#059669' : '#0F172A',
                              fontSize: '13px',
                              textAlign: 'center',
                              background: isPastDate ? '#F1F5F9' : '#FFF',
                              cursor: isPastDate ? 'not-allowed' : 'text',
                              outline: 'none'
                            }}
                          />
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>%</span>
                          {gst === 0 ? (
                            <span style={{
                              fontSize: '10.5px',
                              background: '#ECFDF5',
                              color: '#059669',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontWeight: 800
                            }}>
                              Exempt
                            </span>
                          ) : (
                            <span style={{
                              fontSize: '10.5px',
                              background: '#FEF3C7',
                              color: '#B45309',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontWeight: 800
                            }}>
                              Taxable
                            </span>
                          )}
                        </div>
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
          totalItems={products.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          itemLabel="produce items"
        />
      </div>

      {/* ================= CONFIRMATION POPUP MODAL (YES / NO) ================= */}
      {isConfirmPricingModalOpen && (
        <div 
          className="admin-modal-overlay" 
          style={{ zIndex: 1100, background: 'rgba(15, 23, 42, 0.72)' }}
        >
          <div 
            className="admin-modal-card" 
            onClick={(e) => e.stopPropagation()}
            style={{ 
              maxWidth: '520px', 
              border: '2px solid #E2E8F0',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              padding: '24px 26px',
              animation: 'adminModalEnter 0.2s ease-out'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '18px' }}>
              <div style={{ 
                width: '42px', 
                height: '42px', 
                borderRadius: '10px', 
                background: '#FEF3C7', 
                color: '#D97706', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <HelpCircle size={22} />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  Confirm Live Rates & Packaging Specs?
                </h3>
                <p style={{ fontSize: '12.5px', color: '#64748B', marginTop: '4px', marginBottom: 0, lineHeight: 1.4 }}>
                  Please review retail rates and wholesale bulk crate specifications before publishing live:
                </p>
              </div>
            </div>

            {/* Summary Review Card */}
            <div style={{ 
              background: '#F8FAFC', 
              borderRadius: '10px', 
              border: '1.5px solid #E2E8F0', 
              padding: '14px 16px', 
              marginBottom: '20px',
              fontSize: '12.5px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px dashed #CBD5E1' }}>
                <span style={{ color: '#64748B', fontWeight: 600 }}>Total Cataloged Items:</span>
                <span style={{ color: '#0F172A', fontWeight: 800 }}>{products.length} Products</span>
              </div>

              <div style={{ maxHeight: '180px', overflowY: 'auto', marginBottom: '8px', paddingRight: '4px' }}>
                {products.map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px dotted #E2E8F0', fontSize: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {p.image ? (
                        <img src={p.image} alt={p.name} style={{ width: '24px', height: '24px', borderRadius: '4px', objectFit: 'cover' }} />
                      ) : (
                        <Package size={14} color="#64748B" />
                      )}
                      <div>
                        <span style={{ fontWeight: 700, color: '#1E293B' }}>{p.name}</span>
                        <span style={{ fontSize: '10px', color: '#64748B', display: 'block' }}>{p.category}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, color: '#059669' }}>
                        Retail: ₹{p.retailPrice}/{p.retailUnit || 'kg'}
                      </div>
                      <div style={{ fontSize: '11px', color: p.bulkMinQty > 0 ? '#B45309' : '#64748B', fontWeight: 600 }}>
                        {p.bulkMinQty > 0 && p.bulkDiscountPercent > 0 
                          ? `Bulk: ${p.bulkDiscountPercent}% OFF for ${p.bulkMinQty}+ ${p.retailUnit || 'kg'}` 
                          : 'Standard Retail Only'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px' }}>
                <span style={{ color: '#64748B', fontWeight: 600 }}>Deployment:</span>
                <span style={{ color: '#2563EB', fontWeight: 700 }}>Instant Real-time Sync to User Web</span>
              </div>
            </div>

            {/* Action Buttons: No vs Yes */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setIsConfirmPricingModalOpen(false)}
                style={{
                  flex: 1,
                  padding: '11px 16px',
                  borderRadius: '8px',
                  border: '1.5px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <X size={15} />
                <span>No, Keep Editing</span>
              </button>

              <button
                type="button"
                onClick={handleConfirmCommitPricing}
                style={{
                  flex: 1,
                  padding: '11px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#234B3C',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(35, 75, 60, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <CheckCircle2 size={16} />
                <span>Yes, Confirm & Update</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
