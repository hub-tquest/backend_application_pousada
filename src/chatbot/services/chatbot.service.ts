// src/chatbot/services/chatbot.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { AiGroqService } from './ai-groq.service';
import { ConversationService } from './conversation.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AddMessageDto } from '../interfaces/conversation.interface';
import { BookingService } from '../../booking/services/booking.service';

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);

  constructor(
    private readonly aiService: AiGroqService,
    private readonly conversationService: ConversationService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly bookingService: BookingService,
  ) {}

  async processMessage(
    message: string,
    userId: string,
    conversationId?: string,
  ) {
    try {
      if (!message || message.trim().length === 0) {
        throw new Error('Mensagem inválida');
      }

      // Obter ou criar conversa
      const conversation =
        await this.conversationService.getOrCreateConversation(
          userId,
          conversationId,
        );

      // Adicionar mensagem do usuário
      const userMessageDto: AddMessageDto = {
        conversationId: conversation.id,
        role: 'user',
        content: message.trim(),
      };

      await this.conversationService.addMessage(userMessageDto);

      // Detectar intenção de booking primeiro (antes da IA)
      const bookingIntent = this.detectBookingIntent(message);
      if (bookingIntent.confidence > 0.7) {
        // Intenção clara de booking - processar diretamente
        this.logger.log(
          `[PROCESS_MESSAGE] High confidence booking intent detected: ${bookingIntent.intent}`,
        );
        const bookingResponse = await this.handleBookingIntent(
          userId,
          bookingIntent.intent,
          bookingIntent.parameters,
        );

        // Adicionar resposta do bot
        const botMessageDto: AddMessageDto = {
          conversationId: conversation.id,
          role: 'assistant',
          content: bookingResponse.response,
        };
        await this.conversationService.addMessage(botMessageDto);

        return {
          conversationId: conversation.id,
          response: bookingResponse.response,
          timestamp: new Date(),
        };
      }

      // Para intenções com baixa confiança, usar IA generativa
      this.logger.debug(
        `[PROCESS_MESSAGE] Low confidence (${bookingIntent.confidence.toFixed(2)}), using generative AI`,
      );

      // Preparar histórico para contexto da IA
      const recentMessages = await this.conversationService.getRecentMessages(
        conversation.id,
        8,
      );

      const aiMessages = recentMessages.map((msg) => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
      }));

      // Adicionar instrução clara para a IA
      const systemMessage = {
        role: 'system' as const,
        content: `Você é um assistente virtual que esta DENTRO do nosso aplicativo da Pousada Chapada dos veadeiros. 
        Sua função é ajudar os hóspedes com informações sobre a pousada, trilhas, quartos e serviços.
        SEMPRE que possível, direcione o usuário para ações específicas no aplicativo.
        NUNCA invente informações ou códigos de reserva.
        Se não tiver certeza, peça mais informações ou sugira acessar o aplicativo.
        Formate suas respostas de forma clara e concisa.`,
      };

      aiMessages.unshift(systemMessage);

      const aiResponse = await this.aiService.sendMessage(aiMessages);

      // Adicionar resposta do bot
      const botMessageDto: AddMessageDto = {
        conversationId: conversation.id,
        role: 'assistant',
        content: aiResponse.content,
      };

      await this.conversationService.addMessage(botMessageDto);

      return {
        conversationId: conversation.id,
        response: aiResponse.content,
        timestamp: new Date(),
        usage: aiResponse.usage,
      };
    } catch (error) {
      this.logger.error('Erro ao processar mensagem:', error);
      throw new Error(`Erro ao processar mensagem: ${error.message}`);
    }
  }

  private detectBookingIntent(message: string): {
    intent: string;
    confidence: number;
    parameters: any;
  } {
    const lowerMessage = message.toLowerCase().trim();

    // Padrões de intenções de booking com alta confiança
    const bookingPatterns = {
      list_bookings: [
        /listar.*reservas?/i,
        /minhas.*reservas?/i,
        /ver.*reservas?/i,
        /reservas.*ativas/i,
        /histórico.*reservas?/i,
        /todas.*minhas.*reservas?/i,
        /reservas.*usuário/i,
        /minhas.*bookings?/i,
      ],
      check_availability: [
        /disponibilidade/i,
        /tem.*vaga/i,
        /tem.*lugar/i,
        /quarto.*livre/i,
        /data.*disponível/i,
        /verificar.*disponibilidade/i,
        /quartos.*disponíveis/i,
      ],
      create_booking: [
        /fazer.*reserva/i,
        /reservar.*quarto/i,
        /quero.*reservar/i,
        /gostaria.*reservar/i,
        /nova.*reserva/i,
      ],
      cancel_booking: [
        /cancelar.*reserva/i,
        /quero.*cancelar.*reserva/i,
        /cancelar.*minha.*reserva/i,
      ],
      booking_details: [
        /detalhes.*reserva/i,
        /informações.*reserva/i,
        /status.*reserva/i,
        /ver.*reserva/i,
      ],
    };

    // Verificar cada padrão
    for (const [intent, patterns] of Object.entries(bookingPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(lowerMessage)) {
          // Extrair parâmetros básicos
          const parameters: any = {};

          // Extrair datas (formato simplificado)
          const dateMatches = lowerMessage.match(/(\d{2}\/\d{2}\/\d{4})/g);
          if (dateMatches && dateMatches.length >= 1) {
            parameters.dates = {
              checkIn: dateMatches[0],
              checkOut: dateMatches[1] || dateMatches[0],
            };
          }

          return {
            intent,
            confidence: 0.9, // Alta confiança para padrões claros
            parameters,
          };
        }
      }
    }

    // Padrões mais genéricos (menor confiança)
    if (lowerMessage.includes('reserva') || lowerMessage.includes('booking')) {
      return {
        intent: 'list_bookings',
        confidence: 0.6, // Confiança média
        parameters: {},
      };
    }

    // Nenhuma intenção de booking detectada
    return {
      intent: 'none',
      confidence: 0.1,
      parameters: {},
    };
  }

  private async handleBookingIntent(
    userId: string,
    intent: string,
    parameters: any,
  ) {
    try {
      switch (intent) {
        case 'list_bookings':
          return await this.listUserBookings(userId);

        case 'check_availability':
          return await this.checkRoomAvailability(parameters);

        case 'create_booking':
          return await this.createBooking(userId, parameters);

        case 'cancel_booking':
          return await this.cancelBooking(parameters.bookingId, userId);

        case 'booking_details':
          return await this.getBookingDetails(parameters.bookingId, userId);

        default:
          return {
            response: 'Desculpe, não entendi sua solicitação sobre reservas.',
          };
      }
    } catch (error) {
      this.logger.error(`Erro ao processar intent ${intent}:`, error);
      return {
        response:
          'Ocorreu um erro ao processar sua solicitação. Tente novamente.',
      };
    }
  }

  private async listUserBookings(userId: string) {
    try {
      const bookings = await this.bookingService.getUserBookings(userId);

      if (bookings.length === 0) {
        return { response: 'Você não possui reservas ativas no momento.' };
      }

      let responseText = 'Aqui estão suas reservas:\n';
      bookings.forEach((booking: any, index: number) => {
        responseText += `\n${index + 1}. Reserva ${booking.confirmationCode}: Quarto ${booking.roomId} de ${new Date(booking.checkIn).toLocaleDateString('pt-BR')} até ${new Date(booking.checkOut).toLocaleDateString('pt-BR')} (Status: ${booking.status})`;
      });

      return { response: responseText };
    } catch (error) {
      this.logger.error(
        `Erro ao listar reservas para usuário ${userId}:`,
        error,
      );
      throw new Error(`Erro ao listar reservas: ${error.message}`);
    }
  }

  private async checkRoomAvailability(parameters: any) {
    // Implementar lógica para verificar disponibilidade
    // Esta é uma implementação básica - você pode expandir conforme necessário
    return {
      response: `Para verificar a disponibilidade de quartos para as datas solicitadas, você pode:\n\n1. Acessar a seção "Reservas" no nosso aplicativo\n2. Selecionar as datas desejadas\n3. Verificar quais quartos estão disponíveis\n\nSe quiser, posso te ajudar a acessar o aplicativo diretamente!`,
    };
  }

  private async createBooking(userId: string, parameters: any) {
    // Implementar lógica para criar reserva
    return {
      response: `Para fazer uma reserva, acesse a seção "Reservas" no nosso aplicativo. Lá você poderá selecionar as datas, escolher o quarto e finalizar sua reserva.`,
    };
  }

  private async cancelBooking(bookingId: string, userId: string) {
    // Implementar lógica para cancelar reserva
    return {
      response: `Para cancelar uma reserva, acesse a seção "Minhas Reservas" no aplicativo e selecione a opção de cancelamento.`,
    };
  }

  private async getBookingDetails(bookingId: string, userId: string) {
    // Implementar lógica para detalhes da reserva
    return {
      response: `Para ver os detalhes da sua reserva, acesse a seção "Minhas Reservas" no aplicativo.`,
    };
  }

  async resetConversation(conversationId: string, userId: string) {
    try {
      await this.conversationService.resetConversation(conversationId, userId);

      return {
        success: true,
        message: 'Conversa resetada com sucesso',
      };
    } catch (error) {
      this.logger.error('Erro ao resetar conversa:', error);
      throw new Error(`Erro ao resetar conversa: ${error.message}`);
    }
  }

  async getConversationHistory(conversationId: string, userId: string) {
    try {
      const conversation =
        await this.conversationService.getConversation(conversationId);

      if (!conversation) {
        throw new Error('Conversa não encontrada');
      }

      if (conversation.userId !== userId) {
        throw new Error('Acesso não autorizado');
      }

      return {
        conversationId: conversation.id,
        title: conversation.title,
        createdAt: conversation.createdAt.toDate(),
        lastMessageAt: conversation.lastMessageAt?.toDate(),
        messages: conversation.messages.map((msg) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp.toDate(),
          metadata: msg.metadata,
        })),
      };
    } catch (error) {
      this.logger.error('Erro ao buscar histórico:', error);
      throw new Error(`Erro ao buscar histórico: ${error.message}`);
    }
  }
}
