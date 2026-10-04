import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { calculateDerivedPriceCents } from '../../common/pricing.utils';
import { TierDerivationType } from '../../common/enums';

@Injectable()
export class PricingService {
  constructor(private prisma: PrismaService) {}

  async getTiers() {
    return this.prisma.priceTier.findMany({
      include: {
        baseTier: true,
        _count: { select: { companies: true, dishPrices: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getTierById(id: string) {
    const tier = await this.prisma.priceTier.findUnique({
      where: { id },
      include: {
        baseTier: true,
        dishPrices: { include: { dish: true } },
        optionPrices: { include: { option: true } },
      },
    });

    if (!tier) throw new NotFoundException('Price tier not found');
    return tier;
  }

  async createTier(data: {
    name: string;
    isDefault?: boolean;
    derivationType?: TierDerivationType;
    baseTierId?: string;
    multiplier?: number;
  }) {
    if (data.isDefault) {
      await this.prisma.priceTier.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.priceTier.create({
      data: {
        name: data.name,
        isDefault: data.isDefault || false,
        derivationType: data.derivationType || TierDerivationType.NONE,
        baseTierId: data.baseTierId,
        multiplier: data.multiplier,
      },
    });
  }

  async resolveDishPriceForTier(dishId: string, tierId: string): Promise<number | null> {
    const override = await this.prisma.dishTierPrice.findUnique({
      where: { dishId_tierId: { dishId, tierId } },
    });

    if (override && override.isOverride) {
      return override.priceCents;
    }

    const tier = await this.prisma.priceTier.findUnique({ where: { id: tierId } });
    if (!tier) return null;

    // Direct manual price set
    if (override && tier.derivationType === TierDerivationType.NONE) {
      return override.priceCents;
    }

    // Derived: Multiplier of Cost
    if (tier.derivationType === TierDerivationType.MULTIPLIER_OF_COST && tier.multiplier) {
      const dish = await this.prisma.dish.findUnique({ where: { id: dishId } });
      if (!dish) return null;
      return calculateDerivedPriceCents(dish.costPriceCents, tier.multiplier);
    }

    // Derived: Percentage of Base Tier
    if (tier.derivationType === TierDerivationType.PERCENTAGE_OF_TIER && tier.baseTierId && tier.multiplier) {
      const basePrice = await this.resolveDishPriceForTier(dishId, tier.baseTierId);
      if (!basePrice) return null;
      return calculateDerivedPriceCents(basePrice, tier.multiplier);
    }

    if (override) return override.priceCents;

    // Fallback: If non-default tier without override, attempt fallback to system default tier
    if (!tier.isDefault) {
      const defaultTier = await this.prisma.priceTier.findFirst({ where: { isDefault: true } });
      if (defaultTier && defaultTier.id !== tierId) {
        return this.resolveDishPriceForTier(dishId, defaultTier.id);
      }
    }

    return null;
  }

  async resolveOptionPriceForTier(optionId: string, tierId: string): Promise<number> {
    const override = await this.prisma.optionTierPrice.findUnique({
      where: { optionId_tierId: { optionId, tierId } },
    });

    if (override) return override.priceCents;

    const tier = await this.prisma.priceTier.findUnique({ where: { id: tierId } });
    if (!tier) return 0;

    const option = await this.prisma.option.findUnique({ where: { id: optionId } });
    if (!option) return 0;

    if (tier.derivationType === TierDerivationType.MULTIPLIER_OF_COST && tier.multiplier) {
      return calculateDerivedPriceCents(option.costPriceCents, tier.multiplier);
    }

    if (tier.derivationType === TierDerivationType.PERCENTAGE_OF_TIER && tier.baseTierId && tier.multiplier) {
      const basePrice = await this.resolveOptionPriceForTier(optionId, tier.baseTierId);
      return calculateDerivedPriceCents(basePrice, tier.multiplier);
    }

    if (!tier.isDefault) {
      const defaultTier = await this.prisma.priceTier.findFirst({ where: { isDefault: true } });
      if (defaultTier && defaultTier.id !== tierId) {
        return this.resolveOptionPriceForTier(optionId, defaultTier.id);
      }
    }

    return option.costPriceCents;
  }

  async resolveBulkPrices(
    dishes: Array<{ id: string; costPriceCents: number }>,
    options: Array<{ id: string; costPriceCents: number }>,
    targetTierId: string,
  ) {
    const dishIds = dishes.map((d) => d.id);
    const optionIds = options.map((o) => o.id);

    const [tiers, dishPricesRaw, optionPricesRaw] = await Promise.all([
      this.prisma.priceTier.findMany(),
      dishIds.length > 0
        ? this.prisma.dishTierPrice.findMany({ where: { dishId: { in: dishIds } } })
        : Promise.resolve([]),
      optionIds.length > 0
        ? this.prisma.optionTierPrice.findMany({ where: { optionId: { in: optionIds } } })
        : Promise.resolve([]),
    ]);

    const tierMap = new Map(tiers.map((t) => [t.id, t]));
    const defaultTier = tiers.find((t) => t.isDefault);

    const dishPriceIndex = new Map(dishPricesRaw.map((p) => [`${p.dishId}_${p.tierId}`, p]));
    const optionPriceIndex = new Map(optionPricesRaw.map((p) => [`${p.optionId}_${p.tierId}`, p]));

    const dishCostMap = new Map(dishes.map((d) => [d.id, d.costPriceCents]));
    const optionCostMap = new Map(options.map((o) => [o.id, o.costPriceCents]));

    const resolveDish = (dishId: string, tierId: string): number | null => {
      const override = dishPriceIndex.get(`${dishId}_${tierId}`);
      if (override && override.isOverride) return override.priceCents;

      const tier = tierMap.get(tierId);
      if (!tier) return null;

      const costPriceCents = dishCostMap.get(dishId) || 0;

      if (override && tier.derivationType === TierDerivationType.NONE) {
        return override.priceCents;
      }

      if (tier.derivationType === TierDerivationType.MULTIPLIER_OF_COST && tier.multiplier) {
        return calculateDerivedPriceCents(costPriceCents, tier.multiplier);
      }

      if (tier.derivationType === TierDerivationType.PERCENTAGE_OF_TIER && tier.baseTierId && tier.multiplier) {
        const basePrice = resolveDish(dishId, tier.baseTierId);
        if (basePrice === null) return null;
        return calculateDerivedPriceCents(basePrice, tier.multiplier);
      }

      if (override) return override.priceCents;

      if (!tier.isDefault && defaultTier && defaultTier.id !== tierId) {
        return resolveDish(dishId, defaultTier.id);
      }

      return null;
    };

    const resolveOption = (optionId: string, tierId: string): number => {
      const override = optionPriceIndex.get(`${optionId}_${tierId}`);
      if (override) return override.priceCents;

      const tier = tierMap.get(tierId);
      const costPriceCents = optionCostMap.get(optionId) || 0;
      if (!tier) return costPriceCents;

      if (tier.derivationType === TierDerivationType.MULTIPLIER_OF_COST && tier.multiplier) {
        return calculateDerivedPriceCents(costPriceCents, tier.multiplier);
      }

      if (tier.derivationType === TierDerivationType.PERCENTAGE_OF_TIER && tier.baseTierId && tier.multiplier) {
        const basePrice = resolveOption(optionId, tier.baseTierId);
        return calculateDerivedPriceCents(basePrice, tier.multiplier);
      }

      if (!tier.isDefault && defaultTier && defaultTier.id !== tierId) {
        return resolveOption(optionId, defaultTier.id);
      }

      return costPriceCents;
    };

    const dishResolvedMap = new Map<string, number | null>();
    for (const d of dishes) {
      dishResolvedMap.set(d.id, resolveDish(d.id, targetTierId));
    }

    const optionResolvedMap = new Map<string, number>();
    for (const o of options) {
      optionResolvedMap.set(o.id, resolveOption(o.id, targetTierId));
    }

    return {
      getDishPrice: (dishId: string) => dishResolvedMap.get(dishId) ?? null,
      getOptionPrice: (optionId: string) => optionResolvedMap.get(optionId) ?? 0,
    };
  }

  async setDishPriceOverride(dishId: string, tierId: string, priceCents: number) {
    return this.prisma.dishTierPrice.upsert({
      where: { dishId_tierId: { dishId, tierId } },
      update: { priceCents, isOverride: true },
      create: { dishId, tierId, priceCents, isOverride: true },
    });
  }

  async setOptionPriceOverride(optionId: string, tierId: string, priceCents: number) {
    return this.prisma.optionTierPrice.upsert({
      where: { optionId_tierId: { optionId, tierId } },
      update: { priceCents, isOverride: true },
      create: { optionId, tierId, priceCents, isOverride: true },
    });
  }
}
