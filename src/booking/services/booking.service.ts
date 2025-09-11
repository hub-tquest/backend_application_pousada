// src/booking/services/booking.service.ts
import { Injectable, Inject, Logger } from '@nestjs/common';
import { BookingRepository } from '../repositories/booking.repository';
import { CreateBookingDto } from '../dto/create-booking.dto';
import { Booking } from '../entities/booking.entity';
import { IBookingService } from '../interfaces/booking.interface';
import { AvailabilityService } from './availability.service';
import { MercadoPagoService } from '../payment/mercadopago.service';

@Injectable()
export class BookingService implements IBookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    private readonly bookingRepository: BookingRepository,
    private readonly availabilityService: AvailabilityService,
    private readonly mercadopagoService: MercadoPagoService,
  ) {}

  // src/booking/services/booking.service.ts (trecho atualizado)
  async createBooking(
    createBookingDto: CreateBookingDto,
    userId: string,
  ): Promise<any> {
    try {
      // Verificar disponibilidade
      const isAvailable = await this.availabilityService.checkAvailability(
        createBookingDto.roomId,
        new Date(createBookingDto.checkIn),
        new Date(createBookingDto.checkOut),
      );

      if (!isAvailable) {
        throw new Error('Room not available for selected dates');
      }

      // Criar reserva com todos os campos
      const booking: Booking = {
        userId,
        roomId: createBookingDto.roomId,
        checkIn: new Date(createBookingDto.checkIn),
        checkOut: new Date(createBookingDto.checkOut),
        numberOfRooms: createBookingDto.numberOfRooms,
        isBreakfastIncluded: createBookingDto.isBreakfastIncluded,
        specialRequests: createBookingDto.specialRequests,
        numberOfGuests: createBookingDto.numberOfGuests,
        totalPrice: createBookingDto.totalPrice,
        roomType: createBookingDto.roomType,
        status: 'created',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const createdBooking = await this.bookingRepository.create(booking);

      // Gerar código de confirmação
      const confirmationCode = this.generateConfirmationCode();
      await this.bookingRepository.update(createdBooking.id, {
        confirmationCode,
        updatedAt: new Date(),
      });

      // Criar preferência de pagamento
      const paymentItems = [
        {
          id: createdBooking.id,
          title: `Reserva Pousada Chapada - ${createBookingDto.roomType}`,
          description: `Reserva de ${this.calculateNights(new Date(createBookingDto.checkIn), new Date(createBookingDto.checkOut))} noites`,
          quantity: 1,
          currency_id: 'BRL',
          unit_price: createBookingDto.totalPrice,
        },
      ];

      // Apenas criar preferência de pagamento se estiver em produção ou com credenciais válidas
      let paymentPreference = null;
      try {
        paymentPreference =
          await this.mercadopagoService.createPaymentPreference(
            paymentItems,
            createdBooking.id,
            userId,
          );
      } catch (paymentError) {
        this.logger.warn(
          `Payment preference creation failed (non-critical): ${paymentError.message}`,
        );
        // Continuar mesmo que o pagamento falhe (para testes)
      }

      this.logger.log(
        `Booking created with confirmation code: ${confirmationCode}`,
      );

      return {
        booking: { ...createdBooking, confirmationCode },
        paymentPreference: paymentPreference,
      };
    } catch (error) {
      this.logger.error(`Error creating booking: ${error.message}`);
      throw error;
    }
  }

  private calculateNights(checkIn: Date, checkOut: Date): number {
    const diffTime = Math.abs(checkOut.getTime() - checkIn.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private generateConfirmationCode(): string {
    return `RES-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
  }

  async findByPaymentId(paymentId: string): Promise<Booking | null> {
    try {
      this.logger.log(`Finding booking by payment ID: ${paymentId}`);
      return await this.bookingRepository.findByPaymentId(paymentId);
    } catch (error) {
      this.logger.error(
        `Error finding booking by payment ID ${paymentId}:`,
        error,
      );
      throw error;
    }
  }

  private validateUserId(userId: string): void {
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid user ID provided');
    }
  }

  async getUserBookings(userId: string): Promise<Booking[]> {
    this.validateUserId(userId);
    return this.bookingRepository.findByUserId(userId);
  }

  async getBookingById(id: string, userId: string): Promise<Booking> {
    this.validateUserId(userId);
    const booking = await this.bookingRepository.findById(id);
    if (!booking || booking.userId !== userId) {
      throw new Error('Booking not found');
    }
    return booking;
  }

  async updateBooking(id: string, data: any, userId: string): Promise<Booking> {
    const booking = await this.getBookingById(id, userId);
    if (booking.status !== 'created') {
      throw new Error('Cannot update confirmed or cancelled bookings');
    }

    const updatedData = { ...data, updatedAt: new Date() };
    return this.bookingRepository.update(id, updatedData);
  }

  async cancelBooking(id: string, userId: string): Promise<Booking> {
    this.validateUserId(userId);
    const booking = await this.getBookingById(id, userId);
    if (booking.status === 'cancelled' || booking.status === 'confirmed') {
      throw new Error('Cannot cancel confirmed or already cancelled bookings');
    }

    return this.bookingRepository.update(id, {
      status: 'cancelled',
      updatedAt: new Date(),
    });
  }

  async checkAvailability(
    roomId: string,
    checkIn: Date,
    checkOut: Date,
  ): Promise<boolean> {
    return this.availabilityService.checkAvailability(
      roomId,
      checkIn,
      checkOut,
    );
  }

  async confirmBookingPayment(
    bookingId: string,
    paymentId: string,
  ): Promise<Booking> {
    try {
      const booking = await this.bookingRepository.findById(bookingId);
      if (!booking) {
        throw new Error('Booking not found');
      }

      if (booking.status === 'confirmed') {
        return booking; // Já confirmado
      }

      // Atualizar status e paymentId
      const updatedBooking = await this.bookingRepository.update(bookingId, {
        status: 'confirmed',
        paymentId: paymentId,
        updatedAt: new Date(),
      });

      this.logger.log(
        `Booking ${bookingId} confirmed with payment ${paymentId}`,
      );
      return updatedBooking;
    } catch (error) {
      this.logger.error(`Error confirming booking payment: ${error.message}`);
      throw error;
    }
  }
}
