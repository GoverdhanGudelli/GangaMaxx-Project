const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

const INITIAL_USERS = [
  { employeeId: 'E1001', name: 'Arjun Mehta', role: 'Sales Admin', password: 'password123' },
  { employeeId: 'E1002', name: 'Raghav Kumar', role: 'Delivery Driver', password: 'password123' },
  { employeeId: 'E1003', name: 'Priya Sharma', role: 'Warehouse Staff', password: 'password123' },
  { employeeId: 'E1004', name: 'Sanjay Reddy', role: 'Delivery Driver', password: 'password123' },
];

const INITIAL_PRODUCTS = [
  { id: 'p1', name: 'MaxxClean Sanitizer 5L', sku: 'MX-SAN-005', category: 'Sanitizers', stock: 120, price: 45.00, msds: true, safety: 'Wear gloves. Do not mix with acid.' },
  { id: 'p2', name: 'Ganga Pine Floor Cleaner 10L', sku: 'GG-FLR-010', category: 'Floor Care', stock: 85, price: 65.00, msds: true, safety: 'Skin irritant. Dilute 1:50 with water.' },
  { id: 'p3', name: 'EcoSuds Liquid Soap 20L', sku: 'EC-SOAP-020', category: 'Hand Hygiene', stock: 200, price: 95.00, msds: true, safety: 'Eye contact: Rinse immediately. Bio-degradable.' },
  { id: 'p4', name: 'HypoGlow Bleach Concentrate 5L', sku: 'HP-BLC-005', category: 'Disinfectants', stock: 45, price: 32.00, msds: true, safety: 'Corrosive. Keep away from heat. Ventilate room.' },
  { id: 'p5', name: 'AeroFresh Deodorizer Spray 1L', sku: 'AE-DEO-001', category: 'Air Care', stock: 160, price: 18.50, msds: false, safety: 'Flammable aerosol. Do not spray near open fire.' },
  { id: 'p6', name: 'GermShield Disinfectant Wipes 200ct', sku: 'GS-WIPE-200', category: 'Disinfectants', stock: 300, price: 22.00, msds: false, safety: 'Avoid contact with eyes. Keep out of reach of children.' },
  { id: 'p7', name: 'UltraGloss Window Cleaner 5L', sku: 'UG-WIN-005', category: 'Surface Care', stock: 60, price: 38.00, msds: false, safety: 'Non-toxic. Avoid prolonged skin contact.' },
];

const INITIAL_CUSTOMERS = [
  { id: 'c1', name: 'St. Jude General Hospital', type: 'Hospital', tier: 'Platinum', creditLimit: 10000, creditBalance: 4200, creditStatus: 'Good', address: '45 Health Boulevard, North Wing, Chevella' },
  { id: 'c2', name: 'Apex International School', type: 'School', tier: 'Gold', creditLimit: 5000, creditBalance: 5200, creditStatus: 'Overlimit', address: '12 Academy Crescent, Sector 4, Moinabad' },
  { id: 'c3', name: 'Grand Royal Hotel & Suites', type: 'Hotel', tier: 'Platinum', creditLimit: 15000, creditBalance: 8500, creditStatus: 'Good', address: '88 Hospitality Marina, Beachfront, Ibrahimpatnam' },
  { id: 'c4', name: 'QuickClean Janitorial Supplies', type: 'Dealer', tier: 'Silver', creditLimit: 3000, creditBalance: 1200, creditStatus: 'Good', address: '6 Industrial Hub, Warehouse A, Rajendra Nagar' },
  { id: 'c5', name: 'MediCare Diagnostics Centre', type: 'Hospital', tier: 'Gold', creditLimit: 8000, creditBalance: 3100, creditStatus: 'Good', address: '22 Diagnostic Lane, Banjara Hills' },
  { id: 'c6', name: 'Sunrise Residency Hotel', type: 'Hotel', tier: 'Silver', creditLimit: 4000, creditBalance: 1800, creditStatus: 'Good', address: '14 Ring Road, Mehdipatnam' },
];

const INITIAL_ORDERS = [
  { id: 'o101', customerId: 'c1', customerName: 'St. Jude General Hospital', items: [{ productId: 'p1', name: 'MaxxClean Sanitizer 5L', qty: 10, price: 45.00 }, { productId: 'p3', name: 'EcoSuds Liquid Soap 20L', qty: 5, price: 95.00 }], total: 925.00, status: 'Dispatched', orderDate: '2026-06-04', warehouse: 'Central Hub B', complianceCleared: true },
  { id: 'o102', customerId: 'c3', customerName: 'Grand Royal Hotel & Suites', items: [{ productId: 'p2', name: 'Ganga Pine Floor Cleaner 10L', qty: 15, price: 60.00 }, { productId: 'p5', name: 'AeroFresh Deodorizer Spray 1L', qty: 20, price: 18.50 }], total: 1270.00, status: 'Pending', orderDate: '2026-06-05', warehouse: 'North Depot', complianceCleared: true },
  { id: 'o103', customerId: 'c2', customerName: 'Apex International School', items: [{ productId: 'p1', name: 'MaxxClean Sanitizer 5L', qty: 5, price: 45.00 }, { productId: 'p4', name: 'HypoGlow Bleach Concentrate 5L', qty: 8, price: 32.00 }], total: 481.00, status: 'Delivered', orderDate: '2026-06-03', warehouse: 'Central Hub B', complianceCleared: true },
  { id: 'o104', customerId: 'c4', customerName: 'QuickClean Janitorial Supplies', items: [{ productId: 'p3', name: 'EcoSuds Liquid Soap 20L', qty: 10, price: 90.00 }], total: 900.00, status: 'Pending', orderDate: '2026-06-05', warehouse: 'Central Hub B', complianceCleared: true },
  { id: 'o105', customerId: 'c5', customerName: 'MediCare Diagnostics Centre', items: [{ productId: 'p6', name: 'GermShield Disinfectant Wipes 200ct', qty: 20, price: 22.00 }, { productId: 'p4', name: 'HypoGlow Bleach Concentrate 5L', qty: 6, price: 32.00 }], total: 632.00, status: 'Dispatched', orderDate: '2026-06-10', warehouse: 'Central Hub B', complianceCleared: true },
  { id: 'o106', customerId: 'c6', customerName: 'Sunrise Residency Hotel', items: [{ productId: 'p7', name: 'UltraGloss Window Cleaner 5L', qty: 8, price: 38.00 }, { productId: 'p2', name: 'Ganga Pine Floor Cleaner 10L', qty: 5, price: 65.00 }], total: 629.00, status: 'Pending', orderDate: '2026-06-12', warehouse: 'North Depot', complianceCleared: false },
  { id: 'o107', customerId: 'c1', customerName: 'St. Jude General Hospital', items: [{ productId: 'p3', name: 'EcoSuds Liquid Soap 20L', qty: 8, price: 95.00 }, { productId: 'p6', name: 'GermShield Disinfectant Wipes 200ct', qty: 30, price: 22.00 }], total: 1420.00, status: 'Pending', orderDate: '2026-06-14', warehouse: 'Central Hub B', complianceCleared: true },
];

const INITIAL_DELIVERIES = [
  {
    id: 'run-1', runNumber: 'RUN-2026-008', driverName: 'Raghav Kumar', vehicleNo: 'TG-03-EP-4580', date: '2026-06-05', status: 'In Transit',
    stops: [
      { orderId: 'o101', customerName: 'St. Jude General Hospital', address: '45 Health Boulevard, Chevella', sequence: 1, qty: 15, status: 'Delivered', deliveredQty: 15, failedReason: '', podPhoto: '', signedBy: 'Dr. Ramesh Pillai' },
      { orderId: 'o102', customerName: 'Grand Royal Hotel & Suites', address: '88 Hospitality Marina, Ibrahimpatnam', sequence: 2, qty: 35, status: 'In Transit', deliveredQty: 0, failedReason: '', podPhoto: '', signedBy: '' }
    ]
  },
  {
    id: 'run-2', runNumber: 'RUN-2026-007', driverName: 'Sanjay Reddy', vehicleNo: 'TG-01-MJ-8822', date: '2026-06-04', status: 'Completed',
    stops: [
      { orderId: 'o103', customerName: 'Apex International School', address: '12 Academy Crescent, Moinabad', sequence: 1, qty: 13, status: 'Delivered', deliveredQty: 13, failedReason: '', podPhoto: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d', signedBy: 'Dr. Anita Desai' }
    ]
  },
  {
    id: 'run-3', runNumber: 'RUN-2026-009', driverName: 'Raghav Kumar', vehicleNo: 'TG-03-EP-4580', date: '2026-06-10', status: 'Completed',
    stops: [
      { orderId: 'o105', customerName: 'MediCare Diagnostics Centre', address: '22 Diagnostic Lane, Banjara Hills', sequence: 1, qty: 26, status: 'Delivered', deliveredQty: 26, failedReason: '', podPhoto: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae', signedBy: 'Mr. Venkat Rao' }
    ]
  },
  {
    id: 'run-4', runNumber: 'RUN-2026-010', driverName: 'Sanjay Reddy', vehicleNo: 'TG-01-MJ-8822', date: '2026-06-12', status: 'Pending',
    stops: [
      { orderId: 'o106', customerName: 'Sunrise Residency Hotel', address: '14 Ring Road, Mehdipatnam', sequence: 1, qty: 13, status: 'Pending', deliveredQty: 0, failedReason: '', podPhoto: '', signedBy: '' },
      { orderId: 'o104', customerName: 'QuickClean Janitorial Supplies', address: '6 Industrial Hub, Rajendra Nagar', sequence: 2, qty: 10, status: 'Pending', deliveredQty: 0, failedReason: '', podPhoto: '', signedBy: '' }
    ]
  },
];

const INITIAL_VISITS = [
  { id: 'v1', salesmanName: 'Arjun Mehta', customerName: 'Apex International School', visitDate: '2026-06-04', notes: 'Facility manager requesting additional floor cleaners for school reopening. Requested contract discount quote.', followUpRequired: true, repeatReorderCheckbox: false },
  { id: 'v2', salesmanName: 'Arjun Mehta', customerName: 'Grand Royal Hotel & Suites', visitDate: '2026-06-03', notes: 'General stock check. Everything is in order. Discussed sanitizing wipes potential upsell.', followUpRequired: false, repeatReorderCheckbox: true },
  { id: 'v3', salesmanName: 'Arjun Mehta', customerName: 'MediCare Diagnostics Centre', visitDate: '2026-06-09', notes: 'New client acquisition visit. Impressed with Platinum tier pricing. Interested in quarterly contract for disinfectants and wipes.', followUpRequired: true, repeatReorderCheckbox: false },
  { id: 'v4', salesmanName: 'Arjun Mehta', customerName: 'St. Jude General Hospital', visitDate: '2026-06-13', notes: 'Routine check-in. Hospital expanding ICU ward — expects 30% higher sanitizer consumption next quarter. Flagged for proactive stock reservation.', followUpRequired: true, repeatReorderCheckbox: true },
  { id: 'v5', salesmanName: 'Arjun Mehta', customerName: 'Sunrise Residency Hotel', visitDate: '2026-06-12', notes: 'New Silver-tier onboarding. First-time bulk order placed. Needs follow-up on compliance form submission.', followUpRequired: true, repeatReorderCheckbox: false },
];

const INITIAL_VEHICLES = [
  { id: 'v001', plateNo: 'TG-03-EP-4580', model: 'Tata Ace Gold', status: 'In Use' },
  { id: 'v002', plateNo: 'TG-01-MJ-8822', model: 'Ashok Leyland DOST+', status: 'Available' },
  { id: 'v003', plateNo: 'TG-05-RK-2210', model: 'Mahindra Jeeto', status: 'Available' },
];

async function main() {
  console.log('Clearing existing tables...');
  try { await prisma.liveGps.deleteMany({}); } catch (_) {}
  await prisma.auditLog.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.visit.deleteMany({});
  await prisma.deliveryStop.deleteMany({});
  await prisma.deliveryRun.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.vehicle.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('Seeding users...');
  for (const u of INITIAL_USERS) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { employeeId: u.employeeId },
      update: {},
      create: { employeeId: u.employeeId, name: u.name, role: u.role, passwordHash }
    });
  }

  console.log('Seeding products...');
  for (const p of INITIAL_PRODUCTS) {
    await prisma.product.create({ data: p });
  }

  console.log('Seeding customers...');
  const defaultHash = await bcrypt.hash('password123', 10);
  for (const c of INITIAL_CUSTOMERS) {
    await prisma.customer.create({ data: { ...c, passwordHash: defaultHash } });
  }

  console.log('Seeding orders...');
  for (const o of INITIAL_ORDERS) {
    await prisma.order.create({
      data: {
        id: o.id, customerId: o.customerId, customerName: o.customerName,
        total: o.total, status: o.status, orderDate: o.orderDate,
        warehouse: o.warehouse, complianceCleared: o.complianceCleared,
        items: { create: o.items.map(i => ({ productId: i.productId, name: i.name, qty: i.qty, price: i.price })) }
      }
    });
  }

  console.log('Seeding delivery runs...');
  for (const d of INITIAL_DELIVERIES) {
    await prisma.deliveryRun.create({
      data: {
        id: d.id, runNumber: d.runNumber, driverName: d.driverName,
        vehicleNo: d.vehicleNo, date: d.date, status: d.status,
        stops: { create: d.stops.map(s => ({ orderId: s.orderId, customerName: s.customerName, address: s.address, sequence: s.sequence, qty: s.qty, status: s.status, deliveredQty: s.deliveredQty, failedReason: s.failedReason, podPhoto: s.podPhoto, signedBy: s.signedBy })) }
      }
    });
  }

  console.log('Seeding visits...');
  for (const v of INITIAL_VISITS) {
    await prisma.visit.create({ data: v });
  }

  console.log('Seeding vehicles...');
  for (const v of INITIAL_VEHICLES) {
    await prisma.vehicle.create({ data: v });
  }

  console.log('Seeding sample notifications...');
  await prisma.notification.createMany({
    data: [
      { employeeId: 'E1001', message: '🚨 Apex International School credit limit exceeded by ₹200 — review before dispatching new orders.', read: false },
      { employeeId: 'E1001', message: '📦 RUN-2026-008 is currently In Transit — Raghav Kumar has completed Stop 1.', read: false },
      { employeeId: 'E1001', message: '✅ RUN-2026-009 completed — MediCare Diagnostics delivery signed off by Mr. Venkat Rao.', read: true },
      { employeeId: 'E1003', message: '⚠️ HypoGlow Bleach stock is low (45 units) — consider raising a purchase order.', read: false },
    ]
  });

  console.log('✅ Seeding completed successfully!');
  console.log('');
  console.log('Login credentials:');
  console.log('  Staff:    E1001, E1002, E1003, E1004 — password: password123');
  console.log('  Customer: c1, c2, c3, c4, c5, c6   — password: password123');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
