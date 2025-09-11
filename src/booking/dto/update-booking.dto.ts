import {
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateBookingDto {
  @ApiPropertyOptional({
    example: 'quarto-102',
    description: 'ID do quarto a ser reservado',
  })
  @IsOptional()
  @IsString()
  roomId?: string;

  @ApiPropertyOptional({
    example: '2024-05-16T14:00:00.000Z',
    description: 'Data e hora do check-in',
  })
  @IsOptional()
  @IsDateString()
  checkIn?: string;

  @ApiPropertyOptional({
    example: '2024-05-19T10:00:00.000Z',
    description: 'Data e hora do check-out',
  })
  @IsOptional()
  @IsDateString()
  checkOut?: string;

  @ApiPropertyOptional({
    example: 2,
    description: 'Número de quartos a serem reservados',
  })
  @IsOptional()
  @IsNumber()
  numberOfRooms?: number;

  @ApiPropertyOptional({
    example: false,
    description: 'Indica se o café da manhã está incluso',
  })
  @IsOptional()
  @IsBoolean()
  isBreakfastIncluded?: boolean;

  @ApiPropertyOptional({
    example: 'Vista para a piscina',
    description: 'Solicitações especiais do hóspede',
  })
  @IsOptional()
  @IsString()
  specialRequests?: string;

  @ApiPropertyOptional({
    example: 4,
    description: 'Número total de hóspedes',
  })
  @IsOptional()
  @IsNumber()
  numberOfGuests?: number;

  @ApiPropertyOptional({
    example: 800.0,
    description: 'Preço total da reserva',
  })
  @IsOptional()
  @IsNumber()
  totalPrice?: number;

  @ApiPropertyOptional({
    example: 'Deluxe',
    description: 'Tipo do quarto',
  })
  @IsOptional()
  @IsString()
  roomType?: string;

  @ApiPropertyOptional({
    example: 'confirmed',
    description: 'Status da reserva',
    enum: ['created', 'pending_payment', 'confirmed', 'cancelled'],
  })
  @IsOptional()
  @IsString()
  status?: 'created' | 'pending_payment' | 'confirmed' | 'cancelled';
}
