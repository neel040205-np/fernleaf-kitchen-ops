import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { KitchenService } from './kitchen.service';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderStatus, PrepUnitStatus } from '../../common/enums';

describe('KitchenService', () => {
  let service: KitchenService;
  let prisma: PrismaService;

  const mockPrismaService = {
    kitchenPrepUnit: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      updateMany: jest.fn(),
    },
    order: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KitchenService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<KitchenService>(KitchenService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('updateUnitStatus', () => {
    it('should reject status updates for non-confirmed orders', async () => {
      mockPrismaService.kitchenPrepUnit.findUnique.mockResolvedValue({
        id: 'unit-1',
        status: PrepUnitStatus.PENDING,
        order: { id: 'order-1', status: OrderStatus.PLACED },
      });

      await expect(
        service.updateUnitStatus('unit-1', PrepUnitStatus.STARTED),
      ).rejects.toThrow(BadRequestException);
    });

    it('should record start timestamp when advancing PENDING unit to STARTED', async () => {
      mockPrismaService.kitchenPrepUnit.findUnique.mockResolvedValue({
        id: 'unit-1',
        orderId: 'order-1',
        status: PrepUnitStatus.PENDING,
        startedAt: null,
        order: { id: 'order-1', status: OrderStatus.CONFIRMED, kitchenStartedAt: null },
      });

      mockPrismaService.kitchenPrepUnit.update.mockResolvedValue({
        id: 'unit-1',
        status: PrepUnitStatus.STARTED,
      });

      mockPrismaService.kitchenPrepUnit.count.mockResolvedValue(1);

      const result = await service.updateUnitStatus('unit-1', PrepUnitStatus.STARTED);

      expect(result.status).toBe(PrepUnitStatus.STARTED);
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: expect.objectContaining({ kitchenStartedAt: expect.any(Date) }),
      });
    });

    it('should set order kitchenReadyAt when ALL units for order are DONE', async () => {
      mockPrismaService.kitchenPrepUnit.findUnique.mockResolvedValue({
        id: 'unit-[last]',
        orderId: 'order-1',
        status: PrepUnitStatus.STARTED,
        startedAt: new Date(),
        order: { id: 'order-1', status: OrderStatus.CONFIRMED, kitchenStartedAt: new Date() },
      });

      mockPrismaService.kitchenPrepUnit.update.mockResolvedValue({
        id: 'unit-[last]',
        status: PrepUnitStatus.DONE,
      });

      // Count of remaining non-done units is 0
      mockPrismaService.kitchenPrepUnit.count.mockResolvedValue(0);

      await service.updateUnitStatus('unit-[last]', PrepUnitStatus.DONE);

      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: expect.objectContaining({ kitchenReadyAt: expect.any(Date) }),
      });
    });
  });
});
