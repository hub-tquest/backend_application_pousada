import { plainToInstance } from 'class-transformer';
import { IsString, validateSync } from 'class-validator';

class EnvironmentVariables {
  // ... variáveis existentes ...

  @IsString()
  GROQ_API_KEY: string;

  @IsString()
  GROQ_MODEL: string;

  @IsString()
  GROQ_TEMPERATURE: string;

  @IsString()
  CHATBOT_MAX_TOKENS: string;

  @IsString()
  CHATBOT_SYSTEM_PROMPT: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}
