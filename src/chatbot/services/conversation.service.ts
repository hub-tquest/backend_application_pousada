import { Injectable, Logger } from '@nestjs/common';
import { FirebaseService } from '../../shared/firebase/firebase.service';
import {
  IConversationService,
  CreateConversationDto,
  AddMessageDto,
  ConversationWithMessages,
} from '../interfaces/conversation.interface';
import { ConversationEntity } from '../entities/conversation.entity';
import { MessageEntity } from '../entities/message.entity';
import {
  CHATBOT_CONSTANTS,
  CHATBOT_ERRORS,
} from '../constants/chatbot.constants';
import { Timestamp } from 'firebase-admin/firestore';

@Injectable()
export class ConversationService implements IConversationService {
  private readonly logger = new Logger(ConversationService.name);
  private readonly db: FirebaseFirestore.Firestore; // Tipo correto

  constructor(private readonly firebaseService: FirebaseService) {
    this.db = firebaseService.getFirestore(); // Método correto
  }

  async createConversation(
    dto: CreateConversationDto,
  ): Promise<ConversationEntity> {
    try {
      const conversationRef = this.db.collection('conversations').doc();
      const conversationId = conversationRef.id;
      const now = Timestamp.now();

      const conversation: ConversationEntity = {
        id: conversationId,
        userId: dto.userId,
        title: dto.title || 'Nova Conversa',
        createdAt: now,
        updatedAt: now,
        isActive: true,
        messages: [],
        metadata: {
          context: dto.initialContext || {},
          language: 'pt-BR',
          version: '1.0',
        },
      };

      await conversationRef.set(conversation);
      this.logger.log(
        `Conversa criada: ${conversationId} para usuário: ${dto.userId}`,
      );

      return conversation;
    } catch (error) {
      this.logger.error('Erro ao criar conversa:', error);
      throw new Error(`${CHATBOT_ERRORS.DATABASE_ERROR}: ${error.message}`);
    }
  }

  async getConversation(
    conversationId: string,
  ): Promise<ConversationWithMessages | null> {
    try {
      const conversationDoc = await this.db
        .collection('conversations')
        .doc(conversationId)
        .get();

      if (!conversationDoc.exists) {
        return null;
      }

      const conversation = conversationDoc.data() as ConversationEntity;

      if (!conversation) {
        return null;
      }

      const messages = await this.getRecentMessages(conversationId);

      return {
        ...conversation,
        messages,
      };
    } catch (error) {
      this.logger.error(`Erro ao buscar conversa ${conversationId}:`, error);
      throw new Error(`${CHATBOT_ERRORS.DATABASE_ERROR}: ${error.message}`);
    }
  }

  async getOrCreateConversation(
    userId: string,
    conversationId?: string,
  ): Promise<ConversationWithMessages> {
    try {
      if (conversationId) {
        const existing = await this.getConversation(conversationId);
        if (existing) {
          return existing;
        }
      }

      // Criar nova conversa
      const newConversation = await this.createConversation({ userId });
      return {
        ...newConversation,
        messages: [],
      };
    } catch (error) {
      this.logger.error('Erro ao obter ou criar conversa:', error);
      throw new Error(`${CHATBOT_ERRORS.DATABASE_ERROR}: ${error.message}`);
    }
  }

  async addMessage(dto: AddMessageDto): Promise<MessageEntity> {
    try {
      const messageRef = this.db.collection('messages').doc();
      const messageId = messageRef.id;
      const now = Timestamp.now();

      const message: MessageEntity = {
        id: messageId,
        conversationId: dto.conversationId,
        role: dto.role,
        content: dto.content,
        timestamp: now,
        metadata: dto.metadata || {},
      };

      await messageRef.set(message);

      // Atualizar timestamp da conversa
      await this.db.collection('conversations').doc(dto.conversationId).update({
        lastMessageAt: now,
        updatedAt: now,
      });

      this.logger.debug(
        `Mensagem adicionada: ${messageId} à conversa: ${dto.conversationId}`,
      );
      return message;
    } catch (error) {
      this.logger.error('Erro ao adicionar mensagem:', error);
      throw new Error(`${CHATBOT_ERRORS.DATABASE_ERROR}: ${error.message}`);
    }
  }

  async getRecentMessages(
    conversationId: string,
    limit: number = CHATBOT_CONSTANTS.MAX_CONVERSATION_HISTORY,
  ): Promise<MessageEntity[]> {
    try {
      // Adicionar tratamento para erro de índice
      const query = this.db
        .collection('messages')
        .where('conversationId', '==', conversationId)
        .orderBy('timestamp', 'desc')
        .limit(limit);

      const snapshot = await query.get();

      return snapshot.docs
        .map((doc) => doc.data() as MessageEntity)
        .sort((a, b) => a.timestamp.toMillis() - b.timestamp.toMillis());
    } catch (error) {
      // Fallback: se o índice não existir, buscar sem ordenação e ordenar localmente
      if (error.code === 9) {
        // FAILED_PRECONDITION
        this.logger.warn(
          `Índice não encontrado para mensagens da conversa ${conversationId}. Usando fallback.`,
        );

        const snapshot = await this.db
          .collection('messages')
          .where('conversationId', '==', conversationId)
          .get();

        const messages = snapshot.docs
          .map((doc) => doc.data() as MessageEntity)
          .sort((a, b) => a.timestamp.toMillis() - b.timestamp.toMillis());

        // Retornar apenas os últimos N mensagens
        return messages.slice(-limit);
      }

      this.logger.error(
        `Erro ao buscar mensagens da conversa ${conversationId}:`,
        error,
      );
      throw new Error(`${CHATBOT_ERRORS.DATABASE_ERROR}: ${error.message}`);
    }
  }

  async updateConversationMetadata(
    conversationId: string,
    metadata: Record<string, any>,
  ): Promise<void> {
    try {
      await this.db.collection('conversations').doc(conversationId).update({
        metadata: metadata,
        updatedAt: Timestamp.now(),
      });
      this.logger.debug(`Metadata atualizada para conversa: ${conversationId}`);
    } catch (error) {
      this.logger.error(
        `Erro ao atualizar metadata da conversa ${conversationId}:`,
        error,
      );
      throw new Error(`${CHATBOT_ERRORS.DATABASE_ERROR}: ${error.message}`);
    }
  }

  async resetConversation(
    conversationId: string,
    userId: string,
  ): Promise<void> {
    try {
      // Verificar se a conversa pertence ao usuário
      const conversation = await this.getConversation(conversationId);
      if (!conversation || conversation.userId !== userId) {
        throw new Error(CHATBOT_ERRORS.CONVERSATION_NOT_FOUND);
      }

      // Deletar todas as mensagens da conversa
      const messagesSnapshot = await this.db
        .collection('messages')
        .where('conversationId', '==', conversationId)
        .get();

      const batch = this.db.batch();
      messagesSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();

      // Resetar metadata da conversa
      await this.db
        .collection('conversations')
        .doc(conversationId)
        .update({
          metadata: {
            context: {},
            language: 'pt-BR',
            version: '1.0',
          },
          updatedAt: Timestamp.now(),
        });

      this.logger.log(`Conversa resetada: ${conversationId}`);
    } catch (error) {
      this.logger.error(`Erro ao resetar conversa ${conversationId}:`, error);
      throw new Error(`${CHATBOT_ERRORS.DATABASE_ERROR}: ${error.message}`);
    }
  }

  async deleteConversation(
    conversationId: string,
    userId: string,
  ): Promise<void> {
    try {
      const conversation = await this.getConversation(conversationId);
      if (!conversation || conversation.userId !== userId) {
        throw new Error(CHATBOT_ERRORS.CONVERSATION_NOT_FOUND);
      }

      // Deletar mensagens
      const messagesSnapshot = await this.db
        .collection('messages')
        .where('conversationId', '==', conversationId)
        .get();

      const batch = this.db.batch();
      messagesSnapshot.docs.forEach((doc) => batch.delete(doc.ref));

      // Deletar conversa
      batch.delete(this.db.collection('conversations').doc(conversationId));

      await batch.commit();

      this.logger.log(`Conversa deletada: ${conversationId}`);
    } catch (error) {
      this.logger.error(`Erro ao deletar conversa ${conversationId}:`, error);
      throw new Error(`${CHATBOT_ERRORS.DATABASE_ERROR}: ${error.message}`);
    }
  }
}
