import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import StatusCard from '../components/StatusCard';
import { ConsumptionAreaChart, DeliveryBarChart, ClientSplitPieChart } from '../components/Charts';
import { 
  ShoppingCart, 
  Truck, 
  CheckCircle, 
  AlertTriangle, 
  Sparkles,
  ArrowRight,
  TrendingUp,
  FolderSync
} from 'lucide-react';

export default function Dashboard({ user, showToast, setTab }) {
  const [stats, setStats] = useState(null);
  const [customerData, setCustomerData] = useState(null);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Mock data for charts
  const weeklyConsumption = [
    { name: 'Mon', qty: 240 },
    { name: 'Tue', qty: 380 },
    { name: 'Wed', qty: 310 },
    { name: 'Thu', qty: 540 },
    { name: 'Fri', qty: 460 },
    { name: 'Sat', qty: 120 }
  ];

  const driverStats = [
    { driver: 'Robert Vance', delivered: 18, failed: 2 },
    { driver: 'Sanjay Kumar', delivered: 22, failed: 1 },
    { driver: 'Michael Chang', delivered: 14, failed: 0 }
  ];

  const clientSegments = [
    { name: 'Hospitals', value: 12 },
    { name: 'Schools', value: 8 },
    { name: 'Hotels', value: 5 },
    { name: 'Dealers', value: 4 }
  ];

  useEffect(() => {
    const fetchStats = async () => {
      try {
        if (user && user.role === 'Customer') {
          const customers = await api.getCustomers();
          const orders = await api.getOrders();
          
          const myCustomer = customers.find(c => c.id === user.customerId);
          const myOrders = orders.filter(o => o.customerId === user.customerId);
          
          setCustomerData(myCustomer);
          setCustomerOrders(myOrders);
        } else {
          const dashboardStats = await api.getStats();
          setStats(dashboardStats);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [user]);

  if (loading) {
    return <div className="loading-spinner">Loading...</div>;
  }

  if (user && user.role === 'Customer') {
    if (!customerData) return <div className="loading-spinner">Customer data not found</div>;
    
    const pendingOrdersCount = customerOrders.filter(o => o.status === 'Pending').length;
    const deliveredOrdersCount = customerOrders.filter(o => o.status === 'Delivered').length;

    return (
      <div className="dashboard-page animate-fade">
        <div className="welcome-banner card glow-effect">
          <div className="banner-content">
            <div className="banner-badge">
              <Sparkles size={14} />
              <span>Ganga Maxx Client Portal</span>
            </div>
            <h2>Welcome back, {user.name}!</h2>
            <p>Manage your institutional orders, check your credit balance, and reorder supplies.</p>
          </div>
          <div className="banner-actions">
            <button className="btn btn-primary" onClick={() => setTab('orders')}>
              <span>View My Orders</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>

        <div className="kpi-grid">
          <StatusCard 
            title="Available Credit" 
            value={`₹${(customerData.creditLimit - customerData.creditBalance).toLocaleString()}`} 
            trend={{ value: 12, positive: true }} 
            icon={ShoppingCart}
            description={`Out of ₹${customerData.creditLimit.toLocaleString()} limit`}
            type={customerData.creditStatus === 'Overlimit' ? 'danger' : 'primary'}
          />
          <StatusCard 
            title="Outstanding Balance" 
            value={`₹${customerData.creditBalance.toLocaleString()}`} 
            icon={AlertTriangle}
            description="Current ledger balance"
            type={customerData.creditStatus === 'Overlimit' ? 'danger' : 'warning'}
          />
          <StatusCard 
            title="Pending Orders" 
            value={pendingOrdersCount} 
            icon={Truck}
            description="Awaiting delivery"
            type="info"
          />
          <StatusCard 
            title="Completed Orders" 
            value={deliveredOrdersCount} 
            icon={CheckCircle}
            description="Successfully delivered"
            type="success"
          />
        </div>

        <div className="dashboard-secondary-grid">
          <div className="secondary-left card-solid">
            <div className="block-header">
              <h4>Quick Actions Shortcuts</h4>
            </div>
            <div className="quick-actions-list">
              <button onClick={() => setTab('products')} className="shortcut-btn">
                <ShoppingCart size={18} />
                <div className="shortcut-text">
                  <h5>Browse Catalog</h5>
                  <p>View products & kits</p>
                </div>
              </button>
              <button onClick={() => setTab('orders')} className="shortcut-btn">
                <FolderSync size={18} />
                <div className="shortcut-text">
                  <h5>Book Order</h5>
                  <p>Place a new bulk order</p>
                </div>
              </button>
            </div>
          </div>

          <div className="secondary-right card glow-effect">
            <div className="ai-header">
              <div className="ai-badge">
                <Sparkles size={14} />
                <span>GangaMaxx AI Advisor</span>
              </div>
            </div>
            <div className="ai-suggestion-box">
              <h5>⚡ Reorder Recommendations</h5>
              <ul>
                <li>
                  <strong>Stock Reminder:</strong> Based on your last order, you might be running low on <strong>MaxxClean Sanitizer 5L</strong>.
                </li>
                <li>
                  <strong>Kit Suggestion:</strong> Use our Cleaning Kit Builder in the Product Catalog to bundle items for a 10% discount!
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return <div className="loading-spinner">Loading Ganga Maxx Hub...</div>;
  }

  return (
    <div className="dashboard-page animate-fade">
      {/* Welcome banner */}
      <div className="welcome-banner card glow-effect">
        <div className="banner-content">
          <div className="banner-badge">
            <Sparkles size={14} />
            <span>Ganga Maxx Core Engine</span>
          </div>
          <h2>Welcome back, {user ? user.name : 'Sales Admin'}!</h2>
          <p>You are managing last-mile deliveries and stock dispatch for 4 major institution segments today.</p>
        </div>
        <div className="banner-actions">
          <button className="btn btn-primary" onClick={() => setTab('delivery-tracker')}>
            <span>Manage Deliveries</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="kpi-grid">
        <StatusCard 
          title="Active Delivery Runs" 
          value={stats.activeRuns} 
          icon={Truck}
          description="In-transit/Pending runs"
          type="primary"
        />
        <StatusCard 
          title="Pending Order Allocations" 
          value={stats.pendingOrders} 
          icon={ShoppingCart}
          trend={{ value: '12%', positive: true }}
          description="Awaiting vehicle setup"
          type="warning"
        />
        <StatusCard 
          title="Delivery Success Rate" 
          value={`${stats.deliverySuccessRate}%`} 
          icon={CheckCircle}
          description="Successful stops completed"
          type="success"
        />
        <StatusCard 
          title="Compliance/Stock Alerts" 
          value={stats.stockAlerts + stats.pendingComplianceAlerts} 
          icon={AlertTriangle}
          description="Low stock or missing MSDS"
          type="danger"
        />
      </div>

      {/* Charts section */}
      <div className="dashboard-charts-grid">
        <div className="chart-span-8">
          <ConsumptionAreaChart data={weeklyConsumption} />
        </div>
        <div className="chart-span-4">
          <ClientSplitPieChart data={clientSegments} />
        </div>
      </div>

      <div className="dashboard-secondary-grid">
        {/* Quick Operations & AI Coach */}
        <div className="secondary-left card-solid">
          <div className="block-header">
            <h4>Quick Actions Shortcuts</h4>
          </div>
          <div className="quick-actions-list">
            <button onClick={() => setTab('orders')} className="shortcut-btn">
              <ShoppingCart size={18} />
              <div className="shortcut-text">
                <h5>Book Bulk Order</h5>
                <p>Register school/hospital demand</p>
              </div>
            </button>
            <button onClick={() => setTab('delivery-tracker')} className="shortcut-btn">
              <Truck size={18} />
              <div className="shortcut-text">
                <h5>Schedule Run</h5>
                <p>Assign vehicle routes & sequence</p>
              </div>
            </button>
            <button onClick={() => setTab('products')} className="shortcut-btn">
              <FolderSync size={18} />
              <div className="shortcut-text">
                <h5>Compliance Check</h5>
                <p>Verify safety data sheets & MSDS</p>
              </div>
            </button>
          </div>
        </div>

        {/* AI Advisory Panel */}
        <div className="secondary-right card glow-effect">
          <div className="ai-header">
            <div className="ai-badge">
              <Sparkles size={14} />
              <span>GangaMaxx AI Advisor</span>
            </div>
          </div>
          <div className="ai-suggestion-box">
            <h5>⚡ Operational Optimization Tips</h5>
            <ul>
              <li>
                <strong>Route Alert:</strong> RUN-2026-008 driver Robert Vance has 1 pending stop at Grand Royal Hotel. Consider scheduling early runs due to nearby road construction.
              </li>
              <li>
                <strong>Kit Suggestion:</strong> Apex School requires floor cleaners. We recommend bundling <strong>MaxxClean 5L</strong> and <strong>Pine Floor Cleaner 10L</strong> into a package to claim a 10% tier discount.
              </li>
              <li>
                <strong>Compliance Guard:</strong> Verify chemical storage logs for school runs. Acid-based disinfectants must not be stacked above 1.2 meters in delivery trucks.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Analytics chart 2 */}
      <div className="dashboard-bottom-chart">
        <DeliveryBarChart data={driverStats} />
      </div>
    </div>
  );
}
