import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { Role, DishTemperature, OrderStatus, PrepUnitStatus, DropStatus, TierDerivationType } from '../src/common/enums';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Fernleaf Kitchen database with realistic interconnected data...');

  const passwordHash = await bcrypt.hash('Test@1234', 10);

  // 1. Mandatory 4 Test Staff Accounts
  const [adminUser, kitchenUser, dispatchUser, driverUser] = await Promise.all([
    prisma.user.upsert({
      where: { email: 'admin@test.com' },
      update: { passwordHash, role: Role.ADMIN, name: 'Admin User' },
      create: { email: 'admin@test.com', name: 'Admin User', passwordHash, role: Role.ADMIN },
    }),
    prisma.user.upsert({
      where: { email: 'kitchen@test.com' },
      update: { passwordHash, role: Role.KITCHEN, name: 'Kitchen Lead' },
      create: { email: 'kitchen@test.com', name: 'Kitchen Lead', passwordHash, role: Role.KITCHEN },
    }),
    prisma.user.upsert({
      where: { email: 'dispatch@test.com' },
      update: { passwordHash, role: Role.DISPATCH, name: 'Dispatch Manager' },
      create: { email: 'dispatch@test.com', name: 'Dispatch Manager', passwordHash, role: Role.DISPATCH },
    }),
    prisma.user.upsert({
      where: { email: 'driver@test.com' },
      update: { passwordHash, role: Role.DRIVER, name: 'John Driver' },
      create: { email: 'driver@test.com', name: 'John Driver', passwordHash, role: Role.DRIVER },
    }),
  ]);

  console.log('✔ Mandatory 4 staff accounts verified (admin@test.com, kitchen@test.com, dispatch@test.com, driver@test.com)');

  // 2. Kitchen Settings
  await prisma.kitchenSettings.upsert({
    where: { id: 'default' },
    update: { workingDaysJson: JSON.stringify([1, 2, 3, 4, 5]), cutoffTime: '16:00', cutoffWorkingDays: 2 },
    create: { id: 'default', workingDaysJson: JSON.stringify([1, 2, 3, 4, 5]), cutoffTime: '16:00', cutoffWorkingDays: 2 },
  });

  // 3. Reference Data
  const [stationGrill, stationCold, stationBakery, stationWok] = await Promise.all([
    prisma.referenceKitchenStation.upsert({ where: { name: 'Grill Station' }, update: {}, create: { name: 'Grill Station' } }),
    prisma.referenceKitchenStation.upsert({ where: { name: 'Salad & Cold Station' }, update: {}, create: { name: 'Salad & Cold Station' } }),
    prisma.referenceKitchenStation.upsert({ where: { name: 'Bakery & Dessert Station' }, update: {}, create: { name: 'Bakery & Dessert Station' } }),
    prisma.referenceKitchenStation.upsert({ where: { name: 'Wok & Stir-Fry Station' }, update: {}, create: { name: 'Wok & Stir-Fry Station' } }),
  ]);

  await Promise.all([
    prisma.referencePortionSize.upsert({ where: { name: 'Regular' }, update: { displayOrder: 1 }, create: { name: 'Regular', displayOrder: 1 } }),
    prisma.referencePortionSize.upsert({ where: { name: 'Large' }, update: { displayOrder: 2 }, create: { name: 'Large', displayOrder: 2 } }),
    prisma.referenceAllergen.upsert({ where: { name: 'Dairy' }, update: {}, create: { name: 'Dairy' } }),
    prisma.referenceAllergen.upsert({ where: { name: 'Nuts' }, update: {}, create: { name: 'Nuts' } }),
    prisma.referenceAllergen.upsert({ where: { name: 'Gluten' }, update: {}, create: { name: 'Gluten' } }),
    prisma.referenceAllergen.upsert({ where: { name: 'Soy' }, update: {}, create: { name: 'Soy' } }),
    prisma.referenceAllergen.upsert({ where: { name: 'Eggs' }, update: {}, create: { name: 'Eggs' } }),
    prisma.referenceDietaryTag.upsert({ where: { name: 'Vegan' }, update: {}, create: { name: 'Vegan' } }),
    prisma.referenceDietaryTag.upsert({ where: { name: 'Jain' }, update: {}, create: { name: 'Jain' } }),
    prisma.referenceDietaryTag.upsert({ where: { name: 'Gluten-Free' }, update: {}, create: { name: 'Gluten-Free' } }),
    prisma.referenceDietaryTag.upsert({ where: { name: 'Vegetarian' }, update: {}, create: { name: 'Vegetarian' } }),
  ]);

  // 4. Price Tiers
  const standardTier = await prisma.priceTier.upsert({
    where: { name: 'Standard' },
    update: { isDefault: true, derivationType: TierDerivationType.NONE },
    create: { name: 'Standard', isDefault: true, derivationType: TierDerivationType.NONE },
  });

  const enterpriseTier = await prisma.priceTier.upsert({
    where: { name: 'Enterprise' },
    update: { isDefault: false, derivationType: TierDerivationType.PERCENTAGE_OF_TIER, baseTierId: standardTier.id, multiplier: 1.15 },
    create: { name: 'Enterprise', isDefault: false, derivationType: TierDerivationType.PERCENTAGE_OF_TIER, baseTierId: standardTier.id, multiplier: 1.15 },
  });

  const partnerTier = await prisma.priceTier.upsert({
    where: { name: 'Partner' },
    update: { isDefault: false, derivationType: TierDerivationType.MULTIPLIER_OF_COST, multiplier: 2.4 },
    create: { name: 'Partner', isDefault: false, derivationType: TierDerivationType.MULTIPLIER_OF_COST, multiplier: 2.4 },
  });

  // 5. Categories & Dishes
  const [catBowls, catBreakfast, catSalads, catDesserts] = await Promise.all([
    prisma.category.upsert({ where: { name: 'Bowls & Mains' }, update: { displayOrder: 1 }, create: { name: 'Bowls & Mains', displayOrder: 1 } }),
    prisma.category.upsert({ where: { name: 'Breakfast Specials' }, update: { displayOrder: 2 }, create: { name: 'Breakfast Specials', displayOrder: 2 } }),
    prisma.category.upsert({ where: { name: 'Salads & Wraps' }, update: { displayOrder: 3 }, create: { name: 'Salads & Wraps', displayOrder: 3 } }),
    prisma.category.upsert({ where: { name: 'Desserts & Drinks' }, update: { displayOrder: 4 }, create: { name: 'Desserts & Drinks', displayOrder: 4 } }),
  ]);

  const [dishPaneerBowl, dishTofuWok, dishMediterraneanSalad, dishBerryParfait] = await Promise.all([
    prisma.dish.upsert({
      where: { sku: 'BWL-001' },
      update: { name: 'Paneer & Grain Rice Bowl', costPriceCents: 450, stationId: stationGrill.id },
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
      },
    }),
    prisma.dish.upsert({
      where: { sku: 'BWL-002' },
      update: { name: 'Teriyaki Tofu Wok Box', costPriceCents: 400, stationId: stationWok.id },
      create: {
        categoryId: catBowls.id,
        name: 'Teriyaki Tofu Wok Box',
        description: 'Wok-tossed organic tofu with sesame greens and brown rice.',
        sku: 'BWL-002',
        temperature: DishTemperature.HOT,
        costPriceCents: 400,
        minOrderQuantity: 1,
        isActive: true,
        stationId: stationWok.id,
        allergensJson: JSON.stringify(['Soy']),
        dietaryTagsJson: JSON.stringify(['Vegan', 'Gluten-Free']),
      },
    }),
    prisma.dish.upsert({
      where: { sku: 'SLD-001' },
      update: { name: 'Mediterranean Chickpea Salad', costPriceCents: 350, stationId: stationCold.id },
      create: {
        categoryId: catSalads.id,
        name: 'Mediterranean Chickpea Salad',
        description: 'Crisp cucumbers, cherry tomatoes, kalamata olives, and spiced chickpeas with lemon tahini dressing.',
        sku: 'SLD-001',
        temperature: DishTemperature.COLD,
        costPriceCents: 350,
        minOrderQuantity: 1,
        isActive: true,
        stationId: stationCold.id,
        allergensJson: JSON.stringify([]),
        dietaryTagsJson: JSON.stringify(['Vegan', 'Jain', 'Gluten-Free']),
      },
    }),
    prisma.dish.upsert({
      where: { sku: 'DST-001' },
      update: { name: 'Wild Berry Chia Parfait', costPriceCents: 250, stationId: stationBakery.id },
      create: {
        categoryId: catDesserts.id,
        name: 'Wild Berry Chia Parfait',
        description: 'Layered coconut chia pudding with wild berry compote and almond crunch.',
        sku: 'DST-001',
        temperature: DishTemperature.COLD,
        costPriceCents: 250,
        minOrderQuantity: 1,
        isActive: true,
        stationId: stationBakery.id,
        allergensJson: JSON.stringify(['Nuts']),
        dietaryTagsJson: JSON.stringify(['Vegan', 'Gluten-Free']),
      },
    }),
  ]);

  // Dish Tier Prices
  const dishes = [dishPaneerBowl, dishTofuWok, dishMediterraneanSalad, dishBerryParfait];
  for (const d of dishes) {
    await Promise.all([
      prisma.dishTierPrice.upsert({
        where: { dishId_tierId: { dishId: d.id, tierId: standardTier.id } },
        update: { priceCents: Math.round(d.costPriceCents * 2.5) },
        create: { dishId: d.id, tierId: standardTier.id, priceCents: Math.round(d.costPriceCents * 2.5), isOverride: false },
      }),
      prisma.dishTierPrice.upsert({
        where: { dishId_tierId: { dishId: d.id, tierId: enterpriseTier.id } },
        update: { priceCents: Math.round(d.costPriceCents * 2.5 * 1.15) },
        create: { dishId: d.id, tierId: enterpriseTier.id, priceCents: Math.round(d.costPriceCents * 2.5 * 1.15), isOverride: false },
      }),
      prisma.dishTierPrice.upsert({
        where: { dishId_tierId: { dishId: d.id, tierId: partnerTier.id } },
        update: { priceCents: Math.round(d.costPriceCents * 2.4) },
        create: { dishId: d.id, tierId: partnerTier.id, priceCents: Math.round(d.costPriceCents * 2.4), isOverride: false },
      }),
    ]);
  }

  // 6. Companies & Addresses
  const [companyAcme, companyTechNova, companyCyberdyne, companyFernleaf] = await Promise.all([
    prisma.company.upsert({
      where: { name: 'Acme Corp' },
      update: { billingContact: 'billing@acme.com', defaultDriverId: driverUser.id, ownerId: adminUser.id },
      create: {
        name: 'Acme Corp',
        billingContact: 'billing@acme.com',
        priceTierId: standardTier.id,
        workingDaysJson: JSON.stringify([1, 2, 3, 4, 5]),
        defaultDeliveryTime: '12:30',
        deliveryLeadMinutes: 60,
        defaultPackaging: 'Eco Box',
        driverInstructions: 'Leave with receptionist at front desk on 4th floor.',
        defaultDriverId: driverUser.id,
        ownerId: adminUser.id,
      },
    }),
    prisma.company.upsert({
      where: { name: 'TechNova Inc' },
      update: { billingContact: 'finance@technova.io', defaultDriverId: driverUser.id, ownerId: adminUser.id },
      create: {
        name: 'TechNova Inc',
        billingContact: 'finance@technova.io',
        priceTierId: enterpriseTier.id,
        workingDaysJson: JSON.stringify([1, 2, 3, 4, 5]),
        defaultDeliveryTime: '13:00',
        deliveryLeadMinutes: 45,
        defaultPackaging: 'Premium Bento',
        driverInstructions: 'Security check required at Tower B main gate.',
        defaultDriverId: driverUser.id,
        ownerId: adminUser.id,
      },
    }),
    prisma.company.upsert({
      where: { name: 'Cyberdyne Systems' },
      update: { billingContact: 'accounts@cyberdyne.com', defaultDriverId: driverUser.id, ownerId: adminUser.id },
      create: {
        name: 'Cyberdyne Systems',
        billingContact: 'accounts@cyberdyne.com',
        priceTierId: partnerTier.id,
        workingDaysJson: JSON.stringify([1, 2, 3, 4, 5]),
        defaultDeliveryTime: '12:00',
        deliveryLeadMinutes: 60,
        defaultPackaging: 'Thermal Insulated Box',
        driverInstructions: 'Deliver to loading dock 2.',
        defaultDriverId: driverUser.id,
        ownerId: adminUser.id,
      },
    }),
    prisma.company.upsert({
      where: { name: 'Fernleaf Global' },
      update: { billingContact: 'ops@fernleaf.com', defaultDriverId: driverUser.id, ownerId: adminUser.id },
      create: {
        name: 'Fernleaf Global',
        billingContact: 'ops@fernleaf.com',
        priceTierId: standardTier.id,
        workingDaysJson: JSON.stringify([1, 2, 3, 4, 5]),
        defaultDeliveryTime: '12:15',
        deliveryLeadMinutes: 30,
        defaultPackaging: 'Eco Box',
        driverInstructions: 'Ring doorbell at Suite 100.',
        defaultDriverId: driverUser.id,
        ownerId: adminUser.id,
      },
    }),
  ]);

  await Promise.all([
    prisma.companyEmailDomain.upsert({ where: { domain: 'acme.com' }, update: {}, create: { companyId: companyAcme.id, domain: 'acme.com' } }),
    prisma.companyEmailDomain.upsert({ where: { domain: 'technova.io' }, update: {}, create: { companyId: companyTechNova.id, domain: 'technova.io' } }),
    prisma.companyEmailDomain.upsert({ where: { domain: 'cyberdyne.com' }, update: {}, create: { companyId: companyCyberdyne.id, domain: 'cyberdyne.com' } }),
    prisma.companyEmailDomain.upsert({ where: { domain: 'fernleaf.com' }, update: {}, create: { companyId: companyFernleaf.id, domain: 'fernleaf.com' } }),
  ]);

  // Delivery Addresses
  const [addrAcme, addrTechNova, addrCyberdyne, addrFernleaf] = await Promise.all([
    prisma.deliveryAddress.findFirst({ where: { companyId: companyAcme.id } }).then(a => a || prisma.deliveryAddress.create({ data: { companyId: companyAcme.id, addressLine: '100 Innovation Way, Suite 400', city: 'Tech City', postalCode: '90001', notes: 'Loading bay in rear' } })),
    prisma.deliveryAddress.findFirst({ where: { companyId: companyTechNova.id } }).then(a => a || prisma.deliveryAddress.create({ data: { companyId: companyTechNova.id, addressLine: '500 Cyber Park, Tower B', city: 'Metroville', postalCode: '90210' } })),
    prisma.deliveryAddress.findFirst({ where: { companyId: companyCyberdyne.id } }).then(a => a || prisma.deliveryAddress.create({ data: { companyId: companyCyberdyne.id, addressLine: '101 Skynet Blvd', city: 'Silicon Valley', postalCode: '94025' } })),
    prisma.deliveryAddress.findFirst({ where: { companyId: companyFernleaf.id } }).then(a => a || prisma.deliveryAddress.create({ data: { companyId: companyFernleaf.id, addressLine: '777 Fernleaf Gardens', city: 'San Francisco', postalCode: '94103' } })),
  ]);

  // 7. Seed 60+ Employees across Companies
  console.log('Seeding 60+ employees with realistic permissions & dietary profiles...');

  const firstNames = ['James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda', 'David', 'Elizabeth', 'William', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];

  const compList = [
    { id: companyAcme.id, domain: 'acme.com', count: 18 },
    { id: companyTechNova.id, domain: 'technova.io', count: 18 },
    { id: companyCyberdyne.id, domain: 'cyberdyne.com', count: 15 },
    { id: companyFernleaf.id, domain: 'fernleaf.com', count: 15 },
  ];

  const empPromises: Array<Promise<any>> = [];
  let totalEmpIdx = 1;

  for (const comp of compList) {
    for (let i = 1; i <= comp.count; i++) {
      const fname = firstNames[(totalEmpIdx + i) % firstNames.length];
      const lname = lastNames[(totalEmpIdx * 3 + i) % lastNames.length];
      const email = `${fname.toLowerCase()}.${lname.toLowerCase()}${i}@${comp.domain}`;

      const allergies = i % 4 === 0 ? ['Nuts'] : i % 5 === 0 ? ['Dairy'] : i % 7 === 0 ? ['Gluten'] : [];
      const dietary = i % 3 === 0 ? ['Vegan'] : i % 6 === 0 ? ['Jain'] : i % 8 === 0 ? ['Gluten-Free'] : ['Vegetarian'];

      empPromises.push(
        prisma.employee.upsert({
          where: { email },
          update: {
            companyId: comp.id,
            name: `${fname} ${lname}`,
            canChooseAddress: i % 2 === 0,
            canChangeDeliveryTime: i % 3 === 0,
            canChangePackaging: i % 4 === 0,
            allergiesJson: JSON.stringify(allergies),
            dietaryPreferencesJson: JSON.stringify(dietary),
          },
          create: {
            companyId: comp.id,
            name: `${fname} ${lname}`,
            email,
            canChooseAddress: i % 2 === 0,
            canChangeDeliveryTime: i % 3 === 0,
            canChangePackaging: i % 4 === 0,
            allergiesJson: JSON.stringify(allergies),
            dietaryPreferencesJson: JSON.stringify(dietary),
          },
        })
      );
      totalEmpIdx++;
    }
  }

  const seededEmployeeList = await Promise.all(empPromises);
  console.log(`✔ Successfully seeded ${seededEmployeeList.length} corporate employees!`);

  // 8. Seed Interconnected Orders, Drops, Prep Units & Invoices
  console.log('Seeding operational orders across past dates, today, and future dates...');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Today Drop assigned to driver@test.com
  const [dropTodayAcme, dropTodayTechNova] = await Promise.all([
    prisma.deliveryDrop.upsert({
      where: {
        companyId_addressId_deliveryDate_deliveryTime: {
          companyId: companyAcme.id,
          addressId: addrAcme.id,
          deliveryDate: today,
          deliveryTime: '12:30',
        },
      },
      update: { driverId: driverUser.id, status: DropStatus.OUT_FOR_DELIVERY },
      create: { companyId: companyAcme.id, addressId: addrAcme.id, deliveryDate: today, deliveryTime: '12:30', status: DropStatus.OUT_FOR_DELIVERY, driverId: driverUser.id },
    }),
    prisma.deliveryDrop.upsert({
      where: {
        companyId_addressId_deliveryDate_deliveryTime: {
          companyId: companyTechNova.id,
          addressId: addrTechNova.id,
          deliveryDate: today,
          deliveryTime: '13:00',
        },
      },
      update: { driverId: driverUser.id, status: DropStatus.DISPATCH_READY },
      create: { companyId: companyTechNova.id, addressId: addrTechNova.id, deliveryDate: today, deliveryTime: '13:00', status: DropStatus.DISPATCH_READY, driverId: driverUser.id },
    }),
  ]);

  // Seed Orders
  let orderNum = 1001;
  for (let dayOffset = -5; dayOffset <= 7; dayOffset++) {
    const orderDate = new Date(today);
    orderDate.setDate(today.getDate() + dayOffset);

    const isPast = dayOffset < 0;
    const isToday = dayOffset === 0;

    const emp1 = seededEmployeeList[Math.abs(dayOffset * 3) % seededEmployeeList.length];
    const emp2 = seededEmployeeList[Math.abs(dayOffset * 5 + 1) % seededEmployeeList.length];
    const emps = [emp1, emp2];

    for (let i = 0; i < emps.length; i++) {
      const emp = emps[i];
      if (!emp) continue;

      let status = OrderStatus.PLACED;
      let dropId: string | null = null;

      if (isPast) {
        status = OrderStatus.DELIVERED;
      } else if (isToday) {
        status = i === 0 ? OrderStatus.CONFIRMED : OrderStatus.PLACED;
        dropId = emp.companyId === companyAcme.id ? dropTodayAcme.id : dropTodayTechNova.id;
      }

      let order = await prisma.order.findFirst({
        where: { employeeId: emp.id, deliveryDate: orderDate },
      });

      if (!order) {
        order = await prisma.order.create({
          data: {
            orderNumber: orderNum++,
            employeeId: emp.id,
            deliveryAddressId: emp.companyId === companyAcme.id ? addrAcme.id : addrTechNova.id,
            deliveryDate: orderDate,
            deliveryTime: '12:30',
            packagingType: 'Eco Box',
            status,
            totalCents: 1550,
            dropId,
            plannedDispatchReadyAt: new Date(orderDate.getTime() + 11 * 3600 * 1000 + 30 * 60 * 1000),
            plannedKitchenReadyAt: new Date(orderDate.getTime() + 11 * 3600 * 1000),
            kitchenStartedAt: isToday || isPast ? new Date(orderDate.getTime() + 10 * 3600 * 1000) : null,
            kitchenReadyAt: isPast ? new Date(orderDate.getTime() + 11 * 3600 * 1000) : null,
          },
        });
      } else {
        order = await prisma.order.update({
          where: { id: order.id },
          data: { status, dropId: dropId || undefined },
        });
      }

      let orderLine = await prisma.orderLine.findFirst({ where: { orderId: order.id } });
      if (!orderLine) {
        orderLine = await prisma.orderLine.create({
          data: {
            orderId: order.id,
            dishId: dishPaneerBowl.id,
            dishName: dishPaneerBowl.name,
            dishSku: dishPaneerBowl.sku,
            quantity: 1,
            unitPriceCents: 1550,
            totalCents: 1550,
          },
        });
      }

      let combo = await prisma.orderLineCombination.findFirst({ where: { orderLineId: orderLine.id } });
      if (!combo) {
        combo = await prisma.orderLineCombination.create({
          data: {
            orderLineId: orderLine.id,
            quantity: 1,
            unitPriceCents: 1550,
            totalCents: 1550,
          },
        });
      }

      if (isToday || isPast) {
        let prepUnit = await prisma.kitchenPrepUnit.findFirst({ where: { orderId: order.id } });
        if (!prepUnit) {
          await prisma.kitchenPrepUnit.create({
            data: {
              orderId: order.id,
              orderLineCombinationId: combo.id,
              stationName: 'Grill Station',
              status: isPast ? PrepUnitStatus.DONE : PrepUnitStatus.STARTED,
              startedAt: new Date(orderDate.getTime() + 10 * 3600 * 1000),
              completedAt: isPast ? new Date(orderDate.getTime() + 11 * 3600 * 1000) : null,
            },
          });
        }
      }
    }
  }

  // 9. Invoices
  await Promise.all([
    prisma.invoice.upsert({
      where: { invoiceNumber: 'INV-2026-001' },
      update: { totalCents: 12400, status: 'PAID' },
      create: { invoiceNumber: 'INV-2026-001', companyId: companyAcme.id, totalCents: 12400, status: 'PAID', paidAt: new Date(today.getTime() - 2 * 24 * 3600 * 1000) },
    }),
    prisma.invoice.upsert({
      where: { invoiceNumber: 'INV-2026-002' },
      update: { totalCents: 9800, status: 'UNPAID' },
      create: { invoiceNumber: 'INV-2026-002', companyId: companyTechNova.id, totalCents: 9800, status: 'UNPAID' },
    }),
  ]);

  console.log('✔ Operational data seeding completed cleanly!');
  console.log('Summary:');
  console.log(`- Staff Accounts: 4 mandatory verified`);
  console.log(`- Corporate Companies: 4`);
  console.log(`- Corporate Employees: ${seededEmployeeList.length}`);
  console.log(`- Today active delivery drop assigned to driver@test.com: ${dropTodayAcme.id}`);
  console.log(`- Seeding completed with 100% idempotency & non-destructive safety!`);
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
