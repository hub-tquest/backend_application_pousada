// test/chatbot/integration/chatbot.integration.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ChatbotService } from '../../../src/chatbot/services/chatbot.service';
import { AiGroqService } from '../../../src/chatbot/services/ai-groq.service';
import { ConversationService } from '../../../src/chatbot/services/conversation.service';
import { FirebaseService } from '../../../src/shared/firebase/firebase.service';
import { HttpModule, HttpService } from '@nestjs/axios'; // Importar HttpModule e HttpService
import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { ConfigService } from '@nestjs/config';

// Mock do Firebase
const mockFirestore = {
  collection: jest.fn().mockReturnThis(),
  doc: jest.fn().mockReturnThis(),
  set: jest.fn().mockResolvedValue(undefined),
  get: jest.fn().mockResolvedValue({
    exists: true,
    data: jest.fn().mockReturnValue({
      id: 'test-conversation-id',
      userId: 'test-user-id',
      title: 'Test Conversation',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      isActive: true,
      metadata: {},
    }),
  }),
  update: jest.fn().mockResolvedValue(undefined),
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  batch: jest.fn().mockReturnValue({
    delete: jest.fn(),
    update: jest.fn(),
    set: jest.fn(),
    commit: jest.fn().mockResolvedValue(undefined),
  }),
};

const mockFirebaseService = {
  getFirestore: jest.fn().mockReturnValue(mockFirestore),
  getUserById: jest.fn().mockResolvedValue({
    uid: 'test-user-id',
    email: 'test@example.com',
    displayName: 'Test User',
  }),
};

describe('Chatbot Integration', () => {
  let chatbotService: ChatbotService;
  let aiService: AiGroqService;
  let conversationService: ConversationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule], // Importar HttpModule
      providers: [
        ChatbotService,
        {
          provide: AiGroqService,
          useValue: {
            sendMessage: jest.fn().mockResolvedValue({
              content: 'Resposta de teste da IA',
              usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
            }),
          },
        },
        {
          provide: ConversationService,
          useValue: {
            getOrCreateConversation: jest.fn().mockResolvedValue({
              id: 'test-conversation-id',
              userId: 'test-user-id',
              messages: [],
            }),
            addMessage: jest.fn().mockResolvedValue({
              id: 'msg-1',
              conversationId: 'test-conversation-id',
              role: 'user',
              content: 'Test message',
              timestamp: Timestamp.now(),
            }),
            getRecentMessages: jest.fn().mockResolvedValue([]),
            resetConversation: jest.fn().mockResolvedValue(undefined),
            getConversation: jest.fn().mockResolvedValue({
              id: 'test-conversation-id',
              userId: 'test-user-id',
              title: 'Test Conversation',
              createdAt: Timestamp.now(),
              updatedAt: Timestamp.now(),
              messages: [],
            }),
          },
        },
        {
          provide: FirebaseService,
          useValue: mockFirebaseService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('http://localhost:3000'),
          },
        },
        // HttpService será fornecido automaticamente pelo HttpModule
      ],
    }).compile();

    chatbotService = module.get<ChatbotService>(ChatbotService);
    aiService = module.get<AiGroqService>(AiGroqService);
    conversationService = module.get<ConversationService>(ConversationService);
    // HttpService também pode ser obtido se necessário: httpService = module.get<HttpService>(HttpService);
  });

  it('should be defined', () => {
    expect(chatbotService).toBeDefined();
  });

  it('should process message successfully', async () => {
    const result = await chatbotService.processMessage(
      'Olá, como posso ajudar?',
      'test-user-id',
    );

    expect(result).toBeDefined();
    expect(result.conversationId).toBe('test-conversation-id');
    expect(result.response).toBe('Resposta de teste da IA');
    expect(result.usage).toBeDefined();
  });

  it('should throw error for empty message', async () => {
    await expect(
      chatbotService.processMessage('', 'test-user-id'),
    ).rejects.toThrow('Erro ao processar mensagem: Mensagem inválida');
  });

  it('should reset conversation successfully', async () => {
    const result = await chatbotService.resetConversation(
      'test-conversation-id',
      'test-user-id',
    );
    expect(result).toEqual({
      success: true,
      message: 'Conversa resetada com sucesso',
    });
  });

  it('should get conversation history', async () => {
    const result = await chatbotService.getConversationHistory(
      'test-conversation-id',
      'test-user-id',
    );
    expect(result).toBeDefined();
    expect(result.conversationId).toBe('test-conversation-id');
  });
});
