import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { DispatchService } from './dispatch.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { DropStatus, Role } from '../../common/enums';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dispatch')
export class DispatchController {
  constructor(private readonly dispatchService: DispatchService) {}

  @Roles(Role.ADMIN, Role.DISPATCH)
  @Get('partners')
  async getDeliveryPartners() {
    return this.dispatchService.getDeliveryPartners();
  }

  @Roles(Role.ADMIN, Role.DISPATCH)
  @Post('partners')
  async createDeliveryPartner(
    @Body()
    body: {
      name: string;
      email: string;
      phone?: string;
      companyId?: string;
      vehicleDetails?: string;
      password?: string;
    },
  ) {
    if (!body.name || !body.email) {
      throw new BadRequestException('Delivery partner name and email are required');
    }
    return this.dispatchService.createDeliveryPartner(body);
  }

  @Roles(Role.ADMIN, Role.DISPATCH)
  @Put('orders/:id/assign-partner')
  async assignPartnerToOrder(@Param('id') id: string, @Body() body: { deliveryPartnerId: string }) {
    if (!body.deliveryPartnerId) {
      throw new BadRequestException('deliveryPartnerId is required');
    }
    return this.dispatchService.assignPartnerToOrder(id, body.deliveryPartnerId);
  }

  @Roles(Role.DRIVER, Role.ADMIN)
  @Get('partner/my-deliveries')
  async getPartnerMyDeliveries(@GetUser('id') userId: string, @Query('mode') mode?: string) {
    return this.dispatchService.getPartnerMyDeliveries(userId, mode);
  }

  @Roles(Role.ADMIN, Role.DISPATCH)
  @Get('drivers')
  async getDrivers() {
    return this.dispatchService.getDeliveryPartners();
  }

  @Roles(Role.ADMIN, Role.DISPATCH)
  @Post('drivers')
  async createDriver(@Body() body: { name: string; email: string; password?: string }) {
    if (!body.name || !body.email) {
      throw new BadRequestException('Driver name and email are required');
    }
    return this.dispatchService.createDeliveryPartner({
      name: body.name,
      email: body.email,
      password: body.password,
    });
  }

  @Roles(Role.ADMIN, Role.DISPATCH)
  @Get('board')
  async getBoard(@Query('date') date: string) {
    return this.dispatchService.getDispatchBoard(date);
  }

  @Roles(Role.ADMIN, Role.DISPATCH)
  @Put('drops/:id/assign-driver')
  async assignDriver(@Param('id') id: string, @Body() body: { driverId: string }) {
    return this.dispatchService.assignDriverToDrop(id, body.driverId);
  }

  @Roles(Role.ADMIN, Role.DISPATCH)
  @Put('drops/:id/status')
  async updateStatus(@Param('id') id: string, @Body() body: { status: DropStatus }) {
    return this.dispatchService.updateDropStatus(id, body.status);
  }

  @Roles(Role.DRIVER, Role.ADMIN)
  @Get('driver/my-drops')
  async getMyDrops(
    @GetUser('id') driverId: string,
    @Query('date') date?: string,
    @Query('mode') mode?: string,
  ) {
    return this.dispatchService.getDriverMyDrops(driverId, date, mode);
  }

  @Roles(Role.DRIVER, Role.ADMIN)
  @Post('driver/drops/:id/complete')
  async markDelivered(
    @GetUser('id') driverId: string,
    @Param('id') dropId: string,
    @Body() body: { driverNote?: string; photoUrl?: string },
  ) {
    return this.dispatchService.markDropDelivered(driverId, dropId, body);
  }
}
