import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  ShieldCheck, 
  Key, 
  Eye, 
  EyeOff, 
  Save, 
  AlertCircle, 
  CheckCircle2, 
  Zap, 
  FlaskConical,
  Copy,
  Check,
  Clock,
  Building2,
  Server,
  Settings as SettingsIcon,
  HelpCircle,
  RefreshCw,
  Truck,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { paymentSettingsService } from '../services/paymentSettingsService';
import { useToast } from '../context/ToastContext';

export default function SettingsGatewayPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const [formData, setFormData] = useState({
    razorpayEnabled: false,
    activeMode: 'TEST',
    testKeyId: '',
    testKeySecret: '',
    liveKeyId: '',
    liveKeySecret: '',
    webhookSecret: '',
  });

  const [meta, setMeta] = useState({
    hasTestKeySecret: false,
    hasLiveKeySecret: false,
    hasWebhookSecret: false,
    updatedAt: null,
    updatedBy: null,
  });

  const [showTestSecret, setShowTestSecret] = useState(false);
  const [showLiveSecret, setShowLiveSecret] = useState(false);
  const [activeTab, setActiveTab] = useState('TEST'); // 'TEST' | 'LIVE'

  // Dynamic Delivery Fee & Shipping Threshold State
  const [deliveryConfig, setDeliveryConfig] = useState({
    baseFee: 25.0,
    freeDeliveryThreshold: 299.0,
    enableFreeDelivery: true,
  });
  const [savingDelivery, setSavingDelivery] = useState(false);

  useEffect(() => {
    loadSettings();
    loadDeliverySettings();
  }, []);

  const loadDeliverySettings = async () => {
    try {
      const data = await paymentSettingsService.getDeliverySettings();
      if (data) {
        setDeliveryConfig({
          baseFee: Number(data.baseFee) >= 0 ? Number(data.baseFee) : 25,
          freeDeliveryThreshold: Number(data.freeDeliveryThreshold) || 299,
          enableFreeDelivery: data.enableFreeDelivery !== false,
        });
      }
    } catch (e) {
      console.warn('Could not load delivery settings:', e);
    }
  };

  const [cleaningData, setCleaningData] = useState(false);
  const [cleanReport, setCleanReport] = useState(null);

  const handleCleanOperationalData = async () => {
    const confirmed = window.confirm(
      "⚠️ DANGER ZONE: Reset Live Operational Test Data?\n\n" +
      "This will WIPE all:\n" +
      "• Orders & Order Items\n" +
      "• Warehouse Inventory (resets live stock to 0)\n" +
      "• Mandi Procurement Bills & Vendors\n" +
      "• Driver & Society Payouts\n" +
      "• Customer Accounts & Societies\n\n" +
      "IT WILL STRICTLY PRESERVE:\n" +
      "✓ Products (Produce Catalog)\n" +
      "✓ Employees (Staff & Delivery Logins)\n" +
      "✓ Master Units & Categories\n" +
      "✓ Warehouses (Vizag Hub, etc.)\n" +
      "✓ Payment & System Settings\n\n" +
      "Are you sure you want to proceed?"
    );
    if (!confirmed) return;

    setCleaningData(true);
    try {
      const res = await paymentSettingsService.cleanOperationalData();
      setCleanReport(res);
      showToast('Live operational test data successfully cleared! Clean slate ready.', 'success');
      
      // Preserve auth token & user info while resetting local caches
      const token = localStorage.getItem('token');
      const role = localStorage.getItem('role');
      const user = localStorage.getItem('user');
      localStorage.clear();
      if (token) localStorage.setItem('token', token);
      if (role) localStorage.setItem('role', role);
      if (user) localStorage.setItem('user', user);

      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      showToast(err?.message || 'Failed to clean operational data', 'error');
    } finally {
      setCleaningData(false);
    }
  };

  const handleSaveDeliveryConfig = async (e) => {
    if (e) e.preventDefault();
    setSavingDelivery(true);
    try {
      await paymentSettingsService.updateDeliverySettings(deliveryConfig);
      showToast('Next-Day delivery fee and shipping policy saved successfully!', 'success');
    } catch (err) {
      showToast(err?.message || 'Failed to update delivery settings', 'error');
    } finally {
      setSavingDelivery(false);
    }
  };

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await paymentSettingsService.getSettings();
      if (data) {
        setFormData({
          razorpayEnabled: Boolean(data.razorpayEnabled),
          activeMode: data.activeMode || 'TEST',
          testKeyId: data.testKeyId || '',
          testKeySecret: '',
          liveKeyId: data.liveKeyId || '',
          liveKeySecret: '',
          webhookSecret: '',
        });
        setMeta({
          hasTestKeySecret: Boolean(data.hasTestKeySecret),
          hasLiveKeySecret: Boolean(data.hasLiveKeySecret),
          hasWebhookSecret: Boolean(data.hasWebhookSecret),
          updatedAt: data.updatedAt,
          updatedBy: data.updatedBy,
        });
        setActiveTab(data.activeMode || 'TEST');
      }
    } catch (err) {
      showToast(err?.message || 'Failed to load gateway settings from server', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        razorpayEnabled: formData.razorpayEnabled,
        activeMode: formData.activeMode,
        testKeyId: formData.testKeyId.trim(),
        liveKeyId: formData.liveKeyId.trim(),
      };

      if (formData.testKeySecret.trim()) {
        payload.testKeySecret = formData.testKeySecret.trim();
      }
      if (formData.liveKeySecret.trim()) {
        payload.liveKeySecret = formData.liveKeySecret.trim();
      }
      if (formData.webhookSecret.trim()) {
        payload.webhookSecret = formData.webhookSecret.trim();
      }

      const res = await paymentSettingsService.updateSettings(payload);
      if (res) {
        showToast('Payment gateway configuration saved successfully!', 'success');
        await loadSettings();
      }
    } catch (err) {
      showToast(err?.message || 'Failed to save settings to server', 'error');
    } finally {
      setSaving(false);
    }
  };

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin.replace(':5174', ':5000')}/api/payments/razorpay/webhook`
    : 'https://api.freshioz.com/api/payments/razorpay/webhook';

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    showToast('Webhook URL copied to clipboard!', 'success');
    setTimeout(() => setCopiedWebhook(false), 2500);
  };

  return (
    <div className="admin-page-container">
      {/* Page Title Header */}
      <div className="page-title-header" style={{ marginBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: '#234B3C',
              color: '#FFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <SettingsIcon size={18} />
            </div>
            <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Platform Settings & Payment Gateway
            </h1>
          </div>
          <p style={{ fontSize: '12px', color: '#64748B', margin: '4px 0 0 40px' }}>
            Manage Razorpay API credentials, environment modes, automated payment reconciliation & platform parameters
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={loadSettings}
            disabled={loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '6px',
              background: '#FFFFFF',
              border: '1.5px solid #CBD5E1',
              color: '#334155',
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Reload</span>
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 16px',
              borderRadius: '6px',
              background: '#234B3C',
              color: '#FFFFFF',
              border: 'none',
              fontWeight: 700,
              fontSize: '12px',
              cursor: saving ? 'not-allowed' : 'pointer'
            }}
          >
            <Save size={14} />
            <span>{saving ? 'Saving Changes...' : 'Save Configuration'}</span>
          </button>
        </div>
      </div>

      {/* Razorpay Payment Gateway Main Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1.2fr)', gap: '16px' }}>
          
          {/* Left Column: Razorpay Configuration Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Card 1: Master Gateway Switch & Environment Mode */}
          <div style={{
            background: '#FFFFFF',
            border: '1.5px solid #E2E8F0',
            borderRadius: '12px',
            padding: '18px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: formData.razorpayEnabled ? '#ECFDF5' : '#F1F5F9',
                  color: formData.razorpayEnabled ? '#059669' : '#64748B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <CreditCard size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                    Enable Razorpay Gateway
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>
                    Allow society residents to pay online via UPI, Cards, Netbanking & Wallets
                  </div>
                </div>
              </div>

              {/* Master Gateway Toggle Switch */}
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={formData.razorpayEnabled}
                  onChange={(e) => setFormData(prev => ({ ...prev, razorpayEnabled: e.target.checked }))}
                  style={{ display: 'none' }}
                />
                <div style={{
                  width: '46px',
                  height: '24px',
                  background: formData.razorpayEnabled ? '#059669' : '#CBD5E1',
                  borderRadius: '9999px',
                  position: 'relative',
                  transition: 'background 0.2s'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '2px',
                    left: formData.razorpayEnabled ? '24px' : '2px',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: '#FFFFFF',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    transition: 'left 0.2s'
                  }} />
                </div>
                <span style={{ fontSize: '12.5px', fontWeight: 800, color: formData.razorpayEnabled ? '#059669' : '#64748B' }}>
                  {formData.razorpayEnabled ? 'ACTIVE' : 'DISABLED'}
                </span>
              </label>
            </div>

            {/* Active Environment Selector */}
            <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '16px' }}>
              <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#334155', marginBottom: '8px' }}>
                Active Processing Environment
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({ ...prev, activeMode: 'TEST' }));
                    setActiveTab('TEST');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: formData.activeMode === 'TEST' ? '2px solid #0284C7' : '1.5px solid #E2E8F0',
                    background: formData.activeMode === 'TEST' ? '#F0F9FF' : '#FFFFFF',
                    color: formData.activeMode === 'TEST' ? '#0369A1' : '#64748B',
                    fontWeight: 800,
                    fontSize: '12.5px',
                    cursor: 'pointer'
                  }}
                >
                  <FlaskConical size={16} />
                  <span>Test / Sandbox Mode</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({ ...prev, activeMode: 'LIVE' }));
                    setActiveTab('LIVE');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: formData.activeMode === 'LIVE' ? '2px solid #059669' : '1.5px solid #E2E8F0',
                    background: formData.activeMode === 'LIVE' ? '#ECFDF5' : '#FFFFFF',
                    color: formData.activeMode === 'LIVE' ? '#047857' : '#64748B',
                    fontWeight: 800,
                    fontSize: '12.5px',
                    cursor: 'pointer'
                  }}
                >
                  <Zap size={16} />
                  <span>Live Production Mode</span>
                </button>
              </div>
            </div>
          </div>

          {/* Card 2: API Keys Management (Test & Live) */}
          <div style={{
            background: '#FFFFFF',
            border: '1.5px solid #E2E8F0',
            borderRadius: '12px',
            padding: '18px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}>
            {/* Environment Tabs */}
            <div style={{ display: 'flex', borderBottom: '1.5px solid #E2E8F0', marginBottom: '16px' }}>
              <button
                type="button"
                onClick={() => setActiveTab('TEST')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderBottom: activeTab === 'TEST' ? '2px solid #0284C7' : 'none',
                  color: activeTab === 'TEST' ? '#0284C7' : '#64748B',
                  fontWeight: 800,
                  fontSize: '13px',
                  background: 'none',
                  borderTop: 'none',
                  borderLeft: 'none',
                  borderRight: 'none',
                  cursor: 'pointer',
                  marginBottom: '-1.5px'
                }}
              >
                <FlaskConical size={14} />
                <span>Test Credentials</span>
                {meta.hasTestKeySecret && (
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#059669' }} title="Configured" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('LIVE')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderBottom: activeTab === 'LIVE' ? '2px solid #059669' : 'none',
                  color: activeTab === 'LIVE' ? '#059669' : '#64748B',
                  fontWeight: 800,
                  fontSize: '13px',
                  background: 'none',
                  borderTop: 'none',
                  borderLeft: 'none',
                  borderRight: 'none',
                  cursor: 'pointer',
                  marginBottom: '-1.5px'
                }}
              >
                <Zap size={14} />
                <span>Live Credentials</span>
                {meta.hasLiveKeySecret && (
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#059669' }} title="Configured" />
                )}
              </button>
            </div>

            {/* Test Credentials View */}
            {activeTab === 'TEST' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                    Razorpay Test Key ID
                  </label>
                  <input
                    type="text"
                    value={formData.testKeyId}
                    onChange={(e) => setFormData(prev => ({ ...prev, testKeyId: e.target.value }))}
                    placeholder="rzp_test_..."
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck="false"
                    name="freshioz_rzp_test_key_id_field"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                      fontFamily: 'monospace'
                    }}
                  />
                  <span style={{ fontSize: '11px', color: '#64748B', marginTop: '3px', display: 'block' }}>
                    Generated from your Razorpay Dashboard under Settings &rarr; API Keys.
                  </span>
                </div>

                <div>
                  <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                    <span>Razorpay Test Key Secret</span>
                    {meta.hasTestKeySecret && (
                      <span style={{ color: '#059669', fontSize: '11px', fontWeight: 700 }}>
                        ✓ Secret Saved on Server
                      </span>
                    )}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showTestSecret ? 'text' : 'password'}
                      value={formData.testKeySecret}
                      onChange={(e) => setFormData(prev => ({ ...prev, testKeySecret: e.target.value }))}
                      placeholder={meta.hasTestKeySecret ? '•••••••••••••••••••••••••••••••• (Leave blank to keep current)' : 'Enter Test Key Secret'}
                      autoComplete="new-password"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck="false"
                      name="freshioz_rzp_test_secret_field"
                      style={{
                        width: '100%',
                        padding: '8px 36px 8px 12px',
                        borderRadius: '6px',
                        border: '1.5px solid #CBD5E1',
                        fontSize: '13px',
                        boxSizing: 'border-box',
                        fontFamily: 'monospace'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowTestSecret(!showTestSecret)}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: '#64748B',
                        cursor: 'pointer'
                      }}
                    >
                      {showTestSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Live Credentials View */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{
                  background: '#FEF3C7',
                  border: '1px solid #FCD34D',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  fontSize: '11.5px',
                  color: '#92400E',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <AlertCircle size={15} color="#D97706" />
                  <span>Live credentials process real customer bank charges. Handle with care.</span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                    Razorpay Live Key ID
                  </label>
                  <input
                    type="text"
                    value={formData.liveKeyId}
                    onChange={(e) => setFormData(prev => ({ ...prev, liveKeyId: e.target.value }))}
                    placeholder="rzp_live_..."
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck="false"
                    name="freshioz_rzp_live_key_id_field"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                      fontFamily: 'monospace'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                    <span>Razorpay Live Key Secret</span>
                    {meta.hasLiveKeySecret && (
                      <span style={{ color: '#059669', fontSize: '11px', fontWeight: 700 }}>
                        ✓ Secret Saved on Server
                      </span>
                    )}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showLiveSecret ? 'text' : 'password'}
                      value={formData.liveKeySecret}
                      onChange={(e) => setFormData(prev => ({ ...prev, liveKeySecret: e.target.value }))}
                      placeholder={meta.hasLiveKeySecret ? '•••••••••••••••••••••••••••••••• (Leave blank to keep current)' : 'Enter Live Key Secret'}
                      autoComplete="new-password"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck="false"
                      name="freshioz_rzp_live_secret_field"
                      style={{
                        width: '100%',
                        padding: '8px 36px 8px 12px',
                        borderRadius: '6px',
                        border: '1.5px solid #CBD5E1',
                        fontSize: '13px',
                        boxSizing: 'border-box',
                        fontFamily: 'monospace'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowLiveSecret(!showLiveSecret)}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: '#64748B',
                        cursor: 'pointer'
                      }}
                    >
                      {showLiveSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Webhook Secret Input */}
            <div style={{ borderTop: '1px solid #F1F5F9', marginTop: '16px', paddingTop: '14px' }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                <span>Razorpay Webhook Secret (Optional)</span>
                {meta.hasWebhookSecret && (
                  <span style={{ color: '#059669', fontSize: '11px', fontWeight: 700 }}>
                    ✓ Webhook Active
                  </span>
                )}
              </label>
              <input
                type="password"
                value={formData.webhookSecret}
                onChange={(e) => setFormData(prev => ({ ...prev, webhookSecret: e.target.value }))}
                placeholder={meta.hasWebhookSecret ? '•••••••••••••••• (Leave blank to keep current)' : 'Enter Webhook Secret if enabled in Razorpay Dashboard'}
                autoComplete="new-password"
                name="freshioz_rzp_webhook_secret_field"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1.5px solid #CBD5E1',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                  fontFamily: 'monospace'
                }}
              />
              <span style={{ fontSize: '11px', color: '#64748B', marginTop: '3px', display: 'block' }}>
                Used for automatic background order confirmation if the resident closes their browser tab after UPI payment.
              </span>
            </div>

            {/* Save Button Row */}
            <div style={{ marginTop: '18px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving || loading}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 20px',
                  borderRadius: '6px',
                  background: '#234B3C',
                  color: '#FFFFFF',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '12.5px',
                  cursor: saving ? 'not-allowed' : 'pointer'
                }}
              >
                <Save size={14} />
                <span>{saving ? 'Saving...' : 'Save Razorpay Settings'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Next-Day Delivery Policy & Webhook Integration */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Next-Day Delivery Fee & Free Shipping Threshold Card */}
          <div style={{
            background: '#FFFFFF',
            border: '1.5px solid #E2E8F0',
            borderRadius: '12px',
            padding: '18px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: '#FEF3C7',
                  color: '#D97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Truck size={17} />
                </div>
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                    Next-Day Delivery Policy
                  </h3>
                  <p style={{ margin: '1px 0 0', fontSize: '11px', color: '#64748B' }}>
                    Control customer delivery fee and free shipping
                  </p>
                </div>
              </div>

              <span style={{
                background: deliveryConfig.baseFee === 0 ? '#DCFCE7' : '#EFF6FF',
                color: deliveryConfig.baseFee === 0 ? '#15803D' : '#1D4ED8',
                fontSize: '11px',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '6px'
              }}>
                {deliveryConfig.baseFee === 0 ? 'FREE DELIVERY FOR ALL' : `₹${deliveryConfig.baseFee} BASE FEE`}
              </span>
            </div>

            {/* Dynamic Status Callout Banner */}
            <div style={{
              background: deliveryConfig.baseFee === 0 ? '#F0FDF4' : '#F8FAFC',
              border: `1px solid ${deliveryConfig.baseFee === 0 ? '#BBF7D0' : '#E2E8F0'}`,
              borderRadius: '8px',
              padding: '10px 12px',
              marginBottom: '14px',
              fontSize: '12px',
              color: deliveryConfig.baseFee === 0 ? '#15803D' : '#334155',
              lineHeight: 1.5
            }}>
              {deliveryConfig.baseFee === 0 ? (
                <span>🎉 <strong>Free Delivery Active on ALL Orders:</strong> Zero delivery charge applied to any customer basket at checkout.</span>
              ) : (
                <span>Standard delivery is <strong>₹{deliveryConfig.baseFee}</strong>. Orders of <strong>₹{deliveryConfig.freeDeliveryThreshold} and above</strong> qualify for <strong>FREE Doorstep Delivery</strong>.</span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Base Next-Day Delivery Fee (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  max="200"
                  step="5"
                  value={deliveryConfig.baseFee}
                  onChange={(e) => setDeliveryConfig(prev => ({ ...prev, baseFee: Math.max(0, parseFloat(e.target.value) || 0) }))}
                  placeholder="e.g. 0 for Free Delivery, or 25"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '13px',
                    fontWeight: 700,
                    boxSizing: 'border-box'
                  }}
                />
                <span style={{ fontSize: '10.5px', color: '#64748B', marginTop: '2px', display: 'block' }}>
                  Set to <strong>0</strong> to provide completely free delivery across all apartment communities.
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Free Delivery Threshold (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  max="1000"
                  step="10"
                  value={deliveryConfig.freeDeliveryThreshold}
                  onChange={(e) => setDeliveryConfig(prev => ({ ...prev, freeDeliveryThreshold: Math.max(0, parseFloat(e.target.value) || 0) }))}
                  placeholder="e.g. 199 or 299"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '13px',
                    fontWeight: 700,
                    boxSizing: 'border-box'
                  }}
                />
                <span style={{ fontSize: '10.5px', color: '#64748B', marginTop: '2px', display: 'block' }}>
                  Minimum cart value required to waive the delivery fee.
                </span>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                background: '#F8FAFC',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                marginTop: '2px'
              }}>
                <div>
                  <strong style={{ fontSize: '12px', color: '#0F172A', display: 'block' }}>Enable Free Delivery Tier</strong>
                  <span style={{ fontSize: '11px', color: '#64748B' }}>Waives delivery fee when threshold is met</span>
                </div>
                <button
                  type="button"
                  onClick={() => setDeliveryConfig(prev => ({ ...prev, enableFreeDelivery: !prev.enableFreeDelivery }))}
                  style={{
                    width: '42px',
                    height: '22px',
                    borderRadius: '11px',
                    background: deliveryConfig.enableFreeDelivery ? '#16A34A' : '#CBD5E1',
                    border: 'none',
                    cursor: 'pointer',
                    position: 'relative',
                    padding: 0
                  }}
                >
                  <div style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: '#FFFFFF',
                    position: 'absolute',
                    top: '3px',
                    left: deliveryConfig.enableFreeDelivery ? '23px' : '3px',
                    transition: 'left 0.2s'
                  }} />
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={handleSaveDeliveryConfig}
                  disabled={savingDelivery}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 16px',
                    borderRadius: '6px',
                    background: '#234B3C',
                    color: '#FFFFFF',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: savingDelivery ? 'not-allowed' : 'pointer'
                  }}
                >
                  <Save size={13} />
                  <span>{savingDelivery ? 'Saving...' : 'Save Delivery Policy'}</span>
                </button>
              </div>
            </div>
          </div>
          
          {/* Webhook Configuration Instructions Card */}
          <div style={{
            background: '#FFFFFF',
            border: '1.5px solid #E2E8F0',
            borderRadius: '12px',
            padding: '18px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                background: '#F0FDF4',
                color: '#16A34A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Zap size={15} />
              </div>
              <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Automated Webhook Integration
              </h3>
            </div>

            <p style={{ fontSize: '11.5px', color: '#64748B', margin: '0 0 10px', lineHeight: 1.5 }}>
              Configure this Webhook URL inside your Razorpay Dashboard (&rarr; Settings &rarr; Webhooks) with the event <code>payment.captured</code> and <code>order.paid</code>:
            </p>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: '#F8FAFC',
              border: '1px solid #CBD5E1',
              borderRadius: '6px',
              padding: '6px 10px',
              marginBottom: '12px'
            }}>
              <span style={{ flex: 1, fontSize: '11.5px', fontFamily: 'monospace', color: '#0F172A', wordBreak: 'break-all' }}>
                {webhookUrl}
              </span>
              <button
                type="button"
                onClick={handleCopyWebhook}
                style={{
                  background: 'none',
                  border: 'none',
                  color: copiedWebhook ? '#059669' : '#234B3C',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title="Copy Webhook URL"
              >
                {copiedWebhook ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>

            <div style={{ fontSize: '11px', color: '#64748B', lineHeight: 1.6 }}>
              <strong>Steps to complete integration:</strong>
              <ol style={{ paddingLeft: '18px', margin: '4px 0 0' }}>
                <li>Log in to <a href="https://dashboard.razorpay.com" target="_blank" rel="noreferrer" style={{ color: '#0284C7', fontWeight: 600 }}>dashboard.razorpay.com</a>.</li>
                <li>Go to <strong>Account & Settings</strong> &rarr; <strong>API Keys</strong>.</li>
                <li>Generate and paste your <strong>Key ID</strong> and <strong>Secret</strong> on the left.</li>
                <li>Go to <strong>Webhooks</strong> &rarr; Add Webhook URL and select <code>order.paid</code>.</li>
              </ol>
            </div>
          </div>

          {/* Danger Zone: Operational Test Data Reset Card */}
          <div style={{
            background: '#FFF5F5',
            border: '1.5px solid #FECACA',
            borderRadius: '12px',
            padding: '18px 20px',
            boxShadow: '0 1px 3px rgba(239,68,68,0.06)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                background: '#FEE2E2',
                color: '#DC2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Trash2 size={15} />
              </div>
              <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#991B1B', margin: 0 }}>
                Danger Zone: Reset Live Operational Test Data
              </h3>
            </div>

            <p style={{ fontSize: '11.5px', color: '#7F1D1D', margin: '0 0 10px', lineHeight: 1.5 }}>
              Use this before conducting end-to-end testing. Strictly preserves your <strong>Produce Products</strong>, <strong>Employees/Staff</strong>, <strong>Master Units</strong>, <strong>Categories</strong>, and <strong>Hub Warehouses</strong> while wiping test orders, warehouse stock, Mandi bills, and payouts.
            </p>

            <button
              type="button"
              onClick={handleCleanOperationalData}
              disabled={cleaningData}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '9px 16px',
                borderRadius: '7px',
                background: cleaningData ? '#9CA3AF' : '#DC2626',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: 700,
                fontSize: '12.5px',
                cursor: cleaningData ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s'
              }}
            >
              <Trash2 size={14} />
              <span>{cleaningData ? 'Wiping Live Test Data...' : 'Wipe Live Operational Data (Keep Catalog & Staff)'}</span>
            </button>

            {cleanReport && (
              <div style={{ marginTop: '10px', padding: '8px 10px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '6px', fontSize: '11px', color: '#166534' }}>
                ✓ {cleanReport.message}
                <div style={{ marginTop: '4px', fontSize: '10.5px', color: '#15803D' }}>
                  Preserved: {cleanReport.preserved?.products} products, {cleanReport.preserved?.employees} staff, {cleanReport.preserved?.warehouses} hubs, {cleanReport.preserved?.categories} categories.
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
