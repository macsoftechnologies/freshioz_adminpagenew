/**
 * Centralized Freshioz Location & Geolocation Service
 * Unified multi-tier geolocation across all Admin & Field Sales modules.
 * 
 * Hierarchy:
 * 1. Device Hardware GPS (High Accuracy, 5s timeout)
 * 2. Device Hardware GPS (Standard Accuracy, 6s timeout)
 * 3. Network IP Geolocation Fallback (Works on plain HTTP / local Wi-Fi without SSL)
 * 4. OpenStreetMap Nominatim Reverse-Geocoding
 */

export const DEFAULT_COORDS = {
  lat: 17.7231,
  lng: 83.3013,
  city: 'Visakhapatnam'
};

/**
 * Reverse-geocode latitude and longitude into clean human-readable address
 */
export async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { 
        headers: { 
          'Accept': 'application/json', 
          'Accept-Language': 'en',
          'User-Agent': 'FreshiozOperationsDesk/1.0 (ops@freshioz.com)' 
        } 
      }
    );
    if (res.ok) {
      const data = await res.json();
      if (data && data.address) {
        const a = data.address;
        const streetPart = [
          a.road,
          a.suburb || a.neighbourhood || a.residential,
          a.commercial || a.industrial
        ].filter(Boolean).join(', ');

        const cityPart = a.city || a.town || a.municipality || a.county || a.state_district || 'City';
        const statePart = a.state ? `${a.state}${a.postcode ? ' - ' + a.postcode : ''}` : '';

        const fullParts = [
          a.building || a.amenity,
          streetPart,
          cityPart,
          statePart
        ].filter(Boolean);

        if (fullParts.length > 0) {
          return fullParts.join(', ');
        }
      }
      if (data && data.display_name) {
        return data.display_name;
      }
    }
  } catch (err) {
    console.warn('[LocationService] Reverse-geocoding fallback:', err);
  }
  return `Location at ${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`;
}

/**
 * Forward-geocode address/mandi query into coordinates & clean location list
 */
export async function searchPlaces(query) {
  if (!query || query.trim().length < 2) return [];
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
      { 
        headers: { 
          'Accept': 'application/json', 
          'Accept-Language': 'en',
          'User-Agent': 'FreshiozOperationsDesk/1.0 (ops@freshioz.com)' 
        } 
      }
    );
    if (res.ok) {
      const list = await res.json();
      return (list || []).map(item => ({
        lat: Number(Number(item.lat).toFixed(6)),
        lng: Number(Number(item.lon).toFixed(6)),
        displayName: item.display_name,
        name: item.name || item.display_name.split(',')[0]
      }));
    }
  } catch (err) {
    console.warn('[LocationService] Search places error:', err);
  }
  return [];
}

/**
 * Unified Device & Network Geolocation Detector
 * Automatically handles:
 * - Browser GPS permission check
 * - High & standard precision GPS
 * - Network IP fallback for plain HTTP / Wi-Fi testing
 * - Reverse-geocoding of detected coordinates
 */
export async function detectCurrentLocation() {
  // Strategy 1: Hardware Browser GPS (works on HTTPS & localhost)
  if (typeof navigator !== 'undefined' && navigator.geolocation) {
    const getBrowserPos = (highAcc, timeoutMs) =>
      new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: highAcc,
          timeout: timeoutMs,
          maximumAge: 60000,
        });
      });

    try {
      const pos = await getBrowserPos(true, 5000).catch(() => getBrowserPos(false, 6000));
      const lat = Number(pos.coords.latitude.toFixed(6));
      const lng = Number(pos.coords.longitude.toFixed(6));
      const address = await reverseGeocode(lat, lng);
      return {
        success: true,
        lat,
        lng,
        address,
        source: 'HARDWARE_GPS',
        note: 'Device satellite GPS detected'
      };
    } catch (geoErr) {
      if (geoErr && geoErr.code === 1) { // User explicitly denied
        return {
          success: false,
          error: 'PERMISSION_DENIED',
          message: 'Location permission was denied in your browser. Please allow location in your browser settings or search address manually.'
        };
      }
      console.warn('[LocationService] Hardware GPS unavailable. Falling back to Network IP...', geoErr);
    }
  }

  // Strategy 2: Network IP-based Geolocation (works seamlessly over local HTTP / Wi-Fi)
  try {
    const ipRes = await fetch('https://ipapi.co/json/').catch(() => null);
    if (ipRes && ipRes.ok) {
      const ipData = await ipRes.json();
      if (ipData.latitude && ipData.longitude) {
        const lat = Number(Number(ipData.latitude).toFixed(6));
        const lng = Number(Number(ipData.longitude).toFixed(6));
        const cityArea = [ipData.city, ipData.region].filter(Boolean).join(', ');
        const address = await reverseGeocode(lat, lng);
        return {
          success: true,
          lat,
          lng,
          address: address || cityArea,
          source: 'NETWORK_IP',
          note: `Location detected via Network IP (${cityArea || 'Local'}). Precise GPS activates on HTTPS.`
        };
      }
    }
  } catch (ipErr) {
    console.warn('[LocationService] Network IP fallback failed:', ipErr);
  }

  // Strategy 3: Default Regional Hub
  return {
    success: true,
    lat: DEFAULT_COORDS.lat,
    lng: DEFAULT_COORDS.lng,
    address: `${DEFAULT_COORDS.city}, Andhra Pradesh`,
    source: 'DEFAULT_FALLBACK',
    note: 'Default regional coordinates applied.'
  };
}
