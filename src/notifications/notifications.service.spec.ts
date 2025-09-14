import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { NotificationRepository } from './repositories/notification.repository';
import { FirebaseService } from '../shared/firebase/firebase.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let repository: jest.Mocked<NotificationRepository>;

  const mockNotification = {
    id: '1',
    userId: 'user-1',
    title: 'Test Notification',
    body: 'Test Body',
    type: 'general' as const,
    read: false,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: NotificationRepository,
          useValue: {
            create: jest.fn().mockResolvedValue(mockNotification),
            findByUserId: jest.fn().mockResolvedValue([mockNotification]),
            markAsRead: jest.fn().mockResolvedValue(undefined),
            delete: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: FirebaseService,
          useValue: {
            db: {
              collection: jest.fn().mockReturnThis(),
              doc: jest.fn().mockReturnThis(),
              get: jest.fn().mockResolvedValue({
                exists: true,
                data: jest.fn().mockReturnValue({ fcmToken: 'test-token' }),
              }),
            },
            sendMessage: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    repository = module.get(NotificationRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createNotification', () => {
    it('should create a notification', async () => {
      const createDto = {
        userId: 'user-1',
        title: 'Test',
        body: 'Test Body',
        type: 'general' as const,
      };

      const result = await service.createNotification(createDto);
      expect(result).toEqual(mockNotification);
      expect(repository.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('getUserNotifications', () => {
    it('should return user notifications', async () => {
      const result = await service.getUserNotifications('user-1');
      expect(result).toEqual([mockNotification]);
      expect(repository.findByUserId).toHaveBeenCalledWith('user-1', undefined);
    });
  });
});
