// src/auth/dto/validate-reset-token.dto.ts
import { IsString, IsNotEmpty } from 'class-validator';

export class ValidateResetTokenDto {
  @IsString()
  @IsNotEmpty()
  token: string;
}
