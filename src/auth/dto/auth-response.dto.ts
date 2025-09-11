//auth/dto/auth-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class AuthResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ required: false })
  token?: string;

  @ApiProperty({ required: false })
  refreshToken?: string;

  @ApiProperty({ required: false })
  user?: {
    uid: string;
    email: string;
    name: string;
    photoURL?: string;
  };
}
