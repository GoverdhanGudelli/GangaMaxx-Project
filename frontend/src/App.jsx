import React, { useState, useEffect } from 'react';
import Sidebar, { MENU_ITEMS } from './components/Sidebar';
import Navbar from './components/Navbar';
import AIAssistant from './components/AIAssistant';
import { api } from './services/api';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Products from './pages/Products';
import Orders from './pages/Orders';
import DeliveryTracker from './pages/DeliveryTracker';
import Reports from './pages/Reports';
import Profile from './pages/Profile';
import CustomerDeliveryTracker from './pages/CustomerDeliveryTracker';
import QuotationBuilder from './pages/QuotationBuilder';

export default function App() {
  const [user, setUser] = useState(null);
  const [currentTab, setTab] = useState('dashboard');
  const [toasts, setToasts] = useState([]);

  const getDefaultTab = (role) => {
    switch(role) {
      case 'Sales Admin': return 'dashboard';
      case 'Warehouse Staff': return 'orders';
      case 'Delivery Driver': return 'delivery-tracker';
      case 'Customer': return 'customer-delivery-tracker';
      default: return 'profile';
    }
  };

  // Check existing session
  useEffect(() => {
    const savedUser = localStorage.getItem('gm_session');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      setUser(parsed);
      // Validate their saved tab or assign default
      setTab(prevTab => {
        const item = MENU_ITEMS.find(m => m.path === prevTab);
        if (item && item.allowedRoles.includes(parsed.role)) return prevTab;
        return getDefaultTab(parsed.role);
      });
    }
  }, []);

  // Notification Polling
  useEffect(() => {
    if (!user) return;
    
    const pollNotifications = async () => {
      try {
        const notifs = await api.getNotifications(user.employeeId || user.id);
        const unread = notifs.filter(n => !n.read);
        
        unread.forEach(async (n) => {
          // Toast shows the notification
          showToast('Fleet Dispatch Alert', n.message, 'success');
          // Mark as read so it doesn't pop up again
          await api.markNotificationRead(n.id);
        });
      } catch (err) {
        // Silently fail
      }
    };

    pollNotifications();
    const interval = setInterval(pollNotifications, 10000);
    return () => clearInterval(interval);
  }, [user]);

  const handleLogin = (userInfo) => {
    setUser(userInfo);
    localStorage.setItem('gm_session', JSON.stringify(userInfo));
    setTab(getDefaultTab(userInfo.role));
    showToast('Success', `Logged in successfully as ${userInfo.name}`, 'success');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('gm_session');
    showToast('Signed Out', 'You have been signed out of the delivery tracker', 'info');
  };

  const showToast = (title, message, type = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Render correct page view
  const renderPage = () => {
    const props = { user, showToast, setTab };
    
    // Security check: strict route guarding
    const menuItem = MENU_ITEMS.find(item => item.path === currentTab);
    const isAllowed = menuItem ? menuItem.allowedRoles.includes(user?.role) : false;
    
    const tabToRender = isAllowed ? currentTab : getDefaultTab(user?.role);
    
    if (!isAllowed && currentTab !== tabToRender) {
      setTimeout(() => setTab(tabToRender), 0);
    }

    switch (tabToRender) {
      case 'dashboard':
        return <Dashboard {...props} />;
      case 'customers':
        return <Customers {...props} />;
      case 'products':
        return <Products {...props} />;
      case 'orders':
        return <Orders {...props} />;
      case 'delivery-tracker':
        return <DeliveryTracker {...props} />;
      case 'reports':
        return <Reports {...props} />;
      case 'profile':
        return <Profile {...props} onLogout={handleLogout} />;

      case 'customer-delivery-tracker':
        return <CustomerDeliveryTracker {...props} />;
      case 'quotation-builder':
        return <QuotationBuilder {...props} />;
      default:
        return <Dashboard {...props} />;
    }
  };

  if (!user) {
    return (
      <>
        <Login onLogin={handleLogin} />
        <ToastContainer toasts={toasts} />
      </>
    );
  }

  return (
    <div className="app-container">
      <Sidebar 
        currentTab={currentTab} 
        setTab={setTab} 
        user={user} 
        onLogout={handleLogout} 
      />
      <div className="main-content">
        <Navbar currentTab={currentTab} user={user} />
        <main className="page-container">
          {renderPage()}
        </main>
      </div>

      <ToastContainer toasts={toasts} />
      <AIAssistant />
    </div>
  );
}

function ToastContainer({ toasts }) {
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast-card toast-${t.type}`}>
          <div className="toast-content">
            <strong>{t.title}</strong>
            <p>{t.message}</p>
          </div>
        </div>
      ))}
      <style>{`
        .toast-container {
          position: fixed;
          bottom: 24px;
          right: 24px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          z-index: 9999;
        }

        .toast-card {
          min-width: 280px;
          max-width: 380px;
          padding: 12px 18px;
          border-radius: 10px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
          background: #1e293b;
          border-left: 4px solid var(--color-primary);
          color: #fff;
          animation: toastSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .toast-success {
          border-left-color: var(--color-success);
        }

        .toast-error {
          border-left-color: var(--color-error);
        }

        .toast-info {
          border-left-color: var(--color-info);
        }

        .toast-content strong {
          display: block;
          font-size: 0.875rem;
          font-weight: 700;
          margin-bottom: 2px;
        }

        .toast-content p {
          font-size: 0.775rem;
          color: var(--text-secondary);
        }

        @keyframes toastSlideIn {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
