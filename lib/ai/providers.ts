import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from 'ai';
import { xai } from '@ai-sdk/xai';
import { openai } from '@ai-sdk/openai';
import { isTestEnvironment } from '../constants';
import {
  artifactModel,
  chatModel,
  reasoningModel,
  titleModel,
} from './models.test';
import { anthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

export const myProvider = isTestEnvironment
  ? {
      languageModel: (modelId: string) => {
        switch (modelId) {
          case 'chat-model':
            return chatModel;
          case 'chat-model-reasoning':
            return reasoningModel;
          case 'title-model':
            return titleModel;
          case 'artifact-model':
            return artifactModel;
          case 'small-model':
            return chatModel; // Using chatModel as fallback for small-model in test
          default:
            throw new Error(`Unknown model ID: ${modelId}`);
        }
      },
      imageModel: (modelId: string) => {
        // In test environment, we need to return a mock image model
        // For now, we'll throw an error since image generation isn't supported in tests
        throw new Error('Image generation is not supported in test environment');
      },
    }
  : {
      languageModel: (modelId: string) => {
        // Handle OpenAI models - map our custom IDs to actual OpenAI model names
        const openaiModelMap: Record<string, string> = {
          'chatgpt-4o-latest': 'gpt-4o',
          'gpt-4.1-2025-04-14': 'gpt-4-turbo', // Using gpt-4-turbo as fallback
          'o3-2025-04-16': 'gpt-4o' // Using gpt-4o as fallback for o3
        };
        
        if (modelId in openaiModelMap) {
          if (!process.env.OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY is not set in environment variables');
          }
          console.log(`Mapping model ${modelId} to ${openaiModelMap[modelId]}`);
          return openai(openaiModelMap[modelId]);
        }
        
        // Handle Anthropic models - map our custom IDs to actual Anthropic model names
        const anthropicModelMap: Record<string, string> = {
          'claude-4-sonnet': 'claude-4-sonnet-20250514',
          'claude-3.7-sonnet': 'claude-3-7-sonnet-20250219'
        };
        
        if (modelId in anthropicModelMap) {
          if (!process.env.ANTHROPIC_API_KEY) {
            throw new Error('ANTHROPIC_API_KEY is not set in environment variables');
          }
          console.log(`Mapping model ${modelId} to ${anthropicModelMap[modelId]}`);
          return anthropic(anthropicModelMap[modelId]);
        }
        
        // Handle xAI models with reasoning middleware
        if (modelId === 'chat-model-reasoning') {
          return wrapLanguageModel({
            model: xai('grok-3-mini-beta'),
            middleware: extractReasoningMiddleware({ tagName: 'think' }),
          });
        }
        
        // Default to xAI models
        switch (modelId) {
          case 'chat-model':
            return xai('grok-2-vision-1212');
          case 'title-model':
            return xai('grok-2-1212');
          case 'artifact-model':
            return xai('grok-2-1212');
          case 'small-model':
            return xai('grok-2-image');
          default:
            throw new Error(`Unknown model ID: ${modelId}`);
        }
      },
      imageModel: (modelId: string) => {
        // For now, only xAI provides image generation through their image model
        // The xai.image() method returns an image model, not a language model
        switch (modelId) {
          case 'small-model':
            return xai.image('grok-2-image');
          default:
            throw new Error(`Unknown image model ID: ${modelId}`);
        }
      },
    };

export const providers = {
  anthropic,
  google: createGoogleGenerativeAI(),
  xai,
  openai,
} as const;
