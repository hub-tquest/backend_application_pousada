//src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { SharedModule } from '../shared/shared.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    SharedModule,
    JwtModule.register({
      secret:
        process.env.JWT_SECRET ||
        'pousada-chapada-jwt-secret-key-2025-change-in-production123456789.+-*/',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtStrategy],
})
export class AuthModule {}
