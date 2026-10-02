import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { CatalogueService } from './catalogue.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '../../common/enums';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('catalogue')
export class CatalogueController {
  constructor(private readonly catalogueService: CatalogueService) {}

  @Get('reference-data')
  async getReferenceData() {
    return this.catalogueService.getReferenceData();
  }

  @Get('categories')
  async getCategories() {
    return this.catalogueService.getCategories();
  }

  @Roles(Role.ADMIN)
  @Post('categories')
  async createCategory(@Body() body: { name: string; displayOrder?: number; isSecret?: boolean }) {
    return this.catalogueService.createCategory(body);
  }

  @Roles(Role.ADMIN)
  @Put('categories/:id')
  async updateCategory(
    @Param('id') id: string,
    @Body() body: { name?: string; displayOrder?: number; isActive?: boolean; isSecret?: boolean },
  ) {
    return this.catalogueService.updateCategory(id, body);
  }

  @Get('dishes')
  async getDishes(@Query('includeInactive') includeInactive?: string) {
    return this.catalogueService.getDishes(includeInactive !== 'false');
  }

  @Get('dishes/:id')
  async getDishById(@Param('id') id: string) {
    return this.catalogueService.getDishById(id);
  }

  @Roles(Role.ADMIN)
  @Post('dishes')
  async createDish(@Body() body: any) {
    return this.catalogueService.createDish(body);
  }

  @Roles(Role.ADMIN)
  @Put('dishes/:id')
  async updateDish(@Param('id') id: string, @Body() body: any) {
    return this.catalogueService.updateDish(id, body);
  }

  @Roles(Role.ADMIN)
  @Delete('dishes/:id')
  async deactivateDish(@Param('id') id: string) {
    return this.catalogueService.deactivateDish(id);
  }

  @Get('option-groups')
  async getOptionGroups() {
    return this.catalogueService.getOptionGroups();
  }

  @Roles(Role.ADMIN)
  @Post('option-groups')
  async createOptionGroup(@Body() body: any) {
    return this.catalogueService.createOptionGroup(body);
  }
}
