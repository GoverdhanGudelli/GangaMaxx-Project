import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  ShoppingCart, 
  Truck, 
  BarChart3, 
  UserCircle2, 
  LogOut,
  Map
} from 'lucide-react';

export const MENU_ITEMS = [
  { path: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, allowedRoles: ['Sales Admin'] },
  { path: 'customers', label: 'Institutional CRM', icon: Users, allowedRoles: ['Sales Admin'] },
  { path: 'quotation-builder', label: 'Quotation Builder', icon: Package, allowedRoles: ['Sales Admin'] },
  { path: 'products', label: 'Product Catalog', icon: Package, allowedRoles: ['Sales Admin', 'Warehouse Staff', 'Customer'] },
  { path: 'orders', label: 'Bulk Orders', icon: ShoppingCart, allowedRoles: ['Sales Admin', 'Warehouse Staff'] },
  { path: 'delivery-tracker', label: 'Delivery Tracker', icon: Truck, allowedRoles: ['Sales Admin', 'Warehouse Staff', 'Delivery Driver'] },
  { path: 'reports', label: 'Reports & Analytics', icon: BarChart3, allowedRoles: ['Sales Admin'] },
  { path: 'customer-delivery-tracker', label: 'My Deliveries', icon: Map, allowedRoles: ['Customer'] },
  { path: 'profile', label: 'Profile', icon: UserCircle2, allowedRoles: ['Sales Admin', 'Warehouse Staff', 'Delivery Driver', 'Customer'] }
];

export default function Sidebar({ currentTab, setTab, user, onLogout }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <img src="/logo.png" alt="Ganga Maxx" className="sidebar-logo-img" />
      </div>

      <div className="sidebar-user">
        <div className="user-avatar">
          {user ? user.name[0] : 'A'}
        </div>
        <div className="user-info">
          <h4>{user ? user.name : 'User'}</h4>
          <span>{user ? user.role : 'Staff'}</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {MENU_ITEMS.filter(item => {
          return item.allowedRoles.includes(user?.role);
        }).map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.path;
          return (
            <button
              key={item.path}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setTab(item.path)}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <button className="nav-item logout-btn" onClick={onLogout}>
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
