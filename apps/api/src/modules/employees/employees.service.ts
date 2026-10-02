import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { parse } from 'csv-parse/sync';

@Injectable()
export class EmployeesService {
  constructor(private prisma: PrismaService) {}

  async getEmployees(companyId?: string) {
    const where = companyId ? { companyId } : {};
    const employees = await this.prisma.employee.findMany({
      where,
      include: { company: true },
      orderBy: { name: 'asc' },
    });

    return employees.map((e) => ({
      ...e,
      allergies: JSON.parse(e.allergiesJson || '[]'),
      dietaryPreferences: JSON.parse(e.dietaryPreferencesJson || '[]'),
    }));
  }

  async getEmployeeById(id: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: { company: { include: { addresses: true, priceTier: true } } },
    });

    if (!employee) throw new NotFoundException('Employee not found');

    return {
      ...employee,
      allergies: JSON.parse(employee.allergiesJson || '[]'),
      dietaryPreferences: JSON.parse(employee.dietaryPreferencesJson || '[]'),
    };
  }

  async createEmployee(data: {
    companyId: string;
    name: string;
    email: string;
    canChooseAddress?: boolean;
    canChangeDeliveryTime?: boolean;
    canChangePackaging?: boolean;
    allergies?: string[];
    dietaryPreferences?: string[];
  }) {
    const cleanEmail = data.email.toLowerCase().trim();
    const existing = await this.prisma.employee.findUnique({ where: { email: cleanEmail } });
    if (existing) throw new BadRequestException(`Employee with email ${cleanEmail} already exists`);

    const employee = await this.prisma.employee.create({
      data: {
        companyId: data.companyId,
        name: data.name,
        email: cleanEmail,
        canChooseAddress: data.canChooseAddress || false,
        canChangeDeliveryTime: data.canChangeDeliveryTime || false,
        canChangePackaging: data.canChangePackaging || false,
        allergiesJson: JSON.stringify(data.allergies || []),
        dietaryPreferencesJson: JSON.stringify(data.dietaryPreferences || []),
      },
    });

    return this.getEmployeeById(employee.id);
  }

  async updateEmployee(id: string, data: any) {
    const updatePayload: any = {};
    if (data.name !== undefined) updatePayload.name = data.name;
    if (data.canChooseAddress !== undefined) updatePayload.canChooseAddress = data.canChooseAddress;
    if (data.canChangeDeliveryTime !== undefined) updatePayload.canChangeDeliveryTime = data.canChangeDeliveryTime;
    if (data.canChangePackaging !== undefined) updatePayload.canChangePackaging = data.canChangePackaging;
    if (data.allergies !== undefined) updatePayload.allergiesJson = JSON.stringify(data.allergies);
    if (data.dietaryPreferences !== undefined) updatePayload.dietaryPreferencesJson = JSON.stringify(data.dietaryPreferences);
    if (data.companyId !== undefined) updatePayload.companyId = data.companyId;

    await this.prisma.employee.update({
      where: { id },
      data: updatePayload,
    });

    return this.getEmployeeById(id);
  }

  /**
   * Bulk import employees from CSV string.
   * Format expected: name,email,canChooseAddress,canChangeDeliveryTime,canChangePackaging,allergies,dietaryPreferences
   * Reports row-level errors without rejecting the whole import batch.
   */
  async bulkImportCsv(companyId: string, csvContent: string) {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw new NotFoundException('Company not found');

    let records: any[];
    try {
      records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } catch (err: any) {
      throw new BadRequestException(`Invalid CSV format: ${err.message}`);
    }

    const created: any[] = [];
    const errors: Array<{ row: number; email: string; error: string }> = [];

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const rowNumber = i + 2; // header is row 1
      const email = row.email ? row.email.toLowerCase().trim() : '';
      const name = row.name ? row.name.trim() : '';

      if (!name || !email) {
        errors.push({ row: rowNumber, email, error: 'Name and email are required' });
        continue;
      }

      try {
        const existing = await this.prisma.employee.findUnique({ where: { email } });
        if (existing) {
          errors.push({ row: rowNumber, email, error: 'Employee with this email already exists' });
          continue;
        }

        const allergies = row.allergies ? row.allergies.split(';').map((s: string) => s.trim()) : [];
        const dietaryPreferences = row.dietaryPreferences ? row.dietaryPreferences.split(';').map((s: string) => s.trim()) : [];

        const emp = await this.prisma.employee.create({
          data: {
            companyId,
            name,
            email,
            canChooseAddress: String(row.canChooseAddress).toLowerCase() === 'true',
            canChangeDeliveryTime: String(row.canChangeDeliveryTime).toLowerCase() === 'true',
            canChangePackaging: String(row.canChangePackaging).toLowerCase() === 'true',
            allergiesJson: JSON.stringify(allergies),
            dietaryPreferencesJson: JSON.stringify(dietaryPreferences),
          },
        });

        created.push(emp);
      } catch (err: any) {
        errors.push({ row: rowNumber, email, error: err.message });
      }
    }

    return {
      importedCount: created.length,
      errorCount: errors.length,
      errors,
      created,
    };
  }
}
