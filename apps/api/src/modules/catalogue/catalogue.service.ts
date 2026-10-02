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
    const existing = await this.prisma.category.findUnique({ where: { name: data.name } });
    if (existing) throw new BadRequestException(`Category "${data.name}" already exists`);

    return this.prisma.category.create({
      data: {
        name: data.name,
        displayOrder: data.displayOrder || 0,
        isSecret: data.isSecret || false,
      },
    });
  }

  async updateCategory(id: string, data: { name?: string; displayOrder?: number; isActive?: boolean; isSecret?: boolean }) {
    const cat = await this.prisma.category.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException('Category not found');

    return this.prisma.category.update({
      where: { id },
      data,
    });
  }

  // Dishes with Search, Filtering & Server-side Pagination
  async getDishes(options?: {
    search?: string;
    categoryId?: string;
    stationId?: string;
    includeInactive?: boolean;
    page?: number;
    limit?: number;
  }) {
    const page = options?.page || 1;
    const limit = options?.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (options?.includeInactive === false) {
      where.isActive = true;
    }
    if (options?.categoryId) {
      where.categoryId = options.categoryId;
    }
    if (options?.stationId) {
      where.stationId = options.stationId;
    }
    if (options?.search) {
      where.OR = [
        { name: { contains: options.search } },
        { description: { contains: options.search } },
        { sku: { contains: options.search } },
      ];
    }

    const [total, dishes] = await Promise.all([
      this.prisma.dish.count({ where }),
      this.prisma.dish.findMany({
        where,
        skip,
        take: limit,
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
      }),
    ]);

    const formattedDishes = dishes.map((dish) => ({
      ...dish,
      allergens: JSON.parse(dish.allergensJson || '[]'),
      dietaryTags: JSON.parse(dish.dietaryTagsJson || '[]'),
    }));

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      dishes: formattedDishes,
    };
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
    imageUrl?: string;
    temperature: 'HOT' | 'COLD';
    costPriceCents: number;
    minOrderQuantity?: number;
    stationId?: string;
    allergens?: string[];
    dietaryTags?: string[];
    optionGroupIds?: string[];
    standardPriceCents?: number;
  }) {
    const existingSku = await this.prisma.dish.findUnique({ where: { sku: data.sku } });
    if (existingSku) throw new BadRequestException(`SKU "${data.sku}" already exists`);

    const standardTier = await this.prisma.priceTier.findFirst({ where: { isDefault: true } });

    const dish = await this.prisma.dish.create({
      data: {
        categoryId: data.categoryId,
        name: data.name,
        description: data.description,
        sku: data.sku,
        imageUrl: data.imageUrl || null,
        temperature: data.temperature,
        costPriceCents: data.costPriceCents,
        minOrderQuantity: data.minOrderQuantity || 1,
        stationId: data.stationId || null,
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
      categoryId?: string;
      name?: string;
      description?: string;
      sku?: string;
      imageUrl?: string;
      temperature?: 'HOT' | 'COLD';
      costPriceCents?: number;
      minOrderQuantity?: number;
      stationId?: string;
      isActive?: boolean;
      allergens?: string[];
      dietaryTags?: string[];
      optionGroupIds?: string[];
    },
  ) {
    const existing = await this.prisma.dish.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Dish not found');

    if (data.sku && data.sku !== existing.sku) {
      const dup = await this.prisma.dish.findUnique({ where: { sku: data.sku } });
      if (dup) throw new BadRequestException(`SKU "${data.sku}" is already in use by another dish`);
    }

    const updatePayload: any = {};
    if (data.categoryId !== undefined) updatePayload.categoryId = data.categoryId;
    if (data.name !== undefined) updatePayload.name = data.name;
    if (data.description !== undefined) updatePayload.description = data.description;
    if (data.sku !== undefined) updatePayload.sku = data.sku;
    if (data.imageUrl !== undefined) updatePayload.imageUrl = data.imageUrl;
    if (data.temperature !== undefined) updatePayload.temperature = data.temperature;
    if (data.costPriceCents !== undefined) updatePayload.costPriceCents = data.costPriceCents;
    if (data.minOrderQuantity !== undefined) updatePayload.minOrderQuantity = data.minOrderQuantity;
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

  /**
   * Deactivate a dish without breaking historical order references.
   * Sets isActive: false.
   */
  async deactivateDish(id: string) {
    const dish = await this.prisma.dish.findUnique({ where: { id } });
    if (!dish) throw new NotFoundException('Dish not found');

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

  async updateOptionGroup(
    id: string,
    data: {
      name?: string;
      isRequired?: boolean;
      displayOrder?: number;
      usesPortions?: boolean;
    },
  ) {
    const og = await this.prisma.optionGroup.findUnique({ where: { id } });
    if (!og) throw new NotFoundException('Option group not found');

    return this.prisma.optionGroup.update({
      where: { id },
      data,
    });
  }

  // Company Menu Hiding Configuration
  async toggleCompanyCategoryHiding(companyId: string, categoryId: string) {
    const existing = await this.prisma.companyHiddenCategory.findUnique({
      where: { companyId_categoryId: { companyId, categoryId } },
    });

    if (existing) {
      await this.prisma.companyHiddenCategory.delete({
        where: { companyId_categoryId: { companyId, categoryId } },
      });
      return { companyId, categoryId, isHidden: false };
    } else {
      await this.prisma.companyHiddenCategory.create({
        data: { companyId, categoryId },
      });
      return { companyId, categoryId, isHidden: true };
    }
  }

  async toggleCompanyDishHiding(companyId: string, dishId: string) {
    const existing = await this.prisma.companyHiddenItem.findUnique({
      where: { companyId_dishId: { companyId, dishId } },
    });

    if (existing) {
      await this.prisma.companyHiddenItem.delete({
        where: { companyId_dishId: { companyId, dishId } },
      });
      return { companyId, dishId, isHidden: false };
    } else {
      await this.prisma.companyHiddenItem.create({
        data: { companyId, dishId },
      });
      return { companyId, dishId, isHidden: true };
    }
  }
}
