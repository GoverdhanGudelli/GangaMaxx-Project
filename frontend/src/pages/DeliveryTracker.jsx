import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { api } from '../services/api';
import Table from '../components/Table';
import LiveFleetMap from '../components/LiveFleetMap';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { 
  Truck, 
  MapPin, 
  User, 
  Calendar, 
  Plus, 
  Camera, 
  XOctagon, 
  CheckCircle2, 
  TrendingUp, 
  AlertTriangle,
  Play,
  Check,
  Zap,
  Trash2,
  Navigation,
  Radio,
  Map
} from 'lucide-react';

// Fix leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const truckIcon = L.divIcon({
  html: '<div style="font-size: 28px; filter: drop-shadow(0px 3px 3px rgba(0,0,0,0.4)); transform: translate(-50%, -50%);">🚚</div>',
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

export default function DeliveryTracker({ user, showToast }) {
  const [runs, setRuns] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOptimizing, setIsOptimizing] = useState(false);

  // View mode: 'routes' or 'fleet-map'
  const [viewMode, setViewMode] = useState('routes');
  
  // Simulation states
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulatedLocation, setSimulatedLocation] = useState(null);
  
  // Real-time GPS Tracking
  const socketRef = useRef(null);
  // Raw GPS positions received from socket (source of truth)
  const [liveLocations, setLiveLocations] = useState({});
  // Smoothly interpolated display positions (driven by rAF loop)
  const [smoothedLocations, setSmoothedLocations] = useState({});
  const targetLocationsRef = useRef({});   // latest raw targets for rAF to read
  const smoothedLocationsRef = useRef({}); // current animated positions for rAF to write
  const watchIdRef = useRef(null);
  const [myLiveLocation, setMyLiveLocation] = useState(null);
  const [gpsActive, setGpsActive] = useState(false);
  
  // Selection/active details states
  const [selectedRun, setSelectedRun] = useState(null);
  const [showCreateRunModal, setShowCreateRunModal] = useState(false);

  // New run form state
  const [driverName, setDriverName] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  
  // Fleet States
  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [availableVehicles, setAvailableVehicles] = useState([]);

  // Acknowledgement/Proof states (individual stop actions)
  const [activeStopOrder, setActiveStopOrder] = useState(null);
  const [acknowledgementName, setAcknowledgementName] = useState('');
  const [podPhotoFile, setPodPhotoFile] = useState(null);
  const [podPhotoPreview, setPodPhotoPreview] = useState('');

  // Failed state
  const [failedStopOrder, setFailedStopOrder] = useState(null);
  const [failedReason, setFailedReason] = useState('Receiver Unavailable');

  const fetchData = async () => {
    try {
      const runsData = await api.getDeliveries();
      const allOrders = await api.getOrders();
      const customersData = await api.getCustomers();
      
      const vData = await api.getVehicles();
      setAvailableVehicles(vData.filter(v => v.status === 'Available'));
      
      const dData = await api.getAvailableDrivers();
      setAvailableDrivers(dData.available);
      
      const ordersWithCoords = allOrders.map(o => {
        const c = customersData.find(cust => cust.id === o.customerId);
        return { ...o, lat: c?.lat || 17.2570, lng: c?.lng || 78.4350 };
      });
      
      let filteredRuns = runsData.map(run => {
        return {
          ...run,
          stops: run.stops.map(stop => {
            const order = ordersWithCoords.find(o => o.id === stop.orderId);
            return {
              ...stop,
              lat: order?.lat || 17.2570,
              lng: order?.lng || 78.4350
            };
          })
        };
      });

      if (user?.role === 'Delivery Driver') {
        filteredRuns = filteredRuns.filter(r => r.driverName === user?.name);
      }

      setRuns(filteredRuns);
      setPendingOrders(ordersWithCoords.filter(o => o.status === 'Pending'));

      if (selectedRun) {
        const updatedRun = filteredRuns.find(r => r.id === selectedRun.id);
        setSelectedRun(updatedRun || null);
      } else if (filteredRuns.length > 0) {
        setSelectedRun(filteredRuns[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Poll live truck GPS — update raw target only (rAF loop handles smoothing)
    const fetchActiveGps = () => {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      fetch(`${baseUrl}/gps/active`)
        .then(r => r.json())
        .then(data => {
          data.forEach(entry => {
            // Keep raw liveLocations for downstream use (liveLocations count badge etc.)
            setLiveLocations(prev => ({ ...prev, [entry.runId]: [entry.lat, entry.lng] }));
            // Update the rAF target ref
            targetLocationsRef.current[entry.runId] = { lat: entry.lat, lng: entry.lng };
            // Seed smoothed ref on first appearance so it doesn't fly in from [0,0]
            if (!smoothedLocationsRef.current[entry.runId]) {
              smoothedLocationsRef.current[entry.runId] = { lat: entry.lat, lng: entry.lng };
            }
          });
        })
        .catch(() => {});
    };

    fetchActiveGps();
    const interval = setInterval(fetchActiveGps, 5000); // poll every 5s
    
    return () => {
      clearInterval(interval);
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [user]);

  // ── rAF interpolation loop for the per-run map live truck marker ──
  useEffect(() => {
    const LERP = 0.055;
    const MIN_DELTA = 0.000001;
    let animId;

    const tick = () => {
      const targets  = targetLocationsRef.current;
      const currents = smoothedLocationsRef.current;
      let changed = false;

      Object.keys(targets).forEach(runId => {
        const target  = targets[runId];
        const current = currents[runId] || target;
        const dLat = target.lat - current.lat;
        const dLng = target.lng - current.lng;

        if (Math.abs(dLat) > MIN_DELTA || Math.abs(dLng) > MIN_DELTA) {
          currents[runId] = {
            lat: current.lat + dLat * LERP,
            lng: current.lng + dLng * LERP,
          };
          changed = true;
        }
      });

      if (changed) {
        // Shallow-copy to trigger React re-render
        setSmoothedLocations({ ...currents });
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, []);

  // GPS sharing toggle for drivers
  const handleToggleGps = () => {
    if (!selectedRun) {
      showToast('No Run Selected', 'Select your active delivery run first.', 'error');
      return;
    }
    if (gpsActive) {
      // Stop sharing
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      fetch(`${baseUrl}/gps/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId: selectedRun.id })
      }).catch(() => {});

      setGpsActive(false);
      setMyLiveLocation(null);
      showToast('GPS Sharing Stopped', 'Your location is no longer being shared.', 'info');
    } else {
      // Start sharing
      if (!navigator.geolocation) {
        showToast('GPS Unavailable', 'Your device does not support GPS.', 'error');
        return;
      }
      navigator.geolocation.getCurrentPosition(
        () => {},
        (err) => {
          if (err.code === 1) {
            showToast('Permission Denied', 'Allow location access in your browser settings to share GPS.', 'error');
          }
        }
      );
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setMyLiveLocation([latitude, longitude]);
          if (selectedRun) {
            const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
            fetch(`${baseUrl}/gps/update`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                runId: selectedRun.id,
                runNumber: selectedRun.runNumber,
                driverName: user.name,
                vehicleNo: selectedRun.vehicleNo,
                lat: latitude,
                lng: longitude
              })
            }).catch(() => {});
          }
        },
        (error) => {
          console.error('GPS Error:', error);
          showToast('GPS Error', 'Could not get location. Check permissions.', 'error');
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
      );
      setGpsActive(true);
      showToast('GPS Active', 'Your live location is now being shared with dispatch.', 'success');
    }
  };

  const handleOrderSelectToggle = (id) => {
    if (selectedOrderIds.includes(id)) {
      setSelectedOrderIds(selectedOrderIds.filter(oId => oId !== id));
    } else {
      setSelectedOrderIds([...selectedOrderIds, id]);
    }
  };

  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.asin(Math.sqrt(a));
  };

  const handleOptimizeRoute = async () => {
    if (selectedOrderIds.length < 2) return;
    setIsOptimizing(true);
    await new Promise(res => setTimeout(res, 1500)); // Simulate AI calculation

    let unvisited = selectedOrderIds.map(id => pendingOrders.find(o => o.id === id));
    let currentPoint = { lat: 17.2570, lng: 78.4350 }; // Warehouse in Ranga Reddy (Shamshabad area)
    let sortedIds = [];

    while (unvisited.length > 0) {
      let nearest = null;
      let minDistance = Infinity;

      unvisited.forEach(order => {
        const d = getDistance(currentPoint.lat, currentPoint.lng, order.lat, order.lng);
        if (d < minDistance) {
          minDistance = d;
          nearest = order;
        }
      });

      sortedIds.push(nearest.id);
      currentPoint = { lat: nearest.lat, lng: nearest.lng };
      unvisited = unvisited.filter(o => o.id !== nearest.id);
    }

    setSelectedOrderIds(sortedIds);
    setIsOptimizing(false);
    showToast('Route Optimized', 'AI has sorted stops by shortest geographic distance.', 'success');
  };

  const handleCreateRun = async (e) => {
    e.preventDefault();
    if (!driverName || !vehicleNo || selectedOrderIds.length === 0) {
      showToast('Validation Error', 'Fill all fields and select at least 1 order.', 'error');
      return;
    }

    // Prepare stops details
    const stops = selectedOrderIds.map(orderId => {
      const order = pendingOrders.find(o => o.id === orderId);
      return {
        orderId,
        customerName: order?.customerName || 'Unknown Client',
        address: order?.address || 'Unknown Address',
        qty: order?.items ? order.items.reduce((sum, i) => sum + i.qty, 0) : 0
      };
    });

    try {
      await api.addDeliveryRun({
        driverName,
        vehicleNo,
        stops
      });

      showToast('Delivery Run Scheduled', `RUN scheduled under driver ${driverName}`, 'success');
      
      // Reset form
      setDriverName('');
      setVehicleNo('');
      setSelectedOrderIds([]);
      setShowCreateRunModal(false);
      
      fetchData();
    } catch (err) {
      showToast('Error', 'Failed to dispatch delivery run', 'error');
    }
  };

  const handleStartRun = async (runId) => {
    try {
      await api.updateRunStatus(runId, 'In Transit');
      
      // Also mark all stops in run as "In Transit"
      const runsCopy = [...runs];
      const runIndex = runsCopy.findIndex(r => r.id === runId);
      if (runIndex !== -1) {
        const run = runsCopy[runIndex];
        for (const stop of run.stops) {
          await api.updateStopStatus(runId, stop.orderId, { status: 'In Transit' });
        }
      }

      showToast('Route Initiated', 'Vehicle is currently in transit on route.', 'info');
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSimulateRun = async (runId) => {
    if (isSimulating) return;
    setIsSimulating(true);
    
    // Ensure run is in transit
    const run = runs.find(r => r.id === runId) || selectedRun;
    if (run.status === 'Pending') {
      await handleStartRun(runId);
    }
    
    let currentPoint = { lat: 17.2570, lng: 78.4350 }; // Warehouse
    setSimulatedLocation([currentPoint.lat, currentPoint.lng]);
    
    // waypoints: Warehouse -> stop 1 -> stop 2...
    // Filter out already delivered stops for the path
    const remainingStops = run.stops.filter(s => s.status !== 'Delivered' && s.status !== 'Failed');
    if (remainingStops.length === 0) {
      setIsSimulating(false);
      showToast('Simulation Complete', 'All stops are already completed.', 'info');
      return;
    }
    
    const waypoints = [currentPoint, ...remainingStops];
    let currentWaypointIndex = 0;
    
    const stepsPerSegment = 20; // 20 frames per leg
    const delayPerStep = 100; // 100ms per frame
    
    const simulateStep = async () => {
      if (currentWaypointIndex >= waypoints.length - 1) {
        setIsSimulating(false);
        setSimulatedLocation(null);
        showToast('Simulation Complete', 'Vehicle has returned to base or completed all stops.', 'success');
        return;
      }
      
      const startP = waypoints[currentWaypointIndex];
      const endP = waypoints[currentWaypointIndex + 1];
      
      for (let i = 1; i <= stepsPerSegment; i++) {
        const lat = startP.lat + ((endP.lat - startP.lat) * i / stepsPerSegment);
        const lng = startP.lng + ((endP.lng - startP.lng) * i / stepsPerSegment);
        setSimulatedLocation([lat, lng]);
        await new Promise(res => setTimeout(res, delayPerStep));
      }
      
      // Reached the next stop
      if (endP.orderId) {
        try {
          await api.updateStopStatus(runId, endP.orderId, {
            status: 'Delivered',
            deliveredQty: endP.qty,
            podPhoto: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400&auto=format&fit=crop&q=60',
            signedBy: 'Auto-Simulated Signatory'
          });
          showToast('Stop Completed', `Simulated delivery to ${endP.customerName}`, 'success');
          await fetchData(); // refresh to update timeline and map
        } catch (err) {}
      }
      
      currentWaypointIndex++;
      simulateStep();
    };
    
    simulateStep();
  };

  const handleDeleteRun = async (runId, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this delivery run? This will reset related orders to Pending and make the vehicle available again.')) return;
    try {
      await api.deleteDeliveryRun(runId);
      showToast('Run Deleted', 'Delivery schedule removed successfully', 'info');
      if (selectedRun?.id === runId) setSelectedRun(null);
      fetchData();
    } catch (err) {
      showToast('Error', 'Failed to delete run', 'error');
    }
  };

  const handlePhotoCapture = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPodPhotoFile(file);
    
    // Convert image to Base64 string so it can be saved in the database
    const reader = new FileReader();
    reader.onloadend = () => {
      setPodPhotoPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleStopDelivered = async (e) => {
    e.preventDefault();
    if (!acknowledgementName) return;

    // GEOFENCE CHECK (Currently Deactivated by Admin)
    /* 
    if (user?.role === 'Delivery Driver' && myLiveLocation) {
      const distanceKm = getDistance(myLiveLocation[0], myLiveLocation[1], activeStopOrder.lat, activeStopOrder.lng);
      const distanceMeters = distanceKm * 1000;
      
      if (distanceMeters > 50) {
        showToast(
          'Geofence Violation', 
          `You are ${Math.round(distanceMeters)}m away from the destination. You must be within 50m to mark as delivered.`, 
          'error'
        );
        return;
      }
    }
    */

    try {
      // Use the captured preview URL or fallback placeholder
      const photo = podPhotoPreview || 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400&auto=format&fit=crop&q=60';
      await api.updateStopStatus(selectedRun.id, activeStopOrder.orderId, {
        status: 'Delivered',
        deliveredQty: activeStopOrder.qty,
        podPhoto: photo,
        signedBy: acknowledgementName
      });

      showToast('Stop Completed', `Proof of delivery captured for ${activeStopOrder.customerName}`, 'success');
      setActiveStopOrder(null);
      setAcknowledgementName('');
      setPodPhotoFile(null);
      setPodPhotoPreview('');
      fetchData();
    } catch (err) {
      showToast('Error', 'Failed to update delivery stop status', 'error');
    }
  };

  const handleStopFailed = async (e) => {
    e.preventDefault();
    try {
      await api.updateStopStatus(selectedRun.id, failedStopOrder.orderId, {
        status: 'Failed',
        deliveredQty: 0,
        failedReason
      });

      showToast('Delivery Stop Failed Logs Recorded', `${failedStopOrder.customerName} set to Failed: ${failedReason}`, 'error');
      setFailedStopOrder(null);
      fetchData();
    } catch (err) {
      showToast('Error', 'Failed to save dispatch failure details', 'error');
    }
  };

  const getStopStatusBadge = (status) => {
    switch (status) {
      case 'Pending': return <span className="badge badge-warning">Staged</span>;
      case 'In Transit': return <span className="badge badge-info">In Transit</span>;
      case 'Delivered': return <span className="badge badge-success">Delivered</span>;
      case 'Failed': return <span className="badge badge-error">Failed</span>;
      default: return <span className="badge badge-secondary">{status}</span>;
    }
  };

  if (loading) return <div className="loading-spinner">Loading delivery board...</div>;

  return (
    <div className="delivery-page animate-fade">

      {/* Driver GPS Status Banner */}
      {user?.role === 'Delivery Driver' && (
        <div className={`gps-driver-banner ${gpsActive ? 'gps-banner-active' : 'gps-banner-idle'}`}>
          <div className="gps-banner-left">
            {gpsActive ? (
              <><span className="pulse-dot" /><Radio size={16} /><span>Live GPS Active — Dispatch can see your location</span></>
            ) : (
              <><Navigation size={16} /><span>GPS sharing is off — Dispatch cannot see your location</span></>
            )}
          </div>
          <button
            id="gps-toggle-btn"
            className={`btn btn-sm ${gpsActive ? 'btn-error-light' : 'btn-success'}`}
            onClick={handleToggleGps}
          >
            {gpsActive ? 'Stop Sharing' : 'Share Location'}
          </button>
        </div>
      )}

      {/* View Toggle Tabs (Admin/Warehouse) */}
      {user?.role !== 'Delivery Driver' && (
        <div className="delivery-view-tabs">
          <button
            id="tab-routes"
            className={`view-tab-btn ${viewMode === 'routes' ? 'active' : ''}`}
            onClick={() => setViewMode('routes')}
          >
            <Truck size={15} />
            <span>Route Registry</span>
          </button>
          <button
            id="tab-fleet-map"
            className={`view-tab-btn ${viewMode === 'fleet-map' ? 'active' : ''}`}
            onClick={() => setViewMode('fleet-map')}
          >
            <Map size={15} />
            <span>Live Fleet Map</span>
            {Object.keys(liveLocations).length > 0 && (
              <span className="tab-live-count">{Object.keys(liveLocations).length}</span>
            )}
          </button>
        </div>
      )}

      {/* Live Fleet Map View */}
      {viewMode === 'fleet-map' && user?.role !== 'Delivery Driver' && (
        <LiveFleetMap socketRef={socketRef} />
      )}

      {/* Routes View (default) */}
      {viewMode === 'routes' && (
      <>
      {/* Upper overview split */}
      <div className="delivery-split">
        {/* Left Side: Delivery Runs List */}
        <div className="runs-column card-solid">
          <div className="column-header">
            <h4>Route &amp; Dispatch Registry</h4>
            {user?.role === 'Warehouse Staff' && (
              <button className="btn btn-primary btn-sm" onClick={() => setShowCreateRunModal(true)}>
                <Plus size={14} />
                <span>Schedule Vehicle</span>
              </button>
            )}
          </div>

          <div className="runs-list-wrapper">
            {runs.length > 0 ? (
              runs.map(run => (
                <div 
                  key={run.id} 
                  className={`run-list-item ${selectedRun?.id === run.id ? 'active' : ''}`}
                  onClick={() => setSelectedRun(run)}
                >
                  <div className="run-item-top">
                    <span className="run-number">{run.runNumber}</span>
                    <span className={`run-status-pill run-${run.status.toLowerCase().replace(' ', '-')}`}>
                      {run.status}
                    </span>
                  </div>
                  <div className="run-item-bottom" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <span>
                        <User size={12} /> {run.driverName} ({run.vehicleNo})
                      </span>
                      <span>
                        <MapPin size={12} /> {run.stops.length} stops
                      </span>
                    </div>
                    {user?.role === 'Sales Admin' && (
                      <button 
                        onClick={(e) => handleDeleteRun(run.id, e)} 
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }}
                        title="Delete Run"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-runs">No delivery routes scheduled.</div>
            )}
          </div>
        </div>

        {/* Right Side: Active Route Details & Operations timeline */}
        <div className="active-run-column">
          {selectedRun ? (
            <div className="active-run-card card-solid">
              <div className="active-run-header">
                <div>
                  <h3>{selectedRun.runNumber} Overview</h3>
                  <p className="driver-sub" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span>Driver: <strong>{selectedRun.driverName}</strong></span>
                    <span style={{ color: '#ccc' }}>•</span>
                    <span>Vehicle: <strong>{selectedRun.vehicleNo}</strong></span>
                    <span style={{ color: '#ccc' }}>•</span>
                    <span>Date: <strong>{selectedRun.date}</strong></span>
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {selectedRun.status === 'Pending' && (user?.role === 'Delivery Driver' || user?.role === 'Warehouse Staff' || user?.role === 'Sales Admin') && (
                    <button className="btn btn-primary" onClick={() => handleStartRun(selectedRun.id)} disabled={isSimulating}>
                      <Play size={14} />
                      <span>Initiate Delivery Run</span>
                    </button>
                  )}
                  {(selectedRun.status === 'Pending' || selectedRun.status === 'In Transit') && user?.role !== 'Delivery Driver' && (
                    <button 
                      className={`btn ${isSimulating ? 'btn-secondary' : 'btn-info'}`} 
                      onClick={() => handleSimulateRun(selectedRun.id)}
                      disabled={isSimulating || selectedRun.stops.every(s => s.status === 'Delivered' || s.status === 'Failed')}
                    >
                      <Truck size={14} />
                      <span>{isSimulating ? 'Simulating...' : 'Simulate Live Run'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Clean Route Header */}
              <div className="clean-route-header card">
                <div className="route-stats">
                  <div className="stat-box">
                    <span>Total Stops</span>
                    <strong>{selectedRun.stops.length}</strong>
                  </div>
                  <div className="stat-box">
                    <span>Expected Load</span>
                    <strong>{selectedRun.stops.reduce((sum, s) => sum + s.qty, 0)} cases</strong>
                  </div>
                  <div className="stat-box">
                    <span>Route Status</span>
                    <strong>{selectedRun.status}</strong>
                  </div>
                </div>
              </div>

              {/* Route Map */}
              <div className="route-map-container card" style={{ height: '300px', marginBottom: '20px', zIndex: 1, borderRadius: '12px', overflow: 'hidden' }}>
                <MapContainer center={[17.2570, 78.4350]} zoom={11} style={{ height: '100%', width: '100%' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker position={[17.2570, 78.4350]}>
                    <Popup>Central Warehouse (Ranga Reddy / Shamshabad)</Popup>
                  </Marker>
                  {selectedRun.stops.map(stop => (
                    <Marker key={stop.orderId} position={[stop.lat, stop.lng]}>
                      <Popup>
                        <strong>{stop.customerName}</strong><br/>
                        Status: {stop.status}
                      </Popup>
                    </Marker>
                  ))}
                  <Polyline 
                    positions={[[17.2570, 78.4350], ...selectedRun.stops.map(s => [s.lat, s.lng])]} 
                    color="#3b82f6" 
                    weight={4} 
                    dashArray={selectedRun.status === 'Pending' ? "5, 10" : ""}
                  />
                  {/* Render Simulated Truck */}
                  {isSimulating && simulatedLocation && (
                    <Marker position={simulatedLocation} icon={truckIcon}>
                      <Popup>Simulated: {selectedRun.vehicleNo}</Popup>
                    </Marker>
                  )}
                  {/* Render REAL Live Trucks — smooth interpolated position */}
                  {Object.entries(smoothedLocations).map(([rId, pos]) => {
                    if (rId === selectedRun.id) {
                      return (
                        <Marker key={rId} position={[pos.lat, pos.lng]} icon={truckIcon}>
                          <Popup>LIVE GPS: {selectedRun.driverName}</Popup>
                        </Marker>
                      );
                    }
                    return null;
                  })}
                  {/* Render My Location dot if Driver */}
                  {user?.role === 'Delivery Driver' && myLiveLocation && (
                    <Marker position={myLiveLocation} icon={L.divIcon({ html: '<div style="background:#ef4444;width:12px;height:12px;border-radius:50%;border:2px solid white;"></div>', className: '' })}>
                      <Popup>My Current Location</Popup>
                    </Marker>
                  )}
                </MapContainer>
              </div>

              {/* Stops Timeline/Table */}
              <div className="stops-timeline clean-spacing">
                <h4 className="timeline-title">Route Stops & Client Details</h4>
                <div className="timeline-container clean-timeline">
                  {selectedRun.stops.map((stop, index) => {
                    const isDone = stop.status === 'Delivered' || stop.status === 'Failed';
                    return (
                      <div key={stop.orderId} className={`timeline-node stop-${stop.status.toLowerCase().replace(' ', '-')}`}>
                        <div className="sequence-badge">
                          {stop.status === 'Delivered' ? <Check size={12} /> : stop.sequence}
                        </div>
                        <div className="node-content card">
                          <div className="node-header">
                            <div>
                              <h5>{stop.customerName}</h5>
                              <p className="node-address">{stop.address}</p>
                            </div>
                            {getStopStatusBadge(stop.status)}
                          </div>
                          
                          <div className="node-details">
                            <span className="node-qty">Quantity Allocated: <strong>{stop.qty} cases</strong></span>
                            {stop.status === 'Delivered' && (
                              <div className="pod-details-box">
                                <p>Received by: <strong>{stop.signedBy}</strong></p>
                                {stop.podPhoto && (
                                  <div className="pod-photo-thumbnail" style={{ marginTop: '10px' }}>
                                    <img 
                                      src={stop.podPhoto} 
                                      alt="Proof of Delivery" 
                                      style={{ 
                                        width: '100%', 
                                        maxWidth: '250px', 
                                        maxHeight: '150px', 
                                        objectFit: 'cover', 
                                        borderRadius: '8px',
                                        border: '1px solid #e2e8f0'
                                      }} 
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                            {stop.status === 'Failed' && (
                              <div className="failure-details-box">
                                <AlertTriangle size={14} />
                                <span>Failed Delivery Reason: <strong>{stop.failedReason}</strong></span>
                              </div>
                            )}
                          </div>

                          {/* Stop actions if run is active, stop isn't finalized, and user is the driver */}
                          {selectedRun.status === 'In Transit' && !isDone && user?.role === 'Delivery Driver' && (
                            <div className="node-actions">
                              <button 
                                className="btn btn-sm btn-success-light"
                                onClick={() => setActiveStopOrder(stop)}
                              >
                                <Camera size={14} />
                                <span>Confirm Delivery</span>
                              </button>
                              <button 
                                className="btn btn-sm btn-error-light"
                                onClick={() => setFailedStopOrder(stop)}
                              >
                                <XOctagon size={14} />
                                <span>Log Failure</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="select-run-placeholder card-solid">
              <Truck size={48} className="placeholder-icon" />
              <h4>Select a Scheduled Delivery Run</h4>
              <p>Choose an operational route from the left sidebar registry to manage dispatch states.</p>
            </div>
          )}
        </div>
      </div>
      </>
      )} {/* end viewMode === 'routes' */}

      {/* Dispatch Run Modal */}
      {showCreateRunModal && (
        <div className="modal-overlay">
          <div className="modal-content-card card dispatch-modal">
            <div className="modal-header">
              <h3>Create Delivery Run Route</h3>
              <button className="close-btn" onClick={() => setShowCreateRunModal(false)}>×</button>
            </div>

            <form onSubmit={handleCreateRun}>
              <div className="form-group">
                <label>Driver Staff Assignment (Available)</label>
                <input 
                  type="text" 
                  placeholder="e.g. Robert Vance" 
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  required 
                />
              </div>

              <div className="form-group">
                <label>Delivery Vehicle (Available)</label>
                <select 
                  value={vehicleNo}
                  onChange={(e) => setVehicleNo(e.target.value)}
                  required 
                >
                  <option value="" disabled>Select an available vehicle...</option>
                  {availableVehicles.map(v => (
                    <option key={v.id} value={v.plateNo}>{v.plateNo} - {v.model}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ margin: 0 }}>Select Staged Orders to Load</label>
                  <button 
                    type="button" 
                    className="btn btn-sm btn-primary"
                    onClick={handleOptimizeRoute}
                    disabled={selectedOrderIds.length < 2 || isOptimizing}
                  >
                    <Zap size={14} />
                    <span>{isOptimizing ? 'Calculating optimal vectors...' : '✨ Auto-Optimize Route'}</span>
                  </button>
                </div>
                <div className="staged-orders-list">
                  {pendingOrders.length > 0 ? (
                    pendingOrders.map(order => {
                      const isSelected = selectedOrderIds.includes(order.id);
                      return (
                        <div 
                          key={order.id} 
                          className={`order-item-selectable ${isSelected ? 'selected' : ''}`}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedOrderIds(prev => prev.filter(id => id !== order.id));
                            } else {
                              setSelectedOrderIds(prev => [...prev, order.id]);
                            }
                          }}
                          style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}
                        >
                          <div style={{ marginTop: '2px' }}>
                            <input type="checkbox" checked={isSelected} readOnly style={{ cursor: 'pointer' }} />
                          </div>
                          <div>
                            <strong>{order.customerName} (#{order.id})</strong><br/>
                            <span className="order-items-count">• {order.items.reduce((s,i)=>s+i.qty,0)} items</span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="no-staged">No pending bulk orders staged for loading.</div>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                  <button type="button" className="btn btn-outline" onClick={() => setShowCreateRunModal(false)}>Cancel</button>
                  <button 
                    type="submit" 
                    className="btn btn-success"
                    disabled={selectedOrderIds.length === 0}
                  >
                    <Truck size={16} />
                    <span>{selectedOrderIds.length === 0 ? 'Select Orders First' : 'Staged and Dispatch Vehicle'}</span>
                  </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delivery Modal */}
      {activeStopOrder && (
        <div className="modal-overlay">
          <div className="modal-content-card card confirm-modal">
            <div className="modal-header">
              <h3>Confirm Delivery Proof</h3>
              <button className="close-btn" onClick={() => setActiveStopOrder(null)}>×</button>
            </div>

            <form onSubmit={handleStopDelivered}>
              <div className="form-group">
                <label>Authorized Staff Name (Authorized Signatory)</label>
                <input 
                  type="text" 
                  placeholder="e.g. Dr. Anita Desai (Principal)" 
                  value={acknowledgementName}
                  onChange={(e) => setAcknowledgementName(e.target.value)}
                  required 
                />
              </div>

              <div className="form-group">
                <label>📸 Proof of Delivery Photo</label>
                
                {/* Camera/File Upload Input */}
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
                  <label
                    htmlFor="pod-camera"
                    style={{
                      flex: 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      gap: '8px', padding: '12px',
                      background: 'var(--color-primary)', color: 'white',
                      borderRadius: '8px', cursor: 'pointer',
                      fontSize: '0.9rem', fontWeight: '600'
                    }}
                  >
                    📷 Take Photo (Camera)
                  </label>
                  <input
                    id="pod-camera"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoCapture}
                    style={{ display: 'none' }}
                  />

                  <label
                    htmlFor="pod-gallery"
                    style={{
                      flex: 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      gap: '8px', padding: '12px',
                      background: '#475569', color: 'white',
                      borderRadius: '8px', cursor: 'pointer',
                      fontSize: '0.9rem', fontWeight: '600'
                    }}
                  >
                    🖼️ Upload from Gallery
                  </label>
                  <input
                    id="pod-gallery"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoCapture}
                    style={{ display: 'none' }}
                  />
                </div>

                {/* Live Preview */}
                {podPhotoPreview ? (
                  <div style={{ position: 'relative', marginTop: '8px' }}>
                    <img
                      src={podPhotoPreview}
                      alt="POD Preview"
                      style={{
                        width: '100%', maxHeight: '200px',
                        objectFit: 'cover', borderRadius: '10px',
                        border: '2px solid var(--color-primary)'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => { setPodPhotoPreview(''); setPodPhotoFile(null); }}
                      style={{
                        position: 'absolute', top: '8px', right: '8px',
                        background: '#ef4444', color: 'white',
                        border: 'none', borderRadius: '50%',
                        width: '28px', height: '28px', cursor: 'pointer',
                        fontSize: '14px', fontWeight: 'bold'
                      }}
                    >✕</button>
                    <div style={{ fontSize: '0.8rem', color: '#059669', marginTop: '6px' }}>✅ Photo captured successfully</div>
                  </div>
                ) : (
                  <div style={{
                    border: '2px dashed #cbd5e1', borderRadius: '10px',
                    padding: '20px', textAlign: 'center', color: '#94a3b8',
                    fontSize: '0.85rem'
                  }}>
                    No photo captured yet — a default placeholder will be used
                  </div>
                )}
              </div>

              <div className="safety-checkbox-notif">
                <p>⚠️ Make sure customer signs with names in print. POD photo must show chemical canisters stacked inside safe storage.</p>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setActiveStopOrder(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <CheckCircle2 size={16} />
                  <span>Upload & Sign Off Delivery</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Failed Delivery Modal */}
      {failedStopOrder && (
        <div className="modal-overlay">
          <div className="modal-content-card card failed-modal">
            <div className="modal-header">
              <h3>Log Delivery Failure Details</h3>
              <button className="close-btn" onClick={() => setFailedStopOrder(null)}>×</button>
            </div>

            <form onSubmit={handleStopFailed}>
              <div className="form-group">
                <label>Reason for Dispatch Failure</label>
                <select value={failedReason} onChange={(e) => setFailedReason(e.target.value)}>
                  <option value="Receiver Unavailable">Receiver Staff Unavailable</option>
                  <option value="Wrong Quantity in Truck">Discrepancy (Wrong Quantity in Truck)</option>
                  <option value="Damaged Goods">Damaged Goods / Canister Leakage</option>
                  <option value="Credit Hold">Account Credit Hold Alert</option>
                  <option value="Facility Closed">Facility / Institution Closed</option>
                </select>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setFailedStopOrder(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-danger">
                  <XOctagon size={16} />
                  <span>Log Operational Failure</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
