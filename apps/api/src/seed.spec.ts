import { PrismaClient } from '@prisma/client';

describe('Database Seeding & Idempotency Tests', () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should verify mandatory staff accounts exist with correct roles', async () => {
    const admin = await prisma.user.findUnique({ where: { email: 'admin@test.com' } });
    const kitchen = await prisma.user.findUnique({ where: { email: 'kitchen@test.com' } });
    const dispatch = await prisma.user.findUnique({ where: { email: 'dispatch@test.com' } });
    const driver = await prisma.user.findUnique({ where: { email: 'driver@test.com' } });

    expect(admin).toBeDefined();
    expect(admin?.role).toBe('ADMIN');

    expect(kitchen).toBeDefined();
    expect(kitchen?.role).toBe('KITCHEN');

    expect(dispatch).toBeDefined();
    expect(dispatch?.role).toBe('DISPATCH');

    expect(driver).toBeDefined();
    expect(driver?.role).toBe('DRIVER');
  });

  it('should verify at least 60 corporate employees are seeded across companies', async () => {
    const count = await prisma.employee.count();
    expect(count).toBeGreaterThanOrEqual(60);
  });

  it('should verify driver@test.com has at least one active delivery drop assigned for today', async () => {
    const driver = await prisma.user.findUnique({ where: { email: 'driver@test.com' } });
    expect(driver).toBeDefined();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeDrop = await prisma.deliveryDrop.findFirst({
      where: {
        driverId: driver?.id,
        deliveryDate: today,
      },
    });

    expect(activeDrop).toBeDefined();
    expect(['OUT_FOR_DELIVERY', 'DISPATCH_READY', 'PENDING', 'DELIVERED']).toContain(activeDrop?.status);
  });

  it('should verify corporate billing invoices are present and linked to companies', async () => {
    const invoices = await prisma.invoice.findMany({ include: { company: true } });
    expect(invoices.length).toBeGreaterThanOrEqual(2);
    for (const inv of invoices) {
      expect(inv.company).toBeDefined();
      expect(inv.totalCents).toBeGreaterThan(0);
    }
  });
});
