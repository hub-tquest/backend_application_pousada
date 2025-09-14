import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { HealthController } from './health.controller';
import { FirebaseHealthIndicator } from './indicators/firebase.health';
import { DatabaseHealthIndicator } from './indicators/database.health';
import { ExternalServicesHealthIndicator } from './indicators/external-services.health';
import { FirebaseModule } from '../shared/firebase/firebase.module';

@Module({
  imports: [TerminusModule, HttpModule, FirebaseModule],
  controllers: [HealthController],
  providers: [
    FirebaseHealthIndicator,
    DatabaseHealthIndicator,
    ExternalServicesHealthIndicator,
  ],
})
export class HealthModule {}
