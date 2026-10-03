import { Test, TestingModule } from '@nestjs/testing';
import { PricingService } from './pricing.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TierDerivationType } from '../../common/enums';

describe('PricingService — Derived Pricing, Overrides & Ceiling Rounding', () => {
  let service: PricingService;
  let prisma: PrismaService;

  const mockPrismaService = {
    priceTier: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    dishTierPrice: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    optionTierPrice: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    dish: {
      findUnique: jest.fn(),
    },
    option: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PricingService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<PricingService>(PricingService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('resolveDishPriceForTier', () => {
    it('should return manual override price when isOverride is true', async () => {
      mockPrismaService.dishTierPrice.findUnique.mockResolvedValue({
        dishId: 'dish-1',
        tierId: 'tier-override',
        priceCents: 1550, // $15.50
        isOverride: true,
      });

      const price = await service.resolveDishPriceForTier('dish-1', 'tier-override');
      expect(price).toBe(1550);
    });

    it('should calculate derived price using MULTIPLIER_OF_COST and round UP to next 5 cents', async () => {
      // Manual override = null
      mockPrismaService.dishTierPrice.findUnique.mockResolvedValue(null);

      // Partner Tier: Cost * 2.4
      mockPrismaService.priceTier.findUnique.mockResolvedValue({
        id: 'tier-partner',
        derivationType: TierDerivationType.MULTIPLIER_OF_COST,
        multiplier: 2.4,
      });

      // Dish Cost = 451 cents ($4.51) -> 451 * 2.4 = 1082.4 -> ceil 1083 -> round UP to next 5 cents = 1085 cents ($10.85)
      mockPrismaService.dish.findUnique.mockResolvedValue({
        id: 'dish-1',
        costPriceCents: 451,
      });

      const price = await service.resolveDishPriceForTier('dish-1', 'tier-partner');
      expect(price).toBe(1085);
    });

    it('should leave exact 5-cent multiples unchanged during derivation rounding', async () => {
      mockPrismaService.dishTierPrice.findUnique.mockResolvedValue(null);
      mockPrismaService.priceTier.findUnique.mockResolvedValue({
        id: 'tier-partner',
        derivationType: TierDerivationType.MULTIPLIER_OF_COST,
        multiplier: 2.0,
      });

      // Cost 450 cents * 2.0 = 900 cents ($9.00) -> exact 5-cent multiple -> stays 900
      mockPrismaService.dish.findUnique.mockResolvedValue({
        id: 'dish-1',
        costPriceCents: 450,
      });

      const price = await service.resolveDishPriceForTier('dish-1', 'tier-partner');
      expect(price).toBe(900);
    });

    it('should calculate derived price using PERCENTAGE_OF_TIER based on base tier price', async () => {
      // First call for enterprise tier (no override)
      mockPrismaService.dishTierPrice.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ priceCents: 1200, isOverride: true }); // Standard base price = 1200 cents

      mockPrismaService.priceTier.findUnique
        .mockResolvedValueOnce({
          id: 'tier-enterprise',
          derivationType: TierDerivationType.PERCENTAGE_OF_TIER,
          baseTierId: 'tier-standard',
          multiplier: 1.15, // Standard + 15%
        })
        .mockResolvedValueOnce({
          id: 'tier-standard',
          derivationType: TierDerivationType.NONE,
        });

      // Base 1200 * 1.15 = 1380 cents -> exact 5 cent multiple -> 1380 cents
      const price = await service.resolveDishPriceForTier('dish-1', 'tier-enterprise');
      expect(price).toBe(1380);
    });

    it('should return null when dish has NO price set on tier (missing price exclusion)', async () => {
      mockPrismaService.dishTierPrice.findUnique.mockResolvedValue(null);
      mockPrismaService.priceTier.findUnique.mockResolvedValue({
        id: 'tier-manual',
        derivationType: TierDerivationType.NONE,
      });

      const price = await service.resolveDishPriceForTier('dish-unpriced', 'tier-manual');
      expect(price).toBeNull();
    });
  });
});
