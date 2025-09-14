import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { ChatbotModule } from './chatbot/chatbot.module';
import { FirebaseModule } from './shared/firebase/firebase.module';
import { BookingModule } from './booking/booking.module';
import { NotificationsModule } from './notifications/notifications.module';
import { validate } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    FirebaseModule,
    AuthModule,
    ChatbotModule,
    BookingModule,
    NotificationsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
