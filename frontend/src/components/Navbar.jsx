import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { api } from '../services/api';
import { 
  Bell, 
  Search, 
  Settings, 
  Wifi, 
  ChevronDown,
  Info,
  CheckCircle
} from 'lucide-react';

export default function Navbar({ currentTab, user }) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (user?.employeeId) {
      fetchNotifs();
      const interval = setInterval(fetchNotifs, 15000); // poll every 15s
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchNotifs = async () => {
    try {
      const data = await api.getNotifications(user.employeeId);
      setNotifications(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const formatTime = (iso) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };


  const getPageTitle = (tab) => {
    switch (tab) {
      case 'dashboard': return 'Dashboard Hub';
      case 'customers': return 'Institutional CRM & Credit Accounts';
      case 'products': return 'B2B Product Catalog';
      case 'orders': return 'Bulk Order Portal';
      case 'delivery-tracker': return 'Last-Mile Delivery Operations';
      case 'reports': return 'Operational Analytics';
      case 'profile': return 'User Account Settings';
      default: return 'Ganga Maxx';
    }
  };

  return (
    <header className="navbar-header">
      <div className="navbar-left">
        <h2>{getPageTitle(currentTab)}</h2>
      </div>

      <div className="navbar-right">
        {/* Live Sync — hidden for now, coming in v2
        <div className="navbar-status-badge">
          <Wifi size={14} className="wifi-icon" />
          <span>Live Sync</span>
        </div>
        */}

        {/* Search Bar — hidden for now, coming in v2
        <div className="navbar-search">
          <Search size={16} className="search-icon" />
          <input type="text" placeholder="Search orders, clients, or runs..." />
        </div>
        */}

        {/* Notifications */}
        <div className="navbar-action-btn-wrapper">
          <button 
            className="navbar-action-btn" 
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell size={18} />
            {unreadCount > 0 && <span className="unread-dot"></span>}
          </button>

          {showNotifications && (
            <div className="notifications-dropdown card-solid">
              <div className="notif-header">
                <h4>System Notifications</h4>
                {unreadCount > 0 && (
                  <span onClick={() => notifications.filter(n => !n.read).forEach(n => handleMarkRead(n.id))} style={{ cursor: 'pointer', color: '#059669' }}>
                    Mark all read
                  </span>
                )}
              </div>
              <div className="notif-list">
                {notifications.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
                    No new notifications
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id} className={`notif-item ${!n.read ? 'unread' : ''}`}>
                      <div className="notif-icon-wrapper">
                        <Info size={16} />
                      </div>
                      <div className="notif-content">
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#0f172a' }}>{n.message}</p>
                        <span>{formatTime(n.createdAt)}</span>
                      </div>
                      {!n.read && (
                        <button 
                          onClick={() => handleMarkRead(n.id)}
                          style={{ background: 'none', border: 'none', color: '#0ea5e9', cursor: 'pointer', marginLeft: 'auto', alignSelf: 'flex-start' }}
                          title="Mark as read"
                        >
                          <CheckCircle size={14} />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Settings — hidden for now, coming in v2
        <button className="navbar-action-btn">
          <Settings size={18} />
        </button>
        */}

        <div className="navbar-profile-pill">
          <div className="avatar-mini">
            {user ? user.name[0] : 'A'}
          </div>
          <span>{user ? user.name : 'Admin User'}</span>
          <ChevronDown size={14} />
        </div>
      </div>
    </header>
  );
}
