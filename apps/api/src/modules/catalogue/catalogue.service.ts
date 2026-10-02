import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CatalogueService {
  constructor(private prisma: PrismaService) {}

  // Reference Data
  async getReferenceData() {
    const stations = await this.prisma.referenceKitchenStation.findMany({ orderBy: { name: 'asc' } });
    const allergens = await this.prisma.referenceAllergen.findMany({ orderBy: { name: 'asc' } });
    const dietaryTags = await this.prisma.referenceDietaryTag.findMany({ orderBy: { name: 'asc' } });
    const portionSizes = await this.prisma.referencePortionSize.findMany({ orderBy: { displayOrder: 'asc' } });

    return { stations, allergens, dietaryTags, portionSizes };
  }

  // Categories
  async getCategories() {
    return this.prisma.category.findMany({
      orderBy: { displayOrder: 'asc' },
      include: {
        _count: { select: { dishes: true } },
      },
    });
  }

  async createCategory(data: { name: string; displayOrder?: number; isSecret?: boolean }) {
    return this.prisma.category.create({
      data: {
        name: data.name,
        displayOrder: data.displayOrder || 0,
        isSecret: data.isSecret || false,
      },
    });
  }

  async updateCategory(id: string, data: { name?: string; displayOrder?: number; isActive?: boolean; isSecret?: boolean }) {
    return this.prisma.category.update({
      where: { id },
      data,
    });
  }

  // Dishes
  async getDishes(includeInactive = true) {
    const where = includeInactive ? {} : { isActive: true };
    const dishes = await this.prisma.dish.findMany({
      where,
      include: {
        category: true,
        station: true,
        optionGroups: {
          include: {
            optionGroup: {
              include: {
                options: {
                  include: { portionPrices: true },
                },
              },
            },
          },
        },
        tierPrices: {
          include: { tier: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return dishes.map((dish) => ({
      ...dish,
      allergens: JSON.parse(dish.allergensJson || '[]'),
      dietaryTags: JSON.parse(dish.dietaryTagsJson || '[]'),
    }));
  }

  async getDishById(id: string) {
    const dish = await this.prisma.dish.findUnique({
      where: { id },
      include: {
        category: true,
        station: true,
        optionGroups: {
          include: {
            optionGroup: {
              include: {
                options: {
                  include: { portionPrices: true },
                },
              },
            },
          },
        },
        tierPrices: { include: { tier: true } },
      },
    });

    if (!dish) throw new NotFoundException('Dish not found');

    return {
      ...dish,
      allergens: JSON.parse(dish.allergensJson || '[]'),
      dietaryTags: JSON.parse(dish.dietaryTagsJson || '[]'),
    };
  }

  async createDish(data: {
    categoryId: string;
    name: string;
    description: string;
    sku: string;
    temperature: 'HOT' | 'COLD';
    costPriceCents: number;
    stationId?: string;
    allergens?: string[];
    dietaryTags?: string[];
    optionGroupIds?: string[];
    standardPriceCents?: number;
  }) {
    const existingSku = await this.prisma.dish.findUnique({ where: { sku: data.sku } });
    if (existingSku) throw new BadRequestException(`SKU ${data.sku} already exists`);

    const standardTier = await this.prisma.priceTier.findFirst({ where: { isDefault: true } });

    const dish = await this.prisma.dish.create({
      data: {
        categoryId: data.categoryId,
        name: data.name,
        description: data.description,
        sku: data.sku,
        temperature: data.temperature,
        costPriceCents: data.costPriceCents,
        stationId: data.stationId,
        allergensJson: JSON.stringify(data.allergens || []),
        dietaryTagsJson: JSON.stringify(data.dietaryTags || []),
        optionGroups: data.optionGroupIds
          ? {
              create: data.optionGroupIds.map((ogId) => ({ optionGroupId: ogId })),
            }
          : undefined,
        tierPrices:
          standardTier && data.standardPriceCents !== undefined
            ? {
                create: [{ tierId: standardTier.id, priceCents: data.standardPriceCents, isOverride: true }],
              }
            : undefined,
      },
    });

    return this.getDishById(dish.id);
  }

  async updateDish(
    id: string,
    data: {
      name?: string;
      description?: string;
      temperature?: 'HOT' | 'COLD';
      costPriceCents?: number;
      stationId?: string;
      isActive?: boolean;
      allergens?: string[];
      dietaryTags?: string[];
      optionGroupIds?: string[];
    },
  ) {
    const updatePayload: any = {};
    if (data.name !== undefined) updatePayload.name = data.name;
    if (data.description !== undefined) updatePayload.description = data.description;
    if (data.temperature !== undefined) updatePayload.temperature = data.temperature;
    if (data.costPriceCents !== undefined) updatePayload.costPriceCents = data.costPriceCents;
    if (data.stationId !== undefined) updatePayload.stationId = data.stationId;
    if (data.isActive !== undefined) updatePayload.isActive = data.isActive;
    if (data.allergens !== undefined) updatePayload.allergensJson = JSON.stringify(data.allergens);
    if (data.dietaryTags !== undefined) updatePayload.dietaryTagsJson = JSON.stringify(data.dietaryTags);

    if (data.optionGroupIds) {
      await this.prisma.dishOptionGroup.deleteMany({ where: { dishId: id } });
      updatePayload.optionGroups = {
        create: data.optionGroupIds.map((ogId) => ({ optionGroupId: ogId })),
      };
    }

    await this.prisma.dish.update({
      where: { id },
      data: updatePayload,
    });

    return this.getDishById(id);
  }

  async deactivateDish(id: string) {
    return this.prisma.dish.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // Option Groups & Options
  async getOptionGroups() {
    const groups = await this.prisma.optionGroup.findMany({
      orderBy: { displayOrder: 'asc' },
      include: {
        options: {
          orderBy: { displayOrder: 'asc' },
          include: { portionPrices: true },
        },
      },
    });

    return groups.map((g) => ({
      ...g,
      options: g.options.map((opt) => ({
        ...opt,
        allergens: JSON.parse(opt.allergensJson || '[]'),
        dietaryTags: JSON.parse(opt.dietaryTagsJson || '[]'),
      })),
    }));
  }

  async createOptionGroup(data: {
    name: string;
    isRequired?: boolean;
    displayOrder?: number;
    usesPortions?: boolean;
    options?: Array<{
      name: string;
      costPriceCents: number;
      displayOrder?: number;
      portionPrices?: Array<{ portionSize: string; extraCostCents: number }>;
    }>;
  }) {
    const group = await this.prisma.optionGroup.create({
      data: {
        name: data.name,
        isRequired: data.isRequired || false,
        displayOrder: data.displayOrder || 0,
        usesPortions: data.usesPortions || false,
        options: data.options
          ? {
              create: data.options.map((opt, idx) => ({
                name: opt.name,
                costPriceCents: opt.costPriceCents,
                displayOrder: opt.displayOrder ?? idx + 1,
                portionPrices:
                  data.usesPortions && opt.portionPrices
                    ? {
                        create: opt.portionPrices.map((pp) => ({
                          portionSize: pp.portionSize,
                          extraCostCents: pp.extraCostCents,
                        })),
                      }
                    : undefined,
              })),
            }
          : undefined,
      },
      include: {
        options: { include: { portionPrices: true } },
      },
    });

    return group;
  }
}
