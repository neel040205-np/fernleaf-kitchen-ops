import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const DISALLOWED_PUBLIC_DOMAINS = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'aol.com'];

@Injectable()
export class CompaniesService {
  constructor(private prisma: PrismaService) {}

  async getCompanies() {
    const companies = await this.prisma.company.findMany({
      include: {
        domains: true,
        addresses: true,
        owner: true,
        priceTier: true,
        defaultDriver: true,
        _count: { select: { employees: true, invoices: true, drops: true } },
      },
      orderBy: { name: 'asc' },
    });

    return companies.map((c) => ({
      ...c,
      workingDays: JSON.parse(c.workingDaysJson || '[1,2,3,4,5]'),
    }));
  }

  async getCompanyById(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        domains: true,
        addresses: true,
        owner: true,
        priceTier: true,
        defaultDriver: true,
        employees: true,
        holidays: true,
        hiddenCategories: { include: { category: true } },
        hiddenItems: { include: { dish: true } },
      },
    });

    if (!company) throw new NotFoundException('Company not found');

    return {
      ...company,
      workingDays: JSON.parse(company.workingDaysJson || '[1,2,3,4,5]'),
    };
  }

  async createCompany(data: {
    name: string;
    billingContact: string;
    domains: string[];
    priceTierId?: string;
    defaultDeliveryTime?: string;
    deliveryLeadMinutes?: number;
    defaultPackaging?: string;
    driverInstructions?: string;
    defaultDriverId?: string;
    addresses?: Array<{ addressLine: string; city: string; postalCode: string; notes?: string }>;
  }) {
    for (const domain of data.domains) {
      const cleanDomain = domain.toLowerCase().trim();
      if (DISALLOWED_PUBLIC_DOMAINS.includes(cleanDomain)) {
        throw new BadRequestException(`Public domain ${cleanDomain} is not allowed for corporate companies`);
      }

      const existingDomain = await this.prisma.companyEmailDomain.findUnique({ where: { domain: cleanDomain } });
      if (existingDomain) {
        throw new BadRequestException(`Domain ${cleanDomain} is already registered to another company`);
      }
    }

    return this.prisma.company.create({
      data: {
        name: data.name,
        billingContact: data.billingContact,
        priceTierId: data.priceTierId,
        defaultDeliveryTime: data.defaultDeliveryTime || '12:00',
        deliveryLeadMinutes: data.deliveryLeadMinutes || 60,
        defaultPackaging: data.defaultPackaging || 'Standard Box',
        driverInstructions: data.driverInstructions,
        defaultDriverId: data.defaultDriverId,
        domains: {
          create: data.domains.map((d) => ({ domain: d.toLowerCase().trim() })),
        },
        addresses: data.addresses
          ? {
              create: data.addresses,
            }
          : undefined,
      },
      include: { domains: true, addresses: true },
    });
  }

  async updateCompany(id: string, data: any) {
    const updatePayload: any = {};
    if (data.name !== undefined) updatePayload.name = data.name;
    if (data.billingContact !== undefined) updatePayload.billingContact = data.billingContact;
    if (data.priceTierId !== undefined) updatePayload.priceTierId = data.priceTierId;
    if (data.defaultDeliveryTime !== undefined) updatePayload.defaultDeliveryTime = data.defaultDeliveryTime;
    if (data.deliveryLeadMinutes !== undefined) updatePayload.deliveryLeadMinutes = data.deliveryLeadMinutes;
    if (data.defaultPackaging !== undefined) updatePayload.defaultPackaging = data.defaultPackaging;
    if (data.driverInstructions !== undefined) updatePayload.driverInstructions = data.driverInstructions;
    if (data.defaultDriverId !== undefined) updatePayload.defaultDriverId = data.defaultDriverId;
    if (data.workingDays !== undefined) updatePayload.workingDaysJson = JSON.stringify(data.workingDays);

    return this.prisma.company.update({
      where: { id },
      data: updatePayload,
      include: { domains: true, addresses: true },
    });
  }

  async addAddress(companyId: string, address: { addressLine: string; city: string; postalCode: string; notes?: string }) {
    return this.prisma.deliveryAddress.create({
      data: {
        companyId,
        ...address,
      },
    });
  }
}
