import {
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
  IsDateString,
} from 'class-validator';

export class UpdateBookingDto {
  @IsOptional()
  @IsString()
  roomId?: string;

  @IsOptional()
  @IsDateString()
  checkIn?: string;

  @IsOptional()
  @IsDateString()
  checkOut?: string;

  @IsOptional()
  @IsNumber()
  numberOfRooms?: number;

  @IsOptional()
  @IsBoolean()
  isBreakfastIncluded?: boolean;

  @IsOptional()
  @IsString()
  specialRequests?: string;

  @IsOptional()
  @IsNumber()
  numberOfGuests?: number;

  @IsOptional()
  @IsNumber()
  totalPrice?: number;

  @IsOptional()
  @IsString()
  roomType?: string;

  @IsOptional()
  @IsString()
  status?: 'created' | 'pending_payment' | 'confirmed' | 'cancelled';
}
