import React, { useState } from 'react';
import { TrendingUp, DollarSign, BarChart3, PieChart, Layers, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAdminRole } from '../../context/AdminRoleContext';

export function RevenueMarginChart({ store: propStore }) {
  const { store: contextStore } = useAdminRole();
  const store = propStore || contextStore || {};
  const [hoverIndex, setHoverIndex] = useState(null);

  const orders = store.orders || [];
  const procurementLogs = store.procurementLogs || [];

  const totalSales = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const totalProcurement = procurementLogs.reduce((sum, l) => sum + (l.totalSpend || 0), 0);
  const hasData = orders.length > 0 || procurementLogs.length > 0;

  // 7-day distribution (if data exists, map recent days; if clean, 0 baseline)
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const data = days.map((day, idx) => {
    if (!hasData) {
      return { day, sales: 0, procurement: 0, margin: '0.0%' };
    }
    // Proportionally distribute sample daily slice if aggregate exists
    const dailyRatio = [0.12, 0.14, 0.13, 0.15, 0.16, 0.18, 0.12][idx];
    const sales = Math.round(totalSales * dailyRatio);
    const procurement = Math.round(totalProcurement * dailyRatio);
    const margin = sales > 0 ? (((sales - procurement) / sales) * 100).toFixed(1) + '%' : '0.0%';
    return { day, sales, procurement, margin };
  });

  const maxVal = Math.max(
    ...data.map(d => Math.max(d.sales, d.procurement)),
    5000
  );
  const chartHeight = 180;
  const chartWidth = 500;

  return (
    <div className="admin-chart-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={18} color="#234B3C" />
            <h3 style={{ fontSize: '15px', color: '#0F172A', margin: 0, fontWeight: 800 }}>Daily Sales vs. Mandi Spend</h3>
          </div>
          <p style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
            {hasData 
              ? 'Next-day batched retail & wholesale margins over the last 7 days'
              : 'Clean slate • Orders placed will calculate live margins here'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '14px', fontSize: '12px', fontWeight: 700, flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#234B3C' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#234B3C' }} /> 
            Gross Sales (₹{totalSales.toLocaleString()})
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#F28E14' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#F28E14' }} /> 
            Mandi Spend (₹{totalProcurement.toLocaleString()})
          </span>
        </div>
      </div>

      {/* SVG Canvas Chart */}
      <div style={{ position: 'relative', width: '100%', overflowX: 'hidden' }}>
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ width: '100%', height: 'auto', minHeight: '160px', maxHeight: '200px' }}>
          {/* Grid lines */}
          <line x1="40" y1="20" x2={chartWidth - 20} y2="20" stroke="#F1F5F9" strokeWidth="1" />
          <line x1="40" y1="70" x2={chartWidth - 20} y2="70" stroke="#F1F5F9" strokeWidth="1" />
          <line x1="40" y1="120" x2={chartWidth - 20} y2="120" stroke="#F1F5F9" strokeWidth="1" />
          <line x1="40" y1={chartHeight - 30} x2={chartWidth - 20} y2={chartHeight - 30} stroke="#E2E8F0" strokeWidth="1.5" />

          {hasData && (
            <>
              {/* Area fill for Sales */}
              <polygon
                points={`
                  ${data.map((d, i) => `${60 + i * 65},${(chartHeight - 30) - (d.sales / maxVal) * (chartHeight - 50)}`).join(' ')}
                  ${60 + (data.length - 1) * 65},${chartHeight - 30}
                  60,${chartHeight - 30}
                `}
                fill="rgba(35, 75, 60, 0.1)"
              />

              {/* Sales Line */}
              <polyline
                fill="none"
                stroke="#234B3C"
                strokeWidth="3"
                points={data.map((d, i) => `${60 + i * 65},${(chartHeight - 30) - (d.sales / maxVal) * (chartHeight - 50)}`).join(' ')}
              />

              {/* Procurement Spend Line */}
              <polyline
                fill="none"
                stroke="#F28E14"
                strokeWidth="2.5"
                strokeDasharray="4 3"
                points={data.map((d, i) => `${60 + i * 65},${(chartHeight - 30) - (d.procurement / maxVal) * (chartHeight - 50)}`).join(' ')}
              />
            </>
          )}

          {/* Data Points */}
          {data.map((d, i) => {
            const cx = 60 + i * 65;
            const cySales = (chartHeight - 30) - (d.sales / maxVal) * (chartHeight - 50);
            const cyProc = (chartHeight - 30) - (d.procurement / maxVal) * (chartHeight - 50);

            return (
              <g key={i} onMouseEnter={() => setHoverIndex(i)} onMouseLeave={() => setHoverIndex(null)} style={{ cursor: 'pointer' }}>
                <circle cx={cx} cy={cySales} r={hoverIndex === i ? 6 : 4} fill="#234B3C" stroke="#FFF" strokeWidth="2" />
                <circle cx={cx} cy={cyProc} r={hoverIndex === i ? 5 : 3.5} fill="#F28E14" stroke="#FFF" strokeWidth="1.5" />
                <text x={cx} y={chartHeight - 12} textAnchor="middle" fontSize="11" fill="#64748B" fontWeight="600">
                  {d.day}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Empty state watermark */}
        {!hasData && (
          <div style={{
            position: 'absolute',
            top: '40%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            color: '#94A3B8',
            fontSize: '12px',
            fontWeight: 600
          }}>
            🌱 ₹0 GMV Recorded • Baseline Ready for Order Inflow
          </div>
        )}

        {/* Hover Tooltip */}
        {hoverIndex !== null && (
          <div style={{
            position: 'absolute',
            top: '10px',
            left: `${60 + hoverIndex * 65}px`,
            transform: 'translateX(-50%)',
            background: '#0F172A',
            color: '#FFFFFF',
            borderRadius: '8px',
            padding: '8px 12px',
            fontSize: '11.5px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            pointerEvents: 'none',
            zIndex: 10
          }}>
            <div style={{ fontWeight: 800, color: '#C3E6B4' }}>{data[hoverIndex].day}: Margin {data[hoverIndex].margin}</div>
            <div>Sales: ₹{data[hoverIndex].sales.toLocaleString()}</div>
            <div>Mandi: ₹{data[hoverIndex].procurement.toLocaleString()}</div>
          </div>
        )}
      </div>
    </div>
  );
}

export function CategoryRevenueDonutChart({ store: propStore }) {
  const { store: contextStore } = useAdminRole();
  const store = propStore || contextStore || {};
  const [activeCategory, setActiveCategory] = useState(null);

  const orders = store.orders || [];
  const rawCategories = store.categories || [];
  const products = store.products || [];

  const totalGMV = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  // Compute revenue per category dynamically
  const catRevMap = {};
  rawCategories.forEach(c => { catRevMap[c.id] = 0; });

  orders.forEach(order => {
    (order.items || []).forEach(item => {
      const prod = products.find(p => p.id === item.id || p.id === item.productId);
      const catId = item.category || prod?.category || 'VEGETABLES';
      const itemVal = (item.price || 0) * (item.qty || 1);
      catRevMap[catId] = (catRevMap[catId] || 0) + itemVal;
    });
  });

  const colorPalette = ['#059669', '#D97706', '#234B3C', '#7C3AED', '#2563EB', '#DB2777'];

  const categories = rawCategories.map((c, i) => {
    const rev = catRevMap[c.id] || 0;
    const pct = totalGMV > 0 ? Math.round((rev / totalGMV) * 100) : 0;
    return {
      id: c.id,
      name: c.name || c.label,
      icon: c.icon || '🥬',
      pct,
      amount: `₹${rev.toLocaleString()}`,
      color: colorPalette[i % colorPalette.length],
      rev
    };
  });

  // Top category
  const topCategory = categories.length > 0 
    ? [...categories].sort((a, b) => b.rev - a.rev)[0] 
    : null;

  return (
    <div className="admin-chart-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PieChart size={18} color="#234B3C" />
            <h3 style={{ fontSize: '15px', color: '#0F172A', margin: 0, fontWeight: 800 }}>Category Revenue Split</h3>
          </div>
          <p style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
            Share of order value across dynamic farm produce categories
          </p>
        </div>
        <div style={{ fontSize: '12px', color: '#059669', fontWeight: 800 }}>
          ₹{totalGMV.toLocaleString()} GMV
        </div>
      </div>

      <div className="category-split-grid">
        {/* Visual Progress Bar Stack */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ height: '14px', width: '100%', borderRadius: '9999px', overflow: 'hidden', display: 'flex', background: '#F1F5F9' }}>
            {totalGMV > 0 ? (
              categories.map((c, i) => (
                <div 
                  key={c.id || i} 
                  style={{ 
                    width: `${c.pct}%`, 
                    height: '100%', 
                    background: c.color, 
                    transition: 'opacity 0.2s',
                    opacity: activeCategory === null || activeCategory === i ? 1 : 0.4
                  }} 
                />
              ))
            ) : (
              <div style={{ width: '100%', height: '100%', background: '#E2E8F0' }} />
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {categories.map((cat, i) => (
              <div 
                key={cat.id || i} 
                onMouseEnter={() => setActiveCategory(i)}
                onMouseLeave={() => setActiveCategory(null)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  background: activeCategory === i ? '#F8FAFC' : 'transparent',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: cat.color }} />
                  <span style={{ fontWeight: 600, color: '#1E293B' }}>{cat.icon} {cat.name}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#0F172A' }}>{cat.pct}%</span>
                  <span style={{ fontSize: '11px', color: '#64748B', marginLeft: '6px' }}>({cat.amount})</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Highlight Focus Card */}
        <div style={{
          background: '#F0F9FF',
          border: '1px solid #BAE6FD',
          borderRadius: '12px',
          padding: '16px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          {totalGMV > 0 && topCategory && topCategory.rev > 0 ? (
            <>
              <div style={{ fontSize: '11px', color: '#0369A1', fontWeight: 800, textTransform: 'uppercase' }}>
                Top Revenue Producer
              </div>
              <div style={{ fontSize: '28px', margin: '6px 0' }}>{topCategory.icon}</div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#0C4A6E' }}>
                {topCategory.name}
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#0284C7', marginTop: '2px' }}>
                {topCategory.pct}% of Total Sales
              </div>
              <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '4px' }}>
                Direct farm harvest leading daily pre-order demand.
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: '11px', color: '#0369A1', fontWeight: 800, textTransform: 'uppercase' }}>
                Produce Category Telemetry
              </div>
              <div style={{ fontSize: '28px', margin: '6px 0' }}>🌱</div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#0C4A6E' }}>
                Awaiting First Dawn Batch
              </div>
              <div style={{ fontSize: '13px', color: '#0284C7', marginTop: '2px', fontWeight: 700 }}>
                0 Orders Inflow Yet
              </div>
              <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '4px' }}>
                Category split will calculate dynamically as orders are placed.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function WarehouseVolumeChart({ store: propStore }) {
  const { store: contextStore } = useAdminRole();
  const store = propStore || contextStore || {};

  const warehouses = store.warehouses || [];
  const orders = store.orders || [];
  const societies = store.societies || [];

  if (warehouses.length === 0) {
    return (
      <div className="admin-chart-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <BarChart3 size={18} color="#234B3C" />
          <h3 style={{ fontSize: '15px', color: '#0F172A', margin: 0, fontWeight: 800 }}>Regional Warehouse Fulfillment Volume</h3>
        </div>
        <div style={{
          textAlign: 'center',
          padding: '24px 16px',
          background: '#F8FAFC',
          borderRadius: '8px',
          border: '1px dashed #CBD5E1',
          color: '#64748B',
          fontSize: '12.5px'
        }}>
          No Regional Warehouses registered yet. Add Central Hubs in <strong>Warehouses & Hubs</strong> to track packing volume and daily capacity.
        </div>
      </div>
    );
  }

  const colorPalette = ['#234B3C', '#059669', '#F28E14', '#2563EB', '#7C3AED'];
  const maxOrders = 500;

  const warehouseData = warehouses.map((wh, i) => {
    // Count orders mapped to societies under this warehouse
    const servedSocIds = societies.filter(s => s.warehouseId === wh.id).map(s => s.id);
    const whOrderCount = orders.filter(o => servedSocIds.includes(o.societyId) || o.assignedWarehouseId === wh.id).length;
    const capacityPct = Math.round((whOrderCount / maxOrders) * 100);

    return {
      name: `${wh.name} (${wh.code || wh.id})`,
      count: whOrderCount,
      capacity: `${capacityPct}%`,
      color: colorPalette[i % colorPalette.length]
    };
  });

  const totalLockedOrders = warehouseData.reduce((acc, w) => acc + w.count, 0);

  return (
    <div className="admin-chart-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BarChart3 size={18} color="#234B3C" />
          <h3 style={{ fontSize: '15px', color: '#0F172A', margin: 0, fontWeight: 800 }}>Regional Warehouse Fulfillment Volume</h3>
        </div>
        <div style={{ fontSize: '12px', color: '#64748B' }}>
          Max Cap: 500 orders/hub
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {warehouseData.map((wh, i) => (
          <div key={i}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', fontWeight: 700, marginBottom: '5px' }}>
              <span style={{ color: '#1E293B' }}>{wh.name}</span>
              <span style={{ color: wh.color }}>{wh.count} Orders ({wh.capacity})</span>
            </div>

            <div style={{ width: '100%', height: '10px', background: '#F1F5F9', borderRadius: '9999px', overflow: 'hidden' }}>
              <div style={{
                width: `${Math.min(100, (wh.count / maxOrders) * 100)}%`,
                height: '100%',
                background: wh.color,
                borderRadius: '9999px',
                transition: 'width 0.4s ease'
              }} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #F1F5F9', fontSize: '12px', color: '#64748B', display: 'flex', justifyContent: 'space-between' }}>
        <span>Batched across {warehouses.length} active regional hubs</span>
        <strong style={{ color: '#234B3C' }}>{totalLockedOrders} Total Orders Locked</strong>
      </div>
    </div>
  );
}

// Retain alias for backwards compatibility
export const ShopVolumeChart = WarehouseVolumeChart;
