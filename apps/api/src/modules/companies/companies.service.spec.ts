import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('CompaniesService', () => {
  let service: CompaniesService;
  let prisma: PrismaService;

  const mockPrismaService = {
    company: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    companyEmailDomain: {
      findUnique: jest.fn(),
    },
    deliveryAddress: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompaniesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<CompaniesService>(CompaniesService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('createCompany', () => {
    it('should reject company registration with public domains like gmail.com', async () => {
      await expect(
        service.createCompany({
          name: 'Invalid Public Domain Inc',
          billingContact: 'billing@gmail.com',
          domains: ['gmail.com'],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject company registration if domain is already claimed by another company', async () => {
      mockPrismaService.companyEmailDomain.findUnique.mockResolvedValue({
        id: 'domain-1',
        domain: 'acme.com',
        companyId: 'company-99',
      });

      await expect(
        service.createCompany({
          name: 'Acme Duplicate',
          billingContact: 'billing@acme.com',
          domains: ['acme.com'],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully create company with valid unique corporate domain', async () => {
      mockPrismaService.companyEmailDomain.findUnique.mockResolvedValue(null);
      mockPrismaService.company.create.mockResolvedValue({
        id: 'company-101',
        name: 'New Corporate',
        billingContact: 'finance@newcorp.io',
        domains: [{ domain: 'newcorp.io' }],
      });

      const result = await service.createCompany({
        name: 'New Corporate',
        billingContact: 'finance@newcorp.io',
        domains: ['newcorp.io'],
      });

      expect(result).toHaveProperty('id', 'company-101');
      expect(prisma.company.create).toHaveBeenCalled();
    });
  });
});
