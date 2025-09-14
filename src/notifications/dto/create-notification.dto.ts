import { IsString, IsEnum, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateNotificationDto {
  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  body: string;

  @ApiProperty({ enum: ['booking', 'payment', 'reminder', 'general'] })
  @IsEnum(['booking', 'payment', 'reminder', 'general'])
  type: 'booking' | 'payment' | 'reminder' | 'general';

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  read?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: Record<string, any>;
}
