const BASE_URL = 'http://localhost:5000/api';

const fetchAPI = async (endpoint, options = {}) => {
  // Read current session to attach actor identity to every request
  let employeeId = '';
  let userName = '';
  try {
    const session = JSON.parse(localStorage.getItem('gm_session') || '{}');
    employeeId = session.employeeId || '';
    userName = session.name || '';
  } catch (_) {}

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Employee-Id': employeeId,
      'X-User-Name': userName,
      ...options.headers,
    },
  });
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
  addProduct: async (product) => {
    console.warn('addProduct not yet supported by new backend');
  },
  updateProduct: async (id, updatedData) => {
    console.warn('updateProduct not yet supported by new backend');
  },

  // Customers
  getCustomers: async () => {
    const custs = await fetchAPI('/customers');
    return custs.map(c => {
      // Hardcoded Ranga Reddy district coordinates for the demo
      let lat = 17.2570;
      let lng = 78.4350;
      if (c.id === 'c1') { lat = 17.3080; lng = 78.1360; } // Chevella
      else if (c.id === 'c2') { lat = 17.3275; lng = 78.2728; } // Moinabad
      else if (c.id === 'c3') { lat = 17.1950; lng = 78.6465; } // Ibrahimpatnam
      else { 
        lat = 17.2 + (Math.random() * 0.15); 
        lng = 78.2 + (Math.random() * 0.4); 
      }
      return { ...c, lat, lng };
    });
  },
  addCustomer: async (customer) => fetchAPI('/customers', {
    method: 'POST',
    body: JSON.stringify(customer)
  }),
  updateCustomer: async (id, updatedData) => {
    console.warn('updateCustomer not yet supported by new backend');
  },

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

