const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding vehicles...');
  const vehicles = [
    { plateNo: 'TG-01-MJ-8822', model: 'Tata Ace Gold' },
    { plateNo: 'TG-03-EP-4580', model: 'Mahindra Bolero Pickup' },
    { plateNo: 'TG-05-AB-1234', model: 'Ashok Leyland Dost' },
    { plateNo: 'MH-12-PQ-9988', model: 'Tata Intra V30' }
  ];

  for (const v of vehicles) {
    const existing = await prisma.vehicle.findUnique({ where: { plateNo: v.plateNo } });
    if (!existing) {
      await prisma.vehicle.create({ data: v });
      console.log(`Created vehicle: ${v.plateNo}`);
    }
  }
  console.log('Done seeding vehicles.');
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
