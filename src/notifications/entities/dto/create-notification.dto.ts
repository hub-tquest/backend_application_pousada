import { IsString, IsEnum, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  read?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  metadata?: Record<string, any>;
}