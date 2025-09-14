import { Controller, Get, Logger } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HealthCheckResult,
} from '@nestjs/terminus';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from '../../src/health/health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private readonly health: HealthCheckService,
    private readonly healthService: HealthService,
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
    schema: {
      example: {
        status: 'ok',
        info: {
          database: { status: 'up' },
          firebase: { status: 'up' },
          mercadopago: { status: 'up' },
          groq: { status: 'up' },
        },
        error: {},
        details: {
          database: { status: 'up' },
          firebase: { status: 'up' },
          mercadopago: { status: 'up' },
          groq: { status: 'up' },
        },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Algum serviço está indisponível',
    schema: {
      example: {
        status: 'error',
        info: {
          database: { status: 'up' },
          firebase: { status: 'up' },
        },
        error: {
          mercadopago: {
            status: 'down',
            message: 'Serviço Mercado Pago indisponível',
          },
        },
        details: {
          database: { status: 'up' },
          firebase: { status: 'up' },
          mercadopago: { status: 'down' },
          groq: { status: 'up' },
        },
      },
    },
  })
  async checkHealth(): Promise<HealthCheckResult> {
    this.logger.log('Health check requested');
    return this.healthService.checkAllServices();
  }

  @Get('simple')
  @ApiOperation({
    summary: 'Verificação de saúde rápida',
    description: 'Verificação básica e rápida do status da aplicação',
  })
  @ApiResponse({
    status: 200,
    description: 'Aplicação está funcionando',
    schema: {
      example: {
        status: 'healthy',
        timestamp: '2025-09-14T18:00:00.000Z',
        uptime: 3600,
      },
    },
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
    return this.healthService.checkDatabase();
  }

  @Get('external')
  @HealthCheck()
  @ApiOperation({
    summary: 'Verificação de serviços externos',
    description:
      'Verifica a disponibilidade de serviços externos como Mercado Pago e Groq',
  })
  @ApiResponse({
    status: 200,
    description: 'Todos os serviços externos estão acessíveis',
  })
  @ApiResponse({
    status: 503,
    description: 'Algum serviço externo está inacessível',
  })
  async checkExternalServices() {
    return this.healthService.checkExternalServices();
  }
}
