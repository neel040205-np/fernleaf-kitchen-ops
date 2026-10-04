import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { DropStatus, OrderStatus, Role } from '../../common/enums';

@Injectable()
export class DispatchService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all registered Delivery Partners with their assigned company and order records
   */
  async getDeliveryPartners() {
    return this.prisma.deliveryPartner.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        company: { select: { id: true, name: true } },
        assignedOrders: {
          include: {
            employee: true,
            deliveryAddress: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        assignedDrops: {
          include: {
            company: true,
            address: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Create a new Delivery Partner record and provision a User account for email/password login
   */
  async createDeliveryPartner(data: {
    name: string;
    email: string;
    phone?: string;
    companyId?: string;
    vehicleDetails?: string;
    password?: string;
  }) {
    const email = data.email.toLowerCase().trim();

    const existingPartner = await this.prisma.deliveryPartner.findUnique({ where: { email } });
    if (existingPartner) {
      throw new ConflictException(`Delivery Partner with email "${email}" already exists`);
    }

    let user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      const rawPassword = data.password || 'Test@1234';
      const passwordHash = await bcrypt.hash(rawPassword, 10);
      user = await this.prisma.user.create({
        data: {
          name: data.name,
          email,
          passwordHash,
          role: Role.DRIVER,
        },
      });
    }

    return this.prisma.deliveryPartner.create({
      data: {
        userId: user.id,
        name: data.name,
        email,
        phone: data.phone || null,
        companyId: data.companyId || null,
        vehicleDetails: data.vehicleDetails || 'Delivery Vehicle',
        status: 'ACTIVE',
      },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        company: true,
      },
    });
  }

  /**
   * Assign a Delivery Partner to a specific Order & Company drop
   */
  async assignPartnerToOrder(orderId: string, deliveryPartnerId: string) {
    const partner = await this.prisma.deliveryPartner.findUnique({
      where: { id: deliveryPartnerId },
      include: { user: true },
    });
    if (!partner) throw new NotFoundException('Delivery Partner not found');

    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: { deliveryPartnerId },
      include: { deliveryPartner: true, employee: { include: { company: true } } },
    });

    if (order.dropId) {
      await this.prisma.deliveryDrop.update({
        where: { id: order.dropId },
        data: {
          deliveryPartnerId,
          driverId: partner.userId || undefined,
        },
      });
    }

    return updatedOrder;
  }

  /**
   * Delivery Partner real-time tracking view for assigned company orders & drops
   */
  async getPartnerMyDeliveries(userId: string, mode: string = 'all') {
    const partner = await this.prisma.deliveryPartner.findFirst({
      where: { OR: [{ userId }, { user: { id: userId } }] },
    });

    const whereCondition: any = partner
      ? { OR: [{ driverId: userId }, { deliveryPartnerId: partner.id }] }
      : { driverId: userId };

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    if (mode === 'today') {
      const todayEnd = new Date(todayStart);
      todayEnd.setDate(todayStart.getDate() + 1);
      whereCondition.deliveryDate = { gte: todayStart, lt: todayEnd };
    } else if (mode === 'upcoming') {
      whereCondition.deliveryDate = { gte: todayStart };
    }

    const rawDrops = await this.prisma.deliveryDrop.findMany({
      where: whereCondition,
      include: {
        company: true,
        address: true,
        deliveryPartner: true,
        orders: {
          where: {
            status: { notIn: [OrderStatus.CANCELLED, OrderStatus.REJECTED] },
          },
          include: {
            employee: true,
            deliveryAddress: true,
            lines: { include: { combinations: { include: { options: true } } } },
          },
        },
      },
      orderBy: [{ deliveryDate: 'asc' }, { deliveryTime: 'asc' }],
    });

    const drops = rawDrops.filter((d) => d.orders && d.orders.length > 0);

    const orders = await this.prisma.order.findMany({
      where: partner
        ? {
            OR: [{ deliveryPartnerId: partner.id }],
            status: { notIn: [OrderStatus.CANCELLED, OrderStatus.REJECTED] },
          }
        : { id: 'none' },
      include: {
        employee: { include: { company: true } },
        deliveryAddress: true,
        deliveryPartner: true,
        lines: { include: { combinations: { include: { options: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      partner,
      drops,
      orders,
    };
  }

  /**
   * Get Dispatch Board drops for a chosen date, grouping orders by company + address + delivery time
   */
  async getDispatchBoard(deliveryDate: string) {
    const targetDate = new Date(deliveryDate);
    targetDate.setHours(0, 0, 0, 0);

    const nextDate = new Date(targetDate);
    nextDate.setDate(targetDate.getDate() + 1);

    // Auto-create drops for any orders for targetDate missing a drop
    const ordersNeedingDrop = await this.prisma.order.findMany({
      where: {
        deliveryDate: { gte: targetDate, lt: nextDate },
        status: { in: [OrderStatus.CONFIRMED, OrderStatus.DELIVERED] },
        dropId: null,
      },
      include: {
        employee: { include: { company: true } },
      },
    });

    for (const ord of ordersNeedingDrop) {
      const companyId = ord.employee.companyId;
      const addressId = ord.deliveryAddressId;
      const deliveryTime = ord.deliveryTime;

      let drop = await this.prisma.deliveryDrop.findUnique({
        where: {
          companyId_addressId_deliveryDate_deliveryTime: {
            companyId,
            addressId,
            deliveryDate: targetDate,
            deliveryTime,
          },
        },
      });

      if (!drop) {
        drop = await this.prisma.deliveryDrop.create({
          data: {
            companyId,
            addressId,
            deliveryDate: targetDate,
            deliveryTime,
            status: DropStatus.PENDING,
            driverId: ord.employee.company.defaultDriverId || null,
          },
        });
      }

      await this.prisma.order.update({
        where: { id: ord.id },
        data: { dropId: drop.id },
      });
    }

    const rawDrops = await this.prisma.deliveryDrop.findMany({
      where: {
        deliveryDate: { gte: targetDate, lt: nextDate },
      },
      include: {
        company: true,
        address: true,
        driver: { select: { id: true, name: true, email: true } },
        deliveryPartner: true,
        orders: {
          where: {
            status: { notIn: [OrderStatus.CANCELLED, OrderStatus.REJECTED] },
          },
          include: {
            employee: true,
            deliveryPartner: true,
            lines: { include: { combinations: { include: { options: true } } } },
          },
        },
      },
      orderBy: { deliveryTime: 'asc' },
    });

    const drops = rawDrops.filter((d) => d.orders && d.orders.length > 0);

    return {
      deliveryDate,
      totalDrops: drops.length,
      unassignedCount: drops.filter((d) => !d.driverId && !d.deliveryPartnerId).length,
      drops,
    };
  }

  async assignDriverToDrop(dropId: string, driverId: string) {
    const driver = await this.prisma.user.findUnique({ where: { id: driverId } });
    if (!driver) throw new NotFoundException('Driver user not found');

    const partner = await this.prisma.deliveryPartner.findFirst({ where: { userId: driverId } });

    return this.prisma.deliveryDrop.update({
      where: { id: dropId },
      data: {
        driverId,
        deliveryPartnerId: partner?.id || undefined,
      },
      include: { driver: true, deliveryPartner: true, company: true, address: true },
    });
  }

  async updateDropStatus(dropId: string, status: DropStatus) {
    const drop = await this.prisma.deliveryDrop.findUnique({ where: { id: dropId } });
    if (!drop) throw new NotFoundException('Drop not found');

    if (status === DropStatus.OUT_FOR_DELIVERY && !drop.driverId && !drop.deliveryPartnerId) {
      throw new BadRequestException('Cannot mark drop OUT_FOR_DELIVERY without an assigned driver/partner');
    }

    return this.prisma.deliveryDrop.update({
      where: { id: dropId },
      data: { status },
    });
  }

  /**
   * Driver view: Get assigned drops for logged-in driver with date/mode filters
   */
  async getDriverMyDrops(driverUserId: string, dateStr?: string, filterMode: string = 'all') {
    const partner = await this.prisma.deliveryPartner.findFirst({ where: { userId: driverUserId } });

    const whereCondition: any = {
      OR: [{ driverId: driverUserId }, partner ? { deliveryPartnerId: partner.id } : {}],
    };

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    if (dateStr) {
      const targetDate = new Date(dateStr);
      targetDate.setHours(0, 0, 0, 0);
      const nextDate = new Date(targetDate);
      nextDate.setDate(targetDate.getDate() + 1);
      whereCondition.deliveryDate = { gte: targetDate, lt: nextDate };
    } else if (filterMode === 'today') {
      const todayEnd = new Date(todayStart);
      todayEnd.setDate(todayStart.getDate() + 1);
      whereCondition.deliveryDate = { gte: todayStart, lt: todayEnd };
    } else if (filterMode === 'upcoming') {
      whereCondition.deliveryDate = { gte: todayStart };
    }

    const rawDrops = await this.prisma.deliveryDrop.findMany({
      where: whereCondition,
      include: {
        company: true,
        address: true,
        deliveryPartner: true,
        orders: {
          where: {
            status: { notIn: [OrderStatus.CANCELLED, OrderStatus.REJECTED] },
          },
          include: {
            employee: true,
            deliveryPartner: true,
            lines: { include: { combinations: { include: { options: true } } } },
          },
        },
      },
      orderBy: [{ deliveryDate: 'asc' }, { deliveryTime: 'asc' }],
    });

    return rawDrops.filter((d) => d.orders && d.orders.length > 0);
  }

  /**
   * Driver completes delivery for a drop with note & optional photo
   */
  async markDropDelivered(
    driverUserId: string,
    dropId: string,
    data: { driverNote?: string; photoUrl?: string },
  ) {
    const drop = await this.prisma.deliveryDrop.findUnique({
      where: { id: dropId },
      include: { orders: true },
    });

    if (!drop) throw new NotFoundException('Drop not found');
    const partner = await this.prisma.deliveryPartner.findFirst({ where: { userId: driverUserId } });

    if (drop.driverId !== driverUserId && drop.deliveryPartnerId !== partner?.id) {
      throw new BadRequestException('This drop is not assigned to you');
    }

    const now = new Date();
    const [delH, delM] = drop.deliveryTime.split(':').map(Number);
    const plannedDeliveryDateTime = new Date(drop.deliveryDate);
    plannedDeliveryDateTime.setHours(delH, delM, 0, 0);

    const isOnTime = now <= plannedDeliveryDateTime;

    const updatedDrop = await this.prisma.deliveryDrop.update({
      where: { id: dropId },
      data: {
        status: DropStatus.DELIVERED,
        deliveredAt: now,
        isOnTime,
        driverNote: data.driverNote || null,
        photoUrl: data.photoUrl || null,
      },
    });

    // Update all associated orders to DELIVERED
    await this.prisma.order.updateMany({
      where: { dropId },
      data: { status: OrderStatus.DELIVERED },
    });

    return updatedDrop;
  }
}
