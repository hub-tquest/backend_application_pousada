import { Injectable, Logger } from '@nestjs/common';
import { HealthCheckService, HttpHealthIndicator } from '@nestjs/terminus';
import { FirebaseHealthIndicator } from '../../src/health/indicators/firebase.health';
import { DatabaseHealthIndicator } from '../../src/health/indicators/database.health';
import { ExternalServicesHealthIndicator } from '../../src/health/indicators/external-services.health';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly health: HealthCheckService,
    private readonly http: HttpHealthIndicator,
    private readonly firebaseHealth: FirebaseHealthIndicator,
    private readonly databaseHealth: DatabaseHealthIndicator,
    private readonly externalServicesHealth: ExternalServicesHealthIndicator,
  ) {}

  async checkAllServices() {
    try {
      return await this.health.check([
        () => this.databaseHealth.isHealthy('database'),
        () => this.firebaseHealth.isHealthy('firebase'),
        () => this.externalServicesHealth.checkMercadoPago('mercadopago'),
        () => this.externalServicesHealth.checkGroq('groq'),
      ]);
    } catch (error) {
      this.logger.error('Health check failed:', error);
      throw error;
    }
  }

  async checkDatabase() {
    try {
      return await this.health.check([
        () => this.databaseHealth.isHealthy('database'),
      ]);
    } catch (error) {
      this.logger.error('Database health check failed:', error);
      throw error;
    }
  }

  async checkExternalServices() {
    try {
      return await this.health.check([
        () => this.externalServicesHealth.checkMercadoPago('mercadopago'),
        () => this.externalServicesHealth.checkGroq('groq'),
      ]);
    } catch (error) {
      this.logger.error('External services health check failed:', error);
      throw error;
    }
  }

  async checkBasic() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
