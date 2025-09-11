// src/chatbot/vector/qdrant-client.ts
import { QdrantClient } from '@qdrant/js-client-rest';
import { Logger } from '@nestjs/common';

export class QdrantChatService {
  private readonly logger = new Logger(QdrantChatService.name);
  public readonly client: QdrantClient;

  constructor() {
    this.client = new QdrantClient({
      url: process.env.QDRANT_URL || 'http://localhost:6333',
      apiKey: process.env.QDRANT_API_KEY,
    });

    this.logger.log(`Qdrant client initialized: ${process.env.QDRANT_URL}`);
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Fazer chamada HTTP direta para o endpoint de saúde
      const response = await fetch(
        `${process.env.QDRANT_URL || 'http://localhost:6333'}/health`,
      );
      const healthData = await response.json();
      this.logger.log('Qdrant health check: OK');
      return healthData.status === 'ok';
    } catch (error) {
      this.logger.error('Qdrant health check failed:', error.message);
      return false;
    }
  }
}
