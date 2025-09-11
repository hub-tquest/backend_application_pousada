// src/chatbot/chatbot.module.ts (atualizado)
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './services/chatbot.service';
import { AiGroqService } from './services/ai-groq.service';
import { ConversationService } from './services/conversation.service';
import { FirebaseModule } from '../shared/firebase/firebase.module';
import { HttpModule } from '@nestjs/axios';
import { BookingModule } from '../booking/booking.module';
import { VectorSearchService } from './services/vector-search.service';
import { QdrantChatRepository } from './repositories/qdrant-chat.repository';
import { QdrantChatService } from './vector/qdrant-client';
import { EmbeddingsService } from './vector/embeddings.service';
import { KnowledgeBaseService } from './knowledge/knowledge-base.service';
import { IntentClassifierService } from './services/intent-classifier.service';

@Module({
  imports: [ConfigModule, FirebaseModule, HttpModule, BookingModule],
  controllers: [ChatbotController],
  providers: [
    ChatbotService,
    AiGroqService,
    ConversationService,
    VectorSearchService,
    QdrantChatRepository,
    QdrantChatService,
    EmbeddingsService,
    KnowledgeBaseService,
    IntentClassifierService,
  ],
  exports: [ChatbotService],
})
export class ChatbotModule {}
