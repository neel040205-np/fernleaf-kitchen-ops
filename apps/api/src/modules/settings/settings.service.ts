import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getSettings() {
    let settings = await this.prisma.kitchenSettings.findUnique({ where: { id: 'default' } });

    if (!settings) {
      settings = await this.prisma.kitchenSettings.create({
        data: {
          id: 'default',
          workingDaysJson: JSON.stringify([1, 2, 3, 4, 5]),
          cutoffTime: '16:00',
          cutoffWorkingDays: 2,
        },
      });
    }

    const holidays = await this.prisma.kitchenHoliday.findMany({ orderBy: { date: 'asc' } });

    return {
      ...settings,
      workingDays: JSON.parse(settings.workingDaysJson || '[1,2,3,4,5]'),
      holidays,
    };
  }

  async updateSettings(data: { workingDays?: number[]; cutoffTime?: string; cutoffWorkingDays?: number }) {
    const updatePayload: any = {};
    if (data.workingDays !== undefined) updatePayload.workingDaysJson = JSON.stringify(data.workingDays);
    if (data.cutoffTime !== undefined) updatePayload.cutoffTime = data.cutoffTime;
    if (data.cutoffWorkingDays !== undefined) updatePayload.cutoffWorkingDays = data.cutoffWorkingDays;

    await this.prisma.kitchenSettings.upsert({
      where: { id: 'default' },
      update: updatePayload,
      create: {
        id: 'default',
        workingDaysJson: JSON.stringify(data.workingDays || [1, 2, 3, 4, 5]),
        cutoffTime: data.cutoffTime || '16:00',
        cutoffWorkingDays: data.cutoffWorkingDays || 2,
      },
    });

    return this.getSettings();
  }

  async addHoliday(dateStr: string, description?: string) {
    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);

    return this.prisma.kitchenHoliday.upsert({
      where: { date },
      update: { description },
      create: { date, description },
    });
  }

  async deleteHoliday(id: string) {
    return this.prisma.kitchenHoliday.delete({ where: { id } });
  }
}
