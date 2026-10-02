import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { Role, DishTemperature, OrderStatus, PrepUnitStatus, DropStatus, TierDerivationType } from '../src/common/enums';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Fernleaf Kitchen database...');

  const passwordHash = await bcrypt.hash('Test@1234', 10);

  // 1. Seed Mandatory 4 Test Accounts
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: { passwordHash, role: Role.ADMIN },
    create: {
      email: 'admin@test.com',
      name: 'Admin User',
      passwordHash,
      role: Role.ADMIN,
    },
  });

  const kitchenUser = await prisma.user.upsert({
    where: { email: 'kitchen@test.com' },
    update: { passwordHash, role: Role.KITCHEN },
    create: {
      email: 'kitchen@test.com',
      name: 'Kitchen Lead',
      passwordHash,
      role: Role.KITCHEN,
    },
  });

  const dispatchUser = await prisma.user.upsert({
    where: { email: 'dispatch@test.com' },
    update: { passwordHash, role: Role.DISPATCH },
    create: {
      email: 'dispatch@test.com',
      name: 'Dispatch Manager',
      passwordHash,
      role: Role.DISPATCH,
    },
  });

  const driverUser = await prisma.user.upsert({
    where: { email: 'driver@test.com' },
    update: { passwordHash, role: Role.DRIVER },
    create: {
      email: 'driver@test.com',
      name: 'John Driver',
      passwordHash,
      role: Role.DRIVER,
    },
  });

  console.log('Created mandatory 4 staff accounts');

  // 2. Kitchen Settings
  await prisma.kitchenSettings.upsert({
    where: { id: 'default' },
    update: {
      workingDaysJson: JSON.stringify([1, 2, 3, 4, 5]),
      cutoffTime: '16:00',
      cutoffWorkingDays: 2,
    },
    create: {
      id: 'default',
      workingDaysJson: JSON.stringify([1, 2, 3, 4, 5]),
      cutoffTime: '16:00',
      cutoffWorkingDays: 2,
    },
  });

  // 3. Reference Data
  const stationGrill = await prisma.referenceKitchenStation.upsert({
    where: { name: 'Grill Station' },
    update: {},
    create: { name: 'Grill Station' },
  });

  await prisma.referenceKitchenStation.upsert({
    where: { name: 'Salad & Cold Station' },
    update: {},
    create: { name: 'Salad & Cold Station' },
  });

  await prisma.referenceKitchenStation.upsert({
    where: { name: 'Bakery & Dessert Station' },
    update: {},
    create: { name: 'Bakery & Dessert Station' },
  });

  await prisma.referencePortionSize.upsert({
    where: { name: 'Regular' },
    update: { displayOrder: 1 },
    create: { name: 'Regular', displayOrder: 1 },
  });

  await prisma.referencePortionSize.upsert({
    where: { name: 'Large' },
    update: { displayOrder: 2 },
    create: { name: 'Large', displayOrder: 2 },
  });

  await prisma.referenceAllergen.upsert({ where: { name: 'Dairy' }, update: {}, create: { name: 'Dairy' } });
  await prisma.referenceAllergen.upsert({ where: { name: 'Nuts' }, update: {}, create: { name: 'Nuts' } });
  await prisma.referenceAllergen.upsert({ where: { name: 'Gluten' }, update: {}, create: { name: 'Gluten' } });

  await prisma.referenceDietaryTag.upsert({ where: { name: 'Vegan' }, update: {}, create: { name: 'Vegan' } });
  await prisma.referenceDietaryTag.upsert({ where: { name: 'Jain' }, update: {}, create: { name: 'Jain' } });
  await prisma.referenceDietaryTag.upsert({ where: { name: 'Gluten-Free' }, update: {}, create: { name: 'Gluten-Free' } });

  // 4. Price Tiers
  const standardTier = await prisma.priceTier.upsert({
    where: { name: 'Standard' },
    update: { isDefault: true, derivationType: TierDerivationType.NONE },
    create: { name: 'Standard', isDefault: true, derivationType: TierDerivationType.NONE },
  });

  const enterpriseTier = await prisma.priceTier.upsert({
    where: { name: 'Enterprise' },
    update: {
      isDefault: false,
      derivationType: TierDerivationType.PERCENTAGE_OF_TIER,
      baseTierId: standardTier.id,
      multiplier: 1.15,
    },
    create: {
      name: 'Enterprise',
      isDefault: false,
      derivationType: TierDerivationType.PERCENTAGE_OF_TIER,
      baseTierId: standardTier.id,
      multiplier: 1.15,
    },
  });

  const partnerTier = await prisma.priceTier.upsert({
    where: { name: 'Partner' },
    update: {
      isDefault: false,
      derivationType: TierDerivationType.MULTIPLIER_OF_COST,
      multiplier: 2.4,
    },
    create: {
      name: 'Partner',
      isDefault: false,
      derivationType: TierDerivationType.MULTIPLIER_OF_COST,
      multiplier: 2.4,
    },
  });

  // 5. Categories & Catalogue Items
  const catBowls = await prisma.category.upsert({
    where: { name: 'Bowls & Mains' },
    update: { displayOrder: 1 },
    create: { name: 'Bowls & Mains', displayOrder: 1 },
  });

  await prisma.category.upsert({
    where: { name: 'Breakfast Specials' },
    update: { displayOrder: 2 },
    create: { name: 'Breakfast Specials', displayOrder: 2 },
  });

  await prisma.category.upsert({
    where: { name: 'Desserts & Drinks' },
    update: { displayOrder: 3 },
    create: { name: 'Desserts & Drinks', displayOrder: 3 },
  });

  // Delete existing option groups & options to avoid duplication during seed re-runs
  await prisma.optionGroup.deleteMany({});

  const proteinGroup = await prisma.optionGroup.create({
    data: {
      name: 'Choose Your Protein',
      isRequired: true,
      displayOrder: 1,
      usesPortions: false,
      options: {
        create: [
          { name: 'Paneer Tikka', costPriceCents: 150, displayOrder: 1, allergensJson: JSON.stringify(['Dairy']), dietaryTagsJson: JSON.stringify([]) },
          { name: 'Organic Tofu', costPriceCents: 120, displayOrder: 2, allergensJson: JSON.stringify([]), dietaryTagsJson: JSON.stringify(['Vegan', 'Gluten-Free']) },
          { name: 'Spiced Chickpeas', costPriceCents: 100, displayOrder: 3, allergensJson: JSON.stringify([]), dietaryTagsJson: JSON.stringify(['Vegan', 'Jain']) },
        ],
      },
    },
    include: { options: true },
  });

  const riceGroup = await prisma.optionGroup.create({
    data: {
      name: 'Choice of Grain',
      isRequired: true,
      displayOrder: 2,
      usesPortions: true,
      options: {
        create: [
          {
            name: 'Brown Rice',
            costPriceCents: 80,
            displayOrder: 1,
            portionPrices: {
              create: [
                { portionSize: 'Regular', extraCostCents: 0 },
                { portionSize: 'Large', extraCostCents: 50 },
              ],
            },
          },
          {
            name: 'Jeera Rice',
            costPriceCents: 90,
            displayOrder: 2,
            portionPrices: {
              create: [
                { portionSize: 'Regular', extraCostCents: 0 },
                { portionSize: 'Large', extraCostCents: 60 },
              ],
            },
          },
        ],
      },
    },
    include: { options: { include: { portionPrices: true } } },
  });

  const dishBowl = await prisma.dish.upsert({
    where: { sku: 'BWL-001' },
    update: {},
    create: {
      categoryId: catBowls.id,
      name: 'Paneer & Grain Rice Bowl',
      description: 'A wholesome meal box with grilled protein, spiced basmati grain, and fresh mint raita.',
      sku: 'BWL-001',
      temperature: DishTemperature.HOT,
      costPriceCents: 450,
      minOrderQuantity: 1,
      isActive: true,
      stationId: stationGrill.id,
      allergensJson: JSON.stringify(['Dairy']),
      dietaryTagsJson: JSON.stringify(['Gluten-Free']),
      optionGroups: {
        create: [
          { optionGroupId: proteinGroup.id },
          { optionGroupId: riceGroup.id },
        ],
      },
      tierPrices: {
        create: [
          { tierId: standardTier.id, priceCents: 1200, isOverride: false },
          { tierId: enterpriseTier.id, priceCents: 1380, isOverride: false },
          { tierId: partnerTier.id, priceCents: 1080, isOverride: false },
        ],
      },
    },
  });

  for (const opt of proteinGroup.options) {
    await prisma.optionTierPrice.upsert({
      where: { optionId_tierId: { optionId: opt.id, tierId: standardTier.id } },
      update: {},
      create: { optionId: opt.id, tierId: standardTier.id, priceCents: 200 },
    });
  }

  for (const opt of riceGroup.options) {
    await prisma.optionTierPrice.upsert({
      where: { optionId_tierId: { optionId: opt.id, tierId: standardTier.id } },
      update: {},
      create: { optionId: opt.id, tierId: standardTier.id, priceCents: 150 },
    });
  }

  // 6. Companies & Employees
  const companyAcme = await prisma.company.upsert({
    where: { name: 'Acme Corp' },
    update: {},
    create: {
      name: 'Acme Corp',
      billingContact: 'billing@acme.com',
      priceTierId: standardTier.id,
      workingDaysJson: JSON.stringify([1, 2, 3, 4, 5]),
      defaultDeliveryTime: '12:30',
      deliveryLeadMinutes: 60,
      defaultPackaging: 'Eco Box',
      driverInstructions: 'Leave with receptionist at front desk.',
      defaultDriverId: driverUser.id,
      domains: {
        create: [{ domain: 'acme.com' }],
      },
      addresses: {
        create: [
          { addressLine: '100 Innovation Way, Suite 400', city: 'Tech City', postalCode: '90001', notes: 'Loading bay in back' },
        ],
      },
    },
    include: { addresses: true },
  });

  await prisma.company.upsert({
    where: { name: 'TechNova' },
    update: {},
    create: {
      name: 'TechNova',
      billingContact: 'finance@technova.io',
      priceTierId: enterpriseTier.id,
      workingDaysJson: JSON.stringify([1, 2, 3, 4, 5]),
      defaultDeliveryTime: '13:00',
      deliveryLeadMinutes: 45,
      defaultPackaging: 'Premium Bento',
      driverInstructions: 'Call 555-0199 upon arrival.',
      defaultDriverId: driverUser.id,
      domains: {
        create: [{ domain: 'technova.io' }],
      },
      addresses: {
        create: [
          { addressLine: '500 Cyber Park, Tower B', city: 'Metroville', postalCode: '90210' },
        ],
      },
    },
    include: { addresses: true },
  });

  const empAlice = await prisma.employee.upsert({
    where: { email: 'alice@acme.com' },
    update: {},
    create: {
      companyId: companyAcme.id,
      name: 'Alice Smith',
      email: 'alice@acme.com',
      canChooseAddress: true,
      canChangeDeliveryTime: true,
      canChangePackaging: false,
      allergiesJson: JSON.stringify(['Nuts']),
      dietaryPreferencesJson: JSON.stringify(['Vegan']),
    },
  });

  const empBob = await prisma.employee.upsert({
    where: { email: 'bob@acme.com' },
    update: {},
    create: {
      companyId: companyAcme.id,
      name: 'Bob Jones',
      email: 'bob@acme.com',
      canChooseAddress: false,
      canChangeDeliveryTime: false,
      canChangePackaging: false,
      allergiesJson: JSON.stringify([]),
      dietaryPreferencesJson: JSON.stringify(['Jain']),
    },
  });

  await prisma.company.update({
    where: { id: companyAcme.id },
    data: { ownerId: adminUser.id },
  });

  // 7. Seed Orders & Deliveries
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const dropToday = await prisma.deliveryDrop.upsert({
    where: {
      companyId_addressId_deliveryDate_deliveryTime: {
        companyId: companyAcme.id,
        addressId: companyAcme.addresses[0].id,
        deliveryDate: today,
        deliveryTime: '12:30',
      },
    },
    update: {
      driverId: driverUser.id,
      status: DropStatus.OUT_FOR_DELIVERY,
    },
    create: {
      companyId: companyAcme.id,
      addressId: companyAcme.addresses[0].id,
      deliveryDate: today,
      deliveryTime: '12:30',
      status: DropStatus.OUT_FOR_DELIVERY,
      driverId: driverUser.id,
    },
  });

  // Clean old order data before re-seeding
  await prisma.order.deleteMany({});

  const orderToday = await prisma.order.create({
    data: {
      employeeId: empAlice.id,
      deliveryAddressId: companyAcme.addresses[0].id,
      deliveryDate: today,
      deliveryTime: '12:30',
      packagingType: 'Eco Box',
      status: OrderStatus.CONFIRMED,
      totalCents: 1550,
      dropId: dropToday.id,
      plannedDispatchReadyAt: new Date(today.getTime() + 11 * 3600 * 1000 + 30 * 60 * 1000),
      plannedKitchenReadyAt: new Date(today.getTime() + 11 * 3600 * 1000),
      kitchenStartedAt: new Date(today.getTime() + 10 * 3600 * 1000 + 15 * 60 * 1000),
      lines: {
        create: [
          {
            dishId: dishBowl.id,
            dishName: dishBowl.name,
            dishSku: dishBowl.sku,
            quantity: 1,
            unitPriceCents: 1550,
            totalCents: 1550,
            combinations: {
              create: [
                {
                  quantity: 1,
                  unitPriceCents: 1550,
                  totalCents: 1550,
                  options: {
                    create: [
                      {
                        optionId: proteinGroup.options[0].id,
                        optionGroupName: proteinGroup.name,
                        optionName: proteinGroup.options[0].name,
                        priceCents: 200,
                      },
                      {
                        optionId: riceGroup.options[0].id,
                        optionGroupName: riceGroup.name,
                        optionName: riceGroup.options[0].name,
                        portionSize: 'Regular',
                        priceCents: 150,
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  });

  // Create prep unit for orderToday combo
  const combo = await prisma.orderLineCombination.findFirst({
    where: { orderLine: { orderId: orderToday.id } },
  });

  if (combo) {
    await prisma.kitchenPrepUnit.create({
      data: {
        orderId: orderToday.id,
        orderLineCombinationId: combo.id,
        stationName: 'Grill Station',
        status: PrepUnitStatus.STARTED,
        startedAt: new Date(today.getTime() + 10 * 3600 * 1000 + 15 * 60 * 1000),
      },
    });
  }

  await prisma.order.create({
    data: {
      employeeId: empBob.id,
      deliveryAddressId: companyAcme.addresses[0].id,
      deliveryDate: yesterday,
      deliveryTime: '12:30',
      packagingType: 'Eco Box',
      status: OrderStatus.DELIVERED,
      totalCents: 1550,
      lines: {
        create: [
          {
            dishId: dishBowl.id,
            dishName: dishBowl.name,
            dishSku: dishBowl.sku,
            quantity: 1,
            unitPriceCents: 1550,
            totalCents: 1550,
          },
        ],
      },
    },
  });

  await prisma.order.create({
    data: {
      employeeId: empAlice.id,
      deliveryAddressId: companyAcme.addresses[0].id,
      deliveryDate: tomorrow,
      deliveryTime: '12:30',
      packagingType: 'Eco Box',
      status: OrderStatus.PLACED,
      totalCents: 1550,
      lines: {
        create: [
          {
            dishId: dishBowl.id,
            dishName: dishBowl.name,
            dishSku: dishBowl.sku,
            quantity: 1,
            unitPriceCents: 1550,
            totalCents: 1550,
          },
        ],
      },
    },
  });

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
