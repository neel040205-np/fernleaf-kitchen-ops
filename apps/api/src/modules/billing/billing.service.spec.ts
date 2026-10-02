import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BillingService } from './billing.service';
import { PrismaService } from '../../prisma/prisma.service';
import { InvoiceStatus, OrderStatus } from '../../common/enums';

describe('BillingService', () => {
  let service: BillingService;
  let prisma: PrismaService;

  const mockPrismaService = {
    order: {
      findMany: jest.fn(),
    },
    company: {
      findUnique: jest.fn(),
    },
    invoice: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<BillingService>(BillingService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('createInvoice', () => {
    it('should throw BadRequestException if no eligible uninvoiced confirmed orders exist', async () => {
      mockPrismaService.company.findUnique.mockResolvedValue({ id: 'comp-1', name: 'Acme' });
      mockPrismaService.order.findMany.mockResolvedValue([]);

      await expect(
        service.createInvoice('comp-1', ['ord-1']),
      ).rejects.toThrow(BadRequestException);
    });

    it('should calculate total cents and generate invoice for valid uninvoiced orders', async () => {
      mockPrismaService.company.findUnique.mockResolvedValue({ id: 'comp-1', name: 'Acme' });
      mockPrismaService.order.findMany.mockResolvedValue([
        { id: 'ord-1', totalCents: 1550, status: OrderStatus.CONFIRMED },
        { id: 'ord-2', totalCents: 2000, status: OrderStatus.DELIVERED },
      ]);

      mockPrismaService.invoice.create.mockResolvedValue({
        id: 'inv-100',
        invoiceNumber: 'INV-123456-999',
        companyId: 'comp-1',
        totalCents: 3550,
        status: InvoiceStatus.UNPAID,
      });

      const invoice = await service.createInvoice('comp-1', ['ord-1', 'ord-2']);

      expect(invoice.totalCents).toBe(3550);
      expect(prisma.invoice.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          companyId: 'comp-1',
          totalCents: 3550,
          status: InvoiceStatus.UNPAID,
        }),
        include: { company: true, orders: true },
      });
    });
  });
});
