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

    return override ? override.priceCents : null;
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

    return option.costPriceCents;
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
