// src/chatbot/knowledge/knowledge-base.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { QdrantChatRepository } from '../repositories/qdrant-chat.repository';
import { QdrantChatService } from '../vector/qdrant-client';

@Injectable()
export class KnowledgeBaseService {
  private readonly logger = new Logger(KnowledgeBaseService.name);

  constructor(
    private readonly qdrantService: QdrantChatService,
    private readonly qdrantRepository: QdrantChatRepository,
  ) {}

  /**
   * Inicializa a base de conhecimento com documentos padrão
   */
  async initializeKnowledgeBase(): Promise<void> {
    try {
      // Carregar documentos padrão
      const defaultDocuments = await this.loadDefaultDocuments();

      for (const doc of defaultDocuments) {
        await this.qdrantRepository.indexKnowledge(doc);
      }

      this.logger.log(
        `Knowledge base initialized with ${defaultDocuments.length} documents`,
      );
    } catch (error) {
      this.logger.error('Error initializing knowledge base:', error.message);
    }
  }

  /**
   * Adiciona novo documento à base de conhecimento
   */
  async addKnowledgeDocument(document: any): Promise<void> {
    try {
      await this.qdrantRepository.indexKnowledge(document);
      this.logger.log(
        `Knowledge document ${document.id} added to knowledge base`,
      );
    } catch (error) {
      this.logger.error(
        `Error adding knowledge document ${document.id}:`,
        error.message,
      );
    }
  }

  /**
   * Atualiza documento existente
   */
  async updateKnowledgeDocument(
    documentId: string,
    updates: any,
  ): Promise<void> {
    try {
      // Primeiro remover documento antigo
      const client = this.qdrantService.client;
      await client.delete('knowledge_base_vectors', {
        points: [documentId],
      });

      // Depois adicionar documento atualizado
      await this.qdrantRepository.indexKnowledge({
        id: documentId,
        ...updates,
        lastUpdated: new Date(),
      });

      this.logger.log(`Knowledge document ${documentId} updated`);
    } catch (error) {
      this.logger.error(
        `Error updating knowledge document ${documentId}:`,
        error.message,
      );
    }
  }

  /**
   * Remove documento da base de conhecimento
   */
  async removeKnowledgeDocument(documentId: string): Promise<void> {
    try {
      const client = this.qdrantService.client;
      await client.delete('knowledge_base_vectors', {
        points: [documentId],
      });

      this.logger.log(
        `Knowledge document ${documentId} removed from knowledge base`,
      );
    } catch (error) {
      this.logger.error(
        `Error removing knowledge document ${documentId}:`,
        error.message,
      );
    }
  }

  /**
   * Busca documentos por categoria
   */
  async searchByCategory(category: string, limit: number = 10): Promise<any[]> {
    try {
      const client = this.qdrantService.client;

      const searchResult = await client.scroll('knowledge_base_vectors', {
        filter: {
          must: [
            {
              key: 'category',
              match: {
                value: category,
              },
            },
          ],
        },
        limit,
        with_payload: true,
      });

      return searchResult.points.map((point) => ({
        id: point.id,
        ...point.payload,
      }));
    } catch (error) {
      this.logger.error(
        `Error searching knowledge by category ${category}:`,
        error.message,
      );
      return [];
    }
  }

  private async loadDefaultDocuments(): Promise<any[]> {
    // Documentos padrão da Pousada Chapada
    return [
      {
        id: 'faq-001',
        type: 'faq',
        title: 'Tipos de Quartos',
        content:
          'Temos diversos tipos de quartos: Standard, Superior, Suíte Master e Suíte Família. Cada um com suas características e preços específicos.',
        category: 'accommodation',
        tags: ['quartos', 'acomodações', 'suites'],
        source: 'internal',
        lastUpdated: new Date(),
        relevanceScore: 1.0,
      },
      {
        id: 'policy-001',
        type: 'policy',
        title: 'Política de Cancelamento',
        content:
          'Cancelamentos podem ser feitos com até 48 horas de antecedência sem custos. Após este período, será cobrada uma taxa de 50% do valor da reserva.',
        category: 'booking',
        tags: ['cancelamento', 'política', 'reembolso'],
        source: 'internal',
        lastUpdated: new Date(),
        relevanceScore: 1.0,
      },
      {
        id: 'service-001',
        type: 'service',
        title: 'Serviços Inclusos',
        content:
          'Todos os quartos incluem café da manhã, Wi-Fi gratuito, TV a cabo e frigobar. Suites incluem jantar e acesso à área de lazer.',
        category: 'services',
        tags: ['serviços', 'inclusos', 'benefícios'],
        source: 'internal',
        lastUpdated: new Date(),
        relevanceScore: 1.0,
      },
      // Adicionar mais documentos conforme necessário
    ];
  }
}
