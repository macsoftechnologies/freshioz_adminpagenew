import React, { useState, useEffect } from 'react';
import { 
  Coins, 
  Sparkles, 
  Gift, 
  Save, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  TrendingUp, 
  HelpCircle,
  Clock,
  ArrowRight,
  Percent,
  IndianRupee,
  BadgePercent,
  Check
} from 'lucide-react';
import { paymentSettingsService } from '../services/paymentSettingsService';
import { useToast } from '../context/ToastContext';

export default function FreshCoinsLoyaltyPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [coinsConfig, setCoinsConfig] = useState({
    isEnabled: true,
    earningRatePercent: 5.0,
    coinRupeeValue: 1.0,
    maxRedemptionPercent: 25.0,
    minOrderValue: 100.0,
    welcomeBonusCoins: 50,
    expiryDays: 90
  });

  const [simOrderAmount, setSimOrderAmount] = useState(500);

  useEffect(() => {
    loadCoinsSettings();
  }, []);

  const loadCoinsSettings = async () => {
    setLoading(true);
    try {
      const data = await paymentSettingsService.getFreshCoinsSettings();
      if (data) {
        setCoinsConfig({
          isEnabled: Boolean(data.isEnabled),
          earningRatePercent: Number(data.earningRatePercent) || 5.0,
          coinRupeeValue: Number(data.coinRupeeValue) || 1.0,
          maxRedemptionPercent: Number(data.maxRedemptionPercent) || 25.0,
          minOrderValue: Number(data.minOrderValue) || 100.0,
          welcomeBonusCoins: Number(data.welcomeBonusCoins) || 50,
          expiryDays: Number(data.expiryDays) || 90
        });
      }
    } catch (e) {
      console.warn('Could not load fresh coins settings:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCoinsConfig = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      await paymentSettingsService.updateFreshCoinsSettings(coinsConfig);
      showToast('FreshCoins loyalty program settings saved successfully!', 'success');
    } catch (err) {
      showToast(err?.message || 'Failed to update FreshCoins settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Calculations for live simulation
  const earnedCoins = Math.floor((simOrderAmount * coinsConfig.earningRatePercent) / 100);
  const earnedRupees = earnedCoins * coinsConfig.coinRupeeValue;
  const maxRedeemAmount = Math.floor((simOrderAmount * coinsConfig.maxRedemptionPercent) / 100);

  return (
    <div style={{ padding: '24px', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: '#FEF3C7',
              border: '1px solid #FDE68A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Coins size={22} color="#D97706" />
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#173328', margin: 0 }}>
              FreshCoins Loyalty & Rewards Engine
            </h1>
            <span style={{
              background: coinsConfig.isEnabled ? '#DCFCE7' : '#FEE2E2',
              color: coinsConfig.isEnabled ? '#15803D' : '#991B1B',
              fontSize: '11px',
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: '999px',
              border: `1px solid ${coinsConfig.isEnabled ? '#86EFAC' : '#FCA5A5'}`
            }}>
              {coinsConfig.isEnabled ? '● ACTIVE PROGRAM' : '○ DISABLED'}
            </span>
          </div>
          <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
            Configure resident coin cashbacks, rupee valuation, checkout redemption caps, and automated morning credit rules.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={loadCoinsSettings}
            disabled={loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              background: '#FFFFFF',
              border: '1.5px solid #CBD5E1',
              color: '#334155',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleSaveCoinsConfig}
            disabled={saving || loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 20px',
              borderRadius: '8px',
              background: '#234B3C',
              color: '#FFFFFF',
              border: 'none',
              fontWeight: 700,
              fontSize: '13px',
              cursor: saving ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 8px rgba(35, 75, 60, 0.25)'
            }}
          >
            <Save size={15} />
            <span>{saving ? 'Saving...' : 'Save Loyalty Settings'}</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Highlight Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '14px',
        marginBottom: '24px'
      }}>
        <div style={{ background: '#FFFFFF', padding: '16px 20px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
            Cashback Earn Rate
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#15803D', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span>{coinsConfig.earningRatePercent}%</span>
            <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>of cart total</span>
          </div>
        </div>

        <div style={{ background: '#FFFFFF', padding: '16px 20px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
            Coin Valuation
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#D97706', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span>1 Coin = ₹{coinsConfig.coinRupeeValue.toFixed(2)}</span>
          </div>
        </div>

        <div style={{ background: '#FFFFFF', padding: '16px 20px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
            Max Order Redemption Cap
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#0369A1', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span>{coinsConfig.maxRedemptionPercent}%</span>
            <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>max checkout cut</span>
          </div>
        </div>

        <div style={{ background: '#FFFFFF', padding: '16px 20px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
            Min Qualifying Order
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#475569', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span>₹{coinsConfig.minOrderValue}</span>
          </div>
        </div>
      </div>

      {/* Main 2-Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', alignItems: 'start' }}>
        {/* Left Column: Configuration Settings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Main Config Card */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            border: '1.5px solid #E2E8F0',
            padding: '24px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.03)'
          }}>
            {/* Master Toggle */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 18px',
              background: coinsConfig.isEnabled ? '#F0FDF4' : '#F8FAFC',
              border: `1.5px solid ${coinsConfig.isEnabled ? '#86EFAC' : '#E2E8F0'}`,
              borderRadius: '12px',
              marginBottom: '22px'
            }}>
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#173328', margin: '0 0 2px' }}>
                  Enable FreshCoins Loyalty Engine
                </h4>
                <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>
                  Automatically calculate and credit coins for apartment residents upon delivery
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCoinsConfig(prev => ({ ...prev, isEnabled: !prev.isEnabled }))}
                style={{
                  width: '50px',
                  height: '26px',
                  borderRadius: '13px',
                  background: coinsConfig.isEnabled ? '#16A34A' : '#CBD5E1',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background 0.2s',
                  padding: 0
                }}
              >
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: '#FFFFFF',
                  position: 'absolute',
                  top: '3px',
                  left: coinsConfig.isEnabled ? '27px' : '3px',
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                }} />
              </button>
            </div>

            {/* Inputs Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Earning Rate (%)
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="50"
                    value={coinsConfig.earningRatePercent}
                    onChange={(e) => setCoinsConfig(prev => ({ ...prev, earningRatePercent: parseFloat(e.target.value) || 0 }))}
                    style={{
                      width: '100%',
                      padding: '10px 36px 10px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '14px',
                      fontWeight: 700,
                      color: '#0F172A',
                      boxSizing: 'border-box'
                    }}
                  />
                  <Percent size={15} style={{ position: 'absolute', right: '12px', top: '12px', color: '#94A3B8' }} />
                </div>
                <span style={{ fontSize: '11px', color: '#64748B', display: 'block', marginTop: '4px' }}>
                  e.g., 5% on ₹500 order = 25 coins
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Coin Rupee Value (₹)
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="10"
                    value={coinsConfig.coinRupeeValue}
                    onChange={(e) => setCoinsConfig(prev => ({ ...prev, coinRupeeValue: parseFloat(e.target.value) || 0 }))}
                    style={{
                      width: '100%',
                      padding: '10px 36px 10px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '14px',
                      fontWeight: 700,
                      color: '#0F172A',
                      boxSizing: 'border-box'
                    }}
                  />
                  <IndianRupee size={15} style={{ position: 'absolute', right: '12px', top: '12px', color: '#94A3B8' }} />
                </div>
                <span style={{ fontSize: '11px', color: '#64748B', display: 'block', marginTop: '4px' }}>
                  1 FreshCoin = ₹1.00 at checkout
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Max Order Redemption Cap (%)
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    step="1"
                    min="5"
                    max="100"
                    value={coinsConfig.maxRedemptionPercent}
                    onChange={(e) => setCoinsConfig(prev => ({ ...prev, maxRedemptionPercent: parseFloat(e.target.value) || 0 }))}
                    style={{
                      width: '100%',
                      padding: '10px 36px 10px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '14px',
                      fontWeight: 700,
                      color: '#0F172A',
                      boxSizing: 'border-box'
                    }}
                  />
                  <BadgePercent size={15} style={{ position: 'absolute', right: '12px', top: '12px', color: '#94A3B8' }} />
                </div>
                <span style={{ fontSize: '11px', color: '#64748B', display: 'block', marginTop: '4px' }}>
                  Prevents 100% free cart drains
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Minimum Order Value (₹)
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    step="10"
                    min="0"
                    max="1000"
                    value={coinsConfig.minOrderValue}
                    onChange={(e) => setCoinsConfig(prev => ({ ...prev, minOrderValue: parseFloat(e.target.value) || 0 }))}
                    style={{
                      width: '100%',
                      padding: '10px 36px 10px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '14px',
                      fontWeight: 700,
                      color: '#0F172A',
                      boxSizing: 'border-box'
                    }}
                  />
                  <IndianRupee size={15} style={{ position: 'absolute', right: '12px', top: '12px', color: '#94A3B8' }} />
                </div>
                <span style={{ fontSize: '11px', color: '#64748B', display: 'block', marginTop: '4px' }}>
                  Min spend to earn or redeem
                </span>
              </div>
            </div>
          </div>

          {/* Live Simulator Widget */}
          <div style={{
            background: 'linear-gradient(135deg, #173328 0%, #10261E 100%)',
            color: '#FFFFFF',
            borderRadius: '16px',
            padding: '22px',
            boxShadow: '0 4px 16px rgba(23, 51, 40, 0.15)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Sparkles size={16} color="#78B159" />
              <h4 style={{ fontSize: '14px', fontWeight: 800, margin: 0 }}>
                Live Resident Order Simulator
              </h4>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px', color: '#A7F3D0' }}>
                <span>Simulated Order Amount:</span>
                <strong style={{ color: '#FFFFFF', fontSize: '14px' }}>₹{simOrderAmount}</strong>
              </div>
              <input
                type="range"
                min="100"
                max="2000"
                step="50"
                value={simOrderAmount}
                onChange={(e) => setSimOrderAmount(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#78B159', cursor: 'pointer' }}
              />
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              background: 'rgba(255,255,255,0.06)',
              padding: '14px',
              borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.08)'
            }}>
              <div>
                <span style={{ fontSize: '11px', color: '#94A3B8', display: 'block' }}>FreshCoins Earned:</span>
                <span style={{ fontSize: '18px', fontWeight: 800, color: '#FDE68A' }}>
                  🪙 {earnedCoins} Coins
                </span>
                <span style={{ fontSize: '10px', color: '#CBD5E1', display: 'block' }}>
                  Worth ₹{earnedRupees.toFixed(2)}
                </span>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: '#94A3B8', display: 'block' }}>Max Redeemable Next Order:</span>
                <span style={{ fontSize: '18px', fontWeight: 800, color: '#86EFAC' }}>
                  ₹{maxRedeemAmount}
                </span>
                <span style={{ fontSize: '10px', color: '#CBD5E1', display: 'block' }}>
                  ({coinsConfig.maxRedemptionPercent}% cart limit)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Automated Lifecycle & Rules Guide */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* How It Works Card */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            border: '1.5px solid #E2E8F0',
            padding: '24px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Gift size={18} color="#D97706" />
              <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#173328', margin: 0 }}>
                Automated Customer Journey
              </h4>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: '#FEF3C7',
                  color: '#92400E',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '12px',
                  flexShrink: 0
                }}>
                  1
                </div>
                <div>
                  <h5 style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B', margin: '0 0 2px' }}>
                    Transparent Cart Incentive
                  </h5>
                  <p style={{ fontSize: '12px', color: '#64748B', margin: 0, lineHeight: 1.5 }}>
                    At checkout, residents instantly see: <em>"You will earn <strong>XX FreshCoins</strong> on this morning delivery"</em>.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: '#DCFCE7',
                  color: '#15803D',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '12px',
                  flexShrink: 0
                }}>
                  2
                </div>
                <div>
                  <h5 style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B', margin: '0 0 2px' }}>
                    Automated 7:00 AM Drop Credit
                  </h5>
                  <p style={{ fontSize: '12px', color: '#64748B', margin: 0, lineHeight: 1.5 }}>
                    Once our delivery rider marks the flat order delivered, coins are automatically credited to the resident's wallet with zero manual approvals.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: '#E0F2FE',
                  color: '#0369A1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '12px',
                  flexShrink: 0
                }}>
                  3
                </div>
                <div>
                  <h5 style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B', margin: '0 0 2px' }}>
                    1-Click Checkout Redemption
                  </h5>
                  <p style={{ fontSize: '12px', color: '#64748B', margin: 0, lineHeight: 1.5 }}>
                    On their next order, residents toggle "Redeem FreshCoins" at checkout to instantly deduct value up to the configured cap.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Community Retention Card */}
          <div style={{
            background: '#F0FDF4',
            borderRadius: '16px',
            border: '1.5px solid #BBF7D0',
            padding: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <TrendingUp size={16} color="#15803D" />
              <h5 style={{ fontSize: '13.5px', fontWeight: 800, color: '#166534', margin: 0 }}>
                Why FreshCoins Outperforms Coupons
              </h5>
            </div>
            <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#14532D', lineHeight: 1.6 }}>
              <li>No coupon hunting or code typing on morning grocery rush.</li>
              <li>Residents treat balance like real money saved in their society wallet.</li>
              <li>Boosts next-day apartment retention and recurring morning baskets.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}