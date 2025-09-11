// src/booking/payment/payment.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { PaymentWebhookController } from './payment-webhook.controller';
import { MercadoPagoService } from './mercadopago.service';
import { BookingModule } from '../booking.module';

@Module({
  imports: [forwardRef(() => BookingModule)], // Usar forwardRef
  controllers: [PaymentWebhookController],
  providers: [MercadoPagoService],
  exports: [MercadoPagoService],
})
export class PaymentModule {}