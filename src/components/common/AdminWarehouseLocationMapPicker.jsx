import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapPin, Navigation, Compass, CheckCircle2, Loader2, Sparkles } from 'lucide-react';

// Fix Leaflet standard icons in Vite bundler
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom Emerald Warehouse Pin Icon
const warehousePinIcon = L.divIcon({
  className: 'custom-warehouse-map-pin',
  html: `
    <div style="
      background: #234B3C;
      color: #FFFFFF;
      width: 36px;
      height: 36px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2.5px solid #FFFFFF;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.4);
    ">
      <div style="transform: rotate(45deg); font-size: 15px; font-weight: 800;">🏭</div>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36]
});



export default function AdminWarehouseLocationMapPicker({
  lat = 13.0358,
  lng = 77.5970,
  address = '',
  onChange
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  const [currentCoords, setCurrentCoords] = useState({ lat, lng });
  const [currentAddress, setCurrentAddress] = useState(address);
  const [isLocating, setIsLocating] = useState(false);
  const [locateError, setLocateError] = useState('');

  // Synchronize when external props change
  useEffect(() => {
    if (lat && lng && (lat !== currentCoords.lat || lng !== currentCoords.lng)) {
      setCurrentCoords({ lat, lng });
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView([lat, lng], 13);
      }
    }
    if (address !== currentAddress) {
      setCurrentAddress(address);
    }
  }, [lat, lng, address]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return; // prevent duplicate init

    const initialLat = lat || 13.0358;
    const initialLng = lng || 77.5970;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 13,
      zoomControl: true,
      scrollWheelZoom: false
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    // Add draggable warehouse marker
    const marker = L.marker([initialLat, initialLng], {
      icon: warehousePinIcon,
      draggable: true
    }).addTo(map);

    marker.bindPopup(`<strong>Regional Warehouse Pin</strong><br/>Drag or click anywhere to adjust location.`);

    // Marker drag event
    marker.on('dragend', (e) => {
      const pos = e.target.getLatLng();
      const newLat = Number(pos.lat.toFixed(6));
      const newLng = Number(pos.lng.toFixed(6));
      setCurrentCoords({ lat: newLat, lng: newLng });
      triggerChange(newLat, newLng, currentAddress || `Warehouse Hub (GPS: ${newLat}, ${newLng})`);
    });

    // Map click event to relocate pin
    map.on('click', (e) => {
      const newLat = Number(e.latlng.lat.toFixed(6));
      const newLng = Number(e.latlng.lng.toFixed(6));
      marker.setLatLng([newLat, newLng]);
      setCurrentCoords({ lat: newLat, lng: newLng });
      triggerChange(newLat, newLng, currentAddress || `Warehouse Hub (GPS: ${newLat}, ${newLng})`);
    });

    mapInstanceRef.current = map;
    markerRef.current = marker;

    // Fix map rendering inside modal by invalidating size
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  const triggerChange = (newLat, newLng, newAddress) => {
    if (onChange) {
      onChange({
        lat: newLat,
        lng: newLng,
        address: newAddress
      });
    }
  };

  // Auto-Detect Current GPS Position via Browser Geolocation API
  const handleAutoDetectLocation = () => {
    if (!navigator.geolocation) {
      setLocateError('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setLocateError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const detectedLat = Number(position.coords.latitude.toFixed(6));
        const detectedLng = Number(position.coords.longitude.toFixed(6));
        
        setCurrentCoords({ lat: detectedLat, lng: detectedLng });
        
        // Auto-formulate a verified address string if blank or default
        const newAddr = currentAddress.trim() 
          ? currentAddress 
          : `Auto-Detected Physical Hub (GPS: ${detectedLat}, ${detectedLng}) • Bengaluru Region`;
        
        setCurrentAddress(newAddr);

        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([detectedLat, detectedLng], 15, { duration: 1.2 });
        }
        if (markerRef.current) {
          markerRef.current.setLatLng([detectedLat, detectedLng]);
          markerRef.current.openPopup();
        }

        triggerChange(detectedLat, detectedLng, newAddr);
        setIsLocating(false);
      },
      (error) => {
        setIsLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          setLocateError('Location permission denied. Please allow location access in your browser or type address manually.');
        } else {
          setLocateError('Unable to detect GPS position. You can click on the map or type address manually.');
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };



  // Manual address input change
  const handleAddressInputChange = (e) => {
    const val = e.target.value;
    setCurrentAddress(val);
    triggerChange(currentCoords.lat, currentCoords.lng, val);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* Top Row: Manual Address Input with GPS Badge */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <label className="form-label-title" style={{ margin: 0 }}>
            Physical Receiving Address & Mandi Yard Location *
          </label>
          <div style={{
            fontSize: '11px',
            color: '#059669',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            background: '#ECFDF5',
            padding: '2px 8px',
            borderRadius: '9999px',
            border: '1px solid #A7F3D0'
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#059669', display: 'inline-block' }} />
            GPS: {currentCoords.lat.toFixed(4)}° N, {currentCoords.lng.toFixed(4)}° E
          </div>
        </div>

        <input
          type="text"
          className="form-input-control"
          placeholder="e.g. Plot 42, Hebbal Agro Estate, Outer Ring Road, Bengaluru"
          value={currentAddress}
          onChange={handleAddressInputChange}
          required
        />
      </div>

      {/* Action Row: Auto-Detect GPS Button + Interactive Map Note */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <button
          type="button"
          onClick={handleAutoDetectLocation}
          disabled={isLocating}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            borderRadius: '6px',
            background: isLocating ? '#F1F5F9' : '#F0FDF4',
            color: isLocating ? '#64748B' : '#166534',
            border: '1.5px solid #BBF7D0',
            fontWeight: 700,
            fontSize: '12px',
            cursor: isLocating ? 'wait' : 'pointer',
            transition: 'all 0.2s ease'
          }}
          title="Auto-detect warehouse GPS coordinates from your device position"
        >
          {isLocating ? (
            <>
              <Loader2 size={13} className="animate-spin" />
              <span>Detecting GPS Pin...</span>
            </>
          ) : (
            <>
              <Navigation size={13} />
              <span>Auto-Detect Current GPS Location</span>
            </>
          )}
        </button>

        <span style={{ fontSize: '11px', color: '#64748B' }}>
          💡 Click anywhere on map or drag pin to relocate
        </span>
      </div>

      {locateError && (
        <div style={{
          fontSize: '11.5px',
          color: '#B91C1C',
          background: '#FEF2F2',
          border: '1px solid #FECACA',
          padding: '6px 10px',
          borderRadius: '6px'
        }}>
          {locateError}
        </div>
      )}

      {/* Leaflet Interactive Map Canvas */}
      <div
        ref={mapContainerRef}
        style={{
          width: '100%',
          height: '190px',
          borderRadius: '8px',
          border: '1.5px solid #CBD5E1',
          zIndex: 1,
          position: 'relative',
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)'
        }}
      />


    </div>
  );
}
