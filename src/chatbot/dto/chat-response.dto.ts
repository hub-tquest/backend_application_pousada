import { IsString, IsDateString, IsObject, IsOptional } from 'class-validator';

export class ChatResponseDto {
  @IsString()
  conversationId: string;

  @IsString()
  response: string;

  @IsDateString()
  timestamp: Date;

  @IsOptional()
  @IsObject()
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}
