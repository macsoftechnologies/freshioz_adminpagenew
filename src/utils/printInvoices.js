/**
 * Freshioz B2C Logistics Print Utilities
 * High-resolution printable Tax Invoices & Society Dispatch Manifests
 */

/**
 * Print standard Tax Invoice & Delivery Packing Slip for a single order
 */
export function printOrderTaxInvoice(order) {
  if (!order) return;

  const printWindow = window.open('', '_blank', 'width=850,height=950');
  if (!printWindow) {
    alert('Please allow popups in your browser to print the invoice.');
    return;
  }

  const invoiceNumber = `INV-${(order.id || 'ORDER').slice(-8).toUpperCase()}`;
  const orderDate = order.deliveryDate || order.createdAt ? new Date(order.deliveryDate || order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString('en-IN');
  const slotName = order.deliverySlot || 'Morning Run (06:30 AM)';
  const customerName = order.userName || order.customerName || 'Resident Customer';
  const customerPhone = order.userPhone || '—';
  const society = order.societyName || (order.society && order.society.name) || 'Residential Society';
  const flat = order.flatNo || order.flatNumber || 'Drop Desk';
  const items = order.items || [];
  const isCod = (order.paymentMethod || '').includes('PAY_ON_DELIVERY') || order.paymentMethod === 'COD';
  const isPaid = order.paymentStatus === 'PAID' || order.codPaymentReceived;

  const itemsRowsHtml = items.map((it, idx) => {
    const qty = it.qty || it.quantity || 1;
    const unit = it.unit || 'Pack';
    const rate = it.price || it.retailPrice || 0;
    const lineTotal = rate * qty;
    return `
      <tr>
        <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; text-align: center; color: #64748B;">${idx + 1}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; font-weight: 700; color: #0F172A;">
          ${it.name || it.productName || 'Fresh Produce Item'}
        </td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; text-align: center; color: #475569;">${unit}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; text-align: center; font-weight: 800; color: #0F172A;">${qty}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; text-align: right; color: #475569;">₹${rate.toLocaleString()}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; text-align: right; font-weight: 800; color: #0F172A;">₹${lineTotal.toLocaleString()}</td>
      </tr>
    `;
  }).join('');

  const qrVerifyUrl = `https://freshioz.com/verify-order/${order.id}`;
  const qrImgSrc = `https://api.qrserver.com/v1/create-qr-code/?size=110x110&margin=4&data=${encodeURIComponent(qrVerifyUrl)}`;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Tax Invoice - ${invoiceNumber}</title>
      <style>
        * { box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #0F172A;
          margin: 0;
          padding: 28px;
          background: #FFF;
          font-size: 13px;
          line-height: 1.45;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2.5px solid #059669;
          padding-bottom: 16px;
          margin-bottom: 20px;
        }
        .brand-title {
          font-size: 26px;
          font-weight: 900;
          color: #065F46;
          letter-spacing: -0.5px;
          margin: 0;
        }
        .brand-subtitle {
          font-size: 11.5px;
          color: #047857;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          margin-top: 2px;
        }
        .reg-details {
          font-size: 11px;
          color: #64748B;
          margin-top: 4px;
          line-height: 1.35;
        }
        .invoice-badge-box {
          text-align: right;
        }
        .invoice-type {
          font-size: 18px;
          font-weight: 900;
          color: #0F172A;
          text-transform: uppercase;
          letter-spacing: -0.2px;
        }
        .invoice-number {
          font-size: 13px;
          font-weight: 800;
          color: #059669;
          font-family: monospace;
          margin-top: 2px;
        }
        .meta-grid {
          display: grid;
          grid-template-columns: 1.3fr 1fr;
          gap: 16px;
          margin-bottom: 20px;
        }
        .card {
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          padding: 12px 14px;
        }
        .card-header {
          font-size: 11px;
          font-weight: 800;
          color: #047857;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
          border-bottom: 1px solid #E2E8F0;
          padding-bottom: 4px;
        }
        .customer-name {
          font-size: 15px;
          font-weight: 800;
          color: #0F172A;
        }
        .delivery-address {
          font-size: 12.5px;
          color: #334155;
          margin-top: 3px;
        }
        .badge {
          display: inline-block;
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 800;
        }
        .badge-paid {
          background: #DCFCE7;
          color: #166534;
          border: 1px solid #86EFAC;
        }
        .badge-due {
          background: #FEF2F2;
          color: #991B1B;
          border: 1px solid #FCA5A5;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        th {
          background: #F1F5F9;
          color: #334155;
          padding: 9px 10px;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 1.5px solid #CBD5E1;
        }
        .totals-container {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
          gap: 20px;
        }
        .qr-section {
          display: flex;
          align-items: center;
          gap: 12px;
          background: #F0FDF4;
          border: 1px solid #BBF7D0;
          padding: 10px 14px;
          border-radius: 8px;
          max-width: 320px;
        }
        .totals-table {
          width: 280px;
          margin-left: auto;
        }
        .totals-row {
          display: flex;
          justify-content: space-between;
          padding: 4px 0;
          font-size: 13px;
          color: #475569;
        }
        .totals-grand {
          font-size: 16px;
          font-weight: 900;
          color: #065F46;
          border-top: 2px solid #0F172A;
          padding-top: 8px;
          margin-top: 6px;
        }
        .footer {
          border-top: 1px dashed #CBD5E1;
          padding-top: 14px;
          text-align: center;
          font-size: 11px;
          color: #64748B;
          line-height: 1.4;
        }
        @media print {
          body { padding: 12px; }
          @page { margin: 10mm; size: A4 portrait; }
          .no-print { display: none !important; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="brand-title">FRESHIOZ</div>
          <div class="brand-subtitle">Farm-Direct Fresh Produce • Mandi Dawn Harvest</div>
          <div class="reg-details">
            Freshioz Produce Pvt. Ltd. • GSTIN: 29AABCU9603R1ZM<br/>
            FSSAI Lic: 21223192000412 • APMC Sorting & Dispatch Hub, Bangalore
          </div>
        </div>
        <div class="invoice-badge-box">
          <div class="invoice-type">Tax Invoice / Packing Slip</div>
          <div class="invoice-number">${invoiceNumber}</div>
          <div style="font-size: 11px; color: #64748B; margin-top: 3px;">
            Order ID: #${order.id}<br/>
            Date: <strong>${orderDate}</strong>
          </div>
        </div>
      </div>

      <div class="meta-grid">
        <div class="card">
          <div class="card-header">📍 Billed To / Deliver To</div>
          <div class="customer-name">${customerName}</div>
          <div class="delivery-address">
            Door / Flat: <strong>${flat}</strong><br/>
            Society: <strong>${society}</strong><br/>
            Contact: <strong>+91 ${customerPhone}</strong>
          </div>
        </div>

        <div class="card">
          <div class="card-header">🚚 Dispatch & Payment</div>
          <div style="font-size: 12px; margin-bottom: 4px;">
            Run Slot: <strong>${slotName}</strong>
          </div>
          <div style="font-size: 12px; margin-bottom: 4px;">
            Mode: <strong>${(order.paymentMethod || 'UPI / PREPAID').toUpperCase()}</strong>
          </div>
          <div style="margin-top: 6px;">
            <span class="badge ${isPaid ? 'badge-paid' : 'badge-due'}">
              ${isPaid ? '✓ PAID & RECONCILED' : `⚠️ DUE ON DELIVERY: ₹${(order.totalAmount || 0).toLocaleString()}`}
            </span>
          </div>
          ${order.razorpayPaymentId ? `<div style="font-size: 11px; color: #64748B; margin-top: 4px; font-family: monospace;">Ref: ${order.razorpayPaymentId}</div>` : ''}
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 35px; text-align: center;">#</th>
            <th style="text-align: left;">Harvest Crop / Variety</th>
            <th style="width: 90px; text-align: center;">Unit</th>
            <th style="width: 60px; text-align: center;">Qty</th>
            <th style="width: 85px; text-align: right;">Rate (₹)</th>
            <th style="width: 95px; text-align: right;">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRowsHtml || '<tr><td colspan="6" style="text-align:center; padding: 12px;">No items in order</td></tr>'}
        </tbody>
      </table>

      <div class="totals-container">
        <div class="qr-section">
          <img src="${qrImgSrc}" alt="Verify QR" width="68" height="68" style="border-radius: 4px; background: #FFF;" />
          <div style="font-size: 11px; color: #166534; line-height: 1.35;">
            <strong>Freshness Verification</strong><br/>
            Scan with smartphone camera to view mandi lot provenance and customer receipt online.
          </div>
        </div>

        <div class="totals-table">
          <div class="totals-row">
            <span>Items Subtotal:</span>
            <span>₹${(order.subtotal || order.totalAmount || 0).toLocaleString()}</span>
          </div>
          ${order.bulkSavings > 0 ? `
            <div class="totals-row" style="color: #166534; font-weight: 700;">
              <span>Volume Savings:</span>
              <span>-₹${(order.bulkSavings || 0).toLocaleString()}</span>
            </div>
          ` : ''}
          <div class="totals-row">
            <span>Delivery Fee:</span>
            <span style="color: #166534; font-weight: 700;">FREE (₹0)</span>
          </div>
          <div class="totals-row">
            <span>GST (0% / 5% Exempt/Included):</span>
            <span>₹0.00</span>
          </div>
          <div class="totals-row totals-grand">
            <span>Grand Total:</span>
            <span>₹${(order.totalAmount || 0).toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div class="footer">
        <div>🌿 100% Morning Mandi Freshness Guarantee. In case of discrepancies, WhatsApp: +91 98450 11999 or support@freshioz.com</div>
        <div style="margin-top: 3px; font-size: 10px; color: #94A3B8;">Freshioz Logistics System • Computer-generated document • No signature required.</div>
      </div>
    </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 250);
}

/**
 * Print consolidated Batch Society Dispatch Manifest for Driver and Society Security Desk
 */
export function printSocietyDispatchManifest(societyName, ordersList = [], slotName = 'Morning Run (06:30 AM)', deliveryDate = '') {
  if (!societyName) return;

  const societyOrders = ordersList.filter(o => {
    const sName = o.societyName || (o.society && o.society.name) || '';
    return sName.toLowerCase().trim() === societyName.toLowerCase().trim();
  });

  if (societyOrders.length === 0) {
    alert(`No orders found for ${societyName} in current view.`);
    return;
  }

  const printWindow = window.open('', '_blank', 'width=950,height=950');
  if (!printWindow) {
    alert('Please allow popups to print manifest.');
    return;
  }

  const formattedDate = deliveryDate || new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const totalAmount = societyOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const totalCrates = societyOrders.length;
  const codOrders = societyOrders.filter(o => (o.paymentMethod || '').includes('PAY_ON_DELIVERY') || o.paymentMethod === 'COD');
  const codDueAmount = codOrders
    .filter(o => o.paymentStatus !== 'PAID' && !o.codPaymentReceived)
    .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  const rowsHtml = societyOrders.map((o, idx) => {
    const isCod = (o.paymentMethod || '').includes('PAY_ON_DELIVERY') || o.paymentMethod === 'COD';
    const isPaid = o.paymentStatus === 'PAID' || o.codPaymentReceived;
    const itemsSummary = (o.items || [])
      .map(it => `${it.name || it.productName || 'Produce'} (${it.qty || it.quantity || 1} ${it.unit || 'pk'})`)
      .join(', ');

    return `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #CBD5E1; text-align: center; font-weight: bold; color: #64748B;">${idx + 1}</td>
        <td style="padding: 8px; border-bottom: 1px solid #CBD5E1; font-weight: 800; font-size: 13.5px; color: #0F172A;">
          ${o.flatNo || o.flatNumber || 'Drop Desk'}
        </td>
        <td style="padding: 8px; border-bottom: 1px solid #CBD5E1;">
          <div style="font-weight: 700; color: #0F172A;">${o.userName || o.customerName || 'Resident'}</div>
          <div style="font-size: 11px; color: #475569;">+91 ${o.userPhone || '—'}</div>
        </td>
        <td style="padding: 8px; border-bottom: 1px solid #CBD5E1; font-size: 11.5px; color: #334155; max-width: 280px;">
          ${itemsSummary || '1 Crate'}
        </td>
        <td style="padding: 8px; border-bottom: 1px solid #CBD5E1; text-align: right; font-weight: 800;">
          ₹${(o.totalAmount || 0).toLocaleString()}
        </td>
        <td style="padding: 8px; border-bottom: 1px solid #CBD5E1; text-align: center;">
          ${isPaid 
            ? '<span style="background: #DCFCE7; color: #166534; padding: 2px 6px; border-radius: 4px; font-weight: 800; font-size: 10.5px;">PAID ✓</span>'
            : `<span style="background: #FEF2F2; color: #991B1B; padding: 2px 6px; border-radius: 4px; font-weight: 800; font-size: 10.5px;">DUE ₹${(o.totalAmount || 0).toLocaleString()}</span>`
          }
        </td>
        <td style="padding: 8px; border-bottom: 1px solid #CBD5E1; text-align: center; width: 110px;">
          <div style="height: 24px; border-bottom: 1px dashed #94A3B8;"></div>
        </td>
      </tr>
    `;
  }).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Society Dispatch Manifest - ${societyName}</title>
      <style>
        * { box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #0F172A;
          margin: 0;
          padding: 24px;
          background: #FFF;
          font-size: 12.5px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #047857;
          padding-bottom: 12px;
          margin-bottom: 16px;
        }
        .summary-bar {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 16px;
        }
        .stat-box {
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 6px;
          padding: 8px 12px;
          text-align: center;
        }
        .stat-label {
          font-size: 10.5px;
          color: #64748B;
          text-transform: uppercase;
          font-weight: 700;
        }
        .stat-val {
          font-size: 18px;
          font-weight: 900;
          color: #065F46;
          margin-top: 2px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 24px;
        }
        th {
          background: #F1F5F9;
          color: #334155;
          padding: 8px;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 2px solid #CBD5E1;
        }
        .sign-off-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 20px;
          margin-top: 24px;
          padding-top: 16px;
          border-top: 1px dashed #CBD5E1;
        }
        .sign-box {
          border: 1px solid #CBD5E1;
          border-radius: 6px;
          padding: 12px;
          min-height: 85px;
        }
        .sign-title {
          font-size: 11px;
          font-weight: 800;
          color: #475569;
          text-transform: uppercase;
        }
        @media print {
          body { padding: 10px; }
          @page { margin: 8mm; size: A4 landscape; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div style="font-size: 22px; font-weight: 900; color: #065F46;">FRESHIOZ • BATCH DISPATCH MANIFEST</div>
          <div style="font-size: 14px; font-weight: 800; color: #0F172A; margin-top: 2px;">
            🏢 Society Drop Desk: <u>${societyName}</u>
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 13px; font-weight: 800; color: #0F172A;">Run: ${slotName}</div>
          <div style="font-size: 12px; color: #64748B; margin-top: 2px;">Delivery Date: <strong>${formattedDate}</strong></div>
        </div>
      </div>

      <div class="summary-bar">
        <div class="stat-box">
          <div class="stat-label">Total Crates / Orders</div>
          <div class="stat-val">${totalCrates}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Total Society Revenue</div>
          <div class="stat-val">₹${totalAmount.toLocaleString()}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Pending COD to Collect</div>
          <div class="stat-val" style="color: ${codDueAmount > 0 ? '#DC2626' : '#059669'};">₹${codDueAmount.toLocaleString()}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Prepaid Online Crates</div>
          <div class="stat-val">${totalCrates - codOrders.length}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 35px; text-align: center;">#</th>
            <th style="width: 80px; text-align: left;">Flat / Door</th>
            <th style="width: 150px; text-align: left;">Resident Customer</th>
            <th style="text-align: left;">Crated Produce Items</th>
            <th style="width: 90px; text-align: right;">Total (₹)</th>
            <th style="width: 95px; text-align: center;">Payment</th>
            <th style="width: 120px; text-align: center;">Desk / Security Sign</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div class="sign-off-grid">
        <div class="sign-box">
          <div class="sign-title">Hub Dispatcher Sign-off</div>
          <div style="font-size: 10px; color: #94A3B8; margin-top: 35px;">Name & Verified Stamp</div>
        </div>
        <div class="sign-box">
          <div class="sign-title">Delivery Driver / Rider Sign-off</div>
          <div style="font-size: 10px; color: #94A3B8; margin-top: 35px;">Vehicle # & Received Signature</div>
        </div>
        <div class="sign-box">
          <div class="sign-title">Society Security / Drop Desk Handover</div>
          <div style="font-size: 10px; color: #94A3B8; margin-top: 35px;">Received Count Sign & Date/Time</div>
        </div>
      </div>
    </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 250);
}
