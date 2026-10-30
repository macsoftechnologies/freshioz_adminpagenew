import React, { useState, useEffect } from 'react';
import { 
  X, 
  CreditCard, 
  ShieldCheck, 
  Key, 
  Eye, 
  EyeOff, 
  Save, 
  AlertCircle, 
  CheckCircle2, 
  Zap, 
  FlaskConical 
} from 'lucide-react';
import { paymentSettingsService } from '../../services/paymentSettingsService';
import { useToast } from '../../context/ToastContext';

export default function PaymentGatewaySettingsModal({ isOpen, onClose }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

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

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

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
      showToast(err?.message || 'Failed to load gateway settings', 'error');
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
      showToast('Payment gateway settings saved successfully', 'success');
      setMeta({
        hasTestKeySecret: Boolean(res.hasTestKeySecret),
        hasLiveKeySecret: Boolean(res.hasLiveKeySecret),
        hasWebhookSecret: Boolean(res.hasWebhookSecret),
        updatedAt: res.updatedAt,
        updatedBy: res.updatedBy,
      });
      setFormData(prev => ({
        ...prev,
        testKeySecret: '',
        liveKeySecret: '',
        webhookSecret: '',
      }));
      onClose();
    } catch (err) {
      showToast(err?.message || 'Failed to save gateway settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const currentMode = formData.activeMode;
  const isCurrentModeConfigured = currentMode === 'LIVE' 
    ? (Boolean(formData.liveKeyId) && meta.hasLiveKeySecret)
    : (Boolean(formData.testKeyId) && meta.hasTestKeySecret);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '16px'
    }}>
      <div style={{
        background: '#FFFFFF',
        borderRadius: '18px',
        width: '100%',
        maxWidth: '560px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1.5px solid #E2E8F0',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#F8FAFC',
          borderTopLeftRadius: '18px',
          borderTopRightRadius: '18px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: '#E6F4EA',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#137333'
            }}>
              <CreditCard size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Razorpay Gateway Settings
              </h2>
              <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>
                Configure UPI, Cards & NetBanking for resident checkout
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#64748B',
              padding: '6px',
              borderRadius: '8px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        {loading ? (
          <div style={{ padding: '60px 24px', textAlign: 'center', color: '#64748B', fontSize: '14px' }}>
            Loading gateway settings...
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Status Summary Banner */}
            <div style={{
              padding: '14px 16px',
              borderRadius: '12px',
              border: formData.razorpayEnabled
                ? (isCurrentModeConfigured ? '1.5px solid #86EFAC' : '1.5px solid #FCD34D')
                : '1.5px solid #E2E8F0',
              background: formData.razorpayEnabled
                ? (isCurrentModeConfigured ? '#F0FDF4' : '#FFFBEB')
                : '#F8FAFC',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px'
            }}>
              {formData.razorpayEnabled ? (
                isCurrentModeConfigured ? (
                  <CheckCircle2 size={20} color="#16A34A" style={{ marginTop: '2px', flexShrink: 0 }} />
                ) : (
                  <AlertCircle size={20} color="#D97706" style={{ marginTop: '2px', flexShrink: 0 }} />
                )
              ) : (
                <ShieldCheck size={20} color="#64748B" style={{ marginTop: '2px', flexShrink: 0 }} />
              )}
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A' }}>
                  {!formData.razorpayEnabled
                    ? 'Online Gateway Disabled'
                    : isCurrentModeConfigured
                    ? `Ready for Payments (${currentMode} Mode)`
                    : `Incomplete Keys for ${currentMode} Mode`}
                </div>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px', lineHeight: 1.4 }}>
                  {!formData.razorpayEnabled
                    ? 'Resident checkout will smoothly default to Cash on Delivery only.'
                    : isCurrentModeConfigured
                    ? `Residents can pay via UPI (GPay, PhonePe, Paytm) and Cards in ${currentMode} mode.`
                    : `Please enter your Key ID and Key Secret below to activate online checkout.`}
                </div>
              </div>
            </div>

            {/* Toggle 1: Enable Online Payments */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 18px',
              background: '#F8FAFC',
              borderRadius: '12px',
              border: '1.5px solid #E2E8F0'
            }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                  Enable Razorpay Gateway
                </div>
                <div style={{ fontSize: '12px', color: '#64748B' }}>
                  Allow residents to select Instant UPI / Online payment at checkout
                </div>
              </div>
              <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.razorpayEnabled}
                  onChange={(e) => setFormData(prev => ({ ...prev, razorpayEnabled: e.target.checked }))}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span style={{
                  position: 'absolute',
                  cursor: 'pointer',
                  top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: formData.razorpayEnabled ? '#16A34A' : '#CBD5E1',
                  borderRadius: '34px',
                  transition: '0.3s'
                }}>
                  <span style={{
                    position: 'absolute',
                    content: '""',
                    height: '20px',
                    width: '20px',
                    left: formData.razorpayEnabled ? '24px' : '3px',
                    bottom: '3px',
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    transition: '0.3s',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }} />
                </span>
              </label>
            </div>

            {/* Active Environment Selector */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: '#334155', marginBottom: '8px' }}>
                Active Processing Environment
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({ ...prev, activeMode: 'TEST' }));
                    setActiveTab('TEST');
                  }}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: formData.activeMode === 'TEST' ? '2px solid #2563EB' : '1px solid #E2E8F0',
                    background: formData.activeMode === 'TEST' ? '#EFF6FF' : '#FFF',
                    color: formData.activeMode === 'TEST' ? '#1D4ED8' : '#64748B',
                    fontWeight: 700,
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: 'pointer'
                  }}
                >
                  <FlaskConical size={16} /> Test / Sandbox Mode
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({ ...prev, activeMode: 'LIVE' }));
                    setActiveTab('LIVE');
                  }}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: formData.activeMode === 'LIVE' ? '2px solid #16A34A' : '1px solid #E2E8F0',
                    background: formData.activeMode === 'LIVE' ? '#F0FDF4' : '#FFF',
                    color: formData.activeMode === 'LIVE' ? '#15803D' : '#64748B',
                    fontWeight: 700,
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: 'pointer'
                  }}
                >
                  <Zap size={16} /> Live Production Mode
                </button>
              </div>
            </div>

            {/* Credential Tabs */}
            <div>
              <div style={{ display: 'flex', borderBottom: '1px solid #E2E8F0', marginBottom: '16px' }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('TEST')}
                  style={{
                    padding: '8px 16px',
                    background: 'none',
                    border: 'none',
                    borderBottom: activeTab === 'TEST' ? '2px solid #2563EB' : '2px solid transparent',
                    color: activeTab === 'TEST' ? '#2563EB' : '#64748B',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  Test Credentials {meta.hasTestKeySecret && <span style={{ color: '#16A34A' }}>✓</span>}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('LIVE')}
                  style={{
                    padding: '8px 16px',
                    background: 'none',
                    border: 'none',
                    borderBottom: activeTab === 'LIVE' ? '2px solid #16A34A' : '2px solid transparent',
                    color: activeTab === 'LIVE' ? '#16A34A' : '#64748B',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  Live Credentials {meta.hasLiveKeySecret && <span style={{ color: '#16A34A' }}>✓</span>}
                </button>
              </div>

              {/* TEST TAB */}
              {activeTab === 'TEST' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Test Key ID
                    </label>
                    <input
                      type="text"
                      placeholder="rzp_test_xxxxxxxxxxxxxx"
                      value={formData.testKeyId}
                      onChange={(e) => setFormData(prev => ({ ...prev, testKeyId: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '13px',
                        fontFamily: 'monospace'
                      }}
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155' }}>
                        Test Key Secret
                      </label>
                      {meta.hasTestKeySecret && (
                        <span style={{ fontSize: '11px', color: '#16A34A', fontWeight: 700 }}>
                          ✓ Secret already saved
                        </span>
                      )}
                    </div>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showTestSecret ? 'text' : 'password'}
                        placeholder={meta.hasTestKeySecret ? '•••••••••••••••• (Leave blank to keep current)' : 'Enter Razorpay Test Key Secret'}
                        value={formData.testKeySecret}
                        onChange={(e) => setFormData(prev => ({ ...prev, testKeySecret: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '10px 40px 10px 14px',
                          borderRadius: '8px',
                          border: '1px solid #CBD5E1',
                          fontSize: '13px',
                          fontFamily: 'monospace'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowTestSecret(!showTestSecret)}
                        style={{
                          position: 'absolute',
                          right: '10px',
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
              )}

              {/* LIVE TAB */}
              {activeTab === 'LIVE' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Live Key ID
                    </label>
                    <input
                      type="text"
                      placeholder="rzp_live_xxxxxxxxxxxxxx"
                      value={formData.liveKeyId}
                      onChange={(e) => setFormData(prev => ({ ...prev, liveKeyId: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '13px',
                        fontFamily: 'monospace'
                      }}
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155' }}>
                        Live Key Secret
                      </label>
                      {meta.hasLiveKeySecret && (
                        <span style={{ fontSize: '11px', color: '#16A34A', fontWeight: 700 }}>
                          ✓ Secret already saved
                        </span>
                      )}
                    </div>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showLiveSecret ? 'text' : 'password'}
                        placeholder={meta.hasLiveKeySecret ? '•••••••••••••••• (Leave blank to keep current)' : 'Enter Razorpay Live Key Secret'}
                        value={formData.liveKeySecret}
                        onChange={(e) => setFormData(prev => ({ ...prev, liveKeySecret: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '10px 40px 10px 14px',
                          borderRadius: '8px',
                          border: '1px solid #CBD5E1',
                          fontSize: '13px',
                          fontFamily: 'monospace'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowLiveSecret(!showLiveSecret)}
                        style={{
                          position: 'absolute',
                          right: '10px',
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
            </div>

            {/* Optional Webhook Secret */}
            <div style={{ paddingTop: '8px', borderTop: '1px dashed #E2E8F0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#475569' }}>
                  Webhook Secret (Optional)
                </label>
                {meta.hasWebhookSecret && (
                  <span style={{ fontSize: '11px', color: '#16A34A', fontWeight: 700 }}>
                    ✓ Saved
                  </span>
                )}
              </div>
              <input
                type="password"
                placeholder={meta.hasWebhookSecret ? '••••••••••••••••' : 'Enter Razorpay Webhook Secret if configured'}
                value={formData.webhookSecret}
                onChange={(e) => setFormData(prev => ({ ...prev, webhookSecret: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '9px 14px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '12.5px',
                  fontFamily: 'monospace'
                }}
              />
              <span style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px', display: 'block' }}>
                Used for automatic background order confirmation if the resident closes their browser after payment.
              </span>
            </div>

            {/* Footer Buttons */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '12px',
              marginTop: '12px',
              paddingTop: '16px',
              borderTop: '1px solid #E2E8F0'
            }}>
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                style={{
                  padding: '10px 18px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  background: '#FFF',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: '10px 22px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#234B3C',
                  color: '#FFF',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  opacity: saving ? 0.7 : 1
                }}
              >
                <Save size={16} />
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
