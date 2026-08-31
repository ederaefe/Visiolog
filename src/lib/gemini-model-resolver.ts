/**
 * Dynamic Gemini Model Discovery & Cascade Resolver
 *
 * Automatically discovers available Google Gemini Flash models via the Google GenAI API,
 * filters for vision/multimodal generation capabilities, prioritizes newer version releases,
 * caches the discovered models in memory, and pins the active successful model.
 */

import { GoogleGenAI } from '@google/genai'

// In-memory cache for discovered model list (1 hour TTL)
let cachedFlashModels: string[] | null = null
let cacheTimestamp = 0
let pinnedPrimaryModel: string | null = null
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

// Verified production fallback models with guaranteed availability
const STATIC_FALLBACK_MODELS = [
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
]

/**
 * Record a successfully used model to pin it as the primary preferred model
 * for subsequent extraction tasks until a newer model is discovered.
 */
export function pinSuccessfulModel(modelName: string): void {
  if (modelName && modelName.trim().length > 0) {
    pinnedPrimaryModel = modelName.trim()
  }
}

/**
 * Dynamically queries Google GenAI API for all currently available Flash/Vision models
 * supporting content generation.
 */
export async function getAvailableFlashModels(apiKey: string): Promise<string[]> {
  const now = Date.now()
  if (cachedFlashModels && now - cacheTimestamp < CACHE_TTL_MS) {
    if (pinnedPrimaryModel && cachedFlashModels.includes(pinnedPrimaryModel)) {
      return [pinnedPrimaryModel, ...cachedFlashModels.filter((m) => m !== pinnedPrimaryModel)]
    }
    return cachedFlashModels
  }

  try {
    const ai = new GoogleGenAI({ apiKey })
    const response = await ai.models.list({ config: { pageSize: 100 } })
    const discovered: string[] = []

    // Iterate through available models returned by the API
    for await (const model of response) {
      const modelName = model.name?.replace(/^models\//, '') || ''
      const isFlashOrVision =
        modelName.toLowerCase().includes('flash') ||
        modelName.toLowerCase().includes('vision') ||
        modelName.toLowerCase().includes('pro')

      const isExperimentalOrAudio =
        modelName.includes('audio') ||
        modelName.includes('tts') ||
        modelName.includes('embedding') ||
        modelName.includes('bison')

      if (isFlashOrVision && !isExperimentalOrAudio && modelName.length > 0) {
        discovered.push(modelName)
      }
    }

    if (discovered.length > 0) {
      // Sort discovered models with newer versions prioritized
      discovered.sort((a, b) => {
        // Extract version numbers like 2.0, 1.5, 3.0, etc.
        const vA = parseFloat(a.match(/\d+(\.\d+)?/)?.[0] || '0')
        const vB = parseFloat(b.match(/\d+(\.\d+)?/)?.[0] || '0')
        return vB - vA
      })

      // Combine discovered models with static known models without duplicates
      const merged = Array.from(new Set([...discovered, ...STATIC_FALLBACK_MODELS]))
      cachedFlashModels = merged
      cacheTimestamp = now

      if (pinnedPrimaryModel && merged.includes(pinnedPrimaryModel)) {
        return [pinnedPrimaryModel, ...merged.filter((m) => m !== pinnedPrimaryModel)]
      }
      return merged
    }
  } catch (err) {
    console.warn('[GeminiResolver] Dynamic model discovery failed, using static fallback hierarchy:', err)
  }

  if (pinnedPrimaryModel && STATIC_FALLBACK_MODELS.includes(pinnedPrimaryModel)) {
    return [pinnedPrimaryModel, ...STATIC_FALLBACK_MODELS.filter((m) => m !== pinnedPrimaryModel)]
  }
  return STATIC_FALLBACK_MODELS
}

/**
 * Returns an ordered array of candidate models to try sequentially for OCR tasks.
 */
export async function getCandidateOcrModels(apiKey: string): Promise<string[]> {
  const available = await getAvailableFlashModels(apiKey)
  return available.length > 0 ? available : STATIC_FALLBACK_MODELS
}
