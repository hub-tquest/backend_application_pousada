//src/chatbot/interfaces/ai-service.interface.ts
export interface AiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AiResponse {
  content: string;
  finishReason?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface IAiService {
  sendMessage(messages: AiMessage[]): Promise<AiResponse>;
  getModelInfo(): { name: string; version: string };
}
