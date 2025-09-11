// src/chatbot/repositories/qdrant-chat.repository.ts
import { Injectable, Logger } from '@nestjs/common';
import { QdrantChatService } from '../vector/qdrant-client';
import { EmbeddingsService } from '../vector/embeddings.service';

@Injectable()
export class QdrantChatRepository {
  private readonly logger = new Logger(QdrantChatRepository.name);
  private readonly COLLECTION_MESSAGES = 'chat_messages_vectors';
  private readonly COLLECTION_KNOWLEDGE = 'knowledge_base_vectors';
  private readonly COLLECTION_USERS = 'user_profiles_vectors';

  constructor(
    private readonly qdrantService: QdrantChatService,
    private readonly embeddingsService: EmbeddingsService,
  ) {
    this.initializeCollections();
  }

  /**
   * Inicializa coleções no Qdrant
   */
  private async initializeCollections(): Promise<void> {
    try {
      // ✅ Correção: Usar o client diretamente do serviço
      const client = this.qdrantService.client;

      // Criar coleção para mensagens de chat
      await client
        .createCollection(this.COLLECTION_MESSAGES, {
          vectors: {
            size: 1536,
            distance: 'Cosine',
          },
        })
        .catch(() => {
          this.logger.log(
            `Collection ${this.COLLECTION_MESSAGES} already exists`,
          );
        });

      // Criar coleção para base de conhecimento
      await client
        .createCollection(this.COLLECTION_KNOWLEDGE, {
          vectors: {
            size: 1536,
            distance: 'Cosine',
          },
        })
        .catch(() => {
          this.logger.log(
            `Collection ${this.COLLECTION_KNOWLEDGE} already exists`,
          );
        });

      // Criar coleção para perfis de usuários
      await client
        .createCollection(this.COLLECTION_USERS, {
          vectors: {
            size: 1536,
            distance: 'Cosine',
          },
        })
        .catch(() => {
          this.logger.log(`Collection ${this.COLLECTION_USERS} already exists`);
        });

      this.logger.log('Qdrant chat collections initialized');
    } catch (error) {
      this.logger.error(
        'Error initializing Qdrant chat collections:',
        error.message,
      );
    }
  }

  /**
   * Indexa uma mensagem no Qdrant
   */
  async indexMessage(messageData: any): Promise<void> {
    try {
      const vector =
        await this.embeddingsService.generateMessageEmbedding(messageData);
      // ✅ Correção: Usar o client diretamente do serviço
      const client = this.qdrantService.client;

      await client.upsert(this.COLLECTION_MESSAGES, {
        points: [
          {
            id: messageData.id,
            vector,
            payload: {
              conversationId: messageData.conversationId,
              userId: messageData.userId,
              role: messageData.role,
              content: messageData.content,
              timestamp: messageData.timestamp,
              intent: messageData.intent,
              entities: messageData.entities || {},
              sentiment: messageData.sentiment || 0,
              topics: messageData.topics || [],
              contextSummary: messageData.contextSummary || '',
            },
          },
        ],
      });

      this.logger.log(`Message ${messageData.id} indexed in Qdrant`);
    } catch (error) {
      this.logger.error(
        `Error indexing message ${messageData.id}:`,
        error.message,
      );
    }
  }

  /**
   * Indexa conhecimento na base vetorial
   */
  async indexKnowledge(knowledgeData: any): Promise<void> {
    try {
      const vector =
        await this.embeddingsService.generateKnowledgeEmbedding(knowledgeData);
      // ✅ Correção: Usar o client diretamente do serviço
      const client = this.qdrantService.client;

      await client.upsert(this.COLLECTION_KNOWLEDGE, {
        points: [
          {
            id: knowledgeData.id,
            vector,
            payload: {
              type: knowledgeData.type,
              title: knowledgeData.title,
              content: knowledgeData.content,
              category: knowledgeData.category,
              tags: knowledgeData.tags || [],
              source: knowledgeData.source || 'internal',
              lastUpdated: knowledgeData.lastUpdated || new Date(),
              relevanceScore: knowledgeData.relevanceScore || 1.0,
            },
          },
        ],
      });

      this.logger.log(`Knowledge ${knowledgeData.id} indexed in Qdrant`);
    } catch (error) {
      this.logger.error(
        `Error indexing knowledge ${knowledgeData.id}:`,
        error.message,
      );
    }
  }

  /**
   * Indexa perfil de usuário no Qdrant
   */
  async indexUserProfile(userData: any): Promise<void> {
    try {
      const vector =
        await this.embeddingsService.generateUserEmbedding(userData);
      // ✅ Correção: Usar o client diretamente do serviço
      const client = this.qdrantService.client;

      await client.upsert(this.COLLECTION_USERS, {
        points: [
          {
            id: userData.userId,
            vector,
            payload: {
              userId: userData.userId,
              preferences: userData.preferences || [],
              interactionHistory: userData.interactionHistory || [],
              satisfactionScore: userData.satisfactionScore || 0.5,
              communicationStyle: userData.communicationStyle || 'casual',
              languagePreferences: userData.languagePreferences || [
                'portuguese',
              ],
              topicInterests: userData.topicInterests || [],
            },
          },
        ],
      });

      this.logger.log(`User profile ${userData.userId} indexed in Qdrant`);
    } catch (error) {
      this.logger.error(
        `Error indexing user profile ${userData.userId}:`,
        error.message,
      );
    }
  }

  /**
   * Busca contexto semântico para uma mensagem
   */
  async findSemanticContext(
    message: string,
    conversationId: string,
    limit: number = 3,
  ): Promise<any[]> {
    try {
      const vector = await this.embeddingsService.generateMessageEmbedding({
        content: message,
        role: 'user',
      });
      // ✅ Correção: Usar o client diretamente do serviço
      const client = this.qdrantService.client;

      const searchResult = await client.search(this.COLLECTION_MESSAGES, {
        vector,
        filter: {
          must: [
            {
              key: 'conversationId',
              match: {
                value: conversationId,
              },
            },
          ],
        },
        limit,
        with_payload: true,
      });

      return searchResult.map((result) => ({
        id: result.id,
        content: result.payload.content,
        role: result.payload.role,
        timestamp: result.payload.timestamp,
        similarity: result.score,
      }));
    } catch (error) {
      this.logger.error(`Error finding semantic context:`, error.message);
      return [];
    }
  }

  /**
   * Busca conhecimento relevante para uma pergunta
   */
  async searchKnowledgeBase(
    query: string,
    categories?: string[],
    limit: number = 5,
  ): Promise<any[]> {
    try {
      const vector = await this.embeddingsService.generateKnowledgeEmbedding({
        content: query,
      });
      // ✅ Correção: Usar o client diretamente do serviço
      const client = this.qdrantService.client;

      const filters =
        categories && categories.length > 0
          ? {
              must: [
                {
                  key: 'category',
                  match: {
                    any: categories,
                  },
                },
              ],
            }
          : undefined;

      const searchResult = await client.search(this.COLLECTION_KNOWLEDGE, {
        vector,
        filter: filters,
        limit,
        with_payload: true,
      });

      return searchResult.map((result) => ({
        id: result.id,
        title: result.payload.title,
        content: result.payload.content,
        type: result.payload.type,
        category: result.payload.category,
        relevance: result.score,
        source: result.payload.source,
      }));
    } catch (error) {
      this.logger.error(`Error searching knowledge base:`, error.message);
      return [];
    }
  }

  /**
   * Busca perfil do usuário para personalização
   */
  async getUserProfile(userId: string): Promise<any> {
    try {
      // ✅ Correção: Usar o client diretamente do serviço
      const client = this.qdrantService.client;

      const userProfile = await client.retrieve(this.COLLECTION_USERS, {
        ids: [userId],
        with_payload: true,
      });

      if (!userProfile.length) {
        return null;
      }

      return userProfile[0].payload;
    } catch (error) {
      this.logger.error(`Error getting user profile ${userId}:`, error.message);
      return null;
    }
  }
}
