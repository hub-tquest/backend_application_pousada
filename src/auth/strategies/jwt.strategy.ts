// src/auth/strategies/jwt.strategy.ts
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import {
  FirebaseService,
  AppUser,
} from '../../shared/firebase/firebase.service';

export interface JwtPayload {
  uid: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(private firebaseService: FirebaseService) {
    // Obter o segredo usado para validação
    const secretUsed =
      process.env.JWT_SECRET ||
      'pousada-chapada-jwt-secret-key-2025-change-in-production123456789.+-*/';

    // Chamar super() com as opções - DEVE SER A PRIMEIRA COISA QUE USA 'this' de fato
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secretUsed,
      issuer: 'pousada-chapada-backend',
      audience: 'pousada-chapada-app',
    });

    // Agora sim, podemos usar 'this' livremente após o super()
    this.logger.log(
      `[INIT] JWT Strategy initialized with secret (first 10 chars): ${secretUsed.substring(0, 10)}...`,
    );
    this.logger.log(`[INIT] Expected Issuer: pousada-chapada-backend`);
    this.logger.log(`[INIT] Expected Audience: pousada-chapada-app`);
  }

  async validate(payload: JwtPayload) {
    this.logger.log(`[VALIDATE] Starting validation for UID: ${payload.uid}`);
    this.logger.debug(
      `[VALIDATE] Full payload received: ${JSON.stringify(payload, null, 2)}`,
    );

    try {
      // 1. Verificar se o payload tem o UID correto
      if (!payload.uid) {
        this.logger.error(`[VALIDATE] UID is missing in payload`);
        throw new UnauthorizedException('UID is missing in token payload');
      }

      // 2. Tentar buscar o usuário (agora retorna AppUser | null)
      const user: AppUser | null = await this.firebaseService.getUserById(
        payload.uid,
      );

      if (!user) {
        this.logger.warn(
          `[VALIDATE] User NOT FOUND in Firebase: ${payload.uid}`,
        );
        throw new UnauthorizedException('User not found in Firebase');
      }

      this.logger.log(
        `[VALIDATE] Validation successful for user: ${user.uid} (${user.email})`,
      );

      // 3. Retornar as informações do usuário autenticado
      const userInfo = {
        userId: user.uid,
        email: user.email,
        name: user.displayName,
      };
      this.logger.debug(
        `[VALIDATE] Returning user info: ${JSON.stringify(userInfo, null, 2)}`,
      );
      return userInfo;
    } catch (error) {
      this.logger.error(
        `[VALIDATE] Error during JWT validation for UID ${payload?.uid || 'unknown'}:`,
        error.stack,
      );
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException(
        `Token validation failed: ${error.message}`,
      );
    }
  }
}
