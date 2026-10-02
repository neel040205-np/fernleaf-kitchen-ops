import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { InvoiceStatus, Role } from '../../common/enums';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('uninvoiced-orders')
  async getUninvoicedOrders() {
    return this.billingService.getUninvoicedOrders();
  }

  @Get('invoices')
  async getInvoices() {
    return this.billingService.getInvoices();
  }

  @Roles(Role.ADMIN)
  @Post('invoices')
  async createInvoice(@Body() body: { companyId: string; orderIds: string[] }) {
    return this.billingService.createInvoice(body.companyId, body.orderIds);
  }

  @Roles(Role.ADMIN)
  @Put('invoices/:id/status')
  async updateStatus(@Param('id') id: string, @Body() body: { status: InvoiceStatus }) {
    return this.billingService.updateInvoiceStatus(id, body.status);
  }
}
