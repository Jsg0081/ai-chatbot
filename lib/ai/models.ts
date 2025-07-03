export const DEFAULT_CHAT_MODEL: string = 'chatgpt-4o-latest';

export interface ChatModel {
  id: string;
  name: string;
  description: string;
}

export const chatModels: Array<ChatModel> = [
  {
    id: 'chat-model',
    name: 'Grok 2 Vision',
    description: 'Fast reasoning with vision capabilities',
  },
  {
    id: 'chat-model-reasoning',
    name: 'Grok 3 Mini',
    description: 'Advanced reasoning and analysis',
  },
  {
    id: 'chatgpt-4o-latest',
    name: 'gpt-4o',
    description: 'Fast, intelligent, flexible GPT model',
  },
  {
    id: 'gpt-4.1-2025-04-14',
    name: 'gpt-4.1',
    description: 'Flagship model for complex tasks',
  },
  {
    id: 'o3-2025-04-16',
    name: 'gpt-o3',
    description: 'Our most powerful reasoning model',
  },
  {
    id: 'claude-4-sonnet',
    name: 'claude-4-sonnet',
    description: 'Advanced reasoning with vision capabilities',
  },
  {
    id: 'claude-3.7-sonnet',
    name: 'claude-3.7-sonnet',
    description: 'Fast, intelligent, and cost-effective',
  },
];
