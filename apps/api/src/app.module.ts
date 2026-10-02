import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CatalogueModule } from './modules/catalogue/catalogue.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { OrdersModule } from './modules/orders/orders.module';
import { KitchenModule } from './modules/kitchen/kitchen.module';
import { DispatchModule } from './modules/dispatch/dispatch.module';
import { BillingModule } from './modules/billing/billing.module';
import { SettingsModule } from './modules/settings/settings.module';
import { DashboardsModule } from './modules/dashboards/dashboards.module';

import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    CatalogueModule,
    PricingModule,
    CompaniesModule,
    EmployeesModule,
    OrdersModule,
    KitchenModule,
    DispatchModule,
    BillingModule,
    SettingsModule,
    DashboardsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
