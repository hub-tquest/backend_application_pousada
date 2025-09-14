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
      // Verificar API do Mercado Pago
      const accessToken = this.configService.get('MERCADOPAGO_ACCESS_TOKEN');
      if (!accessToken) {
        return this.getStatus(key, false, {
          message: 'Mercado Pago access token not configured',
        });
      }

      // Usar pingCheck em vez de get - CORREÇÃO
      // Teste básico de conectividade com endpoint público
      return await this.http.pingCheck(
        key,
        'https://api.mercadopago.com/v1/payment_methods',
        {
          timeout: 5000,
        },
      );
    } catch (error) {
      this.logger.warn('Mercado Pago health check warning:', error.message);
      // Para ambiente de desenvolvimento, podemos considerar como healthy
      // mesmo com warnings
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

      // Usar pingCheck em vez de get - CORREÇÃO
      // Teste básico de conectividade com a API da Groq
      return await this.http.pingCheck(
        key,
        'https://api.groq.com/openai/v1/models',
        {
          timeout: 5000,
        },
      );
    } catch (error) {
      this.logger.warn('Groq health check warning:', error.message);
      // Para ambiente de desenvolvimento
      if (process.env.NODE_ENV === 'development') {
        return this.getStatus(key, true, {
          message: 'Development mode - partial connectivity',
        });
      }
      return this.getStatus(key, false, { message: error.message });
    }
  }
}
