import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderStatus, PrepUnitStatus } from '../../common/enums';

@Injectable()
export class KitchenService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get Kitchen Board prep units for a delivery date, grouped or filtered by station
   */
  async getKitchenBoard(deliveryDate: string, stationName?: string) {
    const targetDate = new Date(deliveryDate);
    targetDate.setHours(0, 0, 0, 0);

    const nextDate = new Date(targetDate);
    nextDate.setDate(targetDate.getDate() + 1);

    const where: any = {
      order: {
        deliveryDate: { gte: targetDate, lt: nextDate },
        status: OrderStatus.CONFIRMED,
      },
    };

    if (stationName) {
      where.stationName = stationName;
    }

    const prepUnits = await this.prisma.kitchenPrepUnit.findMany({
      where,
      include: {
        order: {
          include: {
            employee: { include: { company: true } },
          },
        },
        orderLineCombination: {
          include: {
            orderLine: true,
            options: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const now = new Date();

    // Auto-cancel past-due unfulfilled orders whose planned kitchen ready time has passed
    const overdueOrders = await this.prisma.order.findMany({
      where: {
        deliveryDate: { gte: targetDate, lt: nextDate },
        plannedKitchenReadyAt: { lt: now },
        status: OrderStatus.CONFIRMED,
        kitchenReadyAt: null,
      },
    });

    if (overdueOrders.length > 0) {
      const overdueIds = overdueOrders.map((o) => o.id);
      await this.prisma.order.updateMany({
        where: { id: { in: overdueIds } },
        data: { status: OrderStatus.CANCELLED },
      });
    }

    const formattedUnits = prepUnits.map((unit) => {
      const delDateStr = unit.order.deliveryDate.toISOString().split('T')[0];
      const deliveryTime = unit.order.deliveryTime || '12:00';
      const [delH, delM] = deliveryTime.split(':').map(Number);
      const hhStr = String(isNaN(delH) ? 12 : delH).padStart(2, '0');
      const mmStr = String(isNaN(delM) ? 0 : delM).padStart(2, '0');

      // IST Date representation (+05:30)
      const plannedDeliveryDateTime = new Date(`${delDateStr}T${hhStr}:${mmStr}:00.000+05:30`);

      let plannedDispatchReadyAt = unit.order.plannedDispatchReadyAt;
      if (!plannedDispatchReadyAt) {
        const leadMins = unit.order.employee?.company?.deliveryLeadMinutes || 60;
        plannedDispatchReadyAt = new Date(plannedDeliveryDateTime.getTime() - leadMins * 60 * 1000);
      }

      let plannedKitchenReadyAt = unit.order.plannedKitchenReadyAt;
      if (!plannedKitchenReadyAt) {
        // Expected cooking completion: 1:30 (90 min) before delivery or 0:30 before dispatch
        plannedKitchenReadyAt = new Date(plannedDeliveryDateTime.getTime() - 90 * 60 * 1000);
      }

      const isLate = plannedKitchenReadyAt
        ? plannedKitchenReadyAt < now && unit.status !== PrepUnitStatus.DONE
        : false;

      return {
        ...unit,
        expectedCookingCompletionAt: plannedKitchenReadyAt,
        plannedDispatchReadyAt,
        plannedDeliveryAt: plannedDeliveryDateTime,
        isLate,
      };
    });

    return {
      deliveryDate,
      totalUnits: formattedUnits.length,
      pendingCount: formattedUnits.filter((u) => u.status === PrepUnitStatus.PENDING).length,
      startedCount: formattedUnits.filter((u) => u.status === PrepUnitStatus.STARTED).length,
      doneCount: formattedUnits.filter((u) => u.status === PrepUnitStatus.DONE).length,
      units: formattedUnits,
    };
  }

  /**
   * Update status of a kitchen prep unit (PENDING -> STARTED -> DONE)
   * Enforces rules:
   * 1. Only confirmed orders can be worked on
   * 2. Unit cannot be started twice or finished twice
   * 3. Finishing unit that was never started auto-records start time
   * 4. Updates order's kitchenStartedAt on first unit start
   * 5. Updates order's kitchenReadyAt when ALL units in order are DONE
   */
  async updateUnitStatus(unitId: string, targetStatus: PrepUnitStatus) {
    const unit = await this.prisma.kitchenPrepUnit.findUnique({
      where: { id: unitId },
      include: { order: true },
    });

    if (!unit) throw new NotFoundException('Prep unit not found');

    if (unit.order.status !== OrderStatus.CONFIRMED) {
      throw new BadRequestException('Only confirmed orders can be worked on in the kitchen');
    }

    if (unit.status === targetStatus) {
      throw new BadRequestException(`Prep unit is already ${targetStatus}`);
    }

    const now = new Date();
    const updateData: any = { status: targetStatus };

    if (targetStatus === PrepUnitStatus.STARTED) {
      if (unit.status !== PrepUnitStatus.PENDING) {
        throw new BadRequestException('Unit can only be started from PENDING status');
      }
      updateData.startedAt = now;
    } else if (targetStatus === PrepUnitStatus.DONE) {
      updateData.completedAt = now;
      if (!unit.startedAt) {
        updateData.startedAt = now;
      }
    }

    // Atomic update
    const updatedUnit = await this.prisma.kitchenPrepUnit.update({
      where: { id: unitId },
      data: updateData,
    });

    // Update Order's kitchenStartedAt if this is the first unit started
    if (!unit.order.kitchenStartedAt) {
      await this.prisma.order.update({
        where: { id: unit.orderId },
        data: { kitchenStartedAt: now },
      });
    }

    // Check if ALL prep units for this order are DONE
    const remainingUnits = await this.prisma.kitchenPrepUnit.count({
      where: {
        orderId: unit.orderId,
        status: { not: PrepUnitStatus.DONE },
      },
    });

    if (remainingUnits === 0) {
      await this.prisma.order.update({
        where: { id: unit.orderId },
        data: { kitchenReadyAt: now },
      });
    }

    return updatedUnit;
  }

  /**
   * Admin force-complete a whole order
   */
  async forceCompleteOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { prepUnits: true },
    });

    if (!order) throw new NotFoundException('Order not found');

    const now = new Date();

    await this.prisma.kitchenPrepUnit.updateMany({
      where: { orderId },
      data: {
        status: PrepUnitStatus.DONE,
        completedAt: now,
      },
    });

    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        kitchenStartedAt: order.kitchenStartedAt || now,
        kitchenReadyAt: now,
      },
      include: { prepUnits: true },
    });
  }
}
