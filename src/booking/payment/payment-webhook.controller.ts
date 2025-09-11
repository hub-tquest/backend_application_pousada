// src/booking/payment/payment-webhook.controller.ts
import {
  Controller,
  Post,
  Body,
  Logger,
  HttpCode,
  HttpStatus,
  Req,
  Ip,
  Headers,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Request } from 'express';
import { MercadoPagoService } from './mercadopago.service';
import { BookingService } from '../services/booking.service';
import { ConfigService } from '@nestjs/config';
import { FirebaseService } from '../../shared/firebase/firebase.service';

@Controller('payment/webhook')
export class PaymentWebhookController {
  private readonly logger = new Logger(PaymentWebhookController.name);

  constructor(
    private readonly bookingService: BookingService,
    private readonly mercadoPagoService: MercadoPagoService,
    private readonly configService: ConfigService,
    private readonly firebaseService: FirebaseService,
  ) {}

  @Post('mercadopago')
  @HttpCode(HttpStatus.OK)
  async handleMercadoPagoWebhook(
    @Req() req: Request,
    @Body() body: any,
    @Ip() ip: string,
    @Headers('x-forwarded-for') forwardedFor: string,
    @Headers('user-agent') userAgent: string,
    @Headers('x-signature') xSignature: string,
    @Headers('x-request-id') xRequestId: string,
  ) {
    const clientIp = forwardedFor || ip;
    this.logger.log(`[MERCADOPAGO] Webhook received`, {
      eventId: body?.id,
      action: body?.action,
      clientIp,
      userAgent,
      requestId: xRequestId,
    });

    try {
      // 1. Verificar se é uma requisição válida do Mercado Pago
      // Em produção, você DEVE verificar a assinatura (x-signature)
      // para garantir que a requisição veio realmente do Mercado Pago
      /*
      if (!this.mercadoPagoService.verifyWebhookSignature(xSignature, body, req)) {
        this.logger.warn('[MERCADOPAGO] Invalid webhook signature', { clientIp, userAgent });
        throw new BadRequestException('Invalid signature');
      }
      */

      // 2. Processar diferentes tipos de eventos
      switch (body.action) {
        case 'payment.created':
        case 'payment.updated':
          // Para eventos de pagamento, precisamos obter mais detalhes
          // Vamos usar o external_reference que colocamos na preference
          if (body.data?.id) {
            return await this.handlePaymentUpdate(body.data.id);
          }
          break;
          
        // Mercado Pago não envia merchant_order por webhook padrão
        // Os eventos de merchant_order são mais comuns em checkouts transparentes
        // Vamos focar nos eventos de payment
        
        default:
          this.logger.log(`[MERCADOPAGO] Unhandled action: ${body.action}`, { eventId: body.id });
          return { received: true };
      }
      
      return { received: true };
    } catch (error) {
      this.logger.error(`[MERCADOPAGO] Webhook processing error`, error.stack);
      // Em webhooks, é importante NÃO lançar exceções que gerem 500,
      // pois isso faz o provedor (Mercado Pago) tentar reenviar indefinidamente.
      // Em vez disso, logamos o erro e retornamos sucesso.
      return { received: true, processed: false, error: error.message };
    }
  }

  private async handlePaymentUpdate(paymentId: string) {
    this.logger.log(`[MERCADOPAGO] Processing payment update: ${paymentId}`);
    
    try {
      // Como não temos getPaymentDetails no MercadoPagoService,
      // vamos tentar buscar a reserva usando o paymentId
      // O paymentId pode ter sido salvo como paymentId na reserva
      
      // 1. Procurar reserva pelo paymentId
      let booking;
      try {
        booking = await this.bookingService.findByPaymentId(paymentId);
      } catch (error) {
        this.logger.warn(`[MERCADOPAGO] Booking not found for payment ${paymentId}`);
        return { received: true, processed: false, reason: 'Booking not found' };
      }

      if (!booking) {
        this.logger.warn(`[MERCADOPAGO] Booking not found for payment ${paymentId}`);
        return { received: true, processed: false, reason: 'Booking not found' };
      }

      // 2. Como não temos verificação real do status do pagamento,
      // vamos assumir que se chegou aqui é porque foi aprovado
      // Em um cenário real, você faria uma chamada à API do Mercado Pago
      
      // 3. Confirmar a reserva se ainda não estiver confirmada
      if (booking.status !== 'confirmed') {
        const confirmedBooking = await this.bookingService.confirmBookingPayment(
          booking.id,
          paymentId,
        );
        
        this.logger.log(`[MERCADOPAGO] Booking confirmed: ${confirmedBooking.id}`);
        
        // 5. (Opcional) Enviar notificação por email/SMS
        // await this.notificationService.sendBookingConfirmation(confirmedBooking);
        
        return { received: true, processed: true, bookingId: confirmedBooking.id };
      } else {
        this.logger.log(`[MERCADOPAGO] Booking ${booking.id} already confirmed`);
        return { received: true, processed: true, reason: 'Booking already confirmed' };
      }
    } catch (error) {
      this.logger.error(`[MERCADOPAGO] Error handling payment update ${paymentId}`, error.stack);
      // Não relançar o erro para evitar retries infinitos do webhook
      return { received: true, processed: false, error: error.message };
    }
  }
}