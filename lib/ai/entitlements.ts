import type { UserType } from '@/app/(auth)/auth';
import type { ChatModel } from './models';

interface Entitlements {
  maxMessagesPerDay: number;
  availableChatModelIds: Array<ChatModel['id']>;
}

export const entitlementsByUserType: Record<UserType, Entitlements> = {
  /*
   * For users without an account
   */
  guest: {
    maxMessagesPerDay: 20,
    availableChatModelIds: [
      'chat-model', 
      'chat-model-reasoning',
      'chatgpt-4o-latest',
      'gpt-4.1-2025-04-14',
      'o3-2025-04-16',
      'claude-4-sonnet',
      'claude-3.7-sonnet'
    ],
  },

  /*
   * For users with an account
   */
  regular: {
    maxMessagesPerDay: 100,
    availableChatModelIds: [
      'chat-model', 
      'chat-model-reasoning',
      'chatgpt-4o-latest',
      'gpt-4.1-2025-04-14',
      'o3-2025-04-16',
      'claude-4-sonnet',
      'claude-3.7-sonnet'
    ],
  },

  /*
   * TODO: For users with an account and a paid membership
   */
};
