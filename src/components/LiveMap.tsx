import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation } from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';

// Custom Driver Icon
const createDriverIcon = (heading: number = 0, status: string) => {
  const color = status === 'ONLINE' ? '#22c55e' : // green-500
                status === 'IN_TRANSIT' ? '#3b82f6' : // blue-500
                '#64748b'; // slate-500

  const iconHtml = renderToStaticMarkup(
    <div className="relative flex items-center justify-center w-10 h-10">
      <div 
        className="absolute w-full h-full rounded-full opacity-20 animate-ping"
        style={{ backgroundColor: color }}
      />
      <div 
        className="relative w-8 h-8 bg-white rounded-full shadow-lg border-2 flex items-center justify-center transform transition-transform duration-500"
        style={{ borderColor: color, transform: `rotate(${heading}deg)` }}
      >
        <Navigation 
          size={16} 
          fill={color} 
          color={color}
          style={{ transform: 'rotate(0deg)' }} 
        />
      </div>
    </div>
  );

  return L.divIcon({
    html: iconHtml,
    className: 'custom-driver-icon',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

interface DriverLocation {
  driver_id: number;
  lat: number;
  lng: number;
  status: string;
  speed?: number;
  heading?: number;
  accuracy?: number;
  updated_at?: number;
  last_seen?: number;
}

export default function LiveMap() {
  const [drivers, setDrivers] = useState<Record<number, DriverLocation>>({});
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.hostname === 'localhost' ? 'localhost:8000' : window.location.host;
    const wsUrl = `${protocol}//${wsHost}/api/v1/ws/admin?token=${token}`;
    
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('✅ Map Connected to WebSocket');
      setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'driver_location' || message.type === 'location_update') {
          const loc = message.data;
          setDrivers(prev => ({
            ...prev,
            [loc.driver_id]: {
              ...loc,
              last_seen: Date.now() // Track when we last received update
            }
          }));
        }
      } catch (e) {
        console.error('Map WS Error:', e);
      }
    };

    ws.onclose = () => setConnected(false);

    // Cleanup stale drivers every 30 seconds
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      const STALE_THRESHOLD = 90000; // 90 seconds
      
      setDrivers(prev => {
        const updated = { ...prev };
        let removed = 0;
        
        Object.keys(updated).forEach(driverId => {
          const driver = updated[Number(driverId)];
          if (driver.last_seen && (now - driver.last_seen) > STALE_THRESHOLD) {
            delete updated[Number(driverId)];
            removed++;
          }
        });
        
        if (removed > 0) {
          console.log(`🧹 Cleaned up ${removed} stale driver(s) from map`);
        }
        
        return updated;
      });
    }, 30000);

    return () => {
      ws.close();
      clearInterval(cleanupInterval);
    };
  }, []);

  // Default center (Connaught Place, Delhi)
  const center = { lat: 28.6304, lng: 77.2177 };

  return (
    <div className="bg-white p-1 rounded-2xl overflow-hidden h-[600px] relative z-0 shadow-sm border border-slate-200">
      <div className="absolute top-4 right-4 z-1000 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full text-xs font-bold shadow-lg border border-slate-200 flex items-center gap-2">
        {connected ? (
          <>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-slate-700">LIVE TRACKING</span>
          </>
        ) : (
          <>
            <span className="w-2 h-2 bg-red-500 rounded-full"></span>
            <span className="text-slate-500">OFFLINE</span>
          </>
        )}
      </div>

      <div className="absolute top-4 left-14 z-1000 bg-white/90 backdrop-blur px-4 py-2 rounded-xl shadow-lg border border-slate-200">
        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Active Fleet</h3>
        <div className="flex items-baseline gap-1">
          <p className="text-2xl font-bold text-slate-800">{Object.keys(drivers).length}</p>
          <span className="text-xs text-slate-500 font-medium">drivers</span>
        </div>
      </div>

      <MapContainer 
        center={[center.lat, center.lng]} 
        zoom={14} 
        style={{ height: '100%', width: '100%' }}
        className="rounded-xl outline-none"
      >
        {/* CartoDB Positron (Cleaner, more professional map style) */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        {Object.values(drivers).map((driver) => (
          <Marker 
            key={driver.driver_id} 
            position={[driver.lat, driver.lng]}
            icon={createDriverIcon(driver.heading, driver.status)}
          >
            <Popup className="custom-popup">
              <div className="p-1 min-w-[180px]">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-xs font-bold text-slate-600">
                      #{driver.driver_id}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-800 leading-none">Driver</h3>
                      <span className="text-[10px] text-slate-500">ID: {driver.driver_id}</span>
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${
                    driver.status === 'ONLINE' ? 'bg-green-100 text-green-700' :
                    driver.status === 'IN_TRANSIT' ? 'bg-blue-100 text-blue-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {driver.status}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-50 p-2 rounded-lg">
                    <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Speed</span>
                    <span className="font-mono font-bold text-slate-700">{driver.speed?.toFixed(1)} <span className="text-[10px] font-normal">km/h</span></span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg">
                    <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Heading</span>
                    <span className="font-mono font-bold text-slate-700">{driver.heading}°</span>
                  </div>
                </div>
                
                <div className="mt-2 text-[10px] text-slate-400 text-center">
                  Updated: {new Date().toLocaleTimeString()}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
