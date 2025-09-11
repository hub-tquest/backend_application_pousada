// src/chatbot/vector/embeddings.service.ts
import { Injectable, Logger } from '@nestjs/common';
// Em produção, usar API real de embeddings (OpenAI, Groq embeddings, etc.)

@Injectable()
export class EmbeddingsService {
  private readonly logger = new Logger(EmbeddingsService.name);

  /**
   * Gera embedding para mensagem de chat
   */
  async generateMessageEmbedding(messageData: any): Promise<number[]> {
    try {
      const textToEmbed = this.prepareMessageText(messageData);
      return this.mockEmbedding(textToEmbed);
    } catch (error) {
      this.logger.error('Error generating message embedding:', error.message);
      return this.getDefaultEmbedding();
    }
  }

  /**
   * Gera embedding para documento de conhecimento
   */
  async generateKnowledgeEmbedding(knowledgeData: any): Promise<number[]> {
    try {
      const textToEmbed = this.prepareKnowledgeText(knowledgeData);
      return this.mockEmbedding(textToEmbed);
    } catch (error) {
      this.logger.error('Error generating knowledge embedding:', error.message);
      return this.getDefaultEmbedding();
    }
  }

  /**
   * Gera embedding para perfil de usuário
   */
  async generateUserEmbedding(userData: any): Promise<number[]> {
    try {
      const textToEmbed = this.prepareUserText(userData);
      return this.mockEmbedding(textToEmbed);
    } catch (error) {
      this.logger.error('Error generating user embedding:', error.message);
      return this.getDefaultEmbedding();
    }
  }

  private prepareMessageText(messageData: any): string {
    return `
      Role: ${messageData.role}
      Content: ${messageData.content}
      Intent: ${messageData.intent || 'unknown'}
      Entities: ${JSON.stringify(messageData.entities || {})}
      Topics: ${messageData.topics?.join(', ') || 'general'}
      Context: ${messageData.contextSummary || 'no context'}
    `.trim();
  }

  private prepareKnowledgeText(knowledgeData: any): string {
    return `
      Type: ${knowledgeData.type}
      Title: ${knowledgeData.title}
      Content: ${knowledgeData.content}
      Category: ${knowledgeData.category}
      Tags: ${knowledgeData.tags?.join(', ') || 'general'}
      Source: ${knowledgeData.source || 'internal'}
    `.trim();
  }

  private prepareUserText(userData: any): string {
    return `
      User Preferences: ${userData.preferences?.join(', ') || 'general'}
      Interaction History: ${userData.interactionHistory?.length || 0} interactions
      Satisfaction Score: ${userData.satisfactionScore || 0.5}
      Communication Style: ${userData.communicationStyle || 'casual'}
      Language Preferences: ${userData.languagePreferences?.join(', ') || 'portuguese'}
      Topic Interests: ${userData.topicInterests?.join(', ') || 'general'}
    `.trim();
  }

  private mockEmbedding(text: string): number[] {
    // Mock para desenvolvimento - em produção usar API real
    const seed = text.length;
    return Array(1536)
      .fill(0)
      .map(
        (_, i) =>
          Math.sin(seed + i * 0.1) * 0.5 +
          Math.cos(seed * 0.3 + i * 0.07) * 0.3,
      );
  }

  private getDefaultEmbedding(): number[] {
    return Array(1536).fill(0);
  }
}
