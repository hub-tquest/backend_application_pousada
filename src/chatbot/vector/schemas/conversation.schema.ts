// src/chatbot/vector/schemas/conversation.schema.ts
export interface MessageVectorSchema {
  id: string;
  vector: number[];
  payload: {
    conversationId: string;
    userId: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    intent?: string;
    entities?: Record<string, any>;
    sentiment?: number; // -1 (negativo) a 1 (positivo)
    topics?: string[];
    contextSummary?: string;
  };
}

export interface KnowledgeVectorSchema {
  id: string;
  vector: number[];
  payload: {
    type: 'faq' | 'policy' | 'service' | 'room' | 'general';
    title: string;
    content: string;
    category: string;
    tags: string[];
    source: string;
    lastUpdated: Date;
    relevanceScore: number;
  };
}

export interface UserProfileVectorSchema {
  id: string;
  vector: number[];
  payload: {
    userId: string;
    preferences: string[];
    interactionHistory: {
      intent: string;
      frequency: number;
      lastInteraction: Date;
    }[];
    satisfactionScore?: number;
    communicationStyle?: 'formal' | 'casual' | 'direct';
    languagePreferences?: string[];
    topicInterests?: string[];
  };
}
