// src/booking/services/availability.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { BookingRepository } from '../repositories/booking.repository';
import { Booking } from '../entities/booking.entity';

@Injectable()
export class AvailabilityService {
  private readonly logger = new Logger(AvailabilityService.name);

  constructor(private readonly bookingRepository: BookingRepository) {}

  /**
   * Verifica a disponibilidade de um quarto para um período específico
   * @param roomId ID do quarto
   * @param checkIn Data de check-in
   * @param checkOut Data de check-out
   * @returns boolean indicando se o quarto está disponível
   */
  async checkAvailability(
    roomId: string,
    checkIn: Date,
    checkOut: Date,
  ): Promise<boolean> {
    try {
      this.logger.log(
        `Checking availability for room ${roomId} from ${checkIn.toISOString()} to ${checkOut.toISOString()}`,
      );

      // Validar datas
      if (checkIn >= checkOut) {
        throw new Error('Check-in date must be before check-out date');
      }

      // Buscar todas as reservas confirmadas para o quarto
      const confirmedBookings =
        await this.bookingRepository.findByRoomIdAndStatus(roomId, 'confirmed');

      // Verificar sobreposição de datas
      for (const booking of confirmedBookings) {
        const bookingCheckIn = new Date(booking.checkIn);
        const bookingCheckOut = new Date(booking.checkOut);

        // Verificar se há sobreposição
        if (checkIn < bookingCheckOut && checkOut > bookingCheckIn) {
          this.logger.log(
            `Room ${roomId} not available due to booking ${booking.id}`,
          );
          return false; // Não disponível
        }
      }

      this.logger.log(`Room ${roomId} is available for the requested period`);
      return true; // Disponível
    } catch (error) {
      this.logger.error(
        `Failed to check availability: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to check availability: ${error.message}`);
    }
  }

  /**
   * Verifica disponibilidade para múltiplos quartos
   * @param roomIds Array de IDs de quartos
   * @param checkIn Data de check-in
   * @param checkOut Data de check-out
   * @returns Array de quartos disponíveis
   */
  async checkAvailabilityForMultipleRooms(
    roomIds: string[],
    checkIn: Date,
    checkOut: Date,
  ): Promise<{ roomId: string; available: boolean }[]> {
    try {
      this.logger.log(
        `Checking availability for multiple rooms: ${roomIds.join(', ')} from ${checkIn.toISOString()} to ${checkOut.toISOString()}`,
      );

      const availabilityResults = [];

      for (const roomId of roomIds) {
        const isAvailable = await this.checkAvailability(
          roomId,
          checkIn,
          checkOut,
        );
        availabilityResults.push({
          roomId,
          available: isAvailable,
        });
      }

      return availabilityResults;
    } catch (error) {
      this.logger.error(
        `Failed to check availability for multiple rooms: ${error.message}`,
        error.stack,
      );
      throw new Error(
        `Failed to check availability for multiple rooms: ${error.message}`,
      );
    }
  }

  /**
   * Obtém quartos disponíveis para um período específico
   * @param checkIn Data de check-in
   * @param checkOut Data de check-out
   * @param roomTypes Tipos de quartos a verificar (opcional)
   * @returns Array de quartos disponíveis formatados para chatbot
   */
  async getAvailableRoomsForPeriod(
    checkIn: Date,
    checkOut: Date,
    roomTypes?: string[],
  ): Promise<any[]> {
    try {
      this.logger.log(
        `Getting available rooms from ${checkIn.toISOString()} to ${checkOut.toISOString()}`,
      );

      // Lista de quartos padrão da pousada (em produção, buscar do banco)
      const allRooms = [
        { id: 'standard-101', type: 'Standard', name: 'Quarto Standard 101' },
        { id: 'standard-102', type: 'Standard', name: 'Quarto Standard 102' },
        { id: 'deluxe-201', type: 'Deluxe', name: 'Quarto Deluxe 201' },
        { id: 'suite-301', type: 'Suite', name: 'Suíte Master 301' },
      ];

      // Filtrar por tipos específicos se fornecido
      const roomsToCheck =
        roomTypes && roomTypes.length > 0
          ? allRooms.filter((room) => roomTypes.includes(room.type))
          : allRooms;

      const availableRooms = [];

      for (const room of roomsToCheck) {
        const isAvailable = await this.checkAvailability(
          room.id,
          checkIn,
          checkOut,
        );
        if (isAvailable) {
          availableRooms.push({
            id: room.id,
            type: room.type,
            name: room.name,
            // Valores simulados (em produção, buscar do banco)
            pricePerNight: this.getPriceByRoomType(room.type),
            amenities: this.getAmenitiesByRoomType(room.type),
          });
        }
      }

      this.logger.log(`Found ${availableRooms.length} available rooms`);
      return availableRooms;
    } catch (error) {
      this.logger.error(
        `Failed to get available rooms: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to get available rooms: ${error.message}`);
    }
  }

  /**
   * Formata informações de disponibilidade para o chatbot
   * @param checkIn Data de check-in
   * @param checkOut Data de check-out
   * @param roomTypes Tipos de quartos (opcional)
   * @returns Objeto formatado para resposta de chatbot
   */
  async formatAvailabilityForChatbot(
    checkIn: Date,
    checkOut: Date,
    roomTypes?: string[],
  ): Promise<any> {
    try {
      const availableRooms = await this.getAvailableRoomsForPeriod(
        checkIn,
        checkOut,
        roomTypes,
      );

      return {
        period: {
          checkIn: checkIn.toLocaleDateString('pt-BR'),
          checkOut: checkOut.toLocaleDateString('pt-BR'),
          nights: this.calculateNights(checkIn, checkOut),
        },
        availableRooms: availableRooms.map((room) => ({
          id: room.id,
          name: room.name,
          type: room.type,
          price: `R$ ${room.pricePerNight.toFixed(2).replace('.', ',')}/noite`,
          totalPrice: `R$ ${(room.pricePerNight * this.calculateNights(checkIn, checkOut)).toFixed(2).replace('.', ',')} total`,
          amenities: room.amenities.join(', '),
        })),
        summary: {
          totalAvailable: availableRooms.length,
          message:
            availableRooms.length > 0
              ? `Encontrei ${availableRooms.length} quarto(s) disponível(is) para o período selecionado!`
              : 'Não há quartos disponíveis para o período selecionado.',
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to format availability for chatbot: ${error.message}`,
        error.stack,
      );
      throw new Error(
        `Failed to format availability for chatbot: ${error.message}`,
      );
    }
  }

  /**
   * Calcula o número de noites entre duas datas
   * @param checkIn Data de check-in
   * @param checkOut Data de check-out
   * @returns Número de noites
   */
  private calculateNights(checkIn: Date, checkOut: Date): number {
    const diffTime = Math.abs(checkOut.getTime() - checkIn.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Obtém preço por tipo de quarto (simulado)
   * @param roomType Tipo do quarto
   * @returns Preço por noite
   */
  private getPriceByRoomType(roomType: string): number {
    const prices = {
      Standard: 200,
      Deluxe: 350,
      Suite: 500,
    };
    return prices[roomType] || 200;
  }

  /**
   * Obtém comodidades por tipo de quarto (simulado)
   * @param roomType Tipo do quarto
   * @returns Array de comodidades
   */
  private getAmenitiesByRoomType(roomType: string): string[] {
    const amenities = {
      Standard: ['Wi-Fi', 'TV', 'Ar-condicionado', 'Frigobar'],
      Deluxe: [
        'Wi-Fi',
        'TV Smart',
        'Ar-condicionado',
        'Frigobar',
        'Varanda',
        'Café da manhã',
      ],
      Suite: [
        'Wi-Fi',
        'TV Smart',
        'Ar-condicionado',
        'Frigobar',
        'Varanda',
        'Hidromassagem',
        'Serviço de quarto',
        'Café da manhã',
      ],
    };
    return amenities[roomType] || ['Wi-Fi', 'TV', 'Ar-condicionado'];
  }
}
