import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PricingService } from '../pricing/pricing.service';
import { calculateCutoffDateTime, isCutoffPassed } from '../../common/cutoff.utils';
import { OrderStatus, PrepUnitStatus, Role } from '../../common/enums';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private pricingService: PricingService,
  ) {}

  /**
   * Preview the menu exactly as a given employee sees it, applying:
   * 1. Employee's company price tier resolution
   * 2. Hiding zero-price dishes on that tier
   * 3. Hiding categories or items configured as hidden by the company
   * 4. Hiding secret categories from generic list
   */
  async getEmployeeMenuPreview(employeeId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        company: {
          include: {
            priceTier: true,
            hiddenCategories: true,
            hiddenItems: true,
          },
        },
      },
    });

    if (!employee) throw new NotFoundException('Employee not found');

    const defaultTier = await this.prisma.priceTier.findFirst({ where: { isDefault: true } });
    const resolvedTierId = employee.company.priceTierId || defaultTier?.id;

    if (!resolvedTierId) {
      throw new BadRequestException('No valid price tier configured for company or default system');
    }

    const hiddenCatIds = employee.company.hiddenCategories.map((hc) => hc.categoryId);
    const hiddenDishIds = employee.company.hiddenItems.map((hi) => hi.dishId);

    const categories = await this.prisma.category.findMany({
      where: {
        isActive: true,
        isSecret: false,
        id: { notIn: hiddenCatIds },
      },
      orderBy: { displayOrder: 'asc' },
      include: {
        dishes: {
          where: {
            isActive: true,
            id: { notIn: hiddenDishIds },
          },
          include: {
            station: true,
            optionGroups: {
              include: {
                optionGroup: {
                  include: {
                    options: {
                      include: { portionPrices: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const allDishes = categories.flatMap((c) => c.dishes);
    const allOptions = allDishes.flatMap((d) =>
      d.optionGroups.flatMap((og) => og.optionGroup.options),
    );

    const priceResolver = await this.pricingService.resolveBulkPrices(
      allDishes.map((d) => ({ id: d.id, costPriceCents: d.costPriceCents })),
      allOptions.map((o) => ({ id: o.id, costPriceCents: o.costPriceCents })),
      resolvedTierId,
    );

    const resultCategories = [];

    for (const cat of categories) {
      const validDishes = [];

      for (const dish of cat.dishes) {
        const dishPriceCents = priceResolver.getDishPrice(dish.id);

        // Rule: A dish with no price on the employee's tier MUST NOT appear on their menu at all
        if (dishPriceCents === null || dishPriceCents <= 0) {
          continue;
        }

        const optionGroups = [];
        for (const ogRef of dish.optionGroups) {
          const og = ogRef.optionGroup;
          const options = [];

          for (const opt of og.options) {
            const optPriceCents = priceResolver.getOptionPrice(opt.id);
            options.push({
              ...opt,
              allergens: JSON.parse(opt.allergensJson || '[]'),
              dietaryTags: JSON.parse(opt.dietaryTagsJson || '[]'),
              resolvedPriceCents: optPriceCents,
            });
          }

          optionGroups.push({
            ...og,
            options,
          });
        }

        validDishes.push({
          ...dish,
          allergens: JSON.parse(dish.allergensJson || '[]'),
          dietaryTags: JSON.parse(dish.dietaryTagsJson || '[]'),
          resolvedPriceCents: dishPriceCents,
          optionGroups,
        });
      }

      if (validDishes.length > 0) {
        resultCategories.push({
          ...cat,
          dishes: validDishes,
        });
      }
    }

    return {
      employee: {
        id: employee.id,
        name: employee.name,
        companyName: employee.company.name,
        companyDefaults: {
          deliveryTime: employee.company.defaultDeliveryTime,
          packaging: employee.company.defaultPackaging,
          driverInstructions: employee.company.driverInstructions,
        },
        permissions: {
          canChooseAddress: employee.canChooseAddress,
          canChangeDeliveryTime: employee.canChangeDeliveryTime,
          canChangePackaging: employee.canChangePackaging,
        },
      },
      resolvedTierId,
      categories: resultCategories,
    };
  }

  /**
   * Get orders list with pagination & filters
   */
  async getOrders(filters: {
    deliveryDateFrom?: string;
    deliveryDateTo?: string;
    status?: string;
    companyId?: string;
    invoiced?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.status) where.status = filters.status;
    if (filters.companyId) where.employee = { companyId: filters.companyId };
    if (filters.invoiced !== undefined) {
      where.invoiceId = filters.invoiced ? { not: null } : null;
    }

    if (filters.search && filters.search.trim() !== '') {
      const q = filters.search.trim();
      const isNum = !isNaN(Number(q));
      where.OR = [
        ...(isNum ? [{ orderNumber: Number(q) }] : []),
        { employee: { name: { contains: q, mode: 'insensitive' } } },
        { employee: { company: { name: { contains: q, mode: 'insensitive' } } } },
        { lines: { some: { dishName: { contains: q, mode: 'insensitive' } } } },
        { deliveryAddress: { addressLine: { contains: q, mode: 'insensitive' } } },
        { status: { contains: q, mode: 'insensitive' } },
        { packagingType: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (filters.deliveryDateFrom || filters.deliveryDateTo) {
      where.deliveryDate = {};
      if (filters.deliveryDateFrom) where.deliveryDate.gte = new Date(filters.deliveryDateFrom);
      if (filters.deliveryDateTo) where.deliveryDate.lte = new Date(filters.deliveryDateTo);
    }

    const [total, orders] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          employee: { include: { company: true } },
          deliveryAddress: true,
          lines: {
            include: {
              combinations: {
                include: { options: true },
              },
            },
          },
          invoice: true,
          drop: true,
        },
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      orders,
    };
  }

  async getOrderById(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        employee: { include: { company: true } },
        deliveryAddress: true,
        lines: {
          include: {
            combinations: {
              include: { options: true, prepUnits: true },
            },
          },
        },
        prepUnits: true,
        invoice: true,
        drop: true,
      },
    });

    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  /**
   * Create an order with full validation & historical price snapshotting
   */
  async createOrder(
    userRole: Role,
    data: {
      employeeId: string;
      deliveryAddressId?: string;
      deliveryDate: string; // YYYY-MM-DD
      deliveryTime?: string;
      packagingType?: string;
      status?: OrderStatus;
      lines: Array<{
        dishId: string;
        quantity: number;
        combinations: Array<{
          quantity: number;
          options: Array<{
            optionId: string;
            portionSize?: string;
          }>;
        }>;
      }>;
    },
  ) {
    if (!data.employeeId) throw new BadRequestException('Employee ID is required');
    if (!data.lines || data.lines.length === 0) {
      throw new BadRequestException('Order must contain at least one line item');
    }

    const employee = await this.prisma.employee.findUnique({
      where: { id: data.employeeId },
      include: { company: { include: { addresses: true } } },
    });

    if (!employee) throw new NotFoundException('Employee not found');

    const deliveryDateStr = data.deliveryDate || new Date().toISOString().split('T')[0];
    const deliveryDateObj = new Date(deliveryDateStr);
    if (isNaN(deliveryDateObj.getTime())) {
      throw new BadRequestException(`Invalid delivery date format: ${data.deliveryDate}`);
    }

    const settings = await this.prisma.kitchenSettings.findUnique({ where: { id: 'default' } });
    const holidays = await this.prisma.kitchenHoliday.findMany();
    const holidayStrings = holidays.map((h) => h.date.toISOString().split('T')[0]);

    const cutoffDays = settings?.cutoffWorkingDays || 2;
    const cutoffTime = settings?.cutoffTime || '16:00';
    const workingDays = settings ? JSON.parse(settings.workingDaysJson) : [1, 2, 3, 4, 5];

    // Check cut-off enforcement
    const cutoffPassed = isCutoffPassed(
      deliveryDateObj,
      cutoffDays,
      cutoffTime,
      workingDays,
      holidayStrings,
    );

    if (cutoffPassed && userRole !== Role.ADMIN) {
      throw new ForbiddenException(`Cut-off for delivery date ${deliveryDateStr} has passed. Orders are locked.`);
    }

    // Determine address, delivery time, packaging
    let addressId = data.deliveryAddressId || employee.company.addresses[0]?.id;
    if (!addressId) {
      const newAddress = await this.prisma.deliveryAddress.create({
        data: {
          companyId: employee.companyId,
          addressLine: 'Main Corporate HQ',
          city: 'Main City',
          postalCode: '10001',
        },
      });
      addressId = newAddress.id;
    }

    const deliveryTime = data.deliveryTime || employee.company.defaultDeliveryTime || '12:00';
    const packagingType = data.packagingType || employee.company.defaultPackaging || 'Standard Box';

    const resolvedTierId = employee.company.priceTierId || (await this.prisma.priceTier.findFirst({ where: { isDefault: true } }))?.id;
    if (!resolvedTierId) throw new BadRequestException('No valid price tier resolved');

    // Calculate Planned Ready Times in IST (+05:30)
    const [delH, delM] = deliveryTime.split(':').map(Number);
    const hhStr = String(isNaN(delH) ? 12 : delH).padStart(2, '0');
    const mmStr = String(isNaN(delM) ? 0 : delM).padStart(2, '0');
    const plannedDeliveryDateTime = new Date(`${deliveryDateStr}T${hhStr}:${mmStr}:00.000+05:30`);

    const nowIST = new Date();
    const todayISTStr = nowIST.toLocaleDateString('sv-SE', { timeZone: 'Asia/Kolkata' }); // YYYY-MM-DD
    if (deliveryDateStr === todayISTStr && userRole !== Role.ADMIN) {
      const diffMinutes = (plannedDeliveryDateTime.getTime() - nowIST.getTime()) / (1000 * 60);
      if (diffMinutes < 150) {
        const minAllowedTime = new Date(nowIST.getTime() + 150 * 60 * 1000);
        const minTimeStr = minAllowedTime.toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });
        throw new BadRequestException(
          `Orders for today must be placed at least 2 hours 30 minutes prior to delivery time. Requested delivery: ${deliveryTime}, but the earliest allowed delivery time for today is ${minTimeStr} IST.`
        );
      }
    }

    const leadMins = employee.company.deliveryLeadMinutes || 60;
    const plannedDispatchReadyAt = new Date(plannedDeliveryDateTime.getTime() - leadMins * 60 * 1000);
    // Expected Cooking Completion: 1:30 (90 min) before delivery & 0:30 before dispatch
    const plannedKitchenReadyAt = new Date(plannedDeliveryDateTime.getTime() - 90 * 60 * 1000);

    let orderTotalCents = 0;
    const lineCreations = [];

    for (const line of data.lines) {
      const dish = await this.prisma.dish.findUnique({
        where: { id: line.dishId },
        include: { optionGroups: { include: { optionGroup: { include: { options: true } } } } },
      });

      if (!dish || !dish.isActive) {
        throw new BadRequestException(`Dish ${line.dishId} is invalid or inactive`);
      }

      const dishPriceCents = await this.pricingService.resolveDishPriceForTier(dish.id, resolvedTierId);
      if (dishPriceCents === null || dishPriceCents <= 0) {
        throw new BadRequestException(`Dish ${dish.name} is not priced for employee company tier`);
      }

      // Validate combination quantities sum up to line quantity
      const comboQtySum = line.combinations.reduce((sum, c) => sum + c.quantity, 0);
      if (comboQtySum !== line.quantity) {
        throw new BadRequestException(`Combination quantities sum (${comboQtySum}) must equal dish line quantity (${line.quantity})`);
      }

      let lineTotalCents = 0;
      const comboCreations = [];

      for (const combo of line.combinations) {
        let comboUnitPriceCents = dishPriceCents;
        const optionCreations = [];

        // Validate required option groups
        const requiredGroups = dish.optionGroups.filter((og) => og.optionGroup.isRequired);
        const chosenGroupIds = new Set<string>();

        for (const optChoice of combo.options) {
          const option = await this.prisma.option.findUnique({
            where: { id: optChoice.optionId },
            include: { optionGroup: true, portionPrices: true },
          });

          if (!option) throw new BadRequestException(`Option ${optChoice.optionId} not found`);

          chosenGroupIds.add(option.optionGroupId);
          let optPriceCents = await this.pricingService.resolveOptionPriceForTier(option.id, resolvedTierId);

          // Add extra charge for portion size if applicable
          if (option.optionGroup.usesPortions && optChoice.portionSize) {
            const pp = option.portionPrices.find((p) => p.portionSize === optChoice.portionSize);
            if (pp) optPriceCents += pp.extraCostCents;
          }

          comboUnitPriceCents += optPriceCents;

          optionCreations.push({
            optionId: option.id,
            optionGroupName: option.optionGroup.name,
            optionName: option.name,
            portionSize: optChoice.portionSize || null,
            priceCents: optPriceCents,
          });
        }

        for (const reqGroup of requiredGroups) {
          if (!chosenGroupIds.has(reqGroup.optionGroupId)) {
            throw new BadRequestException(`Combination must satisfy required option group "${reqGroup.optionGroup.name}"`);
          }
        }

        const comboTotalCents = comboUnitPriceCents * combo.quantity;
        lineTotalCents += comboTotalCents;

        comboCreations.push({
          quantity: combo.quantity,
          unitPriceCents: comboUnitPriceCents,
          totalCents: comboTotalCents,
          options: { create: optionCreations },
        });
      }

      orderTotalCents += lineTotalCents;

      lineCreations.push({
        dishId: dish.id,
        dishName: dish.name,
        dishSku: dish.sku,
        quantity: line.quantity,
        unitPriceCents: Math.round(lineTotalCents / line.quantity),
        totalCents: lineTotalCents,
        combinations: { create: comboCreations },
      });
    }

    const orderStatus = data.status || OrderStatus.PLACED;

    const lastOrder = await this.prisma.order.findFirst({
      orderBy: { orderNumber: 'desc' },
      select: { orderNumber: true },
    });
    const nextOrderNumber = (lastOrder?.orderNumber || 1000) + 1;

    const order = await this.prisma.order.create({
      data: {
        orderNumber: nextOrderNumber,
        employeeId: employee.id,
        deliveryAddressId: addressId,
        deliveryDate: deliveryDateObj,
        deliveryTime,
        packagingType,
        status: orderStatus,
        totalCents: orderTotalCents,
        plannedDispatchReadyAt,
        plannedKitchenReadyAt,
        lines: { create: lineCreations },
      },
      include: {
        lines: { include: { combinations: { include: { options: true } } } },
      },
    });

    // If order is CONFIRMED immediately, generate prep units
    if (orderStatus === OrderStatus.CONFIRMED) {
      await this.generatePrepUnitsForOrder(order.id);
    }

    return this.getOrderById(order.id);
  }

  /**
   * Edit an existing order within 30 minutes of placement
   */
  async updateOrder(
    orderId: string,
    userRole: Role,
    data: {
      deliveryAddressId?: string;
      deliveryDate?: string;
      deliveryTime?: string;
      packagingType?: string;
      status?: OrderStatus;
      lines?: Array<{
        dishId: string;
        quantity: number;
        combinations: Array<{
          quantity: number;
          options: Array<{
            optionId: string;
            portionSize?: string;
          }>;
        }>;
      }>;
    },
  ) {
    const existingOrder = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { employee: { include: { company: { include: { addresses: true } } } } },
    });

    if (!existingOrder) throw new NotFoundException('Order not found');

    if (existingOrder.invoiceId) {
      throw new BadRequestException('Cannot edit an order that has already been invoiced.');
    }

    if (['DELIVERED', 'CANCELLED', 'REJECTED'].includes(existingOrder.status) && userRole !== Role.ADMIN) {
      throw new BadRequestException(`Cannot edit an order with status ${existingOrder.status}.`);
    }

    // Enforce 30-minute editing window for non-admin users
    const now = new Date();
    const elapsedMinutes = (now.getTime() - existingOrder.createdAt.getTime()) / (1000 * 60);

    if (elapsedMinutes > 30 && userRole !== Role.ADMIN) {
      throw new ForbiddenException(
        `Orders can only be edited within 30 minutes of placement. This order was placed ${Math.floor(
          elapsedMinutes,
        )} minutes ago.`,
      );
    }

    const employee = existingOrder.employee;
    const deliveryDateStr = data.deliveryDate || existingOrder.deliveryDate.toISOString().split('T')[0];
    const deliveryDateObj = new Date(deliveryDateStr);

    const addressId = data.deliveryAddressId || existingOrder.deliveryAddressId;
    const deliveryTime = data.deliveryTime || existingOrder.deliveryTime;
    const packagingType = data.packagingType || existingOrder.packagingType;
    const targetStatus = data.status || (existingOrder.status as OrderStatus);

    const resolvedTierId =
      employee.company.priceTierId || (await this.prisma.priceTier.findFirst({ where: { isDefault: true } }))?.id;
    if (!resolvedTierId) throw new BadRequestException('No valid price tier resolved');

    // Calculate Planned Ready Times in IST (+05:30)
    const [delH, delM] = deliveryTime.split(':').map(Number);
    const hhStr = String(isNaN(delH) ? 12 : delH).padStart(2, '0');
    const mmStr = String(isNaN(delM) ? 0 : delM).padStart(2, '0');
    const plannedDeliveryDateTime = new Date(`${deliveryDateStr}T${hhStr}:${mmStr}:00.000+05:30`);

    const todayISTStr = now.toLocaleDateString('sv-SE', { timeZone: 'Asia/Kolkata' });
    if (deliveryDateStr === todayISTStr && userRole !== Role.ADMIN) {
      const diffMinutes = (plannedDeliveryDateTime.getTime() - now.getTime()) / (1000 * 60);
      if (diffMinutes < 150) {
        const minAllowedTime = new Date(now.getTime() + 150 * 60 * 1000);
        const minTimeStr = minAllowedTime.toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });
        throw new BadRequestException(
          `Orders for today must be placed at least 2 hours 30 minutes prior to delivery time. Requested delivery: ${deliveryTime}, but the earliest allowed delivery time for today is ${minTimeStr} IST.`
        );
      }
    }

    const leadMins = employee.company.deliveryLeadMinutes || 60;
    const plannedDispatchReadyAt = new Date(plannedDeliveryDateTime.getTime() - leadMins * 60 * 1000);
    // Expected Cooking Completion: 1:30 (90 min) before delivery & 0:30 before dispatch
    const plannedKitchenReadyAt = new Date(plannedDeliveryDateTime.getTime() - 90 * 60 * 1000);

    let orderTotalCents = existingOrder.totalCents;

    // If new lines provided, replace existing order lines
    if (data.lines && data.lines.length > 0) {
      orderTotalCents = 0;
      const lineCreations = [];

      for (const line of data.lines) {
        const dish = await this.prisma.dish.findUnique({
          where: { id: line.dishId },
          include: { optionGroups: { include: { optionGroup: { include: { options: true } } } } },
        });

        if (!dish || !dish.isActive) {
          throw new BadRequestException(`Dish ${line.dishId} is invalid or inactive`);
        }

        const dishPriceCents = await this.pricingService.resolveDishPriceForTier(dish.id, resolvedTierId);
        if (dishPriceCents === null || dishPriceCents <= 0) {
          throw new BadRequestException(`Dish ${dish.name} is not priced for employee company tier`);
        }

        const comboQtySum = line.combinations.reduce((sum, c) => sum + c.quantity, 0);
        if (comboQtySum !== line.quantity) {
          throw new BadRequestException(
            `Combination quantities sum (${comboQtySum}) must equal dish line quantity (${line.quantity})`,
          );
        }

        let lineTotalCents = 0;
        const comboCreations = [];

        for (const combo of line.combinations) {
          let comboUnitPriceCents = dishPriceCents;
          const optionCreations = [];

          const requiredGroups = dish.optionGroups.filter((og) => og.optionGroup.isRequired);
          const chosenGroupIds = new Set<string>();

          for (const optChoice of combo.options) {
            const option = await this.prisma.option.findUnique({
              where: { id: optChoice.optionId },
              include: { optionGroup: true, portionPrices: true },
            });

            if (!option) throw new BadRequestException(`Option ${optChoice.optionId} not found`);

            chosenGroupIds.add(option.optionGroupId);
            let optPriceCents = await this.pricingService.resolveOptionPriceForTier(option.id, resolvedTierId);

            if (option.optionGroup.usesPortions && optChoice.portionSize) {
              const pp = option.portionPrices.find((p) => p.portionSize === optChoice.portionSize);
              if (pp) optPriceCents += pp.extraCostCents;
            }

            comboUnitPriceCents += optPriceCents;

            optionCreations.push({
              optionId: option.id,
              optionGroupName: option.optionGroup.name,
              optionName: option.name,
              portionSize: optChoice.portionSize || null,
              priceCents: optPriceCents,
            });
          }

          for (const reqGroup of requiredGroups) {
            if (!chosenGroupIds.has(reqGroup.optionGroupId)) {
              throw new BadRequestException(
                `Combination must satisfy required option group "${reqGroup.optionGroup.name}"`,
              );
            }
          }

          const comboTotalCents = comboUnitPriceCents * combo.quantity;
          lineTotalCents += comboTotalCents;

          comboCreations.push({
            quantity: combo.quantity,
            unitPriceCents: comboUnitPriceCents,
            totalCents: comboTotalCents,
            options: { create: optionCreations },
          });
        }

        orderTotalCents += lineTotalCents;

        lineCreations.push({
          dishId: dish.id,
          dishName: dish.name,
          dishSku: dish.sku,
          quantity: line.quantity,
          unitPriceCents: Math.round(lineTotalCents / line.quantity),
          totalCents: lineTotalCents,
          combinations: { create: comboCreations },
        });
      }

      // Delete existing lines
      await this.prisma.orderLine.deleteMany({ where: { orderId } });

      // Create new lines
      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          deliveryAddressId: addressId,
          deliveryDate: deliveryDateObj,
          deliveryTime,
          packagingType,
          status: targetStatus,
          totalCents: orderTotalCents,
          plannedDispatchReadyAt,
          plannedKitchenReadyAt,
          lines: { create: lineCreations },
        },
      });
    } else {
      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          deliveryAddressId: addressId,
          deliveryDate: deliveryDateObj,
          deliveryTime,
          packagingType,
          status: targetStatus,
          plannedDispatchReadyAt,
          plannedKitchenReadyAt,
        },
      });
    }

    if (targetStatus === OrderStatus.CONFIRMED && existingOrder.status !== OrderStatus.CONFIRMED) {
      await this.generatePrepUnitsForOrder(orderId);
    }

    return this.getOrderById(orderId);
  }

  /**
   * Delete an order if not invoiced
   */
  async deleteOrder(orderId: string, userRole: Role) {
    const existingOrder = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!existingOrder) throw new NotFoundException('Order not found');

    if (existingOrder.invoiceId) {
      throw new BadRequestException('Cannot delete an order that has already been invoiced.');
    }

    // Delete related prep units, order lines, and order
    await this.prisma.kitchenPrepUnit.deleteMany({ where: { orderId } });
    await this.prisma.orderLine.deleteMany({ where: { orderId } });
    await this.prisma.order.delete({ where: { id: orderId } });

    return { success: true, message: `Order #${existingOrder.orderNumber} deleted successfully.` };
  }

  /**
   * Cut-off processing trigger for a given date
   * - Sets DRAFT orders for date to CANCELLED
   * - Sets PLACED orders for date to CONFIRMED
   * - Generates prep units for confirmed orders
   * - Safe & idempotent
   */
  async processCutoffForDate(deliveryDate: string) {
    const targetDate = new Date(deliveryDate);
    targetDate.setHours(0, 0, 0, 0);

    const nextDate = new Date(targetDate);
    nextDate.setDate(targetDate.getDate() + 1);

    // Cancel all DRAFT orders
    await this.prisma.order.updateMany({
      where: {
        deliveryDate: { gte: targetDate, lt: nextDate },
        status: OrderStatus.DRAFT,
      },
      data: { status: OrderStatus.CANCELLED },
    });

    // Confirm all PLACED orders
    const placedOrders = await this.prisma.order.findMany({
      where: {
        deliveryDate: { gte: targetDate, lt: nextDate },
        status: OrderStatus.PLACED,
      },
    });

    for (const ord of placedOrders) {
      await this.prisma.order.update({
        where: { id: ord.id },
        data: { status: OrderStatus.CONFIRMED },
      });
      await this.generatePrepUnitsForOrder(ord.id);
    }

    return {
      processedDate: deliveryDate,
      cancelledDraftsCount: await this.prisma.order.count({
        where: { deliveryDate: { gte: targetDate, lt: nextDate }, status: OrderStatus.CANCELLED },
      }),
      confirmedOrdersCount: placedOrders.length,
    };
  }

  /**
   * Helper to generate kitchen prep units for confirmed order line combinations
   */
  private async generatePrepUnitsForOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        lines: {
          include: {
            combinations: true,
          },
        },
      },
    });

    if (!order) return;

    for (const line of order.lines) {
      const dish = await this.prisma.dish.findUnique({
        where: { id: line.dishId },
        include: { station: true },
      });

      const stationName = dish?.station?.name || 'Unassigned';

      for (const combo of line.combinations) {
        for (let i = 0; i < combo.quantity; i++) {
          await this.prisma.kitchenPrepUnit.create({
            data: {
              orderId: order.id,
              orderLineCombinationId: combo.id,
              stationName,
              status: PrepUnitStatus.PENDING,
            },
          });
        }
      }
    }
  }
}
