import { ConversationEntity } from '../entities/conversation.entity';
import { MessageEntity } from '../entities/message.entity';

export interface CreateConversationDto {
  userId: string;
  title?: string;
  initialContext?: Record<string, any>;
}

export interface AddMessageDto {
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Record<string, any>;
}

export interface ConversationWithMessages extends ConversationEntity {
  messages: MessageEntity[];
}

export interface IConversationService {
  createConversation(dto: CreateConversationDto): Promise<ConversationEntity>;
  getConversation(
    conversationId: string,
  ): Promise<ConversationWithMessages | null>;
  getOrCreateConversation(
    userId: string,
    conversationId?: string,
  ): Promise<ConversationWithMessages>;
  addMessage(dto: AddMessageDto): Promise<MessageEntity>;
  getRecentMessages(
    conversationId: string,
    limit?: number,
  ): Promise<MessageEntity[]>;
  updateConversationMetadata(
    conversationId: string,
    metadata: Record<string, any>,
  ): Promise<void>;
  resetConversation(conversationId: string, userId: string): Promise<void>;
  deleteConversation(conversationId: string, userId: string): Promise<void>;
}
