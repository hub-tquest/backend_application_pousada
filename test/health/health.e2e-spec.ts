import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { HealthModule } from '../../src/health/health.module';
import { FirebaseModule } from '../../src/shared/firebase/firebase.module';

describe('HealthController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [HealthModule, FirebaseModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/health (GET) - should return health status', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('status');
        expect(res.body.status).toBe('ok');
      });
  });

  it('/health/simple (GET) - should return simple health status', () => {
    return request(app.getHttpServer())
      .get('/health/simple')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('status', 'healthy');
        expect(res.body).toHaveProperty('timestamp');
        expect(res.body).toHaveProperty('uptime');
      });
  });

  it('/health/database (GET) - should check database health', () => {
    return request(app.getHttpServer()).get('/health/database').expect(200);
  });

  it('/health/external (GET) - should check external services health', () => {
    return request(app.getHttpServer()).get('/health/external').expect(200);
  });

  afterAll(async () => {
    await app.close();
  });
});
