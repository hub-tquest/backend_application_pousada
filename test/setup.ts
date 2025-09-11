// Setup file for tests
import * as dotenv from 'dotenv';
import * as path from 'path';

// Carregar variáveis de ambiente de teste
const envPath = path.resolve(process.cwd(), '.env.test');
console.log(`Loading env from: ${envPath}`);
dotenv.config({ path: envPath });

// Mock para OpenAI
jest.mock('openai', () => {
  return {
    default: jest.fn().mockImplementation(() => {
      return {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [
                {
                  message: { content: 'Resposta de teste' },
                  finish_reason: 'stop',
                },
              ],
              usage: {
                prompt_tokens: 10,
                completion_tokens: 5,
                total_tokens: 15,
              },
            }),
          },
        },
      };
    }),
  };
});

// Mock para firebase-admin
jest.mock('firebase-admin', () => {
  return {
    apps: [],
    initializeApp: jest.fn(),
    auth: jest.fn().mockReturnValue({
      getUser: jest.fn(),
      getUserByEmail: jest.fn(),
    }),
    firestore: jest.fn().mockReturnValue({
      settings: jest.fn(),
      collection: jest.fn().mockReturnThis(),
      doc: jest.fn().mockReturnThis(),
      set: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: jest.fn().mockReturnValue({
          id: 'test-id',
          userId: 'test-user-id',
        }),
      }),
      update: jest.fn().mockResolvedValue(undefined),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
    }),
    storage: jest.fn(),
  };
});
