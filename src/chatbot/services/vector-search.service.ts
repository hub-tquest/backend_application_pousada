// src/chatbot/services/vector-search.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { QdrantChatRepository } from '../repositories/qdrant-chat.repository';
import { ConversationService } from './conversation.service';

@Injectable()
export class VectorSearchService {
  private readonly logger = new Logger(VectorSearchService.name);

  constructor(
    private readonly qdrantRepository: QdrantChatRepository,
    private readonly conversationService: ConversationService,
  ) {}

  /**
   * Enriquece uma mensagem com contexto semântico
   */
  async enrichWithContext(
    message: string,
    conversationId: string,
    userId: string,
  ): Promise<any> {
    try {
      // 1. Buscar contexto recente da conversa
      const recentContext = await this.qdrantRepository.findSemanticContext(
        message,
        conversationId,
        3,
      );

      // 2. Buscar conhecimento relevante
      const categories = this.extractCategories(message);
      const knowledgeBase = await this.qdrantRepository.searchKnowledgeBase(
        message,
        categories,
        5,
      );

      // 3. Buscar perfil do usuário
      const userProfile = await this.qdrantRepository.getUserProfile(userId);

      // 4. Combinar todos os contextos
      return {
        recentContext,
        knowledgeBase,
        userProfile,
        enrichedMessage: this.buildEnrichedMessage(
          message,
          recentContext,
          knowledgeBase,
          userProfile,
        ),
      };
    } catch (error) {
      this.logger.error(`Error enriching context for message:`, error.message);
      return {
        recentContext: [],
        knowledgeBase: [],
        userProfile: null,
        enrichedMessage: message,
      };
    }
  }

  /**
   * Busca conhecimento específico para uma categoria
   */
  async searchSpecificKnowledge(
    query: string,
    category: string,
  ): Promise<any[]> {
    try {
      return await this.qdrantRepository.searchKnowledgeBase(
        query,
        [category],
        3,
      );
    } catch (error) {
      this.logger.error(
        `Error searching specific knowledge for ${category}:`,
        error.message,
      );
      return [];
    }
  }

  private extractCategories(message: string): string[] {
    const categories: string[] = [];

    // Extrair categorias baseadas em palavras-chave
    if (
      message.toLowerCase().includes('quarto') ||
      message.toLowerCase().includes('suite')
    ) {
      categories.push('accommodation');
    }

    if (
      message.toLowerCase().includes('reserva') ||
      message.toLowerCase().includes('booking')
    ) {
      categories.push('booking');
    }

    if (
      message.toLowerCase().includes('trilha') ||
      message.toLowerCase().includes('trail')
    ) {
      categories.push('activities');
    }

    if (
      message.toLowerCase().includes('pagamento') ||
      message.toLowerCase().includes('payment')
    ) {
      categories.push('payment');
    }

    // Se nenhuma categoria específica, usar generalista
    if (categories.length === 0) {
      categories.push('general');
    }

    return categories;
  }

  private buildEnrichedMessage(
    originalMessage: string,
    context: any[],
    knowledge: any[],
    userProfile: any,
  ): string {
    let enrichedMessage = `User Message: ${originalMessage}\n\n`;

    if (context.length > 0) {
      enrichedMessage += `Recent Context:\n`;
      context.forEach((ctx, index) => {
        enrichedMessage += `${index + 1}. ${ctx.role}: ${ctx.content}\n`;
      });
      enrichedMessage += '\n';
    }

    if (knowledge.length > 0) {
      enrichedMessage += `Relevant Information:\n`;
      knowledge.forEach((kb, index) => {
        enrichedMessage += `${index + 1}. ${kb.title}: ${kb.content}\n`;
      });
      enrichedMessage += '\n';
    }

    if (userProfile) {
      enrichedMessage += `User Profile:\n`;
      enrichedMessage += `- Preferences: ${userProfile.preferences?.join(', ') || 'general'}\n`;
      enrichedMessage += `- Communication Style: ${userProfile.communicationStyle || 'casual'}\n`;
      enrichedMessage += `- Satisfaction Score: ${userProfile.satisfactionScore || 0.5}\n\n`;
    }

    enrichedMessage +=
      'Based on all this context, please provide a helpful and personalized response.';

    return enrichedMessage;
  }
}
