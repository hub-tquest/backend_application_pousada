// src/chatbot/entities/conversation.entity.ts
import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * @fileoverview Entidade que representa uma conversa no chatbot.
 *
 * Esta entidade define a estrutura de uma conversa entre usuário e chatbot,
 * incluindo metadados para contexto, preferências e gerenciamento de estado.
 *
 * @author Pousada Chapada Backend Team
 * @since 2025
 */

/**
 * Interface que define os metadados de uma conversa.
 * Contém informações contextuais e de configuração da conversa.
 */
export interface ConversationMetadata {
  /** Contexto da conversa para manter histórico semântico */
  context?: Record<string, any>;

  /** Preferências do usuário para personalização */
  preferences?: Record<string, any>;

  /** Idioma da conversa (padrão: pt-BR) */
  language?: string;

  /** Versão do schema da conversa para migrações */
  version?: string;

  /** Categoria principal da conversa (ex: booking, general, support) */
  category?: string;

  /** Nível de complexidade da conversa */
  complexity?: 'simple' | 'moderate' | 'complex';

  /** Indica se a conversa envolve intenções de reserva */
  hasBookingIntent?: boolean;
}

/**
 * Interface que define uma mensagem dentro da conversa.
 * Representa uma troca individual entre usuário e assistente.
 */
export interface ConversationMessage {
  /** Identificador único da mensagem */
  id: string;

  /** Papel do remetente da mensagem */
  role: 'user' | 'assistant' | 'system';

  /** Conteúdo textual da mensagem */
  content: string;

  /** Timestamp de quando a mensagem foi criada */
  timestamp: Timestamp;

  /** Metadados adicionais da mensagem */
  metadata?: {
    /** Tipo de conteúdo da mensagem */
    contentType?: 'text' | 'suggestion' | 'button' | 'image';

    /** Intenção identificada na mensagem */
    intent?: string;

    /** Entidades extraídas da mensagem */
    entities?: Record<string, any>;

    /** Sentimento detectado (-1 negativo, 0 neutro, 1 positivo) */
    sentiment?: number;

    /** Tópicos identificados na mensagem */
    topics?: string[];
  };
}

/**
 * Entidade principal que representa uma conversa no chatbot.
 *
 * Armazena todo o contexto de uma interação entre usuário e assistente,
 * incluindo histórico de mensagens, metadados e estado da conversa.
 *
 * @example
 * ```typescript
 * const conversation: ConversationEntity = {
 *   id: 'conv_123',
 *   userId: 'user_456',
 *   title: 'Consulta sobre reservas',
 *   createdAt: Timestamp.now(),
 *   updatedAt: Timestamp.now(),
 *   isActive: true,
 *   metadata: {
 *     language: 'pt-BR',
 *     category: 'booking',
 *     hasBookingIntent: true
 *   }
 * };
 * ```
 */
export interface ConversationEntity {
  /** Identificador único da conversa */
  id: string;

  /** Identificador do usuário proprietário da conversa */
  userId: string;

  /** Título descritivo da conversa */
  title: string;

  /** Timestamp de criação da conversa */
  createdAt: Timestamp;

  /** Timestamp da última atualização da conversa */
  updatedAt: Timestamp;

  /** Timestamp da última mensagem enviada na conversa */
  lastMessageAt?: Timestamp;

  /** Indica se a conversa está ativa */
  isActive: boolean;

  /** Lista de mensagens na conversa */
  messages: ConversationMessage[];

  /** Metadados da conversa para contexto e configuração */
  metadata: ConversationMetadata;
}

/**
 * DTO para criação de uma nova conversa.
 * Contém apenas os campos necessários para criar uma conversa.
 */
export interface CreateConversationDto {
  /** Identificador do usuário proprietário da conversa */
  userId: string;

  /** Título da conversa (opcional, será gerado automaticamente se não fornecido) */
  title?: string;

  /** Metadados iniciais da conversa */
  metadata?: Partial<ConversationMetadata>;
}

/**
 * DTO para atualização de uma conversa existente.
 * Contém apenas os campos que podem ser atualizados.
 */
export interface UpdateConversationDto {
  /** Novo título da conversa */
  title?: string;

  /** Indica se a conversa está ativa */
  isActive?: boolean;

  /** Metadados atualizados da conversa */
  metadata?: Partial<ConversationMetadata>;
}

/**
 * DTO para adicionar uma mensagem a uma conversa.
 */
export interface AddMessageDto {
  /** Identificador da conversa */
  conversationId: string;

  /** Papel do remetente */
  role: 'user' | 'assistant' | 'system';

  /** Conteúdo da mensagem */
  content: string;

  /** Metadados da mensagem */
  metadata?: ConversationMessage['metadata'];
}
