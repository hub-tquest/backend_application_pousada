// src/auth/entities/refresh-token.entity.ts
export interface RefreshToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: any; // Usaremos any para evitar problemas de importação
  createdAt: any;
  revoked: boolean;
  revokedAt?: any;
}
