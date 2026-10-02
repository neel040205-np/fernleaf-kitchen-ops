import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InvoiceStatus, OrderStatus } from '../../common/enums';

@Injectable()
export class BillingService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all confirmed/delivered orders that have not yet been included in an invoice, grouped by company
   */
  async getUninvoicedOrders() {
    const orders = await this.prisma.order.findMany({
      where: {
        status: { in: [OrderStatus.CONFIRMED, OrderStatus.DELIVERED] },
        invoiceId: null,
      },
      include: {
        employee: { include: { company: true } },
        lines: true,
      },
      orderBy: { deliveryDate: 'desc' },
    });

    const companyMap = new Map<string, { company: any; orders: any[]; totalCents: number }>();

    for (const ord of orders) {
      const comp = ord.employee.company;
      if (!companyMap.has(comp.id)) {
        companyMap.set(comp.id, {
          company: comp,
          orders: [],
          totalCents: 0,
        });
      }
      const entry = companyMap.get(comp.id)!;
      entry.orders.push(ord);
      entry.totalCents += ord.totalCents;
    }

    return Array.from(companyMap.values());
  }

  async getInvoices() {
    return this.prisma.invoice.findMany({
      include: {
        company: true,
        orders: { include: { employee: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createInvoice(companyId: string, orderIds: string[]) {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw new NotFoundException('Company not found');

    const orders = await this.prisma.order.findMany({
      where: {
        id: { in: orderIds },
        employee: { companyId },
        invoiceId: null,
        status: { in: [OrderStatus.CONFIRMED, OrderStatus.DELIVERED] },
      },
    });

    if (orders.length === 0) {
      throw new BadRequestException('No eligible uninvoiced confirmed/delivered orders found to generate invoice');
    }

    const totalCents = orders.reduce((sum, o) => sum + o.totalCents, 0);
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;

    const invoice = await this.prisma.invoice.create({
      data: {
        invoiceNumber,
        companyId,
        totalCents,
        status: InvoiceStatus.UNPAID,
        orders: {
          connect: orders.map((o) => ({ id: o.id })),
        },
      },
      include: { company: true, orders: true },
    });

    return invoice;
  }

  async updateInvoiceStatus(invoiceId: string, status: InvoiceStatus) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new NotFoundException('Invoice not found');

    return this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status,
        paidAt: status === InvoiceStatus.PAID ? new Date() : null,
      },
    });
  }
}
