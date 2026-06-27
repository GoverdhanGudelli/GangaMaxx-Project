const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

const INITIAL_USERS = [
  { employeeId: 'E1001', name: 'Arjun Mehta', role: 'Sales Admin', password: 'password123' },
  { employeeId: 'E1002', name: 'Raghav', role: 'Delivery Driver', password: 'password123' },
  { employeeId: 'E1003', name: 'Warehouse Staff', role: 'Warehouse Staff', password: 'password123' }
];

const INITIAL_PRODUCTS = [
  { id: 'p1', name: 'MaxxClean Sanitizer 5L', sku: 'MX-SAN-005', category: 'Sanitizers', stock: 120, price: 45.00, msds: true, safety: 'Wear gloves. Do not mix with acid.' },
  { id: 'p2', name: 'Ganga Pine Floor Cleaner 10L', sku: 'GG-FLR-010', category: 'Floor Care', stock: 85, price: 65.00, msds: true, safety: 'Skin irritant. Dilute 1:50 with water.' },
  { id: 'p3', name: 'EcoSuds Liquid Soap 20L', sku: 'EC-SOAP-020', category: 'Hand Hygiene', stock: 200, price: 95.00, msds: true, safety: 'Eye contact: Rinse immediately. Bio-degradable.' },
  { id: 'p4', name: 'HypoGlow Bleach Concentrate 5L', sku: 'HP-BLC-005', category: 'Disinfectants', stock: 45, price: 32.00, msds: true, safety: 'Corrosive. Keep away from heat. Ventilate room.' },
  { id: 'p5', name: 'AeroFresh Deodorizer Spray 1L', sku: 'AE-DEO-001', category: 'Air Care', stock: 160, price: 18.50, msds: false, safety: 'Flammable aerosol. Do not spray near open fire.' }
];

const INITIAL_CUSTOMERS = [
  { id: 'c1', name: 'St. Jude General Hospital', type: 'Hospital', tier: 'Platinum', creditLimit: 10000, creditBalance: 4200, creditStatus: 'Good', address: '45 Health Boulevard, North Wing' },
  { id: 'c2', name: 'Apex International School', type: 'School', tier: 'Gold', creditLimit: 5000, creditBalance: 5200, creditStatus: 'Overlimit', address: '12 Academy Crescent, Sector 4' },
  { id: 'c3', name: 'Grand Royal Hotel & Suites', type: 'Hotel', tier: 'Platinum', creditLimit: 15000, creditBalance: 8500, creditStatus: 'Good', address: '88 Hospitality Marina, Beachfront' },
  { id: 'c4', name: 'QuickClean Janitorial Supplies', type: 'Dealer', tier: 'Silver', creditLimit: 3000, creditBalance: 1200, creditStatus: 'Good', address: '6 Industrial Hub, Warehouse A' }
];

const INITIAL_ORDERS = [
  { id: 'o101', customerId: 'c1', customerName: 'St. Jude General Hospital', items: [{ productId: 'p1', name: 'MaxxClean Sanitizer 5L', qty: 10, price: 45.00 }, { productId: 'p3', name: 'EcoSuds Liquid Soap 20L', qty: 5, price: 95.00 }], total: 925.00, status: 'Dispatched', orderDate: '2026-06-04', warehouse: 'Central Hub B', complianceCleared: true },
  { id: 'o102', customerId: 'c3', customerName: 'Grand Royal Hotel & Suites', items: [{ productId: 'p2', name: 'Ganga Pine Floor Cleaner 10L', qty: 15, price: 60.00 }, { productId: 'p5', name: 'AeroFresh Deodorizer Spray 1L', qty: 20, price: 18.50 }], total: 1270.00, status: 'Pending', orderDate: '2026-06-05', warehouse: 'North Depot', complianceCleared: true },
  { id: 'o103', customerId: 'c2', customerName: 'Apex International School', items: [{ productId: 'p1', name: 'MaxxClean Sanitizer 5L', qty: 5, price: 45.00 }, { productId: 'p4', name: 'HypoGlow Bleach Concentrate 5L', qty: 8, price: 32.00 }], total: 481.00, status: 'Delivered', orderDate: '2026-06-03', warehouse: 'Central Hub B', complianceCleared: true },
  { id: 'o104', customerId: 'c4', customerName: 'QuickClean Janitorial Supplies', items: [{ productId: 'p3', name: 'EcoSuds Liquid Soap 20L', qty: 10, price: 90.00 }], total: 900.00, status: 'Pending', orderDate: '2026-06-05', warehouse: 'Central Hub B', complianceCleared: true }
];

const INITIAL_DELIVERIES = [
  {
    id: 'run-1', runNumber: 'RUN-2026-008', driverName: 'Raghav', vehicleNo: 'TG-03-EP-4580', date: '2026-06-05', status: 'In Transit',
    stops: [
      { orderId: 'o101', customerName: 'St. Jude General Hospital', address: '45 Health Boulevard, North Wing', sequence: 1, qty: 15, status: 'In Transit', deliveredQty: 15, failedReason: '', podPhoto: '', signedBy: '' },
      { orderId: 'o102', customerName: 'Grand Royal Hotel & Suites', address: '88 Hospitality Marina, Beachfront', sequence: 2, qty: 35, status: 'Pending', deliveredQty: 0, failedReason: '', podPhoto: '', signedBy: '' }
    ]
  },
  {
    id: 'run-2', runNumber: 'RUN-2026-007', driverName: 'Sanjay Kumar', vehicleNo: 'TG-01-MJ-8822', date: '2026-06-04', status: 'Completed',
    stops: [
      { orderId: 'o103', customerName: 'Apex International School', address: '12 Academy Crescent, Sector 4', sequence: 1, qty: 13, status: 'Delivered', deliveredQty: 13, failedReason: '', podPhoto: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d', signedBy: 'Dr. Anita Desai' }
    ]
  }
];

const INITIAL_VISITS = [
  { id: 'v1', salesmanName: 'Arjun Mehta', customerName: 'Apex International School', visitDate: '2026-06-04', notes: 'Facility manager requesting additional floor cleaners for school reopening. Requested contract discount quote.', followUpRequired: true, repeatReorderCheckbox: false },
  { id: 'v2', salesmanName: 'Arjun Mehta', customerName: 'Grand Royal Hotel & Suites', visitDate: '2026-06-03', notes: 'General stock check. Everything is in order. Discussed sanitizing wipes.', followUpRequired: false, repeatReorderCheckbox: true }
];

async function main() {
  console.log('Seeding database...');
  
  // Users
  for (const u of INITIAL_USERS) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(u.password, salt);
    await prisma.user.upsert({
      where: { employeeId: u.employeeId },
      update: {},
      create: {
        employeeId: u.employeeId,
        name: u.name,
        role: u.role,
        passwordHash: passwordHash
      }
    });
  }
  
  // Products
  for (const p of INITIAL_PRODUCTS) {
    await prisma.product.create({ data: p });
  }

  // Customers
  const defaultCustomerHash = await bcrypt.hash('password123', 10);
  for (const c of INITIAL_CUSTOMERS) {
    await prisma.customer.create({
      data: {
        ...c,
        passwordHash: defaultCustomerHash
      }
    });
  }

  // Orders
  for (const o of INITIAL_ORDERS) {
    await prisma.order.create({
      data: {
        id: o.id,
        customerId: o.customerId,
        customerName: o.customerName,
        total: o.total,
        status: o.status,
        orderDate: o.orderDate,
        warehouse: o.warehouse,
        complianceCleared: o.complianceCleared,
        items: {
          create: o.items.map(i => ({
            productId: i.productId,
            name: i.name,
            qty: i.qty,
            price: i.price
          }))
        }
      }
    });
  }

  // Deliveries
  for (const d of INITIAL_DELIVERIES) {
    await prisma.deliveryRun.create({
      data: {
        id: d.id,
        runNumber: d.runNumber,
        driverName: d.driverName,
        vehicleNo: d.vehicleNo,
        date: d.date,
        status: d.status,
        stops: {
          create: d.stops.map(s => ({
            orderId: s.orderId,
            customerName: s.customerName,
            address: s.address,
            sequence: s.sequence,
            qty: s.qty,
            status: s.status,
            deliveredQty: s.deliveredQty,
            failedReason: s.failedReason,
            podPhoto: s.podPhoto,
            signedBy: s.signedBy
          }))
        }
      }
    });
  }

  // Visits
  for (const v of INITIAL_VISITS) {
    await prisma.visit.create({ data: v });
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
