import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, ChevronRight } from 'lucide-react';
import { useAdminRole } from '../../context/AdminRoleContext';

export default function AdminNotificationBell() {
  const navigate = useNavigate();
  const { store, currentUser, currentRoleId } = useAdminRole();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const storageKey = `freshioz_admin_read_notifs_${currentUser?.id || 'anon'}_${currentRoleId}`;
  const [readIds, setReadIds] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      setReadIds(saved ? JSON.parse(saved) : []);
    } catch (e) {
      setReadIds([]);
    }
  }, [storageKey]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isSuperAdmin = currentRoleId === 'SUPER_ADMIN';
  const assignedWhId = currentUser?.assignedWarehouseId;
  const warehouses = store.warehouses || [];
  const resolvedWh = useMemo(() => {
    if (!assignedWhId || assignedWhId === 'ALL') return null;
    return warehouses.find(w => w.id === assignedWhId || w.code === assignedWhId || w.uuid === assignedWhId) || null;
  }, [warehouses, assignedWhId]);

  const matchesHub = (orderOrSoc) => {
    if (isSuperAdmin || !assignedWhId || assignedWhId === 'ALL') return true;
    const wId = orderOrSoc?.warehouseId || orderOrSoc?.warehouseCode || orderOrSoc?.destinationWarehouseId;
    if (!wId) return true;
    return (
      wId === assignedWhId ||
      (resolvedWh && (wId === resolvedWh.id || wId === resolvedWh.code || wId === resolvedWh.uuid))
    );
  };

  // Build role-scoped & warehouse-scoped operational notifications
  const notifications = useMemo(() => {
    const list = [];
    const orders = Array.isArray(store.orders) ? store.orders : [];
    const societies = Array.isArray(store.societies) ? store.societies : [];
    const leads = Array.isArray(store.societyRequests) ? store.societyRequests : [];
    const procLogs = Array.isArray(store.procurementLogs) ? store.procurementLogs : [];
    const withdrawals = Array.isArray(store.withdrawals) ? store.withdrawals : [];

    // 1. SALES OFFICER NOTIFICATIONS
    if (currentRoleId === 'SALES_OFFICER') {
      const newLeads = leads.filter(l => l.status !== 'CONVERTED' && l.status !== 'REJECTED');
      newLeads.slice(0, 6).forEach(l => {
        list.push({
          id: `lead-${l.id}`,
          icon: '🏢',
          title: `Inbound Request: ${l.societyName || l.name || 'New Community'}`,
          desc: `${l.contactName || 'Resident'} (${l.phone || ''}) requested onboarding`,
          route: '/inbound-leads',
          badge: l.status === 'NEW_LEAD' ? 'NEW' : 'OPEN',
          badgeBg: '#FEF3C7',
          badgeColor: '#B45309'
        });
      });

      const mySocieties = societies.filter(s =>
        (s.createdById && (s.createdById === currentUser?.id || s.createdById === currentUser?.uuid)) ||
        (s.salesRepName && currentUser?.name && s.salesRepName.toLowerCase() === currentUser.name.toLowerCase())
      );
      mySocieties.slice(0, 6).forEach(s => {
        if (s.status === 'APPROVED') {
          list.push({
            id: `soc-approved-${s.id}`,
            icon: '✅',
            title: `Approved: ${s.name}`,
            desc: `Community is live for resident orders (${s.id})`,
            route: '/sales-my-societies',
            badge: 'APPROVED',
            badgeBg: '#ECFDF5',
            badgeColor: '#059669'
          });
        } else if (s.status === 'PENDING') {
          list.push({
            id: `soc-pending-${s.id}`,
            icon: '⏳',
            title: `Pending Admin Approval: ${s.name}`,
            desc: `Submitted & awaiting Super Admin verification`,
            route: '/sales-my-societies',
            badge: 'PENDING',
            badgeBg: '#FEF3C7',
            badgeColor: '#B45309'
          });
        }
      });
    }

    // 2. SUPER ADMIN NOTIFICATIONS
    if (currentRoleId === 'SUPER_ADMIN') {
      const pendingSocs = societies.filter(s => s.status === 'PENDING');
      if (pendingSocs.length > 0) {
        list.push({
          id: `admin-pending-socs-${pendingSocs.length}`,
          icon: '🏢',
          title: `${pendingSocs.length} Society Approval(s) Waiting`,
          desc: pendingSocs.map(s => s.name).slice(0, 2).join(', '),
          route: '/approvals',
          badge: 'APPROVAL',
          badgeBg: '#FEF3C7',
          badgeColor: '#B45309'
        });
      }

      const activeLeads = leads.filter(l => l.status === 'NEW_LEAD');
      if (activeLeads.length > 0) {
        list.push({
          id: `admin-new-leads-${activeLeads.length}`,
          icon: '📥',
          title: `${activeLeads.length} New Inbound Society Request(s)`,
          desc: activeLeads.map(l => l.societyName || l.name).slice(0, 2).join(', '),
          route: '/inbound-leads',
          badge: 'NEW LEAD',
          badgeBg: '#EFF6FF',
          badgeColor: '#1D4ED8'
        });
      }

      const pendingPayouts = withdrawals.filter(w => w.status === 'PENDING_APPROVAL');
      if (pendingPayouts.length > 0) {
        list.push({
          id: `admin-payouts-${pendingPayouts.length}`,
          icon: '🎁',
          title: `${pendingPayouts.length} Society Reward / Payout Request(s)`,
          desc: `Review pending association requests`,
          route: '/payouts',
          badge: 'ACTION',
          badgeBg: '#FEF3C7',
          badgeColor: '#B45309'
        });
      }
    }

    // 3. WAREHOUSE MANAGER / PROCUREMENT OFFICER NOTIFICATIONS
    if (currentRoleId === 'WAREHOUSE_MANAGER' || currentRoleId === 'PROCUREMENT_OFFICER' || currentRoleId === 'SUPER_ADMIN') {
      const hubOrders = orders.filter(matchesHub);
      const confirmedOrders = hubOrders.filter(o => o.status === 'CONFIRMED' || o.status === 'PROCURING');
      if (confirmedOrders.length > 0) {
        list.push({
          id: `mgr-demand-${confirmedOrders.length}-${confirmedOrders[0]?.id}`,
          icon: '🌾',
          title: `${confirmedOrders.length} Order(s) in Procurement & Packing Queue`,
          desc: `Latest: #${confirmedOrders[0]?.id} (${confirmedOrders[0]?.societyName || 'Society'})`,
          route: '/procurement-demand',
          badge: 'DEMAND',
          badgeBg: '#ECFDF5',
          badgeColor: '#059669'
        });
      }

      const packedOrders = hubOrders.filter(o => o.status === 'PACKED');
      if (packedOrders.length > 0) {
        list.push({
          id: `mgr-packed-${packedOrders.length}-${packedOrders[0]?.id}`,
          icon: '📦',
          title: `${packedOrders.length} Packed Order(s) Ready for Driver Handover`,
          desc: `Assign driver & dispatch from Crates & Dispatch`,
          route: '/warehouse-crating#dispatch',
          badge: 'HANDOVER',
          badgeBg: '#EFF6FF',
          badgeColor: '#1D4ED8'
        });
      }

      const unsettledCod = hubOrders.filter(
        o => o.status === 'DELIVERED' && (o.paymentMethod === 'PAY_ON_DELIVERY' || o.paymentMethod === 'COD') && !o.codSettledToHub
      );
      if (unsettledCod.length > 0) {
        const totalCod = unsettledCod.reduce((s, o) => s + (Number(o.codCollectedAmount || o.totalAmount) || 0), 0);
        list.push({
          id: `mgr-cod-${unsettledCod.length}-${totalCod}`,
          icon: '💵',
          title: `₹${totalCod} Driver Cash Pending Hub Settlement`,
          desc: `${unsettledCod.length} COD order(s) collected by driver(s)`,
          route: '/transactions#rider-settlement',
          badge: 'CASH',
          badgeBg: '#FEF3C7',
          badgeColor: '#B45309'
        });
      }

      const cancelledOrders = hubOrders.filter(o => o.status === 'CANCELLED');
      if (cancelledOrders.length > 0) {
        list.push({
          id: `mgr-returns-${cancelledOrders.length}-${cancelledOrders[0]?.id}`,
          icon: '♻️',
          title: `${cancelledOrders.length} Cancelled / Returned Order(s)`,
          desc: `Check Return & Wastage Audit or restored buffer stock`,
          route: '/warehouse-crating#returns',
          badge: 'AUDIT',
          badgeBg: '#FEF2F2',
          badgeColor: '#DC2626'
        });
      }
    }

    // 4. WAREHOUSE STAFF (PACKER) NOTIFICATIONS
    if (currentRoleId === 'WAREHOUSE_STAFF') {
      const hubOrders = orders.filter(matchesHub);
      const pendingPack = hubOrders.filter(o => o.status === 'CONFIRMED' || o.status === 'PROCURING');
      if (pendingPack.length > 0) {
        list.push({
          id: `packer-queue-${pendingPack.length}-${pendingPack[0]?.id}`,
          icon: '📦',
          title: `${pendingPack.length} Flat Order(s) Waiting to Pack`,
          desc: `Latest: #${pendingPack[0]?.id} · ${pendingPack[0]?.societyName || ''} (${pendingPack[0]?.flatNo || ''})`,
          route: '/warehouse-crating#packing',
          badge: 'TO PACK',
          badgeBg: '#FEF3C7',
          badgeColor: '#B45309'
        });
      }

      const hubBills = procLogs.filter(matchesHub);
      if (hubBills.length > 0) {
        list.push({
          id: `packer-proc-${hubBills.length}-${hubBills[0]?.id}`,
          icon: '🚛',
          title: `Mandi Stock Inwarded (${hubBills[0]?.totalWeightKg || 0} kg)`,
          desc: `Bill ${hubBills[0]?.billNumber || ''} logged — Ready for slot packing`,
          route: '/warehouse-crating#packing',
          badge: 'STOCK IN',
          badgeBg: '#ECFDF5',
          badgeColor: '#059669'
        });
      }

      const packedReady = hubOrders.filter(o => o.status === 'PACKED');
      if (packedReady.length > 0) {
        list.push({
          id: `packer-handover-${packedReady.length}`,
          icon: '🚚',
          title: `${packedReady.length} Packed Order(s) Ready for Handover`,
          desc: `Handover completed batch to assigned delivery driver`,
          route: '/warehouse-crating#dispatch',
          badge: 'DISPATCH',
          badgeBg: '#EFF6FF',
          badgeColor: '#1D4ED8'
        });
      }

      const returnedOrders = hubOrders.filter(o => o.status === 'CANCELLED');
      if (returnedOrders.length > 0) {
        list.push({
          id: `packer-returns-${returnedOrders.length}`,
          icon: '♻️',
          title: `${returnedOrders.length} Returned / Cancelled Order(s)`,
          desc: `Verify returned crates in 3. Returns`,
          route: '/warehouse-crating#returns',
          badge: 'RETURNS',
          badgeBg: '#FEF2F2',
          badgeColor: '#DC2626'
        });
      }
    }

    // 5. DELIVERY EXECUTIVE (DRIVER) NOTIFICATIONS
    if (currentRoleId === 'DELIVERY_EXECUTIVE') {
      const driverOrders = orders.filter(o => {
        if (o.deliveryPartnerId && currentUser?.id && o.deliveryPartnerId === currentUser.id) return true;
        if (o.deliveryPartnerName && currentUser?.name && o.deliveryPartnerName.toLowerCase() === currentUser.name.toLowerCase()) return true;
        return matchesHub(o);
      });

      const toDeliver = driverOrders.filter(o => o.status === 'OUT_FOR_DELIVERY');
      if (toDeliver.length > 0) {
        list.push({
          id: `driver-todeliver-${toDeliver.length}-${toDeliver[0]?.id}`,
          icon: '🛵',
          title: `${toDeliver.length} Stop(s) Out for Delivery`,
          desc: `Next: ${toDeliver[0]?.societyName || 'Society'} (${toDeliver[0]?.flatNo || 'Flat'})`,
          route: '/orders-fulfillment#pending',
          badge: 'TO DELIVER',
          badgeBg: '#FEF3C7',
          badgeColor: '#B45309'
        });
      }

      const cashInHandOrders = driverOrders.filter(
        o => o.status === 'DELIVERED' && (o.paymentMethod === 'PAY_ON_DELIVERY' || o.paymentMethod === 'COD') && !o.codSettledToHub
      );
      if (cashInHandOrders.length > 0) {
        const cashSum = cashInHandOrders.reduce((s, o) => s + (Number(o.codCollectedAmount || o.totalAmount) || 0), 0);
        list.push({
          id: `driver-cash-${cashInHandOrders.length}-${cashSum}`,
          icon: '💵',
          title: `₹${cashSum} Cash in Hand to Submit`,
          desc: `Collected from ${cashInHandOrders.length} COD delivery stop(s) — Submit at Hub`,
          route: '/orders-fulfillment#delivered',
          badge: 'SUBMIT CASH',
          badgeBg: '#ECFDF5',
          badgeColor: '#059669'
        });
      }

      try {
        const savedPayouts = JSON.parse(localStorage.getItem('freshioz_driver_payout_logs') || '[]');
        savedPayouts
          .filter(p => !currentUser?.name || !p.driverName || p.driverName.toLowerCase() === currentUser.name.toLowerCase())
          .slice(0, 3)
          .forEach(p => {
            list.push({
              id: `driver-paid-${p.id}`,
              icon: '💰',
              title: `Payout Received: ₹${p.amount}`,
              desc: `Settled for ${p.completedStopsCount || 0} completed deliveries (${p.paymentMode || 'CASH'})`,
              route: '/orders-fulfillment#delivered',
              badge: 'PAID',
              badgeBg: '#ECFDF5',
              badgeColor: '#059669'
            });
          });
      } catch (e) {}
    }

    return list;
  }, [store, currentRoleId, currentUser, assignedWhId, resolvedWh]);

  const unreadCount = notifications.filter(n => !readIds.includes(n.id)).length;

  const markRead = (id) => {
    if (readIds.includes(id)) return;
    const updated = [...readIds, id];
    setReadIds(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (e) {}
  };

  const markAllRead = () => {
    const allIds = notifications.map(n => n.id);
    setReadIds(allIds);
    try {
      localStorage.setItem(storageKey, JSON.stringify(allIds));
    } catch (e) {}
  };

  const handleSelectNotification = (n) => {
    markRead(n.id);
    setIsOpen(false);
    if (n.route) {
      navigate(n.route);
    }
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title="Operational Notifications"
        style={{
          position: 'relative',
          width: '34px',
          height: '34px',
          borderRadius: '8px',
          background: isOpen ? '#EBF2EE' : '#F8FAFC',
          border: '1px solid #CBD5E1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#234B3C',
          cursor: 'pointer'
        }}
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            background: '#DC2626',
            color: '#FFFFFF',
            fontSize: '9.5px',
            fontWeight: 800,
            minWidth: '16px',
            height: '16px',
            padding: '0 4px',
            borderRadius: '9999px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1.5px solid #FFFFFF'
          }}>
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          right: 0,
          top: 'calc(100% + 8px)',
          width: 'min(320px, 90vw)',
          background: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 14px 32px rgba(15, 23, 42, 0.18)',
          zIndex: 99999,
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '10px 12px',
            background: '#F8FAFC',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <strong style={{ fontSize: '12.5px', color: '#0F172A' }}>
              🔔 Alerts ({unreadCount} Unread)
            </strong>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#059669',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px'
                }}
              >
                <CheckCheck size={12} /> Mark read
              </button>
            )}
          </div>

          <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '24px 14px', textAlign: 'center', color: '#64748B', fontSize: '12px' }}>
                No new operational alerts right now.
              </div>
            ) : (
              notifications.map(n => {
                const isUnread = !readIds.includes(n.id);
                return (
                  <div
                    key={n.id}
                    onClick={() => handleSelectNotification(n)}
                    style={{
                      padding: '10px 12px',
                      borderBottom: '1px solid #F1F5F9',
                      background: isUnread ? '#F0FDF4' : '#FFFFFF',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '9px',
                      cursor: 'pointer'
                    }}
                  >
                    <span style={{ fontSize: '16px', lineHeight: 1.2 }}>{n.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                        <strong style={{ fontSize: '12px', color: '#0F172A', lineHeight: 1.25 }}>
                          {n.title}
                        </strong>
                        <span style={{
                          fontSize: '9px',
                          fontWeight: 800,
                          padding: '1px 5px',
                          borderRadius: '4px',
                          background: n.badgeBg,
                          color: n.badgeColor,
                          flexShrink: 0
                        }}>
                          {n.badge}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px', lineHeight: 1.3 }}>
                        {n.desc}
                      </div>
                    </div>
                    <ChevronRight size={13} color="#94A3B8" style={{ marginTop: '3px', flexShrink: 0 }} />
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

