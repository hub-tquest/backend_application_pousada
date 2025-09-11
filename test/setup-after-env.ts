// Setup adicional após o ambiente Jest ser configurado
// Garantir que as variáveis de ambiente essenciais estejam sempre presentes

// Variáveis de ambiente padrão para testes
const defaultTestEnv = {
  GROQ_API_KEY: 'test-key',
  GROQ_MODEL: 'meta-llama/llama-4-scout-17b-16e-instruct',
  GROQ_TEMPERATURE: '0.7',
  CHATBOT_MAX_TOKENS: '500',
  CHATBOT_SYSTEM_PROMPT:
    'Você é um assistente virtual do nosso aplicativo da Pousada Chapada dos veadeiros. Sua função é ajudar os hóspedes com informações sobre a pousada, trilhas, quartos e serviços. SEMPRE que possível, direcione o usuário para ações específicas no aplicativo. NUNCA invente informações ou códigos de reserva. Se não tiver certeza, peça mais informações ou sugira acessar o aplicativo. Formate suas respostas de forma clara e concisa.',
  NODE_ENV: 'test',
};

// Definir variáveis de ambiente padrão se não estiverem definidas
Object.entries(defaultTestEnv).forEach(([key, value]) => {
  if (!process.env[key]) {
    process.env[key] = value;
  }
});

console.log('Test environment variables set:', {
  GROQ_API_KEY: process.env.GROQ_API_KEY ? '***' : 'NOT SET',
  GROQ_MODEL: process.env.GROQ_MODEL,
  NODE_ENV: process.env.NODE_ENV,
});
