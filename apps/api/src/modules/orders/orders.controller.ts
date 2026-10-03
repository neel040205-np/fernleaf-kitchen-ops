import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { Role } from '../../common/enums';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('menu-preview')
  async getEmployeeMenuPreview(@Query('employeeId') employeeId: string) {
    return this.ordersService.getEmployeeMenuPreview(employeeId);
  }

  @Get()
  async getOrders(
    @Query('deliveryDateFrom') deliveryDateFrom?: string,
    @Query('deliveryDateTo') deliveryDateTo?: string,
    @Query('status') status?: string,
    @Query('companyId') companyId?: string,
    @Query('invoiced') invoiced?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.ordersService.getOrders({
      deliveryDateFrom,
      deliveryDateTo,
      status,
      companyId,
      invoiced: invoiced !== undefined ? invoiced === 'true' : undefined,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get(':id')
  async getOrderById(@Param('id') id: string) {
    return this.ordersService.getOrderById(id);
  }

  @Post()
  async createOrder(@GetUser('role') userRole: Role, @Body() body: any) {
    return this.ordersService.createOrder(userRole, body);
  }

  @Put(':id')
  async updateOrder(@Param('id') id: string, @GetUser('role') userRole: Role, @Body() body: any) {
    return this.ordersService.updateOrder(id, userRole, body);
  }

  @Roles(Role.ADMIN)
  @Post('process-cutoff')
  async processCutoff(@Body() body: { deliveryDate: string }) {
    return this.ordersService.processCutoffForDate(body.deliveryDate);
  }
}
