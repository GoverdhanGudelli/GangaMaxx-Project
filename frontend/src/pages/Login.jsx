import React, { useState } from 'react';
import { api } from '../services/api';
import { Truck, ShieldCheck, ArrowRight, UserCircle, Building } from 'lucide-react';

export default function Login({ onLogin }) {
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customerPassword, setCustomerPassword] = useState('');
  
  const [portal, setPortal] = useState('staff'); // 'staff' or 'customer'
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleStaffLogin = async (e) => {
    e.preventDefault();
    if (!employeeId || !password) {
      setError('Please enter your Employee ID and password.');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const user = await api.login(employeeId, password);
      onLogin(user);
    } catch (err) {
      setError('Invalid Employee ID or Password');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerLogin = async (e) => {
    e.preventDefault();
    if (!customerId || !customerPassword) {
      setError('Please enter your Customer ID and password.');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const customer = await api.customerLogin(customerId, customerPassword);
      onLogin(customer);
    } catch (err) {
      setError('Invalid Customer ID or Password');
    } finally {
      setLoading(false);
    }
  };

  const autofillStaff = (id) => {
    setEmployeeId(id);
    setPassword('password123');
    setError('');
  };

  const autofillCustomer = (id) => {
    setCustomerId(id);
    setCustomerPassword('password123');
    setError('');
  };

  return (
    <div className="login-container">
      <div className="login-left-panel">
        <div className="login-brand">
          <Truck size={48} className="brand-icon" />
          <h1>GangaMaxx</h1>
          <p>Enterprise B2B Delivery & Supply Chain Platform</p>
        </div>
        <div className="login-features">
          <div className="feature-item">
            <ShieldCheck className="feature-icon" />
            <div>
              <h3>Secure Access</h3>
              <p>End-to-end encrypted employee & partner portals</p>
            </div>
          </div>
          <div className="feature-item">
            <ArrowRight className="feature-icon" />
            <div>
              <h3>Real-time Tracking</h3>
              <p>Live visibility into your supply chain network</p>
            </div>
          </div>
        </div>
      </div>

      <div className="login-right-panel">
        <div className="login-card">
          <div className="login-header">
            <h2>Welcome Back</h2>
            <p>Select your portal to continue</p>
          </div>

          <div className="portal-toggle">
            <button 
              className={`toggle-btn ${portal === 'staff' ? 'active' : ''}`}
              onClick={() => { setPortal('staff'); setError(''); }}
            >
              <UserCircle size={18} /> Staff Portal
            </button>
            <button 
              className={`toggle-btn ${portal === 'customer' ? 'active' : ''}`}
              onClick={() => { setPortal('customer'); setError(''); }}
            >
              <Building size={18} /> Customer Portal
            </button>
          </div>

          {error && <div className="login-error">{error}</div>}

          {portal === 'staff' ? (
            <form onSubmit={handleStaffLogin} className="login-form" autoComplete="off">
              <div className="form-group">
                <label>Employee ID</label>
                <input
                  type="text"
                  placeholder="e.g. E1001"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  autoComplete="off"
                  required
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>
              <button type="submit" className="login-btn glow-effect" disabled={loading}>
                {loading ? 'Authenticating...' : 'Access Staff Workspace'}
              </button>

              <div className="demo-accounts">
                <p>Demo Staff Accounts:</p>
                <div className="demo-buttons">
                  <button type="button" onClick={() => autofillStaff('E1001')}>Sales Admin</button>
                  <button type="button" onClick={() => autofillStaff('E1002')}>Driver</button>
                  <button type="button" onClick={() => autofillStaff('E1003')}>Warehouse</button>
                </div>
              </div>
            </form>
          ) : (
            <form onSubmit={handleCustomerLogin} className="login-form" autoComplete="off">
              <div className="form-group">
                <label>Customer ID</label>
                <input
                  type="text"
                  placeholder="e.g. c1"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  autoComplete="off"
                  required
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={customerPassword}
                  onChange={(e) => setCustomerPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>
              <button type="submit" className="login-btn customer-btn glow-effect" disabled={loading}>
                {loading ? 'Authenticating...' : 'Access Customer Dashboard'}
              </button>

              <div className="demo-accounts">
                <p>Demo Customer Accounts:</p>
                <div className="demo-buttons">
                  <button type="button" onClick={() => autofillCustomer('c1')}>Hospital</button>
                  <button type="button" onClick={() => autofillCustomer('c2')}>School</button>
                  <button type="button" onClick={() => autofillCustomer('c4')}>Dealer</button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>

      <style>{`
        .login-container {
          display: flex;
          height: 100vh;
          width: 100vw;
          background-color: var(--bg-default);
        }

        .login-left-panel {
          flex: 1;
          background: linear-gradient(135deg, var(--color-primary), #059669);
          padding: 60px;
          color: white;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .login-brand {
          margin-top: 40px;
        }

        .brand-icon {
          margin-bottom: 20px;
          animation: float 3s ease-in-out infinite;
        }

        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }

        .login-brand h1 {
          font-size: 3rem;
          font-weight: 800;
          margin-bottom: 10px;
          letter-spacing: -1px;
        }

        .login-brand p {
          font-size: 1.2rem;
          opacity: 0.9;
        }

        .login-features {
          margin-bottom: 40px;
        }

        .feature-item {
          display: flex;
          align-items: flex-start;
          gap: 15px;
          margin-bottom: 30px;
          padding: 20px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          backdrop-filter: blur(10px);
        }

        .feature-icon {
          color: #a7f3d0;
          flex-shrink: 0;
        }

        .feature-item h3 {
          font-size: 1.1rem;
          margin-bottom: 5px;
        }

        .feature-item p {
          font-size: 0.9rem;
          opacity: 0.8;
          line-height: 1.4;
        }

        .login-right-panel {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #f8fafc;
        }

        .login-card {
          background: white;
          padding: 40px;
          border-radius: 16px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
          width: 100%;
          max-width: 480px;
          border: 1px solid #e2e8f0;
        }

        .login-header {
          text-align: center;
          margin-bottom: 30px;
        }

        .login-header h2 {
          font-size: 1.8rem;
          color: var(--text-primary);
          margin-bottom: 8px;
        }

        .login-header p {
          color: var(--text-secondary);
        }

        .portal-toggle {
          display: flex;
          background: #f1f5f9;
          padding: 4px;
          border-radius: 8px;
          margin-bottom: 24px;
        }

        .toggle-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px;
          border: none;
          background: transparent;
          color: #64748b;
          font-weight: 600;
          font-size: 0.95rem;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .toggle-btn:hover {
          color: #334155;
        }

        .toggle-btn.active {
          background: white;
          color: var(--color-primary);
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }

        .login-error {
          background: #fef2f2;
          color: #dc2626;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 20px;
          font-size: 0.9rem;
          border-left: 4px solid #ef4444;
        }

        .login-form .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          font-size: 0.875rem;
          font-weight: 600;
          color: #475569;
          margin-bottom: 8px;
        }

        .form-group input {
          width: 100%;
          padding: 12px 16px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 1rem;
          transition: all 0.2s;
        }

        .form-group input:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
        }

        .login-btn {
          width: 100%;
          padding: 14px;
          background: var(--color-primary);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          margin-bottom: 24px;
        }

        .login-btn:hover {
          background: #059669;
          transform: translateY(-1px);
        }

        .login-btn.customer-btn {
          background: #4f46e5;
        }
        
        .login-btn.customer-btn:hover {
          background: #4338ca;
        }

        .demo-accounts {
          margin-top: 24px;
          padding-top: 24px;
          border-top: 1px dashed #e2e8f0;
        }

        .demo-accounts p {
          font-size: 0.85rem;
          color: #64748b;
          margin-bottom: 12px;
          text-align: center;
        }

        .demo-buttons {
          display: flex;
          gap: 8px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .demo-buttons button {
          padding: 6px 12px;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          font-size: 0.8rem;
          color: #475569;
          cursor: pointer;
          transition: all 0.2s;
        }

        .demo-buttons button:hover {
          background: #e2e8f0;
          color: #1e293b;
        }

        @media (max-width: 900px) {
          .login-container {
            flex-direction: column;
          }
          .login-left-panel {
            padding: 40px 20px;
            flex: none;
          }
          .login-features {
            display: none;
          }
          .login-right-panel {
            padding: 20px;
          }
        }
      `}</style>
    </div>
  );
}
