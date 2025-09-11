// src/booking/booking.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { BookingController } from './controllers/booking.controller';
import { BookingService } from './services/booking.service';
import { AvailabilityService } from './services/availability.service';
import { BookingRepository } from './repositories/booking.repository';
import { FirebaseModule } from '../shared/firebase/firebase.module';
import { PaymentModule } from './payment/payment.module';

@Module({
  imports: [
    FirebaseModule,
    forwardRef(() => PaymentModule), // Usar forwardRef
  ],
  controllers: [BookingController],
  providers: [
    BookingService,
    AvailabilityService,
    BookingRepository,
  ],
  exports: [
    BookingService,
    BookingRepository,
  ],
})
export class BookingModule {}