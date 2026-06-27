const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.customer.update({ where: { id: 'c1' }, data: { address: 'Chevella District Hospital Road, Ranga Reddy' } });
  await prisma.customer.update({ where: { id: 'c2' }, data: { address: 'Moinabad Education Campus, Ranga Reddy' } });
  await prisma.customer.update({ where: { id: 'c3' }, data: { address: 'Ibrahimpatnam Highway Resort, Ranga Reddy' } });
  await prisma.customer.update({ where: { id: 'c4' }, data: { address: 'Shamshabad Industrial Hub, Ranga Reddy' } });

  // Update existing delivery stops so the UI matches
  await prisma.deliveryStop.updateMany({ where: { customerName: { contains: 'St. Jude' } }, data: { address: 'Chevella District Hospital Road, Ranga Reddy' } });
  await prisma.deliveryStop.updateMany({ where: { customerName: { contains: 'Apex' } }, data: { address: 'Moinabad Education Campus, Ranga Reddy' } });
  await prisma.deliveryStop.updateMany({ where: { customerName: { contains: 'Grand Royal' } }, data: { address: 'Ibrahimpatnam Highway Resort, Ranga Reddy' } });
  await prisma.deliveryStop.updateMany({ where: { customerName: { contains: 'QuickClean' } }, data: { address: 'Shamshabad Industrial Hub, Ranga Reddy' } });

  console.log('Database addresses updated to Ranga Reddy successfully!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
