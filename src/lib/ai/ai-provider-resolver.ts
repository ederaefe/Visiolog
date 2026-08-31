/**
 * ai-provider-resolver.ts
 * Central dispatch router for Visiolog AI vision extraction engine.
 * Dynamically determines provider (Ollama, OpenRouter, Gemini, Custom) based on configuration.
 */

import {
  AiExtractionPayload,
  AiExtractionResult,
  AiVisionProviderType,
} from './ai-provider-types'
import { extractWithOllama } from './local-vision-provider'
import { extractWithOpenRouter } from './openrouter-vision-provider'
import { extractWithGemini } from './gemini-vision-provider'
import { extractWithCustomEndpoint } from './custom-vision-provider'

// Determine configured active AI provider with sensible defaults
export function resolveActiveProvider(): AiVisionProviderType {
  const envProvider = (process.env.AI_VISION_PROVIDER || '').toLowerCase()

  if (envProvider === 'ollama') return 'ollama'
  if (envProvider === 'openrouter') return 'openrouter'
  if (envProvider === 'custom') return 'custom'
  if (envProvider === 'gemini') return 'gemini'

  // If Ollama URL is configured without Gemini keys, default to Ollama
  if (process.env.OLLAMA_BASE_URL && !process.env.GEMINI_API_KEY) {
    return 'ollama'
  }

  // If OpenRouter key is present without Gemini keys, default to OpenRouter
  if (process.env.OPENROUTER_API_KEY && !process.env.GEMINI_API_KEY) {
    return 'openrouter'
  }

  return 'gemini'
}

// Universal extraction dispatcher with provider cascade fallback
export async function executeVisionExtraction(
  payload: AiExtractionPayload,
  preferredProvider?: AiVisionProviderType
): Promise<AiExtractionResult> {
  const activeProvider = preferredProvider || resolveActiveProvider()
  const errors: Array<{ provider: string; error: string }> = []

  // Execution order: Preferred provider -> Fallback cascade
  const providerOrder: AiVisionProviderType[] = [
    activeProvider,
    ...(activeProvider !== 'ollama' && process.env.OLLAMA_BASE_URL ? (['ollama'] as AiVisionProviderType[]) : []),
    ...(activeProvider !== 'openrouter' && process.env.OPENROUTER_API_KEY ? (['openrouter'] as AiVisionProviderType[]) : []),
    ...(activeProvider !== 'gemini' && process.env.GEMINI_API_KEY ? (['gemini'] as AiVisionProviderType[]) : []),
  ]

  for (const provider of providerOrder) {
    try {
      switch (provider) {
        case 'ollama':
          return await extractWithOllama(payload)
        case 'openrouter':
          return await extractWithOpenRouter(payload)
        case 'gemini':
          return await extractWithGemini(payload)
        case 'custom':
          return await extractWithCustomEndpoint(payload)
      }
    } catch (err: any) {
      console.warn(`[AiProviderResolver] Provider ${provider} failed:`, err?.message || err)
      errors.push({ provider, error: err?.message || String(err) })
    }
  }

  throw new Error(
    `All configured vision AI providers failed: ${errors.map((e) => `[${e.provider}: ${e.error}]`).join(', ')}`
  )
}
