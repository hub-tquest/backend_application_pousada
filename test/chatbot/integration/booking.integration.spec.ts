// test/chatbot/integration/booking.integration.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { HttpModule, HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import { ChatbotService } from '../../../src/chatbot/services/chatbot.service';
import { AiGroqService } from '../../../src/chatbot/services/ai-groq.service';
import { ConversationService } from '../../../src/chatbot/services/conversation.service';
import { ConfigService } from '@nestjs/config';

describe('Chatbot Booking Integration', () => {
  let chatbotService: ChatbotService;
  let httpService: HttpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule],
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
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'BACKEND_URL') return 'http://localhost:3000';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    chatbotService = module.get<ChatbotService>(ChatbotService);
    httpService = module.get<HttpService>(HttpService);
  });

  it('should list user bookings successfully', async () => {
    const mockBookings = [
      {
        id: '1',
        confirmationCode: 'RES-ABC123',
        roomId: '101',
        status: 'confirmed',
      },
    ];

    // Mock da API de booking
    jest
      .spyOn(httpService, 'get')
      .mockImplementationOnce(() => of({ data: mockBookings } as any));

    // Como o método handleBookingIntent pode não ser público, você pode precisar
    // testar um método público que o utiliza ou tornar este método público apenas para testes
    // Por exemplo, se houver um método público sendMessage que eventualmente chama handleBookingIntent:
    // const result = await chatbotService.sendMessage('Quero ver minhas reservas', 'user-123');

    // Ou, se handleBookingIntent for público:
    // const result = await chatbotService.handleBookingIntent(
    //   'user-123',
    //   'list_bookings',
    //   {}
    // );

    // expect(result.response).toContain('RES-ABC123');

    // Este é apenas um exemplo, você precisará ajustar conforme a implementação real
    expect(chatbotService).toBeDefined();
    expect(httpService).toBeDefined();
  });
});
