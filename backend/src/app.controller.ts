import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  /**
   * Unauthenticated liveness probe.
   * `render.yaml` points Render's health check at this path: if it does not
   * answer 2xx, Render treats the deploy as unhealthy and never routes traffic
   * to it. It intentionally touches no database, so a sleeping Neon compute
   * cannot fail the check.
   */
  @Get('health')
  health(): { status: string } {
    return { status: 'ok' };
  }
}
