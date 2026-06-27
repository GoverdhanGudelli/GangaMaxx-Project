import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Map, Truck, Calendar, MapPin, CheckCircle2, Clock } from 'lucide-react';

// Fix leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function CustomerDeliveryTracker({ user }) {
  const [myDeliveries, setMyDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStop, setSelectedStop] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user || !user.id) {
        setLoading(false);
        return;
      }

      try {
        const allRuns = await api.getDeliveries();
        const allOrders = await api.getOrders();
        const allCustomers = await api.getCustomers();
        
        const me = allCustomers.find(c => c.id === user.id);
        const myLat = me?.lat || 17.3850;
        const myLng = me?.lng || 78.4867;

        // Find orders belonging to this customer
        const myOrders = allOrders.filter(o => o.customerId === user.id);
        const myOrderIds = myOrders.map(o => o.id);

        // Filter runs to only include stops belonging to my orders
        const extractedDeliveries = [];

        allRuns.forEach(run => {
          run.stops.forEach(stop => {
            if (myOrderIds.includes(stop.orderId)) {
              // This is my stop on this run!
              extractedDeliveries.push({
                runId: run.id,
                runNumber: run.runNumber,
                driverName: run.driverName,
                vehicleNo: run.vehicleNo,
                date: run.date,
                myLat,
                myLng,
                ...stop, // orderId, customerName, address, qty, status, podPhoto, etc.
              });
            }
          });
        });

        // Sort by date descending
        extractedDeliveries.sort((a, b) => new Date(b.date) - new Date(a.date));
        setMyDeliveries(extractedDeliveries);
        if (extractedDeliveries.length > 0) {
          setSelectedStop(extractedDeliveries[0]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Pending': return <span className="badge badge-warning"><Clock size={12} className="mr-1 inline-block"/> Scheduled</span>;
      case 'In Transit': return <span className="badge badge-info"><Truck size={12} className="mr-1 inline-block"/> On the Way</span>;
      case 'Delivered': return <span className="badge badge-success"><CheckCircle2 size={12} className="mr-1 inline-block"/> Delivered</span>;
      case 'Failed': return <span className="badge badge-error">Failed</span>;
      default: return <span className="badge badge-secondary">{status}</span>;
    }
  };

  if (loading) return <div className="loading-spinner">Loading tracking information...</div>;

  const WAREHOUSE = [17.2570, 78.4350];
  let truckLocation = WAREHOUSE;
  if (selectedStop) {
    // Simulate truck being halfway if in transit, or at destination if delivered
    if (selectedStop.status === 'In Transit') {
      truckLocation = [
        WAREHOUSE[0] + (selectedStop.myLat - WAREHOUSE[0]) * 0.6,
        WAREHOUSE[1] + (selectedStop.myLng - WAREHOUSE[1]) * 0.6
      ];
    } else if (selectedStop.status === 'Delivered') {
      truckLocation = [selectedStop.myLat, selectedStop.myLng];
    }
  }

  return (
    <div className="customer-delivery-page animate-fade">
      <div className="cust-delivery-header card glow-effect">
        <div className="banner-content">
          <h3>Live Delivery Tracking</h3>
          <p>Track your bulk institutional orders, view driver assignments, and access digital proof of delivery documentation.</p>
        </div>
      </div>

      <div className="tracking-grid">
        {/* Left: My Deliveries List */}
        <div className="runs-column card-solid">
          <div className="column-header">
            <h4><Map size={18} className="mr-2 inline-block"/> My Shipments</h4>
          </div>
          <div className="runs-list-wrapper">
            {myDeliveries.length > 0 ? (
              myDeliveries.map(stop => (
                <div 
                  key={stop.orderId}
                  className={`run-list-item ${selectedStop?.orderId === stop.orderId ? 'active' : ''}`}
                  onClick={() => setSelectedStop(stop)}
                >
                  <div className="run-item-top">
                    <span className="run-number">Order #{stop.orderId}</span>
                    {getStatusBadge(stop.status)}
                  </div>
                  <div className="run-item-bottom">
                    <span><Calendar size={12} /> {stop.date}</span>
                    <span><Truck size={12} /> {stop.qty} cases</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-runs">No recent deliveries found for your account.</div>
            )}
          </div>
        </div>

        {/* Right: Selected Stop Details */}
        <div className="active-run-column">
          {selectedStop ? (
            <div className="active-run-card card-solid tracking-detail-card">
              <div className="tracking-header">
                <div>
                  <h3>Delivery for Order #{selectedStop.orderId}</h3>
                  <p className="sub-text"><MapPin size={14} className="inline-block mr-1"/> {selectedStop.address}</p>
                </div>
                {getStatusBadge(selectedStop.status)}
              </div>

              <div className="tracking-info-blocks">
                <div className="info-block">
                  <span className="block-label">Assigned Driver</span>
                  <span className="block-val">{selectedStop.driverName}</span>
                </div>
                <div className="info-block">
                  <span className="block-label">Vehicle Registration</span>
                  <span className="block-val">{selectedStop.vehicleNo}</span>
                </div>
                <div className="info-block">
                  <span className="block-label">Route Reference</span>
                  <span className="block-val">{selectedStop.runNumber}</span>
                </div>
                <div className="info-block">
                  <span className="block-label">Quantity Expected</span>
                  <span className="block-val">{selectedStop.qty} bulk items</span>
                </div>
              </div>

              {/* Customer Delivery Map */}
              <div className="route-map-container card" style={{ height: '250px', marginBottom: '20px', zIndex: 1, borderRadius: '12px', overflow: 'hidden' }}>
                <MapContainer center={selectedStop.status === 'In Transit' ? truckLocation : [selectedStop.myLat, selectedStop.myLng]} zoom={11} style={{ height: '100%', width: '100%' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker position={WAREHOUSE}>
                    <Popup>Central Warehouse</Popup>
                  </Marker>
                  <Marker position={[selectedStop.myLat, selectedStop.myLng]}>
                    <Popup>Your Delivery Address</Popup>
                  </Marker>
                  
                  {selectedStop.status === 'In Transit' && (
                    <Marker position={truckLocation}>
                      <Popup><strong>Delivery Truck</strong><br/>Arriving soon!</Popup>
                    </Marker>
                  )}

                  <Polyline 
                    positions={[WAREHOUSE, [selectedStop.myLat, selectedStop.myLng]]} 
                    color="#3b82f6" 
                    weight={4} 
                    dashArray={selectedStop.status === 'Pending' ? "5, 10" : ""}
                  />
                </MapContainer>
              </div>

              <div className="tracking-status-visual">
                <div className="progress-bar-container">
                  <div className={`progress-segment ${selectedStop.status !== 'Failed' ? 'filled' : ''}`}>
                    <div className="step-circle"><Clock size={14} /></div>
                    <span>Scheduled</span>
                  </div>
                  <div className={`progress-line ${selectedStop.status === 'In Transit' || selectedStop.status === 'Delivered' ? 'filled' : ''}`}></div>
                  <div className={`progress-segment ${(selectedStop.status === 'In Transit' || selectedStop.status === 'Delivered') ? 'filled' : ''}`}>
                    <div className="step-circle"><Truck size={14} /></div>
                    <span>In Transit</span>
                  </div>
                  <div className={`progress-line ${selectedStop.status === 'Delivered' ? 'filled' : ''}`}></div>
                  <div className={`progress-segment ${selectedStop.status === 'Delivered' ? 'filled' : ''}`}>
                    <div className="step-circle"><CheckCircle2 size={14} /></div>
                    <span>Delivered</span>
                  </div>
                </div>
              </div>

              {selectedStop.status === 'Delivered' && (
                <div className="pod-section card bg-slate-800">
                  <h4>Proof of Delivery (POD)</h4>
                  <div className="pod-content">
                    <div className="pod-text">
                      <p><strong>Signed by:</strong> {selectedStop.signedBy}</p>
                      <p><strong>Delivered Qty:</strong> {selectedStop.deliveredQty}</p>
                      <div className="success-notice mt-2 text-success flex items-center">
                        <CheckCircle2 size={14} className="mr-1" /> Verified & Cleared
                      </div>
                    </div>
                    {selectedStop.podPhoto && (
                      <div className="pod-img-wrapper">
                        <img src={selectedStop.podPhoto} alt="POD" />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedStop.status === 'Failed' && (
                <div className="failure-section card bg-red-900 bg-opacity-20 border-red-800">
                  <h4 className="text-red-400">Delivery Exception</h4>
                  <p><strong>Reason reported by driver:</strong> {selectedStop.failedReason}</p>
                  <p className="mt-2 text-sm">Please contact support or your account manager to reschedule this delivery.</p>
                </div>
              )}

            </div>
          ) : (
            <div className="select-run-placeholder card-solid">
              <Truck size={48} className="placeholder-icon" />
              <h4>Select a Shipment</h4>
              <p>Choose an order from the left to view live tracking details.</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .customer-delivery-page {
          height: calc(100vh - 140px);
          display: flex;
          flex-direction: column;
        }
        .cust-delivery-header {
          margin-bottom: 24px;
        }
        .tracking-grid {
          display: grid;
          grid-template-columns: 350px 1fr;
          gap: 24px;
          flex: 1;
          min-height: 0;
        }
        .runs-column {
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .runs-list-wrapper {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
        }
        .tracking-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 1px solid #334155;
          padding-bottom: 20px;
          margin-bottom: 20px;
        }
        .sub-text {
          color: #94a3b8;
          font-size: 0.9rem;
          margin-top: 4px;
        }
        .tracking-info-blocks {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 30px;
        }
        .info-block {
          background: #1e293b;
          padding: 16px;
          border-radius: 8px;
          border: 1px solid #334155;
        }
        .block-label {
          display: block;
          font-size: 0.8rem;
          color: #94a3b8;
          margin-bottom: 4px;
          text-transform: uppercase;
        }
        .block-val {
          display: block;
          font-weight: 600;
          color: #fff;
        }
        .tracking-status-visual {
          padding: 30px 20px;
          background: #1e293b;
          border-radius: 8px;
          margin-bottom: 30px;
        }
        .progress-bar-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          max-width: 600px;
          margin: 0 auto;
        }
        .progress-segment {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          color: #64748b;
          z-index: 2;
        }
        .progress-segment.filled {
          color: var(--color-primary);
        }
        .progress-segment.filled .step-circle {
          background: var(--color-primary);
          border-color: var(--color-primary);
          color: #fff;
        }
        .step-circle {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #1e293b;
          border: 2px solid #334155;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s;
        }
        .progress-line {
          flex: 1;
          height: 4px;
          background: #334155;
          margin: 0 -20px;
          margin-bottom: 24px; /* offset for the text below */
          z-index: 1;
        }
        .progress-line.filled {
          background: var(--color-primary);
        }
        .pod-section {
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid #334155;
        }
        .pod-content {
          display: flex;
          gap: 24px;
          margin-top: 16px;
        }
        .pod-text {
          flex: 1;
        }
        .pod-text p {
          margin-bottom: 8px;
        }
        .pod-img-wrapper {
          width: 200px;
          height: 140px;
          border-radius: 8px;
          overflow: hidden;
          border: 2px solid #cbd5e1;
        }
        .pod-img-wrapper img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .failure-section {
          background: rgba(127, 29, 29, 0.1);
          border: 1px solid rgba(185, 28, 28, 0.5);
        }
        .text-red-400 {
          color: #f87171;
        }
      `}</style>
    </div>
  );
}
