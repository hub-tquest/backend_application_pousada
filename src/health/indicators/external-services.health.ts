import { Injectable, Logger } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { HttpHealthIndicator } from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ExternalServicesHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(ExternalServicesHealthIndicator.name);

  constructor(
    private readonly http: HttpHealthIndicator,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async checkMercadoPago(key: string): Promise<HealthIndicatorResult> {
    try {
      const accessToken = this.configService.get('MERCADOPAGO_ACCESS_TOKEN');
      if (!accessToken) {
        return this.getStatus(key, false, {
          message: 'Mercado Pago access token not configured',
        });
      }

      // Usar página pública do Mercado Pago para health check
      return await this.http.pingCheck(key, 'https://www.mercadopago.com.br', {
        timeout: 5000,
      });
    } catch (error) {
      this.logger.warn('Mercado Pago health check warning:', error.message);
      if (process.env.NODE_ENV === 'development') {
        return this.getStatus(key, true, {
          message: 'Development mode - partial connectivity',
        });
      }
      return this.getStatus(key, false, { message: error.message });
    }
  }

  async checkGroq(key: string): Promise<HealthIndicatorResult> {
    try {
      const apiKey = this.configService.get('GROQ_API_KEY');
      if (!apiKey) {
        return this.getStatus(key, false, {
          message: 'Groq API key not configured',
        });
      }

      // Usar página pública da Groq para health check
      return await this.http.pingCheck(key, 'https://groq.com', {
        timeout: 5000,
      });
    } catch (error) {
      this.logger.warn('Groq health check warning:', error.message);
      if (process.env.NODE_ENV === 'development') {
        return this.getStatus(key, true, {
          message: 'Development mode - partial connectivity',
        });
      }
      return this.getStatus(key, false, { message: error.message });
    }
  }
}
