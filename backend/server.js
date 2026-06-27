const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ==========================================
// IN-MEMORY GPS STORE (Live positions only)
// Structure: { [runId]: { lat, lng, driverName, vehicleNo, runNumber, timestamp } }
// ==========================================
const liveGpsStore = {};

// ==========================================
// SOCKET.IO — GPS & REAL-TIME EVENTS
// ==========================================
io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  // Driver broadcasts their GPS position
  // Payload: { runId, runNumber, driverName, vehicleNo, lat, lng }
  socket.on('driver_location_update', (data) => {
    const { runId, lat, lng, driverName, vehicleNo, runNumber } = data;
    if (!runId || lat == null || lng == null) return;

    // Update in-memory store with latest position
    liveGpsStore[runId] = {
      runId,
      lat,
      lng,
      driverName: driverName || 'Unknown Driver',
      vehicleNo: vehicleNo || '',
      runNumber: runNumber || '',
      timestamp: new Date().toISOString()
    };

    // Broadcast to all connected admin/dispatch clients
    io.emit('location_update', liveGpsStore[runId]);
  });

  // Driver signals they stopped sharing (run completed or left)
  socket.on('driver_location_stop', ({ runId }) => {
    if (runId && liveGpsStore[runId]) {
      delete liveGpsStore[runId];
      io.emit('location_stopped', { runId });
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

// ==========================================
// ROUTES
// ==========================================

// --- AUTH ---
app.post('/api/auth/login', async (req, res) => {
  try {
    const { employeeId, password } = req.body;
    
    if (!employeeId || !password) {
      return res.status(400).json({ error: 'Employee ID and password are required' });
    }

    const user = await prisma.user.findUnique({ where: { employeeId } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid Employee ID or password' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid Employee ID or password' });
    }

    // Success - return user data (without password hash)
    const { passwordHash, ...safeUser } = user;

    // Write audit log
    await prisma.auditLog.create({
      data: {
        employeeId: user.employeeId,
        userName: user.name,
        type: 'Session',
        message: `Session token verified for ${user.name} (${user.role})`
      }
    });

    res.json(safeUser);
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// --- CUSTOMER LOGIN ---
app.post('/api/auth/customer-login', async (req, res) => {
  try {
    const { customerId, password } = req.body;

    if (!customerId || !password) {
      return res.status(400).json({ error: 'Customer ID and password are required' });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    });

    if (!customer) {
      return res.status(401).json({ error: 'Invalid Customer ID' });
    }

    const isMatch = await bcrypt.compare(password, customer.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Success - return customer data masquerading as user session
    const { passwordHash, ...safeCustomer } = customer;
    
    // Set role to Customer so frontend knows how to route them
    const sessionData = {
      ...safeCustomer,
      role: 'Customer',
      employeeId: customer.id 
    };

    // Write audit log
    await prisma.auditLog.create({
      data: {
        employeeId: customer.id,
        userName: customer.name,
        type: 'Session',
        message: 'Customer Dashboard accessed via Secure Portal Login.'
      }
    });

    res.json(sessionData);
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error during customer login' });
  }
});

// --- AI LAYER ---
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });

    const lowerMsg = message.toLowerCase();
    let responseText = "I am your GangaMaxx AI Assistant. How can I help you today?";

    // 1. Recommend cleaning products
    if (lowerMsg.includes('hospital') || lowerMsg.includes('clinic')) {
      const products = await prisma.product.findMany({ where: { category: 'Sanitizers' } });
      responseText = `For medical facilities, I strongly recommend our **${products[0]?.name || 'Hospital Grade Sanitizer'}**. It meets strict compliance standards.`;
    } 
    // 2. Explain safe chemical handling requirements
    else if (lowerMsg.includes('safety') || lowerMsg.includes('msds') || lowerMsg.includes('bleach')) {
      const bleach = await prisma.product.findFirst({ where: { name: { contains: 'Bleach' } } });
      responseText = `**Safety Instructions for ${bleach?.name || 'Bleach'}**: ${bleach?.safety || 'Corrosive. Keep away from heat. Ventilate room.'} Always wear gloves!`;
    }
    // 3. Build cleaning kits
    else if (lowerMsg.includes('kit') || lowerMsg.includes('bundle')) {
      responseText = `**Custom Cleaning Kit**: I can bundle 'EcoSuds Liquid Soap 20L', 'Ganga Pine Floor Cleaner', and 'AeroFresh Spray' for a 15% discount. Should I generate the quotation?`;
    }
    // 4. Summarize institutional consumption
    else if (lowerMsg.includes('consumption') || lowerMsg.includes('report')) {
      responseText = `**Consumption Summary**: Apex International School typically orders 200L of Liquid Soap per quarter. They are due for a re-stock in 14 days.`;
    }
    // 5. Track Deliveries
    else if (lowerMsg.includes('delivery') || lowerMsg.includes('track') || lowerMsg.includes('order')) {
      responseText = `**Delivery Tracking**: To track an order, go to your 'My Deliveries' portal. Our drivers update the status live via their mobile app when they reach your location!`;
    }
    // 6. Pricing & Discounts
    else if (lowerMsg.includes('discount') || lowerMsg.includes('price') || lowerMsg.includes('tier')) {
      responseText = `**Contract Pricing**: We offer Tier-based contract pricing. **Platinum** tier receives 15% off, **Gold** receives 10%, and **Silver** receives 5%.`;
    }
    // 7. Support / Contact
    else if (lowerMsg.includes('contact') || lowerMsg.includes('support') || lowerMsg.includes('help')) {
      responseText = `**Customer Support**: For urgent support, please call the GangaMaxx Dispatch Center at **555-0199** or email **dispatch@gangamaxx.com**.`;
    }

    // 8. Company / About Ganga Maxx
    else if (lowerMsg.includes('ganga maxx') || lowerMsg.includes('company') || lowerMsg.includes('about')) {
      responseText = `**Ganga Maxx Marketplace** is a leading business operating in B2B cleaning and hygiene product sales. Our goal is to streamline institutional customer ordering, warehouse stock control, and last-mile delivery tracking to prevent wasted time and delayed follow-ups!`;
    }
    // 9. Delivery Tracker App / Features
    else if (lowerMsg.includes('features') || lowerMsg.includes('what can this app do') || lowerMsg.includes('what is this tracker')) {
      responseText = `The **B2B Cleaning Supplies Last-Mile Delivery Tracker** is our core platform! Features include:
- **Delivery Tracker**: Routes for drivers, capturing 'Signed By' and POD photos.
- **Quotation Builder**: Build custom bundles and apply bulk discounts.
- **Institutional CRM**: Manage customer tiers (Platinum/Gold).
- **Contract Pricing**: Dynamic catalog prices based on customer tiers.
- **Dual Authentication**: Green portal for internal Staff, Indigo portal for Institutional Customers.`;
    }
    // 10. Specific Feature Explanations
    else if (lowerMsg.includes('quotation builder') || lowerMsg.includes('quote')) {
      responseText = `**Quotation Builder**: A tool for our Sales Admins to select an Institutional Customer, bundle cleaning products, apply discretionary discounts (up to 15%), and instantly generate an Official Commercial Quotation that can be converted directly into a live Bulk Order!`;
    }
    else if (lowerMsg.includes('crm') || lowerMsg.includes('institutional crm')) {
      responseText = `**Institutional CRM**: Our centralized dashboard to manage B2B clients (hospitals, schools, hotels). It tracks their contact info, address, order history, and their pricing Tier.`;
    }
    else if (lowerMsg.includes('auth') || lowerMsg.includes('login') || lowerMsg.includes('portals')) {
      responseText = `**Dual Auth System**: We separate users! Internal Staff (Drivers, Admins) log in with an Employee ID and see internal dashboards. External Customers log in with a Customer ID and only see the public catalog and their own Delivery Timeline.`;
    }

    // Simulate AI typing delay
    await new Promise(resolve => setTimeout(resolve, 800));

    res.json({ reply: responseText });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'AI processing failed' });
  }
});

// --- PRODUCTS ---
app.get('/api/products', async (req, res) => {
  try {
    const products = await prisma.product.findMany();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- CUSTOMERS ---
app.get('/api/customers', async (req, res) => {
  try {
    const customers = await prisma.customer.findMany();
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/customers', async (req, res) => {
  try {
    const data = req.body;
    // Generate a simple ID like c5, c102, etc.
    const randomId = `c${Math.floor(Math.random() * 9000) + 1000}`;
    const newCustomer = await prisma.customer.create({
      data: {
        id: randomId,
        ...data
      }
    });
    res.json(newCustomer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

// --- ORDERS ---
app.get('/api/orders', async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        items: true,
      }
    });
    // Format response to match frontend expectations
    const formattedOrders = orders.map(o => ({
      ...o,
      items: o.items.map(i => ({
        productId: i.productId,
        name: i.name,
        qty: i.qty,
        price: i.price
      }))
    }));
    res.json(formattedOrders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST new order
app.post('/api/orders', async (req, res) => {
  try {
    const { customerId, customerName, total, items } = req.body;
    
    // Generate simple ID
    const randomId = `o${Math.floor(Math.random() * 90000) + 10000}`;
    const orderDate = new Date().toISOString().split('T')[0];

    const newOrder = await prisma.order.create({
      data: {
        id: randomId,
        customerId,
        customerName,
        total,
        status: 'Pending',
        orderDate,
        warehouse: 'Central Hub B',
        complianceCleared: true,
        items: {
          create: items.map(i => ({
            productId: i.productId || i.id,
            name: i.name,
            qty: i.qty || 1,
            price: i.price
          }))
        }
      },
      include: { items: true }
    });

    // Write audit log — credit to whoever made the request
    const actorId = req.headers['x-employee-id'] || 'system';
    const actorName = req.headers['x-user-name'] || 'System';
    await prisma.auditLog.create({
      data: {
        employeeId: actorId,
        userName: actorName,
        type: 'Order',
        message: `Bulk order ${randomId} logged for ${customerName} — ₹${total.toFixed(2)}`
      }
    });

    // Deduct Inventory Stock & Log
    for (const item of items) {
      const pid = item.productId || item.id;
      const qtyToDeduct = item.qty || 1;

      // Decrement stock (allows negative for backorders)
      await prisma.product.update({
        where: { id: pid },
        data: { stock: { decrement: qtyToDeduct } }
      });

      // Write Inventory Audit Log
      await prisma.auditLog.create({
        data: {
          employeeId: actorId,
          userName: actorName,
          type: 'Inventory',
          message: `Deducted ${qtyToDeduct} units of ${item.name} for Order ${randomId}.`
        }
      });
    }

    res.json(newOrder);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// --- DELIVERIES ---
app.get('/api/deliveries', async (req, res) => {
  try {
    const runs = await prisma.deliveryRun.findMany({
      include: {
        stops: {
          orderBy: { sequence: 'asc' }
        }
      }
    });
    res.json(runs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/deliveries', async (req, res) => {
  try {
    const { driverName, vehicleNo, stops } = req.body;
    
    const runsCount = await prisma.deliveryRun.count();
    const runNumber = `RUN-2026-00${runsCount + 9}`;
    
    // Create run and stops in a transaction
    const newRun = await prisma.deliveryRun.create({
      data: {
        runNumber,
        driverName,
        vehicleNo,
        date: new Date().toISOString().split('T')[0],
        status: 'Pending',
        stops: {
          create: stops.map((stop, index) => ({
            orderId: stop.orderId,
            customerName: stop.customerName,
            address: stop.address,
            sequence: index + 1,
            qty: stop.qty,
            status: 'Pending',
            deliveredQty: 0,
            failedReason: '',
            podPhoto: '',
            signedBy: ''
          }))
        }
      },
      include: { stops: true }
    });

    // Update the corresponding orders to 'Dispatched'
    const orderIds = stops.map(s => s.orderId);
    await prisma.order.updateMany({
      where: { id: { in: orderIds } },
      data: { status: 'Dispatched' }
    });

    // Mark vehicle as In Transit
    await prisma.vehicle.update({
      where: { plateNo: vehicleNo },
      data: { status: 'In Transit' }
    });

    // Find driver and send notification + audit log
    const driver = await prisma.user.findFirst({ where: { name: driverName, role: 'Delivery Driver' } });
    if (driver) {
      const newNotif = await prisma.notification.create({
        data: {
          employeeId: driver.employeeId,
          message: `New Route Assigned: ${runNumber} with ${stops.length} stops. Vehicle: ${vehicleNo}.`
        }
      });
      io.emit('new_notification', newNotif);
    }

    // Dispatch audit log — credit to whoever dispatched
    const dispatcherId = req.headers['x-employee-id'] || 'system';
    const dispatcherName = req.headers['x-user-name'] || 'System';
    await prisma.auditLog.create({
      data: {
        employeeId: dispatcherId,
        userName: dispatcherName,
        type: 'Dispatch',
        message: `${runNumber} dispatched — Driver: ${driverName} | Vehicle: ${vehicleNo} | ${stops.length} stop(s)`
      }
    });

    res.json(newRun);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/deliveries/:runId', async (req, res) => {
  try {
    const { runId } = req.params;
    
    const run = await prisma.deliveryRun.findUnique({
      where: { id: runId },
      include: { stops: true }
    });

    if (!run) return res.status(404).json({ error: 'Run not found' });

    // Mark vehicle available if not completed
    if (run.status !== 'Completed') {
      await prisma.vehicle.update({
        where: { plateNo: run.vehicleNo },
        data: { status: 'Available' }
      });
    }

    // Reset order statuses back to pending
    const orderIds = run.stops.map(s => s.orderId);
    if (orderIds.length > 0) {
      await prisma.order.updateMany({
        where: { id: { in: orderIds } },
        data: { status: 'Pending' }
      });
    }

    // Delete stops then run
    await prisma.deliveryStop.deleteMany({
      where: { deliveryRunId: runId }
    });
    
    await prisma.deliveryRun.delete({
      where: { id: runId }
    });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/deliveries/:runId/status', async (req, res) => {
  try {
    const { runId } = req.params;
    const { status } = req.body; // e.g. 'In Transit'

    let updatedRun = await prisma.deliveryRun.update({
      where: { id: runId },
      data: { status },
      include: { stops: true }
    });

    if (status === 'Completed') {
      // If completed, update all pending/in-transit stops to Delivered
      for (const stop of updatedRun.stops) {
        if (stop.status === 'Pending' || stop.status === 'In Transit') {
          await prisma.deliveryStop.update({
            where: { id: stop.id },
            data: { status: 'Delivered', deliveredQty: stop.qty }
          });
        }
      }
      updatedRun = await prisma.deliveryRun.findUnique({
        where: { id: runId },
        include: { stops: true }
      });

      // Free up the vehicle
      await prisma.vehicle.update({
        where: { plateNo: updatedRun.vehicleNo },
        data: { status: 'Available' }
      });
    }

    res.json(updatedRun);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/deliveries/:runId/stops/:orderId', async (req, res) => {
  try {
    const { runId, orderId } = req.params;
    const stopUpdate = req.body;

    // Find the stop
    const stop = await prisma.deliveryStop.findFirst({
      where: { deliveryRunId: runId, orderId }
    });

    if (!stop) return res.status(404).json({ error: 'Stop not found' });

    // Update the stop
    await prisma.deliveryStop.update({
      where: { id: stop.id },
      data: stopUpdate
    });

    // Update main order status
    await prisma.order.update({
      where: { id: orderId },
      data: { status: stopUpdate.status }
    });

    // Write audit log for delivery stop update — credit the actual actor
    const actorId = req.headers['x-employee-id'] || 'system';
    const actorName = req.headers['x-user-name'] || 'System';
    const logMsg = stopUpdate.status === 'Delivered'
      ? `Stop delivered to ${stop.customerName} — Signed by: ${stopUpdate.signedBy || 'N/A'} | Qty: ${stopUpdate.deliveredQty}`
      : `Stop FAILED at ${stop.customerName} — Reason: ${stopUpdate.failedReason}`;
    await prisma.auditLog.create({
      data: { employeeId: actorId, userName: actorName, type: 'Dispatch', message: logMsg }
    });

    // Auto-update run status based on stops
    const runStops = await prisma.deliveryStop.findMany({
      where: { deliveryRunId: runId }
    });

    const allDone = runStops.every(s => s.status === 'Delivered' || s.status === 'Failed');
    const anyInTransit = runStops.some(s => s.status === 'In Transit' || s.status === 'Delivered');

    let runStatus = 'Pending';
    if (allDone) runStatus = 'Completed';
    else if (anyInTransit) runStatus = 'In Transit';

    const updatedRun = await prisma.deliveryRun.update({
      where: { id: runId },
      data: { status: runStatus },
      include: { stops: true }
    });

    if (runStatus === 'Completed') {
      // Free up the vehicle
      await prisma.vehicle.update({
        where: { plateNo: updatedRun.vehicleNo },
        data: { status: 'Available' }
      });
    }

    res.json(updatedRun);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// --- STATS ---
app.get('/api/stats', async (req, res) => {
  try {
    const products = await prisma.product.findMany();
    const orders = await prisma.order.findMany();
    const deliveries = await prisma.deliveryRun.findMany({ include: { stops: true }});

    const totalOrders = orders.length;
    const pendingOrders = orders.filter(o => o.status === 'Pending').length;
    const activeRuns = deliveries.filter(d => d.status === 'In Transit' || d.status === 'Pending').length;
    const completedDeliveries = orders.filter(o => o.status === 'Delivered').length;

    const totalRevenue = orders.reduce((sum, o) => sum + (o.status === 'Delivered' ? o.total : 0), 0);
    const pendingRevenue = orders.reduce((sum, o) => sum + (o.status === 'Pending' || o.status === 'Dispatched' ? o.total : 0), 0);

    const pendingComplianceAlerts = products.filter(p => !p.msds).length;
    
    let totalStops = 0;
    let successfulStops = 0;
    let failedStops = 0;
    deliveries.forEach(run => {
      run.stops.forEach(stop => {
        totalStops++;
        if (stop.status === 'Delivered') successfulStops++;
        if (stop.status === 'Failed') failedStops++;
      });
    });

    const deliverySuccessRate = totalStops > 0 ? Math.round((successfulStops / totalStops) * 100) : 100;
    const stockAlerts = products.filter(p => p.stock < 50).length;

    res.json({
      totalOrders,
      pendingOrders,
      activeRuns,
      completedDeliveries,
      totalRevenue,
      pendingRevenue,
      pendingComplianceAlerts,
      deliverySuccessRate,
      stockAlerts
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// --- FLEET & NOTIFICATIONS ---
app.get('/api/vehicles', async (req, res) => {
  try {
    const vehicles = await prisma.vehicle.findMany();
    res.json(vehicles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/drivers/available', async (req, res) => {
  try {
    const drivers = await prisma.user.findMany({ where: { role: 'Delivery Driver' } });
    const activeRuns = await prisma.deliveryRun.findMany({
      where: { status: { in: ['Pending', 'In Transit'] } }
    });
    const busyDriverNames = activeRuns.map(r => r.driverName);
    
    const availableDrivers = drivers.filter(d => !busyDriverNames.includes(d.name));
    res.json({ available: availableDrivers, all: drivers });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/notifications/:employeeId', async (req, res) => {
  try {
    const notifs = await prisma.notification.findMany({
      where: { employeeId: req.params.employeeId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(notifs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/notifications/:id/read', async (req, res) => {
  try {
    const notif = await prisma.notification.update({
      where: { id: parseInt(req.params.id) },
      data: { read: true }
    });
    res.json(notif);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- AUDIT LOGS ---
app.get('/api/audit-logs/:employeeId', async (req, res) => {
  try {
    const logs = await prisma.auditLog.findMany({
      where: { employeeId: req.params.employeeId },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- LIVE GPS ---
// Returns the last known GPS position of all currently active runs
app.get('/api/gps/active', (req, res) => {
  res.json(Object.values(liveGpsStore));
});

// --- SALESMAN VISITS ---
app.get('/api/visits', async (req, res) => {
  try {
    const visits = await prisma.visit.findMany({
      orderBy: { visitDate: 'desc' }
    });
    res.json(visits);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/visits', async (req, res) => {
  try {
    const { salesmanName, customerName, notes, followUpRequired, repeatReorderCheckbox } = req.body;

    if (!salesmanName || !customerName || !notes) {
      return res.status(400).json({ error: 'salesmanName, customerName, and notes are required' });
    }

    const visitId = `v${Date.now()}`;
    const visitDate = new Date().toISOString().split('T')[0];

    const newVisit = await prisma.visit.create({
      data: {
        id: visitId,
        salesmanName,
        customerName,
        visitDate,
        notes,
        followUpRequired: followUpRequired ?? false,
        repeatReorderCheckbox: repeatReorderCheckbox ?? false
      }
    });

    // Audit log
    const actorId = req.headers['x-employee-id'] || 'system';
    const actorName = req.headers['x-user-name'] || salesmanName;
    await prisma.auditLog.create({
      data: {
        employeeId: actorId,
        userName: actorName,
        type: 'Session',
        message: `Field visit logged by ${salesmanName} at ${customerName}${followUpRequired ? ' — Follow-up required' : ''}`
      }
    });

    res.json(newVisit);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});


// --- HEALTH CHECK & KEEP-ALIVE PINGER ---
const https = require('https');
const http = require('http');

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PING_URL = process.env.PING_URL;
if (PING_URL) {
  console.log(`[Pinger] Self-pinger activated for URL: ${PING_URL}`);
  setInterval(() => {
    const client = PING_URL.startsWith('https') ? https : http;
    client.get(PING_URL, (res) => {
      console.log(`[Pinger] Self-ping status: ${res.statusCode} at ${new Date().toISOString()}`);
    }).on('error', (err) => {
      console.error('[Pinger] Self-ping error:', err.message);
    });
  }, 13 * 60 * 1000); // 13 minutes (Render free tier sleeps after 15 minutes of inactivity)
}

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
