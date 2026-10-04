import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: '.env' });

import { Role, DishTemperature, OrderStatus, PrepUnitStatus, DropStatus, TierDerivationType } from '../src/common/enums';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Fernleaf Kitchen database with 27 Indian Cuisine dishes & Hyderabad corporate data...');

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

  // Clean up existing data for clean re-seeding
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

  await prisma.dishOptionGroup.deleteMany({});
  await prisma.optionPortionPrice.deleteMany({});
  await prisma.optionTierPrice.deleteMany({});
  await prisma.option.deleteMany({});
  await prisma.optionGroup.deleteMany({});

  await prisma.dishTierPrice.deleteMany({});
  await prisma.dish.deleteMany({});
  await prisma.category.deleteMany({});

  // 2. Kitchen Settings
  await prisma.kitchenSettings.upsert({
    where: { id: 'default' },
    update: { workingDaysJson: JSON.stringify([1, 2, 3, 4, 5]), cutoffTime: '16:00', cutoffWorkingDays: 2 },
    create: { id: 'default', workingDaysJson: JSON.stringify([1, 2, 3, 4, 5]), cutoffTime: '16:00', cutoffWorkingDays: 2 },
  });

  // 3. Reference Data & Stations
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
    prisma.referenceDietaryTag.upsert({ where: { name: 'Non-Veg' }, update: {}, create: { name: 'Non-Veg' } }),
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

  // 5. Categories
  const catBowls = await prisma.category.create({ data: { name: 'Bowls & Mains', displayOrder: 1 } });
  const catBreakfast = await prisma.category.create({ data: { name: 'Breakfast Specials', displayOrder: 2 } });
  const catSalads = await prisma.category.create({ data: { name: 'Salads & Wraps', displayOrder: 3 } });
  const catDesserts = await prisma.category.create({ data: { name: 'Desserts & Drinks', displayOrder: 4 } });

  // 6. Option Groups & Add-ons Creation
  const ogBreads = await prisma.optionGroup.create({
    data: {
      name: 'Bread & Side Choice',
      isRequired: false,
      displayOrder: 1,
      options: {
        create: [
          { name: 'Extra Butter Naan', costPriceCents: 1000, displayOrder: 1 },
          { name: 'Garlic Roti', costPriceCents: 800, displayOrder: 2 },
          { name: 'Boondi Raita', costPriceCents: 1200, displayOrder: 3 },
          { name: 'Mint Chutney & Pyaz', costPriceCents: 500, displayOrder: 4 },
          { name: 'Extra Basmati Rice', costPriceCents: 1500, displayOrder: 5 },
        ],
      },
    },
    include: { options: true },
  });

  const ogProtein = await prisma.optionGroup.create({
    data: {
      name: 'Protein & Paneer Extra',
      isRequired: false,
      displayOrder: 2,
      options: {
        create: [
          { name: 'Extra Paneer Cubes (100g)', costPriceCents: 2000, displayOrder: 1 },
          { name: 'Extra Roasted Chicken (100g)', costPriceCents: 2500, displayOrder: 2 },
          { name: 'Boiled Egg (2 pcs)', costPriceCents: 1000, displayOrder: 3 },
        ],
      },
    },
    include: { options: true },
  });

  const ogBreakfastBeverages = await prisma.optionGroup.create({
    data: {
      name: 'Breakfast Beverage & Side',
      isRequired: false,
      displayOrder: 3,
      options: {
        create: [
          { name: 'Masala Chai (Hot)', costPriceCents: 1000, displayOrder: 1 },
          { name: 'South Indian Filter Coffee (Hot)', costPriceCents: 1200, displayOrder: 2 },
          { name: 'Sweet Lassi (Chilled)', costPriceCents: 1500, displayOrder: 3 },
          { name: 'Extra Butter Pav (2 pcs)', costPriceCents: 1000, displayOrder: 4 },
        ],
      },
    },
    include: { options: true },
  });

  const ogSaladAddons = await prisma.optionGroup.create({
    data: {
      name: 'Wrap & Salad Crunch Add-on',
      isRequired: false,
      displayOrder: 4,
      options: {
        create: [
          { name: 'Extra Mint Chutney', costPriceCents: 500, displayOrder: 1 },
          { name: 'Spicy Mayo Dip', costPriceCents: 700, displayOrder: 2 },
          { name: 'Roasted Makhana (Foxnuts)', costPriceCents: 1200, displayOrder: 3 },
          { name: 'Amul Cheese Slice', costPriceCents: 800, displayOrder: 4 },
        ],
      },
    },
    include: { options: true },
  });

  // Attach Option Tier Prices for option groups
  const allOptionGroups = [ogBreads, ogProtein, ogBreakfastBeverages, ogSaladAddons];
  const optionPriceMapping: Record<string, number> = {
    'Extra Butter Naan': 3000,
    'Garlic Roti': 2500,
    'Boondi Raita': 3500,
    'Mint Chutney & Pyaz': 1500,
    'Extra Basmati Rice': 4000,
    'Extra Paneer Cubes (100g)': 5000,
    'Extra Roasted Chicken (100g)': 6500,
    'Boiled Egg (2 pcs)': 3000,
    'Masala Chai (Hot)': 3000,
    'South Indian Filter Coffee (Hot)': 3500,
    'Sweet Lassi (Chilled)': 4500,
    'Extra Butter Pav (2 pcs)': 3000,
    'Extra Mint Chutney': 1500,
    'Spicy Mayo Dip': 2000,
    'Roasted Makhana (Foxnuts)': 3500,
    'Amul Cheese Slice': 2500,
  };

  for (const group of allOptionGroups) {
    for (const opt of group.options) {
      const priceCents = optionPriceMapping[opt.name] || 2000;
      await Promise.all([
        prisma.optionTierPrice.create({ data: { optionId: opt.id, tierId: standardTier.id, priceCents } }),
        prisma.optionTierPrice.create({ data: { optionId: opt.id, tierId: enterpriseTier.id, priceCents: Math.round(priceCents * 1.15) } }),
        prisma.optionTierPrice.create({ data: { optionId: opt.id, tierId: partnerTier.id, priceCents: Math.round(opt.costPriceCents * 2.4) } }),
      ]);
    }
  }

  // 7. Seed 27 Indian Cuisine Dishes
  console.log('Seeding 27 authentic Indian cuisine dishes with high quality image URLs...');

  const indianDishesData = [
    // --- Bowls & Mains (7 items) ---
    {
      categoryId: catBowls.id,
      sku: 'BWL-001',
      name: 'Paneer Tikka Rice Bowl',
      description: 'Char-grilled cottage cheese tikka with fragrant basmati pulao, makhani gravy and mint chutney.',
      imageUrl: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600&auto=format&fit=crop&q=80',
      temperature: DishTemperature.HOT,
      costPriceCents: 7000, // ₹70 cost
      stdPriceCents: 18000, // ₹180 price
      stationId: stationGrill.id,
      allergens: ['Dairy'],
      tags: ['Vegetarian', 'Gluten-Free'],
      optionGroupIds: [ogBreads.id, ogProtein.id],
    },
    {
      categoryId: catBowls.id,
      sku: 'BWL-002',
      name: 'Dal Makhani & Jeera Rice Bowl',
      description: 'Slow-cooked black lentil makhani simmered with white butter, served with ghee jeera basmati rice.',
      imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&auto=format&fit=crop&q=80',
      temperature: DishTemperature.HOT,
      costPriceCents: 6000, // ₹60 cost
      stdPriceCents: 16000, // ₹160 price
      stationId: stationWok.id,
      allergens: ['Dairy'],
      tags: ['Vegetarian', 'Gluten-Free'],
      optionGroupIds: [ogBreads.id, ogProtein.id],
    },
    {
      categoryId: catBowls.id,
      sku: 'BWL-003',
      name: 'Butter Chicken & Naan Bowl',
      description: 'Tender charcoal-grilled chicken in rich creamy tomato butter curry served with garlic naan bites.',
      imageUrl: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=600&auto=format&fit=crop&q=80',
      temperature: DishTemperature.HOT,
      costPriceCents: 8500, // ₹85 cost
      stdPriceCents: 22000, // ₹220 price
      stationId: stationGrill.id,
      allergens: ['Dairy', 'Gluten'],
      tags: ['Non-Veg'],
      optionGroupIds: [ogBreads.id, ogProtein.id],
    },
    {
      categoryId: catBowls.id,
      sku: 'BWL-004',
      name: 'Hyderabadi Subz Vegetable Biryani',
      description: 'Authentic dum-cooked aromatic basmati rice layered with seasonal vegetables, saffron & mirchi ka salan.',
      imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80',
      temperature: DishTemperature.HOT,
      costPriceCents: 6500, // ₹65 cost
      stdPriceCents: 17000, // ₹170 price
      stationId: stationGrill.id,
      allergens: ['Dairy', 'Nuts'],
      tags: ['Vegetarian', 'Jain', 'Gluten-Free'],
      optionGroupIds: [ogBreads.id, ogProtein.id],
    },
    {
      categoryId: catBowls.id,
      sku: 'BWL-005',
      name: 'Rajma Chawal Executive Bowl',
      description: 'North Indian style slow-cooked red kidney beans in spiced onion tomato gravy served with basmati rice.',
      imageUrl: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&auto=format&fit=crop&q=80',
      temperature: DishTemperature.HOT,
      costPriceCents: 5500, // ₹55 cost
      stdPriceCents: 15000, // ₹150 price
      stationId: stationWok.id,
      allergens: [],
      tags: ['Vegan', 'Gluten-Free'],
      optionGroupIds: [ogBreads.id],
    },
    {
      categoryId: catBowls.id,
      sku: 'BWL-006',
      name: 'Kadai Paneer & Butter Roti Bowl',
      description: 'Cottage cheese and crisp bell peppers wok-tossed in whole kadai spices, served with fresh butter rotis.',
      imageUrl: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600&auto=format&fit=crop&q=80',
      temperature: DishTemperature.HOT,
      costPriceCents: 7500, // ₹75 cost
      stdPriceCents: 19000, // ₹190 price
      stationId: stationWok.id,
      allergens: ['Dairy', 'Gluten'],
      tags: ['Vegetarian'],
      optionGroupIds: [ogBreads.id, ogProtein.id],
    },
    {
      categoryId: catBowls.id,
      sku: 'BWL-007',
      name: 'Chana Masala & Amritsari Kulcha Bowl',
      description: 'Tangy Punjabi-style spiced chickpeas served with soft herb-stuffed Amritsari kulchas.',
      imageUrl: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=600&auto=format&fit=crop&q=80',
      temperature: DishTemperature.HOT,
      costPriceCents: 6000, // ₹60 cost
      stdPriceCents: 16000, // ₹160 price
      stationId: stationGrill.id,
      allergens: ['Gluten'],
      tags: ['Vegetarian'],
      optionGroupIds: [ogBreads.id],
    },

    // --- Breakfast Specials (7 items) ---
    {
      categoryId: catBreakfast.id,
      sku: 'BFK-001',
      name: 'South Indian Idli Vada Combo',
      description: 'Steamed fluffy rice idlis and crispy urad dal medu vadas served with coconut chutney and hot sambar.',
      imageUrl: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&auto=format&fit=crop&q=80',
      temperature: DishTemperature.HOT,
      costPriceCents: 4000, // ₹40 cost
      stdPriceCents: 11000, // ₹110 price
      stationId: stationCold.id,
      allergens: [],
      tags: ['Vegan', 'Gluten-Free'],
      optionGroupIds: [ogBreakfastBeverages.id],
    },
    {
      categoryId: catBreakfast.id,
      sku: 'BFK-002',
      name: 'Crispy Masala Dosa Platter',
      description: 'Golden fermented rice crepe filled with spiced potato onion masala, served with 3 chutneys & sambar.',
      imageUrl: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=600&auto=format&fit=crop&q=80',
      temperature: DishTemperature.HOT,
      costPriceCents: 4500, // ₹45 cost
      stdPriceCents: 13000, // ₹130 price
      stationId: stationGrill.id,
      allergens: [],
      tags: ['Vegan', 'Gluten-Free'],
      optionGroupIds: [ogBreakfastBeverages.id],
    },
    {
      categoryId: catBreakfast.id,
      sku: 'BFK-003',
      name: 'Amritsari Aloo Paratha Thali',
      description: 'Whole wheat flatbread stuffed with seasoned potato and green chillies, served with white butter, curd & pickle.',
      imageUrl: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?w=600&auto=format&fit=crop&q=80',
      temperature: DishTemperature.HOT,
      costPriceCents: 5000, // ₹50 cost
      stdPriceCents: 14000, // ₹140 price
      stationId: stationGrill.id,
      allergens: ['Dairy', 'Gluten'],
      tags: ['Vegetarian'],
      optionGroupIds: [ogBreakfastBeverages.id],
    },
    {
      categoryId: catBreakfast.id,
      sku: 'BFK-004',
      name: 'Indori Poha & Jalebi Box',
      description: 'Flattened rice tempered with mustard seeds, curry leaves, onions & peanuts, paired with hot crispy jalebis.',
      imageUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&auto=format&fit=crop&q=80',
      temperature: DishTemperature.HOT,
      costPriceCents: 3500, // ₹35 cost
      stdPriceCents: 10000, // ₹100 price
      stationId: stationCold.id,
      allergens: ['Nuts', 'Gluten'],
      tags: ['Vegetarian'],
      optionGroupIds: [ogBreakfastBeverages.id],
    },
    {
      categoryId: catBreakfast.id,
      sku: 'BFK-005',
      name: 'Puri Bhaji & Suji Halwa Combo',
      description: 'Golden puffed wheat puris served with aromatic spiced potato bhaji and rich ghee suji halwa.',
      imageUrl: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=600&auto=format&fit=crop&q=80',
      temperature: DishTemperature.HOT,
      costPriceCents: 4500, // ₹45 cost
      stdPriceCents: 13000, // ₹130 price
      stationId: stationWok.id,
      allergens: ['Dairy', 'Gluten'],
      tags: ['Vegetarian'],
      optionGroupIds: [ogBreakfastBeverages.id],
    },
    {
      categoryId: catBreakfast.id,
      sku: 'BFK-006',
      name: 'Mumbai Butter Pav Bhaji',
      description: 'Thick mashed vegetable curry rich in butter, served with soft toasted buttered pav buns and lemon wedges.',
      imageUrl: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=600&auto=format&fit=crop&q=80',
      temperature: DishTemperature.HOT,
      costPriceCents: 5500, // ₹55 cost
      stdPriceCents: 15000, // ₹150 price
      stationId: stationWok.id,
      allergens: ['Dairy', 'Gluten'],
      tags: ['Vegetarian'],
      optionGroupIds: [ogBreakfastBeverages.id],
    },
    {
      categoryId: catBreakfast.id,
      sku: 'BFK-007',
      name: 'Rava Upma & Medu Vada Platter',
      description: 'Roasted semolina upma cooked with cashews & curry leaves, served with 2 crispy medu vadas & tomato chutney.',
      imageUrl: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=600&auto=format&fit=crop&q=80',
      temperature: DishTemperature.HOT,
      costPriceCents: 4000, // ₹40 cost
      stdPriceCents: 11000, // ₹110 price
      stationId: stationCold.id,
      allergens: ['Nuts'],
      tags: ['Vegetarian'],
      optionGroupIds: [ogBreakfastBeverages.id],
    },

    // --- Salads & Wraps (5 items) ---
    {
      categoryId: catSalads.id,
      sku: 'SLD-001',
      name: 'Tandoori Paneer Kathi Wrap',
      description: 'Charcoal-grilled paneer tikka wrapped in whole wheat laccha paratha with mint chutney & pickled onions.',
      imageUrl: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=600&auto=format&fit=crop&q=80',
      temperature: DishTemperature.HOT,
      costPriceCents: 6000, // ₹60 cost
      stdPriceCents: 16000, // ₹160 price
      stationId: stationGrill.id,
      allergens: ['Dairy', 'Gluten'],
      tags: ['Vegetarian'],
      optionGroupIds: [ogSaladAddons.id, ogProtein.id],
    },
    {
      categoryId: catSalads.id,
      sku: 'SLD-002',
      name: 'Tandoori Chicken Tikka Wrap',
      description: 'Juicy spiced chicken tikka wrapped in layered paratha with bell peppers, mint chutney & spicy mayo.',
      imageUrl: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=600&auto=format&fit=crop&q=80',
      temperature: DishTemperature.HOT,
      costPriceCents: 7000, // ₹70 cost
      stdPriceCents: 18000, // ₹180 price
      stationId: stationGrill.id,
      allergens: ['Dairy', 'Gluten', 'Eggs'],
      tags: ['Non-Veg'],
      optionGroupIds: [ogSaladAddons.id, ogProtein.id],
    },
    {
      categoryId: catSalads.id,
      sku: 'SLD-003',
      name: 'Kachumber Sprouts & Peanut Salad',
      description: 'High-protein sprouted moong, diced cucumber, tomatoes, pomegranate, and roasted peanuts in lemon chaat dressing.',
      imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&auto=format&fit=crop&q=80',
      temperature: DishTemperature.COLD,
      costPriceCents: 4500, // ₹45 cost
      stdPriceCents: 13000, // ₹130 price
      stationId: stationCold.id,
      allergens: ['Nuts'],
      tags: ['Vegan', 'Jain', 'Gluten-Free'],
      optionGroupIds: [ogSaladAddons.id],
    },
    {
      categoryId: catSalads.id,
      sku: 'SLD-004',
      name: 'Aloo Tikki Chana Chaat Bowl',
      description: 'Golden potato patties topped with warm spiced chickpeas, sweet curd, tamarind chutney, mint & fine sev.',
      imageUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&auto=format&fit=crop&q=80',
      temperature: DishTemperature.COLD,
      costPriceCents: 5000, // ₹50 cost
      stdPriceCents: 14000, // ₹140 price
      stationId: stationCold.id,
      allergens: ['Dairy'],
      tags: ['Vegetarian'],
      optionGroupIds: [ogSaladAddons.id],
    },
    {
      categoryId: catSalads.id,
      sku: 'SLD-005',
      name: 'Indian Quinoa & Avocado Salad',
      description: 'Organic quinoa tossed with fresh Alphonso mango, creamy avocado, cherry tomatoes & curry leaf mustard dressing.',
      imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80',
      temperature: DishTemperature.COLD,
      costPriceCents: 6500, // ₹65 cost
      stdPriceCents: 18000, // ₹180 price
      stationId: stationCold.id,
      allergens: [],
      tags: ['Vegan', 'Gluten-Free'],
      optionGroupIds: [ogSaladAddons.id],
    },

    // --- Desserts & Drinks (8 items) ---
    {
      categoryId: catDesserts.id,
      sku: 'DST-001',
      name: 'Shahi Gulab Jamun with Rabri (2 pcs)',
      description: 'Warm soft milk solid dumplings soaked in rose cardamom syrup, served over thick chilled rabri.',
      imageUrl: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=600&auto=format&fit=crop&q=80',
      temperature: DishTemperature.HOT,
      costPriceCents: 3000, // ₹30 cost
      stdPriceCents: 9000, // ₹90 price
      stationId: stationBakery.id,
      allergens: ['Dairy', 'Gluten'],
      tags: ['Vegetarian'],
      optionGroupIds: [],
    },
    {
      categoryId: catDesserts.id,
      sku: 'DST-002',
      name: 'Kesari Saffron Rasmalai (2 pcs)',
      description: 'Soft cottage cheese discs soaked in chilled saffron and cardamom infused thickened milk with sliced pistachios.',
      imageUrl: 'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=600&auto=format&fit=crop&q=80',
      temperature: DishTemperature.COLD,
      costPriceCents: 4000, // ₹40 cost
      stdPriceCents: 11000, // ₹110 price
      stationId: stationBakery.id,
      allergens: ['Dairy', 'Nuts'],
      tags: ['Vegetarian', 'Gluten-Free'],
      optionGroupIds: [],
    },
    {
      categoryId: catDesserts.id,
      sku: 'DST-003',
      name: 'Hyderabadi Double Ka Meetha',
      description: 'Traditional Nizam-style fried bread pudding soaked in cardamom sugar syrup, topped with khoya and silver leaf.',
      imageUrl: 'https://images.unsplash.com/photo-1579372786545-d24232daf58c?w=600&auto=format&fit=crop&q=80',
      temperature: DishTemperature.HOT,
      costPriceCents: 4000, // ₹40 cost
      stdPriceCents: 12000, // ₹120 price
      stationId: stationBakery.id,
      allergens: ['Dairy', 'Gluten', 'Nuts'],
      tags: ['Vegetarian'],
      optionGroupIds: [],
    },
    {
      categoryId: catDesserts.id,
      sku: 'DST-004',
      name: 'Fresh Mango Shrikhand Bowl',
      description: 'Traditional Gujarati strained sweet yogurt whipped with fresh Alphonso mango pulp, saffron, and cardamom.',
      imageUrl: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&fit=crop&q=80',
      temperature: DishTemperature.COLD,
      costPriceCents: 3500, // ₹35 cost
      stdPriceCents: 10000, // ₹100 price
      stationId: stationBakery.id,
      allergens: ['Dairy', 'Nuts'],
      tags: ['Vegetarian', 'Gluten-Free'],
      optionGroupIds: [],
    },
    {
      categoryId: catDesserts.id,
      sku: 'DST-005',
      name: 'Moong Dal Halwa (Desi Ghee)',
      description: 'Classic Rajasthani slow-roasted yellow lentil pudding cooked in pure desi ghee with cashews and almonds.',
      imageUrl: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=600&auto=format&fit=crop&q=80',
      temperature: DishTemperature.HOT,
      costPriceCents: 4500, // ₹45 cost
      stdPriceCents: 13000, // ₹130 price
      stationId: stationBakery.id,
      allergens: ['Dairy', 'Nuts'],
      tags: ['Vegetarian', 'Gluten-Free'],
      optionGroupIds: [],
    },
    {
      categoryId: catDesserts.id,
      sku: 'DST-006',
      name: 'Chilled Mango Lassi (350ml)',
      description: 'Creamy churned yogurt beverage blended with sweet Alphonso mangoes and cardamom.',
      imageUrl: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&auto=format&fit=crop&q=80',
      temperature: DishTemperature.COLD,
      costPriceCents: 2500, // ₹25 cost
      stdPriceCents: 8000, // ₹80 price
      stationId: stationCold.id,
      allergens: ['Dairy'],
      tags: ['Vegetarian', 'Gluten-Free'],
      optionGroupIds: [],
    },
    {
      categoryId: catDesserts.id,
      sku: 'DST-007',
      name: 'Kesari Badam Milk (350ml)',
      description: 'Chilled milk slow-simmered with crushed almonds, saffron strands, and green cardamom.',
      imageUrl: 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=600&auto=format&fit=crop&q=80',
      temperature: DishTemperature.COLD,
      costPriceCents: 3000, // ₹30 cost
      stdPriceCents: 9000, // ₹90 price
      stationId: stationCold.id,
      allergens: ['Dairy', 'Nuts'],
      tags: ['Vegetarian', 'Gluten-Free'],
      optionGroupIds: [],
    },
    {
      categoryId: catDesserts.id,
      sku: 'DST-008',
      name: 'Kolkata Mishti Doi Clay Pot',
      description: 'Authentic Bengali caramel sweet baked yogurt served in an eco-friendly earthen clay pot.',
      imageUrl: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&auto=format&fit=crop&q=80',
      temperature: DishTemperature.COLD,
      costPriceCents: 2500, // ₹25 cost
      stdPriceCents: 8500, // ₹85 price
      stationId: stationBakery.id,
      allergens: ['Dairy'],
      tags: ['Vegetarian', 'Gluten-Free'],
      optionGroupIds: [],
    },
  ];

  const createdDishesMap: Record<string, any> = {};

  for (const dData of indianDishesData) {
    const dish = await prisma.dish.create({
      data: {
        categoryId: dData.categoryId,
        sku: dData.sku,
        name: dData.name,
        description: dData.description,
        imageUrl: dData.imageUrl,
        temperature: dData.temperature,
        costPriceCents: dData.costPriceCents,
        minOrderQuantity: 1,
        isActive: true,
        stationId: dData.stationId,
        allergensJson: JSON.stringify(dData.allergens),
        dietaryTagsJson: JSON.stringify(dData.tags),
        optionGroups: {
          create: dData.optionGroupIds.map((ogId) => ({ optionGroupId: ogId })),
        },
      },
    });

    createdDishesMap[dData.sku] = dish;

    // Attach Tier Prices for Standard, Enterprise, Partner
    await Promise.all([
      prisma.dishTierPrice.create({
        data: { dishId: dish.id, tierId: standardTier.id, priceCents: dData.stdPriceCents, isOverride: false },
      }),
      prisma.dishTierPrice.create({
        data: { dishId: dish.id, tierId: enterpriseTier.id, priceCents: Math.round(dData.stdPriceCents * 1.15), isOverride: false },
      }),
      prisma.dishTierPrice.create({
        data: { dishId: dish.id, tierId: partnerTier.id, priceCents: Math.round(dData.costPriceCents * 2.4), isOverride: false },
      }),
    ]);
  }

  console.log(`✔ Successfully seeded ${Object.keys(createdDishesMap).length} Indian dishes with photo URLs, tier pricing & option groups.`);

  // 8. Create 6 Corporate Companies located in Hyderabad, India
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
      instructions: 'Deliver to Cyber Pearl Campus, Tower 1 reception desk, HITEC City, Hyderabad.',
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

  // 9. Seed 108 Employees (18 per company) across Hyderabad companies
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

  // 10. Seed Interconnected Orders, Drops, Prep Units & Invoices for Hyderabad companies
  console.log('Seeding operational orders for Hyderabad companies in IST...');

  const todayStr = new Date().toISOString().split('T')[0];
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
  const sampleDishKeys = Object.keys(createdDishesMap);

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

      const plannedDeliveryAt = new Date(`${oDateStr}T12:30:00.000+05:30`);
      const plannedDispatchReadyAt = new Date(plannedDeliveryAt.getTime() - 60 * 60 * 1000); // 11:30 AM IST
      const plannedKitchenReadyAt = new Date(plannedDeliveryAt.getTime() - 90 * 60 * 1000);  // 11:00 AM IST

      const dishKey = sampleDishKeys[Math.abs(dayOffset * 5 + i * 3) % sampleDishKeys.length];
      const targetDish = createdDishesMap[dishKey];

      const order = await prisma.order.create({
        data: {
          orderNumber: orderNum++,
          employeeId: emp.id,
          deliveryAddressId: emp.companyId === company1.id ? addr1.id : addr2.id,
          deliveryDate: plannedDeliveryAt,
          deliveryTime: deliveryTimeStr,
          packagingType: 'Eco Box',
          status,
          totalCents: targetDish.costPriceCents * 2, // approximate total
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
          dishId: targetDish.id,
          dishName: targetDish.name,
          dishSku: targetDish.sku,
          quantity: 1,
          unitPriceCents: targetDish.costPriceCents * 2,
          totalCents: targetDish.costPriceCents * 2,
        },
      });

      const combo = await prisma.orderLineCombination.create({
        data: {
          orderLineId: orderLine.id,
          quantity: 1,
          unitPriceCents: targetDish.costPriceCents * 2,
          totalCents: targetDish.costPriceCents * 2,
        },
      });

      if (isToday || isPast) {
        await prisma.kitchenPrepUnit.create({
          data: {
            orderId: order.id,
            orderLineCombinationId: combo.id,
            stationName: targetDish.stationId ? 'Grill Station' : 'Wok & Stir-Fry Station',
            status: isPast ? PrepUnitStatus.DONE : PrepUnitStatus.STARTED,
            startedAt: new Date(plannedKitchenReadyAt.getTime() - 30 * 60 * 1000),
            completedAt: isPast ? plannedKitchenReadyAt : null,
          },
        });
      }
    }
  }

  // 11. Invoices in INR
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
  console.log(`- Indian Cuisine Dishes Seeded: ${Object.keys(createdDishesMap).length}`);
  console.log(`- Categories: 4 (Bowls & Mains, Breakfast Specials, Salads & Wraps, Desserts & Drinks)`);
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
