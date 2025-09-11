import { Test, TestingModule } from '@nestjs/testing';
import { ConversationService } from '../../../src/chatbot/services/conversation.service';
import { FirebaseService } from '../../../src/shared/firebase/firebase.service';
import { Timestamp } from 'firebase-admin/firestore';

describe('ConversationService', () => {
  let service: ConversationService;
  let firebaseService: jest.Mocked<FirebaseService>;

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationService,
        {
          provide: FirebaseService,
          useValue: {
            getFirestore: jest.fn().mockReturnValue(mockFirestore),
          },
        },
      ],
    }).compile();

    service = module.get<ConversationService>(ConversationService);
    firebaseService = module.get(FirebaseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createConversation', () => {
    it('should create a new conversation', async () => {
      const result = await service.createConversation({
        userId: 'test-user-id',
        title: 'Test Conversation',
      });

      expect(result).toBeDefined();
      expect(result.userId).toBe('test-user-id');
      expect(result.title).toBe('Test Conversation');
      expect(result.isActive).toBe(true);
    });
  });
});
