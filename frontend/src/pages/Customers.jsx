import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import Table from '../components/Table';
import { Plus, UserPlus, AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';

export default function Customers({ showToast }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);

  // Add customer form state
  const [name, setName] = useState('');
  const [type, setType] = useState('Hospital');
  const [tier, setTier] = useState('Silver');
  const [creditLimit, setCreditLimit] = useState(5000);
  const [address, setAddress] = useState('');

  const fetchCustomers = async () => {
    try {
      const data = await api.getCustomers();
      setCustomers(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    if (!name || !address) return;

    try {
      await api.addCustomer({
        name,
        type,
        tier,
        creditLimit: Number(creditLimit),
        creditBalance: 0,
        creditStatus: 'Good',
        address
      });
      showToast('Client Enrolled', `${name} has been enrolled in the CRM.`, 'success');
      setShowAddModal(false);
      
      // Clear forms
      setName('');
      setAddress('');
      setTier('Silver');
      setCreditLimit(5000);
      
      fetchCustomers();
    } catch (err) {
      showToast('Error', 'Failed to enroll client', 'error');
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'Overlimit') {
      return (
        <span className="badge badge-error">
          <AlertTriangle size={12} />
          Overlimit
        </span>
      );
    }
    return (
      <span className="badge badge-success">
        <CheckCircle size={12} />
        Good Standing
      </span>
    );
  };

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) || 
                          c.address.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filterType === 'All' || c.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const headers = [
    { label: 'Customer / Institution' },
    { label: 'Segment' },
    { label: 'Service Tier' },
    { label: 'Credit Limit' },
    { label: 'Outstanding Balance' },
    { label: 'Credit Status' },
    { label: 'Delivery Address' }
  ];

  if (loading) return <div className="loading-spinner">Fetching clients...</div>;

  return (
    <div className="customers-page animate-fade">
      {/* Alert banner for overlimit accounts */}
      {customers.some(c => c.creditStatus === 'Overlimit') && (
        <div className="credit-alert-banner card-solid">
          <ShieldAlert className="warning-icon" />
          <div className="alert-text">
            <strong>Credit Account Warning:</strong> Some institutional accounts are currently <strong>Overlimit</strong>. Delays in delivery runs might occur for these accounts until ledger reconciliation is complete.
          </div>
        </div>
      )}

      {/* CRM Actions */}
      <div className="crm-actions">
        <div className="filter-controls">
          <div className="select-wrapper">
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="All">All Segments</option>
              <option value="Hospital">Hospitals</option>
              <option value="School">Schools</option>
              <option value="Hotel">Hotels</option>
              <option value="Dealer">Dealers</option>
            </select>
          </div>
        </div>
        
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={16} />
          <span>Enroll Institution</span>
        </button>
      </div>

      {/* Customer Data Table */}
      <Table 
        title="Institutional Customer Register"
        headers={headers}
        data={filteredCustomers}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Filter by name or address..."
        renderRow={(customer) => (
          <>
            <td>
              <div className="customer-cell">
                <span className="client-name">{customer.name}</span>
                <span className="client-id">ID: {customer.id}</span>
              </div>
            </td>
            <td>
              <span className="type-tag">{customer.type}</span>
            </td>
            <td>
              <span className={`tier-badge tier-${customer.tier.toLowerCase()}`}>{customer.tier}</span>
            </td>
            <td>₹{customer.creditLimit.toLocaleString()}</td>
            <td className={customer.creditBalance > customer.creditLimit ? 'text-danger' : ''}>
              ₹{customer.creditBalance.toLocaleString()}
            </td>
            <td>{getStatusBadge(customer.creditStatus)}</td>
            <td className="address-cell">{customer.address}</td>
          </>
        )}
      />

      {/* Add Client Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content-card card">
            <div className="modal-header">
              <h3>Enroll New Institution</h3>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            
            <form onSubmit={handleAddCustomer}>
              <div className="form-group">
                <label>Institution / Business Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Apollo Medical Center" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required 
                />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Institution Segment</label>
                  <select value={type} onChange={(e) => setType(e.target.value)}>
                    <option value="Hospital">Hospital</option>
                    <option value="School">School</option>
                    <option value="Hotel">Hotel</option>
                    <option value="Dealer">Dealer</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Client Tier</label>
                  <select value={tier} onChange={(e) => setTier(e.target.value)}>
                    <option value="Silver">Silver (Standard)</option>
                    <option value="Gold">Gold (Preferred)</option>
                    <option value="Platinum">Platinum (Priority)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Credit Account Limit (₹)</label>
                <input 
                  type="number" 
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                  min="500"
                  max="100000"
                  required 
                />
              </div>

              <div className="form-group">
                <label>Billing & Delivery Address</label>
                <textarea 
                  placeholder="Enter full physical delivery address" 
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows="3"
                  required
                ></textarea>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <UserPlus size={16} />
                  <span>Enrol Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
