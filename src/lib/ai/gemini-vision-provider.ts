/**
 * gemini-vision-provider.ts
 * Google Gemini vision inference provider with resilient multi-key rotation
 * and candidate model cascade resolution.
 */

import { GoogleGenAI } from '@google/genai'
import { AiExtractionPayload, AiExtractionResult } from './ai-provider-types'
import { buildPromptInstructions } from './local-vision-provider'
import { getCandidateOcrModels, pinSuccessfulModel } from '@/lib/gemini-model-resolver'
import { getNextGeminiApiKey } from '@/lib/api-key-rotator'

// Fallback key list from environment
const STATIC_GEMINI_KEYS = [
  process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
].filter(Boolean) as string[]

let staticKeyIndex = 0

function getStaticKey(): string {
  if (STATIC_GEMINI_KEYS.length === 0) {
    throw new Error('No Google Gemini API keys configured on server')
  }
  const key = STATIC_GEMINI_KEYS[staticKeyIndex]
  staticKeyIndex = (staticKeyIndex + 1) % STATIC_GEMINI_KEYS.length
  return key
}

// Execute document extraction via Google Gemini models
export async function extractWithGemini(
  payload: AiExtractionPayload,
  apiKey?: string
): Promise<AiExtractionResult> {
  const startTime = Date.now()
  const primaryKey = apiKey || getNextGeminiApiKey() || getStaticKey()
  const candidateModels = await getCandidateOcrModels(primaryKey)

  const { systemInstruction, userPrompt } = buildPromptInstructions(
    payload.documentType,
    payload.fixedHeaders,
    payload.contextRows
  )

  let extractedContent = ''
  let lastError: Error | null = null
  let successfulModel = candidateModels[0] || 'gemini-2.5-flash'

  // Model fallback loop with exponential jittered retries
  modelLoop: for (const modelName of candidateModels) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const activeKey = apiKey || getNextGeminiApiKey() || getStaticKey()
      const ai = new GoogleGenAI({ apiKey: activeKey })

      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    mimeType: payload.mimeType || 'image/jpeg',
                    data: payload.imageBase64,
                  },
                },
                {
                  text: userPrompt,
                },
              ],
            },
          ],
          config: {
            systemInstruction: {
              parts: [{ text: systemInstruction }],
            },
            temperature: 0.1,
          },
        })

        const textResult = response.text?.trim()
        if (textResult && textResult.length > 0) {
          extractedContent = textResult
          successfulModel = modelName
          pinSuccessfulModel(modelName)
          break modelLoop
        }
      } catch (err: any) {
        lastError = err
        const errMsg = err?.message?.toLowerCase() || ''
        const isRateLimit =
          errMsg.includes('429') ||
          errMsg.includes('resource_exhausted') ||
          errMsg.includes('quota')

        if (isRateLimit && attempt < 2) {
          const backoffMs = Math.floor(1000 * Math.pow(1.5, attempt) + Math.random() * 500)
          await new Promise((resolve) => setTimeout(resolve, backoffMs))
          continue
        }
        break
      }
    }
  }

  if (!extractedContent) {
    throw new Error(lastError?.message || 'Gemini vision models returned empty response')
  }

  return {
    content: extractedContent,
    provider: 'gemini',
    model: successfulModel,
    durationMs: Date.now() - startTime,
  }
}
