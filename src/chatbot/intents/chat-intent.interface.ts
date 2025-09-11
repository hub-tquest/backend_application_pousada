// src/chatbot/intents/chat-intent.interface.ts
export interface ChatIntent {
  intent:
    | 'greeting'
    | 'list_rooms'
    | 'check_availability'
    | 'list_bookings'
    | 'booking_details'
    | 'create_booking'
    | 'cancel_booking'
    | 'goodbye'
    | 'fallback';
  confidence: number; // 0.0 a 1.0
  entities?: {
    dates?: { checkIn?: string; checkOut?: string };
    roomId?: string;
    bookingId?: string;
    numberOfGuests?: number;
  };
  rawMessage: string;
}

export const INTENT_PATTERNS: Record<string, RegExp[]> = {
  greeting: [/oi|olá|ola|bom dia|boa tarde|boa noite|hello|hi/i],
  list_rooms: [/quartos?|acomodações?|suites?|tipos? de quarto/i],
  check_availability: [
    /disponibilidade|tem vaga|tem lugar|quarto livre|data.*disponível/i,
  ],
  list_bookings: [
    /minhas reservas|minhas reservas|reservas ativas|histórico de reservas/i,
  ],
  booking_details: [
    /detalhes da reserva|informações da reserva|status da reserva/i,
  ],
  create_booking: [
    /fazer reserva|reservar|quero reservar|gostaria de reservar/i,
  ],
  cancel_booking: [/cancelar reserva|cancelar minha reserva|quero cancelar/i],
  goodbye: [/tchau|adeus|até mais|até logo|flw/i],
};
