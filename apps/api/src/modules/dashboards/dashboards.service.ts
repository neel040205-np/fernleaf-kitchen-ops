import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderStatus, PrepUnitStatus, DropStatus, Role } from '../../common/enums';

@Injectable()
export class DashboardsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardSummary(userRole: Role, userId?: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const nextDate = new Date(today);
    nextDate.setDate(today.getDate() + 1);

    if (userRole === Role.ADMIN) {
      return this.getAdminDashboard(today, nextDate);
    } else if (userRole === Role.KITCHEN) {
      return this.getKitchenDashboard(today, nextDate);
    } else if (userRole === Role.DISPATCH) {
      return this.getDispatchDashboard(today, nextDate);
    } else if (userRole === Role.DRIVER) {
      return this.getDriverDashboard(userId || '', today, nextDate);
    }

    return this.getAdminDashboard(today, nextDate);
  }

  private async getAdminDashboard(today: Date, nextDate: Date) {
    const [todayOrdersCount, totalRevenueCents, activeCompaniesCount, totalDishesCount, unpricedDishesCount] =
      await Promise.all([
        this.prisma.order.count({
          where: { deliveryDate: { gte: today, lt: nextDate } },
        }),
        this.prisma.order.aggregate({
          where: { status: { in: [OrderStatus.CONFIRMED, OrderStatus.DELIVERED] } },
          _sum: { totalCents: true },
        }),
        this.prisma.company.count(),
        this.prisma.dish.count({ where: { isActive: true } }),
        this.prisma.dish.count({
          where: {
            isActive: true,
            tierPrices: { none: {} },
          },
        }),
      ]);

    return {
      role: Role.ADMIN,
      metrics: {
        todayOrdersCount,
        totalRevenueCents: totalRevenueCents._sum.totalCents || 0,
        activeCompaniesCount,
        totalDishesCount,
        unpricedDishesCount,
      },
    };
  }

  private async getKitchenDashboard(today: Date, nextDate: Date) {
    const unitsToday = await this.prisma.kitchenPrepUnit.findMany({
      where: {
        order: {
          deliveryDate: { gte: today, lt: nextDate },
          status: OrderStatus.CONFIRMED,
        },
      },
      include: { order: true },
    });

    const now = new Date();
    const pendingCount = unitsToday.filter((u) => u.status === PrepUnitStatus.PENDING).length;
    const startedCount = unitsToday.filter((u) => u.status === PrepUnitStatus.STARTED).length;
    const doneCount = unitsToday.filter((u) => u.status === PrepUnitStatus.DONE).length;
    const lateCount = unitsToday.filter((u) => u.order.plannedKitchenReadyAt && u.order.plannedKitchenReadyAt < now && u.status !== PrepUnitStatus.DONE).length;

    return {
      role: Role.KITCHEN,
      metrics: {
        totalPrepUnitsToday: unitsToday.length,
        pendingCount,
        startedCount,
        doneCount,
        lateCount,
      },
    };
  }

  private async getDispatchDashboard(today: Date, nextDate: Date) {
    const dropsToday = await this.prisma.deliveryDrop.findMany({
      where: { deliveryDate: { gte: today, lt: nextDate } },
    });

    const totalDropsToday = dropsToday.length;
    const unassignedCount = dropsToday.filter((d) => !d.driverId).length;
    const outForDeliveryCount = dropsToday.filter((d) => d.status === DropStatus.OUT_FOR_DELIVERY).length;
    const deliveredCount = dropsToday.filter((d) => d.status === DropStatus.DELIVERED).length;
    const onTimeCount = dropsToday.filter((d) => d.status === DropStatus.DELIVERED && d.isOnTime).length;

    return {
      role: Role.DISPATCH,
      metrics: {
        totalDropsToday,
        unassignedCount,
        outForDeliveryCount,
        deliveredCount,
        onTimeRate: deliveredCount > 0 ? Math.round((onTimeCount / deliveredCount) * 100) : 100,
      },
    };
  }

  private async getDriverDashboard(driverId: string, today: Date, nextDate: Date) {
    const myDropsToday = await this.prisma.deliveryDrop.findMany({
      where: {
        driverId,
        deliveryDate: { gte: today, lt: nextDate },
      },
      orderBy: { deliveryTime: 'asc' },
    });

    const totalAssigned = myDropsToday.length;
    const completedCount = myDropsToday.filter((d) => d.status === DropStatus.DELIVERED).length;
    const pendingCount = totalAssigned - completedCount;

    return {
      role: Role.DRIVER,
      metrics: {
        totalAssigned,
        completedCount,
        pendingCount,
      },
      nextDrop: myDropsToday.find((d) => d.status !== DropStatus.DELIVERED) || null,
    };
  }
}
