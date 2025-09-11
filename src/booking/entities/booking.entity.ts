// src/booking/entities/booking.entity.ts
export class Booking {
  id?: string;
  userId: string;
  roomId: string;
  checkIn: Date;
  checkOut: Date;
  status: 'created' | 'pending_payment' | 'confirmed' | 'cancelled';
  paymentId?: string;
  confirmationCode?: string;
  createdAt: Date;
  updatedAt: Date;

  // Campos adicionados para compatibilidade com frontend
  numberOfRooms: number;
  isBreakfastIncluded: boolean;
  specialRequests?: string;
  numberOfGuests: number; // Calcular baseado em quartos ou adicionar campo
  totalPrice: number; // Calcular baseado em diárias
  roomType: string; // Mapear roomId para tipo de quarto
}
