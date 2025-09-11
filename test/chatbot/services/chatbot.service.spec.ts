// test/chatbot/services/chatbot.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ChatbotService } from '../../../src/chatbot/services/chatbot.service';
import { AiGroqService } from '../../../src/chatbot/services/ai-groq.service';
import { ConversationService } from '../../../src/chatbot/services/conversation.service';
import { HttpService } from '@nestjs/axios'; // Import HttpService
import { ConfigService } from '@nestjs/config'; // Import ConfigService
// Se você estiver mockando HttpService com métodos específicos, pode precisar importar de 'rxjs'
// import { of, throwError } from 'rxjs';

describe('ChatbotService', () => {
  let service: ChatbotService;
  let aiService: jest.Mocked<AiGroqService>;
  let conversationService: jest.Mocked<ConversationService>;
  // Declare o HttpService mockado se for usá-lo diretamente nos testes
  // let httpService: jest.Mocked<HttpService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      // Importe o HttpModule para que o HttpService esteja disponível
      // Se você quiser mockar completamente o HttpService, você pode usar providers em vez de importar HttpModule
      // Para este exemplo, vamos mockar o HttpService diretamente
      providers: [
        ChatbotService,
        {
          provide: AiGroqService,
          useValue: {
            sendMessage: jest.fn(),
          },
        },
        {
          provide: ConversationService,
          useValue: {
            getOrCreateConversation: jest.fn(),
            addMessage: jest.fn(),
            getRecentMessages: jest.fn(),
            resetConversation: jest.fn(),
            getConversation: jest.fn(),
          },
        },
        // Mock do HttpService
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(), // Mock dos métodos que você usa
            post: jest.fn(),
            delete: jest.fn(),
            // Adicione outros métodos conforme necessário
          },
        },
        // Mock do ConfigService
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              // Forneça valores mockados para as variáveis de ambiente que você usa
              if (key === 'BACKEND_URL') {
                return 'http://localhost:3000'; // ou o valor esperado para testes
              }
              // Retorne valores padrão ou null para outras chaves
              return null;
            }),
          },
        },
      ],
      // Se você preferir importar o HttpModule real (menos comum em testes unitários)
      // imports: [HttpModule],
    }).compile();

    service = module.get<ChatbotService>(ChatbotService);
    aiService = module.get(AiGroqService);
    conversationService = module.get(ConversationService);
    // httpService = module.get(HttpService); // Se você precisar usar o mock diretamente
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processMessage', () => {
    it('should process a message and return response', async () => {
      const mockConversation: any = {
        id: 'test-conversation-id',
        userId: 'test-user-id',
        messages: [],
      };

      const mockAiResponse = {
        content: 'Resposta de teste',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      };

      (
        conversationService.getOrCreateConversation as jest.Mock
      ).mockResolvedValue(mockConversation);
      (conversationService.getRecentMessages as jest.Mock).mockResolvedValue(
        [],
      );
      (aiService.sendMessage as jest.Mock).mockResolvedValue(mockAiResponse);
      // Mock da função extractBookingIntent para não acionar a integração com booking
      jest.spyOn(service as any, 'extractBookingIntent').mockReturnValue(null);

      const result = await service.processMessage(
        'Olá, como posso ajudar?',
        'test-user-id',
      );

      expect(result).toEqual({
        conversationId: 'test-conversation-id',
        response: 'Resposta de teste',
        timestamp: expect.any(Date),
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      });
    });

    it('should throw error for empty message', async () => {
      await expect(service.processMessage('', 'test-user-id')).rejects.toThrow(
        'Erro ao processar mensagem: Mensagem inválida',
      );
    });

    // Exemplo de teste para erro do serviço de IA
    it('should handle AI service errors', async () => {
      const mockConversation: any = {
        id: 'test-conversation-id',
        userId: 'test-user-id',
        messages: [],
      };
      (
        conversationService.getOrCreateConversation as jest.Mock
      ).mockResolvedValue(mockConversation);
      (conversationService.getRecentMessages as jest.Mock).mockResolvedValue(
        [],
      );
      (aiService.sendMessage as jest.Mock).mockRejectedValue(
        new Error('AI Service Error'),
      );
      jest.spyOn(service as any, 'extractBookingIntent').mockReturnValue(null);

      await expect(
        service.processMessage('Olá', 'test-user-id'),
      ).rejects.toThrow('Erro ao processar mensagem: AI Service Error');
    });
  });

  describe('resetConversation', () => {
    it('should reset conversation successfully', async () => {
      (conversationService.resetConversation as jest.Mock).mockResolvedValue(
        undefined,
      );

      const result = await service.resetConversation(
        'test-conversation-id',
        'test-user-id',
      );

      expect(result).toEqual({
        success: true,
        message: 'Conversa resetada com sucesso',
      });
      expect(conversationService.resetConversation).toHaveBeenCalledWith(
        'test-conversation-id',
        'test-user-id',
      );
    });

    it('should handle reset errors', async () => {
      const errorMessage = 'Reset Error';
      (conversationService.resetConversation as jest.Mock).mockRejectedValue(
        new Error(errorMessage),
      );

      await expect(
        service.resetConversation('test-conversation-id', 'test-user-id'),
      ).rejects.toThrow(`Erro ao resetar conversa: ${errorMessage}`);
    });
  });

  describe('getConversationHistory', () => {
    const mockConversation: any = {
      id: 'test-conversation-id',
      userId: 'test-user-id',
      title: 'Test Conversation',
      createdAt: { toDate: () => new Date('2023-01-01T00:00:00Z') },
      lastMessageAt: { toDate: () => new Date('2023-01-01T01:00:00Z') },
      messages: [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Hello',
          timestamp: { toDate: () => new Date('2023-01-01T00:00:00Z') },
          metadata: {},
        },
      ],
    };

    it('should return conversation history', async () => {
      (conversationService.getConversation as jest.Mock).mockResolvedValue(
        mockConversation,
      );

      const result = await service.getConversationHistory(
        'test-conversation-id',
        'test-user-id',
      );

      expect(result).toBeDefined();
      expect(result.conversationId).toBe('test-conversation-id');
      expect(result.messages).toHaveLength(1);
      expect(conversationService.getConversation).toHaveBeenCalledWith(
        'test-conversation-id',
      );
    });

    it('should throw error when conversation not found', async () => {
      (conversationService.getConversation as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(
        service.getConversationHistory('non-existent-id', 'test-user-id'),
      ).rejects.toThrow('Erro ao buscar histórico: Conversa não encontrada');
    });

    it('should throw error when user not authorized', async () => {
      const unauthorizedConversation = {
        ...mockConversation,
        userId: 'different-user-id',
      };
      (conversationService.getConversation as jest.Mock).mockResolvedValue(
        unauthorizedConversation,
      );

      await expect(
        service.getConversationHistory('test-conversation-id', 'test-user-id'),
      ).rejects.toThrow('Erro ao buscar histórico: Acesso não autorizado');
    });
  });

  // Adicione testes para handleBookingIntent se necessário
  // describe('handleBookingIntent', () => { ... });
});
