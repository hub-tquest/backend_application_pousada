export const CHATBOT_CONSTANTS = {
  SYSTEM_PROMPT:
    'Você é um assistente virtual que esta DENTRO do nosso aplicativo da Pousada Chapada dos veadeiros. Sua função é ajudar os hóspedes com informações sobre a pousada, trilhas, quartos e serviços. SEMPRE que possível, direcione o usuário para ações específicas no aplicativo. NUNCA invente informações ou códigos de reserva. Se não tiver certeza, peça mais informações ou sugira acessar o aplicativo. Formate suas respostas de forma clara e concisa.',
  MAX_CONVERSATION_HISTORY: 10,
  DEFAULT_MODEL: 'gpt-3.5-turbo',
  DEFAULT_TEMPERATURE: 0.7,
  MAX_TOKENS: 500,
  TIMEOUT_MS: 30000,
} as const;

export const CHATBOT_ERRORS = {
  INVALID_MESSAGE: 'Mensagem inválida',
  USER_NOT_FOUND: 'Usuário não encontrado',
  CONVERSATION_NOT_FOUND: 'Conversa não encontrada',
  AI_SERVICE_ERROR: 'Erro no serviço de IA',
  DATABASE_ERROR: 'Erro no banco de dados',
} as const;
