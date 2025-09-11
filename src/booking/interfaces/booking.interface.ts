// src/booking/interfaces/booking.interface.ts
import { Booking } from '../entities/booking.entity';

export interface IBookingService {
  createBooking(data: any, userId: string): Promise<Booking>;
  getBookingById(id: string, userId: string): Promise<Booking>;
  getUserBookings(userId: string): Promise<Booking[]>;
  updateBooking(id: string, data: any, userId: string): Promise<Booking>;
  cancelBooking(id: string, userId: string): Promise<Booking>;
  checkAvailability(
    roomId: string,
    checkIn: Date,
    checkOut: Date,
  ): Promise<boolean>;
}
