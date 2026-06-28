
const BASE_URL = import.meta.env.VITE_API_URL || 'https://gangamaxx-project.onrender.com/api';

const fetchAPI = async (endpoint, options = {}) => {
  let employeeId = '';
  let userName = '';
  let token = '';
  try {
    const session = JSON.parse(localStorage.getItem('gm_session') || '{}');
    employeeId = session.employeeId || '';
    userName = session.name || '';
    token = session.token || localStorage.getItem('gm_token') || '';
  } catch (_) { }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Employee-Id': employeeId,
      'X-User-Name': userName,
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  // Auto-logout on token expiry
  if (res.status === 401) {
    localStorage.removeItem('gm_session');
    localStorage.removeItem('gm_token');
    if (window.location.pathname !== '/') window.location.href = '/';
    throw new Error('Session expired. Please log in again.');
  }

  if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
  return res.json();
};


export const api = {
  // Auth
  login: async (employeeId, password) => fetchAPI('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ employeeId, password }),
  }),
  customerLogin: async (customerId, password) => fetchAPI('/auth/customer-login', {
    method: 'POST',
    body: JSON.stringify({ customerId, password }),
  }),

  // AI Assistant
  chat: async (message) => fetchAPI('/ai/chat', {
    method: 'POST',
    body: JSON.stringify({ message }),
  }),

  // Products
  getProducts: async () => fetchAPI('/products'),
  addProduct: async (product) => fetchAPI('/products', {
    method: 'POST',
    body: JSON.stringify(product),
  }),
  updateProduct: async (id, updatedData) => fetchAPI(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updatedData),
  }),
  deleteProduct: async (id) => fetchAPI(`/products/${id}`, {
    method: 'DELETE',
  }),

  // Customers
  getCustomers: async () => {
    const custs = await fetchAPI('/customers');
    return custs.map(c => {
      let lat = 17.2570;
      let lng = 78.4350;
      if (c.id === 'c1') { lat = 17.3080; lng = 78.1360; }
      else if (c.id === 'c2') { lat = 17.3275; lng = 78.2728; }
      else if (c.id === 'c3') { lat = 17.1950; lng = 78.6465; }
      else { lat = 17.2 + (Math.random() * 0.15); lng = 78.2 + (Math.random() * 0.4); }
      return { ...c, lat, lng };
    });
  },
  addCustomer: async (customer) => fetchAPI('/customers', {
    method: 'POST',
    body: JSON.stringify(customer)
  }),
  updateCustomer: async (id, updatedData) => fetchAPI(`/customers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updatedData),
  }),

  // Orders
  getOrders: async () => fetchAPI('/orders'),
  addOrder: async (order) => fetchAPI('/orders', {
    method: 'POST',
    body: JSON.stringify(order),
  }),
  updateOrderStatus: async (id, status) => {
    console.warn('updateOrderStatus not yet supported by new backend. Use updateStopStatus instead.');
  },

  // Delivery Runs
  getDeliveries: async () => fetchAPI('/deliveries'),
  addDeliveryRun: async (run) => fetchAPI('/deliveries', {
    method: 'POST',
    body: JSON.stringify(run),
  }),
  updateRunStatus: async (runId, status) => fetchAPI(`/deliveries/${runId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  }),
  deleteDeliveryRun: async (runId) => fetchAPI(`/deliveries/${runId}`, {
    method: 'DELETE',
  }),
  updateStopStatus: async (runId, orderId, stopUpdate) => fetchAPI(`/deliveries/${runId}/stops/${orderId}`, {
    method: 'PUT',
    body: JSON.stringify(stopUpdate),
  }),

  // Visits
  getVisits: async () => fetchAPI('/visits'),
  addVisit: async (visit) => fetchAPI('/visits', {
    method: 'POST',
    body: JSON.stringify(visit)
  }),


  // Fleet & Notifications
  getVehicles: async () => fetchAPI('/vehicles'),
  getAvailableDrivers: async () => fetchAPI('/drivers/available'),
  getNotifications: async (employeeId) => fetchAPI(`/notifications/${employeeId}`),
  markNotificationRead: async (id) => fetchAPI(`/notifications/${id}/read`, { method: 'PUT' }),

  // Audit Logs
  getAuditLogs: async (employeeId) => fetchAPI(`/audit-logs/${employeeId}`),

  // Dashboards / Statistics
  getStats: async () => fetchAPI('/stats')
};

