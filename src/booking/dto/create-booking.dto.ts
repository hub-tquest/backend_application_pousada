import {
  IsDateString,
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBookingDto {
  @ApiProperty({
    example: 'quarto-101',
    description: 'ID do quarto a ser reservado',
  })
  @IsString()
  roomId: string;

  @ApiProperty({
    example: '2024-05-15T14:00:00.000Z',
    description: 'Data e hora do check-in',
  })
  @IsDateString()
  checkIn: string;

  @ApiProperty({
    example: '2024-05-18T10:00:00.000Z',
    description: 'Data e hora do check-out',
  })
  @IsDateString()
  checkOut: string;

  @ApiProperty({
    example: 1,
    description: 'Número de quartos a serem reservados',
  })
  @IsNumber()
  numberOfRooms: number;

  @ApiProperty({
    example: true,
    description: 'Indica se o café da manhã está incluso',
  })
  @IsBoolean()
  isBreakfastIncluded: boolean;

  @ApiProperty({
    example: 'Vista para o jardim',
    description: 'Solicitações especiais do hóspede',
    required: false,
  })
  @IsOptional()
  @IsString()
  specialRequests?: string;

  @ApiProperty({
    example: 2,
    description: 'Número total de hóspedes',
  })
  @IsNumber()
  numberOfGuests: number;

  @ApiProperty({
    example: 600.0,
    description: 'Preço total da reserva',
  })
  @IsNumber()
  totalPrice: number;

  @ApiProperty({
    example: 'Standard',
    description: 'Tipo do quarto',
  })
  @IsString()
  roomType: string;
}
