import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getHealthCheck() {
    return {
      name: 'Fernleaf Kitchen Operations REST API',
      status: 'online',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }
}
