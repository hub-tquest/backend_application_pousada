import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { BookingModule } from '../../src/booking/booking.module';
import { FirebaseModule } from '../../src/shared/firebase/firebase.module';

describe('BookingController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [BookingModule, FirebaseModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/booking (POST)', () => {
    return request(app.getHttpServer())
      .post('/booking')
      .set('Authorization', 'Bearer test-token')
      .send({
        roomId: 'test-room',
        checkIn: '2024-05-15T14:00:00.000Z',
        checkOut: '2024-05-18T10:00:00.000Z',
        numberOfRooms: 1,
        isBreakfastIncluded: true,
        numberOfGuests: 2,
        totalPrice: 600.0,
        roomType: 'Standard',
      })
      .expect(401); // Deve falhar por falta de autenticação válida
  });

  afterEach(async () => {
    await app.close();
  });
});
