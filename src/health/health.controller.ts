import { Controller, Get, Logger } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HealthCheckResult,
} from '@nestjs/terminus';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FirebaseHealthIndicator } from './indicators/firebase.health';
import { DatabaseHealthIndicator } from './indicators/database.health';
import { ExternalServicesHealthIndicator } from './indicators/external-services.health';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private readonly health: HealthCheckService,
    private readonly firebaseHealth: FirebaseHealthIndicator,
    private readonly databaseHealth: DatabaseHealthIndicator,
    private readonly externalServicesHealth: ExternalServicesHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({
    summary: 'Verificação de saúde completa do sistema',
    description: 'Verifica o status de todos os serviços críticos da aplicação',
  })
  @ApiResponse({
    status: 200,
    description: 'Todos os serviços estão funcionando corretamente',
  })
  @ApiResponse({
    status: 503,
    description: 'Algum serviço está indisponível',
  })
  async checkHealth(): Promise<HealthCheckResult> {
    this.logger.log('Health check requested');
    return this.health.check([
      () => this.databaseHealth.isHealthy('database'),
      () => this.firebaseHealth.isHealthy('firebase'),
    ]);
  }

  @Get('simple')
  @ApiOperation({
    summary: 'Verificação de saúde rápida',
    description: 'Verificação básica e rápida do status da aplicação',
  })
  @ApiResponse({
    status: 200,
    description: 'Aplicação está funcionando',
  })
  async simpleHealth() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
    };
  }

  @Get('database')
  @HealthCheck()
  @ApiOperation({
    summary: 'Verificação específica do banco de dados',
    description: 'Verifica apenas a conectividade com o banco de dados',
  })
  @ApiResponse({ status: 200, description: 'Banco de dados está acessível' })
  @ApiResponse({ status: 503, description: 'Banco de dados está inacessível' })
  async checkDatabase() {
    return this.health.check([() => this.databaseHealth.isHealthy('database')]);
  }

  @Get('external')
  @HealthCheck()
  @ApiOperation({
    summary: 'Verificação de serviços externos',
    description: 'Verifica a disponibilidade de serviços externos',
  })
  @ApiResponse({
    status: 200,
    description: 'Serviços externos estão acessíveis',
  })
  @ApiResponse({
    status: 503,
    description: 'Algum serviço externo está inacessível',
  })
  async checkExternalServices() {
    return this.health.check([
      () => this.externalServicesHealth.checkMercadoPago('mercadopago'),
      () => this.externalServicesHealth.checkGroq('groq'),
    ]);
  }
}
