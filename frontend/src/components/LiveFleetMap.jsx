import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { WifiOff, Truck, Clock, Navigation } from 'lucide-react';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const TRUCK_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

// Lerp factor per animation frame (~60fps). 0.04 = silky smooth ~3s travel time.
// Lower = smoother/slower chase. Higher = snappier.
const LERP = 0.055;

// Minimum movement threshold to keep animating (avoids float jitter at rest)
const MIN_DELTA = 0.000001;

// ─── INTERPOLATED TRUCK MARKER ────────────────────────────────────────────────
// A self-contained component that owns its own rAF loop and smoothly
// chases its target position instead of jumping.
function InterpolatedTruckMarker({ truck, color }) {
  // displayPos is what we actually render
  const [displayPos, setDisplayPos] = useState({ lat: truck.lat, lng: truck.lng });
  // targetPos stored in a ref so the rAF loop always sees the latest without
  // triggering re-render on every GPS update
  const targetRef  = useRef({ lat: truck.lat, lng: truck.lng });
  const currentRef = useRef({ lat: truck.lat, lng: truck.lng });
  const animRef    = useRef(null);

  // Update targetRef whenever new GPS coords arrive
  useEffect(() => {
    targetRef.current = { lat: truck.lat, lng: truck.lng };
  }, [truck.lat, truck.lng]);

  // Start the animation loop once on mount
  useEffect(() => {
    const tick = () => {
      const target  = targetRef.current;
      const current = currentRef.current;

      const dLat = target.lat - current.lat;
      const dLng = target.lng - current.lng;

      if (Math.abs(dLat) > MIN_DELTA || Math.abs(dLng) > MIN_DELTA) {
        const next = {
          lat: current.lat + dLat * LERP,
          lng: current.lng + dLng * LERP,
        };
        currentRef.current = next;
        // Only call setState when we have a meaningful position change
        setDisplayPos({ ...next });
      }

      animRef.current = requestAnimationFrame(tick);
    };

    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, []); // runs once — the rAF loop runs forever and reads refs, not state

  const icon = createLiveTruckIcon(color);

  const formatTime = (iso) => {
    if (!iso) return 'Unknown';
    return new Date(iso).toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  };

  return (
    <Marker position={[displayPos.lat, displayPos.lng]} icon={icon}>
      <Popup>
        <div style={{ minWidth: '190px' }}>
          <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '6px', color: color }}>
            🚚 {truck.driverName}
          </div>
          <div style={{ fontSize: '12px', color: '#444', lineHeight: '1.7' }}>
            <div>Vehicle: <strong>{truck.vehicleNo}</strong></div>
            <div>Run: <strong>{truck.runNumber}</strong></div>
            <div>Last update: <strong>{formatTime(truck.timestamp)}</strong></div>
            <div style={{ marginTop: '6px', color: '#10b981', fontWeight: 600, fontSize: '11px' }}>
              📍 {truck.lat.toFixed(5)}, {truck.lng.toFixed(5)}
            </div>
            <div style={{ marginTop: '4px', color: '#94a3b8', fontSize: '10px' }}>
              Smooth GPS interpolation active
            </div>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}

// ─── AUTO-FIT BOUNDS ──────────────────────────────────────────────────────────
function FleetBoundsController({ positions }) {
  const map = useMap();
  const didFitRef = useRef(false);

  useEffect(() => {
    // Only auto-fit once when trucks first appear — don't fight the user after that
    if (positions.length === 0 || didFitRef.current) return;
    const bounds = L.latLngBounds(positions.map(p => [p.lat, p.lng]));
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [70, 70], maxZoom: 14 });
      didFitRef.current = true;
    }
  }, [positions, map]);

  return null;
}

// ─── PULSING TRUCK ICON ───────────────────────────────────────────────────────
function createLiveTruckIcon(color = '#3b82f6') {
  return L.divIcon({
    html: `
      <div style="position:relative;width:52px;height:52px;">
        <div style="
          position:absolute;top:50%;left:50%;
          transform:translate(-50%,-50%);
          width:52px;height:52px;border-radius:50%;
          background:${color}28;
          animation:gps-pulse 2s ease-in-out infinite;
        "></div>
        <div style="
          position:absolute;top:50%;left:50%;
          transform:translate(-50%,-50%);
          font-size:28px;line-height:1;
          filter:drop-shadow(0 3px 8px rgba(0,0,0,0.45));
          transition:transform 0.1s ease;
        ">&#128666;</div>
      </div>
    `,
    className: '',
    iconSize: [52, 52],
    iconAnchor: [26, 26],
    popupAnchor: [0, -26],
  });
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function LiveFleetMap({ socketRef }) {
  // Raw GPS data from socket (source of truth)
  const [liveFleet, setLiveFleet] = useState({});
  const colorMapRef = useRef({});

  const getColor = useCallback((runId) => {
    if (!colorMapRef.current[runId]) {
      const idx = Object.keys(colorMapRef.current).length % TRUCK_COLORS.length;
      colorMapRef.current[runId] = TRUCK_COLORS[idx];
    }
    return colorMapRef.current[runId];
  }, []);

  // Fetch initial positions on mount
  useEffect(() => {
    fetch('http://localhost:5000/api/gps/active')
      .then(r => r.json())
      .then(data => {
        const store = {};
        data.forEach(entry => { store[entry.runId] = entry; });
        setLiveFleet(store);
      })
      .catch(() => {});
  }, []);

  // Subscribe to real-time socket updates
  useEffect(() => {
    if (!socketRef?.current) return;

    const handleUpdate = (data) => {
      // Update only the raw GPS target — InterpolatedTruckMarker handles smoothing
      setLiveFleet(prev => ({ ...prev, [data.runId]: data }));
    };

    const handleStop = ({ runId }) => {
      setLiveFleet(prev => {
        const next = { ...prev };
        delete next[runId];
        return next;
      });
    };

    socketRef.current.on('location_update', handleUpdate);
    socketRef.current.on('location_stopped', handleStop);

    return () => {
      socketRef.current?.off('location_update', handleUpdate);
      socketRef.current?.off('location_stopped', handleStop);
    };
  }, [socketRef]);

  const fleet = Object.values(liveFleet);
  const defaultCenter = [17.2570, 78.4350];

  const formatTime = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  };

  return (
    <div className="fleet-map-wrapper">

      {/* ── Header ── */}
      <div className="fleet-map-header">
        <div className="fleet-map-title">
          <Navigation size={20} />
          <span>Live Fleet Map</span>
          <div className={`gps-live-badge ${fleet.length > 0 ? 'active' : 'idle'}`}>
            {fleet.length > 0
              ? <><span className="pulse-dot" />{fleet.length} Truck{fleet.length > 1 ? 's' : ''} Tracked</>
              : <><WifiOff size={12} /> No Active Trucks</>
            }
          </div>
          {fleet.length > 0 && (
            <div style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block', animation: 'dot-pulse 1.4s infinite' }} />
              Smooth interpolation active
            </div>
          )}
        </div>

        {/* Truck chips */}
        <div className="fleet-truck-chips">
          {fleet.length > 0 ? fleet.map(truck => (
            <div
              key={truck.runId}
              className="truck-chip"
              style={{ borderLeft: `3px solid ${getColor(truck.runId)}` }}
            >
              <Truck size={14} style={{ color: getColor(truck.runId) }} />
              <div>
                <div className="truck-chip-name">{truck.driverName}</div>
                <div className="truck-chip-meta">{truck.vehicleNo} &middot; {truck.runNumber}</div>
              </div>
              <div className="truck-chip-time">
                <Clock size={10} />
                {formatTime(truck.timestamp)}
              </div>
            </div>
          )) : (
            <div className="no-trucks-msg">
              Drivers appear here once they tap "Share Location" on their phone.
            </div>
          )}
        </div>
      </div>

      {/* ── Map ── */}
      <div className="fleet-map-container">
        <MapContainer
          center={defaultCenter}
          zoom={11}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
          />

          {/* Warehouse */}
          <Marker position={defaultCenter}>
            <Popup>
              <strong>🏭 GangaMaxx Central Warehouse</strong><br />
              Ranga Reddy / Shamshabad, Hyderabad
            </Popup>
          </Marker>

          {/* Each truck gets its own interpolation loop */}
          {fleet.map(truck => (
            <InterpolatedTruckMarker
              key={truck.runId}
              truck={truck}
              color={getColor(truck.runId)}
            />
          ))}

          <FleetBoundsController positions={fleet} />
        </MapContainer>

        {/* Empty state overlay */}
        {fleet.length === 0 && (
          <div className="fleet-map-empty-overlay">
            <div className="fleet-empty-content">
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🗺️</div>
              <h4>Awaiting GPS Signal</h4>
              <p>
                Live truck positions appear here as drivers begin routes and
                tap <strong>"Share Location"</strong> on their mobile browser.
                Positions update smoothly with interpolation.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
