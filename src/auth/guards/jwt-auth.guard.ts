//src/auth/guards/jwt-auth.guard.ts
import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UnauthorizedException } from '@nestjs/common';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    // Adicionar log opcional para debugging
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      // Logar informações detalhadas sobre o erro
      console.error('[JwtAuthGuard] Authentication failed:', {
        error: err?.message,
        info: info?.message || info?.name,
        user: user ? 'present' : 'missing',
      });

      throw (
        err || new UnauthorizedException('Access token is invalid or expired')
      );
    }
    return user;
  }
}
