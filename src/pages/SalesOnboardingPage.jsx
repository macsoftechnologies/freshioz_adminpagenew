import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  Building2, 
  MapPin, 
  Warehouse, 
  CreditCard, 
  Users, 
  CheckCircle2, 
  Send,
  Layers,
  Sparkles,
  HelpCircle,
  X,
  Navigation,
  Camera,
  Loader2,
  ImageIcon
} from 'lucide-react';
import { useAdminRole } from '../context/AdminRoleContext';
import { useToast } from '../context/ToastContext';
import { saveFreshiozStore, generateId, generateUUID } from '../shared/freshiozStore';

export default function SalesOnboardingPage() {
  const { store, currentUser } = useAdminRole();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const leadId = searchParams.get('leadId');

  const leadReq = leadId ? (store.societyRequests || []).find(r => r.id === leadId) : null;

  const availableWarehouses = store.warehouses || [];

  const [formData, setFormData] = useState({
    name: '',
    type: 'APARTMENT', // 'APARTMENT' | 'HOSTEL'
    address: '',
    imageUrl: '', // Optional building/gate photo
    lat: 12.9716,
    lng: 77.5946,
    warehouseId: availableWarehouses[0]?.id || '',
    warehouseName: availableWarehouses[0]?.name || '',
    secretaryName: '',
    secretaryPhone: '',
    totalFloors: 10,
    totalUnits: 100,
    totalLiving: 400,
    bankName: '',
    accountHolder: '',
    accountNumber: '',
    ifscCode: '',
    branch: ''
  });

  const [isDetectingLocation, setIsDetectingLocation] = useState(false);

  // Auto-Detect Current GPS Position & Reverse-Geocode Address
  const handleAutoDetectLocation = () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser.', 'error');
      return;
    }

    setIsDetectingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const latVal = Number(latitude.toFixed(6));
        const lngVal = Number(longitude.toFixed(6));

        let resolvedAddress = `Auto-Detected Gate GPS: ${latVal}, ${lngVal}`;

        try {
          // Reverse-geocoding via OpenStreetMap Nominatim
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
            { headers: { 'Accept': 'application/json', 'User-Agent': 'FreshiozApp/1.0 (admin@freshioz.local)' } }
          );
          if (res.ok) {
            const data = await res.json();
            if (data && data.display_name) {
              resolvedAddress = data.display_name;
            }
          }
        } catch (fetchErr) {
          console.warn('Reverse geocoding fallback to coords:', fetchErr);
        }

        setFormData(prev => ({
          ...prev,
          lat: latVal,
          lng: lngVal,
          address: resolvedAddress
        }));

        setIsDetectingLocation(false);
        showToast('✓ GPS Location & Street Address detected!', 'success');
      },
      (err) => {
        setIsDetectingLocation(false);
        console.warn('Geolocation error:', err);
        showToast('Location permission denied or unavailable. Please type address manually.', 'error');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Image Upload Handler (converts to base64)
  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      showToast('Image size exceeds 3MB limit. Please upload a smaller image.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      setFormData(prev => ({
        ...prev,
        imageUrl: uploadEvent.target.result
      }));
      showToast('✓ Gate / Entrance photo attached', 'success');
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (!formData.warehouseId && availableWarehouses.length > 0) {
      setFormData(prev => ({
        ...prev,
        warehouseId: availableWarehouses[0].id,
        warehouseName: availableWarehouses[0].name
      }));
    }
  }, [availableWarehouses, formData.warehouseId]);

  useEffect(() => {
    if (leadReq) {
      setFormData(prev => ({
        ...prev,
        name: leadReq.societyName || prev.name,
        address: leadReq.address || prev.address,
        lat: leadReq.lat || prev.lat,
        lng: leadReq.lng || prev.lng,
        totalUnits: leadReq.estimatedFlats || prev.totalUnits,
        secretaryName: leadReq.requesterName || prev.secretaryName,
        secretaryPhone: leadReq.requesterPhone || prev.secretaryPhone,
        accountHolder: `${leadReq.societyName} Resident Association`
      }));
    }
  }, [leadId, leadReq]);

  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const handlePreSubmit = (e) => {
    e.preventDefault();
    if (!availableWarehouses || availableWarehouses.length === 0) {
      showToast('⚠️ No Regional Warehouses found. Please create at least one Regional Warehouse Hub in Warehouses & Hubs first.', 'error');
      return;
    }
    if (!formData.name || !formData.address || !formData.secretaryPhone || !formData.accountNumber) {
      showToast('Please fill in all required society and bank fields.', 'error');
      return;
    }
    setIsConfirmModalOpen(true);
  };

  const handleConfirmCommit = () => {
    const newSocietyRecord = {
      id: generateId('FRZ_SOC'),
      uuid: generateUUID(),
      name: formData.name,
      type: formData.type,
      address: formData.address,
      imageUrl: formData.imageUrl || '',
      lat: Number(formData.lat) || 12.9260,
      lng: Number(formData.lng) || 77.6762,
      warehouseId: formData.warehouseId,
      warehouseName: formData.warehouseName,
      secretaryName: formData.secretaryName,
      secretaryPhone: formData.secretaryPhone,
      totalFloors: Number(formData.totalFloors),
      totalUnits: Number(formData.totalUnits),
      unitPlaceholder: formData.type === 'HOSTEL' ? 'e.g. Room 204' : 'e.g. Tower 3 - Flat 502',
      deliveryMode: 'SOCIETY_DESK',
      status: 'PENDING', // Awaiting Admin Approval!
      createdAt: new Date().toISOString(),
      createdById: currentUser?.id || 'emp-103',
      salesRepName: currentUser?.name || 'Field Sales Rep',
      salesRepPhone: currentUser?.phone || '9845011000',
      convertedLeadId: leadId || null,
      balanceEarned: 0,
      totalOrdersDelivered: 0,
      bankDetails: {
        bankName: formData.bankName,
        accountHolder: formData.accountHolder,
        accountNumber: formData.accountNumber,
        ifscCode: formData.ifscCode,
        branch: formData.branch
      }
    };

    saveFreshiozStore(prev => ({
      ...prev,
      societies: [newSocietyRecord, ...prev.societies],
      societyRequests: leadId ? (prev.societyRequests || []).map(r => r.id === leadId ? {
        ...r,
        status: 'CONVERTED',
        convertedSocietyId: newSocietyRecord.id,
        convertedAt: new Date().toISOString()
      } : r) : (prev.societyRequests || [])
    }));

    showToast('✓ Society onboarded! Awaiting Admin approval at /approvals.', 'success');
    setIsConfirmModalOpen(false);
    setSubmittedSuccess(true);
  };

  return (
    <div className="admin-page-container" style={{ maxWidth: '880px' }}>
      <div className="page-title-header" style={{ marginBottom: '14px' }}>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            Field Sales: Onboard Society / Hostel
          </h1>
          <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>
            Building demographics, GPS pin, store mapping & settlement bank setup
          </p>
        </div>
      </div>

      {submittedSuccess ? (
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          border: '1.5px solid #059669',
          padding: '36px 24px',
          textAlign: 'center',
          boxShadow: '0 4px 16px rgba(5, 150, 105, 0.1)'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: '#ECFDF5',
            color: '#059669',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <CheckCircle2 size={36} />
          </div>

          <h2 style={{ fontSize: '22px', color: '#065F46', marginBottom: '8px' }}>
            Society Onboarding Submitted Successfully!
          </h2>

          <p style={{ fontSize: '14px', color: '#475569', maxWidth: '540px', margin: '0 auto 20px', lineHeight: '1.6' }}>
            <strong>"{formData.name}"</strong> has been saved with status <span style={{ background: '#FEF3C7', color: '#B45309', fontWeight: 800, padding: '2px 8px', borderRadius: '4px' }}>PENDING ADMIN APPROVAL</span>.
            The Admin verification desk has been notified to review location, bank details, and assign the society commission.
          </p>

          <button
            type="button"
            onClick={() => setSubmittedSuccess(false)}
            className="admin-btn-primary"
            style={{ margin: '0 auto' }}
          >
            + Onboard Another Society / Hostel
          </button>
        </div>
      ) : (
        <form onSubmit={handlePreSubmit} className="admin-form-card">
          {leadReq && (
            <div style={{
              background: '#F0FDF4',
              border: '1.5px solid #86EFAC',
              borderRadius: '10px',
              padding: '12px 16px',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Sparkles size={18} color="#16A34A" />
                <div>
                  <strong style={{ fontSize: '13px', color: '#166534' }}>
                    Converting Inbound Field Request #{leadReq.id}
                  </strong>
                  <div style={{ fontSize: '11.5px', color: '#15803D' }}>
                    Requested by <strong>{leadReq.requesterName}</strong> (+91 {leadReq.requesterPhone}) • Auto-filled address & GPS pin
                  </div>
                </div>
              </div>
              <span style={{ fontSize: '11px', background: '#DCFCE7', color: '#166534', padding: '2px 8px', borderRadius: '4px', fontWeight: 800 }}>
                LEAD CONVERSION
              </span>
            </div>
          )}

          {/* Section 1: Basic Identity */}
          <div style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: '18px', marginBottom: '18px' }}>
            <h3 style={{ fontSize: '16px', color: '#234B3C', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Building2 size={18} />
              <span>1. Society & Community Identity</span>
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={{ fontSize: '12.5px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  Apartment or Hostel Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Prestige Lavender Towers / Stanza Living"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '13.5px' }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '12.5px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  Category *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '13.5px', fontWeight: 700 }}
                >
                  <option value="APARTMENT">Apartment / Gated Society</option>
                  <option value="HOSTEL">Hostel / PG Co-Living</option>
                </select>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', flexWrap: 'wrap', gap: '6px' }}>
                <label style={{ fontSize: '12.5px', fontWeight: 700, margin: 0 }}>
                  Full Street Address & Landmark *
                </label>
                <button
                  type="button"
                  onClick={handleAutoDetectLocation}
                  disabled={isDetectingLocation}
                  title="Detect GPS coordinates and resolve exact street address via device GPS"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    background: '#EBF2EE',
                    color: '#234B3C',
                    border: '1.5px solid #A2D4B7',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: isDetectingLocation ? 'wait' : 'pointer',
                    boxShadow: '0 1px 2px rgba(35, 75, 60, 0.05)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {isDetectingLocation ? (
                    <>
                      <Loader2 size={12} className="spin-animation" style={{ animation: 'spin 1s linear infinite' }} />
                      <span>Detecting Address...</span>
                    </>
                  ) : (
                    <>
                      <Navigation size={12} color="#16A34A" />
                      <span>📍 Auto-Detect GPS & Address</span>
                    </>
                  )}
                </button>
              </div>

              <input
                type="text"
                placeholder="Door / Plot, Street name, Area, City"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '13.5px' }}
                required
              />
              <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
                Tip: Click <strong>"📍 Auto-Detect GPS & Address"</strong> while at the society gate to automatically fetch latitude, longitude, and street name.
              </div>
            </div>

            {/* Optional Gate / Building Entrance Photo */}
            <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px dashed #E2E8F0' }}>
              <label style={{ fontSize: '12.5px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                Gate / Building Entrance Photo <span style={{ color: '#64748B', fontWeight: 500 }}>(Optional — helps early morning delivery riders locate the drop gate)</span>
              </label>

              {formData.imageUrl ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '6px' }}>
                  <div style={{
                    position: 'relative',
                    width: '180px',
                    height: '110px',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    border: '1.5px solid #CBD5E1',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                  }}>
                    <img 
                      src={formData.imageUrl} 
                      alt="Society Gate" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} 
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, imageUrl: '' })}
                      style={{
                        position: 'absolute',
                        top: '6px',
                        right: '6px',
                        background: 'rgba(15, 23, 42, 0.75)',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Remove Photo"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div style={{ fontSize: '12px', color: '#059669', fontWeight: 700 }}>
                    ✓ Gate photo attached for delivery dispatch manifest
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px' }}>
                  <label style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1.5px dashed #94A3B8',
                    background: '#F8FAFC',
                    color: '#334155',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}>
                    <Camera size={16} color="#234B3C" />
                    <span>Upload Gate / Building Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleImageFileChange}
                      style={{ display: 'none' }}
                    />
                  </label>
                  <span style={{ fontSize: '11.5px', color: '#64748B' }}>PNG, JPG or JPEG up to 3MB</span>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Regional Warehouse Hub Assignment & Geolocation */}
          <div style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: '18px', marginBottom: '18px' }}>
            <h3 style={{ fontSize: '16px', color: '#234B3C', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Warehouse size={18} />
              <span>2. Regional Warehouse Hub Assignment & Geolocation</span>
            </h3>

            {/* Warehouse Hub Selector */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12.5px', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                Assigned Regional Warehouse Hub (Direct Farm-to-Hub Sorting & Dispatch) *
              </label>

              {availableWarehouses.length === 0 ? (
                <div style={{ padding: '14px 16px', background: '#FEF3C7', border: '1.5px solid #FCD34D', borderRadius: '8px', color: '#92400E', fontSize: '13px' }}>
                  <strong>⚠️ No Regional Warehouses Created Yet</strong>
                  <p style={{ margin: '4px 0 8px 0', fontSize: '12px', lineHeight: 1.4 }}>
                    Societies must be mapped to a Regional Warehouse Hub. Please create your first warehouse hub first.
                  </p>
                  <Link to="/warehouse-settings" style={{ color: '#B45309', fontWeight: 800, textDecoration: 'underline' }}>
                    → Go to Warehouses & Hubs to create a warehouse
                  </Link>
                </div>
              ) : (
                <>
                  <select
                    value={formData.warehouseId}
                    onChange={(e) => {
                      const selected = availableWarehouses.find(w => w.id === e.target.value);
                      setFormData({
                        ...formData,
                        warehouseId: e.target.value,
                        warehouseName: selected ? `${selected.name} (${selected.code || 'HUB'})` : e.target.value
                      });
                    }}
                    style={{
                      width: '100%',
                      height: '46px',
                      padding: '0 14px',
                      borderRadius: '8px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '14px',
                      fontWeight: 700,
                      color: '#0F172A',
                      background: '#F8FAFC'
                    }}
                    required
                  >
                    {availableWarehouses.map(wh => (
                      <option key={wh.id} value={wh.id}>
                        🏭 {wh.name} ({wh.code || 'HUB'}) • {wh.location || 'Agro Logistics Hub'}
                      </option>
                    ))}
                  </select>
                  <div style={{ fontSize: '11.5px', color: '#166534', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 size={14} color="#16A34A" />
                    <span>
                      Direct Farm/Mandi to Warehouse Hub model: All resident orders will be packed, tagged, and lot-dispatched directly from this warehouse.
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* GPS Pin */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  GPS Latitude (For Delivery Partner Navigation)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  placeholder="e.g. 12.9260"
                  value={formData.lat}
                  onChange={(e) => setFormData({ ...formData, lat: e.target.value })}
                  style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '13px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  GPS Longitude
                </label>
                <input
                  type="number"
                  step="0.0001"
                  placeholder="e.g. 77.6762"
                  value={formData.lng}
                  onChange={(e) => setFormData({ ...formData, lng: e.target.value })}
                  style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '13px' }}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Contact & Scale */}
          <div style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: '18px', marginBottom: '18px' }}>
            <h3 style={{ fontSize: '16px', color: '#234B3C', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Users size={18} />
              <span>3. Management Contact & Building Scale</span>
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={{ fontSize: '12.5px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  Head / President / Warden Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Suresh Menon"
                  value={formData.secretaryName}
                  onChange={(e) => setFormData({ ...formData, secretaryName: e.target.value })}
                  style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '13.5px' }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '12.5px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  Contact Mobile Number *
                </label>
                <input
                  type="tel"
                  placeholder="10-digit mobile"
                  value={formData.secretaryPhone}
                  onChange={(e) => setFormData({ ...formData, secretaryPhone: e.target.value })}
                  style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '13.5px' }}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  Total Floors
                </label>
                <input
                  type="number"
                  placeholder="e.g. 14"
                  value={formData.totalFloors}
                  onChange={(e) => setFormData({ ...formData, totalFloors: e.target.value })}
                  style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  Number of Flats / Rooms
                </label>
                <input
                  type="number"
                  placeholder="e.g. 280"
                  value={formData.totalUnits}
                  onChange={(e) => setFormData({ ...formData, totalUnits: e.target.value })}
                  style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  Approx Residents / Living
                </label>
                <input
                  type="number"
                  placeholder="e.g. 850"
                  value={formData.totalLiving}
                  onChange={(e) => setFormData({ ...formData, totalLiving: e.target.value })}
                  style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '13px' }}
                />
              </div>
            </div>
          </div>

          {/* Section 4: Bank Details (As Requested by User) */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', color: '#234B3C', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <CreditCard size={18} />
              <span>4. Society Settlement Bank Details (For Commission Payouts)</span>
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={{ fontSize: '12.5px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  Bank Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. HDFC Bank / SBI / ICICI"
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '13.5px' }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '12.5px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  Account Holder Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Society Association Welfare Fund"
                  value={formData.accountHolder}
                  onChange={(e) => setFormData({ ...formData, accountHolder: e.target.value })}
                  style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '13.5px' }}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12.5px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  Bank Account Number *
                </label>
                <input
                  type="text"
                  placeholder="Account number"
                  value={formData.accountNumber}
                  onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                  style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '13.5px', fontFamily: 'monospace' }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '12.5px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  IFSC Code *
                </label>
                <input
                  type="text"
                  placeholder="e.g. HDFC0001742"
                  value={formData.ifscCode}
                  onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value.toUpperCase() })}
                  style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '13.5px', fontFamily: 'monospace' }}
                  required
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="admin-btn-primary"
            style={{ width: '100%', padding: '14px', fontSize: '15px', justifyContent: 'center' }}
          >
            <Send size={18} />
            <span>Submit Society for Admin Review & Commission Setup</span>
          </button>
        </form>
      )}

      {/* ================= CONFIRMATION POPUP MODAL (YES / NO) ================= */}
      {isConfirmModalOpen && (
        <div 
          className="admin-modal-overlay" 
          style={{ zIndex: 1100, background: 'rgba(15, 23, 42, 0.72)' }}
        >
          <div 
            className="admin-modal-card" 
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
                  Confirm Society Onboarding Submission?
                </h3>
                <p style={{ fontSize: '12.5px', color: '#64748B', marginTop: '4px', marginBottom: 0, lineHeight: 1.4 }}>
                  Please verify society demographics, regional warehouse hub assignment, and settlement bank details:
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
                <span style={{ color: '#64748B', fontWeight: 600 }}>Society / Building:</span>
                <span style={{ color: '#0F172A', fontWeight: 800 }}>
                  {formData.name} ({formData.type})
                </span>
              </div>

              {formData.imageUrl && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px dashed #CBD5E1' }}>
                  <img src={formData.imageUrl} alt="Gate" style={{ width: '48px', height: '36px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #CBD5E1' }} />
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748B', display: 'block', fontWeight: 600 }}>Gate / Entrance Photo:</span>
                    <span style={{ fontSize: '12px', color: '#059669', fontWeight: 700 }}>Attached for delivery riders</span>
                  </div>
                </div>
              )}

              <div style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px dashed #CBD5E1' }}>
                <div style={{ color: '#64748B', fontWeight: 600, marginBottom: '2px' }}>Physical Address:</div>
                <div style={{ color: '#1E293B', fontWeight: 700, lineHeight: 1.35 }}>
                  {formData.address}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px dashed #CBD5E1' }}>
                <div>
                  <span style={{ color: '#64748B', fontWeight: 600, display: 'block', fontSize: '11px' }}>Serving Warehouse Hub:</span>
                  <span style={{ color: '#059669', fontWeight: 800 }}>
                    🏭 {formData.warehouseName}
                  </span>
                </div>
                <div>
                  <span style={{ color: '#64748B', fontWeight: 600, display: 'block', fontSize: '11px' }}>Total Units:</span>
                  <span style={{ color: '#0F172A', fontWeight: 800 }}>
                    {formData.totalUnits} Flats ({formData.totalFloors} Flrs)
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px dashed #CBD5E1' }}>
                <div>
                  <span style={{ color: '#64748B', fontWeight: 600, display: 'block', fontSize: '11px' }}>Secretary / POC:</span>
                  <span style={{ color: '#334155', fontWeight: 700 }}>{formData.secretaryName}</span>
                </div>
                <div>
                  <span style={{ color: '#64748B', fontWeight: 600, display: 'block', fontSize: '11px' }}>Contact Phone:</span>
                  <span style={{ color: '#334155', fontWeight: 700 }}>+91 {formData.secretaryPhone}</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B', fontWeight: 600 }}>Commission Bank Account:</span>
                <span style={{ color: '#334155', fontWeight: 700, fontFamily: 'monospace' }}>
                  {formData.bankName} • {formData.accountNumber?.slice(-4) ? `...${formData.accountNumber.slice(-4)}` : 'N/A'}
                </span>
              </div>
            </div>

            {/* Action Buttons: No vs Yes */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
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
                onClick={handleConfirmCommit}
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
                <span>Yes, Confirm & Submit</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
