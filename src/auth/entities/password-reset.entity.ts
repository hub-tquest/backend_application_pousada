// src/auth/entities/password-reset.entity.ts
export interface PasswordReset {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  used: boolean;
}
