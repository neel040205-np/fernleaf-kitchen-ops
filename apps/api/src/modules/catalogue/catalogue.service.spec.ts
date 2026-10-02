import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CatalogueService } from './catalogue.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('CatalogueService — Deactivation, Hiding & Categories', () => {
  let service: CatalogueService;
  let prisma: PrismaService;

  const mockPrismaService = {
    dish: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    category: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    companyHiddenCategory: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    companyHiddenItem: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    referenceKitchenStation: { findMany: jest.fn() },
    referenceAllergen: { findMany: jest.fn() },
    referenceDietaryTag: { findMany: jest.fn() },
    referencePortionSize: { findMany: jest.fn() },
    priceTier: { findFirst: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogueService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<CatalogueService>(CatalogueService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('deactivateDish', () => {
    it('should set isActive to false for dish without deleting database record', async () => {
      mockPrismaService.dish.findUnique.mockResolvedValue({
        id: 'dish-100',
        name: 'Paneer Bowl',
        isActive: true,
      });

      mockPrismaService.dish.update.mockResolvedValue({
        id: 'dish-100',
        name: 'Paneer Bowl',
        isActive: false,
      });

      const result = await service.deactivateDish('dish-100');

      expect(result.isActive).toBe(false);
      expect(prisma.dish.update).toHaveBeenCalledWith({
        where: { id: 'dish-100' },
        data: { isActive: false },
      });
    });

    it('should throw NotFoundException if dish does not exist', async () => {
      mockPrismaService.dish.findUnique.mockResolvedValue(null);

      await expect(service.deactivateDish('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('Company Menu Hiding', () => {
    it('should hide category for company when not currently hidden', async () => {
      mockPrismaService.companyHiddenCategory.findUnique.mockResolvedValue(null);
      mockPrismaService.companyHiddenCategory.create.mockResolvedValue({
        companyId: 'comp-1',
        categoryId: 'cat-1',
      });

      const res = await service.toggleCompanyCategoryHiding('comp-1', 'cat-1');

      expect(res).toEqual({ companyId: 'comp-1', categoryId: 'cat-1', isHidden: true });
      expect(prisma.companyHiddenCategory.create).toHaveBeenCalledWith({
        data: { companyId: 'comp-1', categoryId: 'cat-1' },
      });
    });

    it('should unhide category for company when already hidden', async () => {
      mockPrismaService.companyHiddenCategory.findUnique.mockResolvedValue({
        companyId: 'comp-1',
        categoryId: 'cat-1',
      });

      const res = await service.toggleCompanyCategoryHiding('comp-1', 'cat-1');

      expect(res).toEqual({ companyId: 'comp-1', categoryId: 'cat-1', isHidden: false });
      expect(prisma.companyHiddenCategory.delete).toHaveBeenCalledWith({
        where: { companyId_categoryId: { companyId: 'comp-1', categoryId: 'cat-1' } },
      });
    });
  });

  describe('Categories', () => {
    it('should reject creating category with duplicate name', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue({
        id: 'cat-existing',
        name: 'Bowls',
      });

      await expect(
        service.createCategory({ name: 'Bowls' }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
