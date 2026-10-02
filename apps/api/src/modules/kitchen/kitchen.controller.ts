import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { KitchenService } from './kitchen.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { PrepUnitStatus, Role } from '../../common/enums';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('kitchen')
export class KitchenController {
  constructor(private readonly kitchenService: KitchenService) {}

  @Roles(Role.ADMIN, Role.KITCHEN)
  @Get('board')
  async getBoard(@Query('date') date: string, @Query('station') station?: string) {
    return this.kitchenService.getKitchenBoard(date, station);
  }

  @Roles(Role.ADMIN, Role.KITCHEN)
  @Put('units/:id/status')
  async updateUnitStatus(@Param('id') id: string, @Body() body: { status: PrepUnitStatus }) {
    return this.kitchenService.updateUnitStatus(id, body.status);
  }

  @Roles(Role.ADMIN)
  @Post('orders/:id/force-complete')
  async forceCompleteOrder(@Param('id') id: string) {
    return this.kitchenService.forceCompleteOrder(id);
  }
}
