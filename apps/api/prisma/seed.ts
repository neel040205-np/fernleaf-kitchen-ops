import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: '.env' });

import { Role, DishTemperature, OrderStatus, PrepUnitStatus, DropStatus, TierDerivationType } from '../src/common/enums';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Fernleaf Kitchen database with Hyderabad, India corporate data...');

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

  // Clean up legacy non-hyderabad companies and employees if existing
  await prisma.kitchenPrepUnit.deleteMany({});
  await prisma.orderCombinationOption.deleteMany({});
  await prisma.orderLineCombination.deleteMany({});
  await prisma.orderLine.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.deliveryDrop.deleteMany({});
  await prisma.employee.deleteMany({});
  await prisma.companyHiddenCategory.deleteMany({});
  await prisma.companyHiddenItem.deleteMany({});
  await prisma.companyEmailDomain.deleteMany({});
  await prisma.deliveryAddress.deleteMany({});
  await prisma.companyHoliday.deleteMany({});
  await prisma.company.deleteMany({});

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

  // 5. Categories & Dishes (Prices in INR Cents/Paise: 15000 = ₹150.00)
  const [catBowls, catBreakfast, catSalads, catDesserts] = await Promise.all([
    prisma.category.upsert({ where: { name: 'Bowls & Mains' }, update: { displayOrder: 1 }, create: { name: 'Bowls & Mains', displayOrder: 1 } }),
    prisma.category.upsert({ where: { name: 'Breakfast Specials' }, update: { displayOrder: 2 }, create: { name: 'Breakfast Specials', displayOrder: 2 } }),
    prisma.category.upsert({ where: { name: 'Salads & Wraps' }, update: { displayOrder: 3 }, create: { name: 'Salads & Wraps', displayOrder: 3 } }),
    prisma.category.upsert({ where: { name: 'Desserts & Drinks' }, update: { displayOrder: 4 }, create: { name: 'Desserts & Drinks', displayOrder: 4 } }),
  ]);

  const [dishPaneerBowl, dishTofuWok, dishMediterraneanSalad, dishBerryParfait] = await Promise.all([
    prisma.dish.upsert({
      where: { sku: 'BWL-001' },
      update: { name: 'Paneer Tikka Rice Bowl', costPriceCents: 6000, stationId: stationGrill.id },
      create: {
        categoryId: catBowls.id,
        name: 'Paneer Tikka Rice Bowl',
        description: 'Char-grilled cottage cheese tikka with fragrant basmati pulao and mint chutney.',
        sku: 'BWL-001',
        temperature: DishTemperature.HOT,
        costPriceCents: 6000, // Cost ₹60
        minOrderQuantity: 1,
        isActive: true,
        stationId: stationGrill.id,
        allergensJson: JSON.stringify(['Dairy']),
        dietaryTagsJson: JSON.stringify(['Vegetarian', 'Gluten-Free']),
      },
    }),
    prisma.dish.upsert({
      where: { sku: 'BWL-002' },
      update: { name: 'Teriyaki Tofu Wok Box', costPriceCents: 5500, stationId: stationWok.id },
      create: {
        categoryId: catBowls.id,
        name: 'Teriyaki Tofu Wok Box',
        description: 'Wok-tossed organic tofu with sesame stir-fry greens and steamed brown rice.',
        sku: 'BWL-002',
        temperature: DishTemperature.HOT,
        costPriceCents: 5500, // Cost ₹55
        minOrderQuantity: 1,
        isActive: true,
        stationId: stationWok.id,
        allergensJson: JSON.stringify(['Soy']),
        dietaryTagsJson: JSON.stringify(['Vegan', 'Gluten-Free']),
      },
    }),
    prisma.dish.upsert({
      where: { sku: 'SLD-001' },
      update: { name: 'Mediterranean Chickpea Salad', costPriceCents: 4500, stationId: stationCold.id },
      create: {
        categoryId: catSalads.id,
        name: 'Mediterranean Chickpea Salad',
        description: 'Crisp cucumbers, cherry tomatoes, olives, and roasted chickpeas with lemon tahini dressing.',
        sku: 'SLD-001',
        temperature: DishTemperature.COLD,
        costPriceCents: 4500, // Cost ₹45
        minOrderQuantity: 1,
        isActive: true,
        stationId: stationCold.id,
        allergensJson: JSON.stringify([]),
        dietaryTagsJson: JSON.stringify(['Vegan', 'Jain', 'Gluten-Free']),
      },
    }),
    prisma.dish.upsert({
      where: { sku: 'DST-001' },
      update: { name: 'Wild Berry Chia Parfait', costPriceCents: 3500, stationId: stationBakery.id },
      create: {
        categoryId: catDesserts.id,
        name: 'Wild Berry Chia Parfait',
        description: 'Layered coconut chia pudding with wild berry compote and roasted almond flakes.',
        sku: 'DST-001',
        temperature: DishTemperature.COLD,
        costPriceCents: 3500, // Cost ₹35
        minOrderQuantity: 1,
        isActive: true,
        stationId: stationBakery.id,
        allergensJson: JSON.stringify(['Nuts']),
        dietaryTagsJson: JSON.stringify(['Vegan', 'Gluten-Free']),
      },
    }),
  ]);

  // Dish Tier Prices in INR (Paneer Bowl: ₹150, Tofu Wok: ₹140, Chickpea Salad: ₹120, Chia Parfait: ₹90)
  const dishPricesMap: Record<string, number> = {
    'BWL-001': 15000, // ₹150.00
    'BWL-002': 14000, // ₹140.00
    'SLD-001': 12000, // ₹120.00
    'DST-001': 9000,  // ₹90.00
  };

  const dishes = [dishPaneerBowl, dishTofuWok, dishMediterraneanSalad, dishBerryParfait];
  for (const d of dishes) {
    const basePrice = dishPricesMap[d.sku] || 15000;
    await Promise.all([
      prisma.dishTierPrice.upsert({
        where: { dishId_tierId: { dishId: d.id, tierId: standardTier.id } },
        update: { priceCents: basePrice },
        create: { dishId: d.id, tierId: standardTier.id, priceCents: basePrice, isOverride: false },
      }),
      prisma.dishTierPrice.upsert({
        where: { dishId_tierId: { dishId: d.id, tierId: enterpriseTier.id } },
        update: { priceCents: Math.round(basePrice * 1.15) },
        create: { dishId: d.id, tierId: enterpriseTier.id, priceCents: Math.round(basePrice * 1.15), isOverride: false },
      }),
      prisma.dishTierPrice.upsert({
        where: { dishId_tierId: { dishId: d.id, tierId: partnerTier.id } },
        update: { priceCents: Math.round(d.costPriceCents * 2.4) },
        create: { dishId: d.id, tierId: partnerTier.id, priceCents: Math.round(d.costPriceCents * 2.4), isOverride: false },
      }),
    ]);
  }

  // 6. Create 6 Corporate Companies located in Hyderabad, India
  console.log('Seeding 6 corporate accounts located in Hyderabad, India...');

  const hyderabadCompaniesData = [
    {
      name: 'TCS Hyderabad',
      billingContact: 'finance.hyd@tcs-hyd.in',
      domain: 'tcs-hyd.in',
      tierId: standardTier.id,
      deliveryTime: '12:30',
      leadMins: 60,
      packaging: 'Eco Box',
      instructions: 'Deliver to Cyber Pearl Campus, Tower 1 receptiondesk, HITEC City, Hyderabad.',
      addressLine: 'Cyber Pearl Campus, HITEC City',
      city: 'Hyderabad',
      postalCode: '500081',
    },
    {
      name: 'Infosys Hyderabad',
      billingContact: 'accounts@infosys-hyd.in',
      domain: 'infosys-hyd.in',
      tierId: enterpriseTier.id,
      deliveryTime: '13:00',
      leadMins: 45,
      packaging: 'Premium Bento',
      instructions: 'Gate 2 security verification required at Pocharam IT SEZ Campus, Hyderabad.',
      addressLine: 'Pocharam IT SEZ, Ghatkesar Mandal',
      city: 'Hyderabad',
      postalCode: '500088',
    },
    {
      name: 'Wipro Hyderabad',
      billingContact: 'admin@wipro-hyd.in',
      domain: 'wipro-hyd.in',
      tierId: partnerTier.id,
      deliveryTime: '12:00',
      leadMins: 60,
      packaging: 'Thermal Insulated Box',
      instructions: 'Deliver to loading dock 3 at Gachibowli Financial District, Hyderabad.',
      addressLine: 'Financial District, Gachibowli',
      city: 'Hyderabad',
      postalCode: '500032',
    },
    {
      name: 'Tech Mahindra Hyderabad',
      billingContact: 'billing@techm-hyd.in',
      domain: 'techm-hyd.in',
      tierId: standardTier.id,
      deliveryTime: '12:15',
      leadMins: 30,
      packaging: 'Eco Box',
      instructions: 'Drop off at Infocity Tower A, Madhapur, Hyderabad.',
      addressLine: 'Infocity, Madhapur',
      city: 'Hyderabad',
      postalCode: '500081',
    },
    {
      name: 'Microsoft India Hyderabad',
      billingContact: 'finance@microsoft-hyd.in',
      domain: 'microsoft-hyd.in',
      tierId: enterpriseTier.id,
      deliveryTime: '12:45',
      leadMins: 45,
      packaging: 'Premium Bento',
      instructions: 'Deliver to Building 3 Reception desk, Gachibowli Campus, Hyderabad.',
      addressLine: 'Building 3, Gachibowli Campus',
      city: 'Hyderabad',
      postalCode: '500032',
    },
    {
      name: 'Amazon Development Center Hyderabad',
      billingContact: 'ops@amazon-hyd.in',
      domain: 'amazon-hyd.in',
      tierId: partnerTier.id,
      deliveryTime: '13:15',
      leadMins: 60,
      packaging: 'Eco Box',
      instructions: 'Security check at main gate, Amazon HYD13 Building, Nanakramguda, Hyderabad.',
      addressLine: 'Financial District, Nanakramguda',
      city: 'Hyderabad',
      postalCode: '500032',
    },
  ];

  const createdCompanies = [];

  for (const cData of hyderabadCompaniesData) {
    const comp = await prisma.company.create({
      data: {
        name: cData.name,
        billingContact: cData.billingContact,
        priceTierId: cData.tierId,
        workingDaysJson: JSON.stringify([1, 2, 3, 4, 5]),
        defaultDeliveryTime: cData.deliveryTime,
        deliveryLeadMinutes: cData.leadMins,
        defaultPackaging: cData.packaging,
        driverInstructions: cData.instructions,
        defaultDriverId: driverUser.id,
        ownerId: adminUser.id,
        domains: {
          create: [{ domain: cData.domain }],
        },
        addresses: {
          create: [
            {
              addressLine: cData.addressLine,
              city: cData.city,
              postalCode: cData.postalCode,
              notes: cData.instructions,
            },
          ],
        },
      },
      include: { addresses: true },
    });
    createdCompanies.push({ ...comp, domain: cData.domain });
  }

  console.log(`✔ Created 6 Hyderabad corporate companies with addresses and domains.`);

  // 7. Seed 108 Employees (18 per company) across Hyderabad companies
  console.log('Seeding 108 Hyderabad employees with Indian names & dietary profiles...');

  const indianFirstNames = [
    'Rahul', 'Ananya', 'Vikram', 'Priya', 'Karthik', 'Sneha', 'Arjun', 'Kavya', 'Sameer', 'Deepa',
    'Aditya', 'Pooja', 'Rohan', 'Neha', 'Siddharth', 'Shreya', 'Varun', 'Meera', 'Kunal', 'Ritu',
    'Manish', 'Swati', 'Vishal', 'Divya', 'Suresh', 'Bhavana', 'Nitin', 'Tarun', 'Anjali', 'Gautam'
  ];

  const indianLastNames = [
    'Sharma', 'Rao', 'Reddy', 'Patel', 'Varma', 'Kulkarni', 'Nambiar', 'Nair', 'Khan', 'Deshmukh',
    'Joshi', 'Mehta', 'Agarwal', 'Gupta', 'Sen', 'Bhat', 'Pillai', 'Iyer', 'Chowdary', 'Raju',
    'Murthy', 'Prasad', 'Kumar', 'Singh'
  ];

  const seededEmployees = [];

  for (const comp of createdCompanies) {
    for (let i = 1; i <= 18; i++) {
      const fnIdx = (seededEmployees.length + i * 3) % indianFirstNames.length;
      const lnIdx = (seededEmployees.length * 2 + i * 7) % indianLastNames.length;
      const fname = indianFirstNames[fnIdx];
      const lname = indianLastNames[lnIdx];
      const email = `${fname.toLowerCase()}.${lname.toLowerCase()}${i}@${comp.domain}`;

      const allergies = i % 4 === 0 ? ['Nuts'] : i % 5 === 0 ? ['Dairy'] : i % 7 === 0 ? ['Gluten'] : [];
      const dietary = i % 3 === 0 ? ['Vegetarian'] : i % 5 === 0 ? ['Vegan'] : i % 6 === 0 ? ['Jain'] : ['Vegetarian'];

      const emp = await prisma.employee.create({
        data: {
          companyId: comp.id,
          name: `${fname} ${lname}`,
          email,
          canChooseAddress: i % 2 === 0,
          canChangeDeliveryTime: i % 3 === 0,
          canChangePackaging: i % 4 === 0,
          allergiesJson: JSON.stringify(allergies),
          dietaryPreferencesJson: JSON.stringify(dietary),
        },
      });
      seededEmployees.push(emp);
    }
  }

  console.log(`✔ Successfully seeded ${seededEmployees.length} Hyderabad corporate employees!`);

  // 8. Seed Interconnected Orders, Drops, Prep Units & Invoices for Hyderabad companies
  console.log('Seeding operational orders for Hyderabad companies in IST...');

  const todayStr = new Date().toISOString().split('T')[0];
  const [tY, tM, tD] = todayStr.split('-').map(Number);
  const todayIST = new Date(`${todayStr}T00:00:00.000+05:30`);

  const company1 = createdCompanies[0];
  const company2 = createdCompanies[1];

  const addr1 = company1.addresses[0];
  const addr2 = company2.addresses[0];

  const dropToday1 = await prisma.deliveryDrop.create({
    data: {
      companyId: company1.id,
      addressId: addr1.id,
      deliveryDate: todayIST,
      deliveryTime: '12:30',
      status: DropStatus.OUT_FOR_DELIVERY,
      driverId: driverUser.id,
    },
  });

  const dropToday2 = await prisma.deliveryDrop.create({
    data: {
      companyId: company2.id,
      addressId: addr2.id,
      deliveryDate: todayIST,
      deliveryTime: '13:00',
      status: DropStatus.DISPATCH_READY,
      driverId: driverUser.id,
    },
  });

  let orderNum = 1001;

  for (let dayOffset = -3; dayOffset <= 5; dayOffset++) {
    const oDate = new Date(todayIST);
    oDate.setDate(todayIST.getDate() + dayOffset);

    const isPast = dayOffset < 0;
    const isToday = dayOffset === 0;

    const emp1 = seededEmployees[Math.abs(dayOffset * 7) % seededEmployees.length];
    const emp2 = seededEmployees[Math.abs(dayOffset * 11 + 3) % seededEmployees.length];
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
        dropId = emp.companyId === company1.id ? dropToday1.id : dropToday2.id;
      }

      const oDateStr = oDate.toISOString().split('T')[0];
      const deliveryTimeStr = '12:30';

      // Timings in IST:
      // Delivery = 12:30 PM IST
      // Dispatch = 11:30 AM IST (1 hour before delivery)
      // Expected Cooking Completion = 11:00 AM IST (1 hour 30 mins before delivery / 30 mins before dispatch)
      const plannedDeliveryAt = new Date(`${oDateStr}T12:30:00.000+05:30`);
      const plannedDispatchReadyAt = new Date(plannedDeliveryAt.getTime() - 60 * 60 * 1000); // 11:30 AM IST
      const plannedKitchenReadyAt = new Date(plannedDeliveryAt.getTime() - 90 * 60 * 1000);  // 11:00 AM IST

      const order = await prisma.order.create({
        data: {
          orderNumber: orderNum++,
          employeeId: emp.id,
          deliveryAddressId: emp.companyId === company1.id ? addr1.id : addr2.id,
          deliveryDate: plannedDeliveryAt,
          deliveryTime: deliveryTimeStr,
          packagingType: 'Eco Box',
          status,
          totalCents: 15000, // ₹150.00
          dropId,
          plannedDispatchReadyAt,
          plannedKitchenReadyAt,
          kitchenStartedAt: isToday || isPast ? new Date(plannedKitchenReadyAt.getTime() - 30 * 60 * 1000) : null,
          kitchenReadyAt: isPast ? plannedKitchenReadyAt : null,
        },
      });

      const orderLine = await prisma.orderLine.create({
        data: {
          orderId: order.id,
          dishId: dishPaneerBowl.id,
          dishName: dishPaneerBowl.name,
          dishSku: dishPaneerBowl.sku,
          quantity: 1,
          unitPriceCents: 15000,
          totalCents: 15000,
        },
      });

      const combo = await prisma.orderLineCombination.create({
        data: {
          orderLineId: orderLine.id,
          quantity: 1,
          unitPriceCents: 15000,
          totalCents: 15000,
        },
      });

      if (isToday || isPast) {
        await prisma.kitchenPrepUnit.create({
          data: {
            orderId: order.id,
            orderLineCombinationId: combo.id,
            stationName: 'Grill Station',
            status: isPast ? PrepUnitStatus.DONE : PrepUnitStatus.STARTED,
            startedAt: new Date(plannedKitchenReadyAt.getTime() - 30 * 60 * 1000),
            completedAt: isPast ? plannedKitchenReadyAt : null,
          },
        });
      }
    }
  }

  // 9. Invoices in INR
  await Promise.all([
    prisma.invoice.create({
      data: {
        invoiceNumber: 'INV-2026-001',
        companyId: company1.id,
        totalCents: 150000, // ₹1,500.00
        status: 'PAID',
        paidAt: new Date(todayIST.getTime() - 2 * 24 * 3600 * 1000),
      },
    }),
    prisma.invoice.create({
      data: {
        invoiceNumber: 'INV-2026-002',
        companyId: company2.id,
        totalCents: 140000, // ₹1,400.00
        status: 'UNPAID',
      },
    }),
  ]);

  console.log('✔ Operational data seeding completed cleanly!');
  console.log('Summary:');
  console.log(`- Hyderabad Corporate Companies: 6`);
  console.log(`- Hyderabad Corporate Employees: ${seededEmployees.length}`);
  console.log(`- Currency: Indian Rupees (₹)`);
  console.log(`- Seeding completed with 100% idempotency & safety!`);
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
