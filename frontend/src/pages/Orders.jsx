import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import Table from '../components/Table';
import { 
  Plus, 
  ShoppingCart, 
  Trash2, 
  FileCheck, 
  Compass, 
  AlertTriangle 
} from 'lucide-react';

export default function Orders({ user, showToast }) {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);

  // New Order Form state
  const [customerId, setCustomerId] = useState('');
  const [warehouse, setWarehouse] = useState('Central Hub B');
  const [orderItems, setOrderItems] = useState([{ productId: '', qty: 1 }]);
  const [complianceCleared, setComplianceCleared] = useState(true);

  const fetchInitialData = async () => {
    try {
      const ordersData = await api.getOrders();
      const customersData = await api.getCustomers();
      const productsData = await api.getProducts();
      setOrders(ordersData);
      setCustomers(customersData);
      setProducts(productsData);

      if (user && user.role === 'Customer') {
        setCustomerId(user.customerId);
      } else if (customersData.length > 0) {
        setCustomerId(customersData[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleAddItemRow = () => {
    setOrderItems([...orderItems, { productId: products[0]?.id || '', qty: 1 }]);
  };

  const handleRemoveItemRow = (index) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...orderItems];
    newItems[index][field] = value;
    setOrderItems(newItems);
  };

  const calculateTotal = () => {
    return orderItems.reduce((sum, item) => {
      const prod = products.find(p => p.id === item.productId);
      const price = prod ? prod.price : 0;
      return sum + (price * Number(item.qty || 0));
    }, 0);
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;

    // Build structured order items
    const finalItems = orderItems.map(item => {
      const prod = products.find(p => p.id === item.productId);
      return {
        productId: item.productId,
        name: prod ? prod.name : 'Unknown Product',
        qty: Number(item.qty),
        price: prod ? prod.price : 0
      };
    });

    // Simple credit limit check
    const total = calculateTotal();
    const isOverlimit = customer.creditBalance + total > customer.creditLimit;

    try {
      const newOrder = await api.addOrder({
        customerId,
        customerName: customer.name,
        items: finalItems,
        total,
        warehouse,
        complianceCleared
      });

      // Update customer credit balance dynamically if order clears
      if (isOverlimit) {
        await api.updateCustomer(customer.id, { 
          creditBalance: customer.creditBalance + total,
          creditStatus: 'Overlimit'
        });
        showToast('Order Placed (Credit Warning)', `Account limit exceeded. ${customer.name} status flag set to Overlimit.`, 'warning');
      } else {
        await api.updateCustomer(customer.id, { 
          creditBalance: customer.creditBalance + total 
        });
        showToast('Bulk Order Booked', `Order allocated to ${warehouse}. Total: ₹${total.toFixed(2)}`, 'success');
      }

      setShowAddModal(false);
      // Reset
      setOrderItems([{ productId: products[0]?.id || '', qty: 1 }]);
      setWarehouse('Central Hub B');
      setComplianceCleared(true);
      fetchInitialData();
    } catch (err) {
      showToast('Error', 'Failed to place bulk order', 'error');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Pending':
        return <span className="badge badge-warning">Awaiting Load</span>;
      case 'Dispatched':
        return <span className="badge badge-info">In Transit</span>;
      case 'Delivered':
        return <span className="badge badge-success">Delivered</span>;
      case 'Failed':
        return <span className="badge badge-error">Failed</span>;
      default:
        return <span className="badge badge-info">{status}</span>;
    }
  };

  const filteredOrders = orders.filter(o => {
    const isCustomer = user && user.role === 'Customer';
    const matchesCustomer = isCustomer ? o.customerId === user.customerId : true;
    const matchesSearch = o.customerName.toLowerCase().includes(search.toLowerCase()) || 
                          o.id.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || o.status === statusFilter;
    return matchesCustomer && matchesSearch && matchesStatus;
  });

  const headers = [
    { label: 'Order ID' },
    { label: 'Customer Institution' },
    { label: 'Booking Date' },
    { label: 'Warehouse Source' },
    { label: 'Total Value' },
    { label: 'Compliance Status' },
    { label: 'Delivery Status' }
  ];

  if (loading) return <div className="loading-spinner">Fetching orders...</div>;

  return (
    <div className="orders-page animate-fade">
      <div className="orders-actions">
        <div className="filter-controls">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="All">All Delivery Statuses</option>
            <option value="Pending">Awaiting Load</option>
            <option value="Dispatched">In Transit</option>
            <option value="Delivered">Delivered</option>
            <option value="Failed">Failed</option>
          </select>
        </div>

        {(user?.role === 'Sales Admin' || user?.role === 'Customer') && (
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={16} />
            <span>New Bulk Booking</span>
          </button>
        )}
      </div>

      <Table 
        title="B2B Bulk Purchase Portal"
        headers={headers}
        data={filteredOrders}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search order ID or client name..."
        renderRow={(order) => (
          <>
            <td>
              <span className="order-id-tag">#{order.id}</span>
            </td>
            <td>
              <div className="order-client-cell" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span className="client-name" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{order.customerName}</span>
                <span className="items-summary" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {order.items.map(i => `${i.qty}x ${i.name}`).join(', ')}
                </span>
              </div>
            </td>
            <td>{order.orderDate}</td>
            <td>
              <span className="warehouse-label">
                <Compass size={12} className="compass-icon" />
                {order.warehouse}
              </span>
            </td>
            <td>₹{order.total.toFixed(2)}</td>
            <td>
              <span className={`compliance-status ${order.complianceCleared ? 'cleared' : 'pending'}`}>
                {order.complianceCleared ? 'Chemical Clearance Cleared' : 'Safety Check Pending'}
              </span>
            </td>
            <td>{getStatusBadge(order.status)}</td>
          </>
        )}
      />

      {/* Booking Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content-card card booking-modal">
            <div className="modal-header">
              <h3>Book Institutional Order</h3>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>×</button>
            </div>

            <form onSubmit={handleCreateOrder}>
              <div className="form-group">
                <label>Select Client Institution</label>
                <select 
                  value={customerId} 
                  onChange={(e) => setCustomerId(e.target.value)}
                  disabled={user && user.role === 'Customer'}
                >
                  {customers.map(c => {
                    if (user && user.role === 'Customer' && c.id !== user.customerId) return null;
                    return (
                      <option key={c.id} value={c.id}>
                        {c.name} (Credit Balance: ₹{c.creditBalance} / Limit: ₹{c.creditLimit})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="form-group">
                <label>Warehouse Source Depot</label>
                <select value={warehouse} onChange={(e) => setWarehouse(e.target.value)}>
                  <option value="Central Hub B">Central Hub B (Main Depot)</option>
                  <option value="North Depot">North Depot (Chemical Specialized)</option>
                  <option value="South Facility">South Facility (Sanitizer Hub)</option>
                </select>
              </div>

              <div className="form-group">
                <div className="items-header">
                  <label>Order Chemical & Soap SKUs</label>
                  <button type="button" className="btn-add-item" onClick={handleAddItemRow}>
                    + Add Product Row
                  </button>
                </div>
                
                <div className="order-items-builder">
                  {orderItems.map((item, index) => (
                    <div key={index} className="order-item-row">
                      <select 
                        value={item.productId} 
                        onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                        required
                      >
                        <option value="">Choose chemical...</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} (₹{p.price.toFixed(2)})
                          </option>
                        ))}
                      </select>
                      <input 
                        type="number" 
                        min="1" 
                        max="200"
                        placeholder="Qty"
                        value={item.qty}
                        onChange={(e) => handleItemChange(index, 'qty', e.target.value)}
                        required
                      />
                      {orderItems.length > 1 && (
                        <button 
                          type="button" 
                          className="btn-remove-row" 
                          onClick={() => handleRemoveItemRow(index)}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="compliance-clearance-block">
                <div className="clearance-toggle">
                  <input 
                    type="checkbox" 
                    id="clearance" 
                    checked={complianceCleared}
                    onChange={(e) => setComplianceCleared(e.target.checked)}
                  />
                  <label htmlFor="clearance" className="checkbox-label">
                    Safety Compliance & Dilution Guidelines Acknowledged
                  </label>
                </div>
                {!complianceCleared && (
                  <div className="compliance-warning">
                    <AlertTriangle size={14} />
                    <span>Warning: Orders with unverified safety checks cannot be loaded onto delivery vehicles.</span>
                  </div>
                )}
              </div>

              <div className="modal-total-bar">
                <span>Total Amount:</span>
                <h3>₹{calculateTotal().toFixed(2)}</h3>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <ShoppingCart size={16} />
                  <span>Book Order Run</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
