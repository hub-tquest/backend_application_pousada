import { plainToInstance } from 'class-transformer';
import {
  IsString,
  IsEnum,
  IsUrl,
  IsInt,
  IsOptional,
  validateSync,
} from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV?: Environment;

  @IsInt()
  @IsOptional()
  PORT?: number;

  @IsString()
  @IsOptional()
  CORS_ORIGINS?: string;

  // Firebase Configuration
  @IsString()
  FIREBASE_PROJECT_ID: string;

  @IsString()
  FIREBASE_PRIVATE_KEY_ID: string;

  @IsString()
  FIREBASE_PRIVATE_KEY: string;

  @IsString()
  FIREBASE_CLIENT_EMAIL: string;

  @IsString()
  FIREBASE_CLIENT_ID: string;

  @IsUrl()
  FIREBASE_AUTH_URI: string;

  @IsUrl()
  FIREBASE_TOKEN_URI: string;

  @IsUrl()
  FIREBASE_AUTH_PROVIDER_X509_CERT_URL: string;

  @IsUrl()
  FIREBASE_CLIENT_X509_CERT_URL: string;

  // Mercado Pago Configuration
  @IsString()
  MERCADOPAGO_ACCESS_TOKEN: string;

  @IsUrl()
  @IsOptional()
  FRONTEND_URL?: string;

  @IsUrl()
  @IsOptional()
  BACKEND_URL?: string;

  // Groq AI Configuration
  @IsString()
  GROQ_API_KEY: string;

  @IsString()
  @IsOptional()
  GROQ_MODEL?: string;

  @IsString()
  @IsOptional()
  GROQ_TEMPERATURE?: string;

  @IsString()
  @IsOptional()
  CHATBOT_MAX_TOKENS?: string;

  @IsString()
  @IsOptional()
  CHATBOT_SYSTEM_PROMPT?: string;

  // Qdrant Configuration
  @IsUrl()
  @IsOptional()
  QDRANT_URL?: string;

  @IsString()
  @IsOptional()
  QDRANT_API_KEY?: string;

  // JWT Configuration
  @IsString()
  @IsOptional()
  JWT_SECRET?: string;

  @IsString()
  @IsOptional()
  JWT_EXPIRES_IN?: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(
      errors
        .map((error) => Object.values(error.constraints || {}).join(', '))
        .join(', '),
    );
  }

  return validatedConfig;
}
