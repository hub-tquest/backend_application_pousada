// test/chatbot/services/ai-groq.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AiGroqService } from '../../../src/chatbot/services/ai-groq.service';
import { ConfigService } from '@nestjs/config';

describe('AiGroqService', () => {
  let service: AiGroqService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiGroqService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'GROQ_API_KEY') return 'test-api-key';
              if (key === 'GROQ_MODEL')
                return 'meta-llama/llama-4-scout-17b-16e-instruct';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AiGroqService>(AiGroqService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have correct model info', () => {
    const modelInfo = service.getModelInfo();
    expect(modelInfo.name).toBe('Groq');
    expect(modelInfo.version).toBe('meta-llama/llama-4-scout-17b-16e-instruct');
  });

  // Este teste precisa ser modificado para não instanciar o serviço diretamente
  // durante a criação do módulo de teste, pois isso causará o erro antes
  // mesmo do teste ser executado.
  describe('constructor', () => {
    it('should throw error when API key is not configured', async () => {
      // Criamos um módulo de teste separado apenas para este caso específico
      const createModuleWithoutApiKey = () =>
        Test.createTestingModule({
          providers: [
            AiGroqService,
            {
              provide: ConfigService,
              useValue: {
                get: jest.fn((key: string) => {
                  if (key === 'GROQ_API_KEY') return undefined; // Simula chave não configurada
                  if (key === 'GROQ_MODEL')
                    return 'meta-llama/llama-4-scout-17b-16e-instruct';
                  return undefined;
                }),
              },
            },
          ],
        }).compile();

      // Esperamos que a criação do módulo falhe
      await expect(createModuleWithoutApiKey()).rejects.toThrow(
        'GROQ_API_KEY não configurada',
      );
    });
  });
});
