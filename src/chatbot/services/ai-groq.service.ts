import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import {
  IAiService,
  AiMessage,
  AiResponse,
} from '../interfaces/ai-service.interface';

@Injectable()
export class AiGroqService implements IAiService {
  // Adicionar implements
  private readonly apiKey: string;
  private readonly model: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get('GROQ_API_KEY');
    if (!this.apiKey) {
      throw new Error('GROQ_API_KEY não configurada'); // Corrigir mensagem
    }
    this.model =
      this.configService.get('GROQ_MODEL') ||
      'meta-llama/llama-4-scout-17b-16e-instruct';
  }

  async sendMessage(messages: AiMessage[]): Promise<AiResponse> {
    // Tipar corretamente
    try {
      const response = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: this.model,
          messages: [
            {
              role: 'system',
              content:
                this.configService.get('CHATBOT_SYSTEM_PROMPT') ||
                'Você é um assistente virtual que esta DENTRO do nosso aplicativo da Pousada Chapada dos veadeiros. Sua função é ajudar os hóspedes com informações sobre a pousada, trilhas, quartos e serviços. SEMPRE que possível, direcione o usuário para ações específicas no aplicativo. NUNCA invente informações ou códigos de reserva. Se não tiver certeza, peça mais informações ou sugira acessar o aplicativo. Formate suas respostas de forma clara e concisa.',
            },
            ...messages,
          ],
          temperature: parseFloat(
            this.configService.get('GROQ_TEMPERATURE') || '0.7',
          ),
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return {
        content: response.data.choices[0].message.content,
        usage: {
          promptTokens: response.data.usage?.prompt_tokens || 0,
          completionTokens: response.data.usage?.completion_tokens || 0,
          totalTokens: response.data.usage?.total_tokens || 0,
        },
      };
    } catch (error) {
      throw new Error(`Erro na comunicação com Groq API: ${error.message}`);
    }
  }

  // IMPLEMENTAR O MÉTODO FALTANTE
  getModelInfo(): { name: string; version: string } {
    return {
      name: 'Groq',
      version: this.model,
    };
  }
}
