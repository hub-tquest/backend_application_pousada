// src/chatbot/services/intent-classifier.service.ts
import { Injectable, Logger } from '@nestjs/common';

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

@Injectable()
export class IntentClassifierService {
  private readonly logger = new Logger(IntentClassifierService.name);

  classifyIntent(message: string): ChatIntent {
    this.logger.debug(`[CLASSIFY_INTENT] Classifying message: "${message}"`);

    const lowerMessage = message.toLowerCase().trim();
    let bestMatch: ChatIntent | null = null;
    let highestScore = 0;

    // 1. Verificar padrões regex primeiro (mais rápido e confiável)
    const intents = this.getIntents();

    for (const [intentName, patterns] of Object.entries(intents)) {
      for (const pattern of patterns) {
        if (pattern.test(lowerMessage)) {
          const score = this.calculateRegexConfidence(pattern, lowerMessage);
          this.logger.debug(
            `[CLASSIFY_INTENT] Regex match for intent '${intentName}' with score: ${score}`,
          );

          if (score > highestScore) {
            highestScore = score;
            bestMatch = {
              intent: intentName as ChatIntent['intent'],
              confidence: score,
              rawMessage: message,
            };
          }
        }
      }
    }

    // 2. Se não encontrar por regex, usar fallback
    if (!bestMatch || highestScore < 0.3) {
      this.logger.debug(
        `[CLASSIFY_INTENT] No clear intent found, using fallback`,
      );
      return {
        intent: 'fallback',
        confidence: 0.1,
        rawMessage: message,
      };
    }

    // 3. Extrair entidades básicas
    const entities = this.extractEntities(message, bestMatch.intent);
    if (entities) {
      bestMatch.entities = entities;
    }

    this.logger.log(
      `[CLASSIFY_INTENT] Classified intent: ${bestMatch.intent} (confidence: ${bestMatch.confidence.toFixed(2)})`,
    );
    return bestMatch;
  }

  private getIntents(): Record<string, RegExp[]> {
    return {
      greeting: [/oi|olá|ola|bom dia|boa tarde|boa noite|hello|hi|hey/i],
      list_rooms: [
        /quartos?|acomodações?|suites?|tipos? de quarto|listar quartos|ver quartos|todos os quartos/i,
      ],
      check_availability: [
        /disponibilidade|tem vaga|tem lugar|quarto livre|data.*disponível|verificar disponibilidade|quartos disponíveis/i,
      ],
      list_bookings: [
        /minhas reservas|minhas reservas|reservas ativas|histórico de reservas|ver minhas reservas|listar minhas reservas/i,
      ],
      booking_details: [
        /detalhes da reserva|informações da reserva|status da reserva|ver reserva|detalhe da reserva/i,
      ],
      create_booking: [
        /fazer reserva|reservar|quero reservar|gostaria de reservar|nova reserva/i,
      ],
      cancel_booking: [
        /cancelar reserva|cancelar minha reserva|quero cancelar|cancelar reserva/i,
      ],
      goodbye: [/tchau|adeus|até mais|até logo|flw|bye|see you/i],
    };
  }

  private calculateRegexConfidence(pattern: RegExp, message: string): number {
    // Pontuação baseada no número de palavras-chave encontradas
    const matches = message.match(pattern);
    if (!matches) return 0;

    // Contar palavras-chave únicas encontradas
    const keywords = new Set(matches.map((m) => m.toLowerCase()));
    const keywordCount = keywords.size;

    // Normalizar a pontuação (máximo de 0.9 para regex)
    return Math.min(0.9, keywordCount * 0.3);
  }

  private extractEntities(
    message: string,
    intent: string,
  ): ChatIntent['entities'] {
    const entities: ChatIntent['entities'] = {};

    switch (intent) {
      case 'check_availability':
      case 'create_booking':
        // Extrair datas (formato simplificado)
        const dateMatches = message.match(/(\d{2}\/\d{2}\/\d{4})/g);
        if (dateMatches && dateMatches.length >= 1) {
          entities.dates = {
            checkIn: dateMatches[0],
            checkOut: dateMatches[1] || dateMatches[0], // Se só tiver uma data, assume check-in = check-out
          };
        }
        break;

      case 'booking_details':
      case 'cancel_booking':
        // Extrair ID da reserva (formato simplificado)
        const bookingIdMatch = message.match(/([A-Z0-9]{6,})/i); // Código de confirmação tipo "RES-ABC123"
        if (bookingIdMatch) {
          entities.bookingId = bookingIdMatch[1];
        }
        break;
    }

    return Object.keys(entities).length > 0 ? entities : undefined;
  }
}
