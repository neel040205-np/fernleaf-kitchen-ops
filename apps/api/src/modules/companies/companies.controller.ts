import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '../../common/enums';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  async getCompanies() {
    return this.companiesService.getCompanies();
  }

  @Get(':id')
  async getCompanyById(@Param('id') id: string) {
    return this.companiesService.getCompanyById(id);
  }

  @Roles(Role.ADMIN)
  @Post()
  async createCompany(@Body() body: any) {
    return this.companiesService.createCompany(body);
  }

  @Roles(Role.ADMIN)
  @Put(':id')
  async updateCompany(@Param('id') id: string, @Body() body: any) {
    return this.companiesService.updateCompany(id, body);
  }

  @Roles(Role.ADMIN)
  @Post(':id/addresses')
  async addAddress(@Param('id') id: string, @Body() body: any) {
    return this.companiesService.addAddress(id, body);
  }
}
