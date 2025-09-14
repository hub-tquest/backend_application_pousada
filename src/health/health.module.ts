import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { HealthController } from './health.controller';
import { HealthService } from '../../src/health/health.service';
import { FirebaseHealthIndicator } from '../../src/health/indicators/firebase.health';
import { DatabaseHealthIndicator } from '../../src/health/indicators/database.health';
import { ExternalServicesHealthIndicator } from '../../src/health/indicators/external-services.health';
import { FirebaseModule } from '../shared/firebase/firebase.module';

@Module({
  imports: [TerminusModule, HttpModule, FirebaseModule],
  controllers: [HealthController],
  providers: [
    HealthService,
    FirebaseHealthIndicator,
    DatabaseHealthIndicator,
    ExternalServicesHealthIndicator,
  ],
  exports: [HealthService],
})
export class HealthModule {}
