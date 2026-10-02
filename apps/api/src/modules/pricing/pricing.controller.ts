import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '../../common/enums';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('pricing')
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Get('tiers')
  async getTiers() {
    return this.pricingService.getTiers();
  }

  @Get('tiers/:id')
  async getTierById(@Param('id') id: string) {
    return this.pricingService.getTierById(id);
  }

  @Roles(Role.ADMIN)
  @Post('tiers')
  async createTier(@Body() body: any) {
    return this.pricingService.createTier(body);
  }

  @Roles(Role.ADMIN)
  @Put('dish-override')
  async setDishOverride(@Body() body: { dishId: string; tierId: string; priceCents: number }) {
    return this.pricingService.setDishPriceOverride(body.dishId, body.tierId, body.priceCents);
  }

  @Roles(Role.ADMIN)
  @Put('option-override')
  async setOptionOverride(@Body() body: { optionId: string; tierId: string; priceCents: number }) {
    return this.pricingService.setOptionPriceOverride(body.optionId, body.tierId, body.priceCents);
  }
}
