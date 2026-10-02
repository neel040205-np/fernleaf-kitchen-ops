import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '../../common/enums';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  async getEmployees(@Query('companyId') companyId?: string) {
    return this.employeesService.getEmployees(companyId);
  }

  @Get(':id')
  async getEmployeeById(@Param('id') id: string) {
    return this.employeesService.getEmployeeById(id);
  }

  @Roles(Role.ADMIN)
  @Post()
  async createEmployee(@Body() body: any) {
    return this.employeesService.createEmployee(body);
  }

  @Roles(Role.ADMIN)
  @Put(':id')
  async updateEmployee(@Param('id') id: string, @Body() body: any) {
    return this.employeesService.updateEmployee(id, body);
  }

  @Roles(Role.ADMIN)
  @Post('bulk-import')
  async bulkImportCsv(@Body() body: { companyId: string; csvContent: string }) {
    return this.employeesService.bulkImportCsv(body.companyId, body.csvContent);
  }
}
