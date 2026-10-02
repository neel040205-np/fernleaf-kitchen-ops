import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DropStatus, OrderStatus } from '../../common/enums';

@Injectable()
export class DispatchService {
  constructor(private prisma: PrismaService) {}

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

    const drops = await this.prisma.deliveryDrop.findMany({
      where: {
        deliveryDate: { gte: targetDate, lt: nextDate },
      },
      include: {
        company: true,
        address: true,
        driver: { select: { id: true, name: true, email: true } },
        orders: {
          include: {
            employee: true,
            lines: { include: { combinations: { include: { options: true } } } },
          },
        },
      },
      orderBy: { deliveryTime: 'asc' },
    });

    return {
      deliveryDate,
      totalDrops: drops.length,
      unassignedCount: drops.filter((d) => !d.driverId).length,
      drops,
    };
  }

  async assignDriverToDrop(dropId: string, driverId: string) {
    const driver = await this.prisma.user.findUnique({ where: { id: driverId } });
    if (!driver) throw new NotFoundException('Driver user not found');

    return this.prisma.deliveryDrop.update({
      where: { id: dropId },
      data: { driverId },
      include: { driver: true, company: true, address: true },
    });
  }

  async updateDropStatus(dropId: string, status: DropStatus) {
    const drop = await this.prisma.deliveryDrop.findUnique({ where: { id: dropId } });
    if (!drop) throw new NotFoundException('Drop not found');

    if (status === DropStatus.OUT_FOR_DELIVERY && !drop.driverId) {
      throw new BadRequestException('Cannot mark drop OUT_FOR_DELIVERY without an assigned driver');
    }

    return this.prisma.deliveryDrop.update({
      where: { id: dropId },
      data: { status },
    });
  }

  /**
   * Driver view: Get today's assigned drops for logged-in driver in time order
   */
  async getDriverMyDrops(driverUserId: string, dateStr?: string) {
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    const nextDate = new Date(targetDate);
    nextDate.setDate(targetDate.getDate() + 1);

    return this.prisma.deliveryDrop.findMany({
      where: {
        driverId: driverUserId,
        deliveryDate: { gte: targetDate, lt: nextDate },
      },
      include: {
        company: true,
        address: true,
        orders: {
          include: {
            employee: true,
            lines: { include: { combinations: { include: { options: true } } } },
          },
        },
      },
      orderBy: { deliveryTime: 'asc' },
    });
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
    if (drop.driverId !== driverUserId) {
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
