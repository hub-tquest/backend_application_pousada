import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FirebaseService } from '../../shared/firebase/firebase.service';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private firebaseService: FirebaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const limit =
      this.reflector.get<number>('rate-limit', context.getHandler()) || 5;
    const window =
      this.reflector.get<number>('rate-window', context.getHandler()) || 60000; // 1 minuto

    const request = context.switchToHttp().getRequest();
    const ip =
      request.ip ||
      request.connection.remoteAddress ||
      request.headers['x-forwarded-for'] ||
      'unknown';
    const endpoint = request.route?.path || request.url;

    if (!ip || !endpoint) {
      return true;
    }

    const rateLimitKey = `rate_limit:${endpoint}:${ip}`;

    try {
      // Usar Firestore para rate limiting
      const docRef = this.firebaseService.db
        .collection('rate_limits')
        .doc(rateLimitKey);
      const doc = await docRef.get();

      const now = Date.now();
      let attempts = 1;
      let firstAttempt = now;

      if (doc.exists) {
        const data = doc.data();
        firstAttempt = data.firstAttempt.toDate().getTime();

        // Resetar se estiver fora da janela
        if (now - firstAttempt > window) {
          attempts = 1;
          firstAttempt = now;
        } else {
          attempts = data.attempts + 1;
        }
      }

      // Salvar tentativa
      await docRef.set({
        attempts,
        firstAttempt: new Date(firstAttempt),
        lastAttempt: new Date(now),
        endpoint,
        ip,
      });

      // Verificar limite
      if (attempts > limit) {
        const timeLeft = window - (now - firstAttempt);
        if (timeLeft > 0) {
          throw new BadRequestException(
            `Rate limit exceeded. Try again in ${Math.ceil(timeLeft / 1000)} seconds.`,
          );
        }
      }

      return true;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      // Em caso de erro interno, permitir a requisição
      console.error('Rate limit error:', error);
      return true;
    }
  }
}
