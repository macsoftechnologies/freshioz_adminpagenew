import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, KeyRound, CheckCircle2, ShieldAlert } from 'lucide-react';
import FreshiozLogo from '../components/common/FreshiozLogo';
import { useAdminRole } from '../context/AdminRoleContext';
import { useToast } from '../context/ToastContext';

export default function AdminForgotPasswordPage() {
  const navigate = useNavigate();
  const { forgotPassword } = useAdminRole();
  const { showToast } = useToast();

  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [resetTokenInfo, setResetTokenInfo] = useState(null);
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isResetComplete, setIsResetComplete] = useState(false);

  const handleRequestReset = (e) => {
    e.preventDefault();
    if (!emailOrPhone.trim()) {
      showToast('Please enter your registered work email or phone number', 'error');
      return;
    }

    const res = forgotPassword(emailOrPhone.trim());
    setResetTokenInfo(res);
    setIsSubmitted(true);
    showToast(`Password reset code dispatched to ${emailOrPhone.trim()}`, 'info');
  };

  const handleConfirmReset = (e) => {
    e.preventDefault();
    if (!otpCode.trim() || !newPassword.trim()) {
      showToast('Please enter both the OTP code and your new password', 'error');
      return;
    }

    setIsResetComplete(true);
    showToast('Password updated successfully! You can now log in with your new credentials.', 'success');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0D231A 0%, #173328 60%, #10261E 100%)',
      padding: '20px',
      position: 'relative',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Background Decorative Glow */}
      <div style={{
        position: 'absolute',
        top: '25%',
        right: '25%',
        width: '320px',
        height: '320px',
        background: 'rgba(242, 142, 20, 0.12)',
        borderRadius: '50%',
        filter: 'blur(90px)',
        pointerEvents: 'none'
      }} />

      {/* Main Card */}
      <div style={{
        maxWidth: '440px',
        width: '100%',
        background: '#FFFFFF',
        borderRadius: '20px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
        padding: '36px 32px',
        position: 'relative',
        zIndex: 10
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
            <FreshiozLogo height={38} showTagline={false} />
          </div>
          <h1 style={{ fontSize: '19px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            Reset Operations Password
          </h1>
          <p style={{ fontSize: '12.5px', color: '#64748B', marginTop: '4px' }}>
            Recover account access for Freshioz supply chain portal
          </p>
        </div>

        {isResetComplete ? (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: '#ECFDF5',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <CheckCircle2 size={32} />
            </div>

            <h3 style={{ fontSize: '17px', color: '#0F172A', margin: '0 0 6px' }}>
              Password Reset Complete!
            </h3>
            <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '22px' }}>
              Your operations password has been updated. You can now sign in to your assigned desk.
            </p>

            <Link
              to="/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: '100%',
                height: '44px',
                borderRadius: '10px',
                background: '#234B3C',
                color: '#FFF',
                fontWeight: 800,
                fontSize: '13.5px',
                textDecoration: 'none'
              }}
            >
              <span>Back to Login</span>
            </Link>
          </div>
        ) : !isSubmitted ? (
          <form onSubmit={handleRequestReset}>
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Registered Work Email or Phone
              </label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }}>
                  <Mail size={16} />
                </div>
                <input
                  type="text"
                  value={emailOrPhone}
                  onChange={(e) => setEmailOrPhone(e.target.value)}
                  placeholder="e.g. vikram.rao@freshioz.com"
                  style={{
                    width: '100%',
                    height: '42px',
                    paddingLeft: '38px',
                    paddingRight: '12px',
                    borderRadius: '10px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '13.5px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              style={{
                width: '100%',
                height: '44px',
                borderRadius: '10px',
                background: '#234B3C',
                color: '#FFFFFF',
                fontSize: '13.5px',
                fontWeight: 800,
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <KeyRound size={16} />
              <span>Send Reset Instructions & OTP</span>
            </button>

            <div style={{ marginTop: '18px', textAlign: 'center' }}>
              <Link
                to="/login"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12.5px',
                  color: '#64748B',
                  fontWeight: 700,
                  textDecoration: 'none'
                }}
              >
                <ArrowLeft size={14} />
                <span>Return to Login</span>
              </Link>
            </div>
          </form>
        ) : (
          <form onSubmit={handleConfirmReset}>
            {/* Simulated OTP notice */}
            <div style={{
              background: '#EBF2EE',
              border: '1px solid #A7F3D0',
              borderRadius: '10px',
              padding: '12px',
              fontSize: '12px',
              color: '#234B3C',
              marginBottom: '16px'
            }}>
              <div>Simulated verification code for <strong>{emailOrPhone}</strong>:</div>
              <div style={{ fontSize: '16px', fontWeight: 900, letterSpacing: '3px', marginTop: '4px', fontFamily: 'monospace' }}>
                749210
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                6-Digit Verification Code *
              </label>
              <input
                type="text"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="Enter 749210"
                style={{
                  width: '100%',
                  height: '42px',
                  padding: '0 12px',
                  borderRadius: '10px',
                  border: '1.5px solid #CBD5E1',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                required
              />
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Set New Password *
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New strong password"
                style={{
                  width: '100%',
                  height: '42px',
                  padding: '0 12px',
                  borderRadius: '10px',
                  border: '1.5px solid #CBD5E1',
                  fontSize: '13.5px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                required
              />
            </div>

            <button
              type="submit"
              style={{
                width: '100%',
                height: '44px',
                borderRadius: '10px',
                background: '#059669',
                color: '#FFFFFF',
                fontSize: '13.5px',
                fontWeight: 800,
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <span>Update Password & Proceed</span>
            </button>

            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => setIsSubmitted(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748B',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Change Email / Resend Code
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
