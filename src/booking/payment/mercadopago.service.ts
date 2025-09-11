// src/booking/payment/mercadopago.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { MercadoPagoConfig, Payment, MerchantOrder, Preference  } from 'mercadopago';
import axios from 'axios';

@Injectable()
export class MercadoPagoService {
  private readonly logger = new Logger(MercadoPagoService.name);
  private client: MercadoPagoConfig;

  constructor() {
    this.client = new MercadoPagoConfig({
      accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
    });
  }

  async createPaymentPreference(
    items: any[],
    bookingId: string,
    userId: string,
  ): Promise<any> {
    try {
      const preference = new Preference(this.client);

      const response = await preference.create({
        body: {
          items: items,
          back_urls: {
            success: `${process.env.FRONTEND_URL}/booking/success/${bookingId}`,
            failure: `${process.env.FRONTEND_URL}/booking/failure/${bookingId}`,
            pending: `${process.env.FRONTEND_URL}/booking/pending/${bookingId}`,
          },
          auto_return: 'approved',
          external_reference: bookingId,
          notification_url: `${process.env.BACKEND_URL}/payment/webhook/mercadopago`,
          statement_descriptor: 'Pousada Chapada Reserva',
          metadata: {
            bookingId: bookingId,
            userId: userId,
          },
        },
      });

      this.logger.log(
        `Payment preference created for booking ${bookingId}: ${response.id}`,
      );
      return response;
    } catch (error) {
      this.logger.error(`Error creating payment preference: ${error.message}`);
      throw new Error(`Failed to create payment preference: ${error.message}`);
    }
  }

  // Adicionar método para obter detalhes do pagamento
  async getPaymentDetails(paymentId: string): Promise<any> {
    try {
      // Usar axios para fazer a chamada direta à API do Mercado Pago
      const response = await axios.get(
        `https://api.mercadopago.com/v1/payments/${paymentId}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      return response.data;
    } catch (error) {
      this.logger.error(`Error getting payment details ${paymentId}: ${error.message}`);
      throw new Error(`Failed to get payment details: ${error.message}`);
    }
  }

  // Adicionar método para obter detalhes da ordem do merchant
  async getMerchantOrder(merchantOrderId: string): Promise<any> {
    try {
      // Usar axios para fazer a chamada direta à API do Mercado Pago
      const response = await axios.get(
        `https://api.mercadopago.com/merchant_orders/${merchantOrderId}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      return response.data;
    } catch (error) {
      this.logger.error(`Error getting merchant order ${merchantOrderId}: ${error.message}`);
      throw new Error(`Failed to get merchant order: ${error.message}`);
    }
  }

  async verifyPayment(paymentId: string): Promise<any> {
    try {
      // Implementar verificação direta do pagamento se necessário
      // Esta função pode ser usada para validações adicionais
      const paymentDetails = await this.getPaymentDetails(paymentId);
      return paymentDetails.status === 'approved';
    } catch (error) {
      this.logger.error(
        `Error verifying payment ${paymentId}: ${error.message}`,
      );
      return false;
    }
  }

  // Método para verificar a assinatura do webhook (opcional mas recomendado)
  verifyWebhookSignature(xSignature: string, body: any, req: Request): boolean {
    // Implementação da verificação de assinatura
    // Esta é uma implementação simplificada - em produção você deve
    // implementar a verificação correta usando a chave secreta do Mercado Pago
    
    try {
      // Exemplo básico - em produção use a biblioteca oficial ou crypto
      // para verificar a assinatura HMAC SHA256
      
      // Por enquanto, vamos retornar true para testes
      // MAS LEMBRE-SE: ISTO É INSEGURO PARA PRODUÇÃO!
      this.logger.warn('[MERCADOPAGO] Webhook signature verification is DISABLED. FIX THIS FOR PRODUCTION!');
      return true;
    } catch (error) {
      this.logger.error(`Error verifying webhook signature: ${error.message}`);
      return false;
    }
  }
}