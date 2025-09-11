// src/booking/dto/chatbot-booking-query.dto.ts
import { IsDateString, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChatbotBookingQueryDto {
  @ApiProperty({
    example: '2024-05-15',
    description: 'Data de check-in no formato ISO 8601',
  })
  @IsDateString()
  checkIn: string;

  @ApiProperty({
    example: '2024-05-18',
    description: 'Data de check-out no formato ISO 8601',
  })
  @IsDateString()
  checkOut: string;

  @ApiPropertyOptional({
    example: 'Standard',
    description: 'Tipo do quarto (Standard, Deluxe, Suite, etc.)',
    required: false,
  })
  @IsOptional()
  @IsString()
  roomType?: string;
}
