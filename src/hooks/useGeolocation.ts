import { useState, useEffect } from 'react';

interface GeolocationState {
  lat: number | null;
  lng: number | null;
  address: string | null;
  loading: boolean;
  error: string | null;
}

export const useGeolocation = () => {
  const [state, setState] = useState<GeolocationState>({
    lat: null,
    lng: null,
    address: 'Detecting Location...',
    loading: true,
    error: null,
  });

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'en',
            'User-Agent': "Fishing Panda Food Delivery Audit",
          },
        }
      );
      const data = await response.json();
      
      // Extract a nice short address
      const address = data.address;
      const parts = [];

      // 1. Building or House Number
      const house = address.house_number || address.building || '';
      
      // 2. Road or Suburb
      const road = address.road || address.pedestrian || address.suburb || address.neighbourhood || '';
      
      if (house && road) {
        parts.push(`${house} ${road}`);
      } else if (road) {
        parts.push(road);
      }

      // 3. Area/Neighborhood fallback
      const area = address.city_district || address.town || address.city || '';
      if (area && !road.includes(area)) {
        parts.push(area);
      }

      // 4. City/Country fallback if still empty
      if (parts.length === 0) {
        parts.push(address.city || address.state || 'Ghana');
      }

      const displayAddress = parts.join(', ');
      
      setState(prev => ({ 
        ...prev, 
        address: displayAddress.length > 30 ? displayAddress.substring(0, 27) + '...' : displayAddress, 
        loading: false 
      }));
    } catch (err) {
      console.error('Reverse geocoding failed:', err);
      setState(prev => ({ ...prev, address: 'Accra, Ghana', loading: false }));
    }
  };

  useEffect(() => {
    if (!navigator.geolocation) {
      setState(prev => ({ ...prev, error: 'Geolocation not supported', loading: false, address: 'Accra, Ghana' }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setState(prev => ({ ...prev, lat: latitude, lng: longitude, error: null }));
        reverseGeocode(latitude, longitude);
      },
      (error) => {
        console.warn('Geolocation Error:', error.message);
        setState(prev => ({ 
          ...prev, 
          error: error.message, 
          loading: false, 
          address: 'Accra, Ghana' // Default fallback
        }));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  return state;
};
