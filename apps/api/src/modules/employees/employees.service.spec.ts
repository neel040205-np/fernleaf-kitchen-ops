import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('EmployeesService', () => {
  let service: EmployeesService;
  let prisma: PrismaService;

  const mockPrismaService = {
    company: {
      findUnique: jest.fn(),
    },
    employee: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<EmployeesService>(EmployeesService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('bulkImportCsv', () => {
    it('should throw NotFoundException if company does not exist', async () => {
      mockPrismaService.company.findUnique.mockResolvedValue(null);

      await expect(
        service.bulkImportCsv('non-existent-company', 'name,email\nJohn,john@test.com'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should process CSV and report row-level errors without rejecting valid rows', async () => {
      mockPrismaService.company.findUnique.mockResolvedValue({ id: 'comp-1', name: 'Acme Corp' });

      // First row: duplicate email (simulated)
      mockPrismaService.employee.findUnique
        .mockResolvedValueOnce({ id: 'emp-dup', email: 'existing@acme.com' })
        .mockResolvedValueOnce(null);

      mockPrismaService.employee.create.mockResolvedValue({
        id: 'emp-2',
        name: 'New Employee',
        email: 'new@acme.com',
      });

      const csvContent = `name,email,canChooseAddress,canChangeDeliveryTime,canChangePackaging,allergies,dietaryPreferences
Existing User,existing@acme.com,true,false,false,Nuts,Vegan
New Employee,new@acme.com,false,true,true,,Jain`;

      const result = await service.bulkImportCsv('comp-1', csvContent);

      expect(result.importedCount).toBe(1);
      expect(result.errorCount).toBe(1);
      expect(result.errors[0]).toEqual({
        row: 2,
        email: 'existing@acme.com',
        error: 'Employee with this email already exists',
      });
      expect(result.created).toHaveLength(1);
    });
  });
});
