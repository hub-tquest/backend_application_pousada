import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { AuthModule } from './auth/auth.module';
import { ChatbotModule } from './chatbot/chatbot.module';
import { FirebaseModule } from './shared/firebase/firebase.module';
import { BookingModule } from './booking/booking.module';
import { NotificationsModule } from './notifications/notifications.module';
import { HealthModule } from './health/health.module';
import { validate } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    TerminusModule,
    FirebaseModule,
    AuthModule,
    ChatbotModule,
    BookingModule,
    NotificationsModule,
    HealthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
