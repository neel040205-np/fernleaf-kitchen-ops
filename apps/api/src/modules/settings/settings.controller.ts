import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '../../common/enums';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  async getSettings() {
    return this.settingsService.getSettings();
  }

  @Roles(Role.ADMIN)
  @Put()
  async updateSettings(@Body() body: { workingDays?: number[]; cutoffTime?: string; cutoffWorkingDays?: number }) {
    return this.settingsService.updateSettings(body);
  }

  @Roles(Role.ADMIN)
  @Post('holidays')
  async addHoliday(@Body() body: { date: string; description?: string }) {
    return this.settingsService.addHoliday(body.date, body.description);
  }

  @Roles(Role.ADMIN)
  @Delete('holidays/:id')
  async deleteHoliday(@Param('id') id: string) {
    return this.settingsService.deleteHoliday(id);
  }
}
